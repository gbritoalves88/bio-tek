import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
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
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
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
      try {
        await AndroidSystemBars.setSystemBarsStyle({
          statusBar: { style: 'LIGHT', color: this.COR_LARANJA },
          navigationBar: { style: 'LIGHT', color: this.COR_LARANJA }
        });
      } catch (err) {
        console.warn('Erro ao ajustar system bars:', err);
      }
    }

    setTimeout(async () => {
      if (!isPlatformBrowser(this.platformId)) return;

      if (Capacitor.isNativePlatform()) {
        try {
          await this.themeStatusBar.aplicarTemaAtual();
        } catch (err) {
          console.warn('Erro ao restaurar tema:', err);
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
