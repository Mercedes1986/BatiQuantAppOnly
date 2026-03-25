package com.batiquant.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

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

public class BatiQuantNativeAdsBridge {
    private static final String TAG = "BatiQuantAds";

    private static final String DEFAULT_TEST_BANNER_ID = "ca-app-pub-3940256099942544/9214589741";
    private static final String DEFAULT_TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WebView webView;
    private FrameLayout bannerContainer;
    private AdView bannerView;
    private InterstitialAd interstitialAd;
    private ConsentInformation consentInformation;

    private boolean mobileAdsInitialized = false;
    private boolean interstitialLoading = false;
    private String pendingBannerPlacement = null;

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
        pendingBannerPlacement = placement;
        runOnMainThread(() -> showBannerInternal(placement));
    }

    @JavascriptInterface
    public void hideBanner(String placement) {
        pendingBannerPlacement = null;
        runOnMainThread(this::hideBannerInternal);
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
                public void onAdDismissedFullScreenContent() {
                    preloadInterstitial();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                    Log.w(TAG, "Interstitial failed to show: " + adError.getMessage());
                    preloadInterstitial();
                }
            });
            adToShow.show(activity);
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
                        maybeRestoreBanner();
                    } else {
                        hideBannerInternal();
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
            if (bannerView != null) bannerView.resume();
        });
    }

    public void onHostPause() {
        runOnMainThread(() -> {
            if (bannerView != null) bannerView.pause();
        });
    }

    public void onHostDestroy() {
        runOnMainThread(() -> {
            if (bannerView != null) {
                bannerView.destroy();
                bannerView = null;
            }
            if (bannerContainer != null) {
                bannerContainer.removeAllViews();
            }
            dispatchBannerState(false, 0);
        });
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
            maybeRestoreBanner();
        } else {
            hideBannerInternal();
        }
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
                        loadedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() {
                                interstitialAd = null;
                                preloadInterstitial();
                            }

                            @Override
                            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                                Log.w(TAG, "Interstitial show failed: " + adError.getMessage());
                                interstitialAd = null;
                                preloadInterstitial();
                            }
                        });
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

    private void maybeRestoreBanner() {
        if (pendingBannerPlacement == null || pendingBannerPlacement.trim().isEmpty()) return;
        showBannerInternal(pendingBannerPlacement);
    }

    private void showBannerInternal(String placement) {
        pendingBannerPlacement = placement;

        if (!mobileAdsInitialized || !canRequestAds()) {
            hideBannerInternal();
            return;
        }

        ensureBannerContainer();

        if (bannerView != null) {
            bannerView.destroy();
            bannerContainer.removeAllViews();
            bannerView = null;
        }

        final AdView nextBannerView = new AdView(activity);
        nextBannerView.setAdUnitId(resolveBannerUnitId(placement));
        nextBannerView.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, getAdWidthDp()));
        nextBannerView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                bannerContainer.setVisibility(View.VISIBLE);
                dispatchBannerState(true, nextBannerView.getAdSize().getHeightInPixels(activity));
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                Log.w(TAG, "Banner failed to load: " + loadAdError.getMessage());
                hideBannerInternal();
            }
        });

        bannerView = nextBannerView;
        bannerContainer.addView(
                nextBannerView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
                )
        );
        nextBannerView.loadAd(new AdRequest.Builder().build());
    }

    private void hideBannerInternal() {
        if (bannerView != null) {
            bannerView.destroy();
            bannerView = null;
        }
        if (bannerContainer != null) {
            bannerContainer.removeAllViews();
            bannerContainer.setVisibility(View.GONE);
        }
        dispatchBannerState(false, 0);
    }

    private void ensureBannerContainer() {
        if (bannerContainer != null) return;

        bannerContainer = new FrameLayout(activity);
        bannerContainer.setVisibility(View.GONE);
        bannerContainer.setClipToPadding(false);
        bannerContainer.setClipChildren(false);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
        );

        activity.addContentView(bannerContainer, params);
    }

    private int getAdWidthDp() {
        DisplayMetrics displayMetrics = activity.getResources().getDisplayMetrics();
        float density = displayMetrics.density;
        return Math.max(320, (int) (displayMetrics.widthPixels / density));
    }

    private String resolveBannerUnitId(String placement) {
        if ("calculator_result_banner".equals(placement)
                && BuildConfig.ADMOB_BANNER_RESULT != null
                && !BuildConfig.ADMOB_BANNER_RESULT.trim().isEmpty()) {
            return BuildConfig.ADMOB_BANNER_RESULT;
        }

        if (BuildConfig.ADMOB_BANNER_HOME != null && !BuildConfig.ADMOB_BANNER_HOME.trim().isEmpty()) {
            return BuildConfig.ADMOB_BANNER_HOME;
        }

        return DEFAULT_TEST_BANNER_ID;
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

    private void dispatchBannerState(boolean visible, int heightPx) {
        postJavascript(
                "(function(){"
                        + "var px=" + Math.max(heightPx, 0) + ";"
                        + "document.documentElement.style.setProperty('--native-banner-space', '" + Math.max(heightPx, 0) + "px');"
                        + "window.dispatchEvent(new CustomEvent('batiquant-native-banner', { detail: { visible: " + visible + ", height: px } }));"
                        + "})();"
        );
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
