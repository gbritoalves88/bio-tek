import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Comentario } from './comentarios-modal.model';
import { ComentariosModalService } from './comentarios-modal.service';

@Component({
  selector: 'app-comentarios-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comentarios-modal.component.html',
  styleUrl: './comentarios-modal.component.scss'
})
export class ComentariosModalComponent {
  @Input() livroId: string = '';
  @Input() livroTitulo: string = '';
  @Input() aberto: boolean = false;
  @Input() comentariosProntos: Comentario[] | null = null; // ⬅️ NOVO
  @Output() fechar = new EventEmitter<void>();

  comentarios: Comentario[] = [];
  novoComentario = '';
  carregandoComentarios = false;

  constructor(
    private comentariosService: ComentariosModalService,
    private cdr: ChangeDetectorRef
  ) {}


 ngOnChanges(): void {
  console.log('🔄 ngOnChanges - aberto:', this.aberto, 'livroId:', this.livroId);
  console.log('📦 comentariosProntos:', this.comentariosProntos);

  if (this.aberto && this.livroId) {
    if (this.comentariosProntos && this.comentariosProntos.length > 0) {
      console.log('✅ Usando comentários prontos');
      this.comentarios = this.comentariosProntos;
      this.carregandoComentarios = false;
    } else {
      console.log('⚠️ Buscando via API');
      this.carregarComentarios();
    }
  }
}

  carregarComentarios(): void {
    this.carregandoComentarios = true;
    this.comentariosService.getComentarios(this.livroId).subscribe({
      next: (comentarios) => {
        this.comentarios = comentarios;
        this.carregandoComentarios = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregandoComentarios = false;
        this.cdr.markForCheck();
      }
    });
  }

  enviarComentario(): void {
    if (!this.novoComentario.trim()) return;
    this.comentariosService.enviarComentario(this.livroId, this.novoComentario.trim()).subscribe({
      next: () => {
        this.novoComentario = '';
        this.carregarComentarios();
      },
      error: (err) => console.error('Erro ao comentar:', err)
    });
  }

  fecharModal(): void {
    this.fechar.emit();
  }
}
