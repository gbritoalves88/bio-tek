import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, AdminDashboard, AdminComentario, AdminUsuario } from './admin.service';
import { AlertService } from '../../shared/services/alert.service';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  menuAberto = true;
  abaAtiva: 'dashboard' | 'comentarios' | 'usuarios' = 'dashboard';

  dashboard: AdminDashboard | null = null;
  comentarios: AdminComentario[] = [];
  usuarios: AdminUsuario[] = [];
  carregando = false;
  filtroComentario = '';
  filtroFlagged: boolean | null = null;
  filtroUsuario = '';
  filtroStatus: boolean | null = null;
  paginaComentarios = 1;
  totalPaginasComentarios = 1;
  totalComentarios = 0;
  paginaUsuarios = 1;
  totalPaginasUsuarios = 1;
  totalUsuarios = 0;

  constructor(
    private adminService: AdminService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const aba = params['aba'] as string;
      if (aba && ['dashboard', 'comentarios', 'usuarios'].includes(aba)) {
        this.abaAtiva = aba as any;
        this.selecionarAba(this.abaAtiva);
      } else {
        this.carregarDashboard();
      }
    });
  }

  toggleMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  selecionarAba(aba: 'dashboard' | 'comentarios' | 'usuarios'): void {
    this.abaAtiva = aba;
    switch (aba) {
      case 'dashboard': this.carregarDashboard(); break;
      case 'comentarios': this.carregarComentarios(); break;
      case 'usuarios': this.carregarUsuarios(); break;
    }
  }

  carregarDashboard(): void {
    this.carregando = true;
    this.adminService.getDashboard().subscribe({
      next: (d) => { this.dashboard = d; this.carregando = false; },
      error: () => { this.carregando = false; this.alertService.error('Erro ao carregar dashboard'); }
    });
  }

  carregarComentarios(pagina: number = 1): void {
    this.carregando = true;
    this.paginaComentarios = pagina;
    this.adminService.getComentarios(pagina).subscribe({
      next: (res) => {
        this.comentarios = res.dados;
        this.totalComentarios = res.total;
        this.totalPaginasComentarios = res.totalPaginas;
        this.carregando = false;
      },
      error: () => this.carregando = false
    });
  }

  carregarUsuarios(pagina: number = 1): void {
    this.carregando = true;
    this.paginaUsuarios = pagina;
    this.adminService.getUsuarios(pagina).subscribe({
      next: (res) => {
        this.usuarios = res.dados;
        this.totalUsuarios = res.total;
        this.totalPaginasUsuarios = res.totalPaginas;
        this.carregando = false;
      },
      error: () => this.carregando = false
    });
  }

  deletarComentario(id: string, texto: string): void {
    if (confirm(`Excluir este comentário?\n\n"${texto.substring(0, 100)}"`)) {
      this.adminService.deletarComentario(id).subscribe({
        next: () => {
          this.comentarios = this.comentarios.filter(c => c.id !== id);
          this.alertService.success('Comentário excluído!');
        },
        error: () => this.alertService.error('Erro ao excluir')
      });
    }
  }

  aprovarComentario(id: string): void {
    this.adminService.aprovarComentario(id).subscribe({
      next: () => {
        const c = this.comentarios.find(x => x.id === id);
        if (c) { c.flagged = false; c.toxicidadeScore = null; }
        this.alertService.success('Comentário aprovado!');
      },
      error: () => this.alertService.error('Erro ao aprovar')
    });
  }

  toggleAtivo(usuario: AdminUsuario): void {
    const acao = usuario.ativo ? 'desativar' : 'ativar';
    if (confirm(`Tem certeza que deseja ${acao} ${usuario.nome}?`)) {
      this.adminService.toggleAtivo(usuario.id).subscribe({
        next: () => {
          usuario.ativo = !usuario.ativo;
          this.alertService.success(`Usuário ${usuario.ativo ? 'ativado' : 'desativado'}!`);
        },
        error: () => this.alertService.error('Erro ao alterar status')
      });
    }
  }

  excluirConta(usuario: AdminUsuario): void {
    if (confirm(`⚠️ EXCLUIR permanentemente ${usuario.nome} (${usuario.email})?\n\nEsta ação é irreversível!`)) {
      this.adminService.excluirConta(usuario.id).subscribe({
        next: () => {
          this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
          this.alertService.success('Conta excluída!');
        },
        error: () => this.alertService.error('Erro ao excluir conta')
      });
    }
  }

  voltar(): void {
    this.router.navigate(['/inicio']);
  }

  get comentariosFiltrados(): AdminComentario[] {
    return this.comentarios.filter(c => {
      const matchTexto = !this.filtroComentario ||
        c.comentario.toLowerCase().includes(this.filtroComentario.toLowerCase()) ||
        (c.usuario?.nickname || '').toLowerCase().includes(this.filtroComentario.toLowerCase()) ||
        (c.usuario?.nome || '').toLowerCase().includes(this.filtroComentario.toLowerCase());

      const matchFlag = this.filtroFlagged === null || c.flagged === this.filtroFlagged;

      return matchTexto && matchFlag;
    });
  }

  get usuariosFiltrados(): AdminUsuario[] {
    return this.usuarios.filter(u => {
      const matchTexto = !this.filtroUsuario ||
        u.nome.toLowerCase().includes(this.filtroUsuario.toLowerCase()) ||
        (u.nickname || '').toLowerCase().includes(this.filtroUsuario.toLowerCase()) ||
        u.email.toLowerCase().includes(this.filtroUsuario.toLowerCase());

      const matchStatus = this.filtroStatus === null || u.ativo === this.filtroStatus;

      return matchTexto && matchStatus;
    });
  }
}
