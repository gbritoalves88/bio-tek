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
  private tentativasSemResultado = 0;

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
      // 🆕 1. Capturar frame em alta resolução
      const canvas = this.captureFrameHighRes(videoElement);

      // 🆕 2. Pré-processar (melhorar contraste)
      const processedCanvas = this.preprocessForOCR(canvas);

      // 🆕 3. Recortar área central (onde fica o título)
      const croppedCanvas = this.cropTitleArea(processedCanvas);

      // 🆕 4. Converter para data URL
      const imageData = croppedCanvas.toDataURL('image/jpeg', 0.95);

      // 🆕 5. OCR com configurações otimizadas
      const result = await this.worker.recognize(imageData);
      const text = result.data.text.trim();
      const confidence = result.data.confidence;

      // 🆕 6. Se confiança baixa, tentar com a imagem completa
      let finalResult = result;
      if (confidence < 60) {
        const fullImageData = processedCanvas.toDataURL('image/jpeg', 0.95);
        finalResult = await this.worker.recognize(fullImageData);
      }

      const finalText = finalResult.data.text.trim();
      const finalConfidence = finalResult.data.confidence;

      // 🆕 7. Processar se texto mudou e tem confiança mínima
      if (finalText !== this.lastText && finalConfidence > 50 && finalText.length > 3) {
        this.lastText = finalText;
        this.tentativasSemResultado = 0;

        const bookInfo = this.parseBookInfo(finalText, finalConfidence);
        if (bookInfo.titulo) {
          this.resultado$.next(bookInfo);
          this.status$.next('encontrado');
          return bookInfo;
        }
      } else {
        this.tentativasSemResultado++;
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

    // 🆕 Loop com intervalo adaptativo
    const loop = async () => {
      if (videoElement.readyState === 4) {
        await this.scanFrame(videoElement);
      }

      // 🆕 Se muitas tentativas sem resultado, aumentar intervalo
      const intervalo = this.tentativasSemResultado > 10 ? 3000 : 1500;
      setTimeout(loop, intervalo);
    };

    loop();
  }

  // 🆕 Capturar frame em alta resolução
  private captureFrameHighRes(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    // Usar resolução nativa do vídeo (até 1280x720)
    const maxWidth = 1280;
    const maxHeight = 720;

    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    // Manter proporção
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }

    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = width * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, width, height);

    return canvas;
  }

  // 🆕 Pré-processamento para melhorar OCR
  private preprocessForOCR(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 🆕 1. Converter para escala de cinza
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    // 🆕 2. Aumentar contraste (histogram stretching)
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    const range = max - min || 1;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const contrast = ((gray - min) / range) * 255;
      data[i] = contrast;
      data[i + 1] = contrast;
      data[i + 2] = contrast;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // 🆕 Recortar área do título (centro da capa)
  private cropTitleArea(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const width = canvas.width;
    const height = canvas.height;

    // 🆕 O título geralmente está no terço superior-central
    const cropX = width * 0.05;
    const cropY = height * 0.1;
    const cropWidth = width * 0.9;
    const cropHeight = height * 0.5;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return croppedCanvas;
  }

  // 🆕 Parse melhorado do texto
  private parseBookInfo(text: string, confidence: number): BookInfo {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2);

    // 🆕 Remover linhas com muitos números (provável ISBN)
    const filteredLines = lines.filter(l => {
      const numbers = l.match(/[0-9]/g);
      return !numbers || numbers.length < l.length * 0.5;
    });

    // 🆕 Título = linha mais longa (geralmente é o título)
    let titulo = '';
    let autor = '';

    if (filteredLines.length > 0) {
      // Ordenar por tamanho (decrescente)
      const sortedByLength = [...filteredLines].sort((a, b) => b.length - a.length);

      // Título = linha mais longa (ignorando conectivos)
      titulo = sortedByLength[0] || filteredLines[0] || '';

      // Autor = procurar padrões
      autor = this.findAuthor(filteredLines);

      // Se não achou autor, tentar segunda linha mais longa
      if (!autor && sortedByLength.length > 1) {
        autor = sortedByLength[1];
      }
    }

    // 🆕 Limpar texto
    titulo = this.cleanText(titulo);
    autor = this.cleanText(autor);

    return { titulo, autor, confianca: Math.round(confidence) };
  }

  // 🆕 Encontrar autor com mais padrões
  private findAuthor(lines: string[]): string {
    const patterns = [
      'por', 'by', 'de', 'autor', 'author', 'escrito',
      'escrita', 'written', 'tradução', 'traducao'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      if (patterns.some(p => line.includes(p))) {
        // Verificar se o padrão está sozinho ou junto com o nome
        const nextLine = lines[i + 1] || '';
        const currentLine = lines[i];

        if (nextLine && nextLine.length > 2) {
          return nextLine;
        }

        // Se o padrão está na mesma linha (ex: "por Tolkien")
        const patternIndex = patterns.findIndex(p => line.includes(p));
        if (patternIndex > -1) {
          const pattern = patterns[patternIndex];
          const afterPattern = currentLine.toLowerCase().split(pattern)[1];
          if (afterPattern && afterPattern.trim().length > 2) {
            return afterPattern.trim();
          }
        }
      }
    }

    return '';
  }

  // 🆕 Limpar texto
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Remove espaços duplos
      .replace(/[|]/g, '') // Remove caracteres indesejados
      .trim();
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.lastText = '';
    this.tentativasSemResultado = 0;
    this.resultado$.next(null);
    this.status$.next('inativo');
  }
}
