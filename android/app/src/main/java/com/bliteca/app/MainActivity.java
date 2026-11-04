package com.bliteca.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Cria o canal de notificação "default" (Android 8+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        "default",
        "Notificações",
        NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("Notificações do BliTeca");
      NotificationManager manager = getSystemService(NotificationManager.class);
      manager.createNotificationChannel(channel);
    }

    // Registrar o plugin SocialLogin
    registerPlugin(SocialLoginPlugin.class);

    // Permite autoplay de vídeo/câmera sem gesto
    this.getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

    // 🆕 Desativa a scrollbar nativa do WebView no Android
    this.getBridge().getWebView().setVerticalScrollBarEnabled(false);
    this.getBridge().getWebView().setHorizontalScrollBarEnabled(false);
  }

  @Override
  public void onStart() {
    super.onStart();

    // Remove o botão de play padrão do WebView
    this.getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(this.getBridge()) {
      @Override
      public Bitmap getDefaultVideoPoster() {
        final Bitmap bitmap = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawARGB(0, 0, 0, 0);
        return bitmap;
      }
    });
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);

    if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
      && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {

      PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
      if (pluginHandle == null) {
        Log.i("Google Activity Result", "SocialLogin handle is null");
        return;
      }

      SocialLoginPlugin plugin = (SocialLoginPlugin) pluginHandle.getInstance();
      plugin.handleGoogleLoginIntent(requestCode, data);
    }
  }

  @Override
  public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
    // Método obrigatório da interface - não precisa implementar nada
  }
}
