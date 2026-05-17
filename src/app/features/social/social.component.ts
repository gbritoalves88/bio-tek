// src/app/features/social/social.component.ts

import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial, LivroSocial } from './social.model';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class SocialComponent implements OnInit {
  seguindo: UsuarioSocial[] = [];
  carregando = true;

  // Modal
  perfilSelecionado: UsuarioSocial | null = null;
  livrosUsuario: LivroSocial[] = [];
  carregandoPerfil = false;

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
        console.error('Erro ao carregar:', err);
        this.carregando = false;
      }
    });
  }

  verPerfil(usuario: UsuarioSocial): void {
    this.perfilSelecionado = usuario;
    this.carregandoPerfil = true;
    this.livrosUsuario = [];

    this.socialService.getLivrosDoUsuario(usuario.id).subscribe({
      next: (livros) => {
        this.livrosUsuario = livros.sort((a, b) =>
          new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
        );
        this.carregandoPerfil = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregandoPerfil = false;
        this.cdr.markForCheck();
      }
    });
  }

  fecharPerfil(): void {
    this.perfilSelecionado = null;
    this.livrosUsuario = [];
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
