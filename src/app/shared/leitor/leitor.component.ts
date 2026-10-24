import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import ePub from 'epubjs';
import { Capacitor } from '@capacitor/core';
import { LeitorService, ArquivoParaAbrir } from './leitor.service';
import { aplicarPolyfillsPdfjs } from '../polyfills/uint8array-tohex.polyfill';

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
  titulo = '';
  progresso = 0;
  tipo: 'pdf' | 'epub' = 'pdf';

  // PDF
  pdfDoc: any = null;
  pdfPaginaAtual = 1;
  pdfTotalPaginas = 0;
  paginaInput: number | null = null;
  modoEscuroPdf = false;
  // EPUB
  percentInput: number | null = null;

  // Zoom
  zoom = 1.0;
  readonly zoomMin = 0.5;
  readonly zoomMax = 2.5;
  readonly zoomStep = 0.25;

  private readonly epubFontSizeBase = 100;

  private book: any = null;
  private rendition: any = null;

  private livroIdAtual = '';
  private readonly destroy$ = new Subject<void>();

  // Token para evitar race condition ao trocar de arquivo
  private carregamentoAtual = 0;

  private progressoInicial = 0;
  private paginaInicial = 1;

  constructor(
    private leitorService: LeitorService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.leitorService.arquivo$
      .pipe(takeUntil(this.destroy$))
      .subscribe((arq) => {
        if (!arq) return;

        this.livroIdAtual = arq.livroId;
        this.tipo = arq.tipo;
        this.progressoInicial = arq.progressoInicial ?? 0;   // 🆕
        this.paginaInicial = arq.paginaInicial ?? 1;         // 🆕
        this.aberto = true;
        // 🆕 Carrega preferência do modo escuro
        this.modoEscuroPdf = localStorage.getItem(this.chaveModoEscuroPdf) === '1';
        this.cdr.markForCheck();

        setTimeout(() => this.carregarArquivo(arq), 100);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.limpar();
  }

  // ============ MODO ESCURO (PDF) ============
  private get chaveModoEscuroPdf(): string {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return `modoEscuroPdf:${usuario.id || 'anon'}`;
  }

  toggleModoEscuroPdf(): void {
    this.modoEscuroPdf = !this.modoEscuroPdf;
    localStorage.setItem(
      this.chaveModoEscuroPdf,
      this.modoEscuroPdf ? '1' : '0'
    );
    this.cdr.markForCheck();
  }

  // ============ CARREGAR ARQUIVO ============
  private async carregarArquivo(arq: ArquivoParaAbrir): Promise<void> {
    const token = ++this.carregamentoAtual;

    this.titulo = this.extrairNome(arq.path);
    this.zoom = 1.0;
    this.paginaInput = null;
    this.percentInput = null;
    this.progresso = 0;
    this.cdr.markForCheck();

    // Aguarda o DOM renderizar a área correta
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Se outro arquivo foi aberto enquanto aguardávamos, aborta
    if (token !== this.carregamentoAtual) return;

    try {
      const url = Capacitor.convertFileSrc(arq.path);
      console.log('🔍 Convertendo path:', arq.path);
      console.log('🔍 URL convertida:', url);

      const response = await fetch(url);
      console.log('🔍 Fetch status:', response.status, 'ok:', response.ok);

      if (!response.ok) throw new Error('Falha ao ler arquivo');

      const arrayBuffer = await response.arrayBuffer();
      console.log('🔍 ArrayBuffer size:', arrayBuffer.byteLength);

      if (token !== this.carregamentoAtual) return;

      if (arq.tipo === 'epub') {
        await this.carregarEpub(arrayBuffer);
      } else {
        await this.carregarPdf(arrayBuffer);
      }
    } catch (err: any) {
      if (token !== this.carregamentoAtual) return;
      console.error('❌ Erro ao abrir arquivo:', err?.message || err);
      this.falharAbertura();
    }
  }

  private extrairNome(path: string): string {
    try {
      const partes = decodeURIComponent(path).split('/');
      const ultimo = partes[partes.length - 1] || 'Arquivo';
      return ultimo.replace(/\.(epub|pdf)$/i, '');
    } catch {
      return 'Arquivo';
    }
  }

  // ============ EPUB ============
  private async carregarEpub(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      this.book = ePub(arrayBuffer);

      await this.book.ready;
      await this.book.locations.generate(1000);

      if (!this.leitorArea) throw new Error('Área do leitor não disponível');

      this.rendition = this.book.renderTo(this.leitorArea.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      this.rendition.themes.register('bliteca-dark', {
        body: {
          background: '#111111',
          color: '#e0e0e0',
          padding: '20px'
        },
        'p, h1, h2, h3, h4, h5, h6, li, span, div, td, th': {
          color: '#e0e0e0'
        },
        a: {
          color: '#db7c00'
        }
      });

      this.rendition.themes.select('bliteca-dark');

      this.rendition.on('relocated', (location: any) => {
        this.zone.run(() => {
          const percent = this.book.locations.percentageFromCfi(
            location.start.cfi
          );
          this.progresso = Math.round(percent * 100);
          this.percentInput = this.progresso;
          this.cdr.markForCheck();
        });
      });

      // 🆕 Restaura posição aproximada via %
      let cfiInicial: string | undefined;
      if (this.progressoInicial > 0 && this.progressoInicial <= 100) {
        try {
          const cfi = this.book.locations.cfiFromPercentage(this.progressoInicial / 100);
          if (cfi) {
            cfiInicial = cfi;
            // Atualiza o estado interno para refletir a posição inicial
            this.progresso = this.progressoInicial;
            this.percentInput = this.progressoInicial;
            console.log('🔍 EPUB abrindo em', this.progressoInicial + '%', '| CFI:', cfi);
          }
        } catch (e) {
          console.warn('⚠️ Não foi possível restaurar posição do EPUB:', e);
        }
      }

      await this.rendition.display(cfiInicial);
    } catch (err: any) {
      console.error('❌ Erro EPUB detalhado:', this.serializarErro(err));
      this.falharAbertura();
    }
  }

  // ============ PDF ============
  private async carregarPdf(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      // ⚠️ Aplicar ANTES do import do pdfjs-dist
      aplicarPolyfillsPdfjs();
      const pdfjsLib = await import('pdfjs-dist');

      // Worker servido via assets (já versionado em src/assets/pdf.worker.min.mjs).
      // Mantenha a versão do worker igual à do pdfjs-dist instalado.
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        '/assets/pdf.worker.min.mjs',
        window.location.origin
      ).toString();

      console.log('🔍 pdfjs versão:', pdfjsLib.version);

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer)
      }).promise;

      this.pdfDoc = pdf;
      this.pdfTotalPaginas = pdf.numPages;
      this.pdfPaginaAtual = 1;


      const paginaAlvo = Math.max(1, Math.min(this.paginaInicial, pdf.numPages));
      this.pdfPaginaAtual = paginaAlvo;

      console.log('🔍 PDF carregado, páginas:', pdf.numPages, '| abrindo na página:', paginaAlvo);
      this.cdr.markForCheck();

      await this.renderizarPaginaPdf(paginaAlvo);
    } catch (err: any) {
      console.error('❌ Erro PDF detalhado:', this.serializarErro(err));
      this.falharAbertura();
    }
  }

  private serializarErro(err: any): string {
    return JSON.stringify({
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.substring(0, 500),
      err: String(err),
      keys: err ? Object.keys(err) : []
    });
  }

  private falharAbertura(): void {
    this.leitorService.emitirArquivoInacessivel();
    this.aberto = false;
    this.leitorService.limpar();
    this.cdr.markForCheck();
  }

  // ============ NAVEGAÇÃO PDF ============
  pdfProxima(): void {
    if (this.pdfPaginaAtual < this.pdfTotalPaginas) {
      this.renderizarPaginaPdf(this.pdfPaginaAtual + 1);
    }
  }

  pdfAnterior(): void {
    if (this.pdfPaginaAtual > 1) {
      this.renderizarPaginaPdf(this.pdfPaginaAtual - 1);
    }
  }

  // ============ NAVEGAÇÃO EPUB ============
  proxima(): void {
    this.rendition?.next();
  }

  anterior(): void {
    this.rendition?.prev();
  }

  // ============ ZOOM ============
  zoomIn(): void {
    if (this.zoom >= this.zoomMax) return;
    this.zoom = Math.min(this.zoomMax, this.zoom + this.zoomStep);
    this.aplicarZoom();
  }

  zoomOut(): void {
    if (this.zoom <= this.zoomMin) return;
    this.zoom = Math.max(this.zoomMin, this.zoom - this.zoomStep);
    this.aplicarZoom();
  }

  zoomReset(): void {
    this.zoom = 1.0;
    this.aplicarZoom();
  }

  private aplicarZoom(): void {
    if (this.tipo === 'pdf') {
      this.renderizarPaginaPdf(this.pdfPaginaAtual);
    } else if (this.tipo === 'epub' && this.rendition) {
      const fontSizePercent = Math.round(this.epubFontSizeBase * this.zoom);
      this.rendition.themes.fontSize(`${fontSizePercent}%`);
    }
    this.cdr.markForCheck();
  }

  // ============ IR PARA PÁGINA (PDF) ============
  irParaPagina(): void {
    if (!this.pdfTotalPaginas || this.paginaInput == null) return;

    let destino = Math.floor(Number(this.paginaInput));
    if (isNaN(destino)) {
      this.paginaInput = this.pdfPaginaAtual;
      return;
    }

    destino = Math.max(1, Math.min(this.pdfTotalPaginas, destino));

    if (destino === this.pdfPaginaAtual) {
      this.paginaInput = destino;
      return;
    }

    this.renderizarPaginaPdf(destino).then(() => {
      this.paginaInput = this.pdfPaginaAtual;
      this.cdr.markForCheck();
    });
  }

  // ============ IR PARA % (EPUB) ============
  irParaPercent(): void {
    if (!this.book || !this.rendition || this.percentInput == null) return;

    let destino = Math.floor(Number(this.percentInput));
    if (isNaN(destino)) {
      this.percentInput = this.progresso;
      return;
    }

    destino = Math.max(0, Math.min(100, destino));

    const cfi = this.book.locations.cfiFromPercentage(destino / 100);
    if (cfi) {
      this.rendition.display(cfi);
      this.percentInput = destino;
    }
  }

  pularPercent(delta: number): void {
    if (!this.book || !this.rendition) return;

    const novo = Math.max(0, Math.min(100, this.progresso + delta));
    const cfi = this.book.locations.cfiFromPercentage(novo / 100);
    if (cfi) {
      this.rendition.display(cfi);
    }
  }

  // ============ RENDER PDF ============
   private async renderizarPaginaPdf(numeroPagina: number): Promise<void> {
    console.log('🔍 [1] renderizarPaginaPdf chamado. Página:', numeroPagina);
    console.log('🔍 [2] pdfDoc existe?', !!this.pdfDoc);
    console.log('🔍 [3] canvasPdf existe?', !!this.canvasPdf?.nativeElement);

    if (!this.pdfDoc) {
      console.warn('⚠️ pdfDoc null, abortando');
      return;
    }
    if (!this.canvasPdf?.nativeElement) {
      console.warn('⚠️ canvasPdf null, abortando');
      return;
    }

    try {
      console.log('🔍 [4] Obtendo página', numeroPagina);
      const pagina = await this.pdfDoc.getPage(numeroPagina);
      console.log('🔍 [5] Página obtida');

      const viewport = pagina.getViewport({ scale: 1.5 * this.zoom });
      console.log('🔍 [6] Viewport:', viewport.width, 'x', viewport.height);

      const canvas = this.canvasPdf.nativeElement;
      console.log('🔍 [7] Canvas ANTES:', canvas.width, 'x', canvas.height);

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      console.log('🔍 [8] Canvas DEPOIS:', canvas.width, 'x', canvas.height);

      const context = canvas.getContext('2d');
      console.log('🔍 [9] Contexto 2D:', !!context);

      if (!context) throw new Error('Contexto 2D não disponível');

      console.log('🔍 [10] Chamando pagina.render()...');

      const renderTask = pagina.render({
        canvasContext: context,
        viewport
      });

      console.log('🔍 [11] renderTask criado, aguardando promise...');

      await renderTask.promise;

      console.log('🔍 [12] ✅ Render concluído!');

      // Verifica se realmente desenhou algo
      const rect = canvas.getBoundingClientRect();
      console.log('🔍 [13] Canvas rect final:', {
        attrW: canvas.width,
        attrH: canvas.height,
        cssW: Math.round(rect.width),
        cssH: Math.round(rect.height),
        display: getComputedStyle(canvas).display
      });

      // Verifica se há pixels desenhados (amostra no centro)
      try {
        const dadosCentro = context.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1, 1
        ).data;
        console.log('🔍 [14] Pixel central RGBA:', Array.from(dadosCentro));
      } catch (e) {
        console.warn('🔍 [14] Não conseguiu ler pixel:', e);
      }

      this.pdfPaginaAtual = numeroPagina;
      this.paginaInput = numeroPagina;
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('❌ Erro ao renderizar página:');
      console.error('  name:', err?.name);
      console.error('  message:', err?.message);
      console.error('  stack:', err?.stack);
      console.error('  erro completo:', err);
    }
  }

  // ============ FECHAR / LIMPAR ============
  fechar(): void {
    // 🔥 NOVO: calcula progresso real para PDF
    let progressoFinal = this.progresso;
    if (this.tipo === 'pdf' && this.pdfTotalPaginas > 0) {
      progressoFinal = Math.round((this.pdfPaginaAtual / this.pdfTotalPaginas) * 100);
    }

    this.leitorService.emitirProgresso({
      paginaAtual: this.tipo === 'pdf' ? this.pdfPaginaAtual : null,
      totalPaginas: this.tipo === 'pdf' ? this.pdfTotalPaginas : null,
      progresso: progressoFinal || null
    });

    this.limpar();
    this.aberto = false;
    this.zoom = 1.0;
    this.paginaInput = null;
    this.percentInput = null;
    this.progresso = 0;
    this.leitorService.limpar();
    this.cdr.markForCheck();
  }

  private limpar(): void {
    try {
      this.rendition?.destroy();
    } catch (e) {
      console.warn('⚠️ Erro ao destruir rendition:', e);
    }
    this.rendition = null;

    try {
      this.book?.destroy();
    } catch (e) {
      console.warn('⚠️ Erro ao destruir book:', e);
    }
    this.book = null;

    try {
      this.pdfDoc?.destroy?.();
    } catch (e) {
      console.warn('⚠️ Erro ao destruir pdfDoc:', e);
    }
    this.pdfDoc = null;
  }
}
