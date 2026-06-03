import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notificacao } from '../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-wrapper">
      <div class="notification-bell" (click)="togglePanel($event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="badge" *ngIf="naoLidas > 0">{{ naoLidas > 9 ? '9+' : naoLidas }}</span>
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
            <span class="icone">{{ n.tipo === 'seguidor' ? '👤' : '💬' }}</span>
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
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);
        svg {
          stroke: var(--accent);
        }
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
  onUserActivity() {
    this.ultimaAtividade = Date.now();
  }

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.carregarNotificacoes();

    this.intervalId = setInterval(() => {
      const segundosInativo = (Date.now() - this.ultimaAtividade) / 1000;
      if (segundosInativo < 60) {
        this.carregarNotificacoes();
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  carregarNotificacoes(): void {
    this.notificationService.getNaoLidas().subscribe({
      next: (data: Notificacao[]) => this.naoLidas = data.length
    });

    this.notificationService.getAll().subscribe({
      next: (data: Notificacao[]) => this.notificacoes = data
    });
  }

  // ⬅️ MÉTODO PARA FORMATAR DATA COM HORA
  formatarData(dataISO: string): string {
    const data = new Date(dataISO);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');

    // Se for hoje, mostra só a hora
    if (data.toDateString() === hoje.toDateString()) {
      return `Hoje às ${horas}:${minutos}`;
    }

    // Se for ontem, mostra "Ontem"
    if (data.toDateString() === ontem.toDateString()) {
      return `Ontem às ${horas}:${minutos}`;
    }

    // Caso contrário, mostra data completa
    return `${dia}/${mes} às ${horas}:${minutos}`;
  }

  togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    this.panelAberto = !this.panelAberto;

    if (this.panelAberto && this.naoLidas > 0) {
      this.notificationService.marcarLidas().subscribe(() => {
        this.carregarNotificacoes();
      });
    }
  }

  marcarTodasLidas(): void {
    this.notificationService.marcarLidas().subscribe(() => {
      this.carregarNotificacoes();
    });
  }

  @HostListener('document:click')
  fecharPanel(): void {
    if (this.panelAberto) {
      this.panelAberto = false;
    }
  }
}
