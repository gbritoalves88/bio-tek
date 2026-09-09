// src/app/shared/book-scanner/book-scanner.service.ts
import { Injectable } from '@angular/core';
import { createWorker, Worker } from 'tesseract.js';
import { BehaviorSubject } from 'rxjs';
import { BookInfo } from './book-scanner.model';


@Injectable({
  providedIn: 'root'
})
export class BookScannerService {
  private worker: Worker | null = null;
  private isProcessing = false;
  private lastText = '';

  public resultado$ = new BehaviorSubject<BookInfo | null>(null);
  public status$ = new BehaviorSubject<string>('inativo');

  async init(): Promise<void> {
    if (!this.worker) {
      this.worker = await createWorker('por+eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:-()',
        preserve_interword_spaces: '1',
      });
    }
  }

  async scanFrame(videoElement: HTMLVideoElement): Promise<BookInfo | null> {
    if (this.isProcessing || !this.worker) return null;

    this.isProcessing = true;
    this.status$.next('escaneando');

    try {
      const canvas = this.captureFrame(videoElement);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);

      const result = await this.worker.recognize(imageData);
      const text = result.data.text.trim();
      const confidence = result.data.confidence;

      if (text !== this.lastText && confidence > 60 && text.length > 3) {
        this.lastText = text;

        const bookInfo = this.parseBookInfo(text, confidence);
        if (bookInfo.titulo) {
          this.resultado$.next(bookInfo);
          this.status$.next('encontrado');
          return bookInfo;
        }
      }

      return null;
    } catch (error) {
      console.error('Erro no OCR:', error);
      this.status$.next('erro');
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  async startLoop(videoElement: HTMLVideoElement): Promise<void> {
    await this.init();

    const loop = async () => {
      if (videoElement.readyState === 4) {
        await this.scanFrame(videoElement);
      }
      setTimeout(loop, 2000);
    };

    loop();
  }

  private captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  private parseBookInfo(text: string, confidence: number): BookInfo {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2);

    const titulo = lines[0] || '';
    const autor = this.findAuthor(lines);

    return { titulo, autor, confianca: Math.round(confidence) };
  }

  private findAuthor(lines: string[]): string {
    const patterns = ['por', 'by', 'de', 'autor', 'author', 'escrito'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (patterns.some(p => line.includes(p))) {
        return lines[i + 1] || '';
      }
    }

    return '';
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.lastText = '';
    this.resultado$.next(null);
    this.status$.next('inativo');
  }
}
