import { Component, OnInit, Input, ChangeDetectorRef, ViewChild, ElementRef, OnChanges, SimpleChanges,  } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LivroDoUsuario } from '../perfil.model';
import { PerfilService } from '../perfil.service';
import { UploadService } from '../../../shared/services/upload.service';
import { AlertService } from '../../../shared/services/alert.service';
import { BottomSheetComponent } from '../../../shared/bottom-sheet/bottom-sheet.component';
import { Capacitor } from '@capacitor/core';
import { EstanteService } from './estante.service';
import { Prateleira } from './estante.model';
import { FilePicker } from '@hotend/capacitor-file-picker';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-estante',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './estante.component.html',
  styleUrl: './estante.component.scss'
})
export class EstanteComponent implements  OnInit, OnChanges {
  @Input() usuarioId = '';
  @Input() modoVisualizacao = false;
  @Input() colecoesPerfil: Prateleira[] | null = null;
  @Input() livrosPerfil: LivroDoUsuario[] = [];

  livros: LivroDoUsuario[] = [];
  carregando = true;
  filtroStatus: number | null = null;
  filtroAvaliado = false;

  // 🆕 Bottom sheet de detalhes
  bottomSheetLivroAberto = false;
  livroSelecionado: LivroDoUsuario | null = null;

  // 🆕 Bottom sheet de edição
  modalEdicaoLivroAberto = false;
  livroEditando: LivroDoUsuario | null = null;
  edicaoCapaPreview: string | null = null;

  // 🆕 Bottom sheet de comentários
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';
  livroComentarioProntos: any[] | null = null;
  novoComentarioPerfil = '';
  meuId = '';

  // 🆕 Prateleiras
  prateleiras: Prateleira[] = [];
  carregandoPrateleiras = true;
  filtroPrateleira = false;

  etapaComentarios: 'lista' | 'grupo' = 'lista';
  grupoSelecionado: any = null;

  // 🆕 Bottom sheet de cadastro de prateleira
  modalPrateleiraAberto = false;
  prateleiraEditando = {
    nome: '',
    descricao: ''
  };
  salvandoPrateleira = false;
  // 🆕 Modal de exclusão
  confirmarExclusao = false;
  livroParaExcluir: string | null = null;

  generosDisponiveis = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil',
    'Aventura', 'Drama', 'Poesia', 'Ficção Científica'
  ];
  prateleiraSelecionada: Prateleira | null = null;
  bottomSheetPrateleiraAberto = false;
  livrosDaPrateleira: LivroDoUsuario[] = [];
  // 🆕 Exclusão de prateleira
  excluindoPrateleira = false;
  enviandoEdicao = false;
  itensPorPagina = 12;
  paginaAtual = 1;
  editandoPrateleira = false;
  prateleiraEditandoNome = '';
  prateleiraEditandoDescricao = '';
  salvandoEdicaoPrateleira = false;

    // 🆕 Controle de setas dos filtros
  mostrarSetaEsquerda = false;
  mostrarSetaDireita = true;

  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;

  @ViewChild('fileInputEdicaoLivro') fileInputEdicaoLivro!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private router: Router,
    private location: Location,
    public cdr: ChangeDetectorRef,
    private estanteService: EstanteService
  ) {}

  ngOnInit(): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.meuId = usuarioLogado.id || '';

    if (this.usuarioId) {
      this.carregarPrateleiras();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['livrosPerfil']) {
      this.livros = this.livrosPerfil || [];
      this.paginaAtual = 1;
      this.cdr.markForCheck();
    }
  }

  // ============ LISTAGEM ============
  carregarLivros(): void {
    this.carregando = true;

    // 🆕 Força a atualização do cache ao entrar na tela
    this.perfilService.getPerfilCompleto(this.usuarioId, true).subscribe({
      next: (data) => {
        this.livros = data.livros || [];
        this.carregando = false;
        this.paginaAtual = 1;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
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
      default: return 'nao-lido';
    }
  }

  // ============ BOTTOM SHEET: DETALHES ============
  abrirBottomSheetLivro(livro: LivroDoUsuario): void {
    this.livroSelecionado = livro;
    this.bottomSheetLivroAberto = true;
    this.cdr.markForCheck();
  }

  fecharBottomSheetLivro(): void {
    this.bottomSheetLivroAberto = false;
    this.livroSelecionado = null;
    this.cdr.markForCheck();
  }

  // ============ BOTTOM SHEET: EDITAR ============
  abrirEdicaoLivro(livro: LivroDoUsuario): void {
    this.livroEditando = {
      ...livro,
      estrelas: livro.avaliacao?.nota || undefined,
      generos: livro.generos || [],
      anoPublicacao: livro.anoPublicacao || null,
      editora: livro.editora || null,
      idioma: livro.idioma || null,
      arquivoLeitura: livro.arquivoLeitura || null,
      idColecao: livro.idColecao || null,
      publico: livro.publico !== false
    };
    this.edicaoCapaPreview = livro.imagem || null;
    this.modalEdicaoLivroAberto = true;
    this.cdr.markForCheck();
  }

  fecharEdicaoLivro(): void {
    this.modalEdicaoLivroAberto = false;
    this.livroEditando = null;
    this.edicaoCapaPreview = null;
    this.cdr.markForCheck();
  }

  toggleGeneroEdicao(genero: string): void {
    if (!this.livroEditando) return;
    if (!this.livroEditando.generos) {
      this.livroEditando.generos = [];
    }
    const index = this.livroEditando.generos.indexOf(genero);
    if (index > -1) {
      this.livroEditando.generos.splice(index, 1);
    } else {
      if (this.livroEditando.generos.length < 3) {
        this.livroEditando.generos.push(genero);
      } else {
        this.alertService.warning('Máximo 3 gêneros');
      }
    }
  }

  async tirarFotoEdicaoLivro(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
        if (file.size > this.TAMANHO_MAXIMO) throw new Error('Máximo 10MB');
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const comprimida = await this.comprimirImagem(base64, 800, 0.6);
        this.edicaoCapaPreview = comprimida;
        if (this.livroEditando) this.livroEditando.imagem = comprimida;
        this.alertService.success('Imagem selecionada!');
        this.cdr.markForCheck();
      } catch (error: any) {
        this.alertService.error(error.message);
      }
    };
    input.click();
  }

  async onFileSelectedEdicaoLivro(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
      if (file.size > this.TAMANHO_MAXIMO) throw new Error('Máximo 10MB');
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const comprimida = await this.comprimirImagem(base64, 800, 0.6);
      this.edicaoCapaPreview = comprimida;
      if (this.livroEditando) this.livroEditando.imagem = comprimida;
      this.alertService.success('Imagem selecionada!');
      this.cdr.markForCheck();
    } catch (error: any) {
      this.alertService.error(error.message);
    }
  }

  async salvarEdicaoLivro(): Promise<void> {
    if (!this.livroEditando || this.enviandoEdicao) return;

    this.enviandoEdicao = true;
    this.cdr.markForCheck();

    let imagemUrl = this.livroEditando.imagem || '';

    if (imagemUrl && imagemUrl.startsWith('data:')) {
      const comprimida = await this.comprimirImagem(imagemUrl, 800, 0.6);
      this.uploadService.uploadImagem(comprimida).subscribe({
        next: (url) => {
          this.livroEditando!.imagem = url;
          this.enviarEdicaoLivro();
        },
        error: () => {
          this.enviandoEdicao = false;
          this.alertService.error('Erro ao enviar imagem. Tente novamente.');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.enviarEdicaoLivro();
    }
  }
  private enviarEdicaoLivro(): void {
    if (!this.livroEditando) return;

    const dados: any = {
      titulo: this.livroEditando.titulo,
      autor: this.livroEditando.autor,
      descricao: this.livroEditando.descricao,
      imagem: this.livroEditando.imagem,
      status: this.livroEditando.status,
      tipo: this.livroEditando.tipo || 'livro',
      generos: this.livroEditando.generos || [],
      anoPublicacao: this.livroEditando.anoPublicacao
        ? parseInt(this.livroEditando.anoPublicacao.toString())
        : null,
      editora: this.livroEditando.editora || null,
      idioma: this.livroEditando.idioma || null,
      arquivoLeitura: this.livroEditando.arquivoLeitura || null,

      // 🆕 BLINDAGEM: Só envia o idColecao se ele realmente existir no objeto
      idColecao: this.livroEditando.idColecao ? this.livroEditando.idColecao : undefined,
      publico: this.livroEditando.publico
    };

    // Remove a chave idColecao se ela estiver undefined para o JSON não enviar "null"
    if (dados.idColecao === undefined) {
      delete dados.idColecao;
    }

    if (this.livroEditando.status === 3 && this.livroEditando.estrelas) {
      dados.estrelas = this.livroEditando.estrelas;
    }

    const livroId = this.livroEditando.id;
    const livroAntigo = this.livros.find(l => l.id === livroId);
    const copiaAntiga = livroAntigo ? { ...livroAntigo } : null;

    // OPTIMISTIC UI
    this.livros = this.livros.map(l => {
      if (l.id === livroId) {
        return {
          ...l,
          ...this.livroEditando!,
          avaliacao: dados.estrelas
            ? { id: l.avaliacao?.id || 'temp', nota: dados.estrelas, dataCriacao: new Date().toISOString() }
            : l.avaliacao
        };
      }
      return l;
    });

    this.fecharEdicaoLivro();
    this.enviandoEdicao = false;
    this.alertService.success('Livro atualizado!');
    this.cdr.detectChanges();

    this.perfilService.atualizarLivro(livroId, dados).subscribe({
      next: () => {
        this.perfilService.limparCache();
        // 🆕 Recarrega do servidor de forma silenciosa para garantir que o idColecao está correto
        this.carregarLivrosSilencioso();
      },
      error: () => {
        this.alertService.error('Erro ao atualizar livro');
        if (copiaAntiga) {
          this.livros = this.livros.map(l => l.id === livroId ? copiaAntiga : l);
        }
        this.cdr.markForCheck();
      }
    });
  }

   private carregarLivrosSilencioso(): void {
    this.perfilService.getPerfilCompleto(this.usuarioId, true).subscribe({
      next: (data) => {
        this.livros = data.livros || [];
        this.cdr.markForCheck();
        this.carregarPrateleiras(); // Atualiza as capas das prateleiras
      }
    });
  }

  private comprimirImagem(base64: string, maxWidth: number, qualidade: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
    });
  }

  limparNick(nick: string | null | undefined): string {
    if (!nick) return '';
    return nick.startsWith('@') ? nick.substring(1) : nick;
  }

  // ============ COMENTÁRIOS ============

  abrirComentarios(
    livro: LivroDoUsuario,
    grupoIdParaAbrir?: string
  ): void {

    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;

    this.livroComentarioProntos = null;
    this.novoComentarioPerfil = '';

    this.etapaComentarios = 'lista';
    this.grupoSelecionado = null;
    this.comentariosAberto = true;

    this.cdr.markForCheck();

    const usuarioLogado = JSON.parse(
      localStorage.getItem('usuario') || '{}'
    );

    forkJoin({
      comentarios: this.perfilService.getComentariosLivro(livro.id),
      atividades: this.perfilService.getAtividadesLivro(livro.id)
    }).subscribe({

      next: ({ comentarios, atividades }) => {

        // ======================================
        // 1. COMENTÁRIOS NORMAIS DO LIVRO
        // ======================================

        const grupos = new Map<string, any[]>();

        (comentarios || []).forEach((c: any) => {

          const origem = c.origem || 'Avaliacao';

          // Quando não existe idAtividade, agrupa pela origem.
          // Assim Avaliação e Finalização não se misturam.
          const chave = c.idAtividade
            ? `respostas:${c.idAtividade}`
            : `origem:${origem}`;

          if (!grupos.has(chave)) {
            grupos.set(chave, []);
          }

          grupos.get(chave)!.push({

            id: c.id,
            idUsuario: c.idUsuario,

            usuarioNickname: c.idUsuario === usuarioLogado.id
              ? usuarioLogado.nickname
              : (c.usuario?.nickname || '@user'),

            usuarioAvatar: c.idUsuario === usuarioLogado.id
              ? usuarioLogado.avatar
              : (c.usuario?.avatar || ''),

            comentario: c.comentario,
            dataCriacao: c.dataCriacao,
            origem: origem,
            idAtividade: c.idAtividade

          });

        });

        const gruposLivro = Array.from(grupos.entries()).map(
          ([chave, items]) => {

            items.sort((a, b) =>
              new Date(b.dataCriacao).getTime() -
              new Date(a.dataCriacao).getTime()
            );

            const primeiro = items[0];

            return {

              grupoId: chave,
              tipo: 'livro',

              idAtividade: primeiro.idAtividade || null,
              origem: primeiro.origem,

              icone: this.getIconeOrigem(primeiro.origem),
              titulo: this.getTipoLabel(
                primeiro.origem,
                primeiro.idAtividade
              ),

              descricao: primeiro.comentario || '',
              dataCriacao: primeiro.dataCriacao,

              total: items.length,
              comentarios: items,
              novoComentario: ''

            };

          }
        );

        // ======================================
        // 2. ATUALIZAÇÕES DE PROGRESSO
        // ======================================

       const gruposAtividades = (atividades || [])
        .filter((a: any) => a.totalComentarios > 0)
        .map((a: any) => ({
          grupoId: `post:${a.id}`,
          tipo: 'atividade',

          id: a.id,
          idAtividade: a.idAtividade,

          origem: a.origem,
          icone: this.getIconeOrigem(a.origem),
          titulo: this.getTituloAtividade(a.origem),

          // Descrição da ação
          descricao: this.getResumoAtividade(a),

          // Texto adicional da publicação
          textoPublicacao: this.getTextoAtividade(a),

          dataCriacao: a.dataCriacao,
          total: a.totalComentarios,
          comentarios: [],
          novoComentario: ''
        }));

        // ======================================
        // 3. JUNTA E ORDENA
        // ======================================

        this.livroComentarioProntos = [
          ...gruposLivro,
          ...gruposAtividades
        ].sort((a, b) =>
          new Date(b.dataCriacao).getTime() -
          new Date(a.dataCriacao).getTime()
        );

        // Reabre o grupo após envio ou exclusão
        if (grupoIdParaAbrir) {

          const grupo = this.livroComentarioProntos.find(
            g => g.grupoId === grupoIdParaAbrir
          );

          if (grupo) {
            this.abrirGrupo(grupo);
          }

        }

        this.cdr.markForCheck();

      },

      error: (err) => {

        console.error('Erro ao carregar comentários:', err);

        this.livroComentarioProntos = [];

        this.cdr.markForCheck();

      }

    });

  }


  getTextoAtividade(atividade: any): string {

    // Para novos registros, usa o campo separado
    if (atividade.frase?.trim()) {
      return atividade.frase.trim();
    }

    // Compatibilidade com registros antigos:
    // anteriormente a frase era gravada no campo Comentario.
    const comentario = atividade.comentario?.trim();

    if (!comentario) return '';

    const mensagensAutomaticas = [
      'Começou a leitura',
      'Pausou a leitura',
      'Retomou a leitura'
    ];

    if (mensagensAutomaticas.includes(comentario)) {
      return '';
    }

    if (/^Avançou para \d+% da leitura$/i.test(comentario)) {
      return '';
    }

    return comentario;
  }

  abrirComentariosOld(livro: LivroDoUsuario): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.livroComentarioProntos = null;
    this.novoComentarioPerfil = '';
    this.etapaComentarios = 'lista';
    this.grupoSelecionado = null;
    this.comentariosAberto = true;
    this.cdr.markForCheck();

    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');

    this.perfilService.getComentariosLivro(livro.id).subscribe({
      next: (comentarios) => {
        // Agrupa por idAtividade
        const grupos = new Map<string, any[]>();

        (comentarios || []).forEach((c: any) => {
          const chave = c.idAtividade || '__avaliacao__';
          if (!grupos.has(chave)) grupos.set(chave, []);
          grupos.get(chave)!.push({
            id: c.id,
            idUsuario: c.idUsuario,
            usuarioNickname: c.idUsuario === usuarioLogado.id
              ? usuarioLogado.nickname
              : (c.usuario?.nickname || '@user'),
            usuarioAvatar: c.idUsuario === usuarioLogado.id
              ? usuarioLogado.avatar
              : (c.usuario?.avatar || ''),
            comentario: c.comentario,
            dataCriacao: c.dataCriacao,
            origem: c.origem,
            idAtividade: c.idAtividade
          });
        });

        // Transforma em array com metadados do grupo
        this.livroComentarioProntos = Array.from(grupos.entries()).map(([idAtividade, items]) => {
          const primeiro = items[0];
          return {
            idAtividade: idAtividade === '__avaliacao__' ? null : idAtividade,
            origem: primeiro.origem,
            icone: this.getIconeOrigem(primeiro.origem),
            titulo: this.getTipoLabel(primeiro.origem),
            total: items.length,
            comentarios: items,
            novoComentario: ''
          };
        });

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar comentários:', err);
        this.livroComentarioProntos = [];
        this.cdr.markForCheck();
      }
    });
  }


  fecharComentarios(): void {
  this.comentariosAberto = false;
  this.etapaComentarios = 'lista';
  this.grupoSelecionado = null;
  this.livroComentarioProntos = null;
  this.novoComentarioPerfil = '';
  this.cdr.markForCheck();
}
  enviarComentario(): void {
    if (!this.novoComentarioPerfil?.trim() || !this.livroComentarioId) return;

    const comentarioTexto = this.novoComentarioPerfil.trim();
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');

    this.perfilService.enviarComentario(this.livroComentarioId, comentarioTexto).subscribe({
      next: () => {
        this.novoComentarioPerfil = '';
        this.alertService.success('Comentário enviado!');

        const novoComentario = {
          id: 'temp-' + Date.now(),
          idUsuario: usuarioLogado.id,
          usuarioNickname: usuarioLogado?.nickname || '@user',
          comentario: comentarioTexto,
          dataCriacao: new Date().toISOString()
        };

        if (this.livroComentarioProntos) {
          this.livroComentarioProntos = [...this.livroComentarioProntos, novoComentario];
        } else {
          this.livroComentarioProntos = [novoComentario];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.alertService.error('Erro ao enviar comentário');
      }
    });
  }

deletarComentario(id: string): void {

  const grupo = this.grupoSelecionado;

  const request$ = grupo?.tipo === 'atividade'

    ? this.perfilService.deletarComentarioAtividade(id)

    : this.perfilService.deletarComentario(id);

  request$.subscribe({

    next: () => {

      this.alertService.success('Comentário removido!');

      const livro = this.livros.find(
        l => l.id === this.livroComentarioId
      );

      if (livro && grupo) {

        // Atualiza a contagem e a lista
        // Se o grupo ficar vazio, ele não será reaberto.
        this.abrirComentarios(livro, grupo.grupoId);

      }

      this.cdr.markForCheck();

    },

    error: () => {

      this.alertService.error('Erro ao remover comentário');

    }

  });

}

  // ============ EXCLUSÃO ============
  abrirConfirmacaoExclusao(id: string): void {
    this.livroParaExcluir = id;
    this.confirmarExclusao = true;
  }

  fecharConfirmacaoExclusao(): void {
    this.confirmarExclusao = false;
    this.livroParaExcluir = null;
  }

   confirmarExcluirLivro(): void {
    if (!this.livroParaExcluir) return;

    const livroId = this.livroParaExcluir;
    const livroRemovido = this.livros.find(l => l.id === livroId);

    // 1. Fecha a confirmação
    this.fecharConfirmacaoExclusao();

    // 2. Remove da tela na hora
    this.livros = this.livros.filter(l => l.id !== livroId);
    this.cdr.detectChanges();

    // 3. Faz a chamada HTTP em background
    this.perfilService.deletarLivro(livroId).subscribe({
      next: () => {
        this.alertService.success('Livro removido!');
        this.perfilService.limparCache();
        this.carregarPrateleiras(); // Atualiza contadores de prateleiras
      },
      error: () => {
        // Rollback
        this.alertService.error('Erro ao remover livro');
        if (livroRemovido) {
          this.livros = [...this.livros, livroRemovido];
        }
        this.cdr.markForCheck();
      }
    });
  }

  // ============ NAVEGAÇÃO ============
  abrirDetalhesLivro(livro: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (!livro) return;
    this.fecharBottomSheetLivro();
    this.router.navigate(['/inicio/livro', livro.id], {
      state: {
        livro: livro,
        editavel: !this.modoVisualizacao,
        origem: 'perfil'
      }
    });
  }

  // 🆕 Vincular arquivo na edição do livro (Capacitor)
  async vincularArquivoEdicao(): Promise<void> {
    if (!this.livroEditando) return;

    try {
      const result = await FilePicker.pickFiles({
        types: ['application/pdf', 'application/epub+zip'],
        readData: false,
        persistContentUri: true
      });

      if (!result.files || result.files.length === 0) return;

      const file = result.files[0];
      const uri = file.path || '';

      if (!uri) {
        this.alertService.error('Não foi possível obter o caminho do arquivo.');
        return;
      }

      // 🆕 Detecta tipo e prefixa o path
      const mime = (file as any).mimeType || '';
      const tipo = mime.includes('epub') || uri.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';
      this.livroEditando.arquivoLeitura = `${tipo}://${uri}`;

      this.alertService.success(`Arquivo vinculado: ${file.name}`);
      this.cdr.markForCheck();

    } catch (error: any) {
      if (error?.message?.includes('cancel')) return;
      console.error('Erro ao vincular arquivo:', error);
      this.alertService.error('Erro ao selecionar arquivo.');
    }
  }

  // 🆕 Extrai o nome do arquivo (funciona com pdf://, epub://, pwa:// e content://)
  getNomeArquivoEdicao(uri: string | null | undefined): string {
    if (!uri) return '';

    // Remove prefixo pdf:// ou epub://
    const semPrefixo = uri.replace(/^(pdf|epub):\/\//, '');

    if (semPrefixo.startsWith('pwa://')) {
      const partes = semPrefixo.replace('pwa://', '').split('|');
      return decodeURIComponent(partes[0] || '');
    }

    const partes = semPrefixo.split('/');
    return decodeURIComponent(partes[partes.length - 1] || '');
  }

  // ============ PRATELEIRAS ============
  carregarPrateleiras(): void {
    this.carregandoPrateleiras = true;

    const request$ = this.modoVisualizacao
      ? this.estanteService.getPrateleirasDoUsuario(this.usuarioId)
      : this.estanteService.getMinhasPrateleiras(true); // 🆕 Força atualização

    request$.subscribe({
      next: (data) => {
        this.prateleiras = data;
        this.carregandoPrateleiras = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar prateleiras:', err);
        this.carregandoPrateleiras = false;
        this.cdr.markForCheck();
      }
    });
  }

  abrirModalPrateleira(): void {
    this.prateleiraEditando = { nome: '', descricao: '' };
    this.modalPrateleiraAberto = true;
    this.cdr.markForCheck();
  }

  fecharModalPrateleira(): void {
    this.modalPrateleiraAberto = false;
    this.prateleiraEditando = { nome: '', descricao: '' };
    this.cdr.markForCheck();
  }

  salvarPrateleira(): void {
    const nome = this.prateleiraEditando.nome?.trim();
    const descricao = this.prateleiraEditando.descricao?.trim() || null;

    if (!nome) {
      this.alertService.warning('Nome da prateleira é obrigatório');
      return;
    }

    if (nome.length > 50) {
      this.alertService.warning('Nome deve ter no máximo 50 caracteres');
      return;
    }

    this.salvandoPrateleira = true;

    this.estanteService.criarPrateleira({ nome, descricao }).subscribe({
      next: (nova) => {
        this.salvandoPrateleira = false;
        this.alertService.success(`Prateleira "${nova.nome}" criada!`);
        this.fecharModalPrateleira();

        this.prateleiras = [...this.prateleiras, nova].sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );

        this.perfilService.limparCache();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.salvandoPrateleira = false;
        const msg = err?.error?.mensagem || 'Erro ao criar prateleira';
        this.alertService.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  getNomePrateleira(idColecao: string | null | undefined): string {
    if (!idColecao) return '';
    const prateleira = this.prateleiras.find(p => p.id === idColecao);
    return prateleira?.nome || '';
  }

  abrirPrateleira(prateleira: Prateleira): void {
    this.prateleiraSelecionada = prateleira;
    this.livrosDaPrateleira = this.livros.filter(l => l.idColecao === prateleira.id);
    this.bottomSheetPrateleiraAberto = true;
    this.cdr.markForCheck();
  }

  fecharBottomSheetPrateleira(): void {
    this.bottomSheetPrateleiraAberto = false;
    this.prateleiraSelecionada = null;
    this.livrosDaPrateleira = [];
    this.editandoPrateleira = false;
    this.prateleiraEditandoNome = '';
    this.prateleiraEditandoDescricao = '';
    this.cdr.markForCheck();
  }

  abrirLivroDaPrateleira(livro: LivroDoUsuario): void {
    this.fecharBottomSheetPrateleira();
    setTimeout(() => {
      this.abrirBottomSheetLivro(livro);
    }, 150);
  }

  excluirPrateleira(): void {
    if (!this.prateleiraSelecionada || this.excluindoPrateleira || this.editandoPrateleira) return;

    if (this.livrosDaPrateleira.length > 0) {
      this.alertService.warning('Remova os livros antes de excluir a prateleira');
      return;
    }

    this.excluindoPrateleira = true;
    const id = this.prateleiraSelecionada.id;
    const nome = this.prateleiraSelecionada.nome;

    this.estanteService.deletarPrateleira(id).subscribe({
      next: () => {
        this.excluindoPrateleira = false;
        this.fecharBottomSheetPrateleira();
        this.alertService.success(`Prateleira "${nome}" excluída!`);

        this.prateleiras = this.prateleiras.filter(p => p.id !== id);

        this.perfilService.limparCache();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.excluindoPrateleira = false;
        const msg = err?.error?.mensagem || 'Erro ao excluir prateleira';
        this.alertService.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  // ============ FILTROS E PAGINAÇÃO ============

  // 🆕 REGRA: Filtros são mutuamente exclusivos
  selecionarStatus(status: number | null): void {
    this.filtroStatus = status;
    this.filtroAvaliado = false;
    this.filtroPrateleira = false;
    this.paginaAtual = 1;
  }

  selecionarAvaliados(): void {
    this.filtroAvaliado = !this.filtroAvaliado;
    this.filtroStatus = null;
    this.filtroPrateleira = false;
    this.paginaAtual = 1;
  }

  selecionarPrateleiras(): void {
    this.filtroPrateleira = !this.filtroPrateleira;
    if (this.filtroPrateleira) {
      this.filtroStatus = null;
      this.filtroAvaliado = false;
    }
    this.paginaAtual = 1;
  }

  // 🆕 As prateleiras (cards) só aparecem se nenhum filtro de status/avaliado estiver ativo
  get prateleirasVisiveis(): Prateleira[] {
    // Se for modo "Prateleiras", mostra todas
    if (this.filtroPrateleira) {
      return this.prateleiras;
    }

    // Verifica se há algum filtro ativo (status ou avaliado)
    const temFiltro = this.filtroStatus !== null || this.filtroAvaliado;

    if (!temFiltro) {
      // Modo "Todos": mostra todas as prateleiras
      return this.prateleiras;
    }

    // Se houver filtro, filtra apenas prateleiras que têm pelo menos um livro que bate com o filtro
    return this.prateleiras
      .map(p => {
        // Pega os livros dessa prateleira que batem com o filtro atual
        const livrosFiltrados = this.livros.filter(l => {
          if (l.idColecao !== p.id) return false;

          // Verifica status
          if (this.filtroStatus !== null && l.status !== this.filtroStatus) return false;

          // Verifica avaliado
          if (this.filtroAvaliado && l.avaliacao === null) return false;

          return true;
        });

        // Se não tem nenhum livro que bate com o filtro, retorna null (vai ser filtrado depois)
        if (livrosFiltrados.length === 0) return null;

        // Retorna a prateleira com as capas atualizadas e o total correto
        return {
          ...p,
          capas: livrosFiltrados.slice(0, 3).map(l => l.imagem || 'assets/capas/perfilSemFoto.png'),
          totalLivros: livrosFiltrados.length
        } as Prateleira;
      })
      .filter((p): p is Prateleira => p !== null); // Remove os nulls
  }


  // 🆕 Livros filtrados: Agora mostra TODOS os livros que batem com o filtro, incluindo os que estão em prateleiras (Opção B)
   get livrosFiltrados(): LivroDoUsuario[] {
    // Se o modo "Prateleiras" estiver ativo, não mostra livros (só prateleiras)
    if (this.filtroPrateleira) return [];

    let resultado = [...this.livros];

    // 🆕 REGRA DO "TODOS": Mostra apenas livros SOLTOS
    if (this.filtroStatus === null && !this.filtroAvaliado) {
      resultado = resultado.filter(l => !l.idColecao);
    }
    // 🆕 REGRA DOS FILTROS: Mostra apenas livros SOLTOS que batem com o filtro
    // (Os livros que estão em prateleiras serão mostrados quando o usuário abrir a prateleira)
    else {
      // Garante que estamos pegando apenas livros soltos
      resultado = resultado.filter(l => !l.idColecao);

      if (this.filtroStatus !== null) {
        resultado = resultado.filter(l => l.status === this.filtroStatus);
      }
      if (this.filtroAvaliado) {
        resultado = resultado.filter(l => l.avaliacao !== null);
      }
    }

    // Ordena por data de criação (mais recentes primeiro)
    resultado.sort((a, b) =>
      new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
    );

    return resultado;
  }

  get livrosPaginados(): LivroDoUsuario[] {
    return this.livrosFiltrados.slice(0, this.paginaAtual * this.itensPorPagina);
  }

  get temMaisLivros(): boolean {
    return this.livrosPaginados.length < this.livrosFiltrados.length;
  }

  carregarMais(): void {
    this.paginaAtual++;
    this.cdr.markForCheck();
  }

  // ============ EDIÇÃO DE PRATELEIRA ============
  abrirEdicaoPrateleira(): void {
    if (!this.prateleiraSelecionada) return;

    this.prateleiraEditandoNome = this.prateleiraSelecionada.nome;
    this.prateleiraEditandoDescricao = this.prateleiraSelecionada.descricao || '';
    this.editandoPrateleira = true;

    setTimeout(() => {
      const input = document.querySelector('.modal-prateleira-input-titulo') as HTMLInputElement;
      input?.focus();
      input?.select();
    });

    this.cdr.markForCheck();
  }

  cancelarEdicaoPrateleira(): void {
    this.editandoPrateleira = false;
    this.prateleiraEditandoNome = '';
    this.prateleiraEditandoDescricao = '';
    this.cdr.markForCheck();
  }

  salvarEdicaoPrateleira(): void {
    if (!this.prateleiraSelecionada || this.salvandoEdicaoPrateleira) return;

    const nome = this.prateleiraEditandoNome?.trim();
    const descricao = this.prateleiraEditandoDescricao?.trim() || null;

    if (!nome) {
      this.alertService.warning('Nome da prateleira é obrigatório');
      return;
    }

    if (nome.length > 50) {
      this.alertService.warning('Nome deve ter no máximo 50 caracteres');
      return;
    }

    this.salvandoEdicaoPrateleira = true;

    this.estanteService.atualizarPrateleira(this.prateleiraSelecionada.id, { nome, descricao })
      .subscribe({
        next: (atualizada) => {
          this.salvandoEdicaoPrateleira = false;
          this.editandoPrateleira = false;

          this.prateleiraSelecionada = {
            ...this.prateleiraSelecionada!,
            nome: atualizada.nome,
            descricao: atualizada.descricao
          };

          this.prateleiras = this.prateleiras
            .map(p => p.id === atualizada.id
              ? { ...p, nome: atualizada.nome, descricao: atualizada.descricao }
              : p)
            .sort((a, b) => a.nome.localeCompare(b.nome));

          this.perfilService.limparCache();

          this.alertService.success('Prateleira atualizada!');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.salvandoEdicaoPrateleira = false;
          const msg = err?.error?.mensagem || 'Erro ao atualizar prateleira';
          this.alertService.error(msg);
          this.cdr.markForCheck();
        }
      });
  }

  // 🆕 Método para monitorar o scroll dos filtros
  onScrollFiltros(event: any): void {
    const el = event.target as HTMLElement;

    // Verifica se está no início
    this.mostrarSetaEsquerda = el.scrollLeft > 10;

    // Verifica se está no final (com uma margem de 10px de tolerância)
    const chegouNoFim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    this.mostrarSetaDireita = !chegouNoFim;

    this.cdr.markForCheck();
  }


    // 🆕 Rastreia as prateleiras pelo ID para evitar que o DOM seja recriado e as imagens pisquem
  trackByPrateleira(index: number, prateleira: Prateleira): string {
    return prateleira.id;
  }

  // 🆕 Rastreia os livros pelo ID (evita que as capas pisquem ao filtrar)
  trackByLivro(index: number, livro: LivroDoUsuario): string {
    return livro.id;
  }

  getIconeOrigem(origem: string): string {
  switch (origem) {
    case 'Adicionou': return '📕';
    case 'ComecouLer': return '📖';
    case 'Finalizou': return '✅';
    case 'Avaliacao': return '⭐';
    case 'Atividade': return '📖';
    case 'Pausa': return '⏸️';
    case 'Retomada': return '▶️';
    default: return '💬';
  }
}

getTipoLabel(
  origem: string,
  idAtividade?: string | null
): string {

  if (origem === 'Avaliacao') {

    if (idAtividade?.includes('__livro_avaliado__')) {
      return 'Comentários na finalização';
    }

    return 'Comentários no livro';
  }

  switch (origem) {

    case 'Adicionou':
      return 'Adicionou o livro';

    case 'ComecouLer':
      return 'Começou a ler';

    case 'Finalizou':
      return 'Finalizou a leitura';

    case 'Livro':
      return 'Comentários no livro';

    default:
      return 'Comentários no livro';

  }
}

irParaPerfil(idUsuario: string | undefined, event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (!idUsuario || idUsuario === this.meuId) return;
  this.router.navigate(['/inicio/perfil', idUsuario]);
}

abrirGrupo(grupo: any): void {

  this.grupoSelecionado = grupo;
  this.etapaComentarios = 'grupo';

  this.cdr.markForCheck();

  // Grupos normais já possuem os comentários carregados
  if (grupo.tipo !== 'atividade') {
    return;
  }

  // Busca as respostas da atualização específica
  this.perfilService
    .getComentariosAtividade(grupo.idAtividade)
    .subscribe({

      next: (comentarios) => {

        const usuarioLogado = JSON.parse(
          localStorage.getItem('usuario') || '{}'
        );

        grupo.comentarios = (comentarios || []).map((c: any) => ({

          id: c.id,
          idUsuario: c.idUsuario,

          usuarioNickname: c.idUsuario === usuarioLogado.id
            ? usuarioLogado.nickname
            : (c.usuario?.nickname || '@user'),

          usuarioAvatar: c.idUsuario === usuarioLogado.id
            ? usuarioLogado.avatar
            : (c.usuario?.avatar || ''),

          comentario: c.comentario,
          dataCriacao: c.dataCriacao

        }));

        grupo.total = grupo.comentarios.length;

        this.cdr.markForCheck();

      },

      error: (err) => {

        console.error('Erro ao carregar respostas da atividade:', err);

        this.alertService.error('Erro ao carregar comentários');

      }

    });

}

voltarParaLista(): void {
  this.grupoSelecionado = null;
  this.etapaComentarios = 'lista';
  this.cdr.markForCheck();
}

getTituloAtividade(origem: string): string {

  switch (origem) {

    case 'Pausa':
      return 'Leitura pausada';

    case 'Retomada':
      return 'Leitura retomada';

    default:
      return 'Atualização de leitura';

  }

}

getResumoAtividade(atividade: any): string {

  if (atividade.origem === 'Pausa') {
    return 'Pausou a leitura';
  }

  if (atividade.origem === 'Retomada') {
    return 'Retomou a leitura';
  }

  if (atividade.progresso != null) {
    return `Avançou para ${atividade.progresso}% da leitura`;
  }

  if (atividade.paginaAtual != null) {
    return `Atualizou a leitura até a página ${atividade.paginaAtual}`;
  }

  if (atividade.minutoAtual != null) {
    return `Atualizou o progresso do audiobook`;
  }

  return 'Começou a leitura';
}

private formatarTempoAtividade(minutos: number): string {

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return horas > 0
    ? `${horas}h ${resto}min`
    : `${resto}min`;

}
enviarComentarioNoGrupo(): void {

  if (
    !this.grupoSelecionado?.novoComentario?.trim() ||
    !this.livroComentarioId
  ) return;

  const grupo = this.grupoSelecionado;
  const texto = grupo.novoComentario.trim();

  const request$ = grupo.tipo === 'atividade'

    ? this.perfilService.enviarComentarioAtividade(
        grupo.idAtividade,
        this.livroComentarioId,
        texto
      )

    : this.perfilService.enviarComentarioNoLivro(
        this.livroComentarioId,
        texto,
        grupo.idAtividade,
        grupo.origem
      );

  request$.subscribe({

    next: () => {

      this.alertService.success('Comentário enviado!');

      const livro = this.livros.find(
        l => l.id === this.livroComentarioId
      );

      if (livro) {
        this.abrirComentarios(livro, grupo.grupoId);
      }

    },

    error: (err) => {

      this.alertService.error(
        err.error?.mensagem || 'Erro ao enviar comentário'
      );

    }

  });

}

}
