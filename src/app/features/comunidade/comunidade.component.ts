import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComunidadeService } from './comunidade.service';
import { AtividadeComunidade, Comentario } from './comunidade.model';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-comunidade',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './comunidade.component.html',
  styleUrl: './comunidade.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class ComunidadeComponent implements OnInit {
  atividades: AtividadeComunidade[] = [];
  carregando = true;
  atualizando = false;
  pullParaAtualizar = false;
  meuId = '';
  modalAberto = false;
  itemSelecionado: AtividadeComunidade | null = null;
  novoComentario = '';
  comentarios: Comentario[] = [];
  carregandoComentarios = false;

  private touchStartY = 0;
  private readonly pullThreshold = 80;

  constructor(
    private comunidadeService: ComunidadeService,
    private alertService: AlertService,
    @Inject(PLATFORM_ID) private platformId: Object,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.meuId = usuario.id || '';
      this.carregarFeed();
    }
  }

  trackById(index: number, item: AtividadeComunidade): string {
    return item.id || index.toString();
  }

  onTouchStart(event: TouchEvent): void {
    if (window.scrollY === 0) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (window.scrollY === 0) {
      const delta = event.touches[0].clientY - this.touchStartY;
      this.pullParaAtualizar = delta > this.pullThreshold;
    }
  }

  onTouchEnd(): void {
    if (this.pullParaAtualizar) {
      this.pullParaAtualizar = false;
      this.atualizarFeed();
    }
  }

  carregarFeed(): void {
    this.carregando = true;
    this.comunidadeService.getFeedComunidade().subscribe({
      next: (data: AtividadeComunidade[]) => {
        this.atividades = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar feed');
      }
    });
  }

  atualizarFeed(): void {
    this.atualizando = true;
    this.comunidadeService.atualizarFeed().subscribe({
      next: (data: AtividadeComunidade[]) => {
        this.atividades = data;
        this.atualizando = false;
        this.alertService.success('Feed atualizado!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.atualizando = false;
        this.alertService.error('Erro ao atualizar feed');
      }
    });
  }

  abrirModal(item: AtividadeComunidade): void {
    this.itemSelecionado = item;
    this.modalAberto = true;
    this.novoComentario = '';

    // ✅ Usa os comentários como vieram do backend
    if (item.tipo === 'livro_avaliado') {
      if (item.comentarios && item.comentarios.length > 0) {
        this.comentarios = item.comentarios; // Direto, sem mapear
      } else {
        this.comentarios = []; // Não chama API
      }
    }

    this.cdr.markForCheck();
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.itemSelecionado = null;
    this.comentarios = [];
    this.novoComentario = '';
    this.cdr.markForCheck(); // 🆕 Adicionar aqui também
  }

  carregarComentarios(idLivro: string): void {
    this.carregandoComentarios = true;
    this.comunidadeService.getComentariosDoLivro(idLivro).subscribe({
      next: (comentarios: Comentario[]) => {
        this.comentarios = comentarios;
        this.carregandoComentarios = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregandoComentarios = false;
        this.alertService.error('Erro ao carregar comentários');
        this.cdr.markForCheck();
      }
    });
  }

  enviarComentario(): void {
    if (!this.novoComentario?.trim() || !this.itemSelecionado) return;

    this.comunidadeService.enviarComentario(this.itemSelecionado.livro.id, this.novoComentario.trim()).subscribe({
      next: () => {
        this.novoComentario = '';
        this.alertService.success('Comentário enviado!');
        this.carregarComentarios(this.itemSelecionado!.livro.id);
      },
      error: (err) => {
        console.error('Erro ao comentar:', err);
        this.alertService.error('Erro ao enviar comentário');
      }
    });
  }

  onComentarioChange(): void {
    this.cdr.markForCheck();
  }

  seguirUsuario(idUsuario: string): void {
    this.comunidadeService.seguir(idUsuario).subscribe({
      next: () => {
        this.atividades = this.atividades.map(a => {
          if (a.usuario.id === idUsuario) {
            return { ...a, usuario: { ...a.usuario, segue: true } };
          }
          return a;
        });
        if (this.itemSelecionado?.usuario.id === idUsuario) {
          this.itemSelecionado = { ...this.itemSelecionado, usuario: { ...this.itemSelecionado.usuario, segue: true } };
        }
        this.alertService.success('Agora você segue este usuário!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao seguir usuário');
      }
    });
  }

  deixarDeSeguirUsuario(idUsuario: string): void {
    this.comunidadeService.deixarDeSeguir(idUsuario).subscribe({
      next: () => {
        this.atividades = this.atividades.map(a => {
          if (a.usuario.id === idUsuario) {
            return { ...a, usuario: { ...a.usuario, segue: false } };
          }
          return a;
        });
        if (this.itemSelecionado?.usuario.id === idUsuario) {
          this.itemSelecionado = { ...this.itemSelecionado, usuario: { ...this.itemSelecionado.usuario, segue: false } };
        }
        this.alertService.info('Você deixou de seguir este usuário');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao deixar de seguir');
      }
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
}
