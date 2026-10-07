import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtividadeLeitura } from '../perfil.model';
import { PerfilService } from '../perfil.service';

@Component({
  selector: 'app-atividades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './atividade.component.html',
  styleUrl: './atividade.component.scss'
})
export class AtividadesComponent implements OnInit {
  @Input() usuarioId = '';

  atividades: AtividadeLeitura[] = [];
  carregando = false;

  constructor(
    private perfilService: PerfilService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.carregarAtividades();
    }
  }

  carregarAtividades(): void {
    if (!this.usuarioId) return;

    this.carregando = true;
    this.perfilService.getAtividades(this.usuarioId).subscribe({
      next: (data) => {
        this.atividades = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar atividades:', err);
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }
}
