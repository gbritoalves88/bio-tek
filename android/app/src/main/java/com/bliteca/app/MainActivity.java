package com.bliteca.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Permite popups para Google OAuth
    WebView webView = getBridge().getWebView();
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptCanOpenWindowsAutomatically(true);
    settings.setSupportMultipleWindows(true);

    // Permite conteúdo misto (HTTP/HTTPS)
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
  }
}
