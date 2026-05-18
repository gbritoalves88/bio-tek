// src/app/shared/comentarios-modal/comentarios-modal.component.ts

import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Comentario } from './comentarios-modal.model';

@Component({
  selector: 'app-comentarios-modal',
  standalone: true,  // ⬅️ TEM QUE TER ISSO
  imports: [CommonModule, FormsModule],
  templateUrl: './comentarios-modal.component.html',
  styleUrl: './comentarios-modal.component.scss'
})
export class ComentariosModalComponent {
  @Input() livroId: string = '';
  @Input() livroTitulo: string = '';
  @Input() aberto: boolean = false;
  @Output() fechar = new EventEmitter<void>();

  comentarios: Comentario[] = [];
  novoComentario = '';
  carregandoComentarios = false;

  private apiComentario = 'http://localhost:5081/api/ComentarioLivro';
  private apiUsuario = 'http://localhost:5081/api/Usuario';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    if (this.aberto && this.livroId) {
      this.carregarComentarios();
    }
  }

  carregarComentarios(): void {
    this.carregandoComentarios = true;
    this.http.get<any[]>(`${this.apiComentario}/livro/${this.livroId}`).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.comentarios = [];
          this.carregandoComentarios = false;
          this.cdr.markForCheck();
          return;
        }
        const idsUsuarios = [...new Set(data.map(c => c.idUsuario))];
        const requisicoes = idsUsuarios.map(id =>
          this.http.get<any>(`${this.apiUsuario}/${id}`)
        );
        forkJoin(requisicoes).subscribe({
          next: (usuarios) => {
            const usuarioMap = new Map(usuarios.map(u => [u.id, u]));
            this.comentarios = data.map(c => ({
              id: c.id,
              idUsuario: c.idUsuario,
              usuarioNickname: usuarioMap.get(c.idUsuario)?.nickname || '@desconhecido',
              comentario: c.comentario,
              dataCriacao: c.dataCriacao
            }));
            this.carregandoComentarios = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.comentarios = data.map(c => ({
              id: c.id,
              idUsuario: c.idUsuario,
              usuarioNickname: '@user',
              comentario: c.comentario,
              dataCriacao: c.dataCriacao
            }));
            this.carregandoComentarios = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.carregandoComentarios = false;
        this.cdr.markForCheck();
      }
    });
  }

  enviarComentario(): void {
    if (!this.novoComentario.trim()) return;
    this.http.post(this.apiComentario, {
      idLivro: this.livroId,
      comentario: this.novoComentario.trim()
    }).subscribe({
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
