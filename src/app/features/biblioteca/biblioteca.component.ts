import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LivroBiblioteca, StatusLeitura, Nota } from './biblioteca.model';
import { BibliotecaService } from './biblioteca.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { ActivatedRoute } from '@angular/router';
import { Comentario } from '../../shared/comentarios-modal/comentarios-modal.model';
import { UploadService } from '../../shared/services/upload.service';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBookModalComponent, ComentariosModalComponent],
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class BibliotecaComponent implements OnInit {
  termoBusca = '';
  livros: LivroBiblioteca[] = [];
  modalAberto = false;
  modalEdicaoAberto = false;
  livroEditando: LivroBiblioteca | null = null;
  statusLeitura = StatusLeitura;
  notas = Nota;
  filtroStatus: number | null = null;
  filtroAvaliado = false;
  filtroRecente = false;
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';
  carregando = true;
  livroComentarioProntos: Comentario[] | null = null;
  private readonly TAMANHO_MAXIMO = 2 * 1024 * 1024;

  constructor(
    private bibliotecaService: BibliotecaService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        if (params['filtro'] === 'avaliados') this.filtroAvaliado = true;
        else if (params['filtro'] === 'recentes') this.filtroRecente = true;
      });
      this.carregarLivros();
    }
  }

  carregarLivros(): void {
    this.carregando = true;
    this.bibliotecaService.getBibliotecaCompleta().subscribe({
      next: (livros) => {
        this.livros = livros.sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime());
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => { console.error('Erro:', err); this.carregando = false; }
    });
  }

  getStatusTexto(status: number): string {
    switch (status) { case 2: return '📖 Lendo'; case 3: return '✅ Lido'; default: return '📕 Quero ler'; }
  }

  getStatusClass(status: number): string {
    switch (status) { case 2: return 'lendo'; case 3: return 'lido'; default: return 'nao-lido'; }
  }

  abrirModal(): void { this.modalAberto = true; }

  onLivroAdicionado(livro: any): void {
    this.bibliotecaService.limparCache();
    this.modalAberto = false;
    this.carregarLivros();
  }

  deletarLivro(id: string): void {
    if (confirm('Tem certeza que deseja remover este livro?')) {
      this.bibliotecaService.deletarLivro(id).subscribe({
        next: () => { this.bibliotecaService.limparCache(); this.carregarLivros(); }
      });
    }
  }

  abrirEdicao(livro: LivroBiblioteca): void {
    this.livroEditando = { ...livro };
    this.modalEdicaoAberto = true;
  }

  fecharEdicao(): void {
    this.modalEdicaoAberto = false;
    this.livroEditando = null;
  }

  // ⬅️ NOVO: Upload + Salvar
  async salvarEdicao(): Promise<void> {
    if (!this.livroEditando) return;

    if (this.livroEditando.imagem?.startsWith('data:')) {
      try {
        const comprimida = await this.comprimirImagem(this.livroEditando.imagem, 800, 0.6);
        this.uploadService.uploadImagem(comprimida).subscribe({
          next: (url) => { this.livroEditando!.imagem = url; this.salvarLivro(); },
          error: () => this.salvarLivro()
        });
      } catch { this.salvarLivro(); }
    } else {
      this.salvarLivro();
    }
  }

  private salvarLivro(): void {
    if (!this.livroEditando) return;
    const livroParaSalvar = {
      ...this.livroEditando,
      status: Number(this.livroEditando.status),
      estrelas: this.livroEditando.estrelas ? Number(this.livroEditando.estrelas) : undefined
    };

    this.bibliotecaService.atualizarLivroComAvaliacao(this.livroEditando.id, livroParaSalvar).subscribe({
      next: (resultado) => {
        if (resultado) console.log('✅ Avaliação salva:', resultado);
        this.bibliotecaService.limparCache();
        this.fecharEdicao();
        this.carregarLivros();
      },
      error: (err) => console.error('Erro:', err)
    });
  }

  get livrosFiltrados(): LivroBiblioteca[] {
    let resultado = [...this.livros];
    if (this.termoBusca.trim()) {
      const termo = this.termoBusca.toLowerCase();
      resultado = resultado.filter(l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo));
    }
    if (this.filtroStatus !== null) resultado = resultado.filter(l => l.status === this.filtroStatus);
    if (this.filtroAvaliado) resultado = resultado.filter(l => l.avaliacao);
    resultado.sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime());
    return resultado;
  }

  abrirComentarios(livro: LivroBiblioteca): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.livroComentarioProntos = livro.comentarios?.map(c => ({
      id: c.id, idUsuario: c.usuario?.id || '',
      usuarioNickname: c.usuario?.nickname || '@user',
      comentario: c.comentario, dataCriacao: c.dataCriacao
    })) || null;
    this.comentariosAberto = true;
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

  // ⬅️ Preview primeiro, upload no salvar
  tirarFotoEdicao(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { console.warn('Apenas imagens'); return; }
      if (file.size > this.TAMANHO_MAXIMO) { console.warn('Máximo 2MB'); return; }

      const reader = new FileReader();
      reader.onload = () => {
        if (this.livroEditando) {
          this.livroEditando.imagem = reader.result as string; // ⬅️ Preview
          this.cdr.markForCheck();
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  onFileSelectedEdicao(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { console.warn('Apenas imagens'); return; }
    if (file.size > this.TAMANHO_MAXIMO) { console.warn('Máximo 2MB'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      if (this.livroEditando) {
        this.livroEditando.imagem = reader.result as string; // ⬅️ Preview
        this.cdr.markForCheck();
      }
    };
    reader.readAsDataURL(file);
  }
}
