package com.batiquant.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Log;
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
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class BatiQuantNativeAdsBridge {
    private static final String TAG = "BatiQuantAds";
    private static final String DEFAULT_TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private InterstitialAd interstitialAd;
    private ConsentInformation consentInformation;

    private boolean mobileAdsInitialized = false;
    private boolean interstitialLoading = false;

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
    public boolean printHtmlDocument(String jobName, String html) {
        if (html == null || html.trim().isEmpty()) return false;

        runOnMainThread(() -> {
            try {
                final WebView printWebView = new WebView(activity);
                final boolean[] started = {false};

                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (started[0]) return;
                        started[0] = true;

                        try {
                            PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                            String safeJobName = safeText(jobName, "BatiQuant");
                            PrintDocumentAdapter adapter;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                adapter = view.createPrintDocumentAdapter(safeJobName);
                            } else {
                                adapter = view.createPrintDocumentAdapter();
                            }
                            printManager.print(
                                    safeJobName,
                                    adapter,
                                    new PrintAttributes.Builder().build()
                            );
                        } catch (Throwable error) {
                            Log.w(TAG, "Unable to print HTML document", error);
                        } finally {
                            mainHandler.postDelayed(() -> {
                                try {
                                    printWebView.destroy();
                                } catch (Throwable ignored) {
                                }
                            }, 1200);
                        }
                    }
                });

                printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Throwable error) {
                Log.w(TAG, "Unable to initialize print WebView", error);
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean shareHtmlDocument(String title, String fileName, String html) {
        if (html == null || html.trim().isEmpty()) return false;

        runOnMainThread(() -> {
            try {
                File file = writeHtmlToCache(fileName, html);
                Uri uri = FileProvider.getUriForFile(
                        activity,
                        activity.getPackageName() + ".fileprovider",
                        file
                );

                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/html");
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, safeText(title, "BatiQuant"));
                sendIntent.putExtra(Intent.EXTRA_STREAM, uri);
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                activity.startActivity(Intent.createChooser(sendIntent, safeText(title, "Partager")));
            } catch (Throwable error) {
                Log.w(TAG, "Unable to share HTML document", error);
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean emailHtmlDocument(String to, String subject, String body, String fileName, String html) {
        if (html == null || html.trim().isEmpty()) return false;

        runOnMainThread(() -> {
            try {
                File file = writeHtmlToCache(fileName, html);
                Uri uri = FileProvider.getUriForFile(
                        activity,
                        activity.getPackageName() + ".fileprovider",
                        file
                );

                Intent emailIntent = new Intent(Intent.ACTION_SEND);
                emailIntent.setType("message/rfc822");
                if (to != null && !to.trim().isEmpty()) {
                    emailIntent.putExtra(Intent.EXTRA_EMAIL, new String[]{to.trim()});
                }
                emailIntent.putExtra(Intent.EXTRA_SUBJECT, safeText(subject, "BatiQuant"));
                emailIntent.putExtra(Intent.EXTRA_TEXT, safeText(body, ""));
                emailIntent.putExtra(Intent.EXTRA_STREAM, uri);
                emailIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                activity.startActivity(Intent.createChooser(emailIntent, safeText(subject, "Envoyer le document")));
            } catch (Throwable error) {
                Log.w(TAG, "Unable to prepare email intent", error);
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean downloadHtmlDocument(String fileName, String html) {
        if (html == null || html.trim().isEmpty()) return false;

        final String safeFileName = sanitizeFileName(fileName, "document-batiquant.html");

        runOnMainThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safeFileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, "text/html");
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BatiQuant");
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream outputStream = activity.getContentResolver().openOutputStream(uri)) {
                            if (outputStream != null) {
                                outputStream.write(html.getBytes(StandardCharsets.UTF_8));
                                outputStream.flush();
                            }
                        }
                        values.clear();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        activity.getContentResolver().update(uri, values, null, null);
                    }
                } else {
                    File directory = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (directory == null) {
                        directory = activity.getCacheDir();
                    }
                    if (!directory.exists()) {
                        //noinspection ResultOfMethodCallIgnored
                        directory.mkdirs();
                    }
                    File file = new File(directory, safeFileName);
                    try (FileOutputStream outputStream = new FileOutputStream(file)) {
                        outputStream.write(html.getBytes(StandardCharsets.UTF_8));
                        outputStream.flush();
                    }
                }
            } catch (Throwable error) {
                Log.w(TAG, "Unable to save HTML document", error);
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

    private void voidBannerPlacement() {
        postJavascript(
                "(function(){"
                        + "document.documentElement.style.setProperty('--native-banner-space', '0px');"
                        + "window.dispatchEvent(new CustomEvent('batiquant-native-banner', { detail: { visible: false, height: 0 } }));"
                        + "})();"
        );
    }

    private File writeHtmlToCache(String fileName, String html) throws Exception {
        File directory = new File(activity.getCacheDir(), "documents");
        if (!directory.exists()) {
            //noinspection ResultOfMethodCallIgnored
            directory.mkdirs();
        }

        File file = new File(directory, sanitizeFileName(fileName, "document-batiquant.html"));
        try (FileOutputStream outputStream = new FileOutputStream(file, false)) {
            outputStream.write(html.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        }
        return file;
    }

    private String sanitizeFileName(String input, String fallback) {
        String candidate = input == null ? "" : input.trim();
        if (candidate.isEmpty()) candidate = fallback;
        candidate = candidate.replaceAll("[^a-zA-Z0-9._-]+", "_");
        if (!candidate.toLowerCase().endsWith(".html")) {
            candidate = candidate + ".html";
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
