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
  meuId = '';
  modalAberto = false;
  itemSelecionado: AtividadeComunidade | null = null;
  novoComentario = '';
  comentarios: Comentario[] = [];
  carregandoComentarios = false;
  usuarioAtual: any = null;

  constructor(
    private comunidadeService: ComunidadeService,
    private alertService: AlertService,
    @Inject(PLATFORM_ID) private platformId: Object,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      this.usuarioAtual = usuario;
      this.meuId = usuario.id || '';
      this.carregarFeed();
    }
  }

  trackById(index: number, item: AtividadeComunidade): string {
    return item.id || index.toString();
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

  abrirModal(item: AtividadeComunidade): void {
    this.itemSelecionado = item;
    this.modalAberto = true;
    this.novoComentario = '';

    if (item.tipo === 'livro_avaliado') {
      this.comentarios = item.comentarios?.length ? item.comentarios : [];
    }

    this.cdr.markForCheck();
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.itemSelecionado = null;
    this.comentarios = [];
    this.novoComentario = '';
    this.cdr.markForCheck();
  }

  enviarComentarioOld(): void {
      if (!this.novoComentario?.trim() || !this.itemSelecionado) return;

      this.comunidadeService.enviarComentario(this.itemSelecionado.livro.id, this.novoComentario.trim()).subscribe({
        next: () => {
          this.novoComentario = '';
          this.alertService.success('Comentário enviado!');
          this.cdr.detectChanges(); // 🆕 detectChanges aqui também
        },
        error: (err) => {
          console.error('Erro ao comentar:', err);
          this.alertService.error('Erro ao enviar comentário');
        }
      });
  }

enviarComentario(): void {
  if (!this.novoComentario?.trim() || !this.itemSelecionado) {
    return;
  }

  const textoComentario = this.novoComentario.trim();

  // 🆕 Adiciona imediatamente (otimista)
  const comentarioTemp: any = {
    id: 'temp-' + Date.now(),
    comentario: textoComentario,
    dataCriacao: new Date().toISOString(),
    usuarioNickname: this.usuarioAtual?.nickname || '@user',
    usuario: {
      id: this.usuarioAtual?.id,
      nickname: this.usuarioAtual?.nickname || '@user'
    }
  };

  this.comentarios = [...this.comentarios, comentarioTemp];
  this.novoComentario = '';
  this.cdr.markForCheck();

  // Depois confirma com a API
  this.comunidadeService
    .enviarComentario(this.itemSelecionado.livro.id, textoComentario)
    .subscribe({
      next: (comentarioCriado: any) => {
        // Substitui o temporário pelo real
        this.comentarios = this.comentarios.map(c =>
          c.id === comentarioTemp.id
            ? { ...comentarioCriado, usuarioNickname: this.usuarioAtual?.nickname, usuario: { id: this.usuarioAtual?.id, nickname: this.usuarioAtual?.nickname } }
            : c
        );
        this.alertService.success('Comentário enviado!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        // Remove o temporário em caso de erro
        this.comentarios = this.comentarios.filter(c => c.id !== comentarioTemp.id);
        console.error('Erro ao comentar:', err);
        this.alertService.error('Erro ao enviar comentário');
        this.cdr.markForCheck();
      }
    });
}


  onComentarioChange(): void {
    // Força o Angular a verificar este componente
    this.cdr.detectChanges();
    // Tenta verificar também o componente pai (se necessário)
    setTimeout(() => this.cdr.detectChanges(), 0);
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

  toggleCurtir(item: AtividadeComunidade): void {
    if (item.curtiu) {
      this.comunidadeService.descurtir(item.id).subscribe(() => {
        item.curtiu = false;
        item.curtidas--;
        this.cdr.markForCheck();
      });
    } else {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.comunidadeService.curtir(item.id, {
        tipoAtividade: item.tipo === 'livro_avaliado' ? 'avaliacao' : 'livro',
        idUsuarioDono: item.usuario?.id || '',
        nomeCurtidor: usuario?.nickname || usuario?.nome || 'Usuário',
        tituloLivro: item.livro?.titulo || 'Livro'
      }).subscribe(() => {
        item.curtiu = true;
        item.curtidas++;
        this.cdr.markForCheck();
      });
    }
  }

  deletarComentario(id: string): void {
    this.comunidadeService.deletarComentario(id).subscribe({
      next: () => {
        this.comentarios = this.comentarios.filter(c => c.id !== id);
        this.alertService.success('Comentário removido!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao remover comentário');
      }
    });
  }

  adicionarDaComunidade(): void {
    if (!this.itemSelecionado?.livro) return;

    const livro = this.itemSelecionado.livro;

    this.comunidadeService.adicionarLivro({
      titulo: livro.titulo,
      autor: livro.autor,
      imagem: livro.imagem || null
    }).subscribe({
      next: () => {
        this.fecharModal();
        this.alertService.success(`"${livro.titulo}" adicionado à sua biblioteca!`);
      },
      error: (err) => {
        console.error('Erro ao adicionar:', err);
        this.alertService.error('Erro ao adicionar livro');
      }
    });
  }
}
