import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial, LivroSocial } from './social.model';
import { ComentariosModalComponent } from '../../shared/comentarios-modal/comentarios-modal.component';
import { Router } from '@angular/router';
import { AlertService } from '../../shared/services/alert.service';
import { FormsModule } from '@angular/forms'; // ⬅️ ADICIONAR

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule, ComentariosModalComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class SocialComponent implements OnInit {
  seguindo: UsuarioSocial[] = [];
   usuariosFiltrados: UsuarioSocial[] = [];
   termoBusca = ''; // ⬅️ NOVO
  carregando = true;
  perfilSelecionado: UsuarioSocial | null = null;
  livrosUsuario: LivroSocial[] = [];
  carregandoPerfil = false;
  comentariosAberto = false;
  livroComentarioId = '';
  livroComentarioTitulo = '';
  livroComentarioProntos: any[] | null = null;

  // Modo administrador
  isAdmin = false;

  // Propriedades para modal de confirmação
  confirmarExclusao = false;
  usuarioParaDeixarSeguir: string | null = null;
  nomeUsuarioParaDeixarSeguir = '';

  constructor(
    private socialService: SocialService,
    private alertService: AlertService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

ngOnInit(): void {
  if (isPlatformBrowser(this.platformId)) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    // ⬅️ USAR "Adm" com A maiúsculo, ou verificar ambos
    this.isAdmin = usuario.Adm === true || usuario.adm === true;
    console.log('👑 É admin?', this.isAdmin);
    this.carregarUsuarios();
  }
}

 carregarUsuarios(): void {
  this.carregando = true;

  if (this.isAdmin) {
    this.socialService.getTodosUsuarios().subscribe({
      next: (usuarios) => {
        this.seguindo = usuarios;
        this.usuariosFiltrados = [...usuarios]; // ⬅️ ATUALIZAR A LISTA FILTRADA
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar usuários');
      }
    });
  } else {
    this.socialService.getSeguindoCompleto().subscribe({
      next: (usuarios) => {
        this.seguindo = usuarios;
        this.usuariosFiltrados = [...usuarios]; // ⬅️ ATUALIZAR A LISTA FILTRADA
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar seguidores');
      }
    });
  }
}

  verPerfil(usuario: UsuarioSocial): void {
    this.carregandoPerfil = true;

    this.socialService.getPerfilCompleto(usuario.id).subscribe({
      next: (data) => {
        this.perfilSelecionado = {
          id: data.id,
          nome: data.nome,
          nickname: data.nickname,
          avatar: data.avatar,
          descricao: data.descricao,
          quantidadeLivros: data.quantidadeLivros,
          quantidadeLivrosLidos: data.quantidadeLivrosLidos,
          mediaAvaliacoes: data.mediaAvaliacoes
        };

        this.livrosUsuario = data.livros.map((l: any) => ({
          id: l.id,
          titulo: l.titulo,
          autor: l.autor,
          imagem: l.imagem,
          status: l.status,
          dataCriacao: l.dataCriacao,
          estrelas: l.avaliacao?.nota,
          comentarios: l.comentarios
        }));

        this.carregandoPerfil = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.perfilSelecionado = usuario;
        this.carregandoPerfil = false;
        this.alertService.error('Erro ao carregar perfil do usuário');
        this.cdr.markForCheck();
      }
    });
  }

  fecharPerfil(): void {
    this.perfilSelecionado = null;
    this.livrosUsuario = [];
  }

    filtrarUsuarios(): void {
    if (!this.termoBusca.trim()) {
      this.usuariosFiltrados = [...this.seguindo];
      return;
    }

    const termo = this.termoBusca.toLowerCase();
    this.usuariosFiltrados = this.seguindo.filter(usuario =>
      usuario.nome?.toLowerCase().includes(termo) ||
      usuario.nickname?.toLowerCase().includes(termo)
    );
  }

   limparBusca(): void {
    this.termoBusca = '';
    this.usuariosFiltrados = [...this.seguindo];
  }


  irParaPerfil(id: string): void {
    this.router.navigate(['/inicio/perfil', id]);
  }

  abrirComentarios(livro: any): void {
    this.livroComentarioId = livro.id;
    this.livroComentarioTitulo = livro.titulo;

    this.livroComentarioProntos = livro.comentarios?.map((c: any) => ({
      id: c.id,
      idUsuario: '',
      usuarioNickname: c.usuario?.nickname || '@user',
      comentario: c.comentario,
      dataCriacao: c.dataCriacao
    })) || null;

    this.comentariosAberto = true;
  }

  getStatusTexto(status: number): string {
    switch (status) {
      case 2: return '📖 Lendo';
      case 3: return '✅ Lido';
      default: return '📕 Quero ler';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 2: return 'lendo';
      case 3: return 'lido';
      default: return 'quero-ler';
    }
  }

  abrirConfirmacaoDeixarSeguir(idUsuario: string, nomeUsuario: string): void {
    this.usuarioParaDeixarSeguir = idUsuario;
    this.nomeUsuarioParaDeixarSeguir = nomeUsuario;
    this.confirmarExclusao = true;
  }

  fecharConfirmacao(): void {
    this.confirmarExclusao = false;
    this.usuarioParaDeixarSeguir = null;
    this.nomeUsuarioParaDeixarSeguir = '';
  }

  confirmarDeixarSeguir(): void {
    if (this.usuarioParaDeixarSeguir) {
      this.socialService.deixarDeSeguir(this.usuarioParaDeixarSeguir).subscribe({
        next: () => {
          this.socialService.limparCacheSeguindo();
          this.carregarUsuarios();
          this.alertService.success(`Você deixou de seguir ${this.nomeUsuarioParaDeixarSeguir}`);
          this.fecharConfirmacao();
        },
        error: (err) => {
          console.error('Erro:', err);
          this.alertService.error('Erro ao deixar de seguir');
          this.fecharConfirmacao();
        }
      });
    }
  }
}
