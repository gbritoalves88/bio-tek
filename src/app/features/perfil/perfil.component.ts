import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario } from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';

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

  private readonly TAMANHO_MAXIMO = 2 * 1024 * 1024;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService, // ⬅️ Upload compartilhado
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

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
    if (!id) { this.router.navigate(['/']); return; }

    this.perfilService.getPerfilCompleto(id).subscribe({
      next: (data) => { this.usuario = data; this.carregando = false; this.cdr.markForCheck(); },
      error: (err) => { console.error('Erro:', err); this.carregando = false; }
    });
  }

  abrirEdicao(): void {
    const nickSemArroba = this.usuario?.nickname?.replace('@', '') || '';
    this.usuarioEdit = {
      ...this.usuario,
      nickname: nickSemArroba,
      tema: this.usuario?.tema  // ⬅️ Garante que o tema seja copiado
    };
    this.uploadErro = '';
    this.editando = true;
  }

  fecharEdicao(): void { this.editando = false; this.uploadErro = ''; }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.uploadErro = 'Apenas imagens são permitidas'; return; }
    if (file.size > this.TAMANHO_MAXIMO) { this.uploadErro = `Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`; return; }
    this.uploadErro = '';

    const reader = new FileReader();
    reader.onload = () => { this.usuarioEdit.avatar = reader.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  salvarPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    const nick = (this.usuarioEdit.nickname || '').replace('@', '').trim();
    if (!nick) { this.uploadErro = 'Nickname é obrigatório'; return; }
    if (nick.length < 3) { this.uploadErro = 'Nickname deve ter no mínimo 3 caracteres'; return; }
    if (nick.length > 10) { this.uploadErro = 'Nickname deve ter no máximo 10 caracteres'; return; }

    this.usuarioEdit.nickname = '@' + nick;
    this.uploadErro = '';

    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      this.comprimirImagem(this.usuarioEdit.avatar, 400, 0.6).then(imagemComprimida => {
        this.uploadService.uploadImagem(imagemComprimida).subscribe({ // ⬅️ UploadService
          next: (url: string) => { this.usuarioEdit.avatar = url; this.salvarDados(); },
          error: () => { this.uploadErro = 'Erro ao enviar foto. Tente novamente.'; }
        });
      });
    } else {
      this.salvarDados();
    }
  }

  private salvarDados(): void {
    if (!this.usuarioEdit || !this.usuario) return;
    const dadosParaSalvar: Usuario = {
      ...this.usuario, ...this.usuarioEdit, id: this.usuario.id,
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
        this.perfilService.limparCache();
        this.usuario = { ...dadosParaSalvar };
        const usuarioLogado = { ...JSON.parse(localStorage.getItem('usuario') || '{}'), nome: dadosParaSalvar.nome, nickname: dadosParaSalvar.nickname, tema: dadosParaSalvar.tema };
        localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
        this.editando = false; this.uploadErro = ''; this.cdr.markForCheck();
      },
      error: (err) => { console.error('Erro:', err); this.uploadErro = 'Erro ao salvar. Tente novamente.'; }
    });
  }

  sair(): void
  {
     localStorage.removeItem('token'); localStorage.removeItem('usuario'); this.router.navigate(['/']);

  }

  limparArroba(): void
  {
    if (this.usuarioEdit.nickname) { this.usuarioEdit.nickname = this.usuarioEdit.nickname.replace(/@/g, ''); }
  }

  private comprimirImagem(base64: string, maxWidth: number = 400, qualidade: number = 0.7): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
    });
  }
}
