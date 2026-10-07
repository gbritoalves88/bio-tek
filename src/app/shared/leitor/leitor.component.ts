import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import ePub from 'epubjs';
import { LeitorService } from './leitor.service';

@Component({
  selector: 'app-leitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leitor-overlay" *ngIf="aberto">
      <!-- Header -->
      <div class="leitor-header">
        <button class="leitor-close" (click)="fechar()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2>{{ titulo }}</h2>
        <div class="leitor-header-actions" *ngIf="tipo === 'epub'">
          <button class="leitor-nav" (click)="anterior()" title="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="leitor-nav" (click)="proxima()" title="Próxima">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Área EPUB -->
      <div class="leitor-area" #leitorArea *ngIf="tipo === 'epub'"></div>

      <!-- Área PDF -->
       <div class="leitor-area-pdf" *ngIf="tipo === 'pdf'">
        <canvas #canvasPdf></canvas>
      </div>

      <!-- 🆕 Controles PDF -->
      <div class="pdf-controles" *ngIf="tipo === 'pdf'">
        <button class="pdf-nav" (click)="pdfAnterior()" [disabled]="pdfPaginaAtual <= 1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="pdf-pagina">{{ pdfPaginaAtual }} / {{ pdfTotalPaginas }}</span>
        <button class="pdf-nav" (click)="pdfProxima()" [disabled]="pdfPaginaAtual >= pdfTotalPaginas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Footer -->
      <div class="leitor-footer" *ngIf="tipo === 'epub'">
        <span>{{ progresso }}%</span>
      </div>
    </div>
  `,
  styleUrl: './leitor.component.scss'
})
export class LeitorComponent implements OnInit, OnDestroy {
  @ViewChild('leitorArea') leitorArea!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasPdf') canvasPdf?: ElementRef<HTMLCanvasElement>;

  aberto = false;
  titulo = '';
  progresso = 0;
  tipo: 'pdf' | 'epub' = 'pdf';
  pdfDoc: any = null;
  pdfPaginaAtual = 1;
  pdfTotalPaginas = 0;

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

  async carregarArquivo(file: File): Promise<void> {
    this.titulo = file.name.replace(/\.(epub|pdf)$/i, '');

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

      this.rendition = this.book.renderTo(this.leitorArea.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      // 🆕 Aplica tema escuro DENTRO do iframe do epub
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

      await this.rendition.display();

      this.rendition.on('relocated', (location: any) => {
        const percent = this.book.locations.percentageFromCfi(location.start.cfi);
        this.progresso = Math.round(percent * 100);
        this.cdr.markForCheck();
      });

      await this.book.locations.generate(1000);
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

        // 🆕 Guarda o documento e total de páginas
        this.pdfDoc = pdf;
        this.pdfTotalPaginas = pdf.numPages;
        this.pdfPaginaAtual = 1;

        this.cdr.markForCheck();

        // Renderiza a primeira página
        await this.renderizarPaginaPdf(1);

      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
      }
    }

      // 🆕 Renderiza uma página específica do PDF
  private async renderizarPaginaPdf(numeroPagina: number): Promise<void> {
    if (!this.pdfDoc) return;

    try {
      const pagina = await this.pdfDoc.getPage(numeroPagina);
      const viewport = pagina.getViewport({ scale: 1.5 });

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
      this.cdr.markForCheck();

    } catch (err) {
      console.error('Erro ao renderizar página:', err);
    }
  }

  // 🆕 Navegação do PDF
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

  // ============ CONTROLES ============
  proxima(): void {
    this.rendition?.next();
  }

  anterior(): void {
    this.rendition?.prev();
  }

  fechar(): void {
    this.limpar();
    this.aberto = false;
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
