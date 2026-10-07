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
            <path
              d="M20 102A10 10 0 0 1 30 92H80V8H30A10 10 0 0 0 20 18v84z"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
            />
          </svg>

          <h1>BliTeca</h1>
          <p>Termos de Uso</p>
        </div>

        <div class="termo-conteudo">

          <p>
            Bem-vindo ao BliTeca! Antes de começar, leia nossos termos.
          </p>

          <h3>📚 O que é o BliTeca?</h3>
          <p>
            O BliTeca é uma plataforma voltada para organização de leituras,
            avaliações de livros e interação entre leitores através de
            comentários, atividades e recursos sociais.
          </p>

          <h3>🔒 Sua Conta</h3>
          <p>
            O usuário é responsável pelas informações fornecidas em sua conta
            e pela segurança de seu acesso. O login poderá ser realizado
            através de provedores externos, como o Google.
          </p>

          <h3>📝 Conteúdo Publicado</h3>
          <p>
            Ao utilizar a plataforma, você concorda em não publicar conteúdo
            ofensivo, discriminatório, ilegal ou que viole direitos de terceiros.
          </p>

          <p>
            Comentários e avaliações podem ser visualizados por outros usuários
            de acordo com as funcionalidades da plataforma.
          </p>

          <h3>📷 Direitos Autorais</h3>
          <p>
            As informações e imagens relacionadas aos livros exibidos no
            BliTeca podem ser obtidas através de serviços e APIs de terceiros.
            Os direitos sobre as respectivas obras pertencem aos seus
            titulares, quando aplicável.
          </p>

          <h3>📄 Arquivos de Leitura</h3>
          <p>
            O BliTeca permite que o usuário vincule arquivos de leitura,
            como PDF e EPUB, armazenados em seu próprio dispositivo,
            aos livros cadastrados na plataforma.
          </p>

          <p>
            O usuário declara que possui ou possui autorização para utilizar
            os arquivos selecionados. O BliTeca não fornece, disponibiliza,
            comercializa ou distribui livros ou arquivos protegidos por
            direitos autorais.
          </p>

          <p>
            Os arquivos selecionados permanecem armazenados no dispositivo
            do usuário e são utilizados para disponibilizar a funcionalidade
            de leitura e, quando aplicável, registrar o progresso da leitura.
          </p>

          <p>
            O BliTeca não disponibiliza esses arquivos para outros usuários
            da plataforma.
          </p>

          <h3>🔐 Privacidade</h3>
          <p>
            O BliTeca coleta e utiliza dados necessários para o funcionamento
            da plataforma, conforme descrito em sua Política de Privacidade.
          </p>

          <p>
            Arquivos PDF e EPUB selecionados pelo usuário para leitura
            permanecem privados e não são disponibilizados para outros
            usuários.
          </p>

          <h3>🗑️ Exclusão de Conta</h3>
          <p>
            O usuário poderá solicitar a exclusão de sua conta e dos dados
            associados ao BliTeca através dos canais disponibilizados
            pela plataforma.
          </p>

          <h3>⚙️ Disponibilidade do Serviço</h3>
          <p>
            O BliTeca é fornecido "como está", sem garantias de funcionamento
            ininterrupto. A plataforma poderá passar por manutenções,
            atualizações ou instabilidades ocasionais.
          </p>

          <h3>🛡️ Limitação de Responsabilidade</h3>
          <p>
            O BliTeca não se responsabiliza pela origem, conteúdo ou pelos
            direitos relacionados aos arquivos selecionados pelo usuário,
            nem por conteúdo publicado por usuários ou por indisponibilidade
            causada por terceiros ou serviços externos.
          </p>

          <h3>👤 Menores de Idade</h3>
          <p>
            Usuários menores de 18 anos devem utilizar a plataforma de acordo
            com as orientações e responsabilidades de seus responsáveis legais.
          </p>

          <h3>🔄 Alterações nos Termos</h3>
          <p>
            Os presentes termos poderão ser atualizados periodicamente.
            O uso contínuo da plataforma após alterações poderá implicar
            concordância com os novos termos, observadas as regras aplicáveis.
          </p>

          <p class="termo-atualizacao">
            <strong>Última atualização:</strong> Outubro de 2026
          </p>

        </div>

        <div class="termo-acoes">
          <button class="btn-recusar" (click)="recusar()">
            Recusar
          </button>

          <button class="btn-aceitar" (click)="aceitar()">
            Aceitar
          </button>
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

    .termo-atualizacao {
      margin-top: 20px !important;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
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

    .btn-recusar:hover,
    .btn-aceitar:hover {
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

        this.router.navigate(['/inicio/perfil'], {
          queryParams: { editar: true }
        });
      },

      error: () => {
        this.alertService.error(
          'Erro ao aceitar termos. Tente novamente.'
        );
      }
    });
  }


  recusar(): void {
    localStorage.clear();

    this.router.navigate(['/login'], {
      replaceUrl: true
    });
  }
}
