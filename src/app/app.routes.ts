import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { PerfilCompletoGuard } from './core/guards/perfil-completo.guard';
import { LoginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  // ============ ROTAS PÚBLICAS ============
  {
    path: '',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
    canActivate: [LoginGuard]
  },
  {
    path: 'termo',
    loadComponent: () => import('./features/termos/termos.component').then(m => m.TermoComponent)
  },

  // ============ APP COM SHELL ============
  {
    path: 'inicio',
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'biblioteca',
        loadComponent: () => import('./features/biblioteca/biblioteca.component').then(m => m.BibliotecaComponent),
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'comunidade',
        loadComponent: () => import('./features/comunidade/comunidade.component').then(m => m.ComunidadeComponent),
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
      },
      {
        path: 'perfil/:id',
        loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
      },
      {
        path: 'livro/:id',
        loadComponent: () => import('./shared/livro/livro.component').then(m => m.LivroComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AdminGuard]
      }
    ]
  },

  // ============ FALLBACK ============
  { path: '**', redirectTo: '' }
];
