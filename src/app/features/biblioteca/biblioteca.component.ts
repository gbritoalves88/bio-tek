import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogoService } from './catalogo.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { CatalogoLivro } from './biblioteca.model';
import { PullToRefreshComponent } from '../../shared/pull-to-refresh/pull-to-refresh.component';

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule, AddBookModalComponent, BottomSheetComponent, PullToRefreshComponent],
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class BibliotecaComponent implements OnInit {
  // ========== ESTADO DA LISTA (PAGINADA) ==========
  livros: CatalogoLivro[] = [];
  paginaAtual = 1;
  tamanhoPagina = 20;
  totalPaginas = 0;
  totalLivros = 0;

  // ========== ESTADOS DE CARREGAMENTO ==========
  carregando = false;       // carregando a primeira página (skeleton)
  carregandoMais = false;   // carregando páginas adicionais (infinite scroll)

  // ========== FILTROS ==========
  termoBusca = '';
  generoSelecionado: string | null = null;
  private debounceTimer: any;

  // ========== UI ==========
  modalAberto = false;
  adicionando: { [key: string]: boolean } = {};

  // ========== CATEGORIAS ==========
  categorias: string[] = [];
  categoriasPrincipais: string[] = [];
  categoriasExtras: string[] = [];
  mostrarTodasCategorias = false;

  // ========== TOPO DA PÁGINA (vindos de biblioteca-inicial) ==========
  maisAdicionados: any[] = [];
  generosPreferidos: string[] = [];
  primeiroAcesso = false;
  mostrarModalPreferencias = false;
  generosDisponiveis: string[] = [];
  generosSelecionados: string[] = [];
  salvandoPreferencias = false;
  recomendados: any[] = [];

  // ========== CONSTANTES ==========
  private readonly CATEGORIAS_PRINCIPAIS = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil'
  ];

  autoresFamosos = [
    { nome: 'J. K. Rowling', foto: 'https://i.ibb.co/HL9bR6FK/jk.jpg', termo: 'J. K. Rowling' },
    { nome: 'Stephen King', foto: 'https://i.ibb.co/v6h7nfyj/king.jpg', termo: 'Stephen King' },
    { nome: 'Machado de Assis', foto: 'https://i.ibb.co/ZzNKcHqM/machado.jpg', termo: 'Machado de Assis' },
    { nome: 'Agatha Christie', foto: 'https://i.ibb.co/DddHJbR/agatha.jpg', termo: 'Agatha Christie' },
    { nome: 'Tolkien', foto: 'https://i.ibb.co/5WRhM4Bk/tolkien.webp', termo: 'Tolkien' },
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
      this.catalogoService.limparCache();

      // 1) Carrega o topo (categorias, recomendações, mais adicionados)
      this.carregarDadosIniciais();

      // 2) Carrega a primeira página de livros
      this.carregarPagina(1);
    }
  }

  // ========== DADOS DO TOPO (CATEGORIAS, RECOMENDADOS, ETC) ==========
  private carregarDadosIniciais(): void {
    this.catalogoService.getBibliotecaInicial().subscribe({
      next: (result) => {
        this.maisAdicionados = result.maisAdicionados || [];
        this.generosPreferidos = result.generosPreferidos || [];
        this.primeiroAcesso = result.primeiroAcesso || false;
        this.recomendados = result.recomendados || [];

        this.processarCategorias(this.CATEGORIAS_PRINCIPAIS);
        this.generosDisponiveis = this.CATEGORIAS_PRINCIPAIS;

        if (this.primeiroAcesso) {
          setTimeout(() => {
            this.mostrarModalPreferencias = true;
            this.cdr.markForCheck();
          }, 500);
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar dados iniciais:', err);
        this.processarCategorias([]);
        this.generosDisponiveis = this.CATEGORIAS_PRINCIPAIS;
      }
    });
  }

  // ========== PAGINAÇÃO ==========
  carregarPagina(pagina: number): void {
    if (this.carregandoMais) return;

    if (pagina === 1) {
      this.carregando = true;
    } else {
      this.carregandoMais = true;
    }

    const busca = this.termoBusca?.trim() || '';
    const genero = this.generoSelecionado || '';

    this.catalogoService.getPaginado(pagina, this.tamanhoPagina, busca, genero).subscribe({
      next: (res) => {
        const itens = res.itens || [];

        if (pagina === 1) {
          this.livros = itens;
        } else {
          this.livros = [...this.livros, ...itens];
        }

        this.paginaAtual = res.pagina;
        this.totalPaginas = res.totalPaginas;
        this.totalLivros = res.total;

        this.carregando = false;
        this.carregandoMais = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar página:', err);
        this.alertService.error('Erro ao carregar o catálogo');
        this.carregando = false;
        this.carregandoMais = false;
        this.cdr.markForCheck();
      }
    });
  }

  onScroll(event: any): void {
    const el = event.target as HTMLElement;
    const chegouNoFim = el.scrollHeight - el.scrollTop - el.clientHeight < 300;

    if (chegouNoFim && !this.carregandoMais && this.paginaAtual < this.totalPaginas) {
      this.carregarPagina(this.paginaAtual + 1);
    }
  }

  // ========== BUSCA (COM DEBOUNCE) ==========
  filtrarLocal(): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.carregarPagina(1);
    }, 500);
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.carregarPagina(1);
  }

  // ========== FILTROS DE GÊNERO ==========
  filtrarPorGenero(genero: string): void {
    this.generoSelecionado = this.generoSelecionado === genero ? null : genero;
    this.termoBusca = '';
    this.carregarPagina(1);
  }

  limparFiltroGenero(): void {
    this.generoSelecionado = null;
    this.carregarPagina(1);
  }

  filtrarPorAutor(termo: string): void {
    const nomeAutor = this.autoresFamosos.find(a => a.termo === termo)?.nome || termo;
    this.generoSelecionado = null;
    this.termoBusca = nomeAutor;
    this.carregarPagina(1);
    this.cdr.markForCheck();
  }

  // ========== CATEGORIAS ==========
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

  private traduzirCategoria(genero: string): string {
    const traducoes: Record<string, string> = {
      'Fantasy': 'Fantasia', 'Fiction': 'Ficção', 'Science Fiction': 'Ficção Científica',
      'Romance': 'Romance', 'Thriller': 'Suspense', 'Mystery': 'Mistério',
      'Horror': 'Terror', 'Biography': 'Biografia', 'History': 'História',
      'Science': 'Ciência', 'Poetry': 'Poesia', 'Philosophy': 'Filosofia',
      'Psychology': 'Psicologia', 'Business': 'Negócios', 'Cooking': 'Culinária',
      'Art': 'Arte', 'Travel': 'Viagem', 'Comics': 'Quadrinhos', 'Manga': 'Mangá',
      'Children': 'Infantil', 'Young Adult': 'Jovem', 'Self Help': 'Autoajuda',
      'Religion': 'Religião', 'Sports': 'Esportes', 'Music': 'Música',
    };
    return traducoes[genero] || genero;
  }

  get todasCategoriasVisiveis(): string[] {
    if (this.mostrarTodasCategorias) {
      return [...this.categoriasPrincipais, ...this.categoriasExtras];
    }
    return this.categoriasPrincipais;
  }

  toggleTodasCategorias(): void {
    this.mostrarTodasCategorias = !this.mostrarTodasCategorias;
  }

  getIconeGenero(genero: string): string {
    const g = genero.toLowerCase();
    if (g.includes('fantasia')) return 'fantasy';
    if (g.includes('ficção científica') || g.includes('ficcao cientifica')) return 'scifi';
    if (g.includes('ficção') || g.includes('ficcao')) return 'fiction';
    if (g.includes('romance')) return 'romance';
    if (g.includes('suspense')) return 'thriller';
    if (g.includes('mistério') || g.includes('misterio')) return 'mystery';
    if (g.includes('terror')) return 'horror';
    if (g.includes('biografia')) return 'biography';
    if (g.includes('história') || g.includes('historia')) return 'history';
    if (g.includes('ciência') || g.includes('ciencia')) return 'science';
    if (g.includes('poesia')) return 'poetry';
    if (g.includes('filosofia')) return 'philosophy';
    if (g.includes('psicologia')) return 'psychology';
    if (g.includes('negócios') || g.includes('negocios')) return 'business';
    if (g.includes('culinária') || g.includes('culinaria')) return 'cooking';
    if (g.includes('arte')) return 'art';
    if (g.includes('viagem')) return 'travel';
    if (g.includes('quadrinhos')) return 'comics';
    if (g.includes('mangá') || g.includes('manga')) return 'manga';
    if (g.includes('infantil')) return 'children';
    if (g.includes('jovem')) return 'young';
    if (g.includes('autoajuda')) return 'selfhelp';
    if (g.includes('religião') || g.includes('religiao')) return 'religion';
    if (g.includes('esportes')) return 'sports';
    if (g.includes('música') || g.includes('musica')) return 'music';
    return 'default';
  }

  // ========== AÇÕES ==========
  abrirModal(): void {
    this.modalAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.modalAberto = false;
    this.alertService.success('Livro adicionado ao catálogo!');
    this.carregarPagina(1);
    this.carregarDadosIniciais();
  }

  abrirDetalhesLivro(livro: CatalogoLivro): void {
    this.router.navigate(['/inicio/livro', livro.id], {
      state: { livro: livro, editavel: false, origem: 'biblioteca' }
    });
  }

  // ========== PREFERÊNCIAS ==========
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
      next: (result: any) => {
        this.salvandoPreferencias = false;
        this.mostrarModalPreferencias = false;
        this.generosPreferidos = [...this.generosSelecionados];
        this.primeiroAcesso = false;

        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        usuario.generosPreferidos = [...this.generosSelecionados];
        localStorage.setItem('usuario', JSON.stringify(usuario));

        this.catalogoService.limparCache();
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

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    usuario.pulouPreferencias = true;
    localStorage.setItem('usuario', JSON.stringify(usuario));

    this.cdr.markForCheck();
  }
}
