import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario } from './perfil.model';
import { PerfilService } from './perfil.service';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

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
  private httpSemAuth: HttpClient;

  constructor(
    private perfilService: PerfilService,
    private router: Router,
    private route: ActivatedRoute,
    httpBackend: HttpBackend,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.httpSemAuth = new HttpClient(httpBackend);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.carregarPerfil();
    }

    this.route.queryParams.subscribe(params => {
      if (params['novo'] === 'true') {
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

    this.perfilService.getPerfilCompleto(id).subscribe({
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
    // Remove @ para edição
    const nickSemArroba = this.usuario?.nickname?.replace('@', '') || '';
    this.usuarioEdit = { ...this.usuario, nickname: nickSemArroba };
    this.uploadErro = '';
    this.editando = true;
  }

  fecharEdicao(): void {
    this.editando = false;
    this.uploadErro = '';
  }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.uploadErro = 'Apenas imagens são permitidas';
      return;
    }

    if (file.size > this.TAMANHO_MAXIMO) {
      this.uploadErro = `Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`;
      return;
    }

    this.uploadErro = '';

    const reader = new FileReader();
    reader.onload = () => {
      this.usuarioEdit.avatar = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  private uploadAvatar(base64: string): any {
    const imagemLimpa = base64.split(',')[1];
    const body = new URLSearchParams();
    body.set('image', imagemLimpa);

    const url = `${environment.imgbbUrl}?key=${environment.imgbbApiKey}`;

    return this.httpSemAuth.post<any>(url, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map((response: any) => response.data.url)
    );
  }

  salvarPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    // Validar nickname
    const nick = (this.usuarioEdit.nickname || '').replace('@', '').trim();

    if (!nick) {
      this.uploadErro = 'Nickname é obrigatório';
      return;
    }
    if (nick.length < 3) {
      this.uploadErro = 'Nickname deve ter no mínimo 3 caracteres';
      return;
    }
    if (nick.length > 10) {
      this.uploadErro = 'Nickname deve ter no máximo 10 caracteres';
      return;
    }

    this.usuarioEdit.nickname = '@' + nick;
    this.uploadErro = '';

    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      this.uploadAvatar(this.usuarioEdit.avatar).subscribe({
        next: (url: string) => {
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
        nickname: dadosParaSalvar.nickname,
        tema: dadosParaSalvar.tema
      };
      localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
      this.editando = false;
      this.uploadErro = '';
      this.cdr.markForCheck();
    },
    error: (err) => {
      console.error('Erro ao salvar:', err);
      this.uploadErro = 'Erro ao salvar. Tente novamente.';
    }
  });
}

  sair(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
