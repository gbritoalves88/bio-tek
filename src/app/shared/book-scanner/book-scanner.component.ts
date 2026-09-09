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
  private melhorResultado: BookInfo | null = null;
  private framesCapturados = 0;

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
      // 🆕 1. Capturar frame
      const canvas = this.captureFrame(videoElement);

      // 🆕 2. Aplicar MÚLTIPLOS processamentos
      const resultados = await this.processarMultiplasAbordagens(canvas);

      // 🆕 3. Escolher melhor resultado
      const melhor = this.escolherMelhorResultado(resultados);

      if (melhor && melhor.titulo && melhor.confianca > 40) {
        this.framesCapturados = 0;
        this.lastText = melhor.titulo;
        this.melhorResultado = melhor;

        this.resultado$.next(melhor);
        this.status$.next('encontrado');
        return melhor;
      }

      this.framesCapturados++;
      this.tentativasSemResultado++;

      // 🆕 A cada 5 tentativas sem sucesso, tentar abordagem diferente
      if (this.tentativasSemResultado % 5 === 0) {
        await this.tentarAbordagemAlternativa(canvas);
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

      // 🆕 Intervalo mais curto para capturar mais frames
      const intervalo = this.tentativasSemResultado > 10 ? 2000 : 1000;
      setTimeout(loop, intervalo);
    };

    loop();
  }

  // 🆕 Capturar frame com máxima qualidade
  private captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    // Usar resolução NATIVA do vídeo (máxima possível)
    let width = video.videoWidth || 1920;
    let height = video.videoHeight || 1080;

    // Limitar a 1920x1080 para não travar
    const maxDimension = 1920;
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, width, height);

    return canvas;
  }

  // 🆕 Processar com múltiplas abordagens
  private async processarMultiplasAbordagens(canvas: HTMLCanvasElement): Promise<BookInfo[]> {
    const resultados: BookInfo[] = [];

    // Abordagem 1: Original (sem processamento)
    const originalData = canvas.toDataURL('image/jpeg', 1.0);
    const resultOriginal = await this.worker!.recognize(originalData);
    resultados.push(this.parseBookInfo(resultOriginal.data.text, resultOriginal.data.confidence));

    // Abordagem 2: Escala de cinza
    const grayCanvas = this.converterEscalaCinza(canvas);
    const grayData = grayCanvas.toDataURL('image/jpeg', 1.0);
    const resultGray = await this.worker!.recognize(grayData);
    resultados.push(this.parseBookInfo(resultGray.data.text, resultGray.data.confidence));

    // Abordagem 3: Alto contraste
    const contrastCanvas = this.aumentarContraste(grayCanvas);
    const contrastData = contrastCanvas.toDataURL('image/jpeg', 1.0);
    const resultContrast = await this.worker!.recognize(contrastData);
    resultados.push(this.parseBookInfo(resultContrast.data.text, resultContrast.data.confidence));

    // Abordagem 4: Binarização (preto e branco)
    const binaryCanvas = this.binarizar(contrastCanvas);
    const binaryData = binaryCanvas.toDataURL('image/png', 1.0);
    const resultBinary = await this.worker!.recognize(binaryData);
    resultados.push(this.parseBookInfo(resultBinary.data.text, resultBinary.data.confidence));

    return resultados;
  }

  // 🆕 Escolher melhor resultado
  private escolherMelhorResultado(resultados: BookInfo[]): BookInfo | null {
    // Filtrar resultados válidos
    const validos = resultados.filter(r => r.titulo && r.titulo.length > 3);

    if (validos.length === 0) return null;

    // Ordenar por confiança (maior primeiro)
    return validos.sort((a, b) => b.confianca - a.confianca)[0];
  }

  // 🆕 Tentar abordagem alternativa (imagem completa)
  private async tentarAbordagemAlternativa(canvas: HTMLCanvasElement): Promise<void> {
    try {
      // Recortar diferentes áreas
      const areas = [
        { x: 0.05, y: 0.05, w: 0.9, h: 0.3 },  // Topo
        { x: 0.05, y: 0.25, w: 0.9, h: 0.3 }, // Centro-superior
        { x: 0.05, y: 0.5, w: 0.9, h: 0.3 },  // Centro-inferior
        { x: 0.05, y: 0.7, w: 0.9, h: 0.25 }, // Inferior
      ];

      for (const area of areas) {
        const croppedCanvas = this.cropArea(canvas, area.x, area.y, area.w, area.h);
        const dataUrl = croppedCanvas.toDataURL('image/jpeg', 1.0);
        const result = await this.worker!.recognize(dataUrl);
        const bookInfo = this.parseBookInfo(result.data.text, result.data.confidence);

        if (bookInfo.titulo && result.data.confidence > 50) {
          this.resultado$.next(bookInfo);
          this.status$.next('encontrado');
          return;
        }
      }
    } catch (error) {
      console.error('Erro na abordagem alternativa:', error);
    }
  }

  // 🆕 Converter para escala de cinza
  private converterEscalaCinza(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    const ctx = newCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
  }

  // 🆕 Aumentar contraste
  private aumentarContraste(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    const ctx = newCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Encontrar min e max
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    const range = max - min || 1;

    // Aplicar contraste
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const contrast = ((gray - min) / range) * 255;
      data[i] = contrast;
      data[i + 1] = contrast;
      data[i + 2] = contrast;
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
  }

  // 🆕 Binarizar (preto e branco puro)
  private binarizar(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    const ctx = newCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calcular threshold adaptativo (média)
    let soma = 0;
    for (let i = 0; i < data.length; i += 4) {
      soma += data[i];
    }
    const threshold = soma / (data.length / 4);

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      const value = gray > threshold ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
  }

  // 🆕 Recortar área específica
  private cropArea(canvas: HTMLCanvasElement, xRatio: number, yRatio: number, wRatio: number, hRatio: number): HTMLCanvasElement {
    const width = canvas.width;
    const height = canvas.height;

    const cropX = width * xRatio;
    const cropY = height * yRatio;
    const cropWidth = width * wRatio;
    const cropHeight = height * hRatio;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    const ctx = croppedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return croppedCanvas;
  }

  // 🆕 Parse melhorado
  private parseBookInfo(text: string, confidence: number): BookInfo {
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2);

    const filteredLines = lines.filter(l => {
      const numbers = l.match(/[0-9]/g);
      return !numbers || numbers.length < l.length * 0.5;
    });

    let titulo = '';
    let autor = '';

    if (filteredLines.length > 0) {
      const sortedByLength = [...filteredLines].sort((a, b) => b.length - a.length);
      titulo = sortedByLength[0] || filteredLines[0] || '';
      autor = this.findAuthor(filteredLines);

      if (!autor && sortedByLength.length > 1) {
        autor = sortedByLength[1];
      }
    }

    titulo = this.cleanText(titulo);
    autor = this.cleanText(autor);

    return { titulo, autor, confianca: Math.round(confidence) };
  }

  private findAuthor(lines: string[]): string {
    const patterns = ['por', 'by', 'de', 'autor', 'author', 'escrito', 'escrita', 'written', 'tradução', 'traducao'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      if (patterns.some(p => line.includes(p))) {
        const nextLine = lines[i + 1] || '';
        const currentLine = lines[i];

        if (nextLine && nextLine.length > 2) {
          return nextLine;
        }

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

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[|]/g, '')
      .trim();
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.lastText = '';
    this.tentativasSemResultado = 0;
    this.melhorResultado = null;
    this.framesCapturados = 0;
    this.resultado$.next(null);
    this.status$.next('inativo');
  }
}
