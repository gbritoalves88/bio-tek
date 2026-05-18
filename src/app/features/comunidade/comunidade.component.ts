// src/app/features/comunidade/comunidade.component.ts

import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComunidadeService } from './comunidade.service';
import { AtividadeComunidade, Comentario } from './comunidade.model';

@Component({
  selector: 'app-comunidade',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comunidade.component.html',
  styleUrl: './comunidade.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class ComunidadeComponent implements OnInit {
  atividades: AtividadeComunidade[] = [];
  carregando = true;

  modalAberto = false;
  itemSelecionado: AtividadeComunidade | null = null;
  novoComentario = '';
  comentarios: Comentario[] = [];
  carregandoComentarios = false;
  seguindoIds: Set<string> = new Set();
  meuId = '';

  constructor(
    private comunidadeService: ComunidadeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.meuId = usuario.id || '';
      this.carregarFeed();
      this.carregarSeguindo();
    }
  }

  carregarFeed(): void {
    this.comunidadeService.getFeedComunidade(this.meuId).subscribe({
      next: (data) => {
        this.atividades = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
      }
    });
  }

  abrirModal(item: AtividadeComunidade): void {
    this.itemSelecionado = item;
    this.modalAberto = true;
    this.novoComentario = '';
    this.comentarios = [];
    if (item.tipo === 'livro_avaliado') {
      this.carregarComentarios(item.livro.id);
    }
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.itemSelecionado = null;
    this.comentarios = [];
    this.novoComentario = '';
  }

  carregarComentarios(idLivro: string): void {
    this.carregandoComentarios = true;
    this.comunidadeService.getComentariosDoLivro(idLivro).subscribe({
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
    if (!this.novoComentario.trim() || !this.itemSelecionado) return;
    this.comunidadeService.enviarComentario(this.itemSelecionado.livro.id, this.novoComentario.trim()).subscribe({
      next: () => {
        this.novoComentario = '';
        this.carregarComentarios(this.itemSelecionado!.livro.id);
      },
      error: (err) => console.error('Erro ao comentar:', err)
    });
  }

  carregarSeguindo(): void {
    this.comunidadeService.getSeguindo().subscribe({
      next: (ids) => {
        this.seguindoIds = new Set(ids);
        this.cdr.markForCheck();
      }
    });
  }

  estaSeguindo(idUsuario: string): boolean {
    return this.seguindoIds.has(idUsuario);
  }

  seguirUsuario(idUsuario: string): void {
    this.comunidadeService.seguir(idUsuario).subscribe({
      next: () => {
        this.seguindoIds.add(idUsuario);
        this.cdr.markForCheck();
      }
    });
  }

  deixarDeSeguirUsuario(idUsuario: string): void {
    this.comunidadeService.deixarDeSeguir(idUsuario).subscribe({
      next: () => {
        this.seguindoIds.delete(idUsuario);
        this.cdr.markForCheck();
      }
    });
  }

  getIconeTipo(tipo: string): string {
    switch (tipo) { case 'livro_novo': return '📕'; case 'livro_lendo': return '📖'; case 'livro_lido': return '✅'; case 'livro_avaliado': return '⭐'; default: return '📚'; }
  }

  getTextoTipo(tipo: string): string {
    switch (tipo) { case 'livro_novo': return 'Adicionou um Livro'; case 'livro_lendo': return 'Está Lendo'; case 'livro_lido': return 'Terminou de Ler'; case 'livro_avaliado': return 'Avaliou'; default: return ''; }
  }

  getEstrelas(nota: number): string {
    return '⭐'.repeat(nota);
  }
}
