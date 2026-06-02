import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService, CatalogoLivro } from './catalogo.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';

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
  livrosOriginais: CatalogoLivro[] = [];
  livros: CatalogoLivro[] = [];
  carregando = true;
  modalAberto = false;
  adicionando: { [key: string]: boolean } = {};

  constructor(
    private catalogoService: CatalogoService,
    private alertService: AlertService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarCatalogo();
    }
  }

  carregarCatalogo(): void {
    this.carregando = true;
    this.catalogoService.getAll().subscribe({
      next: (livros) => {
        this.livrosOriginais = livros;
        this.livros = [...livros];
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar catálogo:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar catálogo');
      }
    });
  }

  filtrarLocal(): void {
    if (!this.termoBusca.trim()) {
      this.livros = [...this.livrosOriginais];
      return;
    }

    const termo = this.termoBusca.toLowerCase();
    this.livros = this.livrosOriginais.filter(livro =>
      livro.titulo?.toLowerCase().includes(termo) ||
      livro.autor?.toLowerCase().includes(termo)
    );
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.livros = [...this.livrosOriginais];
  }

  abrirModal(): void {
    this.modalAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.modalAberto = false;
    this.alertService.success('Livro adicionado ao catálogo!');
    this.carregarCatalogo();
  }

  adicionarBiblioteca(catalogoId: string): void {
    this.adicionando[catalogoId] = true;

    this.catalogoService.adicionarBiblioteca(catalogoId).subscribe({
      next: () => {
        this.adicionando[catalogoId] = false;
        this.alertService.success('Livro adicionado à sua biblioteca!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.adicionando[catalogoId] = false;
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
      }
    });
  }

  get livrosFiltrados(): CatalogoLivro[] {
    return this.livros;
  }
}
