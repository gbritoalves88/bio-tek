import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from './login.service';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../shared/services/alert.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { AppVersionService } from '../../core/services/app-version.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  mostrarTermos = false;
  mostrarPolitica = false;
  versaoApp  = '';
  constructor(
    private router: Router,
    private loginService: LoginService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private appVersionService: AppVersionService,
  ) {}

  carregando = false;
  mensagemErro = '';
  mostrarModalErro = false;

  // 🆕 Inicializa o SocialLogin no Android/iOS
  async ngOnInit(): Promise<void> {

    this.versaoApp = await this.appVersionService.getVersao();
    this.cdr.detectChanges();
    if (Capacitor.isNativePlatform()) {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId: environment.google.clientId,
            mode: 'online'
          }
        });
        console.log('✅ SocialLogin inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar SocialLogin:', error);
      }
    }
  }

  fecharModalErro(): void {
    this.mostrarModalErro = false;
    this.mensagemErro = '';
    this.carregando = false;
    this.cdr.detectChanges();
  }

  private exibirErro(mensagem: string): void {
    this.carregando = false;
    this.mensagemErro = mensagem;
    this.mostrarModalErro = true;
    this.alertService.error(mensagem);
    this.cdr.detectChanges();
  }

  abrirTermos(): void {
    this.mostrarTermos = true;
    this.mostrarPolitica = false;
    this.cdr.detectChanges();
  }

  abrirPolitica(): void {
    this.mostrarTermos = false;
    this.mostrarPolitica = true;
    this.cdr.detectChanges();
  }

  fecharModalTermos(): void {
    this.mostrarTermos = false;
    this.mostrarPolitica = false;
    this.cdr.detectChanges();
  }

  entrarComGoogleOld(): void {
    this.carregando = true;
    this.cdr.detectChanges();

    const timeoutId = setTimeout(() => {
      if (this.carregando) {
        this.exibirErro('Tempo limite excedido. Tente novamente.');
      }
    }, 60000);

    const client = google.accounts.oauth2.initCodeClient({
      client_id: environment.google.clientId,
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response: any) => {
        clearTimeout(timeoutId);
        if (this.carregando === false) return;
        if (!response || !response.code) {
          this.exibirErro('Login cancelado. Tente novamente.');
          return;
        }
        this.enviarCodeParaBackend(response.code);
      }
    });
    client.requestCode();
  }

  entrarComGoogle(): void {
    if (Capacitor.isNativePlatform()) {
      this.entrarComGoogleNativo();
    } else {
      this.entrarComGoogleWeb();
    }
  }

  // 🌐 Fluxo Web (atual, mantém)
  private entrarComGoogleWeb(): void {
    this.carregando = true;
    this.cdr.detectChanges();

    const timeoutId = setTimeout(() => {
      if (this.carregando) {
        this.exibirErro('Tempo limite excedido. Tente novamente.');
      }
    }, 60000);

    const client = google.accounts.oauth2.initCodeClient({
      client_id: environment.google.clientId,
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response: any) => {
        clearTimeout(timeoutId);
        if (this.carregando === false) return;
        if (!response || !response.code) {
          this.exibirErro('Login cancelado. Tente novamente.');
          return;
        }
        this.enviarCodeParaBackend(response.code);
      }
    });
    client.requestCode();
  }

  // 📱 Fluxo Nativo (Capacitor)
  private async entrarComGoogleNativo(): Promise<void> {
    this.carregando = true;
    this.cdr.detectChanges();

    try {
      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile']
        }
      });

      console.log('🔵 Resultado SocialLogin:', result);

      const idToken = (result as any)?.result?.idToken;
      if (!idToken) {
        this.exibirErro('Token não recebido do Google');
        return;
      }

      this.enviarTokenParaBackend(idToken);
    } catch (error: any) {
      console.error('Erro no login nativo:', error);
      this.exibirErro(error?.message || 'Login cancelado ou falhou');
    }
  }

  // 🆕 Envia o idToken para o backend
  private enviarTokenParaBackend(idToken: string): void {
    this.loginService.loginComGoogleToken(idToken).subscribe({
      next: (response) => {
        this.carregando = false;
        this.alertService.success(`Bem-vindo, ${response.usuario.nome}!`);
        this.solicitarPermissaoNotificacoes(response.usuario.id);

        if (response.precisaAceitarTermos || response.novoUsuario) {
          this.router.navigate(['/termo']);
        } else {
          this.router.navigate(['/inicio']);
          this.analyticsService.logLogin('google');
        }
      },
      error: (err) => {
        this.exibirErro(err.error?.mensagem || 'Erro ao fazer login. Tente novamente.');
      }
    });
  }

  // 🆕 Envia o code para o backend (não expõe client_secret)
  private enviarCodeParaBackend(code: string): void {
    this.loginService.loginComGoogleCode(code).subscribe({
      next: (response) => {
        this.carregando = false;
        this.alertService.success(`Bem-vindo, ${response.usuario.nome}!`);
        this.solicitarPermissaoNotificacoes(response.usuario.id);

        if (response.precisaAceitarTermos || response.novoUsuario) {
          this.router.navigate(['/termo']);
        } else {
          this.router.navigate(['/inicio']);
          this.analyticsService.logLogin('google');
        }
      },
      error: (err) => {
        this.exibirErro(err.error?.mensagem || 'Erro ao fazer login. Tente novamente.');
      }
    });
  }

  entrarComoConvidado(): void {
    this.carregando = true;
    this.cdr.detectChanges();

    const nome = 'Convidado ' + Math.floor(Math.random() * 1000);
    const email = 'convidado' + Date.now() + '@temp.com';

    this.loginService.loginMock(nome, email).subscribe({
      next: (response) => {
        this.carregando = false;
        if (response.novoUsuario) {
          this.router.navigate(['/termo']);
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        this.exibirErro(err.error?.mensagem || 'Erro ao entrar como convidado');
      }
    });
  }

  private solicitarPermissaoNotificacoes(userId: string): void {
    this.notificationService.requestPermission(userId)
      .then(() => {
        this.notificationService.listenForMessages();
      })
      .catch((error) => {
        console.error('Erro ao solicitar permissão:', error);
      });
  }
}
