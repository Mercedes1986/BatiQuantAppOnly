package com.batiquant.app;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BatiQuantNativeAdsBridge nativeAdsBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge == null || bridge.getWebView() == null) return;

        WebView webView = bridge.getWebView();
        nativeAdsBridge = new BatiQuantNativeAdsBridge(this, webView);
        webView.addJavascriptInterface(nativeAdsBridge, "BatiQuantNativeAds");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (nativeAdsBridge != null && bridge != null) {
            nativeAdsBridge.rebindWebView(bridge.getWebView());
            nativeAdsBridge.onHostResume();
        }
    }

    @Override
    protected void onPause() {
        if (nativeAdsBridge != null) {
            nativeAdsBridge.onHostPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (nativeAdsBridge != null) {
            nativeAdsBridge.onHostDestroy();
        }
        super.onDestroy();
    }
}
