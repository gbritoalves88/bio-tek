import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Usuario } from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class PerfilComponent implements OnInit {
  usuario: Usuario | null = null;
  editando = false;
  usuarioEdit: Partial<Usuario> = {};
  carregando = true;
  uploadErro = '';

  private readonly TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2MB

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarPerfil();
    }

     this.route.queryParams.subscribe(params => {
      if (params['novo'] === 'true') {
        // Aguarda carregar o perfil e já abre edição
        setTimeout(() => this.abrirEdicao(), 500);
      }
    });
  }

  carregarPerfil(): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const id = usuarioLogado.id;

    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.perfilService.getPerfil(id).subscribe({
      next: (data) => {
        this.usuario = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar perfil:', err);
        this.carregando = false;
      }
    });
  }

  abrirEdicao(): void {
    this.usuarioEdit = { ...this.usuario };
    this.uploadErro = '';
    this.editando = true;
  }

  fecharEdicao(): void {
    this.editando = false;
    this.uploadErro = '';
  }

  // Upload de avatar com limite
  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Valida tipo
    if (!file.type.startsWith('image/')) {
      this.uploadErro = 'Apenas imagens são permitidas';
      return;
    }

    // Valida tamanho
    if (file.size > this.TAMANHO_MAXIMO) {
      this.uploadErro = `Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`;
      return;
    }

    this.uploadErro = '';

    // Preview local
    const reader = new FileReader();
    reader.onload = () => {
      this.usuarioEdit.avatar = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  // Upload para ImgBB e salvar
  salvarPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    // Se tem avatar em base64, faz upload primeiro
    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      this.uploadService.uploadImagem(this.usuarioEdit.avatar).subscribe({
        next: (url) => {
          this.usuarioEdit.avatar = url;
          this.salvarDados();
        },
        error: () => {
          this.uploadErro = 'Erro ao enviar foto. Tente novamente.';
        }
      });
    } else {
      this.salvarDados();
    }
  }

  private salvarDados(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    const dadosParaSalvar: Usuario = {
      ...this.usuario,
      ...this.usuarioEdit,
      id: this.usuario.id,
      nome: this.usuarioEdit.nome || this.usuario.nome,
      nickname: this.usuarioEdit.nickname || this.usuario.nickname,
      email: this.usuario.email,
      tema: this.usuarioEdit.tema ?? this.usuario.tema,
      quantidadeLivros: this.usuarioEdit.quantidadeLivros ?? this.usuario.quantidadeLivros,
      quantidadeLivrosLidos: this.usuarioEdit.quantidadeLivrosLidos ?? this.usuario.quantidadeLivrosLidos,
      mediaAvaliacoes: this.usuarioEdit.mediaAvaliacoes ?? this.usuario.mediaAvaliacoes
    };

    this.perfilService.atualizarPerfil(this.usuario.id, dadosParaSalvar).subscribe({
      next: () => {
        this.usuario = { ...dadosParaSalvar };
        const usuarioLogado = {
          ...JSON.parse(localStorage.getItem('usuario') || '{}'),
          nome: dadosParaSalvar.nome,
          nickname: dadosParaSalvar.nickname
        };
        localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
        this.editando = false;
        this.uploadErro = '';
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erro ao salvar:', err)
    });
  }

  sair(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
