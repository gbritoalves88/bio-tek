// src/app/features/login/login.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
export class LoginComponent implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loginService: LoginService
  ) {}

  carregando = false;
  mensagemErro = '';
  mostrarModalErro = false;

  ngOnInit(): void {
    // Verifica se veio mensagem de erro na URL
    this.route.queryParams.subscribe(params => {
      if (params['erro']) {
        this.mensagemErro = decodeURIComponent(params['erro']);
        this.mostrarModalErro = true;
        // Limpa a URL
        window.history.replaceState({}, '', '/');
      }
    });
  }

  fecharModalErro(): void {
    this.mostrarModalErro = false;
    this.mensagemErro = '';
  }

  entrarComGoogle(): void {
    this.carregando = true;

    const client = google.accounts.oauth2.initCodeClient({
      client_id: environment.google.clientId,
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response: any) => {
        if (!response || !response.code) {
          this.carregando = false;
          window.location.href = '/?erro=' + encodeURIComponent('Login cancelado. Tente novamente.');
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
            window.location.href = '/?erro=' + encodeURIComponent('Erro ao obter token do Google.');
            return;
          }

          const payload = JSON.parse(atob(data.id_token.split('.')[1]));

          this.loginService.loginComGoogle(data.id_token, payload.sub, payload.name, payload.email)
            .subscribe({
              next: (response) => {
                if (response.novoUsuario) {
                  this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
                } else {
                  this.router.navigate(['/inicio']);
                }
              },
              error: (err) => {
                const msg = err.status === 401 && err.error?.mensagem
                  ? err.error.mensagem
                  : 'Erro ao fazer login. Tente novamente.';
                window.location.href = '/?erro=' + encodeURIComponent(msg);
              }
            });
        })
        .catch(() => {
          window.location.href = '/?erro=' + encodeURIComponent('Erro ao conectar com o Google.');
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
        if (response.novoUsuario) {
          this.router.navigate(['/inicio/perfil'], { queryParams: { novo: true } });
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        const msg = err.status === 401 && err.error?.mensagem
          ? err.error.mensagem
          : 'Erro ao fazer login. Tente novamente.';
        window.location.href = '/?erro=' + encodeURIComponent(msg);
      }
    });
  }

  entrarComFacebook(): void {
    console.log('Facebook login não implementado');
  }
}
