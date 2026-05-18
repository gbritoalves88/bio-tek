import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComunidadeService } from './comunidade.service';
import { AtividadeComunidade, Comentario } from './comunidade.model';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

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

  // Modal
  modalAberto = false;
  itemSelecionado: AtividadeComunidade | null = null;
  novoComentario = '';
  comentarios: Comentario[] = [];
  carregandoComentarios = false;
  seguindoIds: Set<string> = new Set();

  meuId = '';

  private apiComentario = 'http://localhost:5081/api/ComentarioLivro';

  constructor(
    private comunidadeService: ComunidadeService,
    private http: HttpClient,
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

    this.http.get<any[]>(`${this.apiComentario}/livro/${idLivro}`).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.comentarios = [];
          this.carregandoComentarios = false;
          this.cdr.markForCheck();
          return;
        }

        // Coletar IDs únicos dos usuários que comentaram
        const idsUsuarios = [...new Set(data.map(c => c.idUsuario))];

        // Buscar dados de cada usuário
        const requisicoes = idsUsuarios.map(id =>
          this.http.get<any>(`http://localhost:5081/api/Usuario/${id}`)
        );

        forkJoin(requisicoes).subscribe({
          next: (usuarios) => {
            const usuarioMap = new Map<string, any>();
            usuarios.forEach(u => usuarioMap.set(u.id, u));

            this.comentarios = data.map(c => {
              const u = usuarioMap.get(c.idUsuario);
              return {
                id: c.id,
                idUsuario: c.idUsuario,
                usuarioNickname: u?.nickname || '@desconhecido',
                comentario: c.comentario,
                dataCriacao: c.dataCriacao
              };
            });

            this.carregandoComentarios = false;
            this.cdr.markForCheck();
          },
          error: () => {
            // Fallback: mostra sem nickname
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
    if (!this.novoComentario.trim() || !this.itemSelecionado) return;

    this.http.post(this.apiComentario, {
      idLivro: this.itemSelecionado.livro.id,
      comentario: this.novoComentario.trim()
    }).subscribe({
      next: () => {
        this.novoComentario = '';
        this.carregarComentarios(this.itemSelecionado!.livro.id);
      },
      error: (err) => console.error('Erro ao comentar:', err)
    });
  }

  getIconeTipo(tipo: string): string {
    switch (tipo) {
      case 'livro_novo': return '📕';
      case 'livro_lendo': return '📖';
      case 'livro_lido': return '✅';
      case 'livro_avaliado': return '⭐';
      default: return '📚';
    }
  }

  getTextoTipo(tipo: string): string {
    switch (tipo) {
      case 'livro_novo': return 'Adicionou um Livro';
      case 'livro_lendo': return 'Está Lendo';
      case 'livro_lido': return 'Terminou de Ler';
      case 'livro_avaliado': return 'Avaliou';
      default: return '';
    }
  }

  getEstrelas(nota: number): string {
      return '⭐'.repeat(nota);
    }

    carregarSeguindo(): void {
    this.http.get<any[]>('http://localhost:5081/api/Seguidor/seguindo').subscribe({
      next: (seguidores) => {
        this.seguindoIds = new Set(seguidores.map(s => s.idUsuario));
        this.cdr.markForCheck();
      }
    });
  }

  estaSeguindo(idUsuario: string): boolean {
    return this.seguindoIds.has(idUsuario);
  }

  seguirUsuario(idUsuario: string): void {
    this.http.post(`http://localhost:5081/api/Seguidor/seguir/${idUsuario}`, {}).subscribe({
      next: () => {
        this.seguindoIds.add(idUsuario);
        this.cdr.markForCheck();
      }
    });
  }

  deixarDeSeguirUsuario(idUsuario: string): void {
    this.http.delete(`http://localhost:5081/api/Seguidor/deixar-de-seguir/${idUsuario}`).subscribe({
      next: () => {
        this.seguindoIds.delete(idUsuario);
        this.cdr.markForCheck();
      }
    });
  }
}
