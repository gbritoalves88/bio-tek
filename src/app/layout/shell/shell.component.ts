import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component'; // ⬅️ Adicionar

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent  // ⬅️ Adicionar
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {

  isDarkMode = true;
  menuOpen = false;
  isAdmin = false;
  adminExpandido = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.isAdmin = usuario?.adm === true;

    if (isPlatformBrowser(this.platformId)) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      this.isDarkMode = usuario.tema !== 2;

      if (this.isDarkMode) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
    }


  }

  toggleTheme() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }

    // Salvar apenas no localStorage
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    usuario.tema = this.isDarkMode ? 1 : 2;
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
