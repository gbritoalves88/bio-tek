import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario, LivroDoUsuario } from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ComentariosModalComponent, AddBookModalComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class PerfilComponent implements OnInit {
  // Dados do usuário
  usuario: Usuario | null = null;
  editando = false;
  usuarioEdit: Partial<Usuario> = {};
  carregando = true;
  uploadErro = '';

  // Termos de uso
  mostrarTermos = false;
  podeAceitar = false;

  // Biblioteca pessoal
  livros: LivroDoUsuario[] = [];
  filtroStatus: number | null = null;
  filtroAvaliado = false;

  // Modais de livro
  modalAdicionarAberto = false;
  modalEdicaoLivroAberto = false;
  livroEditando: LivroDoUsuario | null = null;
  novoLivro: Partial<LivroDoUsuario> = {};
  novaCapaPreview: string | null = null;
  edicaoCapaPreview: string | null = null;

  // Comentários
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';
  livroComentarioProntos: any[] | null = null;

  // Upload
  private readonly TAMANHO_MAXIMO = 2 * 1024 * 1024;
  menuConfigAberto = false;

  // Modo visualização
  modoVisualizacao = false;
  usuarioIdVisualizado: string | null = null;

  @ViewChild('textoTermos') textoTermosRef!: ElementRef;
  @ViewChild('fileInputLivro') fileInputLivro!: ElementRef;
  @ViewChild('fileInputEdicaoLivro') fileInputEdicaoLivro!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.params.subscribe(params => {
        console.log('📌 PARAMS RECEBIDOS:', params);
        const idVisualizado = params['id'];
        console.log('🆔 ID visualizado:', idVisualizado);

        if (idVisualizado) {
          this.modoVisualizacao = true;
          this.usuarioIdVisualizado = idVisualizado;
          this.carregarPerfilVisualizacao(idVisualizado);
        } else {
          this.modoVisualizacao = false;
          this.usuarioIdVisualizado = null;
          this.carregarMeuPerfil(); // 👈 Esta linha deve estar sendo chamada
        }
      });
    }
  }

  // ==================== MEU PERFIL ====================

  carregarMeuPerfil(): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const id = usuarioLogado.id;

    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    // Pequeno delay para o Angular completar o ciclo
    setTimeout(() => {
      this.carregando = true;
      this.cdr.markForCheck();

      this.perfilService.getPerfilCompleto(id).subscribe({
        next: (data: Usuario) => {
          this.usuario = data;
          this.livros = data.livros || [];
          this.carregando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ Erro:', err);
          this.carregando = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  // ==================== PERFIL VISUALIZAÇÃO ====================

  carregarPerfilVisualizacao(id: string): void {
    console.log('🚀 MÉTODO CHAMADO! ID:', id);

    // Pequeno delay para o Angular completar o ciclo atual
    setTimeout(() => {
      this.carregando = true;
      this.cdr.markForCheck();

      this.perfilService.getPerfilCompleto(id).subscribe({
        next: (data: Usuario) => {
          this.usuario = data;
          this.livros = data.livros || [];
          this.carregando = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ Erro:', err);
          this.carregando = false;
          this.cdr.markForCheck();
        }
      });
    });
  }
  // ==================== MÉTODOS GERAIS ====================

  voltar(): void {
    this.location.back();
  }

  carregarPerfil(): void {
    if (this.modoVisualizacao && this.usuarioIdVisualizado) {
      this.carregarPerfilVisualizacao(this.usuarioIdVisualizado);
    } else {
      this.carregarMeuPerfil();
    }
  }

  abrirEdicao(): void {
    const nickSemArroba = this.usuario?.nickname?.replace('@', '') || '';
    this.usuarioEdit = {
      ...this.usuario,
      nickname: nickSemArroba,
      tema: this.usuario?.tema
    };
    this.uploadErro = '';
    this.editando = true;
  }

  fecharEdicao(): void {
    this.editando = false;
    this.uploadErro = '';
  }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.uploadErro = 'Apenas imagens são permitidas';
      return;
    }
    if (file.size > this.TAMANHO_MAXIMO) {
      this.uploadErro = `Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`;
      return;
    }
    this.uploadErro = '';

    const reader = new FileReader();
    reader.onload = () => {
      this.usuarioEdit.avatar = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async salvarPerfil(): Promise<void> {
    if (!this.usuarioEdit || !this.usuario) return;

    const nick = (this.usuarioEdit.nickname || '').replace('@', '').trim();
    if (!nick) {
      this.uploadErro = 'Nickname é obrigatório';
      return;
    }
    if (nick.length < 3) {
      this.uploadErro = 'Nickname deve ter no mínimo 3 caracteres';
      return;
    }
    if (nick.length > 10) {
      this.uploadErro = 'Nickname deve ter no máximo 10 caracteres';
      return;
    }

    this.usuarioEdit.nickname = '@' + nick;
    this.uploadErro = '';

    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      const imagemComprimida = await this.comprimirImagem(this.usuarioEdit.avatar, 400, 0.6);
      this.uploadService.uploadImagem(imagemComprimida).subscribe({
        next: (url: string) => {
          this.usuarioEdit.avatar = url;
          this.salvarDadosPerfil();
        },
        error: () => {
          this.uploadErro = 'Erro ao enviar foto. Tente novamente.';
        }
      });
    } else {
      this.salvarDadosPerfil();
    }
  }

  private salvarDadosPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;
    const dadosParaSalvar: Partial<Usuario> = {
      nome: this.usuarioEdit.nome,
      nickname: this.usuarioEdit.nickname,
      descricao: this.usuarioEdit.descricao,
      avatar: this.usuarioEdit.avatar,
      tema: this.usuarioEdit.tema
    };

    this.perfilService.atualizarPerfil(this.usuario.id, dadosParaSalvar).subscribe({
      next: () => {
        this.perfilService.limparCache();
        this.carregarPerfil();
        this.editando = false;
        this.uploadErro = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.uploadErro = 'Erro ao salvar. Tente novamente.';
      }
    });
  }

  sair(): void {
    this.fecharTermos();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }

  limparArroba(): void {
    if (this.usuarioEdit.nickname) {
      this.usuarioEdit.nickname = this.usuarioEdit.nickname.replace(/@/g, '');
    }
  }

  private comprimirImagem(base64: string, maxWidth: number = 400, qualidade: number = 0.7): Promise<string> {
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

  // ==================== TERMOS ====================

  verificarScroll(): void {
    const el = this.textoTermosRef?.nativeElement;
    if (el) {
      const scrolledToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
      if (scrolledToBottom) {
        this.podeAceitar = true;
      }
    }
  }

  aceitarTermos(): void {
    if (!this.usuario) return;
    this.perfilService.aceitarTermos().subscribe({
      next: () => {
        this.fecharTermos();
        this.cdr.markForCheck();
        this.abrirEdicao();
      },
      error: (err) => {
        console.error('Erro ao aceitar termos:', err);
      }
    });
  }

  recusarTermos(): void {
    this.fecharTermos();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }

  abrirTermos(): void {
    this.mostrarTermos = true;
    const header = document.querySelector('.header') as HTMLElement;
    const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    if (header) header.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
  }

  fecharTermos(): void {
    this.mostrarTermos = false;
    this.podeAceitar = false;
    const header = document.querySelector('.header') as HTMLElement;
    const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    if (header) header.style.display = '';
    if (bottomNav) bottomNav.style.display = '';
    if (sidebar) sidebar.style.display = '';
    this.cdr.markForCheck();
  }

  // ==================== LIVROS ====================

  get livrosFiltrados(): LivroDoUsuario[] {
    let resultado = [...this.livros];
    if (this.filtroStatus !== null) {
      resultado = resultado.filter(l => l.status === this.filtroStatus);
    }
    if (this.filtroAvaliado) {
      resultado = resultado.filter(l => l.avaliacao !== null && l.avaliacao !== undefined);
    }
    resultado.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
    return resultado;
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

  // ===== Modal Adicionar Livro =====

  abrirModalAdicionarLivro(): void {
    this.modalAdicionarAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.modalAdicionarAberto = false;
    this.carregarPerfil();
  }

  fecharModalAdicionar(): void {
    this.modalAdicionarAberto = false;
    this.novoLivro = {};
    this.novaCapaPreview = null;
  }

  tirarFotoLivro(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) this.processarImagemNova(file);
    };
    input.click();
  }

  onFileSelectedLivro(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processarImagemNova(file);
  }

  private processarImagemNova(file: File): void {
    if (!file.type.startsWith('image/')) {
      console.warn('Apenas imagens');
      return;
    }
    if (file.size > this.TAMANHO_MAXIMO) {
      console.warn('Máximo 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.novaCapaPreview = reader.result as string;
      this.novoLivro.imagem = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async salvarNovoLivro(): Promise<void> {
    if (!this.novoLivro.titulo || !this.novoLivro.autor) {
      alert('Preencha título e autor');
      return;
    }

    let imagemUrl = this.novoLivro.imagem || '';
    if (imagemUrl && imagemUrl.startsWith('data:')) {
      const comprimida = await this.comprimirImagem(imagemUrl, 800, 0.6);
      this.uploadService.uploadImagem(comprimida).subscribe({
        next: (url) => {
          this.novoLivro.imagem = url;
          this.enviarNovoLivro();
        },
        error: () => this.enviarNovoLivro()
      });
    } else {
      this.enviarNovoLivro();
    }
  }

  private enviarNovoLivro(): void {
    this.perfilService.criarLivro(this.novoLivro).subscribe({
      next: () => {
        this.fecharModalAdicionar();
        this.carregarPerfil();
      },
      error: (err) => console.error('Erro ao criar livro:', err)
    });
  }

  // ===== Editar Livro =====

  abrirEdicaoLivro(livro: LivroDoUsuario): void {
    this.livroEditando = {
      ...livro,
      estrelas: livro.avaliacao?.nota || undefined
    };
    this.edicaoCapaPreview = livro.imagem || null;
    this.modalEdicaoLivroAberto = true;
  }

  fecharEdicaoLivro(): void {
    this.modalEdicaoLivroAberto = false;
    this.livroEditando = null;
    this.edicaoCapaPreview = null;
  }

  tirarFotoEdicaoLivro(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (file) this.processarImagemEdicao(file);
    };
    input.click();
  }

  onFileSelectedEdicaoLivro(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processarImagemEdicao(file);
  }

  private processarImagemEdicao(file: File): void {
    if (!file.type.startsWith('image/')) {
      console.warn('Apenas imagens');
      return;
    }
    if (file.size > this.TAMANHO_MAXIMO) {
      console.warn('Máximo 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.edicaoCapaPreview = reader.result as string;
      if (this.livroEditando) {
        this.livroEditando.imagem = reader.result as string;
      }
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
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
        error: () => this.enviarEdicaoLivro()
      });
    } else {
      this.enviarEdicaoLivro();
    }
  }

  private enviarEdicaoLivro(): void {
    if (!this.livroEditando) return;

    const dadosParaEnviar: any = {
      titulo: this.livroEditando.titulo,
      autor: this.livroEditando.autor,
      descricao: this.livroEditando.descricao,
      imagem: this.livroEditando.imagem,
      status: this.livroEditando.status
    };

    if (this.livroEditando.status === 3 && this.livroEditando.estrelas) {
      dadosParaEnviar.estrelas = this.livroEditando.estrelas;
    }

    this.perfilService.atualizarLivro(this.livroEditando.id, dadosParaEnviar).subscribe({
      next: () => {
        this.fecharEdicaoLivro();
        this.carregarPerfil();
      },
      error: (err) => console.error('Erro ao editar livro:', err)
    });
  }

  // ===== Deletar Livro =====

  deletarLivro(id: string): void {
    if (confirm('Tem certeza que deseja remover este livro?')) {
      this.perfilService.deletarLivro(id).subscribe({
        next: () => {
          this.carregarPerfil();
        },
        error: (err) => console.error('Erro ao deletar livro:', err)
      });
    }
  }

  // ===== Comentários =====

  abrirComentarios(livro: LivroDoUsuario): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.livroComentarioProntos = livro.comentarios?.map((c: any) => ({
      id: c.id,
      idUsuario: c.usuario?.id || '',
      usuarioNickname: c.usuario?.nickname || '@user',
      comentario: c.comentario,
      dataCriacao: c.dataCriacao
    })) || null;
    this.comentariosAberto = true;
  }

  // ===== Menu Configuração =====

  toggleMenuConfig(): void {
    this.menuConfigAberto = !this.menuConfigAberto;
  }

  fecharMenuConfig(): void {
    this.menuConfigAberto = false;
  }
}
