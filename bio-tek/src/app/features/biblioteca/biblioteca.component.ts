import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ⬅️ Adicione esta linha

interface Livro {
  id: number;
  titulo: string;
  autor: string;
  capa: string;
  status: 'lendo' | 'nao-lido' | 'lido';
  progresso?: number;
  estrelas?: number;
}

@Component({
  selector: 'app-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule], // ⬅️ Adicione FormsModule aqui
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss'
})
export class BibliotecaComponent {
  termoBusca = '';

  livros: Livro[] = [
    {
      id: 1,
      titulo: 'O Nome do Vento',
      autor: 'Patrick Rothfuss',
      capa: 'assets/capas/nome-do-vento.jpg',
      status: 'lendo',
      progresso: 35
    },
    {
      id: 2,
      titulo: 'Duna',
      autor: 'Frank Herbert',
      capa: 'assets/capas/duna.jpg',
      status: 'nao-lido'
    },
    {
      id: 3,
      titulo: '1984',
      autor: 'George Orwell',
      capa: 'assets/capas/1984.jpg',
      status: 'lido',
      estrelas: 4.7
    },
    {
      id: 4,
      titulo: 'Mindset',
      autor: 'Carol Dweck',
      capa: 'assets/capas/mindset.jpg',
      status: 'nao-lido'
    },
    {
      id: 5,
      titulo: 'Berserk Vol. 1',
      autor: 'Kentaro Miura',
      capa: 'assets/capas/berserk.jpg',
      status: 'lido',
      estrelas: 4.9
    },
    {
      id: 6,
      titulo: 'Hábitos Atômicos',
      autor: 'James Clear',
      capa: 'assets/capas/habitos-atomicos.jpg',
      status: 'nao-lido'
    }
  ];

  get livrosFiltrados(): Livro[] {
    if (!this.termoBusca.trim()) return this.livros;
    const termo = this.termoBusca.toLowerCase();
    return this.livros.filter(
      livro =>
        livro.titulo.toLowerCase().includes(termo) ||
        livro.autor.toLowerCase().includes(termo)
    );
  }
}
