import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import ePub from 'epubjs';
import { LeitorService } from './leitor.service';

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

  // EPUB
  percentInput: number | null = null;

  // Zoom
  zoom = 1.0;
  zoomMin = 0.5;
  zoomMax = 2.5;
  zoomStep = 0.25;

  // EPUB: fonte base
  private epubFontSizeBase = 100; // %

  private book: any = null;
  private rendition: any = null;

  constructor(
    private leitorService: LeitorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.leitorService.arquivo$.subscribe((file: File | null) => {
      if (file) {
        this.aberto = true;
        this.cdr.markForCheck();
        setTimeout(() => this.carregarArquivo(file), 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.limpar();
  }

  // ============ CARREGAR ARQUIVO ============
  async carregarArquivo(file: File): Promise<void> {
    this.titulo = file.name.replace(/\.(epub|pdf)$/i, '');
    this.zoom = 1.0;
    this.paginaInput = null;
    this.percentInput = null;
    this.progresso = 0;

    const isEpub = file.name.toLowerCase().endsWith('.epub');
    this.tipo = isEpub ? 'epub' : 'pdf';

    this.cdr.markForCheck();

    // Aguarda o DOM renderizar a área correta
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isEpub) {
      await this.carregarEpub(file);
    } else {
      await this.carregarPdf(file);
    }
  }

  // ============ EPUB ============
  private async carregarEpub(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.book = ePub(arrayBuffer);

      // 🆕 Gera locations ANTES de renderizar (necessário pra % funcionar)
      await this.book.ready;
      await this.book.locations.generate(1000);

      this.rendition = this.book.renderTo(this.leitorArea.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      // Tema escuro DENTRO do iframe
      this.rendition.themes.register('bliteca-dark', {
        body: {
          background: '#111111',
          color: '#e0e0e0',
          'padding': '20px'
        },
        'p, h1, h2, h3, h4, h5, h6, li, span, div, td, th': {
          color: '#e0e0e0'
        },
        a: {
          color: '#db7c00'
        }
      });

      this.rendition.themes.select('bliteca-dark');

      // 🆕 Registra listener ANTES do display pra pegar o primeiro relocated
      this.rendition.on('relocated', (location: any) => {
        const percent = this.book.locations.percentageFromCfi(location.start.cfi);
        this.progresso = Math.round(percent * 100);
        this.percentInput = this.progresso;
        this.cdr.markForCheck();
      });

      await this.rendition.display();
    } catch (err) {
      console.error('Erro ao carregar EPUB:', err);
    }
  }

  // ============ PDF ============
  private async carregarPdf(file: File): Promise<void> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      this.pdfDoc = pdf;
      this.pdfTotalPaginas = pdf.numPages;
      this.pdfPaginaAtual = 1;

      this.cdr.markForCheck();

      await this.renderizarPaginaPdf(1);
    } catch (err) {
      console.error('Erro ao carregar PDF:', err);
    }
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
    if (!this.pdfTotalPaginas || !this.paginaInput) return;

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
    if (!this.book || !this.rendition || this.percentInput === null) return;

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
    if (!this.pdfDoc) return;

    try {
      const pagina = await this.pdfDoc.getPage(numeroPagina);
      const viewport = pagina.getViewport({ scale: 1.5 * this.zoom });

      const canvas = this.canvasPdf!.nativeElement;
      const context = canvas.getContext('2d')!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await pagina.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;

      this.pdfPaginaAtual = numeroPagina;
      this.paginaInput = numeroPagina;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Erro ao renderizar página:', err);
    }
  }

  // ============ FECHAR / LIMPAR ============
  fechar(): void {
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
    if (this.rendition) {
      this.rendition.destroy();
      this.rendition = null;
    }
    if (this.book) {
      this.book.destroy();
      this.book = null;
    }
  }
}
