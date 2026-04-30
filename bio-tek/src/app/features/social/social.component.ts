import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Pessoa {
  id: number;
  nome: string;
  arroba: string;
  avatar: string;
  seguidores: number;
}

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss'
})
export class SocialComponent {
  termoBusca = '';

  pessoas: Pessoa[] = [
    {
      id: 1,
      nome: 'Mariana Santos',
      arroba: '@marianaleitora',
      avatar: 'https://i.pravatar.cc/150?img=1',
      seguidores: 128
    },
    {
      id: 2,
      nome: 'Lucas Almeida',
      arroba: '@lucasleitor',
      avatar: 'https://i.pravatar.cc/150?img=2',
      seguidores: 97
    },
    {
      id: 3,
      nome: 'Juliana Pereira',
      arroba: '@julianalivros',
      avatar: 'https://i.pravatar.cc/150?img=3',
      seguidores: 84
    },
    {
      id: 4,
      nome: 'Pedro Henrique',
      arroba: '@pedroleitor',
      avatar: 'https://i.pravatar.cc/150?img=4',
      seguidores: 63
    },
    {
      id: 5,
      nome: 'Ana Clara',
      arroba: '@anaclara',
      avatar: 'https://i.pravatar.cc/150?img=5',
      seguidores: 156
    }
  ];

  get pessoasFiltradas(): Pessoa[] {
    if (!this.termoBusca.trim()) return this.pessoas;
    const termo = this.termoBusca.toLowerCase();
    return this.pessoas.filter(
      p =>
        p.nome.toLowerCase().includes(termo) ||
        p.arroba.toLowerCase().includes(termo)
    );
  }
}
