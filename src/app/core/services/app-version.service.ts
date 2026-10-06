import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppVersionService {

  async getVersao(): Promise<string> {
    // 📱 Nativo (Capacitor): lê a versão do build.gradle via @capacitor/app
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        return info.version;   // ex: "9.0.0"
      } catch (err) {
        console.warn('Erro ao ler versão nativa:', err);
        return environment.appVersion;
      }
    }

    // 🌐 Web/TWA: usa a versão do environment
    return environment.appVersion;
  }

  /**
   * Retorna o build (versionCode) — só faz sentido no nativo.
   * No web, retorna string vazia.
   */
  async getBuild(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        return info.build;   // ex: "9" (versionCode)
      } catch (err) {
        return '';
      }
    }
    return '';
  }
}
