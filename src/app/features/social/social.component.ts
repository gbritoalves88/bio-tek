// src/app/features/social/social.component.ts

import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial, LivroSocial } from './social.model';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, ComentariosModalComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class SocialComponent implements OnInit {
  seguindo: UsuarioSocial[] = [];
  carregando = true;

  // Modal perfil
  perfilSelecionado: UsuarioSocial | null = null;
  livrosUsuario: LivroSocial[] = [];
  carregandoPerfil = false;

  // Modal comentários
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';

  constructor(
    private socialService: SocialService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarSeguindo();
    }
  }

  carregarSeguindo(): void {
    this.socialService.getSeguindoComDados().subscribe({
      next: (usuarios) => {
        this.seguindo = usuarios;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar:', err);
        this.carregando = false;
      }
    });
  }

verPerfil(usuario: UsuarioSocial): void {
  this.carregandoPerfil = true;
  this.livrosUsuario = [];

  forkJoin([
    this.socialService.getPerfilCompleto(usuario.id),
    this.socialService.getLivrosDoUsuario(usuario.id),
    this.http.get<any[]>(`http://localhost:5081/api/AvaliacaoLivro/usuario/${usuario.id}`)
  ]).subscribe({
    next: ([perfilCompleto, livros, avaliacoes]) => {
      this.perfilSelecionado = perfilCompleto;

      // Cruza avaliações com livros
      this.livrosUsuario = livros.map(livro => {
        const aval = avaliacoes.find(a => a.idLivro === livro.id);
        return { ...livro, estrelas: aval ? aval.nota : undefined };
      }).sort((a, b) =>
        new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
      );

      this.carregandoPerfil = false;
      this.cdr.markForCheck();
    },
    error: () => {
      this.perfilSelecionado = usuario;
      this.carregandoPerfil = false;
      this.cdr.markForCheck();
    }
  });
}

  fecharPerfil(): void {
    this.perfilSelecionado = null;
    this.livrosUsuario = [];
  }

  abrirComentarios(livro: LivroSocial): void {
    console.log('📖 Abrindo comentários:', livro);
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.comentariosAberto = true;
  }
  getStatusTexto(status: number): string {
    switch (status) {
      case 2: return '📖 Lendo';
      case 3: return '✅ Lido';
      default: return '📕 Quero ler';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 2: return 'lendo';
      case 3: return 'lido';
      default: return 'quero-ler';
    }
  }

  deixarDeSeguir(idUsuario: string): void {
    if (confirm('Deixar de seguir?')) {
      this.socialService.deixarDeSeguir(idUsuario).subscribe({
        next: () => this.carregarSeguindo(),
        error: (err) => console.error('Erro:', err)
      });
    }
  }
}
