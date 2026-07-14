import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Livro, LivroLeitura, LivroTop, DashboardData } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AddBookModalComponent, BottomSheetComponent,FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class HomeComponent implements OnInit {
  modalAberto = false;
  livroAtual: Livro | null = null;
  listaLeitura: LivroLeitura[] = [];
  topAvaliados: LivroTop[] = [];
  carregando = true;
  bottomSheetAberto = false;
  livroSelecionado: LivroTop | LivroLeitura | null = null;
  lendoAgoraAberto = false;
  paginaAtual: number | null = null;
  totalPaginas: number | null = null;

  citacao = {
    texto: 'Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.',
    autor: 'George R. R. Martin'
  };

  constructor(
    private homeService: HomeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarDashboard();
    }
  }


  get nickname(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario?.nickname || '';
  }

  carregarDashboard(): void {
    this.carregando = true;

    this.homeService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.livroAtual = data.livroAtual || null;
        this.listaLeitura = data.listaLeitura || [];
        // 🆕 Embaralha os top avaliados
        this.topAvaliados = this.embaralhar(data.topAvaliados || []);
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar dashboard:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar dados da home');
      }
    });
  }

  // 🆕 Método Fisher-Yates shuffle
  private embaralhar<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  abrirModal(): void {
    this.modalAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.homeService.limparCache();
    this.modalAberto = false;
    this.carregarDashboard();
    this.alertService.success('Livro adicionado com sucesso!');
  }


  abrirBottomSheet(livro: LivroTop | LivroLeitura): void {
    this.livroSelecionado = livro;
    this.bottomSheetAberto = true;
    this.cdr.markForCheck();
  }

  fecharBottomSheet(): void {
    this.bottomSheetAberto = false;
    this.livroSelecionado = null;
    this.cdr.markForCheck();
  }

  adicionarABiblioteca(livro: any): void {
    this.fecharBottomSheet();

    this.homeService.adicionarLivro({
      titulo: livro.titulo,
      autor: livro.autor,
      imagem: livro.imagem || null
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.alertService.success(`"${livro.titulo}" adicionado à sua biblioteca!`);
      },
      error: (err) => {
        console.error('Erro ao adicionar:', err);
        this.alertService.error('Erro ao adicionar livro');
      }
    });
  }

  verDetalhes(livro: any): void {
    // Opção 1: Abrir no Google Books
    const query = encodeURIComponent(`${livro.titulo} ${livro.autor}`);
    window.open(`https://www.google.com/search?q=${query}+livro`, '_blank');
    this.fecharBottomSheet();

    // Opção 2: Se tiver rota de detalhes
    // this.router.navigate(['/livro', livro.id]);
    // this.fecharBottomSheet();
  }


  private copiarTexto(texto: string): void {
    navigator.clipboard.writeText(texto).then(() => {
      this.alertService.success('Link copiado!');
    }).catch(() => {
      this.alertService.info(texto);
    });
  }

  abrirLendoAgora(): void {
    this.lendoAgoraAberto = true;
    this.paginaAtual = this.livroAtual?.paginaAtual || null;
    this.totalPaginas = this.livroAtual?.totalPaginas || null;
    this.cdr.markForCheck();
  }

  fecharLendoAgora(): void {
    this.lendoAgoraAberto = false;
    this.cdr.markForCheck();
  }

  atualizarProgresso(): void {
    if (!this.livroAtual) return;

    const progresso = this.totalPaginas && this.paginaAtual
      ? Math.round((this.paginaAtual / this.totalPaginas) * 100)
      : undefined;

    this.homeService.atualizarProgresso(this.livroAtual.id, {
      paginaAtual: this.paginaAtual ?? undefined,
      totalPaginas: this.totalPaginas ?? undefined,
      progresso
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        //this.fecharLendoAgora();
        this.alertService.success('Progresso atualizado!');
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao atualizar progresso');
      }
    });
  }

  togglePausar(): void {
    if (!this.livroAtual) return;

    const novoEstado = !this.livroAtual.pausado;  // 🔄 inverte

    this.homeService.atualizarProgresso(this.livroAtual.id, {
      pausado: novoEstado
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        //this.fecharLendoAgora();
        this.alertService.success(novoEstado ? 'Leitura pausada!' : 'Leitura retomada!');
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao atualizar');
      }
    });
  }
}
