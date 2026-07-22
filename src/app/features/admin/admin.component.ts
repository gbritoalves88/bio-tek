import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminService } from './admin.service';
import { AdminDashboard, AdminComentario, AdminUsuario, AdminLivro, Paginado } from './admin.model';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  abaAtiva: 'dashboard' | 'comentarios' | 'usuarios' | 'livros' = 'dashboard';

  dashboard: AdminDashboard | null = null;
  comentarios: AdminComentario[] = [];
  usuarios: AdminUsuario[] = [];
  livros: AdminLivro[] = [];
  carregando = false;

  // Usuário
  detalheUsuarioAberto = false;
  usuarioDetalhe: AdminUsuario | null = null;

  // Comentário
  detalheComentarioAberto = false;
  comentarioDetalhe: AdminComentario | null = null;

  // Livro
  detalheLivroAberto = false;
  livroDetalhe: AdminLivro | null = null;

  // Paginação
  paginaComentarios = 1; totalPaginasComentarios = 1; totalComentarios = 0;
  paginaUsuarios = 1; totalPaginasUsuarios = 1; totalUsuarios = 0;
  paginaLivros = 1; totalPaginasLivros = 1; totalLivrosCount = 0;

  // Filtros
  filtroComentario = ''; filtroFlagged: boolean | null = null;
  filtroUsuario = ''; filtroStatus: boolean | null = null;
  filtroLivro = '';
  dataInicio = ''; dataFim = ''; tooltipCard = '';

  get comentariosFiltrados(): AdminComentario[] {
    return this.comentarios.filter(c => {
      const matchTexto = !this.filtroComentario || c.comentario.toLowerCase().includes(this.filtroComentario.toLowerCase()) || (c.usuario?.nickname || '').toLowerCase().includes(this.filtroComentario.toLowerCase()) || (c.usuario?.nome || '').toLowerCase().includes(this.filtroComentario.toLowerCase());
      const matchFlag = this.filtroFlagged === null || c.flagged === this.filtroFlagged;
      return matchTexto && matchFlag;
    });
  }

  get usuariosFiltrados(): AdminUsuario[] {
    return this.usuarios.filter(u => {
      const matchTexto = !this.filtroUsuario || u.nome.toLowerCase().includes(this.filtroUsuario.toLowerCase()) || (u.nickname || '').toLowerCase().includes(this.filtroUsuario.toLowerCase()) || u.email.toLowerCase().includes(this.filtroUsuario.toLowerCase());
      const matchStatus = this.filtroStatus === null || u.ativo === this.filtroStatus;
      return matchTexto && matchStatus;
    });
  }

  get livrosFiltrados(): AdminLivro[] {
    return this.livros.filter(l => {
      const match = !this.filtroLivro || l.titulo.toLowerCase().includes(this.filtroLivro.toLowerCase()) || l.autor.toLowerCase().includes(this.filtroLivro.toLowerCase()) || (l.usuario?.nome || '').toLowerCase().includes(this.filtroLivro.toLowerCase()) || (l.usuario?.nickname || '').toLowerCase().includes(this.filtroLivro.toLowerCase());
      return match;
    });
  }

  constructor(
    private adminService: AdminService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const aba = params['aba'] as string;
      if (aba && ['dashboard', 'comentarios', 'usuarios', 'livros'].includes(aba)) {
        this.abaAtiva = aba as any;
        this.selecionarAba(this.abaAtiva);
      } else {
        this.carregarDashboard();
      }
    });
  }

  selecionarAba(aba: 'dashboard' | 'comentarios' | 'usuarios' | 'livros'): void {
    this.abaAtiva = aba;
    switch (aba) {
      case 'dashboard': this.carregarDashboard(); break;
      case 'comentarios': this.carregarComentarios(); break;
      case 'usuarios': this.carregarUsuarios(); break;
      case 'livros': this.carregarLivros(); break;
    }
  }

  carregarDashboard(): void {
    this.carregando = true;
    let params: any = {};
    if (this.dataInicio) params.dataInicio = this.dataInicio;
    if (this.dataFim) params.dataFim = this.dataFim;
    this.adminService.getDashboard(params).subscribe({
      next: (d) => { this.dashboard = d; this.carregando = false; this.cdr.markForCheck(); },
      error: () => { this.carregando = false; this.cdr.markForCheck(); }
    });
  }

  carregarComentarios(pagina: number = 1): void {
    this.carregando = true; this.paginaComentarios = pagina;
    this.adminService.getComentarios(pagina).subscribe({
      next: (res) => { this.comentarios = res.dados; this.totalComentarios = res.total; this.totalPaginasComentarios = res.totalPaginas; this.carregando = false; this.cdr.markForCheck(); },
      error: () => { this.carregando = false; this.cdr.markForCheck(); }
    });
  }

  carregarUsuarios(pagina: number = 1): void {
    this.carregando = true; this.paginaUsuarios = pagina;
    this.adminService.getUsuarios(pagina).subscribe({
      next: (res) => { this.usuarios = res.dados; this.totalUsuarios = res.total; this.totalPaginasUsuarios = res.totalPaginas; this.carregando = false; this.cdr.markForCheck(); },
      error: () => { this.carregando = false; this.cdr.markForCheck(); }
    });
  }

  carregarLivros(pagina: number = 1): void {
    this.carregando = true; this.paginaLivros = pagina;
    this.adminService.getLivros(pagina).subscribe({
      next: (res) => { this.livros = res.dados; this.totalLivrosCount = res.total; this.totalPaginasLivros = res.totalPaginas; this.carregando = false; this.cdr.markForCheck(); },
      error: () => { this.carregando = false; this.cdr.markForCheck(); }
    });
  }

  deletarComentario(id: string, texto: string): void {
    if (confirm(`Excluir este comentário?\n\n"${texto.substring(0, 100)}"`)) {
      this.adminService.deletarComentario(id).subscribe({
        next: () => { this.comentarios = this.comentarios.filter(c => c.id !== id); this.totalComentarios--; this.alertService.success('Comentário excluído!'); this.cdr.markForCheck(); },
        error: () => { this.alertService.error('Erro ao excluir'); this.cdr.markForCheck(); }
      });
    }
  }

  aprovarComentario(id: string): void {
    this.adminService.aprovarComentario(id).subscribe({
      next: () => { const c = this.comentarios.find(x => x.id === id); if (c) { c.flagged = false; c.toxicidadeScore = null; } this.alertService.success('Comentário aprovado!'); this.cdr.markForCheck(); },
      error: () => { this.alertService.error('Erro ao aprovar'); this.cdr.markForCheck(); }
    });
  }

  toggleAtivo(usuario: AdminUsuario): void {
    const acao = usuario.ativo ? 'desativar' : 'ativar';
    if (confirm(`Tem certeza que deseja ${acao} ${usuario.nome}?`)) {
      this.adminService.toggleAtivo(usuario.id).subscribe({
        next: () => { usuario.ativo = !usuario.ativo; this.alertService.success(`Usuário ${usuario.ativo ? 'ativado' : 'desativado'}!`); this.cdr.markForCheck(); },
        error: () => { this.alertService.error('Erro ao alterar status'); this.cdr.markForCheck(); }
      });
    }
  }

  excluirConta(usuario: AdminUsuario): void {
    if (confirm(`⚠️ EXCLUIR permanentemente ${usuario.nome} (${usuario.email})?\n\nEsta ação é irreversível!`)) {
      this.adminService.excluirConta(usuario.id).subscribe({
        next: () => { this.usuarios = this.usuarios.filter(u => u.id !== usuario.id); this.totalUsuarios--; this.alertService.success('Conta excluída!'); this.cdr.markForCheck(); },
        error: () => { this.alertService.error('Erro ao excluir conta'); this.cdr.markForCheck(); }
      });
    }
  }

  excluirLivro(id: string, titulo: string): void {
    if (confirm(`Excluir "${titulo}" permanentemente?`)) {
      this.adminService.excluirLivro(id).subscribe({
        next: () => { this.livros = this.livros.filter(l => l.id !== id); this.totalLivrosCount--; this.alertService.success('Livro excluído!'); this.cdr.markForCheck(); },
        error: () => { this.alertService.error('Erro ao excluir'); this.cdr.markForCheck(); }
      });
    }
  }

  abrirDetalheUsuario(usuario: AdminUsuario): void { this.usuarioDetalhe = usuario; this.detalheUsuarioAberto = true; this.cdr.markForCheck(); }
  fecharDetalheUsuario(): void { this.detalheUsuarioAberto = false; this.usuarioDetalhe = null; this.cdr.markForCheck(); }

  abrirDetalheComentario(comentario: AdminComentario): void { this.comentarioDetalhe = comentario; this.detalheComentarioAberto = true; this.cdr.markForCheck(); }
  fecharDetalheComentario(): void { this.detalheComentarioAberto = false; this.comentarioDetalhe = null; this.cdr.markForCheck(); }

  abrirDetalheLivro(livro: AdminLivro): void { this.livroDetalhe = livro; this.detalheLivroAberto = true; this.cdr.markForCheck(); }
  fecharDetalheLivro(): void { this.detalheLivroAberto = false; this.livroDetalhe = null; this.cdr.markForCheck(); }

  exportarDados(): void {
    this.adminService.exportarDados().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bliteca-relatorio-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
      this.alertService.success('Relatório exportado!');
    });
  }

  voltar(): void { this.router.navigate(['/inicio']); }
}
