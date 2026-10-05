import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { AndroidSystemBars } from 'capacitor-android-system-bars';
import { ThemeStatusBarService } from '../../shared/services/theme-status-bar.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-screen">
      <img src="assets/splash.png" alt="BliTeca" />
    </div>
    `,
  styles: [`
    .splash-screen {
      position: fixed;
      inset: 0;
      background: #FD7A03;
      z-index: 9999;
      overflow: hidden;
    }

    .splash-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class SplashComponent implements OnInit {

  private readonly COR_LARANJA = '#FD7A03';

  constructor(
    private router: Router,
    private themeStatusBar: ThemeStatusBarService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // 🆕 Ajusta as barras do sistema pra laranja durante o splash
      try {
        await AndroidSystemBars.setSystemBarsStyle({
          statusBar: { style: 'LIGHT', color: this.COR_LARANJA },
          navigationBar: { style: 'LIGHT', color: this.COR_LARANJA }
        });
      } catch (err) {
        console.warn('Erro ao ajustar system bars:', err);
      }

      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('Erro ao esconder splash nativo:', err);
      }
    }

    // 🆕 Aguarda 1.5s, RESTAURA as barras e navega
    setTimeout(async () => {
      if (!isPlatformBrowser(this.platformId)) return;

      // 🆕 Restaura as barras pro tema atual ANTES de navegar
      if (Capacitor.isNativePlatform()) {
        try {
          await this.themeStatusBar.aplicarTemaAtual();
        } catch (err) {
          console.warn('Erro ao restaurar tema das barras:', err);
        }
      }

      const token = localStorage.getItem('token');
      const tokenValido = token && token !== 'undefined' && token !== 'null' && token.length > 10;

      if (tokenValido) {
        this.router.navigate(['/inicio'], { replaceUrl: true });
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }, 1500);
  }
}
