import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Livro, LivroLeitura, LivroTop, DashboardData, StreakData, BookOffer } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationService } from '../../shared/services/notification.service';
import { StreakService } from '../../core/services/streak.service';
import { Router } from '@angular/router';
import { PullToRefreshComponent } from '../../shared/pull-to-refresh/pull-to-refresh.component';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LeitorService } from '../../shared/leitor/leitor.service';
import { PerfilService } from '../perfil/perfil.service';
import { FilePicker } from '@hotend/capacitor-file-picker';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AddBookModalComponent, BottomSheetComponent, FormsModule, PullToRefreshComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: { 'ngSkipHydration': 'true' }
})
export class HomeComponent implements OnInit {
  modalAberto = false;
  livroAtual: Livro | null = null;
  listaLeitura: LivroLeitura[] = [];
  topAvaliados: LivroTop[] = [];
  carregando = true;
  bottomSheetAberto = false;
  livroSelecionado: LivroTop | LivroLeitura | null = null;
  lendoAgoraAberto = false;
  paginaAtual: number | null = null;
  totalPaginas: number | null = null;

  // Audiobook — input em HH:MM (string com máscara)
  posicaoAtualInput = '';
  duracaoTotalInput = '';
  compartilhando = false;
  previewImagem = '';
  fraseAtividade = '';
  streak: StreakData | null = null;
  outrosEmAndamento: any[] = [];

  modoProgresso: 'paginas' | 'percentual' = 'paginas';
  progressoInput: number | null = null;

  // 🆕 Arquivo inacessível
  arquivoInacessivel = false;

  ofertas: BookOffer[] = [];

  citacao = {
    texto: 'Um leitor vive mil vidas antes de morrer. O homem que nunca lê vive apenas uma.',
    autor: 'George R. R. Martin'
  };

  constructor(
    private homeService: HomeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService,
    private http: HttpClient,
    private analyticsService: AnalyticsService,
    private notificationService: NotificationService,
    private streakService: StreakService,
    private router: Router,
    private leitorService: LeitorService,
    private perfilService: PerfilService
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
        this.router.navigate(['/']);
        return;
      }

      this.homeService.limparCache();
      this.carregarDashboard();
      this.carregarStreak();
      this.carregarOfertas();
      this.verificarNotificacoes();

      // 🆕 Escuta progresso ao fechar o leitor
      this.leitorService.progresso$.subscribe((p) => {
        if (p) {
          // Só preenche os campos se o leitor foi aberto pra esse livro
          this.paginaAtual = p.paginaAtual ?? this.paginaAtual;
          this.totalPaginas = p.totalPaginas ?? this.totalPaginas;
          this.progressoInput = p.progresso ?? this.progressoInput;
          this.cdr.markForCheck();
        }
      });

      // 🆕 Escuta arquivo inacessível
      this.leitorService.arquivoInacessivel$.subscribe((inacessivel) => {
        if (inacessivel) {
          this.arquivoInacessivel = true;
          this.alertService.error('O arquivo não está mais acessível. Vincule novamente.');
          this.leitorService.limparArquivoInacessivel();
          this.cdr.markForCheck();
        }
      });
    }
  }

  get nickname(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario?.nickname || '';
  }

  carregarDashboard(): void {
    this.carregando = true;
    this.homeService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.livroAtual = data.livroAtual || null;
        this.outrosEmAndamento = data.outrosEmAndamento || [];
        this.listaLeitura = data.listaLeitura || [];
        this.topAvaliados = data.topAvaliados || [];
        this.streak = data.streak || null;

        // Reset flag ao recarregar
        this.arquivoInacessivel = false;

        if (this.livroAtual?.imagem) {
          this.preloadImagem(this.livroAtual.imagem);
        }

        this.topAvaliados.slice(0, 3).forEach(livro => {
          if (livro.imagem) {
            this.preloadImagem(livro.imagem);
          }
        });

        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro:', err);
        this.carregando = false;
      }
    });
  }

  private preloadImagem(url: string): void {
    const img = new Image();
    img.src = url;
  }

  abrirModal(): void { this.modalAberto = true; }

  onLivroAdicionado(livro: any): void {
    this.homeService.limparCache();
    this.modalAberto = false;
    this.carregarDashboard();
    this.alertService.success('Livro adicionado com sucesso!');
  }

  abrirBottomSheet(livro: LivroTop | LivroLeitura): void {
    this.livroSelecionado = livro;
    this.bottomSheetAberto = true;
    this.cdr.markForCheck();
  }

  abrirDetalhesLivro(livro: any, editavel: boolean = false): void {
    this.router.navigate(['/inicio/livro', livro.id], {
      state: { livro, editavel }
    });
  }

  fecharBottomSheet(): void {
    this.bottomSheetAberto = false;
    this.livroSelecionado = null;
    this.cdr.markForCheck();
  }

  adicionarABiblioteca(livro: any): void {
    this.fecharBottomSheet();
    this.homeService.adicionarLivro({
      titulo: livro.titulo,
      autor: livro.autor,
      imagem: livro.imagem || null
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.alertService.success(`"${livro.titulo}" adicionado!`);
      },
      error: (err) => {
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
      }
    });
  }

  fecharLendoAgora(): void {
    this.lendoAgoraAberto = false;
    this.previewImagem = '';
    this.fraseAtividade = '';
    this.progressoInput = null;
    this.cdr.markForCheck();
  }

  togglePausar(): void {
    if (!this.livroAtual) return;
    const novoEstado = !this.livroAtual.pausado;

    this.homeService.atualizarProgresso(this.livroAtual.id, {
      pausado: novoEstado
    }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.carregarStreak();
        this.alertService.success(novoEstado ? 'Leitura pausada!' : 'Leitura retomada!');
      },
      error: (err) => {
        console.error('Erro:', err);
        this.alertService.error('Erro ao atualizar');
      }
    });
  }

  formatarMinutos(minutos: number | null | undefined): string {
    if (!minutos) return '0min';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
  }

  // ============ MODO DE PROGRESSO ============
  private get chaveModoProgresso(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const usuarioId = usuario.id || 'anon';
    const livroId = this.livroAtual?.id || 'sem-livro';
    return `modoProgresso:${usuarioId}:${livroId}`;
  }

  /**
   * Extrai o tipo do arquivo do formato "tipo://path".
   * Retorna null se não houver arquivo ou formato inválido.
   */
  private extrairTipoArquivo(arquivoLeitura?: string | null): 'pdf' | 'epub' | null {
    if (!arquivoLeitura) return null;

    const match = arquivoLeitura.match(/^(pdf|epub):\/\//);
    if (match) return match[1] as 'pdf' | 'epub';

    // Compatibilidade com arquivos antigos sem prefixo
    const lower = arquivoLeitura.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.epub')) return 'epub';

    return null;
  }

  private carregarModoProgresso(): 'paginas' | 'percentual' {
    // 1️⃣ Preferência do usuário sempre vence
    const salvo = localStorage.getItem(this.chaveModoProgresso) as 'paginas' | 'percentual' | null;
    if (salvo === 'paginas' || salvo === 'percentual') return salvo;

    // 2️⃣ Se tem arquivo vinculado, o TIPO do arquivo define
    const tipoArquivo = this.extrairTipoArquivo(this.livroAtual?.arquivoLeitura);
    if (tipoArquivo === 'pdf') return 'paginas';
    if (tipoArquivo === 'epub') return 'percentual';

    // 3️⃣ Sem arquivo: comportamento antigo (livro físico)
    if (this.livroAtual?.paginaAtual) return 'paginas';
    return 'percentual';
  }

  alternarModoProgresso(): void {
    this.modoProgresso = this.modoProgresso === 'paginas' ? 'percentual' : 'paginas';
    localStorage.setItem(this.chaveModoProgresso, this.modoProgresso);
    this.cdr.markForCheck();
  }

  setModoProgresso(modo: 'paginas' | 'percentual'): void {
    if (this.modoProgresso === modo) return;
    this.modoProgresso = modo;
    localStorage.setItem(this.chaveModoProgresso, modo);
    this.cdr.markForCheck();
  }

  abrirLendoAgora(): void {
    this.lendoAgoraAberto = true;
    this.previewImagem = '';
    this.fraseAtividade = '';
    const tipo = this.livroAtual?.tipo || 'livro';

    if (tipo === 'audiobook') {
      this.posicaoAtualInput = this.formatarHHMM(this.livroAtual?.minutoAtual);
      this.duracaoTotalInput = this.formatarHHMM(this.livroAtual?.totalMinutos);
      this.paginaAtual = null;
      this.totalPaginas = null;
      this.progressoInput = null;
    } else {
      this.modoProgresso = this.carregarModoProgresso();
      this.paginaAtual = this.livroAtual?.paginaAtual || null;
      this.totalPaginas = this.livroAtual?.totalPaginas || null;
      this.progressoInput = this.livroAtual?.progresso || null;
      this.posicaoAtualInput = '';
      this.duracaoTotalInput = '';
    }

    this.cdr.markForCheck();
  }

  atualizarProgresso(): void {
    if (!this.livroAtual) return;

    const tipo = this.livroAtual.tipo || 'livro';
    let progresso: number | undefined;
    const dados: any = {};

    if (tipo === 'audiobook') {
      const minAtual = this.parseHHMM(this.posicaoAtualInput);
      const minTotal = this.parseHHMM(this.duracaoTotalInput);

      if (minAtual === null && this.posicaoAtualInput) {
        this.alertService.warning('Posição atual inválida');
        return;
      }
      if (minTotal === null && this.duracaoTotalInput) {
        this.alertService.warning('Duração total inválida');
        return;
      }
      if (minAtual !== null && minTotal !== null && minAtual > minTotal) {
        this.alertService.warning('A posição não pode ser maior que a duração');
        return;
      }

      progresso = (minTotal && minAtual)
        ? Math.round((minAtual / minTotal) * 100)
        : undefined;

      if (minAtual !== null && minAtual > 0) dados.minutoAtual = minAtual;
      if (minTotal !== null && minTotal > 0) dados.totalMinutos = minTotal;
    } else if (this.modoProgresso === 'paginas') {
      progresso = this.totalPaginas && this.paginaAtual
        ? Math.round((this.paginaAtual / this.totalPaginas) * 100)
        : undefined;
      if (this.paginaAtual) dados.paginaAtual = this.paginaAtual;
      if (this.totalPaginas) dados.totalPaginas = this.totalPaginas;
    } else {
      if (this.progressoInput !== null && this.progressoInput !== undefined) {
        const valor = Math.max(0, Math.min(100, Math.floor(Number(this.progressoInput))));
        if (!isNaN(valor)) progresso = valor;
      }
    }

    if (progresso !== undefined) dados.progresso = progresso;

    const temComentario = this.fraseAtividade && this.fraseAtividade.trim();
    if (temComentario) dados.frase = this.fraseAtividade.trim();

    this.homeService.atualizarProgresso(this.livroAtual.id, dados).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.carregarStreak();
        this.fraseAtividade = '';
        this.alertService.success('Progresso atualizado!');
        this.analyticsService.logUpdateProgress(progresso || 0);

        if (temComentario) {
          this.fecharLendoAgora();
          this.router.navigate(['/inicio/perfil'], { queryParams: { aba: 'atividades' } });
        } else {
          this.fecharLendoAgora();
        }
      },
      error: () => this.alertService.error('Erro ao atualizar progresso')
    });
  }

  // ============ COMPARTILHAMENTO ============
  async gerarPreviewImagem(): Promise<void> {
    if (!this.livroAtual || this.compartilhando) return;
    this.compartilhando = true;
    this.cdr.markForCheck();
    try {
      this.previewImagem = await this.gerarImagemCompartilhamento();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Erro:', error);
      this.alertService.error('Erro ao gerar imagem');
    } finally {
      this.compartilhando = false;
      this.cdr.markForCheck();
    }
  }

  async compartilharLeitura(): Promise<void> {
    if (!this.livroAtual || this.compartilhando) return;
    this.compartilhando = true;
    this.cdr.markForCheck();

    try {
      const imagemBase64 = await this.gerarImagemCompartilhamento();

      if (Capacitor.isNativePlatform()) {
        const base64Limpo = imagemBase64.split(',')[1];
        const filename = `bliteca-${Date.now()}.png`;

        await Filesystem.writeFile({
          path: filename,
          data: base64Limpo,
          directory: Directory.Cache
        });

        const fileUri = await Filesystem.getUri({
          path: filename,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Bliteca',
          text: `📖 Estou lendo "${this.livroAtual.titulo}" no Bliteca!`,
          url: fileUri.uri,
          dialogTitle: 'Compartilhar leitura'
        });
      } else {
        const blob = await fetch(imagemBase64).then(r => r.blob());
        const file = new File([blob], 'bliteca-leitura.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Bliteca',
            text: `📖 Estou lendo "${this.livroAtual.titulo}" no Bliteca!`,
            files: [file]
          });
        } else {
          const a = document.createElement('a');
          a.href = imagemBase64;
          a.download = 'bliteca-leitura.png';
          a.click();
        }
      }
    } catch (error: any) {
      if (error?.message !== 'Share canceled' && error?.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
      }
    } finally {
      this.compartilhando = false;
      this.cdr.markForCheck();
    }
  }

  private gerarImagemCompartilhamento(): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 941;
      canvas.height = 1672;
      const ctx = canvas.getContext('2d')!;

      const fundo = new Image();
      fundo.src = 'assets/compartilhamento-fundo.png';
      fundo.onload = async () => {
        const proporcao = Math.max(canvas.width / fundo.width, canvas.height / fundo.height);
        const fw = fundo.width * proporcao;
        const fh = fundo.height * proporcao;
        const fx = (canvas.width - fw) / 2;
        const fy = (canvas.height - fh) / 2;

        ctx.drawImage(fundo, fx, fy, fw, fh);

        const capa = new Image();
        capa.crossOrigin = 'anonymous';
        const capaBase64 = await this.baixarImagemComoBase64(
          this.livroAtual!.imagem || 'assets/capas/perfilSemFoto.png'
        );

        capa.src = capaBase64;

        capa.onload = () => {
          const capaW = 380;
          const capaH = 570;
          const capaX = (canvas.width - capaW) / 2;
          const capaY = 550;

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 12;
          ctx.beginPath();
          ctx.roundRect(capaX, capaY, capaW, capaH, 12);
          ctx.clip();
          ctx.drawImage(capa, capaX, capaY, capaW, capaH);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };

        capa.onerror = () => {
          capa.src = 'assets/capas/perfilSemFoto.png';
        };
      };
      fundo.onerror = reject;
    });
  }

  private async baixarImagemComoBase64(url: string): Promise<string> {
    try {
      const blob = await firstValueFrom(this.homeService.baixarImagem(url));

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      return 'assets/capas/perfilSemFoto.png';
    }
  }

  trocarLivroAtual(livro: any): void {
    if (!livro?.id) return;

    this.homeService.atualizarProgresso(livro.id, { pausado: false }).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard();
        this.carregarStreak();
        this.fecharLendoAgora();
        this.alertService.success(`"${livro.titulo}" retomado!`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao retomar livro:', err);
        this.alertService.error('Erro ao retomar livro');
      }
    });
  }

  finalizarLeitura(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.livroAtual) return;

    this.homeService.finalizarLeitura(this.livroAtual.id).subscribe({
      next: () => {
        this.carregarDashboard();
        this.carregarStreak();
        this.alertService.success('🎉 Livro finalizado!');
        this.analyticsService.logUpdateProgress(100);
      },
      error: () => this.alertService.error('Erro ao finalizar leitura')
    });
  }

  async baixarImagemTeste(): Promise<void> {
    if (!this.livroAtual) return;
    try {
      const imagemFinal = await this.gerarImagemCompartilhamento();
      const a = document.createElement('a');
      a.href = imagemFinal;
      a.download = 'bliteca-teste.png';
      a.click();
      this.alertService.success('Imagem baixada!');
    } catch (error) {
      console.error('Erro:', error);
      this.alertService.error('Erro ao baixar');
    }
  }

  private verificarNotificacoes(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario?.id) return;
    if (typeof Notification === 'undefined') return;

    if (Notification.permission === 'default') {
      this.notificationService.requestPermission(usuario.id)
        .then(() => console.log('Permissão solicitada na Home'))
        .catch((error) => console.error('Erro ao solicitar permissão:', error));
    }
  }

  carregarStreak(): void {
    this.streakService.getStreak().subscribe({
      next: (data) => {
        this.streak = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao carregar streak:', err);
      }
    });
  }

  comecarJornada(): void {
    const temLivros = this.listaLeitura.length > 0 || this.livroAtual != null;
    if (temLivros) {
      this.router.navigate(['/inicio/perfil']);
    } else {
      this.router.navigate(['/inicio/biblioteca']);
    }
  }

  abrirStreak(): void {
    this.router.navigate(['/inicio/perfil'], {
      queryParams: { aba: 'progresso' }
    });
  }

  // ============ HELPERS DE TEMPO (AUDIOBOOK) ============
  private parseHHMM(texto: string): number | null {
    if (!texto) return null;
    const match = texto.match(/^(\d{1,3}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m >= 60) return null;
    return (h * 60) + m;
  }

  formatarHHMM(minutos: number | null | undefined): string {
    if (!minutos || minutos < 0) return '00:00';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  formatarRestante(minutos: number | null | undefined): string {
    if (!minutos || minutos <= 0) return '';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }

  formatarEntradaHHMM(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 5) digits = digits.slice(0, 5);

    if (digits.length <= 2) {
      input.value = digits;
      return;
    }

    const minutos = digits.slice(-2);
    const horas = digits.slice(0, -2);
    const m = parseInt(minutos, 10);
    let hFinal = parseInt(horas, 10);
    let mFinal = m;

    if (m >= 60) {
      hFinal += Math.floor(m / 60);
      mFinal = m % 60;
    }

    input.value = `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
  }

  get restanteAudiobook(): string {
    const atual = this.parseHHMM(this.posicaoAtualInput);
    const total = this.parseHHMM(this.duracaoTotalInput);
    if (atual === null || total === null || atual >= total) return '';
    return this.formatarRestante(total - atual);
  }

  get progressoAudiobook(): number {
    const atual = this.parseHHMM(this.posicaoAtualInput);
    const total = this.parseHHMM(this.duracaoTotalInput);
    if (atual === null || !total || total === 0) return 0;
    return Math.min(100, Math.round((atual / total) * 100));
  }

  // ============ LER ARQUIVO (via path) ============
  lerLivroAtual(): void {
    if (!this.livroAtual) return;

    if (!this.livroAtual.arquivoLeitura) {
      this.vincularArquivoNovamente();
      return;
    }

    if (this.arquivoInacessivel) {
      this.vincularArquivoNovamente();
      return;
    }

    const valor = this.livroAtual.arquivoLeitura;

    // 🆕 Posições salvas no banco
    const progressoInicial = this.livroAtual.progresso ?? 0;
    const paginaInicial = this.livroAtual.paginaAtual ?? 1;

    // Compatibilidade com arquivos antigos (sem prefixo)
    const match = valor.match(/^(pdf|epub):\/\/(.+)$/);
    if (!match) {
      const tipo: 'pdf' | 'epub' = valor.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';
      this.leitorService.setArquivo(
        valor,
        this.livroAtual.id,
        tipo,
        progressoInicial,
        paginaInicial
      );
      return;
    }

    const tipo = match[1] as 'pdf' | 'epub';
    const path = match[2];

    this.leitorService.setArquivo(
      path,
      this.livroAtual.id,
      tipo,
      progressoInicial,
      paginaInicial
    );
  }

  // 🆕 Vincular/re-vincular arquivo
  async vincularArquivoNovamente(): Promise<void> {
    if (!this.livroAtual) return;

    try {
      const result = await FilePicker.pickFiles({
        types: ['application/pdf', 'application/epub+zip'],
        readData: false,
        persistContentUri: true
      });

      if (!result.files || result.files.length === 0) return;

      const file = result.files[0];
      const uri = file.path || '';

      if (!uri) {
        this.alertService.error('Não foi possível obter o caminho do arquivo.');
        return;
      }

      // 🆕 Detecta tipo pelo mimeType do FilePicker
      const mime = (file as any).mimeType || '';
      const tipo = mime.includes('epub') || uri.toLowerCase().includes('.epub') ? 'epub' : 'pdf';
      const valorSalvar = `${tipo}://${uri}`;

      // 🆕 Reset da preferência de modo (o tipo do arquivo define o novo default)
      localStorage.removeItem(this.chaveModoProgresso);

      this.perfilService.atualizarLivro(this.livroAtual.id, {
        arquivoLeitura: valorSalvar
      }).subscribe({
        next: () => {
          this.livroAtual!.arquivoLeitura = valorSalvar;
          this.arquivoInacessivel = false;
          this.homeService.limparCache();
          this.alertService.success('Arquivo vinculado!');
          this.cdr.markForCheck();
        },
        error: () => this.alertService.error('Erro ao salvar arquivo')
      });

    } catch (error: any) {
      if (error?.message?.includes('cancel')) return;
      console.error('Erro ao vincular arquivo:', error);
      this.alertService.error('Erro ao selecionar arquivo.');
    }
  }

  // 🆕 Modo do livro atual (pro card da Home)
  private get chaveModoProgressoAtual(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const usuarioId = usuario.id || 'anon';
    const livroId = this.livroAtual?.id || 'sem-livro';
    return `modoProgresso:${usuarioId}:${livroId}`;
  }

  get modoProgressoAtual(): 'paginas' | 'percentual' {
    const salvo = localStorage.getItem(this.chaveModoProgressoAtual) as 'paginas' | 'percentual' | null;
    if (salvo === 'paginas' || salvo === 'percentual') return salvo;

    // 🆕 Tipo do arquivo define o default
    const tipoArquivo = this.extrairTipoArquivo(this.livroAtual?.arquivoLeitura);
    if (tipoArquivo === 'pdf') return 'paginas';
    if (tipoArquivo === 'epub') return 'percentual';

    // Sem arquivo: comportamento antigo (livro físico)
    return this.livroAtual?.paginaAtual ? 'paginas' : 'percentual';
  }

  // ============ OFERTAS (Amazon Afiliado) ============
  private carregarOfertas(): void {
    console.log('🔍 [OFERTAS] Iniciando carregamento...');

    this.homeService.getBookOffers(3).subscribe({
      next: (res) => {
        console.log('🔍 [OFERTAS] Resposta:', res);
        console.log('🔍 [OFERTAS] Total de ofertas:', res.offers?.length);
        this.ofertas = res.offers || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('❌ [OFERTAS] Erro:', err);
        console.error('❌ [OFERTAS] Status:', err.status);
        console.error('❌ [OFERTAS] Message:', err.message);
        console.error('❌ [OFERTAS] URL:', err.url);
        this.ofertas = [];
      }
    });
  }

  registrarCliqueOferta(oferta: BookOffer): void {
    console.log('Clique oferta:', {
      id: oferta.id,
      title: oferta.title
    });
    // Futuro: this.analyticsService.logEvent('offer_click', { id: oferta.id });
  }
}
