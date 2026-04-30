import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Recomendacao {
  id: number;
  usuario: string;
  avatar: string;
  livro: string;
  autor: string;
  capa: string;
  estrelas: number;
  comentario?: string;
}

@Component({
  selector: 'app-comunidade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comunidade.component.html',
  styleUrl: './comunidade.component.scss'
})
export class ComunidadeComponent {
  recomendacoes: Recomendacao[] = [
    {
      id: 1,
      usuario: 'Mariana Santos',
      avatar: 'https://i.pravatar.cc/150?img=1',
      livro: 'Duna',
      autor: 'Frank Herbert',
      capa: 'assets/capas/duna.jpg',
      estrelas: 4.8,
      comentario: 'Uma obra-prima da ficção científica!'
    },
    {
      id: 2,
      usuario: 'Lucas Almeida',
      avatar: 'https://i.pravatar.cc/150?img=2',
      livro: '1984',
      autor: 'George Orwell',
      capa: 'assets/capas/1984.jpg',
      estrelas: 4.7,
      comentario: 'Distópico e mais atual do que nunca.'
    },
    {
      id: 3,
      usuario: 'Juliana Pereira',
      avatar: 'https://i.pravatar.cc/150?img=3',
      livro: 'Mindset',
      autor: 'Carol Dweck',
      capa: 'assets/capas/mindset.jpg',
      estrelas: 4.6,
      comentario: 'Mudou minha forma de pensar sobre aprendizado.'
    },
    {
      id: 4,
      usuario: 'Pedro Henrique',
      avatar: 'https://i.pravatar.cc/150?img=4',
      livro: 'Hábitos Atômicos',
      autor: 'James Clear',
      capa: 'assets/capas/habitos-atomicos.jpg',
      estrelas: 4.9,
      comentario: 'Pequenas mudanças, resultados impressionantes.'
    },
    {
      id: 5,
      usuario: 'Ana Clara',
      avatar: 'https://i.pravatar.cc/150?img=5',
      livro: 'Berserk Vol. 1',
      autor: 'Kentaro Miura',
      capa: 'assets/capas/berserk.jpg',
      estrelas: 4.9,
      comentario: 'Arte incrível e história profunda.'
    },
    {
      id: 6,
      usuario: 'Rafael Costa',
      avatar: 'https://i.pravatar.cc/150?img=6',
      livro: 'O Nome do Vento',
      autor: 'Patrick Rothfuss',
      capa: 'assets/capas/nome-do-vento.jpg',
      estrelas: 4.8,
      comentario: 'Fantasia no seu mais alto nível.'
    }
  ];
}
