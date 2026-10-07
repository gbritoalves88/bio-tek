import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricasMes, StreakData } from '../perfil.model';
import { StreakService } from '../../../core/services/streak.service';

@Component({
  selector: 'app-progresso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progresso.component.html',
  styleUrl: './progresso.component.scss'
})
export class ProgressoComponent implements OnInit {
  @Input() usuarioId = '';
  @Input() usuario: any = null; // pra pegar quantidadeLivros, quantidadeLivrosLidos, mediaAvaliacoes

  streak: StreakData | null = null;
  historico: string[] = [];
  metricas: MetricasMes | null = null;
  carregando = false;

  constructor(
    private streakService: StreakService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.carregarProgresso();
    }
  }

  carregarProgresso(): void {
    if (!this.usuarioId) return;

    this.carregando = true;

    this.streakService.getStreak(this.usuarioId).subscribe({
      next: (data) => {
        this.streak = data;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });

    this.streakService.getHistorico(this.usuarioId).subscribe({
      next: (data) => {
        this.historico = data.dias;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });

    this.streakService.getMetricasMes(this.usuarioId).subscribe({
      next: (data) => {
        this.metricas = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get ultimos7Dias(): { dia: string; data: string }[] {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const resultado: { dia: string; data: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);

      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');

      resultado.push({
        dia: dias[data.getDay()],
        data: `${ano}-${mes}-${dia}`
      });
    }

    return resultado;
  }

  diaAtivo(dataStr: string): boolean {
    return this.historico.includes(dataStr);
  }
}
