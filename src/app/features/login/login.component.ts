// src/app/features/login/login.component.ts

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
  mensagemErro = '';
  mostrarModalErro = false;

  fecharModalErro(): void {
    this.mostrarModalErro = false;
    this.mensagemErro = '';
    this.carregando = false;
  }

  private exibirErro(mensagem: string): void {
    this.carregando = false;
    this.mensagemErro = mensagem;
    this.mostrarModalErro = true;
  }

  entrarComGoogle(): void {
  this.carregando = true;

  // ⬅️ Fallback: se o callback não for chamado em 60 segundos
  setTimeout(() => {
    if (this.carregando) {
      this.exibirErro('Tempo limite excedido. Tente novamente.');
    }
  }, 60000);

  const client = google.accounts.oauth2.initCodeClient({
    client_id: environment.google.clientId,
    scope: 'email profile openid',
    ux_mode: 'popup',
    callback: (response: any) => {
      // ⬅️ Verificação dupla
      if (this.carregando === false) return;

      if (!response || !response.code) {
        this.exibirErro('Login cancelado. Tente novamente.');
        return;
      }

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
        if (!data.id_token) {
          this.exibirErro('Erro ao obter token do Google.');
          return;
        }

        const payload = JSON.parse(atob(data.id_token.split('.')[1]));

        this.loginService.loginComGoogle(data.id_token, payload.sub, payload.name, payload.email)
          .subscribe({
            next: (response) => {
              this.carregando = false;
              if (response.novoUsuario) {
                this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
              } else {
                this.router.navigate(['/inicio']);
              }
            },
            error: (err) => {
              if (err.status === 401 && err.error?.mensagem) {
                this.exibirErro(err.error.mensagem);
              } else {
                this.exibirErro('Erro ao fazer login. Tente novamente.');
              }
            }
          });
      })
      .catch(() => {
        this.exibirErro('Erro ao conectar com o Google.');
      });
    }
  });
  client.requestCode();
}
  entrarComoConvidado(): void {
    this.carregando = true;
    const nome = 'Leitor Convidado';
    const email = 'convidado' + Date.now() + '@mock.com';

    this.loginService.loginMock(nome, email).subscribe({
      next: (response) => {
        this.carregando = false;
        if (response.novoUsuario) {
          this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        if (err.status === 401 && err.error?.mensagem) {
          this.exibirErro(err.error.mensagem);
        } else {
          this.exibirErro('Erro ao fazer login. Tente novamente.');
        }
      }
    });
  }

  entrarComFacebook(): void {
    console.log('Facebook login não implementado');
  }
}
