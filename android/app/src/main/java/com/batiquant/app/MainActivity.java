package com.batiquant.app;

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

        nativeAdsBridge = new BatiQuantNativeAdsBridge(this, webView);
        webView.addJavascriptInterface(nativeAdsBridge, "BatiQuantNativeAds");
    }

    @Override
    public void onResume() {
        super.onResume();
        if (nativeAdsBridge != null && bridge != null) {
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
