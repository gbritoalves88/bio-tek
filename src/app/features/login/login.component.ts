import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from './login.service';

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

  entrarComGoogle(): void {
    const client = google.accounts.oauth2.initCodeClient({
      client_id: '3559837920-73a93ipuafg6ngsbhaqe8cuh1vhqqbql.apps.googleusercontent.com',
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response: any) => {
        if (response.code) {
          // Trocar o code por ID token
          fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code: response.code,
              client_id: '3559837920-73a93ipuafg6ngsbhaqe8cuh1vhqqbql.apps.googleusercontent.com',
              client_secret: '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',
              redirect_uri: 'http://localhost:4200',
              grant_type: 'authorization_code'
            })
          })
          .then(res => res.json())
          .then(data => {
            const idToken = data.id_token;
            // Decodificar o token para pegar os dados
            const payload = JSON.parse(atob(idToken.split('.')[1]));

            this.loginService.loginComGoogle(
              idToken,
              payload.sub,
              payload.name,
              payload.email
            ).subscribe({
              next: () => {
                this.router.navigate(['/inicio']);
              },
              error: (err) => {
                console.error('Erro ao logar:', err);
              }
            });
          });
        }
      }
    });
    client.requestCode();
  }

  entrarComFacebook() {
    throw new Error('Method not implemented.');
  }

  entrarComoConvidado(): void {
    throw new Error('Method not implemented.');
  }
}
