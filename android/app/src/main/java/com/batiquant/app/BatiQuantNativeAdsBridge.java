package com.batiquant.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

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
