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

  abrirTermos(): void {
    this.mostrarTermos = true;
    this.mostrarPolitica = false;
    this.cdr.detectChanges();
  }

  abrirPolitica(): void {
    this.mostrarTermos = false;
    this.mostrarPolitica = true;
    this.cdr.detectChanges();
  }

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
        // ✅ Envia o code para o BACKEND (seguro!)
        this.enviarCodeParaBackend(response.code);
      }
    });
    client.requestCode();
  }

  // 🆕 Envia o code para o backend (não expõe client_secret)
  private enviarCodeParaBackend(code: string): void {
    this.loginService.loginComGoogleCode(code).subscribe({
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
