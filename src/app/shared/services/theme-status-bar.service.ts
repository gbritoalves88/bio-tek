import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AndroidSystemBars } from 'capacitor-android-system-bars';

@Injectable({
  providedIn: 'root'
})
export class ThemeStatusBarService {

  private readonly darkBg = '#111111';
  private readonly lightBg = '#F5EFE6';

  async aplicarTema(tema: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const isDark = tema !== 2;

      await AndroidSystemBars.setSystemBarsStyle({
        statusBar: {
          style: isDark ? 'DARK' : 'LIGHT',
          color: isDark ? this.darkBg : this.lightBg
        },
        navigationBar: {
          style: isDark ? 'DARK' : 'LIGHT',
          color: isDark ? this.darkBg : this.lightBg
        }
      });
    } catch (error) {
      console.error('Erro ao aplicar tema nas system bars:', error);
    }
  }

  async aplicarTemaAtual(): Promise<void> {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const tema = usuario?.tema ?? 1;
    await this.aplicarTema(tema);
  }
}
