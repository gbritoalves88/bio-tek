import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { HomeComponent } from './features/home/home.component';
import { BibliotecaComponent } from './features/biblioteca/biblioteca.component';
import { ComunidadeComponent } from './features/comunidade/comunidade.component';
import { SocialComponent } from './features/social/social.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { LoginComponent } from './features/login/login.component';
import { TermoComponent } from './features/termos/termos.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { PerfilCompletoGuard } from './core/guards/perfil-completo.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'termo', component: TermoComponent },

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
        path: 'social',
        component: SocialComponent,
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
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AdminGuard]
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
