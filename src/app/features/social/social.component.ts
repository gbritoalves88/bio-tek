// src/app/features/social/social.component.ts (apenas as mudanças)

import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial, LivroSocial } from './social.model';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';

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
  perfilSelecionado: UsuarioSocial | null = null;
  livrosUsuario: LivroSocial[] = [];
  carregandoPerfil = false;
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';

  constructor(
    private socialService: SocialService,
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
        console.error('Erro:', err);
        this.carregando = false;
      }
    });
  }

  verPerfil(usuario: UsuarioSocial): void {
    this.carregandoPerfil = true;
    this.socialService.getPerfilCompletoComLivros(usuario.id).subscribe({
      next: ({ perfil, livros }) => {
        this.perfilSelecionado = perfil;
        this.livrosUsuario = livros;
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
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.comentariosAberto = true;
  }

  getStatusTexto(status: number): string {
    switch (status) { case 2: return '📖 Lendo'; case 3: return '✅ Lido'; default: return '📕 Quero ler'; }
  }

  getStatusClass(status: number): string {
    switch (status) { case 2: return 'lendo'; case 3: return 'lido'; default: return 'quero-ler'; }
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
