import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import ePub from 'epubjs';
import { EpubFileService } from './epub-file.service';

@Component({
  selector: 'app-epub-reader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="epub-overlay" *ngIf="aberto">
      <!-- Header -->
      <div class="epub-header">
        <button class="epub-close" (click)="fechar()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <h2>{{ titulo }}</h2>
        <div class="epub-header-actions">
          <button class="epub-nav" (click)="anterior()" title="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="epub-nav" (click)="proxima()" title="Próxima">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Área de renderização -->
      <div class="epub-area" #epubArea></div>

      <!-- Footer com progresso -->
      <div class="epub-footer">
        <span>{{ progresso }}%</span>
      </div>
    </div>
  `,
  styleUrl: './epub-reader.component.scss'
})
export class EpubReaderComponent implements OnInit, OnDestroy {
  @ViewChild('epubArea') epubArea!: ElementRef<HTMLDivElement>;

  aberto = false;
  titulo = '';
  progresso = 0;

  private book: any = null;
  private rendition: any = null;

  constructor(
    private epubFileService: EpubFileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Escuta quando um novo arquivo é setado
    this.epubFileService.arquivo$.subscribe(file => {
      if (file) {
        this.aberto = true;
        this.cdr.markForCheck();
        // Aguarda o DOM renderizar
        setTimeout(() => this.carregarEpub(file), 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.limpar();
  }

  async carregarEpub(file: File): Promise<void> {
    try {
      this.titulo = file.name.replace('.epub', '');

      // Lê o arquivo como ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Cria o book do epub.js
      this.book = ePub(arrayBuffer);

      // Cria o rendition
      this.rendition = this.book.renderTo(this.epubArea.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      // Renderiza
      await this.rendition.display();

      // Escuta mudanças de posição pra atualizar progresso
      this.rendition.on('relocated', (location: any) => {
        const percent = this.book.locations.percentageFromCfi(location.start.cfi);
        this.progresso = Math.round(percent * 100);
        this.cdr.markForCheck();
      });

      // Gera as locations (necessário pro progresso funcionar)
      await this.book.locations.generate(1000);

    } catch (err) {
      console.error('Erro ao carregar EPUB:', err);
    }
  }

  proxima(): void {
    this.rendition?.next();
  }

  anterior(): void {
    this.rendition?.prev();
  }

  fechar(): void {
    this.limpar();
    this.aberto = false;
    this.epubFileService.limpar();
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
