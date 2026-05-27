import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from './login.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  carregando = false;



  entrarComGoogle(): void {
  this.carregando = true; // ⬅️ Ativa a animação

  const client = google.accounts.oauth2.initCodeClient({
    client_id: environment.google.clientId,
    scope: 'email profile openid',
    ux_mode: 'popup',
    callback: (response: any) => {
      if (response.code) {
        fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: response.code,
            client_id: environment.google.clientId,
            client_secret: environment.google.clientSecret,
            redirect_uri: environment.google.redirectUri,
            grant_type: 'authorization_code'
          })
        })
        .then(res => res.json())
        .then(data => {
          const idToken = data.id_token;
          const payload = JSON.parse(atob(idToken.split('.')[1]));

          this.loginService.loginComGoogle(idToken, payload.sub, payload.name, payload.email)
            .subscribe({
              next: (response) => {
                this.carregando = false; // ⬅️ Desativa
                if (response.novoUsuario) {
                  this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
                } else {
                  this.router.navigate(['/inicio']);
                }
              },
              error: (err) => {
                this.carregando = false; // ⬅️ Desativa com erro
                console.error('Erro ao logar:', err);
              }
            });
        })
        .catch(() => {
          this.carregando = false; // ⬅️ Desativa se falhar
        });
      } else {
        this.carregando = false; // ⬅️ Desativa se não tiver code
      }
    }
  });
  client.requestCode();
}


  entrarComoConvidado(): void {
    console.log('Facebook login não implementado');
  }

  entrarMock(nome: string, nickname: string): void {
    const email = nickname.replace('@', '') + '@mock.com';
    this.fazerLoginMock(nome, email, nickname);
  }

  private fazerLoginMock(nome: string, email: string, nickname?: string): void {
    this.loginService.loginMock(nome, email, nickname).subscribe({
      next: (response) => {
        if (response.novoUsuario) {
          this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => console.error('Erro ao logar:', err)
    });
  }

  entrarComFacebook(): void {
    console.log('Facebook login não implementado');
  }
}
