import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { HomeComponent } from './features/home/home.component';
import { BibliotecaComponent } from './features/biblioteca/biblioteca.component';
import { ComunidadeComponent } from './features/comunidade/comunidade.component';
import { SocialComponent } from './features/social/social.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  // Tela inicial → Login
  { path: '', component: LoginComponent },

  // App interno
  {
    path: 'inicio',
    component: ShellComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'biblioteca', component: BibliotecaComponent },
      { path: 'comunidade', component: ComunidadeComponent },
      { path: 'social', component: SocialComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'perfil/:id', component: PerfilComponent }, // ← Sem renderMode
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
