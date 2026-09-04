import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notificacao } from '../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-wrapper">
      <div class="notification-bell"
           [class.tem-notificacoes]="naoLidas > 0"
           (click)="togglePanel($event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="badge"
              *ngIf="naoLidas > 0"
              [class.pulsante]="naoLidas > 0">
          {{ naoLidas > 9 ? '9+' : naoLidas }}
        </span>
      </div>

      <div class="notification-panel" *ngIf="panelAberto" (click)="$event.stopPropagation()">
        <div class="panel-header">
          <span>Notificações</span>
          <button class="marcar-lidas" (click)="marcarTodasLidas()" *ngIf="notificacoes.length > 0">
            Marcar todas como lidas
          </button>
        </div>
        <div class="panel-body">
          <div class="notificacao-item" *ngFor="let n of notificacoes" [class.nao-lida]="!n.lida">
            <span class="icone">{{ getIconeNotificacao(n.tipo) }}</span>
            <div class="mensagem">
              <span class="texto">{{ n.mensagem }}</span>
              <span class="data">{{ formatarData(n.dataCriacao) }}</span>
            </div>
          </div>
          <div class="empty" *ngIf="notificacoes.length === 0">
            Nenhuma notificação
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-wrapper {
      position: relative;
    }

    .notification-bell {
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      svg {
        width: 20px;
        height: 20px;
        stroke: var(--text-secondary);
        transition: transform 0.3s ease;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);
        svg {
          stroke: var(--accent);
        }
      }

      &.tem-notificacoes {
        svg {
          animation: bellRing 1s ease-in-out;
        }
      }
    }

    @keyframes bellRing {
      0%, 100% {
        transform: rotate(0deg);
      }
      10%, 30% {
        transform: rotate(10deg);
      }
      20%, 40% {
        transform: rotate(-10deg);
      }
      50% {
        transform: rotate(5deg);
      }
      60% {
        transform: rotate(-5deg);
      }
      70% {
        transform: rotate(0deg);
      }
    }

    .badge {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #e74c3c;
      color: white;
      font-size: 10px;
      font-weight: 600;
      min-width: 16px;
      height: 16px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;

      &.pulsante {
        animation: badgePulse 1s ease-in-out infinite;
      }
    }

    @keyframes badgePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
    }

    .notification-panel {
      position: absolute;
      top: 45px;
      right: 0;
      width: 320px;
      max-height: 400px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
    }

    .notification-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: var(--bg-card);
      border: 1px solid var(--accent);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease;
      max-width: 90%;

      .toast-icone {
        font-size: 24px;
      }

      .toast-mensagem {
        font-size: 14px;
        color: var(--text-primary);
        line-height: 1.4;
      }

      &.visivel {
        transform: translateX(-50%) translateY(0);
      }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
    }

    .marcar-lidas {
      background: none;
      border: none;
      font-size: 11px;
      color: var(--accent);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .panel-body {
      max-height: 350px;
      overflow-y: auto;
    }

    .notificacao-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(0, 0, 0, 0.02);
      }

      &.nao-lida {
        background: rgba(237, 158, 55, 0.08);
      }

      .icone {
        font-size: 20px;
        flex-shrink: 0;
      }

      .mensagem {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .texto {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .data {
          font-size: 10px;
          color: var(--text-secondary);
        }
      }
    }

    .empty {
      text-align: center;
      padding: 40px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    @media (max-width: 480px) {
      .notification-panel {
        position: fixed;
        top: 60px;
        right: 8px;
        left: 8px;
        width: auto;
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  panelAberto = false;
  naoLidas = 0;
  notificacoes: Notificacao[] = [];
  private intervalId: any;
  private ultimaAtividade = Date.now();

  @HostListener('document:mousemove')
  @HostListener('document:click')
  @HostListener('document:keydown')
  @HostListener('document:scroll')
  onUserActivity(): void {
    this.ultimaAtividade = Date.now();

    if (this.panelAberto) {
      this.panelAberto = false;
    }
  }

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Carrega imediatamente
    this.carregarNotificacoes();

    // Verifica a cada 1 minuto
    this.intervalId = setInterval(() => {
      const segundosInativo = (Date.now() - this.ultimaAtividade) / 1000;

      // Só verifica se usuário esteve ativo no último minuto
      if (segundosInativo < 30) {
        this.carregarNotificacoes();
      }
    }, 30000); // 30 segundos
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // 🆕 Método único: carrega todas e calcula contador
  carregarNotificacoes(): void {
    this.notificationService.getAll().subscribe({
      next: (data: Notificacao[]) => {
        const contadorAntigo = this.naoLidas;

        this.notificacoes = data;
        this.naoLidas = data.filter(n => !n.lida).length;

        // 🆕 Se aumentou, anima o sino E mostra toast
        if (this.naoLidas > contadorAntigo) {
          this.animarSino();
          this.mostrarToast(data[0]); // 🆕 Mostra a notificação mais recente
        }
      },
      error: (err) => {
        console.error('Erro ao carregar notificações:', err);
      }
    });
  }

  private mostrarToast(notificacao: Notificacao): void {
    const icone = this.getIconeNotificacao(notificacao.tipo);
    const mensagem = notificacao.mensagem;

    // Criar elemento toast
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <span class="toast-icone">${icone}</span>
      <span class="toast-mensagem">${mensagem}</span>
    `;

    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
      toast.classList.add('visivel');
    }, 100);

    // Remover após 5 segundos
    setTimeout(() => {
      toast.classList.remove('visivel');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }


  // 🆕 Método para animar o sino
  private animarSino(): void {
    const bell = document.querySelector('.notification-bell');
    if (bell) {
      bell.classList.remove('tem-notificacoes');
      // Força reflow para reiniciar animação
      void (bell as HTMLElement).offsetWidth;
      bell.classList.add('tem-notificacoes');
    }
  }

  getIconeNotificacao(tipo: string): string {
    switch (tipo) {
      case 'seguidor': return '👤';
      case 'curtida_livro': return '📚';
      case 'curtida_avaliacao': return '⭐';
      case 'comentario': return '💬';
      case 'comentario_avaliacao': return '💬';
      case 'streak': return '🔥';
      case 'leitura': return '📖';
      case 'incentivo': return '📕';
      default: return '🔔';
    }
  }

  formatarData(dataISO: string): string {
    if (!dataISO) return '';

    const data = new Date(dataISO);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');

    if (data.toDateString() === hoje.toDateString()) {
      return `Hoje às ${horas}:${minutos}`;
    }

    if (data.toDateString() === ontem.toDateString()) {
      return `Ontem às ${horas}:${minutos}`;
    }

    return `${dia}/${mes} às ${horas}:${minutos}`;
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    this.panelAberto = !this.panelAberto;

    if (this.panelAberto) {
      // Recarrega ao abrir
      this.carregarNotificacoes();

      // Marca como lidas
      if (this.naoLidas > 0) {
        this.notificationService.marcarLidas().subscribe({
          next: () => {
            this.carregarNotificacoes();
          }
        });
      }
    }
  }

  marcarTodasLidas(): void {
    this.notificationService.marcarLidas().subscribe({
      next: () => {
        this.carregarNotificacoes();
      },
      error: (err) => {
        console.error('Erro ao marcar todas como lidas:', err);
      }
    });
  }
}
