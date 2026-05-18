import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LivroBiblioteca, StatusLeitura, Nota } from './biblioteca.model';
import { BibliotecaService } from './biblioteca.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { ActivatedRoute } from '@angular/router';

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

  constructor(
    private bibliotecaService: BibliotecaService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.route.queryParams.subscribe(params => {
        if (params['filtro'] === 'avaliados') {
          this.filtroAvaliado = true;
        } else if (params['filtro'] === 'recentes') {
          this.filtroRecente = true;
        }
      });
      this.carregarLivros();
    }
  }

  carregarLivros(): void {
  this.bibliotecaService.getMeusLivrosComAvaliacoes().subscribe({
    next: (livros) => {
      this.livros = livros.sort((a, b) =>
        new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime()
      );
      this.cdr.markForCheck();
    },
    error: (err) => console.error('Erro ao carregar livros:', err)
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

  abrirModal(): void {
    this.modalAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.modalAberto = false;
    this.carregarLivros();
  }

  deletarLivro(id: string): void {
    if (confirm('Tem certeza que deseja remover este livro?')) {
      this.bibliotecaService.deletarLivro(id).subscribe({
        next: () => this.carregarLivros(),
        error: (err) => console.error('Erro ao deletar:', err)
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

  salvarEdicao(): void {
    if (!this.livroEditando) return;

    const livroParaSalvar = {
      ...this.livroEditando,
      status: Number(this.livroEditando.status),
      estrelas: this.livroEditando.estrelas ? Number(this.livroEditando.estrelas) : undefined
    };

    this.bibliotecaService.atualizarLivroComAvaliacao(this.livroEditando.id, livroParaSalvar).subscribe({
      next: (resultado) => {
        if (resultado) {
          console.log('✅ Avaliação salva:', resultado);
        }
        this.fecharEdicao();
        this.carregarLivros();
      },
      error: (err) => console.error('Erro ao atualizar:', err)
    });
  }



  get livrosFiltrados(): LivroBiblioteca[] {
    let resultado = [...this.livros];

    // Filtro por busca
    if (this.termoBusca.trim()) {
      const termo = this.termoBusca.toLowerCase();
      resultado = resultado.filter(
        l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo)
      );
    }

    // Filtro por status
    if (this.filtroStatus !== null) {
      resultado = resultado.filter(l => l.status === this.filtroStatus);
    }

    // Filtro avaliados
    if (this.filtroAvaliado) {
      resultado = resultado.filter(l => l.estrelas && l.estrelas > 0);
    }

    // Ordenação
    if (this.filtroRecente) {
      resultado.sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime());
    }

    return resultado;
  }

  abrirComentarios(livro: LivroBiblioteca): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;
    this.comentariosAberto = true;
  }
}
