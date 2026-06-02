import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Livro, LivroLeitura, LivroTop, DashboardData } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AddBookModalComponent], // ← Apenas isso
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

  get saudacao(): string {
    if (typeof localStorage === 'undefined') return 'Olá, Leitor 👋';
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nickname = usuario?.nickname;
    return nickname ? `Olá, ${nickname} 👋` : 'Olá, Leitor 👋';
  }

  carregarDashboard(): void {
    this.carregando = true;

    this.homeService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.listaLeitura = data.listaLeitura || [];
        this.topAvaliados = data.topAvaliados || [];
        this.carregarLivrosDoUsuario();
      },
      error: (err: any) => {
        console.error('Erro ao carregar dashboard:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar dados da home');
      }
    });
  }

  carregarLivrosDoUsuario(): void {
    this.homeService.getMeusLivros().subscribe({
      next: (livros: Livro[]) => {
        this.livroAtual = livros.find(l => l.status === 2) || null;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Erro ao carregar livros:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar seus livros');
      }
    });
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
}
