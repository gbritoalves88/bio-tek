import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Livro } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, AddBookModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class HomeComponent implements OnInit {
  modalAberto = false;

  livroAtual: Livro | null = null;
  recomendados: Livro[] = [];
  ultimosAdicionados: Livro[] = [];

  citacao = {
    texto: 'Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.',
    autor: 'George R. R. Martin'
  };

  constructor(
    private homeService: HomeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef  // ⬅️ ADICIONE
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarLivros();
    }
  }

  carregarLivros(): void {
    this.homeService.getMeusLivros().subscribe({
      next: (livros) => {
        const ordenados = livros.sort((a, b) =>
          new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime()
        );

        this.livroAtual = ordenados.find(l => l.status === 2) || null;

        this.recomendados = ordenados
          .filter(l => l.status === 3)
          .slice(0, 3)
          .map(l => ({ ...l, estrelas: 4.5 }));

        this.ultimosAdicionados = ordenados.slice(0, 3);

        this.cdr.markForCheck();  // ⬅️ Força atualização
      },
      error: (err) => console.error('Erro ao carregar livros:', err)
    });
  }

  abrirModal(): void {
    this.modalAberto = true;
  }

  onLivroAdicionado(livro: any): void {
    this.modalAberto = false;
    this.carregarLivros();
    this.cdr.markForCheck();  // ⬅️ Força atualização
  }
}
