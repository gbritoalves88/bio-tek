import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  maisAdicionados: any[] = [];
  generosPreferidos: string[] = [];
  primeiroAcesso = false;
  mostrarModalPreferencias = false;
  generosDisponiveis: string[] = [];
  generosSelecionados: string[] = [];
  salvandoPreferencias = false;
  recomendados: any[] = [];

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
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarTudo();
    }
  }

  carregarTudo(): void {
    this.carregando = true;

    this.catalogoService.getBibliotecaInicial().subscribe({
      next: (result) => {
        this.livrosOriginais = result.catalogo || [];
        this.livros = [...this.livrosOriginais];
        this.maisAdicionados = result.maisAdicionados || [];
        this.generosPreferidos = result.generosPreferidos || [];
        this.primeiroAcesso = result.primeiroAcesso || false;
        this.recomendados = result.recomendados || [];
        this.processarCategorias(result.categorias || []);
        this.generosDisponiveis = this.CATEGORIAS_PRINCIPAIS;

        if (this.primeiroAcesso) {
          setTimeout(() => {
            this.mostrarModalPreferencias = true;
            this.cdr.markForCheck();
          }, 500);
        }

        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar biblioteca:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar biblioteca');
      }
    });
  }

  private processarCategorias(cats: string[]): void {
    const traduzidas = cats.map(c => this.traduzirCategoria(c));
    const unicas = [...new Set(traduzidas)].sort();

    this.categorias = unicas;
    this.categoriasPrincipais = this.CATEGORIAS_PRINCIPAIS.filter(c => unicas.includes(c));
    if (this.categoriasPrincipais.length < 8) {
      this.categoriasPrincipais = this.CATEGORIAS_PRINCIPAIS;
    }
    this.categoriasExtras = unicas.filter(c => !this.CATEGORIAS_PRINCIPAIS.includes(c));
  }

  carregarCatalogo(): void {
    this.catalogoService.getAll().subscribe({
      next: (livros) => {
        this.livrosOriginais = livros;
        this.livros = [...livros];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar catálogo:', err);
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

    const generoNormalizado = this.normalizarGenero(genero.toLowerCase());

    this.livros = this.livrosOriginais.filter(l => {
      if (!l.generos || l.generos.length === 0) return false;

      return l.generos.some(g => {
        const genNormalizado = this.normalizarGenero(g.toLowerCase().trim());

        return genNormalizado === generoNormalizado ||
               genNormalizado.includes(generoNormalizado) ||
               generoNormalizado.includes(genNormalizado);
      });
    });

    // Se não achou nada, mostra todos
    if (this.livros.length === 0) {
      this.livros = [...this.livrosOriginais];
    }

    this.cdr.markForCheck();
  }

  private normalizarGenero(genero: string): string {
    const g = genero.toLowerCase().trim();

    if (!g) return '';

    // Fantasia
    if (g.includes('fantas') || g.includes('fairy') || g.includes('elves') ||
        g.includes('magic') || g.includes('sword') || g.includes('dragon')) return 'fantasia';

    // Ficção Científica
    if (g.includes('scien') || g.includes('ciência') || g.includes('ciencia') ||
        g.includes('dune') || g.includes('space') || g.includes('alien') ||
        g.includes('planet') || g.includes('robot') || g.includes('dystop')) return 'ficção científica';

    // Ficção
    if (g.includes('ficcao') || g.includes('ficção') || g.includes('fiction') ||
        g.includes('novel') || g.includes('literary') || g.includes('literature')) return 'ficção';

    // Romance
    if (g.includes('romance') || g.includes('love') || g.includes('courtship')) return 'romance';

    // Suspense/Thriller
    if (g.includes('thriller') || g.includes('suspense') || g.includes('murder') ||
        g.includes('crime')) return 'suspense';

    // Mistério
    if (g.includes('myster') || g.includes('mistério') || g.includes('misterio') ||
        g.includes('detective')) return 'mistério';

    // Terror
    if (g.includes('horror') || g.includes('terror') || g.includes('occult') ||
        g.includes('supernatural') || g.includes('ghost')) return 'terror';

    // Biografia
    if (g.includes('biography') || g.includes('biografia') || g.includes('authors') ||
        g.includes('autobiography') || g.includes('memoir') || g.includes('writer')) return 'biografia';

    // História
    if (g.includes('history') || g.includes('história') || g.includes('historia') ||
        g.includes('war') || g.includes('military')) return 'história';

    // Infantil
    if (g.includes('children') || g.includes('infantil') || g.includes('juvenile') ||
        g.includes('fairy tales') || g.includes('coloring')) return 'infantil';

    // Jovem
    if (g.includes('young adult') || g.includes('jovem')) return 'jovem';

    // Educação
    if (g.includes('education') || g.includes('study') || g.includes('language') ||
        g.includes('reference') || g.includes('exam')) return 'educação';

    // Poesia
    if (g.includes('poetry') || g.includes('poesia')) return 'poesia';

    // Filosofia
    if (g.includes('philosophy') || g.includes('filosofia')) return 'filosofia';

    // Psicologia
    if (g.includes('psychology') || g.includes('psicologia') ||
        g.includes('mental') || g.includes('depression')) return 'psicologia';

    // Negócios
    if (g.includes('business') || g.includes('economics') || g.includes('negócios') ||
        g.includes('negocios') || g.includes('management')) return 'negócios';

    // Culinária
    if (g.includes('cooking') || g.includes('culinária') || g.includes('culinaria') ||
        g.includes('food') || g.includes('candy')) return 'culinária';

    // Arte
    if (g.includes('art') || g.includes('arte') || g.includes('design') ||
        g.includes('photography') || g.includes('architecture')) return 'arte';

    // Viagem
    if (g.includes('travel') || g.includes('viagem') || g.includes('tourism')) return 'viagem';

    // Quadrinhos
    if (g.includes('comics') || g.includes('graphic') || g.includes('quadrinhos') ||
        g.includes('cartoon')) return 'quadrinhos';

    // Mangá
    if (g.includes('manga') || g.includes('mangá') || g.includes('anime')) return 'mangá';

    // Autoajuda
    if (g.includes('self') || g.includes('motivation') || g.includes('inspiration') ||
        g.includes('personal development')) return 'autoajuda';

    // Religião
    if (g.includes('religion') || g.includes('religião') || g.includes('religiao') ||
        g.includes('bible') || g.includes('spiritual')) return 'religião';

    // Esportes
    if (g.includes('sports') || g.includes('esportes') || g.includes('fitness')) return 'esportes';

    // Música
    if (g.includes('music') || g.includes('música') || g.includes('musica') ||
        g.includes('song')) return 'música';

    // Drama
    if (g.includes('drama') || g.includes('theater') || g.includes('play')) return 'drama';

    // Aventura
    if (g.includes('adventure') || g.includes('aventura')) return 'aventura';

    // Tecnologia
    if (g.includes('computer') || g.includes('technology') || g.includes('programming') ||
        g.includes('software')) return 'tecnologia';

    return g;
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

  abrirDetalhesLivro(livro: CatalogoLivro): void {
    this.router.navigate(['/inicio/livro', livro.id], {
      state: {
        livro: livro,
        editavel: false,
        origem: 'biblioteca'
      }
    });
  }

  get livrosFiltrados(): CatalogoLivro[] {
    return this.livros;
  }

  toggleGenero(genero: string): void {
    const index = this.generosSelecionados.indexOf(genero);

    if (index > -1) {
      this.generosSelecionados.splice(index, 1);
    } else {
      if (this.generosSelecionados.length < 3) {
        this.generosSelecionados.push(genero);
      } else {
        this.alertService.warning('Você pode escolher até 3 gêneros');
      }
    }
  }

  salvarPreferencias(): void {
    if (this.generosSelecionados.length === 0) return;

    this.salvandoPreferencias = true;

    this.catalogoService.salvarPreferencias(this.generosSelecionados).subscribe({
      next: () => {
        this.salvandoPreferencias = false;
        this.mostrarModalPreferencias = false;
        this.generosPreferidos = [...this.generosSelecionados];
        this.primeiroAcesso = false;
        this.alertService.success('Preferências salvas!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao salvar preferências:', err);
        this.salvandoPreferencias = false;
        this.alertService.error('Erro ao salvar preferências');
      }
    });
  }

  pularPreferencias(): void {
    this.mostrarModalPreferencias = false;
    this.cdr.markForCheck();
  }
}
