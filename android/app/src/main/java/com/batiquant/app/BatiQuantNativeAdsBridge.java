package com.batiquant.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.graphics.pdf.PdfDocument;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
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
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

public class BatiQuantNativeAdsBridge {
    private static final String TAG = "BatiQuantAds";
    private static final String DEFAULT_TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    private static final String DOCUMENT_EVENT = "batiquant-native-document";
    private static final String BACKUP_EVENT = "batiquant-native-backup";
    private static final String PURCHASE_EVENT = "batiquant-native-purchase";
    private static final int REQUEST_CREATE_BACKUP_DOCUMENT = 48021;

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private InterstitialAd interstitialAd;
    private ConsentInformation consentInformation;
    private BillingClient billingClient;
    private ProductDetails removeAdsProductDetails;
    private AdView bannerView;
    private String activeBannerPlacement;
    private int bottomChromeHeightPx = 0;

    private boolean mobileAdsInitialized = false;
    private boolean interstitialLoading = false;
    private boolean billingConnecting = false;
    private boolean billingReady = false;
    private boolean adFreePurchased = false;

    private String pendingBackupRequestId;
    private String pendingBackupFileName;
    private String pendingBackupContent;

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
    public void initializeBilling() {
        runOnMainThread(this::connectBillingClientIfNeeded);
    }

    @JavascriptInterface
    public void refreshPurchases() {
        runOnMainThread(() -> {
            connectBillingClientIfNeeded();
            if (billingReady) {
                queryRemoveAdsProductDetails();
                queryExistingPurchases();
            }
        });
    }

    @JavascriptInterface
    public boolean launchRemoveAdsPurchase() {
        if (BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID == null
                || BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID.trim().isEmpty()) {
            dispatchPurchaseEvent("purchase-error", "remove-ads-product-missing");
            return false;
        }

        if (!billingReady || removeAdsProductDetails == null) {
            runOnMainThread(() -> {
                connectBillingClientIfNeeded();
                queryRemoveAdsProductDetails();
                dispatchPurchaseStatus("billing-not-ready");
            });
            return false;
        }

        runOnMainThread(() -> {
            try {
                BillingFlowParams.ProductDetailsParams productDetailsParams =
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(removeAdsProductDetails)
                                .build();

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(productDetailsParams))
                        .build();

                BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    dispatchPurchaseEvent("purchase-error", safeText(result.getDebugMessage(), "launch-billing-failed"));
                }
            } catch (Throwable error) {
                Log.w(TAG, "Unable to launch billing flow", error);
                dispatchPurchaseEvent("purchase-error", "launch-billing-exception");
            }
        });

        return true;
    }

    @JavascriptInterface
    public boolean isAdFreePurchased() {
        return adFreePurchased;
    }

    @JavascriptInterface
    public boolean isBillingReady() {
        return billingReady;
    }

    @JavascriptInterface
    public boolean isRemoveAdsProductReady() {
        return removeAdsProductDetails != null;
    }

    @JavascriptInterface
    public String getRemoveAdsProductId() {
        return safeText(BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID, "");
    }

    @JavascriptInterface
    public void showBanner(String placement) {
        runOnMainThread(() -> loadBannerForPlacement(placement));
    }

    @JavascriptInterface
    public void hideBanner(String placement) {
        runOnMainThread(this::hideBannerInternal);
    }

    @JavascriptInterface
    public void setBottomChromeHeight(int heightPx) {
        runOnMainThread(() -> {
            bottomChromeHeightPx = Math.max(0, heightPx);
            updateBannerContainerLayout();
        });
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
    public boolean downloadBackupJson(String requestId, String fileName, String json) {
        if (json == null || json.trim().isEmpty()) {
            dispatchBackupEvent(requestId, "error", "empty-json");
            return false;
        }

        final String safeRequestId = safeText(requestId, "backup_request");
        final String safeFileName = sanitizeJsonFileName(fileName, "BatiQuant_Backup.json");
        final String safeJson = json;

        runOnMainThread(() -> {
            try {
                if (launchBackupCreateDocument(safeRequestId, safeFileName, safeJson)) {
                    return;
                }

                String savedLocation = saveTextToDownloads(
                        safeJson,
                        safeFileName,
                        "application/json"
                );
                dispatchBackupEvent(safeRequestId, "success", savedLocation);
            } catch (Throwable error) {
                Log.w(TAG, "Unable to download JSON backup", error);
                dispatchBackupEvent(safeRequestId, "error", safeErrorMessage(error, "backup-download-failed"));
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
        runOnMainThread(() -> {
            connectBillingClientIfNeeded();
            if (billingReady) {
                queryExistingPurchases();
            }
            if (bannerView != null) {
                try { bannerView.resume(); } catch (Throwable ignored) {}
            }
        });
    }

    public void onHostPause() {
        runOnMainThread(() -> {
            if (bannerView != null) {
                try { bannerView.pause(); } catch (Throwable ignored) {}
            }
        });
    }

    public void onHostDestroy() {
        runOnMainThread(() -> {
            destroyBannerView();
            voidBannerPlacement();
            clearPendingBackupState();
            if (billingClient != null) {
                try {
                    billingClient.endConnection();
                } catch (Throwable ignored) {
                    // ignore
                }
            }
            billingClient = null;
            billingReady = false;
            billingConnecting = false;
        });
    }

    public boolean handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CREATE_BACKUP_DOCUMENT) {
            return false;
        }

        final String requestId = pendingBackupRequestId;
        final String fallbackFileName = safeText(pendingBackupFileName, "BatiQuant_Backup.json");
        final String content = pendingBackupContent;
        clearPendingBackupState();

        if (requestId == null || content == null) {
            Log.w(TAG, "Backup activity result received without pending state");
            return true;
        }

        if (resultCode != Activity.RESULT_OK) {
            dispatchBackupEvent(requestId, "error", "backup-download-cancelled");
            return true;
        }

        Uri uri = data != null ? data.getData() : null;
        if (uri == null) {
            dispatchBackupEvent(requestId, "error", "backup-download-no-uri");
            return true;
        }

        runOnMainThread(() -> {
            try (OutputStream outputStream = activity.getContentResolver().openOutputStream(uri, "w")) {
                if (outputStream == null) {
                    throw new IOException("Unable to open output stream for backup document");
                }

                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
                dispatchBackupEvent(requestId, "success", safeText(uri.toString(), fallbackFileName));
            } catch (Throwable error) {
                Log.w(TAG, "Unable to write JSON backup document", error);
                dispatchBackupEvent(requestId, "error", safeErrorMessage(error, "backup-download-write-failed"));
            }
        });

        return true;
    }

    private void connectBillingClientIfNeeded() {
        if (BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID == null
                || BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID.trim().isEmpty()) {
            dispatchPurchaseStatus("remove-ads-product-missing");
            return;
        }

        if (billingClient != null && billingClient.isReady()) {
            billingReady = true;
            queryRemoveAdsProductDetails();
            queryExistingPurchases();
            return;
        }

        if (billingConnecting) return;
        billingConnecting = true;

        PurchasesUpdatedListener purchasesUpdatedListener = this::onPurchasesUpdated;
        billingClient = BillingClient.newBuilder(activity)
                .setListener(purchasesUpdatedListener)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                billingConnecting = false;
                billingReady = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                if (!billingReady) {
                    Log.w(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                    dispatchPurchaseStatus(safeText(billingResult.getDebugMessage(), "billing-setup-failed"));
                    return;
                }

                queryRemoveAdsProductDetails();
                queryExistingPurchases();
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingConnecting = false;
                billingReady = false;
                removeAdsProductDetails = null;
                dispatchPurchaseStatus("billing-disconnected");
            }
        });
    }

    private void queryRemoveAdsProductDetails() {
        if (billingClient == null || !billingReady) {
            dispatchPurchaseStatus("billing-not-ready");
            return;
        }

        String productId = safeText(BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID, "");
        if (productId.isEmpty()) {
            removeAdsProductDetails = null;
            dispatchPurchaseStatus("remove-ads-product-missing");
            return;
        }

        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.w(TAG, "Product details query failed: " + billingResult.getDebugMessage());
                removeAdsProductDetails = null;
                dispatchPurchaseStatus(safeText(billingResult.getDebugMessage(), "product-query-failed"));
                return;
            }

            List<ProductDetails> detailsList = productDetailsResult.getProductDetailsList();
            removeAdsProductDetails = (detailsList != null && !detailsList.isEmpty()) ? detailsList.get(0) : null;
            dispatchPurchaseStatus(removeAdsProductDetails != null ? "product-ready" : "product-not-found");
        });
    }

    private void queryExistingPurchases() {
        if (billingClient == null || !billingReady) {
            dispatchPurchaseStatus("billing-not-ready");
            return;
        }

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.w(TAG, "Query purchases failed: " + billingResult.getDebugMessage());
                dispatchPurchaseStatus(safeText(billingResult.getDebugMessage(), "query-purchases-failed"));
                return;
            }

            processPurchases(purchases, "restore-complete");
        });
    }

    private void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();
        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            processPurchases(purchases, "purchase-success");
            return;
        }

        if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            dispatchPurchaseEvent("purchase-cancelled", "user-cancelled");
            return;
        }

        dispatchPurchaseEvent("purchase-error", safeText(billingResult.getDebugMessage(), "purchase-update-failed"));
    }

    private void processPurchases(List<Purchase> purchases, String successPhase) {
        boolean entitled = false;

        if (purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase == null) continue;
                if (!containsRemoveAdsProduct(purchase)) continue;

                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    entitled = true;
                    acknowledgePurchaseIfNeeded(purchase);
                }
            }
        }

        adFreePurchased = entitled;
        dispatchPurchaseEvent(successPhase, entitled ? "ad-free-active" : "no-active-remove-ads-purchase");
    }

    private boolean containsRemoveAdsProduct(Purchase purchase) {
        String productId = safeText(BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID, "");
        if (productId.isEmpty()) return false;
        List<String> products = purchase.getProducts();
        return products != null && products.contains(productId);
    }

    private void acknowledgePurchaseIfNeeded(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        if (billingClient == null || !billingReady) return;

        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                Log.w(TAG, "Acknowledge purchase failed: " + billingResult.getDebugMessage());
            }
        });
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
                            int scaledContentHeight = (int) Math.ceil(view.getContentHeight() * view.getScale());
                            int contentHeight = scaledContentHeight > 0
                                    ? scaledContentHeight
                                    : Math.max(view.getHeight(), activity.getResources().getDisplayMetrics().heightPixels);

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
            int scaledContentHeight = (int) Math.ceil(sourceView.getContentHeight() * sourceView.getScale());
            int viewHeight = scaledContentHeight > 0
                    ? scaledContentHeight
                    : Math.max(sourceView.getHeight(), activity.getResources().getDisplayMetrics().heightPixels);

            sourceView.measure(
                    View.MeasureSpec.makeMeasureSpec(viewWidth, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(viewHeight, View.MeasureSpec.EXACTLY)
            );
            sourceView.layout(0, 0, viewWidth, viewHeight);

            final int pageWidth = 1240;
            final int pageHeight = 1754;
            final float scale = pageWidth / (float) viewWidth;
            final int scaledPdfHeight = Math.max(1, Math.round(viewHeight * scale));
            final int pageCount = Math.max(1, (int) Math.ceil(scaledPdfHeight / (float) pageHeight));

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

    private boolean launchBackupCreateDocument(String requestId, String fileName, String content) {
        clearPendingBackupState();

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        pendingBackupRequestId = requestId;
        pendingBackupFileName = fileName;
        pendingBackupContent = content;

        try {
            activity.startActivityForResult(intent, REQUEST_CREATE_BACKUP_DOCUMENT);
            return true;
        } catch (Throwable error) {
            Log.w(TAG, "Unable to open backup document picker", error);
            clearPendingBackupState();
            return false;
        }
    }

    private void clearPendingBackupState() {
        pendingBackupRequestId = null;
        pendingBackupFileName = null;
        pendingBackupContent = null;
    }

    private String saveTextToDownloads(String content, String requestedFileName, String mimeType) throws IOException {
        String safeFileName = sanitizeJsonFileName(requestedFileName, "BatiQuant_Backup.json");
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, safeFileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BatiQuant");
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                throw new IOException("Unable to create MediaStore entry");
            }

            try (OutputStream outputStream = activity.getContentResolver().openOutputStream(uri)) {
                if (outputStream == null) {
                    throw new IOException("Unable to open output stream for download");
                }
                outputStream.write(bytes);
                outputStream.flush();
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
        try (OutputStream outputStream = new FileOutputStream(targetFile, false)) {
            outputStream.write(bytes);
            outputStream.flush();
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

    private void dispatchBackupEvent(String requestId, String phase, String message) {
        postJavascript(
                "window.dispatchEvent(new CustomEvent('" + BACKUP_EVENT + "', { detail: { requestId: '"
                        + escapeForJs(requestId)
                        + "', phase: '"
                        + escapeForJs(phase)
                        + "', message: '"
                        + escapeForJs(message)
                        + "' } }));"
        );
    }

    private void dispatchPurchaseStatus(String message) {
        dispatchPurchaseEvent("status", message);
    }

    private void dispatchPurchaseEvent(String phase, String message) {
        String productId = safeText(BuildConfig.PLAY_BILLING_REMOVE_ADS_PRODUCT_ID, "");
        boolean productReady = removeAdsProductDetails != null;

        postJavascript(
                "window.dispatchEvent(new CustomEvent('" + PURCHASE_EVENT + "', { detail: { phase: '"
                        + escapeForJs(phase)
                        + "', entitled: "
                        + adFreePurchased
                        + ", billingReady: "
                        + billingReady
                        + ", productReady: "
                        + productReady
                        + ", productId: '"
                        + escapeForJs(productId)
                        + "', message: '"
                        + escapeForJs(message)
                        + "' } }));"
        );
    }

    private void loadBannerForPlacement(String placement) {
        if (!canRequestAds() || !mobileAdsInitialized || adFreePurchased) {
            hideBannerInternal();
            return;
        }

        FrameLayout container = ensureBannerContainer();
        if (container == null) {
            Log.w(TAG, "Banner container not available");
            voidBannerPlacement();
            return;
        }

        String bannerUnitId = resolveBannerUnitId(placement);
        if (bannerUnitId == null || bannerUnitId.trim().isEmpty()) {
            Log.w(TAG, "Banner unit id missing for placement: " + placement);
            hideBannerInternal();
            return;
        }

        if (bannerView != null && bannerUnitId.equals(bannerView.getAdUnitId()) && safeText(placement, "").equals(activeBannerPlacement)) {
            container.setVisibility(View.VISIBLE);
            dispatchBannerSpace(container.getHeight() > 0 ? container.getHeight() : dpToPx(60));
            return;
        }

        destroyBannerView();

        AdView adView = new AdView(activity);
        adView.setAdUnitId(bannerUnitId);
        adView.setAdSize(getAdaptiveBannerSize(container));
        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                container.setVisibility(View.VISIBLE);
                dispatchBannerSpace(adView.getAdSize() != null ? adView.getAdSize().getHeightInPixels(activity) : dpToPx(60));
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                Log.w(TAG, "Banner failed to load: " + loadAdError.getMessage());
                hideBannerInternal();
            }
        });

        bannerView = adView;
        activeBannerPlacement = safeText(placement, "");

        container.removeAllViews();
        container.addView(adView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        container.setVisibility(View.INVISIBLE);
        adView.loadAd(new AdRequest.Builder().build());
    }

    private void hideBannerInternal() {
        FrameLayout container = activity.findViewById(R.id.banner_container);
        destroyBannerView();
        if (container != null) {
            container.removeAllViews();
            container.setVisibility(View.GONE);
            updateBannerContainerLayout(container);
        }
        voidBannerPlacement();
    }

    private FrameLayout ensureBannerContainer() {
        FrameLayout existing = activity.findViewById(R.id.banner_container);
        if (existing != null) {
            updateBannerContainerLayout(existing);
            return existing;
        }

        View content = activity.findViewById(android.R.id.content);
        if (!(content instanceof ViewGroup)) {
            Log.w(TAG, "Android content root is not a ViewGroup");
            return null;
        }

        FrameLayout container = new FrameLayout(activity);
        container.setId(R.id.banner_container);
        container.setVisibility(View.GONE);
        container.setClipToPadding(false);
        container.setPadding(dpToPx(8), 0, dpToPx(8), 0);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.gravity = android.view.Gravity.BOTTOM;
        params.bottomMargin = Math.max(0, bottomChromeHeightPx);

        ((ViewGroup) content).addView(container, params);
        return container;
    }

    private void updateBannerContainerLayout() {
        FrameLayout container = activity.findViewById(R.id.banner_container);
        if (container != null) {
            updateBannerContainerLayout(container);
        }
    }

    private void updateBannerContainerLayout(FrameLayout container) {
        ViewGroup.LayoutParams layoutParams = container.getLayoutParams();
        FrameLayout.LayoutParams params;

        if (layoutParams instanceof FrameLayout.LayoutParams) {
            params = (FrameLayout.LayoutParams) layoutParams;
        } else {
            params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
        }

        params.width = ViewGroup.LayoutParams.MATCH_PARENT;
        params.height = ViewGroup.LayoutParams.WRAP_CONTENT;
        params.gravity = android.view.Gravity.BOTTOM;
        params.bottomMargin = Math.max(0, bottomChromeHeightPx);
        container.setLayoutParams(params);
        container.requestLayout();
    }

    private void destroyBannerView() {
        if (bannerView != null) {
            try { bannerView.destroy(); } catch (Throwable ignored) {}
            bannerView = null;
        }
        activeBannerPlacement = null;
    }

    private String resolveBannerUnitId(String placement) {
        String safePlacement = safeText(placement, "");
        switch (safePlacement) {
            case "dashboard_banner":
                return BuildConfig.ADMOB_BANNER_HOME;
            case "projects_banner":
                return BuildConfig.ADMOB_BANNER_PROJECTS;
            case "house_banner":
                return BuildConfig.ADMOB_BANNER_HOUSE;
            case "materials_banner":
                return BuildConfig.ADMOB_BANNER_MATERIALS;
            case "quicktools_banner":
                return BuildConfig.ADMOB_BANNER_QUICKTOOLS;
            case "calculator_result_banner":
                return BuildConfig.ADMOB_BANNER_RESULT;
            default:
                return BuildConfig.ADMOB_BANNER_HOME;
        }
    }

    private AdSize getAdaptiveBannerSize(FrameLayout container) {
        int adWidthPixels = container.getWidth();
        if (adWidthPixels <= 0) {
            adWidthPixels = activity.getResources().getDisplayMetrics().widthPixels;
        }
        float density = activity.getResources().getDisplayMetrics().density;
        int adWidth = Math.max(320, Math.round(adWidthPixels / density));
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, adWidth);
    }

    private void dispatchBannerSpace(int heightPx) {
        final int safeHeight = Math.max(0, heightPx);
        postJavascript(
                "(function(){"
                        + "document.documentElement.style.setProperty('--native-banner-space', '" + safeHeight + "px');"
                        + "window.dispatchEvent(new CustomEvent('batiquant-native-banner', { detail: { visible: " + (safeHeight > 0 ? "true" : "false") + ", height: " + safeHeight + " } }));"
                        + "})();"
        );
    }

    private int dpToPx(int dp) {
        return Math.round(dp * activity.getResources().getDisplayMetrics().density);
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

    private String sanitizeJsonFileName(String input, String fallback) {
        String candidate = input == null ? "" : input.trim();
        if (candidate.isEmpty()) candidate = fallback;
        candidate = candidate.replaceAll("[^a-zA-Z0-9._-]+", "_");
        if (!candidate.toLowerCase().endsWith(".json")) {
            int dotIndex = candidate.lastIndexOf('.');
            if (dotIndex > 0) {
                candidate = candidate.substring(0, dotIndex);
            }
            candidate = candidate + ".json";
        }
        return candidate;
    }

    private String safeErrorMessage(Throwable error, String fallback) {
        if (error == null) return fallback;
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) {
            return fallback;
        }
        return message.trim();
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
