import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LivroBiblioteca, StatusLeitura, Nota } from './biblioteca.model';
import { BibliotecaService } from './biblioteca.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBookModalComponent],
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

  constructor(
    private bibliotecaService: BibliotecaService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarLivros();
    }
  }

  carregarLivros(): void {
    this.bibliotecaService.getMeusLivros().subscribe({
      next: (livros) => {
        this.livros = livros.sort((a, b) =>
          new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime()
        );
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erro ao carregar livros:', err)
    });
  }

  get livrosFiltrados(): LivroBiblioteca[] {
    if (!this.termoBusca.trim()) return this.livros;
    const termo = this.termoBusca.toLowerCase();
    return this.livros.filter(
      l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo)
    );
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
}
