import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, NgZone,
  Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import ePub from 'epubjs';
import { Capacitor } from '@capacitor/core';
import { LeitorService } from './leitor.service';
import { aplicarPolyfillsPdfjs } from '../polyfills/uint8array-tohex.polyfill';
import { ArquivoParaAbrir } from './leitor.model';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-leitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leitor.component.html',
  styleUrl: './leitor.component.scss'
})
export class LeitorComponent implements OnInit, OnDestroy {
  @ViewChild('leitorArea') leitorArea!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasPdf') canvasPdf?: ElementRef<HTMLCanvasElement>;

  aberto = false;
  carregandoArquivo = false;
  titulo = '';
  progresso = 0;
  tipo: 'pdf' | 'epub' = 'pdf';

  // PDF
  pdfDoc: any = null;
  pdfPaginaAtual = 1;
  pdfTotalPaginas = 0;
  paginaInput: number | null = null;
  ajusteLarguraPdf = false;

  // EPUB
  percentInput: number | null = null;
  cfiAtual: string | null = null;
  tamanhoFonte: number = 100;

  // Configurações Unificadas
  menuAaAberto = false;
  temaLeitura: 'light' | 'dark' | 'sepia' = 'sepia';

  // 🆕 Guarda o nome real do livro para o cabeçalho
  nomeLivroExibicao = '';

  // Zoom Geral
  zoom = 1.0;
  readonly zoomMin = 0.5;
  readonly zoomMax = 2.5;
  readonly zoomStep = 0.25;

  private book: any = null;
  private rendition: any = null;

  private livroIdAtual = '';
  private readonly destroy$ = new Subject<void>();
  private carregamentoAtual = 0;
  private progressoInicial = 0;
  private paginaInicial = 1;
  private cfiInicial?: string;

  constructor(
    private leitorService: LeitorService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.carregarPreferencias();

    this.leitorService.arquivo$.pipe(takeUntil(this.destroy$)).subscribe((arq) => {
      if (!arq) return;

      this.livroIdAtual = arq.livroId;
      this.tipo = arq.tipo;
      this.progressoInicial = arq.progressoInicial ?? 0;
      this.paginaInicial = arq.paginaInicial ?? 1;
      this.cfiInicial = arq.cfiInicial;

      // 🆕 Pega o título correto do objeto que veio da Home
      const nomeReal = arq.tituloLivro || this.extrairNome(arq.path);

      this.titulo = nomeReal;
      this.nomeLivroExibicao = nomeReal; // Trava o nome no cabeçalho
      this.titleService.setTitle(nomeReal);

      this.aberto = true;
      this.cdr.markForCheck();

      setTimeout(() => this.carregarArquivo(arq), 100);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.limpar();
  }

  private async carregarArquivo(arq: ArquivoParaAbrir): Promise<void> {
    const token = ++this.carregamentoAtual;

    this.carregandoArquivo = true;
    this.cdr.detectChanges();

    this.zoom = 1.0;
    this.paginaInput = null;
    this.percentInput = null;
    this.progresso = 0;
    this.cdr.markForCheck();

    await new Promise((resolve) => setTimeout(resolve, 150));
    if (token !== this.carregamentoAtual) return;

    try {
      const url = Capacitor.convertFileSrc(arq.path);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao ler arquivo');

      const arrayBuffer = await response.arrayBuffer();
      if (token !== this.carregamentoAtual) return;

      if (arq.tipo === 'epub') {
        await this.carregarEpub(arrayBuffer);
      } else {
        await this.carregarPdf(arrayBuffer);
      }
    } catch (err: any) {
      if (token !== this.carregamentoAtual) return;
      console.error('❌ Erro ao abrir arquivo:', err);
      this.falharAbertura();
    } finally {
      if (token === this.carregamentoAtual) {
        this.carregandoArquivo = false;
        this.cdr.detectChanges();
      }
    }
  }

  private extrairNome(path: string): string {
    try {
      const partes = decodeURIComponent(path).split('/');
      return (partes[partes.length - 1] || 'Arquivo').replace(/\.(epub|pdf)$/i, '');
    } catch { return 'Arquivo'; }
  }

  // ============ EPUB ============
  private async carregarEpub(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Arquivo EPUB vazio ou inválido');
      }

      const blob = new Blob([arrayBuffer], { type: 'application/epub+zip' });
      this.book = ePub(blob as any);
      await this.book.ready;
      await this.book.locations.generate(1000);

      if (!this.leitorArea || !this.leitorArea.nativeElement) {
        throw new Error('Área não disponível');
      }

      this.rendition = this.book.renderTo(this.leitorArea.nativeElement, {
        width: '100%', height: '100%', spread: 'none', allowScriptedContent: true
      });

      this.rendition.themes.register('bliteca-light', {
        body: { background: '#ffffff', color: '#333333', padding: '20px' },
        'p, h1, h2, h3, h4, h5, h6, li, span, div, td, th': { color: '#333333' },
        a: { color: '#db7c00' }
      });
      this.rendition.themes.register('bliteca-dark', {
        body: { background: '#111111', color: '#e0e0e0', padding: '20px' },
        'p, h1, h2, h3, h4, h5, h6, li, span, div, td, th': { color: '#e0e0e0' },
        a: { color: '#db7c00' }
      });
      this.rendition.themes.register('bliteca-sepia', {
        body: { background: '#f4ecd8', color: '#000000', padding: '20px' },
        'p, h1, h2, h3, h4, h5, h6, li, span, div, td, th': { color: '#000000' },
        a: { color: '#db7c00' }
      });

      this.rendition.themes.select(`bliteca-${this.temaLeitura}`);
      this.rendition.themes.fontSize(`${this.tamanhoFonte}%`);

      this.rendition.on('relocated', (location: any) => {
        this.zone.run(() => {
          this.cfiAtual = location.start.cfi;
          const percent = this.book.locations.percentageFromCfi(this.cfiAtual);
          this.progresso = Math.round(percent * 100);
          this.percentInput = this.progresso;
          this.cdr.markForCheck();
        });
      });

      let targetCfi = this.cfiInicial;
      if (!targetCfi && this.progressoInicial > 0) {
        targetCfi = this.book.locations.cfiFromPercentage(this.progressoInicial / 100);
      }

      await this.rendition.display(targetCfi || undefined);

    } catch (err: any) {
      console.error('❌ Erro detalhado ao carregar EPUB:', err);
      throw err;
    }
  }

  // ============ PDF ============
  private async carregarPdf(arrayBuffer: ArrayBuffer): Promise<void> {
    aplicarPolyfillsPdfjs();
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/assets/pdf.worker.min.mjs', window.location.origin).toString();

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    this.pdfDoc = pdf;
    this.pdfTotalPaginas = pdf.numPages;
    this.pdfPaginaAtual = Math.max(1, Math.min(this.paginaInicial, pdf.numPages));
    this.cdr.markForCheck();

    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.renderizarPaginaPdf(this.pdfPaginaAtual);
  }

  // ============ PREFERÊNCIAS ============
  private carregarPreferencias(): void {
    const prefsEpub = localStorage.getItem('bliteca_epub_prefs');
    if (prefsEpub) {
      const parsed = JSON.parse(prefsEpub);
      this.temaLeitura = parsed.tema === 'light' ? 'sepia' : (parsed.tema || 'sepia');
      this.tamanhoFonte = parsed.fonte || 100;
    }

    const prefsPdf = localStorage.getItem('bliteca_pdf_prefs');
    if (prefsPdf) {
      const parsed = JSON.parse(prefsPdf);
      if (!prefsEpub) this.temaLeitura = parsed.tema || 'sepia';
      this.ajusteLarguraPdf = parsed.ajusteLargura || false;
    }
  }

  private salvarPreferencias(): void {
    if (this.tipo === 'epub') {
      localStorage.setItem('bliteca_epub_prefs', JSON.stringify({
        tema: this.temaLeitura,
        fonte: this.tamanhoFonte
      }));
    } else {
      localStorage.setItem('bliteca_pdf_prefs', JSON.stringify({
        tema: this.temaLeitura,
        ajusteLargura: this.ajusteLarguraPdf
      }));
    }
  }

  toggleMenuAa(): void {
    this.menuAaAberto = !this.menuAaAberto;
    this.cdr.markForCheck();
  }

  mudarTema(tema: 'light' | 'dark' | 'sepia'): void {
    if (this.temaLeitura === tema) return;
    this.temaLeitura = tema;

    if (this.tipo === 'epub' && this.rendition) {
      const location = this.rendition.currentLocation();
      const cfi = location?.start?.cfi;
      this.rendition.themes.select(`bliteca-${this.temaLeitura}`);
      if (cfi) this.rendition.display(cfi);
    }

    this.salvarPreferencias();
    this.cdr.detectChanges();
  }

  // ============ CONTROLES ============
  aumentarFonte(): void {
    if (this.tamanhoFonte >= 200) return;
    this.tamanhoFonte += 10;
    this.aplicarConfiguracoesEpub();
  }

  diminuirFonte(): void {
    if (this.tamanhoFonte <= 70) return;
    this.tamanhoFonte -= 10;
    this.aplicarConfiguracoesEpub();
  }

  private aplicarConfiguracoesEpub(): void {
    if (!this.rendition) return;
    const location = this.rendition.currentLocation();
    const cfi = location?.start?.cfi;
    this.rendition.themes.fontSize(`${this.tamanhoFonte}%`);
    if (cfi) this.rendition.display(cfi);
    this.salvarPreferencias();
    this.cdr.markForCheck();
  }

  ajustarLargura(): void {
    this.ajusteLarguraPdf = !this.ajusteLarguraPdf;
    if (this.ajusteLarguraPdf) this.zoom = 1.0;
    this.renderizarPaginaPdf(this.pdfPaginaAtual);
    this.salvarPreferencias();
  }

  pdfProxima(): void {
    if (this.pdfPaginaAtual < this.pdfTotalPaginas) this.renderizarPaginaPdf(this.pdfPaginaAtual + 1);
  }
  pdfAnterior(): void {
    if (this.pdfPaginaAtual > 1) this.renderizarPaginaPdf(this.pdfPaginaAtual - 1);
  }

  proxima(): void { this.rendition?.next(); }
  anterior(): void { this.rendition?.prev(); }

  zoomIn(): void {
    this.ajusteLarguraPdf = false;
    if (this.zoom >= this.zoomMax) return;
    this.zoom = Math.min(this.zoomMax, this.zoom + this.zoomStep);
    this.renderizarPaginaPdf(this.pdfPaginaAtual);
  }
  zoomOut(): void {
    this.ajusteLarguraPdf = false;
    if (this.zoom <= this.zoomMin) return;
    this.zoom = Math.max(this.zoomMin, this.zoom - this.zoomStep);
    this.renderizarPaginaPdf(this.pdfPaginaAtual);
  }
  zoomReset(): void {
    this.ajusteLarguraPdf = false;
    this.zoom = 1.0;
    this.renderizarPaginaPdf(this.pdfPaginaAtual);
  }

  irParaPagina(): void {
    if (!this.pdfTotalPaginas || this.paginaInput == null) return;
    let destino = Math.floor(Number(this.paginaInput));
    if (isNaN(destino)) { this.paginaInput = this.pdfPaginaAtual; return; }
    destino = Math.max(1, Math.min(this.pdfTotalPaginas, destino));
    this.renderizarPaginaPdf(destino).then(() => {
      this.paginaInput = this.pdfPaginaAtual;
      this.cdr.markForCheck();
    });
  }

  irParaPercent(): void {
    if (!this.book || !this.rendition || this.percentInput == null) return;
    let destino = Math.floor(Number(this.percentInput));
    if (isNaN(destino)) { this.percentInput = this.progresso; return; }
    destino = Math.max(0, Math.min(100, destino));
    const cfi = this.book.locations.cfiFromPercentage(destino / 100);
    if (cfi) { this.rendition.display(cfi); this.percentInput = destino; }
  }

  onSliderChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = Number(input.value);

    if (this.tipo === 'pdf') {
      this.paginaInput = valor;
      this.irParaPagina();
    } else {
      this.percentInput = valor;
      this.irParaPercent();
    }
  }


  private async renderizarPaginaPdf(numeroPagina: number): Promise<void> {
    if (!this.pdfDoc || !this.canvasPdf?.nativeElement) return;

    try {
      const pagina = await this.pdfDoc.getPage(numeroPagina);

      let escala = 1.5 * this.zoom;
      if (this.ajusteLarguraPdf) {
        const containerWidth = this.canvasPdf.nativeElement.parentElement?.clientWidth || window.innerWidth;
        const viewportOriginal = pagina.getViewport({ scale: 1 });
        escala = (containerWidth - 32) / viewportOriginal.width;
      }

      const viewport = pagina.getViewport({ scale: escala });
      const canvas = this.canvasPdf.nativeElement;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Contexto 2D não disponível');

      await pagina.render({ canvasContext: context, viewport }).promise;

      this.pdfPaginaAtual = numeroPagina;
      this.paginaInput = numeroPagina;

      if (this.pdfTotalPaginas > 0) {
        this.progresso = Math.round((numeroPagina / this.pdfTotalPaginas) * 100);
      }

      this.cdr.markForCheck();
    } catch (err) {
      console.error('❌ Erro ao renderizar PDF:', err);
    }
  }

  private falharAbertura(): void {
    this.fechar(false);
    this.leitorService.emitirArquivoInacessivel();
  }

  fechar(salvarProgresso: boolean = true): void {
    const progressoFinal = this.progresso;
    const cfiFinal = this.cfiAtual;
    const paginaAtualPdf = this.pdfPaginaAtual;
    const totalPaginasPdf = this.pdfTotalPaginas;

    if (salvarProgresso) {
      const progressoFinal = this.progresso;
      const cfiFinal = this.cfiAtual;
      const paginaAtualPdf = this.pdfPaginaAtual;
      const totalPaginasPdf = this.pdfTotalPaginas;

      this.leitorService.emitirProgresso({
        paginaAtual: this.tipo === 'pdf' ? paginaAtualPdf : null,
        totalPaginas: this.tipo === 'pdf' ? totalPaginasPdf : null,
        progresso: progressoFinal || null,
        cfi: this.tipo === 'epub' ? cfiFinal : null
      });
    }

    this.titleService.setTitle('BliTeca');

    this.limpar();
    this.aberto = false;
    this.zoom = 1.0;
    this.paginaInput = null;
    this.percentInput = null;
    this.progresso = 0;
    this.cfiAtual = null;
    this.menuAaAberto = false;
    this.leitorService.limpar();
    this.cdr.markForCheck();
  }

  private limpar(): void {
    try { this.rendition?.destroy(); } catch (e) {}
    this.rendition = null;
    try { this.book?.destroy(); } catch (e) {}
    this.book = null;
    try { this.pdfDoc?.destroy?.(); } catch (e) {}
    this.pdfDoc = null;
  }
}
