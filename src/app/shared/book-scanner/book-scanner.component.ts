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
      <!-- Câmera -->
      <video #video autoplay playsinline muted class="scanner-video" *ngIf="!erroCamera"></video>

      <!-- Mensagem de erro -->
      <div class="scanner-erro" *ngIf="erroCamera">
        <span class="erro-icone">📷</span>
        <h3>Câmera não encontrada</h3>
        <p>{{ mensagemErro }}</p>
        <button (click)="cancelar()">Voltar</button>
      </div>

      <!-- Overlay de escaneamento -->
      <div class="scan-overlay" *ngIf="!erroCamera">
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

      <!-- Botões -->
      <div class="scanner-actions" *ngIf="!erroCamera">
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

    .scanner-erro {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-align: center;
      padding: 20px;
    }

    .erro-icone {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .scanner-erro h3 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    .scanner-erro p {
      margin: 0 0 24px;
      color: #ccc;
      font-size: 14px;
    }

    .scanner-erro button {
      padding: 12px 24px;
      border-radius: 25px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
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
  erroCamera = false;
  mensagemErro = '';
  private stream: MediaStream | null = null;

  constructor(
    private scannerService: BookScannerService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const sucesso = await this.iniciarCamera();

    if (sucesso) {
      this.scannerService.resultado$.subscribe(resultado => {
        this.resultado = resultado;
        this.cdr.markForCheck();
      });

      this.scannerService.startLoop(this.video.nativeElement);
    }
  }

  ngOnDestroy() {
    this.pararCamera();
    this.scannerService.destroy();
  }

  private async iniciarCamera(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.erroCamera = true;
        this.mensagemErro = 'Seu navegador não suporta acesso à câmera.';
        this.cdr.markForCheck();
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.video.nativeElement.srcObject = this.stream;
      await this.video.nativeElement.play();
      return true;
    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      this.erroCamera = true;

      switch (error.name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          this.mensagemErro = 'Nenhuma câmera encontrada no dispositivo.';
          break;
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          this.mensagemErro = 'Permissão de câmera negada. Permita o acesso nas configurações.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          this.mensagemErro = 'A câmera está em uso por outro aplicativo.';
          break;
        case 'OverconstrainedError':
          this.mensagemErro = 'Nenhuma câmera compatível encontrada.';
          break;
        default:
          this.mensagemErro = 'Erro ao acessar a câmera. Tente novamente.';
      }

      this.cdr.markForCheck();
      return false;
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
