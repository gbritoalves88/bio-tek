// src/app/features/social/social.component.ts (apenas as mudanças)

import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial, LivroSocial } from './social.model';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { Router } from '@angular/router';

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
  livroComentarioProntos: any[] | null = null;

  constructor(
    private socialService: SocialService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarSeguindo();
    }
  }

  carregarSeguindo(): void {
    this.socialService.getSeguindoCompleto().subscribe({
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

    // ⬅️ Use o novo endpoint
    this.socialService.getPerfilCompleto(usuario.id).subscribe({
      next: (data) => {
        console.log('📦 Dados do perfil:', data); // Debug

        this.perfilSelecionado = {
          id: data.id,
          nome: data.nome,
          nickname: data.nickname,
          avatar: data.avatar,
          descricao: data.descricao,
          quantidadeLivros: data.quantidadeLivros,
          quantidadeLivrosLidos: data.quantidadeLivrosLidos,
          mediaAvaliacoes: data.mediaAvaliacoes
        };

        this.livrosUsuario = data.livros.map((l: any) => ({
          id: l.id,
          titulo: l.titulo,
          autor: l.autor,
          imagem: l.imagem,
          status: l.status,
          dataCriacao: l.dataCriacao,
          estrelas: l.avaliacao?.nota,
          comentarios: l.comentarios // ⬅️ Preserva os comentários
        }));

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

  irParaPerfil(id: string): void {
    console.log('🔍 Navegando para perfil do usuário:', id);
    this.router.navigate(['/inicio/perfil', id]);
  }

  abrirComentarios(livro: any): void {
    console.log('📖 Livro clicado:', livro);
    console.log('💬 Comentários do livro:', livro.comentarios);

    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;

    this.livroComentarioProntos = livro.comentarios?.map((c: any) => ({
      id: c.id,
      idUsuario: '',
      usuarioNickname: c.usuario?.nickname || '@user',
      comentario: c.comentario,
      dataCriacao: c.dataCriacao
    })) || null;

    console.log('📦 comentariosProntos mapeado:', this.livroComentarioProntos);
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
        next: () => {
          this.socialService.limparCacheSeguindo(); // ⬅️ Limpa cache
          this.carregarSeguindo();
        },
        error: (err) => console.error('Erro:', err)
      });
    }
  }
}
