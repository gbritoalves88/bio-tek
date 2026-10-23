import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';           // 🆕
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';         // 🆕
import { Camera } from '@capacitor/camera';
import { NotificationService } from './shared/services/notification.service';
import { ThemeStatusBarService } from './shared/services/theme-status-bar.service';
import { environment } from '../environments/environment';    // 🆕 (ajuste o caminho)

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'bio-tek';

  constructor(
    private notificationService: NotificationService,
    private themeStatusBar: ThemeStatusBarService,
    private router: Router,
    private http: HttpClient,                                  // 🆕
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.sanitizarLocalStorage();

      const urlAtual = this.router.url;
      if (urlAtual === '/' || urlAtual === '') {
        this.router.navigate(['/splash'], { replaceUrl: true });
        return;
      }
    }

    if (Capacitor.isNativePlatform()) {
      await this.themeStatusBar.aplicarTemaAtual();

      try {
        const status = await Camera.checkPermissions();
        if (status.camera !== 'granted') {
          await Camera.requestPermissions({ permissions: ['camera'] });
        }
      } catch (error) {
        console.error('Erro permissão câmera:', error);
      }

      try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario?.id) {
          await this.notificationService.requestPermission(usuario.id);
        }
      } catch (error) {
        console.error('Erro permissão notificação:', error);
      }

      // 🆕 Pinga quando o app volta do background
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) this.registrarAcesso();
      });
    }

    this.registrarAcesso();
  }

  private sanitizarLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;

    const token = localStorage.getItem('token');
    const refresh = localStorage.getItem('refreshToken');

    const invalido = (v: string | null): boolean =>
      !v || v === 'undefined' || v === 'null' || v.length < 10;

    if (invalido(token) || invalido(refresh)) {
      const tinhaAlgo = !!(token || refresh);
      if (tinhaAlgo) {
        console.warn('[AppComponent] Sessão inválida detectada — limpando localStorage.');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('usuario');
    }
  }

  private registrarAcesso(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const hoje = new Date().toDateString();
    if (localStorage.getItem('ultimoPing') === hoje) return;

    this.http.post(`${environment.apiUrl}/Usuario/ping`, {}).subscribe({
      next: () => localStorage.setItem('ultimoPing', hoje),
      error: () => {}
    });
  }
}
