import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario, LivroDoUsuario, AtividadeLeitura, MetricasMes, StreakData } from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { AlertService } from '../../shared/services/alert.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { StreakService } from '../../core/services/streak.service';
import { PullToRefreshComponent } from '../../shared/pull-to-refresh/pull-to-refresh.component';
import { getAvatarUrl, getAvatarPadrao } from '../../shared/utils/avatar-helper';


@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent,  AddBookModalComponent, PullToRefreshComponent],
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
  metricas: MetricasMes | null = null;

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

  //abaAtiva: 'biblioteca' | 'atividades' = 'biblioteca';
  atividades: AtividadeLeitura[] = [];
  carregandoAtividades = false;
  zoomAvatarAberto = false;

  abaAtiva: 'biblioteca' | 'atividades' | 'progresso' = 'biblioteca';
  streak: StreakData | null = null;
  historico: string[] = [];
  carregandoProgresso = false;
  passoOnboarding = 0; // 0 = avatar, 1 = nome, 2 = nickname, 3 = biografia, 4 = tema, 5 = salvar
  onboardingAtivo = false;
  posicaoHighlight = { top: 0, left: 0, width: 0, height: 0 };


  tooltipTop = 0;
  tooltipLeft = 0;

  windowHeight = 0;
  windowWidth = 0;

  generosDisponiveis = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil',
    'Aventura', 'Drama', 'Poesia', 'Ficção Científica'
  ];

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
  @ViewChild('inputNome') inputNome!: ElementRef;
  @ViewChild('inputNickname') inputNickname!: ElementRef;
  @ViewChild('inputBiografia') inputBiografia!: ElementRef;
  @ViewChild('selectTema') selectTema!: ElementRef;
  @ViewChild('btnSalvar') btnSalvar!: ElementRef;
  @ViewChild('avatarEdicao') avatarEdicao!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    public cdr: ChangeDetectorRef,
    private streakService: StreakService
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
        const aba = queryParams['aba'];

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

            // 🆕 Aumenta o delay e força o carregamento dos dados
            if (aba === 'progresso') {
              setTimeout(() => {
                this.abaAtiva = 'progresso';  // Define direto
                this.carregarProgresso();      // Força o carregamento
              }, 800);  // Aumenta para 800ms
            }
            if (aba === 'atividades') {
              setTimeout(() => {
                this.abaAtiva = 'atividades';
                this.carregarAtividades();      // Força o carregamento
              }, 800);
            }
            if (aba === 'biblioteca') {
              setTimeout(() => {
                this.abaAtiva = 'biblioteca';
              }, 800);
            }
          }
        });
      });
    }
  }

  recarregar(): void {
    if (this.modoVisualizacao && this.usuarioIdVisualizado) {
      this.carregarPerfilVisualizacao(this.usuarioIdVisualizado);
    } else {
      this.carregarMeuPerfil(false);

      if (this.abaAtiva === 'progresso') {
        this.carregarProgresso();
      } else if (this.abaAtiva === 'atividades') {
        this.carregarAtividades();
      }
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

  // 🆕 Toggle gênero na edição
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

    // 🆕 Iniciar onboarding se for primeiro acesso
    if (this.nicknameEditavel && !this.modoVisualizacao) {
      setTimeout(() => {
        this.iniciarOnboarding();
      }, 300);
    }
  }

  sair(): void {
      this.menuConfigAberto = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // ✅ ADICIONAR
      localStorage.removeItem('usuario');
      this.router.navigate(['/']);
  }

  fecharEdicao(): void {
    // 🆕 Se onboarding ativo, não permite fechar
    if (this.onboardingAtivo && this.nicknameEditavel) {
      this.alertService.warning('Complete seu cadastro para continuar');
      return;
    }

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

    const eraPrimeiroAcesso = this.nicknameEditavel;

    // 🆕 Se o usuário não escolheu avatar, usa o aleatório
    if (!this.usuarioEdit.avatar) {
      this.usuarioEdit.avatar = getAvatarPadrao(this.usuario.id);
    }

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

        // 🆕 ATUALIZA O LOCALSTORAGE ANTES DE QUALQUER COISA
        const usuarioStorage = JSON.parse(localStorage.getItem('usuario') || '{}');
        usuarioStorage.nome = dados.nome || usuarioStorage.nome;
        usuarioStorage.nickname = dados.nickname || usuarioStorage.nickname;
        usuarioStorage.avatar = dados.avatar || usuarioStorage.avatar;
        usuarioStorage.tema = dados.tema || usuarioStorage.tema;
        localStorage.setItem('usuario', JSON.stringify(usuarioStorage));

        // 🆕 ATUALIZA O OBJETO this.usuario
        this.usuario = {
          ...this.usuario!,
          nome: dados.nome || this.usuario!.nome,
          nickname: dados.nickname || this.usuario!.nickname,
          descricao: dados.descricao || this.usuario!.descricao,
          avatar: dados.avatar || this.usuario!.avatar,
          tema: dados.tema || this.usuario!.tema
        };

        this.editando = false;
        this.onboardingAtivo = false;
        this.cdr.markForCheck();

        this.alertService.success('Perfil atualizado!');

        if (eraPrimeiroAcesso) {
          // 🆕 Navega com replace para limpar histórico
          this.router.navigate(['/inicio'], { replaceUrl: true });
        } else {
          this.carregarPerfil();
        }
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
    this.livroEditando = {
      ...livro,
      estrelas: livro.avaliacao?.nota || undefined,
      // 🆕 Garante que os novos campos existem
      generos: livro.generos || [],
      anoPublicacao: livro.anoPublicacao || null,
      editora: livro.editora || null,
      idioma: livro.idioma || null
    };
    this.edicaoCapaPreview = livro.imagem || null;
    this.modalEdicaoLivroAberto = true;
  }

validarAno(): void {
  if (this.livroEditando?.anoPublicacao) {
    const anoStr = this.livroEditando.anoPublicacao.toString();

    // 🆕 Limita a 4 dígitos
    if (anoStr.length > 4) {
      this.livroEditando.anoPublicacao = parseInt(anoStr.slice(0, 4));
    }

    const ano = parseInt(this.livroEditando.anoPublicacao.toString());
    if (ano < 1000 || ano > 9999) {
      this.livroEditando.anoPublicacao = null;
    }
  }
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
      tipo: this.livroEditando.tipo || 'livro',
      generos: this.livroEditando.generos || [],
      anoPublicacao: this.livroEditando.anoPublicacao ?
      parseInt(this.livroEditando.anoPublicacao.toString()) : null,
      editora: this.livroEditando.editora || null,
      idioma: this.livroEditando.idioma || null
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
    const usuarioId = this.usuario?.id || this.meuId;
    if (!usuarioId) return;

    this.carregandoAtividades = true;
    this.perfilService.getAtividades(usuarioId).subscribe({
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


  carregarProgresso(): void {
    const usuarioId = this.modoVisualizacao ? this.usuarioIdVisualizado : (this.usuario?.id || this.meuId);
    if (!usuarioId) return;

    this.carregandoProgresso = true;

    this.streakService.getStreak(usuarioId).subscribe({
      next: (data) => {
        this.streak = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });

    this.streakService.getHistorico(usuarioId).subscribe({
      next: (data) => {
        this.historico = data.dias;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });

    this.streakService.getMetricasMes(usuarioId).subscribe({
      next: (data) => {
        this.metricas = data;
        this.carregandoProgresso = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregandoProgresso = false;
        this.cdr.markForCheck();
      }
    });
  }

  trocarAba(aba: 'biblioteca' | 'atividades' | 'progresso'): void {
    this.abaAtiva = aba;

    if (aba === 'atividades' && this.atividades.length === 0) {
      this.carregarAtividades();
    }

    if (aba === 'progresso' && !this.streak) {
      this.carregarProgresso();
    }
  }

  // 🆕 PROPIEDADE PARA O CALENDÁRIO
  get ultimos7Dias(): { dia: string; data: string }[] {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const resultado: { dia: string; data: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);

      // 🆕 Formatar no horário LOCAL (não UTC)
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');

      resultado.push({
        dia: dias[data.getDay()],
        data: `${ano}-${mes}-${dia}`
      });
    }

    return resultado;
  }

  // 🆕 MÉTODO PARA VERIFICAR SE O DIA FOI ATIVO
  diaAtivo(dataStr: string): boolean {
    return this.historico.includes(dataStr);
  }

  // 🆕 Método para navegar para detalhes do livro
  abrirDetalhesLivro(livro: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!livro) return;

    // Fecha o bottom sheet antes de navegar
    this.fecharBottomSheetLivro();

    // Navega para a página de detalhes
    this.router.navigate(['/inicio/livro', livro.id], {
      state: {
        livro: livro,
        editavel: !this.modoVisualizacao, // Se está vendo o próprio perfil, é editável
        origem: 'perfil'
      }
    });
  }

  // ============ ONBOARDING ============

  // Iniciar onboarding
  iniciarOnboarding(): void {
    if (!this.nicknameEditavel || !this.editando || this.modoVisualizacao) {
      return;
    }

    this.passoOnboarding = 0;
    this.onboardingAtivo = true;

    // Pequeno delay para o DOM renderizar
    setTimeout(() => {
      this.atualizarHighlightComScroll();
    }, 500);
  }

  // Atualizar posição do highlight
  atualizarHighlight(): void {
    const elemento = this.getElementoPassoAtual();

    if (!elemento) {
      this.proximoPassoOnboarding();
      return;
    }

    const rect = elemento.getBoundingClientRect();
    this.windowHeight = window.innerHeight;
    this.windowWidth = window.innerWidth;

    // Adiciona padding ao highlight
    const padding = 8;
    this.posicaoHighlight = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    };

    // Posiciona tooltip de forma inteligente
    const tooltipWidth = Math.min(280, this.windowWidth - 32);
    const tooltipHeight = 180;

    // Posição horizontal: centralizado com o campo
    let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Ajusta se sair da tela
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, this.windowWidth - tooltipWidth - 16));

    // Posição vertical: abaixo ou acima do campo
    let tooltipTop = rect.bottom + 16;

    // Se não couber abaixo, coloca acima
    if (tooltipTop + tooltipHeight > this.windowHeight - 16) {
      tooltipTop = rect.top - tooltipHeight - 16;
    }

    this.tooltipTop = tooltipTop;
    this.tooltipLeft = tooltipLeft;

    // Foca no campo (se for input/select/textarea)
    if (elemento instanceof HTMLInputElement ||
        elemento instanceof HTMLTextAreaElement ||
        elemento instanceof HTMLSelectElement) {
      elemento.focus();
    }

    this.cdr.markForCheck(); // 🆕 Força atualização visual
  }

  // Obter elemento do passo atual
  getElementoPassoAtual(): HTMLElement | null {
    switch (this.passoOnboarding) {
      case 0: return this.avatarEdicao?.nativeElement;
      case 1: return this.inputNome?.nativeElement;
      case 2: return this.inputNickname?.nativeElement;
      case 3: return this.inputBiografia?.nativeElement;
      case 4: return this.selectTema?.nativeElement;
      case 5: return this.btnSalvar?.nativeElement;
      default: return null;
    }
  }

  // Títulos dos passos
  getTituloPasso(): string {
    switch (this.passoOnboarding) {
      case 0: return '📷 Foto de perfil';
      case 1: return '👤 Seu nome';
      case 2: return '✏️ Escolha seu @nickname';
      case 3: return '📝 Biografia';
      case 4: return '🎨 Tema';
      case 5: return '✅ Finalizar';
      default: return '';
    }
  }

  // Descrições dos passos
  getDescricaoPasso(): string {
    switch (this.passoOnboarding) {
      case 0: return 'Toque para adicionar uma foto (opcional)';
      case 1: return 'Digite seu nome completo';
      case 2: return 'Seu @nickname é único e não pode ser alterado depois';
      case 3: return 'Conte um pouco sobre você (opcional)';
      case 4: return 'Escolha entre tema claro ou escuro';
      case 5: return 'Clique em Salvar para completar seu cadastro';
      default: return '';
    }
  }

  // Avançar para próximo passo
  proximoPassoOnboarding(): void {
    // Passo 0 (avatar) é opcional - permite pular
    if (this.passoOnboarding === 0) {
      this.passoOnboarding = 1;
      this.atualizarHighlightComScroll();
      return;
    }

    // Validação dos campos obrigatórios
    if (this.passoOnboarding === 1 && !this.usuarioEdit.nome?.trim()) {
      this.alertService.warning('Digite seu nome para continuar');
      return;
    }

    if (this.passoOnboarding === 2) {
      const nick = (this.usuarioEdit.nickname || '').trim();
      if (!nick || nick.length < 3) {
        this.alertService.warning('Digite um nickname com pelo menos 3 caracteres');
        return;
      }
    }

    // Avança para próximo passo
    if (this.passoOnboarding < 5) {
      this.passoOnboarding++;
      this.atualizarHighlightComScroll();
    } else {
      this.finalizarOnboarding();
    }
  }

  // 🆕 Novo método: atualiza com scroll e recalcula
  atualizarHighlightComScroll(): void {
    const elemento = this.getElementoPassoAtual();

    if (!elemento) {
      this.proximoPassoOnboarding();
      return;
    }

    // Primeiro, scroll até o elemento
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Depois do scroll, recalcula a posição
    setTimeout(() => {
      this.atualizarHighlight();
    }, 400); // Aguarda o scroll terminar
  }

  // Finalizar onboarding
  finalizarOnboarding(): void {
    this.onboardingAtivo = false;
    this.passoOnboarding = 0;

    // Chama o salvar automaticamente
    if (this.usuarioEdit.nome?.trim() && this.usuarioEdit.nickname?.trim()) {
      this.salvarPerfil();
    }
  }

  getAvatar(usuario: any): string {
    return getAvatarUrl(usuario);
  }

}
