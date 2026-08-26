import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario, LivroDoUsuario, AtividadeLeitura } from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { AlertService } from '../../shared/services/alert.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent,  AddBookModalComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class PerfilComponent implements OnInit {
  usuario: Usuario | null = null;
  editando = false;
  usuarioEdit: Partial<Usuario> = {};
  carregando = true;
  uploadErro = '';

  livros: LivroDoUsuario[] = [];
  filtroStatus: number | null = null;
  filtroAvaliado = false;

  modalAdicionarAberto = false;
  modalEdicaoLivroAberto = false;
  livroEditando: LivroDoUsuario | null = null;
  novoLivro: Partial<LivroDoUsuario> = {};
  novaCapaPreview: string | null = null;
  edicaoCapaPreview: string | null = null;

  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';
  livroComentarioProntos: any[] | null = null;
  confirmarExclusaoConta = false;

  abaAtiva: 'biblioteca' | 'atividades' = 'biblioteca';
  atividades: AtividadeLeitura[] = [];
  carregandoAtividades = false;
  zoomAvatarAberto = false;

  private primeiraCarga = true;

  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;
  private readonly COMPRESSAO_MAX_WIDTH = 1200;
  private readonly COMPRESSAO_QUALIDADE = 0.7;

  menuConfigAberto = false;
  modoVisualizacao = false;
  usuarioIdVisualizado: string | null = null;
  confirmarExclusao = false;
  livroParaExcluir: string | null = null;
  novoComentarioPerfil = '';
  meuId = '';
  bottomSheetLivroAberto = false;
  livroSelecionado: LivroDoUsuario | null = null;

  @ViewChild('fileInputLivro') fileInputLivro!: ElementRef;
  @ViewChild('fileInputEdicaoLivro') fileInputEdicaoLivro!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    public cdr: ChangeDetectorRef
  ) {}

  get nicknameEditavel(): boolean {
    const nick = this.usuario?.nickname || '';
    return !nick || nick === '@sem-nickname';
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.meuId = usuarioLogado.id || '';
      this.route.queryParams.subscribe(queryParams => {
        const forcarEdicao = queryParams['editar'] === 'true';

        this.route.params.subscribe(routeParams => {
          const idVisualizado = routeParams['id'];

          if (idVisualizado) {
            this.modoVisualizacao = true;
            this.usuarioIdVisualizado = idVisualizado;
            this.carregarPerfilVisualizacao(idVisualizado);
          } else {
            this.modoVisualizacao = false;
            this.usuarioIdVisualizado = null;
            this.carregarMeuPerfil(forcarEdicao);
          }
        });
      });
    }
  }

  carregarMeuPerfil(forcarEdicao: boolean = false): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const id = usuarioLogado.id;

    if (!id) {
      this.alertService.error('Usuário não encontrado');
      this.router.navigate(['/']);
      return;
    }

    this.carregando = true;

    this.perfilService.getPerfilCompleto(id).subscribe({
      next: (data: Usuario) => {
        this.usuario = data;
        this.livros = data.livros || [];
        this.carregando = false;

        this.atualizarLocalStorage(data);
        this.cdr.markForCheck();

        if ((this.primeiraCarga && this.nicknameEditavel) || forcarEdicao) {
          this.primeiraCarga = false;
          this.abrirEdicao();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar perfil:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar perfil');
      }
    });
  }

  carregarPerfilVisualizacao(id: string): void {
    this.carregando = true;

    this.perfilService.getPerfilCompleto(id).subscribe({
      next: (data: Usuario) => {
        this.usuario = data;
        this.livros = data.livros || [];
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar perfil visualizado:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar perfil');
      }
    });
  }

  voltar(): void { this.location.back(); }

  carregarPerfil(): void {
    if (this.modoVisualizacao && this.usuarioIdVisualizado) {
      this.carregarPerfilVisualizacao(this.usuarioIdVisualizado);
    } else {
      this.carregarMeuPerfil();
    }
  }

  abrirZoomAvatar(): void {
    this.zoomAvatarAberto = true;
    this.cdr.markForCheck();
  }

  fecharZoomAvatar(): void {
    this.zoomAvatarAberto = false;
    this.cdr.markForCheck();
  }

  abrirEdicao(): void {
    this.menuConfigAberto = false;
    const nickSemArroba = this.usuario?.nickname?.replace('@', '') || '';
    this.usuarioEdit = {
      ...this.usuario,
      nickname: nickSemArroba,
      tema: this.usuario?.tema
    };
    this.uploadErro = '';
    this.editando = true;
  }

  sair(): void {
      this.menuConfigAberto = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // ✅ ADICIONAR
      localStorage.removeItem('usuario');
      this.router.navigate(['/']);
  }

  fecharEdicao(): void {
    this.editando = false;
    this.uploadErro = '';
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
      if (file.size > this.TAMANHO_MAXIMO) throw new Error(`Máximo ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const comprimida = await this.comprimirImagem(base64, this.COMPRESSAO_MAX_WIDTH, this.COMPRESSAO_QUALIDADE);
      this.usuarioEdit.avatar = comprimida;
      this.alertService.success('Imagem selecionada!');
      this.cdr.markForCheck();
    } catch (error: any) {
      this.alertService.error(error.message);
    }
  }

  async salvarPerfil(): Promise<void> {
    if (!this.usuarioEdit || !this.usuario) return;

    if (this.nicknameEditavel) {
      let nick = (this.usuarioEdit.nickname || '').trim();
      nick = nick.replace(/^@+/, '').replace(/@/g, '').toLowerCase();

      if (!nick) { this.alertService.warning('Nickname é obrigatório'); return; }
      if (nick.length < 3) { this.alertService.warning('Mínimo 3 caracteres'); return; }
      if (nick.length > 20) { this.alertService.warning('Máximo 20 caracteres'); return; }
      if (!/^[a-z0-9._]+$/.test(nick)) {
        this.alertService.warning('Apenas letras minúsculas, números, . e _');
        return;
      }

      this.usuarioEdit.nickname = '@' + nick;
    } else {
      this.usuarioEdit.nickname = this.usuario?.nickname || '';
    }

    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      const comprimida = await this.comprimirImagem(this.usuarioEdit.avatar, 400, 0.6);
      this.uploadService.uploadImagem(comprimida).subscribe({
        next: (url) => {
          this.usuarioEdit.avatar = url;
          this.salvarDadosPerfil();
        },
        error: () => this.alertService.error('Erro ao enviar foto')
      });
    } else {
      this.salvarDadosPerfil();
    }
  }

  private salvarDadosPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    const dados: Partial<Usuario> = {
      nome: this.usuarioEdit.nome,
      descricao: this.usuarioEdit.descricao,
      nickname: this.usuarioEdit.nickname || this.usuario?.nickname,
      avatar: this.usuarioEdit.avatar,
      tema: this.usuarioEdit.tema
    };

    this.perfilService.atualizarPerfil(this.usuario.id, dados).subscribe({
      next: () => {
        this.perfilService.limparCache();
        this.carregarPerfil();
        this.editando = false;
        this.alertService.success('Perfil atualizado!');
      },
      error: () => this.alertService.error('Erro ao salvar')
    });
  }

  private atualizarLocalStorage(data: Usuario): void {
    const usuarioStorage = {
      id: data.id, nome: data.nome, nickname: data.nickname,
      email: data.email, avatar: data.avatar, tema: data.tema,
      adm: data.adm, ativo: data.ativo
    };
    localStorage.setItem('usuario', JSON.stringify(usuarioStorage));
  }

  limparArroba(): void {
    if (this.usuarioEdit.nickname && this.nicknameEditavel) {
      this.usuarioEdit.nickname = this.usuarioEdit.nickname
        .replace(/@/g, '')
        .toLowerCase();
    }
  }

  private comprimirImagem(base64: string, maxWidth: number = 800, qualidade: number = 0.7): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
    });
  }

  get livrosFiltrados(): LivroDoUsuario[] {
    let resultado = [...this.livros];
    if (this.filtroStatus !== null) resultado = resultado.filter(l => l.status === this.filtroStatus);
    if (this.filtroAvaliado) resultado = resultado.filter(l => l.avaliacao !== null);
    resultado.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
    return resultado;
  }

  getStatusTexto(status: number): string {
    switch (status) { case 2: return '📖 Lendo'; case 3: return '✅ Lido'; default: return '📕 Quero ler'; }
  }

  getStatusClass(status: number): string {
    switch (status) { case 2: return 'lendo'; case 3: return 'lido'; default: return 'nao-lido'; }
  }

  abrirModalAdicionarLivro(): void { this.modalAdicionarAberto = true; }

  onLivroAdicionado(): void {
    this.modalAdicionarAberto = false;
    this.alertService.success('Livro adicionado!');
    this.carregarPerfil();
  }

  abrirEdicaoLivro(livro: LivroDoUsuario): void {
    this.livroEditando = { ...livro, estrelas: livro.avaliacao?.nota || undefined };
    this.edicaoCapaPreview = livro.imagem || null;
    this.modalEdicaoLivroAberto = true;
  }

  fecharEdicaoLivro(): void {
    this.modalEdicaoLivroAberto = false;
    this.livroEditando = null;
    this.edicaoCapaPreview = null;
  }

  async tirarFotoEdicaoLivro(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
        if (file.size > this.TAMANHO_MAXIMO) throw new Error(`Máximo ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
        const comprimida = await this.comprimirImagem(base64, 800, 0.6);
        this.edicaoCapaPreview = comprimida;
        if (this.livroEditando) this.livroEditando.imagem = comprimida;
        this.alertService.success('Imagem selecionada!');
        this.cdr.markForCheck();
      } catch (error: any) { this.alertService.error(error.message); }
    };
    input.click();
  }

  async onFileSelectedEdicaoLivro(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
      if (file.size > this.TAMANHO_MAXIMO) throw new Error(`Máximo ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
      const comprimida = await this.comprimirImagem(base64, 800, 0.6);
      this.edicaoCapaPreview = comprimida;
      if (this.livroEditando) this.livroEditando.imagem = comprimida;
      this.alertService.success('Imagem selecionada!');
      this.cdr.markForCheck();
    } catch (error: any) { this.alertService.error(error.message); }
  }

  async salvarEdicaoLivro(): Promise<void> {
    if (!this.livroEditando) return;
    let imagemUrl = this.livroEditando.imagem || '';
    if (imagemUrl && imagemUrl.startsWith('data:')) {
      const comprimida = await this.comprimirImagem(imagemUrl, 800, 0.6);
      this.uploadService.uploadImagem(comprimida).subscribe({
        next: (url) => {
          this.livroEditando!.imagem = url;
          this.enviarEdicaoLivro();
        },
        error: () => {
          // ❌ NÃO salvar com Base64
          this.alertService.error('Erro ao enviar imagem. Tente novamente.');
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
      tipo: this.livroEditando.tipo || 'livro'
    };
    if (this.livroEditando.status === 3 && this.livroEditando.estrelas) dados.estrelas = this.livroEditando.estrelas;

    this.perfilService.atualizarLivro(this.livroEditando.id, dados).subscribe({
      next: () => {
        this.fecharEdicaoLivro();
        this.alertService.success('Livro atualizado!');
        this.carregarPerfil();
      },
      error: () => this.alertService.error('Erro ao atualizar livro')
    });
  }

  deletarLivro(id: string): void {
    if (confirm('Remover este livro?')) {
      this.perfilService.deletarLivro(id).subscribe({
        next: () => { this.alertService.success('Livro removido!'); this.carregarPerfil(); },
        error: () => this.alertService.error('Erro ao remover livro')
      });
    }
  }

  abrirComentarios(livro: LivroDoUsuario): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.livroComentarioProntos = livro.comentarios?.map((c: any) => ({
      id: c.id, idUsuario: c.usuario?.id || '',
      usuarioNickname: c.usuario?.nickname || '@user',
      comentario: c.comentario, dataCriacao: c.dataCriacao
    })) || null;
    this.comentariosAberto = true;
  }

 enviarComentarioPerfil(): void {
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
          usuarioNickname: usuarioLogado?.nickname || '@user',  // 🆕 pega do localStorage
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
      error: (err) => {
        console.error('Erro ao comentar:', err);
        this.alertService.error('Erro ao enviar comentário');
      }
    });
  }


  toggleMenuConfig(): void { this.menuConfigAberto = !this.menuConfigAberto; }

  confirmarExcluirLivro(): void {
    if (this.livroParaExcluir) {
      this.perfilService.deletarLivro(this.livroParaExcluir).subscribe({
        next: () => { this.alertService.success('Livro removido!'); this.carregarPerfil(); this.fecharConfirmacaoExclusao(); },
        error: () => this.alertService.error('Erro ao remover livro')
      });
    }
  }

  abrirConfirmacaoExclusao(id: string): void { this.livroParaExcluir = id; this.confirmarExclusao = true; }
  fecharConfirmacaoExclusao(): void { this.confirmarExclusao = false; this.livroParaExcluir = null; }

  abrirContato(): void {
    this.menuConfigAberto = false;
    window.location.href = 'mailto:g.britoalves888@gmail.com?subject=Bliteca%20-%20Contato';
  }

  avaliarApp(): void {
    this.menuConfigAberto = false;
    // Link direto para avaliação na Play Store
    const appId = 'com.bliteca.app'; // substitua pelo seu pacote real
    const url = `https://play.google.com/store/apps/details?id=${appId}&review=true`;
    window.open(url, '_blank');
  }

  compartilharApp(): void {
    this.menuConfigAberto = false;

    // Link da Play Store (substitua pelo seu ID real)
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.bliteca.app';
    const texto = '📚 Bliteca - Organize suas leituras, avalie livros e conecte-se com outros leitores!';

    if (navigator.share) {
      navigator.share({
        title: 'Bliteca',
        text: texto,
        url: playStoreUrl
      }).catch(() => {
        this.copiarLink(playStoreUrl);
      });
    } else {
      this.copiarLink(playStoreUrl);
    }
  }

  private copiarLink(texto: string): void {
    navigator.clipboard.writeText(texto).then(() => {
      this.alertService.success('Link copiado!');
    }).catch(() => {
      this.alertService.info('Compartilhe: ' + texto);
    });
  }

  confirmarExcluirConta(): void {
    this.menuConfigAberto = false;
    this.confirmarExclusaoConta = true;
  }

  fecharConfirmacaoExclusaoConta(): void {
    this.confirmarExclusaoConta = false;
  }

  excluirConta(): void {
    this.perfilService.desativarConta().subscribe({
      next: () => {
        this.confirmarExclusaoConta = false;
        this.alertService.success('Conta excluída com sucesso');
        localStorage.clear();
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Erro ao excluir conta:', err);
        this.alertService.error('Erro ao excluir conta. Tente novamente.');
      }
    });
  }

  deletarComentarioPerfil(id: string): void {
    this.perfilService.deletarComentario(id).subscribe({
      next: () => {
        if (this.livroComentarioProntos) {
          this.livroComentarioProntos = this.livroComentarioProntos.filter(c => c.id !== id);
        }
        this.alertService.success('Comentário removido!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao remover comentário');
      }
    });
  }

  adicionarLivroDoPerfil(livro: LivroDoUsuario): void {
    this.perfilService.adicionarLivro({
      titulo: livro.titulo,
      autor: livro.autor,
      imagem: livro.imagem || null,
      descricao: livro.descricao || null
    }).subscribe({
      next: () => {
        this.alertService.success(`"${livro.titulo}" adicionado à sua biblioteca!`);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);  // "Você já tem este livro"
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
      }
    });
  }

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

  carregarAtividades(): void {
    if (!this.usuario?.id) return;

    this.carregandoAtividades = true;
    this.perfilService.getAtividades(this.usuario.id).subscribe({
      next: (data) => {
        this.atividades = data;
        this.carregandoAtividades = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar atividades:', err);
        this.carregandoAtividades = false;
      }
    });
  }

  trocarAba(aba: 'biblioteca' | 'atividades'): void {
    this.abaAtiva = aba;

    if (aba === 'atividades' && this.atividades.length === 0) {
      this.carregarAtividades();
    }
  }

}
