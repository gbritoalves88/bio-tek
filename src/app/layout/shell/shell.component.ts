import { Component, Inject, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { ThemeStatusBarService } from '../../shared/services/theme-status-bar.service';
import { getAvatarUrl } from '../../shared/utils/avatar-helper';
import { LeitorComponent } from '../../shared/leitor/leitor.component';
import { ShellService } from './shell.service';
import { AlertService } from '../../shared/services/alert.service';
import { SettingsLauncher } from '@capawesome/capacitor-settings-launcher';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { NotificationService } from '../../shared/services/notification.service';


@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent,
    LeitorComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {

  isDarkMode = true;
  menuOpen = false;
  isAdmin = false;
  mostrarNudgeNotificacao = false;
  private readonly NUDGE_KEY = 'bliteca_nudge_notificacao_fechado';

  // 🆕 Avatar + menu
  avatarUrl = '';
  nomeUsuario = '';
  menuAvatarAberto = false;
  confirmarExclusaoConta = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private themeStatusBar: ThemeStatusBarService,
    private shellService: ShellService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}

   ngOnInit() {
    // 🆕 Escuta as mudanças do usuário vindas do ShellService
    this.shellService.usuarioAtual$.subscribe(usuario => {
      if (!usuario || !usuario.id) return;

      // Configurações de tema e avatar
      this.isAdmin = usuario.adm === true;
      this.isDarkMode = usuario.tema !== 2;
      this.avatarUrl = getAvatarUrl(usuario);
      this.nomeUsuario = usuario.nome || 'Usuário';

      if (isPlatformBrowser(this.platformId)) {
        if (this.isDarkMode) {
          document.body.classList.add('dark-theme');
          document.body.classList.remove('light-theme');
        } else {
          document.body.classList.add('light-theme');
          document.body.classList.remove('dark-theme');
        }
        this.themeStatusBar.aplicarTema(this.isDarkMode ? 1 : 2);
      }

      // 🆕 Verifica o nudge (balão de notificação) de acordo com a plataforma
      if (Capacitor.isNativePlatform()) {
        this.verificarNudgeNotificacaoCapacitor();
      } else {
        this.verificarNudgeNotificacao(); // Versão de teste (navegador)
      }

      this.cdr.markForCheck();
    });
  }

  // 🆕 Toggle do menu do avatar
  toggleMenuAvatar(event: Event): void {
    event.stopPropagation();
    this.menuAvatarAberto = !this.menuAvatarAberto;
  }

  fecharMenuAvatar(): void {
    this.menuAvatarAberto = false;
  }

  // 🆕 Ações do menu
  abrirEdicaoPerfil(): void {
    this.menuAvatarAberto = false;
    this.router.navigate(['/inicio/perfil'], { queryParams: { editar: 'true' } });
  }

  abrirContato(): void {
    this.menuAvatarAberto = false;
    window.location.href = 'mailto:g.britoalves888@gmail.com?subject=Bliteca%20-%20Contato';
  }

  avaliarApp(): void {
    this.menuAvatarAberto = false;
    const appId = 'com.bliteca.app';
    window.open(`https://play.google.com/store/apps/details?id=${appId}&review=true`, '_blank');
  }

  compartilharApp(): void {
    this.menuAvatarAberto = false;
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.bliteca.app';
    const texto = '📚 Bliteca - Organize suas leituras, avalie livros e conecte-se com outros leitores!';

    if (navigator.share) {
      navigator.share({ title: 'Bliteca', text: texto, url: playStoreUrl })
        .catch(() => this.copiarLink(playStoreUrl));
    } else {
      this.copiarLink(playStoreUrl);
    }
  }

  private copiarLink(texto: string): void {
    navigator.clipboard.writeText(texto)
    .then(() => alert('Link copiado!'))
    .catch(() => alert('Compartilhe: ' + texto));
  }

  confirmarExcluirConta(): void {
    this.menuAvatarAberto = false;
    this.confirmarExclusaoConta = true;
  }

  fecharConfirmacaoExclusaoConta(): void {
    this.confirmarExclusaoConta = false;
  }

  excluirConta(): void {
    this.shellService.desativarConta().subscribe({
      next: () => {
        this.confirmarExclusaoConta = false;
        this.alertService.success('Conta desativada com sucesso');
        this.shellService.limparSessao();
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Erro ao desativar conta:', err);
        this.alertService.error('Erro ao desativar conta. Tente novamente.');
      }
    });
  }

  // 🆕 Toggle de tema atualizado para usar o ShellService
  toggleTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    this.shellService.atualizarUsuarioLocal({ tema: this.isDarkMode ? 1 : 2 });

    this.themeStatusBar.aplicarTema(this.isDarkMode ? 1 : 2);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  abrirAdmin(): void {
    this.menuAvatarAberto = false;
    this.router.navigate(['/inicio/admin']);
  }

  sair() {
    this.shellService.limparSessao();
    this.router.navigate(['/']);
  }

  async abrirConfiguracaoNotificacao() {
    try {
      await SettingsLauncher.openNotificationSettings();
    } catch (error) {
      console.error('Erro ao abrir configurações de notificação:', error);
    }
  }

  async verificarNudgeNotificacao(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const fechadoEm = localStorage.getItem(this.NUDGE_KEY);
    if (fechadoEm) {
      const dias = (Date.now() - new Date(fechadoEm).getTime()) / (1000 * 60 * 60 * 24);
      if (dias < 3) return;
    }

    // TEMPORÁRIO: só mostra o balão sem verificar o plugin
    this.mostrarNudgeNotificacao = true;
    this.cdr.detectChanges();
  }

  async verificarNudgeNotificacaoCapacitor(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. Verifica se o usuário já fechou o nudge nos últimos 3 dias
    const fechadoEm = localStorage.getItem(this.NUDGE_KEY);
    if (fechadoEm) {
      const diasDesdeFechamento = (Date.now() - new Date(fechadoEm).getTime()) / (1000 * 60 * 60 * 24);
      if (diasDesdeFechamento < 3) return;
    }

    try {
      // 2. Verifica a permissão no sistema (APK)
      const permissao = await PushNotifications.checkPermissions();

      // Se a permissão já está concedida, NÃO mostra o balão
      if (permissao.receive === 'granted') {
        this.mostrarNudgeNotificacao = false;
        this.cdr.markForCheck();
        return;
      }

      // 3. Se a permissão foi negada, mostra o balão (para o usuário ir nas configurações)
      // 4. Se nunca foi pedida (prompt), mostra o balão (para o usuário aceitar)
      this.mostrarNudgeNotificacao = true;
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('Erro ao verificar permissão de notificação:', e);
      // Se der erro, é melhor mostrar o balão do que esconder
      this.mostrarNudgeNotificacao = true;
      this.cdr.markForCheck();
    }
  }

  async ativarNotificacoesNudge(): Promise<void> {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.id) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // 1. Pede a permissão ao sistema
        const resultado = await PushNotifications.requestPermissions();

        if (resultado.receive === 'granted') {
          // 2. 🆕 Registra o token no banco via NotificationService
          // (Use o mesmo serviço/método que você usa na Home)
          this.notificationService.requestPermission(usuario.id)
            .then(() => {
              this.alertService.success('Lembretes ativados!');
              this.mostrarNudgeNotificacao = false;
              this.cdr.markForCheck();
            })
            .catch((err) => {
              console.error('Erro ao registrar token:', err);
              this.alertService.error('Erro ao ativar lembretes.');
            });
        } else {
          // Usuário negou a permissão
          this.alertService.warning('Você pode ativar depois nas configurações do celular.');
          this.fecharNudgeNotificacao();
        }
      } else {
        // Fallback para navegador (para testes)
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            this.alertService.success('Lembretes ativados!');
            this.mostrarNudgeNotificacao = false;
            this.cdr.markForCheck();
          } else {
            this.fecharNudgeNotificacao();
          }
        }
      }
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      this.alertService.error('Erro ao ativar lembretes');
    }
  }

  fecharNudgeNotificacao(): void {
    this.mostrarNudgeNotificacao = false;
    // Salva a data que o usuário fechou, para não mostrar de novo por 3 dias
    localStorage.setItem(this.NUDGE_KEY, new Date().toISOString());
    this.cdr.markForCheck();
  }

}
