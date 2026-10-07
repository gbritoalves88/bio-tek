import { Component, OnInit, Input, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LivroDoUsuario } from '../perfil.model';
import { PerfilService } from '../perfil.service';
import { UploadService } from '../../../shared/services/upload.service';
import { AlertService } from '../../../shared/services/alert.service';
import { BottomSheetComponent } from '../../../shared/bottom-sheet/bottom-sheet.component';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';


@Component({
  selector: 'app-estante',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './estante.component.html',
  styleUrl: './estante.component.scss'
})
export class EstanteComponent implements OnInit {
  @Input() usuarioId = '';
  @Input() modoVisualizacao = false;

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

  // 🆕 Modal de exclusão
  confirmarExclusao = false;
  livroParaExcluir: string | null = null;

  generosDisponiveis = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil',
    'Aventura', 'Drama', 'Poesia', 'Ficção Científica'
  ];

  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;

  @ViewChild('fileInputEdicaoLivro') fileInputEdicaoLivro!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private router: Router,
    private location: Location,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.meuId = usuarioLogado.id || '';

    if (this.usuarioId) {
      this.carregarLivros();
    }
  }

  // ============ LISTAGEM ============
  carregarLivros(): void {
    this.carregando = true;

    this.perfilService.getPerfilCompleto(this.usuarioId).subscribe({
      next: (data) => {
        this.livros = data.livros || [];
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }

  get livrosFiltrados(): LivroDoUsuario[] {
    let resultado = [...this.livros];
    if (this.filtroStatus !== null) {
      resultado = resultado.filter(l => l.status === this.filtroStatus);
    }
    if (this.filtroAvaliado) {
      resultado = resultado.filter(l => l.avaliacao !== null);
    }
    resultado.sort((a, b) =>
      new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
    );
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
      arquivoLeitura: livro.arquivoLeitura || null
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
      anoPublicacao: this.livroEditando.anoPublicacao
        ? parseInt(this.livroEditando.anoPublicacao.toString())
        : null,
      editora: this.livroEditando.editora || null,
      idioma: this.livroEditando.idioma || null,
      arquivoLeitura: this.livroEditando.arquivoLeitura || null
    };
    if (this.livroEditando.status === 3 && this.livroEditando.estrelas) {
      dados.estrelas = this.livroEditando.estrelas;
    }

    this.perfilService.atualizarLivro(this.livroEditando.id, dados).subscribe({
      next: () => {
        this.fecharEdicaoLivro();
        this.alertService.success('Livro atualizado!');
        this.carregarLivros();
      },
      error: () => this.alertService.error('Erro ao atualizar livro')
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

  // ============ COMENTÁRIOS ============
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
    this.perfilService.deletarComentario(id).subscribe({
      next: () => {
        if (this.livroComentarioProntos) {
          this.livroComentarioProntos = this.livroComentarioProntos.filter(c => c.id !== id);
        }
        this.alertService.success('Comentário removido!');
        this.cdr.markForCheck();
      },
      error: () => this.alertService.error('Erro ao remover comentário')
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
    if (this.livroParaExcluir) {
      this.perfilService.deletarLivro(this.livroParaExcluir).subscribe({
        next: () => {
          this.alertService.success('Livro removido!');
          this.carregarLivros();
          this.fecharConfirmacaoExclusao();
        },
        error: () => this.alertService.error('Erro ao remover livro')
      });
    }
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


   // 🆕 Vincular arquivo na edição do livro
  async vincularArquivoEdicao(): Promise<void> {
    if (!this.livroEditando) return;

    // 🌐 TWA/PWA: usa input file
    if (!Capacitor.isNativePlatform()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.epub,application/pdf,application/epub+zip';
      input.onchange = (event: any) => {
        const file = event.target.files?.[0];
        if (!file || !this.livroEditando) return;

        const nome = file.name;
        const tamanho = file.size;
        const modificado = file.lastModified;

        this.livroEditando.arquivoLeitura = `pwa://${nome}|${tamanho}|${modificado}`;

        this.alertService.success(`Arquivo vinculado: ${nome}`);
        this.cdr.markForCheck();
      };
      input.click();
      return;
    }

    // 📱 Capacitor: FilePicker
    try {
      const result = await FilePicker.pickFiles({
        types: ['application/pdf', 'application/epub+zip'],
        readData: false
      });

      if (!result.files || result.files.length === 0) return;

      const file = result.files[0];
      const uri = file.path || '';

      if (!uri) {
        this.alertService.error('Não foi possível obter o caminho do arquivo.');
        return;
      }

      this.livroEditando.arquivoLeitura = uri;
      this.alertService.success(`Arquivo vinculado: ${file.name}`);
      this.cdr.markForCheck();

    } catch (error: any) {
      if (error?.message?.includes('cancel')) return;
      console.error('Erro ao vincular arquivo:', error);
      this.alertService.error('Erro ao selecionar arquivo.');
    }
  }

  // 🆕 Extrai o nome do arquivo (funciona com pwa:// e content://)
  getNomeArquivoEdicao(uri: string | null | undefined): string {
    if (!uri) return '';

    if (uri.startsWith('pwa://')) {
      const semPrefixo = uri.replace('pwa://', '');
      const partes = semPrefixo.split('|');
      return decodeURIComponent(partes[0] || '');
    }

    const partes = uri.split('/');
    return decodeURIComponent(partes[partes.length - 1] || '');
  }
}
