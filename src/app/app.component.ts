import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { NotificationService } from './shared/services/notification.service';
import { ThemeStatusBarService } from './shared/services/theme-status-bar.service';

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    // 🆕 Sanitiza localStorage ANTES de qualquer coisa (bug #1)
    if (isPlatformBrowser(this.platformId)) {
      this.sanitizarLocalStorage();

      // 🆕 Redireciona pra splash na primeira carga
      const urlAtual = this.router.url;
      if (urlAtual === '/' || urlAtual === '') {
        this.router.navigate(['/splash'], { replaceUrl: true });
        return; // ⬅️ não continua a inicialização (o splash cuida do resto)
      }
    }

    if (Capacitor.isNativePlatform()) {
      // Aplica o tema na status bar conforme preferência salva
      await this.themeStatusBar.aplicarTemaAtual();

      // Permissão da câmera
      try {
        const status = await Camera.checkPermissions();
        if (status.camera !== 'granted') {
          await Camera.requestPermissions({ permissions: ['camera'] });
        }
      } catch (error) {
        console.error('Erro permissão câmera:', error);
      }

      // Permissão de notificações + registro do token
      try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario?.id) {
          await this.notificationService.requestPermission(usuario.id);
        }
      } catch (error) {
        console.error('Erro permissão notificação:', error);
      }
    }
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
}
