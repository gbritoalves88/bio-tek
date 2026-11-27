import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // 🆕 Importar Router
import { ComunidadeService } from '../comunidade.service';
import { AtividadeComunidade, Comentario } from '../comunidade.model';
import { AlertService } from '../../../shared/services/alert.service';
import { BottomSheetComponent } from '../../../shared/bottom-sheet/bottom-sheet.component';
import { PullToRefreshComponent } from '../../../shared/pull-to-refresh/pull-to-refresh.component';


@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent, PullToRefreshComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class FeedComponent implements OnInit {
  atividades: AtividadeComunidade[] = [];
  carregando = true;
  meuId = '';
  modalAberto = false;
  itemSelecionado: AtividadeComunidade | null = null;
  novoComentario = '';
  comentarios: Comentario[] = [];
  carregandoComentarios = false;
  usuarioAtual: any = null;
  comentariosAtividade: any[] = [];
  carregandoComentariosAtividade = false;
  novoComentarioAtividade = '';

  constructor(
    private comunidadeService: ComunidadeService,
    private alertService: AlertService,
    private router: Router, // 🆕 Injetar Router
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

  // 🆕 Método corrigido: recebe o livro como parâmetro
  abrirDetalhesLivro(livro: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!livro) return;

    const editavel = this.itemSelecionado?.usuario?.id === this.meuId;

    this.fecharModal();

    this.router.navigate(['/inicio/livro', livro.id], {
      state: {
        livro: livro,
        editavel: editavel,
        origem: 'feed'
      }
    });
  }

  abrirModal(item: AtividadeComunidade): void {
    this.itemSelecionado = item;
    this.modalAberto = true;
    this.novoComentario = '';
    this.novoComentarioAtividade = '';
    this.comentariosAtividade = [];

    if (item.tipo === 'livro_avaliado') {
      this.comentarios = item.comentarios?.length ? item.comentarios : [];
    }

    // 🆕 Carrega comentários da atividade
    const idAtividade = this.gerarIdAtividade(item);
    this.carregarComentariosDaAtividade(idAtividade);

    this.cdr.markForCheck();
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.itemSelecionado = null;
    this.comentarios = [];
    this.novoComentario = '';
    this.cdr.markForCheck();
  }

  enviarComentario(): void {
    if (!this.novoComentario?.trim() || !this.itemSelecionado) return;

    const textoComentario = this.novoComentario.trim();

    const comentarioTemp: Comentario = {
      id: 'temp-' + Date.now(),
      idUsuario: this.usuarioAtual?.id || '',
      comentario: textoComentario,
      dataCriacao: new Date().toISOString(),
      usuario: {
        id: this.usuarioAtual?.id || '',
        nome: this.usuarioAtual?.nome || '',
        nickname: this.usuarioAtual?.nickname || '@user'
      }
    };

    // 🆕 Adiciona na lista local
    this.comentarios = [...this.comentarios, comentarioTemp];
    this.novoComentario = '';
    this.cdr.markForCheck();

    this.comunidadeService
      .enviarComentario(this.itemSelecionado.livro.id, textoComentario)
      .subscribe({
        next: (comentarioCriado: any) => {
          // 🆕 Sempre usa dados do usuário local
          this.comentarios = this.comentarios.map((c): Comentario => {
            if (c.id === comentarioTemp.id) {
              return {
                id: comentarioCriado?.id || comentarioCriado?.Id || comentarioTemp.id,
                idUsuario: this.usuarioAtual?.id || '',
                comentario: textoComentario,
                dataCriacao: comentarioCriado?.dataCriacao || new Date().toISOString(),
                usuario: {
                  id: this.usuarioAtual?.id || '',
                  nome: this.usuarioAtual?.nome || '',
                  nickname: this.usuarioAtual?.nickname || '@user'
                }
              };
            }
            return c;
          });

          // 🆕 Atualiza o item em atividades[]
          const item = this.atividades.find(a => a.id === this.itemSelecionado?.id);
          if (item) {
            item.comentarios = [...this.comentarios];
          }

          // 🆕 Atualiza o itemSelecionado
          if (this.itemSelecionado) {
            this.itemSelecionado.comentarios = [...this.comentarios];
          }

          this.alertService.success('Comentário enviado!');
          this.cdr.markForCheck();
        },
        error: (err) => {
          // rollback
          this.comentarios = this.comentarios.filter(c => c.id !== comentarioTemp.id);

          if (this.itemSelecionado) {
            this.itemSelecionado.comentarios = [...this.comentarios];
          }

          console.error('Erro ao comentar:', err);
          this.alertService.error('Erro ao enviar comentário');
          this.cdr.markForCheck();
        }
      });
  }

   seguirUsuario(idUsuario: string): void {
    if (!idUsuario) return;

    // 1. Atualiza a lista principal (feed)
    this.atividades = this.atividades.map(a => {
      if (a.usuario.id === idUsuario) {
        return { ...a, usuario: { ...a.usuario, segue: true } };
      }
      return a;
    });

    // 2. Atualiza o item do modal (Bottom Sheet)
    if (this.itemSelecionado && this.itemSelecionado.usuario.id === idUsuario) {
      this.itemSelecionado.usuario.segue = true;
      // 🆕 Força a nova referência do objeto para o Angular notar
      this.itemSelecionado = { ...this.itemSelecionado };
    }

    this.cdr.detectChanges(); // Renderiza na hora

    // 3. Chama a API
    this.comunidadeService.seguir(idUsuario).subscribe({
      next: () => {
        this.alertService.success('Agora você segue este usuário!');
      },
      error: (err) => {
        this.alertService.error('Erro ao seguir usuário');
        // Rollback
        this.atividades = this.atividades.map(a => {
          if (a.usuario.id === idUsuario) return { ...a, usuario: { ...a.usuario, segue: false } };
          return a;
        });
        if (this.itemSelecionado) {
           this.itemSelecionado.usuario.segue = false;
           this.itemSelecionado = { ...this.itemSelecionado };
        }
        this.cdr.detectChanges();
      }
    });
  }

  deixarDeSeguirUsuario(idUsuario: string): void {
    if (!idUsuario) return;

    // 1. Atualiza a lista principal
    this.atividades = this.atividades.map(a => {
      if (a.usuario.id === idUsuario) {
        return { ...a, usuario: { ...a.usuario, segue: false } };
      }
      return a;
    });

    // 2. Atualiza o item do modal
    if (this.itemSelecionado && this.itemSelecionado.usuario.id === idUsuario) {
      this.itemSelecionado.usuario.segue = false;
      this.itemSelecionado = { ...this.itemSelecionado }; // Força referência
    }

    this.cdr.detectChanges();

    // 3. Chama a API
    this.comunidadeService.deixarDeSeguir(idUsuario).subscribe({
      next: () => {
        this.alertService.info('Você deixou de seguir este usuário');
      },
      error: (err) => {
        this.alertService.error('Erro ao deixar de seguir');
        // Rollback
        this.atividades = this.atividades.map(a => {
          if (a.usuario.id === idUsuario) return { ...a, usuario: { ...a.usuario, segue: true } };
          return a;
        });
        if (this.itemSelecionado) {
           this.itemSelecionado.usuario.segue = true;
           this.itemSelecionado = { ...this.itemSelecionado };
        }
        this.cdr.detectChanges();
      }
    });
  }

  getIconeTipo(tipo: string): string {
    switch (tipo) {
      case 'livro_novo': return '📕';
      case 'livro_lendo': return '📖';
      case 'livro_lido': return '✅';
      case 'livro_avaliado': return '⭐';
      case 'livro_progresso': return '📊';
      default: return '📚';
    }
  }

  getTextoTipo(tipo: string): string {
    switch (tipo) {
      case 'livro_novo': return 'Adicionou um Livro';
      case 'livro_lendo': return 'Está Lendo';
      case 'livro_lido': return 'Terminou de Ler';
      case 'livro_avaliado': return 'Avaliou';
      case 'livro_progresso': return 'Atualizou o Progresso';
      default: return '';
    }
  }

  getEstrelas(nota: number): string {
    return '⭐'.repeat(nota);
  }

  toggleCurtir(item: AtividadeComunidade): void {
    // Guarda o estado antigo para o rollback
    const curtiuAntigo = item.curtiu;
    const curtidasAntigas = item.curtidas;

    // 1. Atualiza a tela na hora
    item.curtiu = !curtiuAntigo;
    item.curtidas = curtiuAntigo ? curtidasAntigas - 1 : curtidasAntigas + 1;
    this.cdr.detectChanges();

    // 2. Chama a API
    if (curtiuAntigo) {
      this.comunidadeService.descurtir(item.id).subscribe({
        error: () => {
          // Rollback se der erro
          item.curtiu = curtiuAntigo;
          item.curtidas = curtidasAntigas;
          this.cdr.markForCheck();
        }
      });
    } else {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.comunidadeService.curtir(item.id, {
        tipoAtividade: item.tipo === 'livro_avaliado' ? 'avaliacao' :
          item.tipo === 'livro_progresso' ? 'progresso' : 'livro',
        idUsuarioDono: item.usuario?.id || '',
        nomeCurtidor: usuario?.nickname || usuario?.nome || 'Usuário',
        tituloLivro: item.livro?.titulo || 'Livro'
      }).subscribe({
        error: () => {
          // Rollback se der erro
          item.curtiu = curtiuAntigo;
          item.curtidas = curtidasAntigas;
          this.cdr.markForCheck();
        }
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

  irParaPerfil(idUsuario: string | undefined, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!idUsuario || idUsuario === this.meuId) return;
    this.fecharModal();
    this.router.navigate(['/inicio/perfil', idUsuario]);
  }

  limparNick(nick: string | null | undefined): string {
    if (!nick) return '';
    return nick.startsWith('@') ? nick.substring(1) : nick;
  }

  // ============ COMENTÁRIOS DE ATIVIDADE ============

  carregarComentariosDaAtividade(idAtividade: string): void {
    this.carregandoComentariosAtividade = true;
    this.comunidadeService.getComentariosAtividade(idAtividade).subscribe({
      next: (comentarios) => {
        this.comentariosAtividade = comentarios || [];
        this.carregandoComentariosAtividade = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar comentários da atividade:', err);
        this.carregandoComentariosAtividade = false;
      }
    });
  }

  enviarComentarioAtividade(): void {
    if (!this.novoComentarioAtividade.trim() || !this.itemSelecionado) return;

    const texto = this.novoComentarioAtividade.trim();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const idAtividade = this.gerarIdAtividade(this.itemSelecionado);
    const idLivro = this.itemSelecionado.livro?.id || '';

    // Mapeia o tipo do feed para a Origem do backend
    const origem = this.mapearOrigem(this.itemSelecionado.tipo);

    // Optimistic UI
    const temp: any = {
      id: 'temp-' + Date.now(),
      idUsuario: usuario.id,
      comentario: texto,
      dataCriacao: new Date().toISOString(),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        nickname: usuario.nickname,
        avatar: usuario.avatar
      }
    };
    this.comentariosAtividade = [...this.comentariosAtividade, temp];
    this.novoComentarioAtividade = '';
    this.cdr.markForCheck();

    this.comunidadeService.enviarComentarioAtividade(idLivro, idAtividade, texto, origem).subscribe({
      next: (criado: any) => {
        this.comentariosAtividade = this.comentariosAtividade.map(c =>
          c.id === temp.id ? { ...temp, id: criado.id || temp.id } : c
        );
        this.alertService.success('Comentário enviado!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.comentariosAtividade = this.comentariosAtividade.filter(c => c.id !== temp.id);
        console.error('Erro ao comentar:', err);
        this.alertService.error(err.error?.mensagem || 'Erro ao enviar comentário');
        this.cdr.markForCheck();
      }
    });
  }

  private mapearOrigem(tipo: string): string {
    switch (tipo) {
      case 'livro_novo': return 'Adicionou';
      case 'livro_lendo': return 'ComecouLer';
      case 'livro_lido': return 'Finalizou';
      case 'livro_avaliado': return 'Avaliacao';
      case 'livro_progresso': return 'Progresso';
      default: return 'Avaliacao';
    }
  }

  deletarComentarioAtividade(id: string): void {
    this.comunidadeService.deletarComentario(id).subscribe({
      next: () => {
        this.comentariosAtividade = this.comentariosAtividade.filter(c => c.id !== id);
        this.alertService.success('Comentário removido!');
        this.cdr.markForCheck();
      },
      error: () => this.alertService.error('Erro ao remover comentário')
    });
  }

  private gerarIdAtividade(item: AtividadeComunidade): string {
    const data = item.tipo === 'livro_avaliado'
      ? new Date(item.data).toISOString()
      : item.data;

    return `${item.livro?.id}__${item.tipo}__${data}`;
  }



}
