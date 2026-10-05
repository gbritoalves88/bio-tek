import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PerfilService } from '../perfil/perfil.service';
import { AlertService } from '../../shared/services/alert.service';

@Component({
  selector: 'app-termo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="termo-page">
      <div class="termo-container">
        <div class="termo-header">
          <svg class="logo" viewBox="0 0 120 120" fill="none">
            <path d="M20 102A10 10 0 0 1 30 92H80V8H30A10 10 0 0 0 20 18v84z"
                  stroke="currentColor" stroke-width="3" fill="none"/>
          </svg>
          <h1>BliTeca</h1>
          <p>Termos de Uso</p>
        </div>

        <div class="termo-conteudo">
          <p>Bem-vindo ao BliTeca! Antes de começar, leia nossos termos.</p>

          <h3>📚 O que é o BliTeca?</h3>
          <p>Uma plataforma para organizar suas leituras, avaliar livros e interagir com outros leitores.</p>

          <h3>🔒 Sua Conta</h3>
          <p>Você é responsável pelas informações da sua conta. Mantenha seu login seguro.</p>

          <h3>📝 Conteúdo</h3>
          <p>Comentários e avaliações devem ser respeitosos. Não publique conteúdo ofensivo.</p>

          <h3>📷 Direitos Autorais</h3>
          <p>As capas dos livros são obtidas via APIs públicas. Todos os direitos pertencem aos detentores.</p>

          <h3>🔐 Privacidade</h3>
          <p>Coletamos apenas dados necessários para o funcionamento do app. Não compartilhamos seus dados.</p>
        </div>

        <div class="termo-acoes">
          <button class="btn-recusar" (click)="recusar()">Recusar</button>
          <button class="btn-aceitar" (click)="aceitar()">Aceitar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .termo-page {
      min-height: 100vh;
      background: var(--bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .termo-container {
      max-width: 500px;
      width: 100%;
      background: var(--bg-card);
      border-radius: 24px;
      padding: 32px;
      border: 1px solid var(--border-color);
    }
    .termo-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo {
      width: 60px;
      height: 60px;
      color: var(--accent);
    }
    h1 {
      margin: 8px 0 0;
      font-size: 24px;
      color: var(--accent);
    }
    .termo-header p {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .termo-conteudo {
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 24px;
      padding-right: 8px;
    }
    .termo-conteudo h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 4px;
      color: var(--text-primary);
    }
    .termo-conteudo p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0 0 8px;
    }
    .termo-acoes {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
    .btn-recusar {
      padding: 10px 24px;
      border-radius: 24px;
      border: 1px solid #e74c3c;
      background: transparent;
      color: #e74c3c;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-aceitar {
      padding: 10px 24px;
      border-radius: 24px;
      border: none;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-recusar:hover, .btn-aceitar:hover {
      opacity: 0.85;
    }
  `]
})
export class TermoComponent {
  constructor(
    private perfilService: PerfilService,
    private alertService: AlertService,
    private router: Router
  ) {}

  aceitar(): void {
      this.perfilService.aceitarTermos().subscribe({
        next: () => {
          this.alertService.success('Bem-vindo ao BliTeca!');
          // ✅ Passa queryParam para forçar edição
          this.router.navigate(['/inicio/perfil'], {
            queryParams: { editar: true }
          });
        },
        error: () => {
          this.alertService.error('Erro ao aceitar termos. Tente novamente.');
        }
      });
  }

  recusarOld(): void {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      this.router.navigate(['/']);
  }

  recusar(): void {
  localStorage.clear();
  this.router.navigate(['/login'], { replaceUrl: true });
}
}
