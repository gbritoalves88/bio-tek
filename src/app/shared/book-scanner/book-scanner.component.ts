import { Component, EventEmitter, Output, ViewChild, ElementRef, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookScannerService } from './book-scanner.service';
import { BookInfo } from './book-scanner.model';

@Component({
  selector: 'app-book-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-overlay">
      <video #video autoplay playsinline muted class="scanner-video"></video>

      <div class="scan-overlay">
        <div class="scan-box" [class.found]="resultado">
          <div class="scan-corner tl"></div>
          <div class="scan-corner tr"></div>
          <div class="scan-corner bl"></div>
          <div class="scan-corner br"></div>
        </div>

        <div class="scan-status" *ngIf="!resultado">
          <span class="pulse"></span>
          <p>Aponte para a capa ou lombada</p>
        </div>

        <div class="scan-result" *ngIf="resultado">
          <span class="check">✅</span>
          <h3>{{ resultado.titulo }}</h3>
          <p *ngIf="resultado.autor">{{ resultado.autor }}</p>
          <small>Confiança: {{ resultado.confianca }}%</small>
        </div>
      </div>

      <div class="scanner-actions">
        <button (click)="cancelar()">✕ Cancelar</button>
        <button *ngIf="resultado" (click)="confirmar()">✅ Confirmar</button>
      </div>
    </div>
  `,
  styles: [`
    .scanner-overlay {
      position: fixed;
      inset: 0;
      z-index: 300;
      background: #000;
      display: flex;
      flex-direction: column;
    }

    .scanner-video {
      flex: 1;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .scan-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .scan-box {
      width: 300px;
      height: 400px;
      border: 2px solid rgba(255,255,255,0.5);
      position: relative;
      transition: all 0.3s;
    }

    .scan-box.found {
      border-color: #4caf50;
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
    }

    .scan-corner {
      position: absolute;
      width: 30px;
      height: 30px;
      border: 3px solid #fff;
    }

    .tl { top: -3px; left: -3px; border-right: none; border-bottom: none; }
    .tr { top: -3px; right: -3px; border-left: none; border-bottom: none; }
    .bl { bottom: -3px; left: -3px; border-right: none; border-top: none; }
    .br { bottom: -3px; right: -3px; border-left: none; border-top: none; }

    .scan-status {
      margin-top: 20px;
      text-align: center;
      color: #fff;
    }

    .pulse {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffcc00;
      animation: pulse 1.5s infinite;
    }

    .scan-result {
      margin-top: 20px;
      padding: 16px;
      background: rgba(0,0,0,0.8);
      border-radius: 12px;
      text-align: center;
      color: #fff;
      pointer-events: auto;
    }

    .check {
      font-size: 32px;
      display: block;
      margin-bottom: 8px;
    }

    .scanner-actions {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      display: flex;
      gap: 12px;
      justify-content: center;
      pointer-events: auto;
    }

    .scanner-actions button {
      padding: 12px 24px;
      border-radius: 25px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .scanner-actions button:first-child {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }

    .scanner-actions button:last-child {
      background: #4caf50;
      color: #fff;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `]
})
export class BookScannerComponent implements OnInit, OnDestroy {
  @Output() aoFechar = new EventEmitter<void>();
  @Output() livroReconhecido = new EventEmitter<BookInfo>();

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;

  resultado: BookInfo | null = null;
  private stream: MediaStream | null = null;

  constructor(
    private scannerService: BookScannerService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.iniciarCamera();

    this.scannerService.resultado$.subscribe(resultado => {
      this.resultado = resultado;
      this.cdr.markForCheck();
    });

    this.scannerService.startLoop(this.video.nativeElement);
  }

  ngOnDestroy() {
    this.pararCamera();
    this.scannerService.destroy();
  }

  private async iniciarCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });

      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
    }
  }

  private pararCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  cancelar() {
    this.pararCamera();
    this.aoFechar.emit();
  }

  confirmar() {
    if (this.resultado) {
      this.pararCamera();
      this.livroReconhecido.emit(this.resultado);
    }
  }
}
