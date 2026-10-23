import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Usuario} from './perfil.model';
import { PerfilService } from './perfil.service';
import { UploadService } from '../../shared/services/upload.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { AlertService } from '../../shared/services/alert.service';

import { PullToRefreshComponent } from '../../shared/pull-to-refresh/pull-to-refresh.component';
import { getAvatarUrl, getAvatarPadrao } from '../../shared/utils/avatar-helper';
import { EstanteComponent } from './estante/estante.component';
import { AtividadesComponent } from './atividade/atividade.component';
import { ProgressoComponent } from './progresso/progresso.component';
import { ShellService } from '../../layout/shell/shell.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent,  PullToRefreshComponent,
    EstanteComponent, AtividadesComponent, ProgressoComponent
  ],
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
  zoomAvatarAberto = false;
  abaAtiva: 'biblioteca' | 'atividades' | 'progresso' = 'biblioteca';
  passoOnboarding = 0;
  onboardingAtivo = false;
  posicaoHighlight = { top: 0, left: 0, width: 0, height: 0 };
  tooltipTop = 0;
  tooltipLeft = 0;
  windowHeight = 0;
  windowWidth = 0;

  generosDisponiveis = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil',
    'Aventura', 'Drama', 'Poesia', 'Ficção Científica'
  ];

  private primeiraCarga = true;

  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;
  private readonly COMPRESSAO_MAX_WIDTH = 1200;
  private readonly COMPRESSAO_QUALIDADE = 0.7;

  menuConfigAberto = false;
  modoVisualizacao = false;
  usuarioIdVisualizado: string | null = null;
  meuId = '';

  @ViewChild('inputNome') inputNome!: ElementRef;
  @ViewChild('inputNickname') inputNickname!: ElementRef;
  @ViewChild('inputBiografia') inputBiografia!: ElementRef;
  @ViewChild('selectTema') selectTema!: ElementRef;
  @ViewChild('btnSalvar') btnSalvar!: ElementRef;
  @ViewChild('avatarEdicao') avatarEdicao!: ElementRef;

  constructor(
    private perfilService: PerfilService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    public cdr: ChangeDetectorRef,
    private shellService: ShellService
  ) {}

  get nicknameEditavel(): boolean {
    const nick = this.usuario?.nickname || '';
    return !nick || nick === '@sem-nickname';
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.meuId = usuarioLogado.id || '';

      this.route.queryParams.subscribe(queryParams => {
        const forcarEdicao = queryParams['editar'] === 'true';
        const aba = queryParams['aba'];

        this.route.params.subscribe(routeParams => {
          const idVisualizado = routeParams['id'];

          if (idVisualizado) {
            this.modoVisualizacao = true;
            this.usuarioIdVisualizado = idVisualizado;
            this.carregarPerfilVisualizacao(idVisualizado);
          } else {
            this.modoVisualizacao = false;
            this.usuarioIdVisualizado = null;
            this.carregarMeuPerfil(forcarEdicao);

            if (aba === 'biblioteca' || aba === 'atividades' || aba === 'progresso') {
              setTimeout(() => {
                this.abaAtiva = aba;
              }, 10);
            }
          }
        });
      });
    }
  }

  recarregar(): void {
    if (this.modoVisualizacao && this.usuarioIdVisualizado) {
      this.carregarPerfilVisualizacao(this.usuarioIdVisualizado);
    } else {
      this.carregarMeuPerfil(false);
    }
  }

  carregarMeuPerfil(forcarEdicao: boolean = false): void {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const id = usuarioLogado.id;

    if (!id) {
      this.alertService.error('Usuário não encontrado');
      this.router.navigate(['/']);
      return;
    }

    this.carregando = true;

    this.perfilService.getPerfilCompleto(id).subscribe({
      next: (data: Usuario) => {
        this.usuario = data;
        this.carregando = false;

        this.atualizarLocalStorage(data);
        this.cdr.markForCheck();

        if ((this.primeiraCarga && this.nicknameEditavel) || forcarEdicao) {
          this.primeiraCarga = false;
          this.abrirEdicao();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar perfil:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar perfil');
      }
    });
  }

  carregarPerfilVisualizacao(id: string): void {
    this.carregando = true;

    this.perfilService.getPerfilCompleto(id).subscribe({
      next: (data: Usuario) => {
        this.usuario = data;
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar perfil visualizado:', err);
        this.carregando = false;
        this.alertService.error('Erro ao carregar perfil');
      }
    });
  }

  voltar(): void { this.location.back(); }

  carregarPerfil(): void {
    if (this.modoVisualizacao && this.usuarioIdVisualizado) {
      this.carregarPerfilVisualizacao(this.usuarioIdVisualizado);
    } else {
      this.carregarMeuPerfil();
    }
  }

  abrirZoomAvatar(): void {
    this.zoomAvatarAberto = true;
    this.cdr.markForCheck();
  }

  fecharZoomAvatar(): void {
    this.zoomAvatarAberto = false;
    this.cdr.markForCheck();
  }

  abrirEdicao(): void {
    this.menuConfigAberto = false;
    const nickSemArroba = this.usuario?.nickname?.replace('@', '') || '';
    this.usuarioEdit = {
      ...this.usuario,
      nickname: nickSemArroba,
      tema: this.usuario?.tema
    };
    this.uploadErro = '';
    this.editando = true;

    // 🆕 Iniciar onboarding se for primeiro acesso
    if (this.nicknameEditavel && !this.modoVisualizacao) {
      setTimeout(() => {
        this.iniciarOnboarding();
      }, 300);
    }
  }

  sair(): void {
      this.menuConfigAberto = false;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken'); // ✅ ADICIONAR
      localStorage.removeItem('usuario');
      this.router.navigate(['/']);
  }

  fecharEdicao(): void {
    // 🆕 Se onboarding ativo, não permite fechar
    if (this.onboardingAtivo && this.nicknameEditavel) {
      this.alertService.warning('Complete seu cadastro para continuar');
      return;
    }

    this.editando = false;
    this.uploadErro = '';

    // 🆕 Remove o ?editar=true da URL pra não travar próximo clique
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) throw new Error('Apenas imagens');
      if (file.size > this.TAMANHO_MAXIMO) throw new Error(`Máximo ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);

      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const comprimida = await this.comprimirImagem(base64, this.COMPRESSAO_MAX_WIDTH, this.COMPRESSAO_QUALIDADE);
      this.usuarioEdit.avatar = comprimida;
      this.alertService.success('Imagem selecionada!');
      this.cdr.markForCheck();
    } catch (error: any) {
      this.alertService.error(error.message);
    }
  }

  async salvarPerfil(): Promise<void> {
    if (!this.usuarioEdit || !this.usuario) return;

    if (this.nicknameEditavel) {
      let nick = (this.usuarioEdit.nickname || '').trim();
      nick = nick.replace(/^@+/, '').replace(/@/g, '').toLowerCase();

      if (!nick) { this.alertService.warning('Nickname é obrigatório'); return; }
      if (nick.length < 3) { this.alertService.warning('Mínimo 3 caracteres'); return; }
      if (nick.length > 20) { this.alertService.warning('Máximo 20 caracteres'); return; }
      if (!/^[a-z0-9._]+$/.test(nick)) {
        this.alertService.warning('Apenas letras minúsculas, números, . e _');
        return;
      }

      this.usuarioEdit.nickname = '@' + nick;
    } else {
      this.usuarioEdit.nickname = this.usuario?.nickname || '';
    }

    if (this.usuarioEdit.avatar?.startsWith('data:')) {
      const comprimida = await this.comprimirImagem(this.usuarioEdit.avatar, 400, 0.6);
      this.uploadService.uploadImagem(comprimida).subscribe({
        next: (url) => {
          this.usuarioEdit.avatar = url;
          this.salvarDadosPerfil();
        },
        error: () => this.alertService.error('Erro ao enviar foto')
      });
    } else {
      this.salvarDadosPerfil();
    }
  }

  private salvarDadosPerfil(): void {
    if (!this.usuarioEdit || !this.usuario) return;

    const eraPrimeiroAcesso = this.nicknameEditavel;

    // 🆕 Se o usuário não escolheu avatar, usa o aleatório
    if (!this.usuarioEdit.avatar) {
      this.usuarioEdit.avatar = getAvatarPadrao(this.usuario.id);
    }

    const dados: Partial<Usuario> = {
      nome: this.usuarioEdit.nome,
      descricao: this.usuarioEdit.descricao,
      nickname: this.usuarioEdit.nickname || this.usuario?.nickname,
      avatar: this.usuarioEdit.avatar,
      tema: this.usuarioEdit.tema
    };

    this.perfilService.atualizarPerfil(this.usuario.id, dados).subscribe({
      next: () => {
        this.perfilService.limparCache();

        // 🆕 ATUALIZA O LOCALSTORAGE ANTES DE QUALQUER COISA
        const usuarioStorage = JSON.parse(localStorage.getItem('usuario') || '{}');
        usuarioStorage.nome = dados.nome || usuarioStorage.nome;
        usuarioStorage.nickname = dados.nickname || usuarioStorage.nickname;
        usuarioStorage.avatar = dados.avatar || usuarioStorage.avatar;
        usuarioStorage.tema = dados.tema || usuarioStorage.tema;
        this.shellService.atualizarUsuarioLocal(usuarioStorage);

        // 🆕 ATUALIZA O OBJETO this.usuario
        this.usuario = {
          ...this.usuario!,
          nome: dados.nome || this.usuario!.nome,
          nickname: dados.nickname || this.usuario!.nickname,
          descricao: dados.descricao || this.usuario!.descricao,
          avatar: dados.avatar || this.usuario!.avatar,
          tema: dados.tema || this.usuario!.tema
        };

        this.editando = false;
        this.onboardingAtivo = false;
        this.cdr.markForCheck();

        this.alertService.success('Perfil atualizado!');



        if (eraPrimeiroAcesso) {
          // 🆕 Navega com replace para limpar histórico
          this.router.navigate(['/inicio'], { replaceUrl: true });
        } else {
          // 🆕 Navega pra home primeiro (limpa a query ?editar=true)
          this.router.navigate(['/inicio'], { replaceUrl: true })
            .then(() => {
              // 🆕 Depois recarrega (já sem o ?editar=true)
              window.location.reload();
            });
        }
      },
      error: () => this.alertService.error('Erro ao salvar')
    });
  }

  private atualizarLocalStorage(data: Usuario): void {
    const usuarioStorage = {
      id: data.id, nome: data.nome, nickname: data.nickname,
      email: data.email, avatar: data.avatar, tema: data.tema,
      adm: data.adm, ativo: data.ativo
    };
    // 🆕 Troque o localStorage.setItem por:
    this.shellService.atualizarUsuarioLocal(usuarioStorage);
  }

  limparArroba(): void {
    if (this.usuarioEdit.nickname && this.nicknameEditavel) {
      this.usuarioEdit.nickname = this.usuarioEdit.nickname
        .replace(/@/g, '')
        .toLowerCase();
    }
  }

  private comprimirImagem(base64: string, maxWidth: number = 800, qualidade: number = 0.7): Promise<string> {
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


  trocarAba(aba: 'biblioteca' | 'atividades' | 'progresso'): void {
    this.abaAtiva = aba;

  }

  // ============ ONBOARDING ============

  // Iniciar onboarding
  iniciarOnboarding(): void {
    if (!this.nicknameEditavel || !this.editando || this.modoVisualizacao) {
      return;
    }

    this.passoOnboarding = 0;
    this.onboardingAtivo = true;

    // Pequeno delay para o DOM renderizar
    setTimeout(() => {
      this.atualizarHighlightComScroll();
    }, 500);
  }

  // Atualizar posição do highlight
  atualizarHighlight(): void {
    const elemento = this.getElementoPassoAtual();

    if (!elemento) {
      this.proximoPassoOnboarding();
      return;
    }

    const rect = elemento.getBoundingClientRect();
    this.windowHeight = window.innerHeight;
    this.windowWidth = window.innerWidth;

    // Adiciona padding ao highlight
    const padding = 8;
    this.posicaoHighlight = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    };

    // Posiciona tooltip de forma inteligente
    const tooltipWidth = Math.min(280, this.windowWidth - 32);
    const tooltipHeight = 180;

    // Posição horizontal: centralizado com o campo
    let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Ajusta se sair da tela
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, this.windowWidth - tooltipWidth - 16));

    // Posição vertical: abaixo ou acima do campo
    let tooltipTop = rect.bottom + 16;

    // Se não couber abaixo, coloca acima
    if (tooltipTop + tooltipHeight > this.windowHeight - 16) {
      tooltipTop = rect.top - tooltipHeight - 16;
    }

    this.tooltipTop = tooltipTop;
    this.tooltipLeft = tooltipLeft;

    // Foca no campo (se for input/select/textarea)
    if (elemento instanceof HTMLInputElement ||
        elemento instanceof HTMLTextAreaElement ||
        elemento instanceof HTMLSelectElement) {
      elemento.focus();
    }

    this.cdr.markForCheck(); // 🆕 Força atualização visual
  }

  // Obter elemento do passo atual
  getElementoPassoAtual(): HTMLElement | null {
    switch (this.passoOnboarding) {
      case 0: return this.avatarEdicao?.nativeElement;
      case 1: return this.inputNome?.nativeElement;
      case 2: return this.inputNickname?.nativeElement;
      case 3: return this.inputBiografia?.nativeElement;
      case 4: return this.selectTema?.nativeElement;
      case 5: return this.btnSalvar?.nativeElement;
      default: return null;
    }
  }

  // Títulos dos passos
  getTituloPasso(): string {
    switch (this.passoOnboarding) {
      case 0: return '📷 Foto de perfil';
      case 1: return '👤 Seu nome';
      case 2: return '✏️ Escolha seu @nickname';
      case 3: return '📝 Biografia';
      case 4: return '🎨 Tema';
      case 5: return '✅ Finalizar';
      default: return '';
    }
  }

  // Descrições dos passos
  getDescricaoPasso(): string {
    switch (this.passoOnboarding) {
      case 0: return 'Toque para adicionar uma foto (opcional)';
      case 1: return 'Digite seu nome completo';
      case 2: return 'Seu @nickname é único e não pode ser alterado depois';
      case 3: return 'Conte um pouco sobre você (opcional)';
      case 4: return 'Escolha entre tema claro ou escuro';
      case 5: return 'Clique em Salvar para completar seu cadastro';
      default: return '';
    }
  }

  // Avançar para próximo passo
  proximoPassoOnboarding(): void {
    // Passo 0 (avatar) é opcional - permite pular
    if (this.passoOnboarding === 0) {
      this.passoOnboarding = 1;
      this.atualizarHighlightComScroll();
      return;
    }

    // Validação dos campos obrigatórios
    if (this.passoOnboarding === 1 && !this.usuarioEdit.nome?.trim()) {
      this.alertService.warning('Digite seu nome para continuar');
      return;
    }

    if (this.passoOnboarding === 2) {
      const nick = (this.usuarioEdit.nickname || '').trim();
      if (!nick || nick.length < 3) {
        this.alertService.warning('Digite um nickname com pelo menos 3 caracteres');
        return;
      }
    }

    // Avança para próximo passo
    if (this.passoOnboarding < 5) {
      this.passoOnboarding++;
      this.atualizarHighlightComScroll();
    } else {
      this.finalizarOnboarding();
    }
  }

  // 🆕 Novo método: atualiza com scroll e recalcula
  atualizarHighlightComScroll(): void {
    const elemento = this.getElementoPassoAtual();

    if (!elemento) {
      this.proximoPassoOnboarding();
      return;
    }

    // Primeiro, scroll até o elemento
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Depois do scroll, recalcula a posição
    setTimeout(() => {
      this.atualizarHighlight();
    }, 400); // Aguarda o scroll terminar
  }

  // Finalizar onboarding
  finalizarOnboarding(): void {
    this.onboardingAtivo = false;
    this.passoOnboarding = 0;

    // Chama o salvar automaticamente
    if (this.usuarioEdit.nome?.trim() && this.usuarioEdit.nickname?.trim()) {
      this.salvarPerfil();
    }
  }

  getAvatar(usuario: any): string {
    return getAvatarUrl(usuario);
  }


  avataresDisponiveis = Array.from({ length: 9 }, (_, i) =>
    `https://img.bliteca.com.br/avatares/${i + 1}.png`
  );

  selecionarAvatar(url: string): void {
    if (!this.usuarioEdit) return;
    this.usuarioEdit.avatar = url;
    this.uploadErro = '';
    this.cdr.markForCheck();
  }
}
