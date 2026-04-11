package com.batiquant.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BatiQuantNativeAdsBridge nativeAdsBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the WebView content below the Android status/navigation bars.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        webView.setFitsSystemWindows(true);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        nativeAdsBridge = new BatiQuantNativeAdsBridge(this, webView);
        webView.addJavascriptInterface(nativeAdsBridge, "BatiQuantNativeAds");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (nativeAdsBridge != null) {
            nativeAdsBridge.handleActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (nativeAdsBridge != null && bridge != null && bridge.getWebView() != null) {
            nativeAdsBridge.rebindWebView(bridge.getWebView());
            nativeAdsBridge.onHostResume();
        }
    }

    @Override
    public void onPause() {
        if (nativeAdsBridge != null) {
            nativeAdsBridge.onHostPause();
        }
        super.onPause();
    }

    @Override
    public void onDestroy() {
        if (nativeAdsBridge != null) {
            nativeAdsBridge.onHostDestroy();
        }
        super.onDestroy();
    }
}
