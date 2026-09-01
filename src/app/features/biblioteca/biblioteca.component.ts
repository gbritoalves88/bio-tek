import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // 🆕 Importar Router
import { CatalogoService, CatalogoLivro } from './catalogo.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBookModalComponent, BottomSheetComponent],
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
  categorias: string[] = [];
  generoSelecionado: string | null = null;
  categoriasPrincipais: string[] = [];
  categoriasExtras: string[] = [];
  mostrarTodasCategorias = false;

  private readonly CATEGORIAS_PRINCIPAIS = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil'
  ];

  autoresFamosos = [
    {
      nome: 'J. K. Rowling',
      foto: 'https://i.ibb.co/HL9bR6FK/jk.jpg',
      termo: 'J. K. Rowling'
    },
    {
      nome: 'Stephen King',
      foto: 'https://i.ibb.co/v6h7nfyj/king.jpg',
      termo: 'Stephen King'
    },
    {
      nome: 'Machado de Assis',
      foto: 'https://i.ibb.co/ZzNKcHqM/machado.jpg',
      termo: 'Machado de Assis'
    },
    {
      nome: 'Agatha Christie',
      foto: 'https://i.ibb.co/DddHJbR/agatha.jpg',
      termo: 'Agatha Christie'
    },
    {
      nome: 'Tolkien',
      foto: 'https://i.ibb.co/5WRhM4Bk/tolkien.webp',
      termo: 'Tolkien'
    },
  ];

  constructor(
    private catalogoService: CatalogoService,
    private alertService: AlertService,
    private router: Router, // 🆕 Injetar Router
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarCatalogo();
      this.carregarCategorias();
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

  filtrarPorAutor(termo: string): void {
    this.generoSelecionado = null;

    const nomeAutor = this.autoresFamosos.find(a => a.termo === termo)?.nome || termo;

    this.termoBusca = nomeAutor;
    this.filtrarLocal();
    this.cdr.markForCheck();
  }

  filtrarPorGenero(genero: string): void {
    this.generoSelecionado = genero;
    this.termoBusca = '';

    const generoIngles = this.getGeneroIngles(genero);

    this.livros = this.livrosOriginais.filter(l =>
      l.generos?.some(g => g.toLowerCase() === generoIngles.toLowerCase())
    );
    this.cdr.markForCheck();
  }

  private getGeneroIngles(generoPt: string): string {
    const mapa: Record<string, string> = {
      'Fantasia': 'Fantasy',
      'Ficção': 'Fiction',
      'Ficção Científica': 'Science Fiction',
      'Romance': 'Romance',
      'Suspense': 'Thriller',
      'Mistério': 'Mystery',
      'Terror': 'Horror',
      'Biografia': 'Biography',
      'História': 'History',
      'Ciência': 'Science',
      'Poesia': 'Poetry',
      'Filosofia': 'Philosophy',
      'Psicologia': 'Psychology',
      'Negócios': 'Business',
      'Culinária': 'Cooking',
      'Arte': 'Art',
      'Viagem': 'Travel',
      'Quadrinhos': 'Comics',
      'Mangá': 'Manga',
      'Infantil': 'Children',
      'Jovem': 'Young Adult',
      'Autoajuda': 'Self Help',
      'Religião': 'Religion',
      'Esportes': 'Sports',
      'Música': 'Music',
    };
    return mapa[generoPt] || generoPt;
  }

  get todasCategoriasVisiveis(): string[] {
    if (this.mostrarTodasCategorias) {
      return [...this.categoriasPrincipais, ...this.categoriasExtras];
    }
    return this.categoriasPrincipais;
  }

  limparFiltroGenero(): void {
    this.generoSelecionado = null;
    this.livros = [...this.livrosOriginais];
  }

  carregarCategorias(): void {
    this.catalogoService.getCategorias().subscribe({
      next: (cats) => {
        const traduzidas = cats.map(c => this.traduzirCategoria(c));
        const unicas = [...new Set(traduzidas)].sort();

        this.categorias = unicas;
        this.categoriasPrincipais = this.CATEGORIAS_PRINCIPAIS.filter(c => unicas.includes(c));
        if (this.categoriasPrincipais.length < 8) {
          this.categoriasPrincipais = this.CATEGORIAS_PRINCIPAIS;
        }
        this.categoriasExtras = unicas.filter(c => !this.CATEGORIAS_PRINCIPAIS.includes(c));
        this.cdr.markForCheck();
      },
      error: () => {
        this.categorias = [];
      }
    });
  }

  toggleTodasCategorias(): void {
    this.mostrarTodasCategorias = !this.mostrarTodasCategorias;
  }

  getIconeGenero(genero: string): string {
    const generoLower = genero.toLowerCase();
    if (generoLower.includes('fantasia')) return 'fantasy';
    if (generoLower.includes('ficção científica') || generoLower.includes('ficcao cientifica')) return 'scifi';
    if (generoLower.includes('ficção') || generoLower.includes('ficcao')) return 'fiction';
    if (generoLower.includes('romance')) return 'romance';
    if (generoLower.includes('suspense')) return 'thriller';
    if (generoLower.includes('mistério') || generoLower.includes('misterio')) return 'mystery';
    if (generoLower.includes('terror')) return 'horror';
    if (generoLower.includes('biografia')) return 'biography';
    if (generoLower.includes('história') || generoLower.includes('historia')) return 'history';
    if (generoLower.includes('ciência') || generoLower.includes('ciencia')) return 'science';
    if (generoLower.includes('poesia')) return 'poetry';
    if (generoLower.includes('filosofia')) return 'philosophy';
    if (generoLower.includes('psicologia')) return 'psychology';
    if (generoLower.includes('negócios') || generoLower.includes('negocios')) return 'business';
    if (generoLower.includes('culinária') || generoLower.includes('culinaria')) return 'cooking';
    if (generoLower.includes('arte')) return 'art';
    if (generoLower.includes('viagem')) return 'travel';
    if (generoLower.includes('quadrinhos')) return 'comics';
    if (generoLower.includes('mangá') || generoLower.includes('manga')) return 'manga';
    if (generoLower.includes('infantil')) return 'children';
    if (generoLower.includes('jovem')) return 'young';
    if (generoLower.includes('autoajuda')) return 'selfhelp';
    if (generoLower.includes('religião') || generoLower.includes('religiao')) return 'religion';
    if (generoLower.includes('esportes')) return 'sports';
    if (generoLower.includes('música') || generoLower.includes('musica')) return 'music';
    return 'default';
  }

  private traduzirCategoria(genero: string): string {
    const traducoes: Record<string, string> = {
      'Fantasy': 'Fantasia',
      'Fiction': 'Ficção',
      'Science Fiction': 'Ficção Científica',
      'Romance': 'Romance',
      'Thriller': 'Suspense',
      'Mystery': 'Mistério',
      'Horror': 'Terror',
      'Biography': 'Biografia',
      'History': 'História',
      'Science': 'Ciência',
      'Poetry': 'Poesia',
      'Philosophy': 'Filosofia',
      'Psychology': 'Psicologia',
      'Business': 'Negócios',
      'Cooking': 'Culinária',
      'Art': 'Arte',
      'Travel': 'Viagem',
      'Comics': 'Quadrinhos',
      'Manga': 'Mangá',
      'Children': 'Infantil',
      'Young Adult': 'Jovem',
      'Self Help': 'Autoajuda',
      'Religion': 'Religião',
      'Sports': 'Esportes',
      'Music': 'Música',
    };
    return traducoes[genero] || genero;
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

  // 🆕 Método atualizado: navega para a página de detalhes
  abrirDetalhesLivro(livro: CatalogoLivro): void {
    this.router.navigate(['/inicio/livro', livro.id], {
      state: {
        livro: livro,
        editavel: false // Sempre false para livros do catálogo
      }
    });
  }

  get livrosFiltrados(): CatalogoLivro[] {
    return this.livros;
  }
}
