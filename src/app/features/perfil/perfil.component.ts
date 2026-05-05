import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent {
  constructor(private router: Router) {}

  usuario = {
    nome: 'Leitor Apaixonado',
    avatar: 'https://i.pravatar.cc/300?img=12',
    bio: 'Apaixonado por livros e por aprender coisas novas todos os dias.',
    livrosLidos: 12,
    horasLidas: 125,
    avaliacaoMedia: 4.6
  };

  sair() {
    this.router.navigate(['/']);
  }
}
