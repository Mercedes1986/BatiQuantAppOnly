package com.batiquant.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.graphics.pdf.PdfDocument;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class BatiQuantNativeAdsBridge {
    private static final String TAG = "BatiQuantAds";
    private static final String DEFAULT_TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    private static final String DOCUMENT_EVENT = "batiquant-native-document";

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private InterstitialAd interstitialAd;
    private ConsentInformation consentInformation;

    private boolean mobileAdsInitialized = false;
    private boolean interstitialLoading = false;

    private interface PdfReadyCallback {
        void onSuccess(File pdfFile);

        void onError(String message, Throwable throwable);
    }

    public BatiQuantNativeAdsBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    public void rebindWebView(WebView nextWebView) {
        this.webView = nextWebView;
    }

    @JavascriptInterface
    public void initialize() {
        runOnMainThread(this::refreshConsentAndMaybeInitializeAds);
    }

    @JavascriptInterface
    public void showBanner(String placement) {
        voidBannerPlacement();
    }

    @JavascriptInterface
    public void hideBanner(String placement) {
        voidBannerPlacement();
    }

    @JavascriptInterface
    public boolean showInterstitial(String placement) {
        if (!canRequestAds()) return false;
        if (interstitialAd == null) return false;

        final InterstitialAd adToShow = interstitialAd;
        interstitialAd = null;

        runOnMainThread(() -> {
            adToShow.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    dispatchInterstitialEvent("shown", placement);
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    dispatchInterstitialEvent("dismissed", placement);
                    preloadInterstitial();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                    Log.w(TAG, "Interstitial failed to show: " + adError.getMessage());
                    dispatchInterstitialEvent("failed", placement);
                    preloadInterstitial();
                }
            });

            try {
                adToShow.show(activity);
            } catch (Throwable error) {
                Log.w(TAG, "Interstitial show threw an exception", error);
                dispatchInterstitialEvent("failed", placement);
                preloadInterstitial();
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean openPdfDocument(String requestId, String title, String fileName, String html) {
        if (html == null || html.trim().isEmpty()) {
            dispatchDocumentEvent(requestId, "open", "error", "empty-html");
            return false;
        }

        generatePdfFromHtml(requestId, "open", title, fileName, html, new PdfReadyCallback() {
            @Override
            public void onSuccess(File pdfFile) {
                try {
                    Uri uri = toDocumentUri(pdfFile);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    activity.startActivity(Intent.createChooser(intent, safeText(title, "PDF")));
                    dispatchDocumentEvent(requestId, "open", "success", pdfFile.getName());
                } catch (Throwable error) {
                    Log.w(TAG, "Unable to open PDF document", error);
                    dispatchDocumentEvent(requestId, "open", "error", "open-failed");
                }
            }

            @Override
            public void onError(String message, Throwable throwable) {
                Log.w(TAG, "Unable to prepare PDF for opening", throwable);
                dispatchDocumentEvent(requestId, "open", "error", safeText(message, "open-failed"));
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean sharePdfDocument(String requestId, String title, String fileName, String html, String chooserTitle) {
        if (html == null || html.trim().isEmpty()) {
            dispatchDocumentEvent(requestId, "share", "error", "empty-html");
            return false;
        }

        generatePdfFromHtml(requestId, "share", title, fileName, html, new PdfReadyCallback() {
            @Override
            public void onSuccess(File pdfFile) {
                try {
                    Uri uri = toDocumentUri(pdfFile);
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.setType("application/pdf");
                    sendIntent.putExtra(Intent.EXTRA_SUBJECT, safeText(title, "BatiQuant"));
                    sendIntent.putExtra(Intent.EXTRA_STREAM, uri);
                    sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.startActivity(Intent.createChooser(sendIntent, safeText(chooserTitle, "Partager le PDF")));
                    dispatchDocumentEvent(requestId, "share", "success", pdfFile.getName());
                } catch (Throwable error) {
                    Log.w(TAG, "Unable to share PDF document", error);
                    dispatchDocumentEvent(requestId, "share", "error", "share-failed");
                }
            }

            @Override
            public void onError(String message, Throwable throwable) {
                Log.w(TAG, "Unable to prepare PDF for sharing", throwable);
                dispatchDocumentEvent(requestId, "share", "error", safeText(message, "share-failed"));
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean emailPdfDocument(
            String requestId,
            String to,
            String subject,
            String body,
            String fileName,
            String html,
            String chooserTitle
    ) {
        if (html == null || html.trim().isEmpty()) {
            dispatchDocumentEvent(requestId, "email", "error", "empty-html");
            return false;
        }

        generatePdfFromHtml(requestId, "email", subject, fileName, html, new PdfReadyCallback() {
            @Override
            public void onSuccess(File pdfFile) {
                try {
                    Uri uri = toDocumentUri(pdfFile);
                    Intent emailIntent = new Intent(Intent.ACTION_SEND);
                    emailIntent.setType("application/pdf");
                    if (to != null && !to.trim().isEmpty()) {
                        emailIntent.putExtra(Intent.EXTRA_EMAIL, new String[]{to.trim()});
                    }
                    emailIntent.putExtra(Intent.EXTRA_SUBJECT, safeText(subject, "BatiQuant"));
                    emailIntent.putExtra(Intent.EXTRA_TEXT, safeText(body, ""));
                    emailIntent.putExtra(Intent.EXTRA_STREAM, uri);
                    emailIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.startActivity(Intent.createChooser(emailIntent, safeText(chooserTitle, "Envoyer par e-mail")));
                    dispatchDocumentEvent(requestId, "email", "success", pdfFile.getName());
                } catch (Throwable error) {
                    Log.w(TAG, "Unable to prepare email with PDF document", error);
                    dispatchDocumentEvent(requestId, "email", "error", "email-failed");
                }
            }

            @Override
            public void onError(String message, Throwable throwable) {
                Log.w(TAG, "Unable to prepare PDF for email", throwable);
                dispatchDocumentEvent(requestId, "email", "error", safeText(message, "email-failed"));
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean downloadPdfDocument(String requestId, String fileName, String html) {
        if (html == null || html.trim().isEmpty()) {
            dispatchDocumentEvent(requestId, "download", "error", "empty-html");
            return false;
        }

        generatePdfFromHtml(requestId, "download", fileName, fileName, html, new PdfReadyCallback() {
            @Override
            public void onSuccess(File pdfFile) {
                try {
                    String savedLocation = savePdfToDownloads(pdfFile, fileName);
                    dispatchDocumentEvent(requestId, "download", "success", savedLocation);
                } catch (Throwable error) {
                    Log.w(TAG, "Unable to download PDF document", error);
                    dispatchDocumentEvent(requestId, "download", "error", "download-failed");
                }
            }

            @Override
            public void onError(String message, Throwable throwable) {
                Log.w(TAG, "Unable to prepare PDF for download", throwable);
                dispatchDocumentEvent(requestId, "download", "error", safeText(message, "download-failed"));
            }
        });

        return true;
    }

    @JavascriptInterface
    public void openPrivacyOptions() {
        runOnMainThread(() -> {
            try {
                UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
                    if (formError != null) {
                        Log.w(TAG, "Privacy options form error: " + formError.getMessage());
                    }
                    dispatchPrivacyState();
                    if (canRequestAds()) {
                        startMobileAdsIfNeeded();
                    }
                });
            } catch (Throwable error) {
                Log.w(TAG, "Unable to open privacy options", error);
            }
        });
    }

    @JavascriptInterface
    public boolean canRequestAds() {
        return consentInformation != null && consentInformation.canRequestAds();
    }

    @JavascriptInterface
    public boolean privacyOptionsRequired() {
        return consentInformation != null
                && consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    public void onHostResume() {
        // no-op
    }

    public void onHostPause() {
        // no-op
    }

    public void onHostDestroy() {
        runOnMainThread(this::voidBannerPlacement);
    }

    private void generatePdfFromHtml(
            String requestId,
            String action,
            String title,
            String fileName,
            String html,
            PdfReadyCallback callback
    ) {
        runOnMainThread(() -> {
            try {
                final File targetFile = new File(ensureDocumentsCacheDir(), sanitizePdfFileName(fileName, "document-batiquant.pdf"));
                final WebView printWebView = new WebView(activity);
                final boolean[] started = {false};

                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.getSettings().setDomStorageEnabled(false);
                printWebView.getSettings().setAllowFileAccess(false);
                printWebView.getSettings().setLoadsImagesAutomatically(true);
                printWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

                final int initialWidth = activity.getResources().getDisplayMetrics().widthPixels;
                final int initialHeight = activity.getResources().getDisplayMetrics().heightPixels;
                printWebView.measure(
                        View.MeasureSpec.makeMeasureSpec(initialWidth, View.MeasureSpec.EXACTLY),
                        View.MeasureSpec.makeMeasureSpec(initialHeight, View.MeasureSpec.EXACTLY)
                );
                printWebView.layout(0, 0, initialWidth, initialHeight);

                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (started[0]) return;
                        started[0] = true;

                        mainHandler.postDelayed(() -> {
                            int contentWidth = Math.max(view.getWidth(), activity.getResources().getDisplayMetrics().widthPixels);
                            int contentHeight = Math.max((int) Math.ceil(view.getContentHeight() * view.getScale()), view.computeVerticalScrollRange());
                            if (contentHeight <= 0) {
                                contentHeight = Math.max(view.getHeight(), activity.getResources().getDisplayMetrics().heightPixels);
                            }

                            view.measure(
                                    View.MeasureSpec.makeMeasureSpec(contentWidth, View.MeasureSpec.EXACTLY),
                                    View.MeasureSpec.makeMeasureSpec(contentHeight, View.MeasureSpec.EXACTLY)
                            );
                            view.layout(0, 0, contentWidth, contentHeight);

                            writeWebViewToPdf(view, targetFile, new PdfReadyCallback() {
                                @Override
                                public void onSuccess(File pdfFile) {
                                    destroyWebViewQuietly(printWebView);
                                    callback.onSuccess(pdfFile);
                                }

                                @Override
                                public void onError(String message, Throwable throwable) {
                                    destroyWebViewQuietly(printWebView);
                                    callback.onError(message, throwable);
                                }
                            });
                        }, 500L);
                    }
                });

                printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Throwable error) {
                Log.w(TAG, "Unable to initialize PDF generation", error);
                callback.onError(action + "-init-failed", error);
            }
        });
    }

    private void writeWebViewToPdf(WebView sourceView, File targetFile, PdfReadyCallback callback) {
        PdfDocument document = null;
        FileOutputStream outputStream = null;

        try {
            int viewWidth = Math.max(sourceView.getWidth(), activity.getResources().getDisplayMetrics().widthPixels);
            int rawContentHeight = Math.max((int) Math.ceil(sourceView.getContentHeight() * sourceView.getScale()), sourceView.computeVerticalScrollRange());
            int viewHeight = rawContentHeight > 0 ? rawContentHeight : Math.max(sourceView.getHeight(), activity.getResources().getDisplayMetrics().heightPixels);

            sourceView.measure(
                    View.MeasureSpec.makeMeasureSpec(viewWidth, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(viewHeight, View.MeasureSpec.EXACTLY)
            );
            sourceView.layout(0, 0, viewWidth, viewHeight);

            final int pageWidth = 1240;
            final int pageHeight = 1754;
            final float scale = pageWidth / (float) viewWidth;
            final int scaledContentHeight = Math.max(1, Math.round(viewHeight * scale));
            final int pageCount = Math.max(1, (int) Math.ceil(scaledContentHeight / (float) pageHeight));

            document = new PdfDocument();

            for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageIndex + 1).create();
                PdfDocument.Page page = document.startPage(pageInfo);
                page.getCanvas().save();
                page.getCanvas().scale(scale, scale);
                page.getCanvas().translate(0, -((pageIndex * pageHeight) / scale));
                sourceView.draw(page.getCanvas());
                page.getCanvas().restore();
                document.finishPage(page);
            }

            outputStream = new FileOutputStream(targetFile, false);
            document.writeTo(outputStream);
            outputStream.flush();
            callback.onSuccess(targetFile);
        } catch (Throwable error) {
            callback.onError("pdf-write-failed", error);
        } finally {
            if (document != null) {
                try {
                    document.close();
                } catch (Throwable ignored) {
                    // ignore
                }
            }

            if (outputStream != null) {
                try {
                    outputStream.close();
                } catch (Throwable ignored) {
                    // ignore
                }
            }
        }
    }

    private File ensureDocumentsCacheDir() {
        File directory = new File(activity.getCacheDir(), "documents");
        if (!directory.exists()) {
            //noinspection ResultOfMethodCallIgnored
            directory.mkdirs();
        }
        return directory;
    }

    private Uri toDocumentUri(File file) {
        return FileProvider.getUriForFile(
                activity,
                activity.getPackageName() + ".fileprovider",
                file
        );
    }

    private String savePdfToDownloads(File sourceFile, String requestedFileName) throws IOException {
        String safeFileName = sanitizePdfFileName(requestedFileName, sourceFile.getName());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, safeFileName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BatiQuant");
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                throw new IOException("Unable to create MediaStore entry");
            }

            try (InputStream inputStream = new FileInputStream(sourceFile);
                 OutputStream outputStream = activity.getContentResolver().openOutputStream(uri)) {
                if (outputStream == null) {
                    throw new IOException("Unable to open output stream for download");
                }
                copyStream(inputStream, outputStream);
            }

            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            activity.getContentResolver().update(uri, values, null, null);
            return safeFileName;
        }

        File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (directory == null) {
            directory = new File(activity.getCacheDir(), "downloads");
        }
        if (!directory.exists()) {
            //noinspection ResultOfMethodCallIgnored
            directory.mkdirs();
        }

        File targetFile = new File(directory, safeFileName);
        try (InputStream inputStream = new FileInputStream(sourceFile);
             OutputStream outputStream = new FileOutputStream(targetFile, false)) {
            copyStream(inputStream, outputStream);
        }

        return targetFile.getAbsolutePath();
    }

    private void copyStream(InputStream inputStream, OutputStream outputStream) throws IOException {
        byte[] buffer = new byte[8192];
        int read;
        while ((read = inputStream.read(buffer)) != -1) {
            outputStream.write(buffer, 0, read);
        }
        outputStream.flush();
    }

    private void destroyWebViewQuietly(WebView targetWebView) {
        mainHandler.postDelayed(() -> {
            try {
                targetWebView.stopLoading();
                targetWebView.destroy();
            } catch (Throwable ignored) {
                // ignore
            }
        }, 100L);
    }

    private void closeQuietly(ParcelFileDescriptor descriptor) {
        if (descriptor == null) return;
        try {
            descriptor.close();
        } catch (Throwable ignored) {
            // ignore
        }
    }

    private void refreshConsentAndMaybeInitializeAds() {
        consentInformation = UserMessagingPlatform.getConsentInformation(activity);

        ConsentRequestParameters.Builder paramsBuilder = new ConsentRequestParameters.Builder();

        if (BuildConfig.DEBUG) {
            ConsentDebugSettings debugSettings = new ConsentDebugSettings.Builder(activity)
                    .setDebugGeography(ConsentDebugSettings.DebugGeography.DEBUG_GEOGRAPHY_EEA)
                    .build();
            paramsBuilder.setConsentDebugSettings(debugSettings);
        }

        consentInformation.requestConsentInfoUpdate(
                activity,
                paramsBuilder.build(),
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                    if (formError != null) {
                        Log.w(TAG, "Consent form error: " + formError.getMessage());
                    }
                    afterConsentFlow();
                }),
                requestConsentError -> {
                    Log.w(TAG, "Consent info update failed: " + requestConsentError.getMessage());
                    afterConsentFlow();
                }
        );
    }

    private void afterConsentFlow() {
        dispatchPrivacyState();

        if (canRequestAds()) {
            startMobileAdsIfNeeded();
        }

        voidBannerPlacement();
    }

    private void startMobileAdsIfNeeded() {
        if (mobileAdsInitialized) {
            preloadInterstitial();
            return;
        }

        mobileAdsInitialized = true;

        new Thread(() -> MobileAds.initialize(activity, initializationStatus ->
                runOnMainThread(this::preloadInterstitial)
        )).start();
    }

    private void preloadInterstitial() {
        if (!mobileAdsInitialized || !canRequestAds() || interstitialLoading || interstitialAd != null) {
            return;
        }

        interstitialLoading = true;

        InterstitialAd.load(
                activity,
                resolveInterstitialUnitId(),
                new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(@NonNull InterstitialAd loadedAd) {
                        interstitialLoading = false;
                        interstitialAd = loadedAd;
                    }

                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                        interstitialLoading = false;
                        interstitialAd = null;
                        Log.w(TAG, "Interstitial failed to load: " + loadAdError.getMessage());
                    }
                }
        );
    }

    private String resolveInterstitialUnitId() {
        if (BuildConfig.ADMOB_INTERSTITIAL_CALC_DONE != null
                && !BuildConfig.ADMOB_INTERSTITIAL_CALC_DONE.trim().isEmpty()) {
            return BuildConfig.ADMOB_INTERSTITIAL_CALC_DONE;
        }

        return DEFAULT_TEST_INTERSTITIAL_ID;
    }

    private void dispatchPrivacyState() {
        postJavascript(
                "window.dispatchEvent(new CustomEvent('batiquant-native-privacy', { detail: { canRequestAds: "
                        + canRequestAds()
                        + ", privacyOptionsRequired: "
                        + privacyOptionsRequired()
                        + " } }));"
        );
    }

    private void dispatchInterstitialEvent(String phase, String placement) {
        postJavascript(
                "window.dispatchEvent(new CustomEvent('batiquant-interstitial', { detail: { phase: '"
                        + escapeForJs(phase)
                        + "', placement: '"
                        + escapeForJs(placement)
                        + "' } }));"
        );
    }

    private void dispatchDocumentEvent(String requestId, String action, String phase, String message) {
        postJavascript(
                "window.dispatchEvent(new CustomEvent('" + DOCUMENT_EVENT + "', { detail: { requestId: '"
                        + escapeForJs(requestId)
                        + "', action: '"
                        + escapeForJs(action)
                        + "', phase: '"
                        + escapeForJs(phase)
                        + "', message: '"
                        + escapeForJs(message)
                        + "' } }));"
        );
    }

    private void voidBannerPlacement() {
        postJavascript(
                "(function(){"
                        + "document.documentElement.style.setProperty('--native-banner-space', '0px');"
                        + "window.dispatchEvent(new CustomEvent('batiquant-native-banner', { detail: { visible: false, height: 0 } }));"
                        + "})();"
        );
    }

    private String sanitizePdfFileName(String input, String fallback) {
        String candidate = input == null ? "" : input.trim();
        if (candidate.isEmpty()) candidate = fallback;
        candidate = candidate.replaceAll("[^a-zA-Z0-9._-]+", "_");
        if (!candidate.toLowerCase().endsWith(".pdf")) {
            int dotIndex = candidate.lastIndexOf('.');
            if (dotIndex > 0) {
                candidate = candidate.substring(0, dotIndex);
            }
            candidate = candidate + ".pdf";
        }
        return candidate;
    }

    private String safeText(String value, String fallback) {
        if (value == null) return fallback;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }

    private String escapeForJs(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", " ")
                .replace("\r", " ");
    }

    private void postJavascript(String script) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void runOnMainThread(Runnable runnable) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            runnable.run();
        } else {
            mainHandler.post(runnable);
        }
    }
}
