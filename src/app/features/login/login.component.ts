import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from './login.service';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../shared/services/alert.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  mostrarTermos = false;
  mostrarPolitica = false;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  carregando = false;
  mensagemErro = '';
  mostrarModalErro = false;

  fecharModalErro(): void {
    this.mostrarModalErro = false;
    this.mensagemErro = '';
    this.carregando = false;
    this.cdr.detectChanges();
  }

  private exibirErro(mensagem: string): void {
    this.carregando = false;
    this.mensagemErro = mensagem;
    this.mostrarModalErro = true;
    this.alertService.error(mensagem);
    this.cdr.detectChanges();
  }

  // ⬅️ ABRIR MODAL DE TERMOS
  abrirTermos(): void {
    this.mostrarTermos = true;
    this.mostrarPolitica = false;
    this.cdr.detectChanges();
  }

  // ⬅️ ABRIR MODAL DE POLÍTICA
  abrirPolitica(): void {
    this.mostrarTermos = false;
    this.mostrarPolitica = true;
    this.cdr.detectChanges();
  }

  // ⬅️ FECHAR MODAL
  fecharModalTermos(): void {
    this.mostrarTermos = false;
    this.mostrarPolitica = false;
    this.cdr.detectChanges();
  }

  entrarComGoogle(): void {
    this.carregando = true;
    this.cdr.detectChanges();

    const timeoutId = setTimeout(() => {
      if (this.carregando) {
        this.exibirErro('Tempo limite excedido. Tente novamente.');
      }
    }, 60000);

    const client = google.accounts.oauth2.initCodeClient({
      client_id: environment.google.clientId,
      scope: 'email profile openid',
      ux_mode: 'popup',
      callback: (response: any) => {
        clearTimeout(timeoutId);

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
                this.alertService.success(`Bem-vindo, ${response.usuario.nome}!`);
                if (response.novoUsuario) {
                  this.router.navigate(['/termo']);
                } else {
                  this.router.navigate(['/inicio']);
                }
              },
              error: (err) => {
                this.exibirErro(err.error?.mensagem || 'Erro ao fazer login. Tente novamente.');
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
    this.cdr.detectChanges();

    const nome = 'Convidado ' + Math.floor(Math.random() * 1000);
    const email = 'convidado' + Date.now() + '@temp.com';

    this.loginService.loginMock(nome, email).subscribe({
      next: (response) => {
        this.carregando = false;
        if (response.novoUsuario) {
          this.router.navigate(['/termo']);
        } else {
          this.router.navigate(['/inicio']);
        }
      },
      error: (err) => {
        this.exibirErro(err.error?.mensagem || 'Erro ao entrar como convidado');
      }
    });
  }
}
