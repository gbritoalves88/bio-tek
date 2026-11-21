import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Livro, LivroLeitura, LivroTop, DashboardData, StreakData, BookOffer } from './home.model';
import { HomeService } from './home.service';
import { AddBookModalComponent } from '../../shared/add-book-modal/add-book-modal.component';
import { AlertService } from '../../shared/services/alert.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
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
import { UploadService } from '../../shared/services/upload.service';
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

  modalPosAdicionar = false;
  livroAdicionado: any = null;
  tipoSelecionado = 'livro';
  statusSelecionado = 1;

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

modalAvaliacaoAberto = false;

   modalCompartilharAberto = false;
  textoCompartilhar = '';
  compartilhandoBliTeca = false;

  importandoArquivo = false;
  mostrarTextarea = false;
  notaAvaliacao = 0;
  comentarioAvaliacao = '';
  livroParaAvaliar: any = null;
  salvandoAvaliacao = false;

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
    private perfilService: PerfilService,
    private uploadService: UploadService
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

    // 🆕 Escuta progresso ao fechar o leitor (unificado)
    this.leitorService.progresso$.subscribe((p) => {
      if (!p || !this.livroAtual) return;

      // 1. Atualiza as variáveis
      this.paginaAtual = p.paginaAtual ?? this.paginaAtual;
      this.totalPaginas = p.totalPaginas ?? this.totalPaginas;

      if (p.progresso !== undefined && p.progresso !== null) {
        this.progressoInput = p.progresso;
      }

      // 2. Define o modo baseado no que o leitor enviou
      if (p.cfi) {
        this.modoProgresso = 'percentual';
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        localStorage.setItem(`modoProgresso:${usuario.id || 'anon'}:${this.livroAtual.id}`, 'percentual');
      } else if (p.paginaAtual) {
        this.modoProgresso = 'paginas';
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        localStorage.setItem(`modoProgresso:${usuario.id || 'anon'}:${this.livroAtual.id}`, 'paginas');
      }

      // 3. Força repintura
      if (this.lendoAgoraAberto) {
        this.cdr.detectChanges();
      } else {
        this.cdr.markForCheck();
      }

      // 🆕 4. Salva o progresso automaticamente (só se houver avanço)
      this.salvarProgressoDoLeitor(p);

      if (this.lendoAgoraAberto) {
        this.fecharLendoAgora();
      }
    });
  }
}

  get nickname(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario?.nickname || '';
  }

  carregarDashboard(exibirSkeleton: boolean = true): void {
    if (exibirSkeleton) {
      this.carregando = true;
    }
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
    this.modalAberto = false;
    this.livroAdicionado = livro;
    this.tipoSelecionado = livro?.tipo || 'livro';
    this.statusSelecionado = livro?.status || 1;
    this.livroAdicionado.publico = livro?.publico !== false;
    this.modalPosAdicionar = true;
    this.cdr.markForCheck();
  }

  abrirBottomSheet(livro: LivroTop | LivroLeitura): void {
    this.livroSelecionado = livro;
    this.bottomSheetAberto = true;
    this.cdr.markForCheck();
  }

  abrirDetalhesLivro(livro: any, editavel: boolean = false): void {
    // Se já tem ID válido (catálogo normal), navega direto
    if (livro.affiliateUrl == null) {
      this.router.navigate(['/inicio/livro', livro.id], {
        state: { livro, editavel }
      });
      return;
    }

    // Se for uma OFERTA (não tem ID do banco), busca pelo título antes
    if (livro.title || livro.titulo) {
      const tituloBusca = livro.title || livro.titulo;

      this.homeService.buscarPorTitulo(tituloBusca).subscribe({
        next: (resultados: any[]) => {
          if (resultados && resultados.length > 0) {
            // Pega o primeiro resultado da busca
            const livroEncontrado = resultados[0];
            this.router.navigate(['/inicio/livro', livroEncontrado.id], {
              state: { livro: livroEncontrado, editavel: false }
            });
          } else {
            this.alertService.warning(`"${tituloBusca}" ainda não está no catálogo do BliTeca.`);
          }
        },
        error: () => this.alertService.error('Erro ao buscar informações do livro.')
      });
    }
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
      // 1️⃣ A preferência do usuário (escolhida manualmente) SEMPRE vence
      const salvo = localStorage.getItem(this.chaveModoProgresso) as 'paginas' | 'percentual' | null;
      if (salvo === 'paginas' || salvo === 'percentual') return salvo;

      // 2️⃣ Se tem arquivo vinculado, o TIPO do arquivo define o modo
      const tipoArquivo = this.extrairTipoArquivo(this.livroAtual?.arquivoLeitura);
      if (tipoArquivo === 'pdf') return 'paginas';
      if (tipoArquivo === 'epub') return 'percentual';

      // 3️⃣ 🆕 Se é um livro manual antigo que já tem progresso em páginas, mantém páginas
      if (this.livroAtual?.paginaAtual && this.livroAtual.paginaAtual > 0) {
        return 'paginas';
      }

      // 4️⃣ 🆕 DEFAULT PARA LIVRO MANUAL NOVO: Páginas
      return 'paginas';
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
      // 🆕 Define o modo automaticamente baseado no arquivo
      const tipoArquivo = this.extrairTipoArquivo(this.livroAtual?.arquivoLeitura);

      if (tipoArquivo === 'epub') {
        this.modoProgresso = 'percentual';
      } else {
        // PDF ou Livro manual (sem arquivo) usa páginas
        this.modoProgresso = 'paginas';
      }

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
    const dados: any = {};
    let progresso: number | undefined;

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

      // ✅ Só envia minutoAtual se AUMENTOU
      if (minAtual !== null && minAtual > (this.livroAtual.minutoAtual ?? 0)) {
        dados.minutoAtual = minAtual;
      }

      // ✅ Só envia totalMinutos se mudou
      if (minTotal !== null && minTotal !== (this.livroAtual.totalMinutos ?? 0)) {
        dados.totalMinutos = minTotal;
      }

      if (dados.minutoAtual && dados.totalMinutos) {
        progresso = Math.round((dados.minutoAtual / dados.totalMinutos) * 100);
      } else if (dados.minutoAtual && this.livroAtual.totalMinutos) {
        progresso = Math.round((dados.minutoAtual / this.livroAtual.totalMinutos) * 100);
      } else if (dados.totalMinutos && this.livroAtual.minutoAtual) {
        progresso = Math.round((this.livroAtual.minutoAtual / dados.totalMinutos) * 100);
      }
    } else if (this.modoProgresso === 'paginas') {
      // ✅ Só envia paginaAtual se AUMENTOU
      if (this.paginaAtual != null && this.paginaAtual > (this.livroAtual.paginaAtual ?? 0)) {
        dados.paginaAtual = this.paginaAtual;
      }

      // ✅ Só envia totalPaginas se mudou
      if (this.totalPaginas != null && this.totalPaginas !== (this.livroAtual.totalPaginas ?? 0)) {
        dados.totalPaginas = this.totalPaginas;
      }

      // Calcula progresso se tiver os dois valores
      const pagAtual = dados.paginaAtual ?? this.livroAtual.paginaAtual;
      const pagTotal = dados.totalPaginas ?? this.livroAtual.totalPaginas;
      if (pagAtual && pagTotal) {
        progresso = Math.round((pagAtual / pagTotal) * 100);
      }
    } else {
      // ✅ Modo % — só envia se AUMENTOU
      if (this.progressoInput != null) {
        const valor = Math.max(0, Math.min(100, Math.floor(Number(this.progressoInput))));
        if (!isNaN(valor) && valor > (this.livroAtual.progresso ?? 0)) {
          progresso = valor;
        }
      }
    }

    if (progresso !== undefined) dados.progresso = progresso;

    const temComentario = this.fraseAtividade && this.fraseAtividade.trim();
    if (temComentario) dados.frase = this.fraseAtividade.trim();

    // 🛡️ Se NÃO tem nada pra atualizar, não faz request e avisa o usuário
    if (Object.keys(dados).length === 0) {
      this.alertService.warning('Nenhum avanço de leitura detectado. O progresso só conta quando você avança.');
      return;
    }

    this.homeService.atualizarProgresso(this.livroAtual.id, dados).subscribe({
      next: () => {
        this.homeService.limparCache();
        this.carregarDashboard(false);
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
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 941;
      canvas.height = 1672;
      const ctx = canvas.getContext('2d')!;

      // 1. Carrega a imagem de fundo
      const fundo = new Image();
      fundo.src = 'assets/compartilhamento-fundo.png';

      fundo.onload = async () => {
        // Desenha o fundo
        const proporcao = Math.max(canvas.width / fundo.width, canvas.height / fundo.height);
        const fw = fundo.width * proporcao;
        const fh = fundo.height * proporcao;
        const fx = (canvas.width - fw) / 2;
        const fy = (canvas.height - fh) / 2;
        ctx.drawImage(fundo, fx, fy, fw, fh);

        // 2. Pega o Base64 da capa (ou fallback)
        let capaBase64 = 'assets/capas/perfilSemFoto.png';
        try {
          if (this.livroAtual?.imagem) {
            capaBase64 = await this.baixarImagemComoBase64(this.livroAtual.imagem);
          }
        } catch (e) {
          console.warn('Erro ao baixar capa, usando fallback', e);
        }

        // 3. Carrega a capa e desenha
        const capa = new Image();

        // A função de desenhar separada para ser reutilizada no onerror
        const desenharCapa = () => {
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

        // 4. IMPORTANTE: Define o onload e onerror ANTES de setar o src
        capa.onload = () => {
          desenharCapa();
        };

        capa.onerror = () => {
          console.warn('Falha ao carregar a capa, usando fallback.');
          // Se a imagem der erro, carrega a foto padrão e desenha
          capa.src = 'assets/capas/perfilSemFoto.png';
          // O onload vai ser disparado novamente com a foto padrão
        };

        capa.src = capaBase64;
      };

      fundo.onerror = (err) => {
        console.error('Erro ao carregar o fundo:', err);
        reject('Erro ao carregar imagem de fundo');
      };
    });
  }

  private gerarImagemCompartilhamentoOld(): Promise<string> {
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
      // Usa o proxy do seu backend (que já existe no HomeService)
      const blob = await firstValueFrom(this.homeService.baixarImagem(url));

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao baixar imagem via proxy:', error);
      // Se o proxy falhar, tenta a imagem padrão
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

  finalizarLeituraOld(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.livroAtual) return;

    const idLivro = this.livroAtual.id;

    // 1. OPTIMISTIC UI: Muda a tela IMEDIATAMENTE
    this.livroAtual.progresso = 100;
    this.livroAtual.status = 3; // Lido
    this.cdr.detectChanges(); // Força o Angular a renderizar o "100%" na mesma hora

    // 2. Faz a requisição HTTP em background
    this.homeService.finalizarLeitura(idLivro).subscribe({
      next: () => {
        this.alertService.success('🎉 Livro finalizado!');
        this.analyticsService.logUpdateProgress(100);

        // Só recarrega do banco para atualizar o Streak e os outros cards
        this.carregarDashboard();
        this.carregarStreak();
      },
      error: () => {
        // 3. Se der erro, DESFAZ a mudança na tela
        this.alertService.error('Erro ao finalizar leitura');
        if (this.livroAtual) {
          this.livroAtual.progresso = 99;
          this.livroAtual.status = 2; // Volta para Lendo
        }
        this.carregarDashboard(); // Puxa os dados reais do banco
      }
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

    // Posições salvas no banco
    const progressoInicial = this.livroAtual.progresso ?? 0;
    const paginaInicial = this.livroAtual.paginaAtual ?? 1;
    const cfiInicial = this.livroAtual.cfi ?? undefined;

    // 🆕 Compatibilidade com arquivos antigos (sem prefixo)
    const match = valor.match(/^(pdf|epub):\/\/(.+)$/);
    if (!match) {
      const tipo: 'pdf' | 'epub' = valor.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';
      this.leitorService.setArquivo(
        valor,
        this.livroAtual.id,
        tipo,
        progressoInicial,
        paginaInicial,
        cfiInicial, // cfiInicial
        this.livroAtual.titulo // 🆕 Passa o título do livro
      );
      return;
    }

    // Arquivos com prefixo (pdf:// ou epub://)
    const tipo = match[1] as 'pdf' | 'epub';
    const path = match[2];

    this.leitorService.setArquivo(
      path,
      this.livroAtual.id,
      tipo,
      progressoInicial,
      paginaInicial,
      undefined, // cfiInicial
      this.livroAtual.titulo // 🆕 Passa o título do livro
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
    // 1️⃣ A preferência do usuário SEMPRE vence
    const salvo = localStorage.getItem(this.chaveModoProgressoAtual) as 'paginas' | 'percentual' | null;
    if (salvo === 'paginas' || salvo === 'percentual') return salvo;

    // 2️⃣ O tipo do arquivo define o modo (PDF = páginas, EPUB = porcentagem)
    const tipoArquivo = this.extrairTipoArquivo(this.livroAtual?.arquivoLeitura);
    if (tipoArquivo === 'pdf') return 'paginas';
    if (tipoArquivo === 'epub') return 'percentual';

    // 3️⃣ 🆕 DEFAULT PARA LIVRO MANUAL NOVO: Páginas
    return 'paginas';
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

  fecharModalPosAdicionar(): void {
    this.modalPosAdicionar = false;
    this.livroAdicionado = null;
    this.tipoSelecionado = 'livro';
    this.statusSelecionado = 1;
    this.cdr.markForCheck();
  }

  // 🆕 Salva o progresso automaticamente ao fechar o leitor (PDF/EPUB)
  private salvarProgressoDoLeitor(p: any): void {
    if (!this.livroAtual) return;

    const dados: any = {};

    if (p.progresso != null && p.progresso > (this.livroAtual.progresso ?? 0)) {
      dados.progresso = p.progresso;
    }

    // 🆕 CFI do EPUB
    if (p.cfi) {
      dados.cfi = p.cfi;
    }

    if (p.paginaAtual != null && p.paginaAtual > (this.livroAtual.paginaAtual ?? 0)) {
      dados.paginaAtual = p.paginaAtual;
    }

    if (p.totalPaginas != null && p.totalPaginas !== (this.livroAtual.totalPaginas ?? 0)) {
      dados.totalPaginas = p.totalPaginas;
    }

    if (Object.keys(dados).length === 0) return;

    this.homeService.atualizarProgresso(this.livroAtual.id, dados).subscribe({
      next: () => {
        if (dados.progresso !== undefined) this.livroAtual!.progresso = dados.progresso;
        if (dados.cfi) this.livroAtual!.cfi = dados.cfi;
        if (dados.paginaAtual) this.livroAtual!.paginaAtual = dados.paginaAtual;
        if (dados.totalPaginas) this.livroAtual!.totalPaginas = dados.totalPaginas;

        this.homeService.limparCache();
        this.carregarDashboard(false);
        this.carregarStreak();
      },
      error: (err) => console.error('Erro ao salvar progresso:', err)
    });
  }

  salvarPosAdicionar(): void {
    if (!this.livroAdicionado) return;

    const dados = {
      titulo: this.livroAdicionado.titulo,
      autor: this.livroAdicionado.autor,
      descricao: this.livroAdicionado.descricao || '',
      imagem: this.livroAdicionado.imagem || null,
      codigoBarras: this.livroAdicionado.codigoBarras || null,
      generos: this.livroAdicionado.generos || [],
      anoPublicacao: this.livroAdicionado.anoPublicacao || null,
      editora: this.livroAdicionado.editora || null,
      idioma: this.livroAdicionado.idioma || null,
      arquivoLeitura: this.livroAdicionado.arquivoLeitura || null,
      tipo: this.tipoSelecionado,
      status: this.statusSelecionado,
      publico: this.livroAdicionado.publico !== false
    };

    this.modalPosAdicionar = false;
    this.livroAdicionado = null;
    this.cdr.detectChanges();

    this.homeService.adicionarLivro(dados).subscribe({
      next: () => {
        this.alertService.success('Livro cadastrado!');
        this.homeService.limparCache();
        this.carregarDashboard(false);
        this.carregarStreak();
      },
      error: (err) => {
        this.alertService.error(err.error?.mensagem || 'Erro ao adicionar livro');
      }
    });
  }

    // 🆕 Abre a tela de compartilhar
  abrirCompartilharLeitura(): void {
    if (!this.livroAtual) return;
    this.modalCompartilharAberto = true;
    this.mostrarTextarea = false; // 🆕 Reseta ao abrir
    this.textoCompartilhar = `📖 Estou lendo "${this.livroAtual.titulo}" no BliTeca!`;
    this.cdr.markForCheck();
  }

  // 🆕 Fecha a tela
  fecharCompartilharLeitura(): void {
    this.modalCompartilharAberto = false;
    this.mostrarTextarea = false; // 🆕 Reseta ao fechar
    this.textoCompartilhar = '';
    this.cdr.markForCheck();
  }

  // 🆕 Publica a atividade na Comunidade
    publicarNoFeed(): void {
    if (!this.livroAtual || !this.textoCompartilhar.trim()) return;

    this.compartilhandoBliTeca = true;

    // Prepara os dados para envio
    const dados: any = {
      frase: this.textoCompartilhar.trim()
    };

    // Se o livro for PDF/manual, envia a página atual
    if (this.livroAtual.tipo !== 'audiobook') {
      if (this.livroAtual.paginaAtual) dados.paginaAtual = this.livroAtual.paginaAtual;
      if (this.livroAtual.totalPaginas) dados.totalPaginas = this.livroAtual.totalPaginas;
    }

    // Se tiver progresso, envia também
    if (this.livroAtual.progresso !== undefined && this.livroAtual.progresso !== null) {
      dados.progresso = this.livroAtual.progresso;
    }

    this.homeService.atualizarProgresso(this.livroAtual.id, dados).subscribe({
      next: () => {
        this.compartilhandoBliTeca = false;
        this.alertService.success('Publicado na comunidade com sucesso!');
        this.fecharCompartilharLeitura();
        this.carregarDashboard(false);
      },
      error: (err) => {
        console.error('Erro ao publicar:', err);
        this.compartilhandoBliTeca = false;
        this.alertService.error('Erro ao publicar no feed');
      }
    });
  }

  // 🆕 Abre o compartilhamento nativo (WhatsApp, Instagram, etc.)
  compartilharExterno(): void {
    // Fecha o modal primeiro
    this.modalCompartilharAberto = false;
    // Chama a sua função antiga que gerava a imagem e abria o Share do Capacitor
    this.compartilharLeitura();
  }

  // ============ IMPORTAR PDF/EPUB ============

async importarArquivo(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    this.importarArquivoWeb();
    return;
  }

  try {
    const result = await FilePicker.pickFiles({
      types: ['application/pdf', 'application/epub+zip'],
      readData: false,
      persistContentUri: true
    });

    if (!result.files || result.files.length === 0) return;

    const file = result.files[0];
    const uri = file.path || '';
    const mime = (file as any).mimeType || '';
    const tipo: 'pdf' | 'epub' = mime.includes('epub') ? 'epub' : 'pdf';

    if (!uri) {
      this.alertService.error('Não foi possível obter o caminho do arquivo.');
      return;
    }

    this.importandoArquivo = true;
    this.cdr.markForCheck();

    // 1. Título a partir do nome do arquivo
    const titulo = (file.name || 'Livro')
      .replace(/\.(pdf|epub)$/i, '')
      .replace(/[_-]/g, ' ')
      .trim() || 'Livro sem título';

    // 2. Tenta extrair capa (com timeout curto, sem bloquear)
    let imagemUrl: string | null = null;
    try {
      const capaBase64 = await Promise.race([
        this.extrairCapa(uri, tipo),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);

      if (capaBase64) {
        try {
          imagemUrl = await firstValueFrom(this.uploadService.uploadImagem(capaBase64));
        } catch (e) {
          console.warn('Falha ao subir capa:', e);
        }
      }
    } catch (e) {
      console.warn('Falha ao extrair capa:', e);
    }

    // 3. Tenta pegar autor do catálogo (rápido, com timeout)
    let autor = 'Autor desconhecido';
    if (titulo.length >= 3) {
      try {
        const resultados: any[] = await firstValueFrom(
          this.homeService.buscarPorTitulo(titulo).pipe(timeout(3000))
        );
        if (Array.isArray(resultados) && resultados.length > 0) {
          autor = resultados[0]?.autor || autor;
          if (!imagemUrl && resultados[0]?.imagem) {
            imagemUrl = resultados[0].imagem;
          }
        }
      } catch { /* segue com fallback */ }
    }

    // 4. Salva o livro (mesmo padrão de "vincularArquivoNovamente")
    const valorArquivo = `${tipo}://${uri}`;
    const payload = {
      titulo,
      autor,
      imagem: imagemUrl,
      tipo: 'livro',
      status: 1, // Quero Ler (backend também força)
      arquivoLeitura: valorArquivo
    };

    this.homeService.adicionarLivro(payload).subscribe({
      next: (livroCriado: any) => {
        this.importandoArquivo = false;
        this.cdr.markForCheck();

        // 5. Reaproveita o Bottom Sheet pós-adicionar existente
        this.onLivroAdicionado({
          ...livroCriado,
          tipo: livroCriado?.tipo || 'livro',
          status: livroCriado?.status || 1
        });
      },
      error: (err) => {
        this.importandoArquivo = false;
        if (err.status === 400 && err.error?.mensagem) {
          this.alertService.warning(err.error.mensagem);
        } else {
          this.alertService.error('Erro ao importar livro.');
        }
        this.cdr.markForCheck();
      }
    });

  } catch (error: any) {
    if (error?.message?.includes('cancel')) return;
    console.error('Erro ao importar:', error);
    this.importandoArquivo = false;
    this.alertService.error('Erro ao selecionar arquivo.');
    this.cdr.markForCheck();
  }
}

// Fallback para web (PWA): usa input file nativo
private importarArquivoWeb(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.epub,application/pdf,application/epub+zip';
  input.onchange = async (event: any) => {
    const file: File = event.target.files?.[0];
    if (!file) return;

    this.importandoArquivo = true;
    this.cdr.markForCheck();

    try {
      const titulo = file.name
        .replace(/\.(pdf|epub)$/i, '')
        .replace(/[_-]/g, ' ')
        .trim() || 'Livro sem título';

      const tipo: 'pdf' | 'epub' = file.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';

      // Capa (tenta com timeout)
      let imagemUrl: string | null = null;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const capaBase64 = await Promise.race([
          this.extrairCapaDeArrayBuffer(arrayBuffer, tipo),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
        if (capaBase64) {
          try {
            imagemUrl = await firstValueFrom(this.uploadService.uploadImagem(capaBase64));
          } catch {}
        }
      } catch (e) {
        console.warn('Falha ao extrair capa na web:', e);
      }

      // Impressão digital (mesmo formato do AddBookModal)
      const valorArquivo = `pwa://${file.name}|${file.size}|${file.lastModified}`;

      const payload = {
        titulo,
        autor: 'Autor desconhecido',
        imagem: imagemUrl,
        tipo: 'livro',
        status: 1,
        arquivoLeitura: `${tipo}://${valorArquivo}`
      };

      this.homeService.adicionarLivro(payload).subscribe({
        next: (livroCriado: any) => {
          this.importandoArquivo = false;
          this.cdr.markForCheck();
          this.onLivroAdicionado({
            ...livroCriado,
            tipo: livroCriado?.tipo || 'livro',
            status: livroCriado?.status || 1
          });
        },
        error: () => {
          this.importandoArquivo = false;
          this.alertService.error('Erro ao importar livro.');
          this.cdr.markForCheck();
        }
      });
    } catch {
      this.importandoArquivo = false;
      this.alertService.error('Erro ao importar arquivo.');
      this.cdr.markForCheck();
    }
  };
  input.click();
}

// ============ EXTRAIR CAPA ============

/**
 * Extrai capa de um arquivo a partir da URI do dispositivo (Android/Capacitor).
 * Retorna base64 ou null em caso de falha.
 */
private async extrairCapa(uri: string, tipo: 'pdf' | 'epub'): Promise<string | null> {
  try {
    const url = Capacitor.convertFileSrc(uri);
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return await this.extrairCapaDeArrayBuffer(buffer, tipo);
  } catch (e) {
    console.warn('Erro extraindo capa:', e);
    return null;
  }
}

/**
 * Extrai capa a partir de um ArrayBuffer (usado na web e reaproveitado pela versão Capacitor).
 */
private async extrairCapaDeArrayBuffer(buffer: ArrayBuffer, tipo: 'pdf' | 'epub'): Promise<string | null> {
  if (!buffer || buffer.byteLength === 0) return null;

  if (tipo === 'epub') return this.extrairCapaEpub(buffer);
  return this.extrairCapaPdf(buffer);
}

private async extrairCapaEpub(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const ePubModule = await import('epubjs');
    const ePub = (ePubModule as any).default || ePubModule;

    const blob = new Blob([buffer], { type: 'application/epub+zip' });
    const book = ePub(blob);
    await book.ready;

    const coverUrl = await (book as any).coverUrl?.();
    if (!coverUrl) {
      try { book.destroy(); } catch {}
      return null;
    }

    const response = await fetch(coverUrl);
    const blobImg = await response.blob();
    try { book.destroy(); } catch {}

    return await this.blobParaBase64Redimensionado(blobImg, 400);
  } catch (e) {
    console.warn('Erro extraindo capa EPUB:', e);
    return null;
  }
}

private async extrairCapaPdf(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      '/assets/pdf.worker.min.mjs',
      window.location.origin
    ).toString();

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const page = await pdf.getPage(1);

    const baseViewport = page.getViewport({ scale: 1 });
    const scale = 300 / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d')!;

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas  // 🆕 Adicionar esta linha
    }).promise;

    try { (pdf as any).destroy?.(); } catch {}

    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (e) {
    console.warn('Erro extraindo capa PDF:', e);
    return null;
  }
}

private blobParaBase64Redimensionado(blob: Blob, maxWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > maxWidth) {
              h = (maxWidth / w) * h;
              w = maxWidth;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Remove o "@" inicial do nickname (caso tenha vindo do banco).
   * Ex: "@bliteca" → "bliteca"
   */
  limparNick(nick: string | null | undefined): string {
    if (!nick) return '';
    return nick.startsWith('@') ? nick.substring(1) : nick;
  }

  // ============ AVALIAÇÃO ============

abrirModalAvaliacao(event?: Event): void {
  if (event) event.stopPropagation();
  if (!this.livroAtual) return;

  this.livroParaAvaliar = this.livroAtual;
  this.notaAvaliacao = 0;
  this.comentarioAvaliacao = '';
  this.modalAvaliacaoAberto = true;
  this.cdr.markForCheck();
}

fecharModalAvaliacao(): void {
  this.modalAvaliacaoAberto = false;
  this.livroParaAvaliar = null;
  this.notaAvaliacao = 0;
  this.comentarioAvaliacao = '';
  this.cdr.markForCheck();
}

selecionarNota(nota: number): void {
  this.notaAvaliacao = nota;
  this.cdr.markForCheck();
}

salvarAvaliacao(): void {
  if (!this.livroParaAvaliar || this.notaAvaliacao === 0) {
      this.alertService.warning('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    this.salvandoAvaliacao = true;
    const livroId = this.livroParaAvaliar.id;
    const comentario = this.comentarioAvaliacao.trim();

    // 🎯 PASSO 1: Marca como Lido + envia as estrelas
    // O LivroService.AtualizarAsync internamente cria a AvaliacaoLivro
    this.perfilService.atualizarLivro(livroId, {
      status: 3, // Lido
      estrelas: this.notaAvaliacao
    }).subscribe({
      next: () => {
        // 🎯 PASSO 2: Se o usuário digitou comentário, envia separado
        if (comentario) {
          this.perfilService.enviarComentario(livroId, comentario).subscribe({
            next: () => {
              this.finalizarAvaliacaoComSucesso();
            },
            error: (err) => {
              console.warn('Avaliação salva, mas o comentário falhou:', err);
              // Não é erro fatal — a avaliação foi salva
              this.finalizarAvaliacaoComSucesso();
            }
          });
        } else {
          this.finalizarAvaliacaoComSucesso();
        }
      },
      error: (err) => {
        console.error('Erro ao salvar avaliação:', err);
        this.salvandoAvaliacao = false;
        const msg = err.error?.mensagem || 'Erro ao enviar avaliação. Tente novamente.';
        this.alertService.error(msg);
        this.cdr.markForCheck();
      }
    });
  }

  private finalizarAvaliacaoComSucesso(): void {
    this.salvandoAvaliacao = false;
    this.fecharModalAvaliacao();
    this.alertService.success('🎉 Livro finalizado e avaliado!');

    // Atualiza a Home
    this.homeService.limparCache();
    this.carregarDashboard(false);
    this.carregarStreak();
  }

  // Substitui o finalizarLeitura antigo
  finalizarLeitura(event?: Event): void {
    if (event) event.stopPropagation();
    this.abrirModalAvaliacao();
  }
}
