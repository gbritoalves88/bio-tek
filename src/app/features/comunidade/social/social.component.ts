import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SocialService } from './social.service';
import { UsuarioSocial } from './social.model';
import { Router } from '@angular/router';
import { AlertService } from '../../../shared/services/alert.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  seguirUsuario(id: string): void {
    this.socialService.seguir(id).subscribe({
      next: () => {
        this.alertService.success('Agora você segue este usuário!');
        this.carregarUsuarios();
      },
      error: (err) => {
        this.alertService.error('Erro ao seguir usuário');
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
