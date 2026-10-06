import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { ThemeStatusBarService } from '../../shared/services/theme-status-bar.service';
import { getAvatarUrl } from '../../shared/utils/avatar-helper';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {

  isDarkMode = true;
  menuOpen = false;
  isAdmin = false;
  adminExpandido = false;

  // 🆕 Avatar + menu
  avatarUrl = '';
  nomeUsuario = '';
  menuAvatarAberto = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private themeStatusBar: ThemeStatusBarService
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.isAdmin = usuario?.adm === true;

    if (isPlatformBrowser(this.platformId)) {
      const usuarioStorage = JSON.parse(localStorage.getItem('usuario') || '{}');

      this.isDarkMode = usuarioStorage.tema !== 2;

      // 🆕 Avatar + nome
      this.avatarUrl = getAvatarUrl(usuarioStorage);
      this.nomeUsuario = usuarioStorage?.nome || 'Usuário';

      if (this.isDarkMode) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }

      this.themeStatusBar.aplicarTema(this.isDarkMode ? 1 : 2);
    }
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
    // Por enquanto, navega pro Perfil (onde a lógica de modal já existe)
    this.router.navigate(['/inicio/perfil']);
  }

  // 🆕 Toggle de tema (trazido de volta)
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

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    usuario.tema = this.isDarkMode ? 1 : 2;
    localStorage.setItem('usuario', JSON.stringify(usuario));

    this.themeStatusBar.aplicarTema(this.isDarkMode ? 1 : 2);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
