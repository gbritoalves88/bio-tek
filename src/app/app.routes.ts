import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { HomeComponent } from './features/home/home.component';
import { BibliotecaComponent } from './features/biblioteca/biblioteca.component';
import { ComunidadeComponent } from './features/comunidade/comunidade.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { LoginComponent } from './features/login/login.component';
import { TermoComponent } from './features/termos/termos.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { PerfilCompletoGuard } from './core/guards/perfil-completo.guard';
import { LoginGuard } from './core/guards/login.guard';
import { LivroComponent } from './shared/livro/livro.component';

export const routes: Routes = [
  // ============ ROTAS PÚBLICAS ============
  {
    path: '',
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  { path: 'termo', component: TermoComponent },

  // ============ APP COM SHELL ============
  {
    path: 'inicio',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'biblioteca',
        component: BibliotecaComponent,
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'comunidade',
        component: ComunidadeComponent,
        canActivate: [PerfilCompletoGuard]
      },
      {
        path: 'perfil',
        component: PerfilComponent
      },
      {
        path: 'perfil/:id',
        component: PerfilComponent
      },
      {
        path: 'livro/:id',
        component: LivroComponent
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
