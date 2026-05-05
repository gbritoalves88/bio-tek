import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Livro } from './home.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  // Livro atual
  livroAtual: Livro = {
    id: 1,
    titulo: 'O Nome do Vento',
    autor: 'Patrick Rothfuss',
    capa: 'assets/capas/nome-do-vento.jpg',
    progresso: 35,
    capituloAtual: 12,
    totalCapitulos: 34
  };

   citacao = {
    texto: 'Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.',
    autor: 'George R. R. Martin'
  };


  // Recomendados
  recomendados: Livro[] = [
    {
      id: 2,
      titulo: 'Duna',
      autor: 'Frank Herbert',
      capa: 'assets/capas/duna.jpg',
      estrelas: 4.8
    },
    {
      id: 3,
      titulo: '1984',
      autor: 'George Orwell',
      capa: 'assets/capas/1984.jpg',
      estrelas: 4.7
    },
    {
      id: 4,
      titulo: 'Mindset',
      autor: 'Carol Dweck',
      capa: 'assets/capas/mindset.jpg',
      estrelas: 4.6
    }
  ];

  // Últimos adicionados
  ultimosAdicionados: Livro[] = [
    {
      id: 5,
      titulo: 'Berserk Vol. 1',
      autor: 'Kentaro Miura',
      capa: 'assets/capas/berserk.jpg'
    },
    {
      id: 6,
      titulo: 'Duna',
      autor: 'Frank Herbert',
      capa: 'assets/capas/duna.jpg'
    },
    {
      id: 7,
      titulo: 'Hábitos Atômicos',
      autor: 'James Clear',
      capa: 'assets/capas/habitos-atomicos.jpg'
    }
  ];
}
