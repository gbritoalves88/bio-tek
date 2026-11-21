import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial } from './social.model';
import { Router } from '@angular/router';
import { AlertService } from '../../../shared/services/alert.service';
import { FormsModule } from '@angular/forms';
import { PullToRefreshComponent } from '../../../shared/pull-to-refresh/pull-to-refresh.component';



@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule, PullToRefreshComponent],
  templateUrl: './social.component.html',
  styleUrl: './social.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class SocialComponent implements OnInit {
  seguindo: UsuarioSocial[] = [];
  usuariosFiltrados: UsuarioSocial[] = [];
  termoBusca = '';
  carregando = true;
  buscarUsuariosExternos: UsuarioSocial[] = [];
  buscando = false;
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
      this.carregarUsuarios();
    }
  }

  carregarUsuarios(): void {
    this.carregando = true;
    this.socialService.getSeguindoCompleto().subscribe({
      next: (usuarios) => {
        this.seguindo = usuarios;
        this.usuariosFiltrados = [...usuarios];
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

  seguirUsuario(id: string, usuarioObj?: UsuarioSocial): void {
    // 1. OPTIMISTIC UI: Se tiver o objeto do usuário, adiciona na lista na hora!
    if (usuarioObj) {
      this.seguindo = [...this.seguindo, usuarioObj];
      this.usuariosFiltrados = [...this.seguindo];

      // Remove da lista de busca externa (se estiver buscando)
      this.buscarUsuariosExternos = this.buscarUsuariosExternos.filter(u => u.id !== id);
      this.cdr.detectChanges(); // Renderiza na hora
    }

    // 2. Faz a chamada HTTP em background
    this.socialService.seguir(id).subscribe({
      next: () => {
        this.alertService.success('Agora você segue este usuário!');
        // Limpa o cache para a próxima vez que o app for aberto
        this.socialService.limparCacheSeguindo();

        // NÃO chama this.carregarUsuarios() aqui! A tela já foi atualizada.
      },
      error: (err) => {
        // 3. Se der erro, desfaz a atualização
        this.alertService.error('Erro ao seguir usuário');
        if (usuarioObj) {
          this.seguindo = this.seguindo.filter(u => u.id !== id);
          this.usuariosFiltrados = [...this.seguindo];
          this.buscarUsuariosExternos = [...this.buscarUsuariosExternos, usuarioObj];
        } else {
          this.carregarUsuarios(); // Se não tinha o obj, puxa do banco de novo
        }
        this.cdr.markForCheck();
      }
    });
  }

  filtrarUsuarios(): void {
    const termo = this.termoBusca?.trim();

    if (!termo) {
      this.usuariosFiltrados = [...this.seguindo];
      this.buscarUsuariosExternos = [];
      return;
    }

    const termoLower = termo.toLowerCase();
    this.usuariosFiltrados = this.seguindo.filter(usuario =>
      usuario.nome?.toLowerCase().includes(termoLower) ||
      usuario.nickname?.toLowerCase().includes(termoLower)
    );

    if (termo.length >= 2) {
      this.buscando = true;
      this.socialService.buscarUsuarios(termo).subscribe({
        next: (usuarios) => {
          const idsSeguidos = new Set(this.seguindo.map(u => u.id));
          this.buscarUsuariosExternos = usuarios.filter(u => !idsSeguidos.has(u.id));
          this.buscando = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.buscarUsuariosExternos = [];
          this.buscando = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.buscarUsuariosExternos = [];
    }
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.usuariosFiltrados = [...this.seguindo];
  }

  irParaPerfil(id: string): void {
    this.router.navigate(['/inicio/perfil', id]);
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
    if (!this.usuarioParaDeixarSeguir) return;

    const id = this.usuarioParaDeixarSeguir;
    const nome = this.nomeUsuarioParaDeixarSeguir;

    // 1. Guarda o usuário que vai sair da lista
    const usuarioRemovido = this.seguindo.find(u => u.id === id);

    // 2. OPTIMISTIC UI: Remove da tela na hora!
    this.seguindo = this.seguindo.filter(u => u.id !== id);
    this.usuariosFiltrados = this.usuariosFiltrados.filter(u => u.id !== id);
    this.fecharConfirmacao();
    this.cdr.detectChanges();

    // 3. Chama a API em background
    this.socialService.deixarDeSeguir(id).subscribe({
      next: () => {
        this.alertService.success(`Você deixou de seguir ${nome}`);
        this.socialService.limparCacheSeguindo();
      },
      error: (err) => {
        // 4. Se der erro, devolve o usuário para a lista
        this.alertService.error('Erro ao deixar de seguir');
        if (usuarioRemovido) {
          this.seguindo = [...this.seguindo, usuarioRemovido];
          this.usuariosFiltrados = [...this.seguindo];
        } else {
          this.carregarUsuarios();
        }
        this.cdr.markForCheck();
      }
    });
  }
}
