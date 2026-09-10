// src/app/shared/book-scanner/book-scanner.component.ts
import { Component, EventEmitter, Output, ViewChild, ElementRef, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookScannerService } from './book-scanner.service';
import { BookInfo } from './book-scanner.model';
import { CapaHashService } from '../capa-hash/capa-hash.service';
import { LivroEncontrado } from '../capa-hash/capa-hash.model';

@Component({
  selector: 'app-book-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scanner-overlay">
      <!-- Câmera -->
      <video #video autoplay playsinline muted class="scanner-video" *ngIf="!erroCamera"></video>

      <!-- Erro de câmera -->
      <div class="scanner-erro" *ngIf="erroCamera">
        <span class="erro-icone">📷</span>
        <h3>Câmera não encontrada</h3>
        <p>{{ mensagemErro }}</p>
        <button (click)="cancelar()">Voltar</button>
      </div>

      <!-- Overlay: MODO OCR -->
      <div class="scan-overlay" *ngIf="!erroCamera && !editando && !mostrandoResultadosCapa && modoScanner === 'ocr'">
        <div class="scan-box ocr" [class.found]="resultado">
          <div class="scan-corner tl"></div>
          <div class="scan-corner tr"></div>
          <div class="scan-corner bl"></div>
          <div class="scan-corner br"></div>
          <div class="scan-guide-line"></div>
        </div>

        <div class="scan-instructions" *ngIf="!resultado">
          <span class="pulse"></span>
          <p class="instruction-title">Aponte o título do livro</p>
          <p class="instruction-sub">Centralize o título na área</p>
        </div>

        <div class="scan-result" *ngIf="resultado">
          <span class="check">✅</span>
          <h3>{{ resultado.titulo }}</h3>
          <p *ngIf="resultado.autor">{{ resultado.autor }}</p>
          <small>Confiança: {{ resultado.confianca }}%</small>
          <button class="btn-editar" (click)="abrirEdicao()">✏️ Corrigir</button>
        </div>
      </div>

      <!-- Overlay: MODO CAPA (ImageHash) -->
      <div class="scan-overlay" *ngIf="!erroCamera && modoScanner === 'capa' && !mostrandoResultadosCapa">
        <div class="scan-box capa" #capaBox>
          <div class="scan-corner tl"></div>
          <div class="scan-corner tr"></div>
          <div class="scan-corner bl"></div>
          <div class="scan-corner br"></div>
        </div>

        <div class="scan-instructions" *ngIf="!buscandoPorCapa">
          <span class="pulse"></span>
          <p class="instruction-title">📸 Enquadre a capa do livro</p>
          <p class="instruction-sub">
            Capturando em {{ contadorCaptura }}s...
          </p>
        </div>

        <div class="scan-result" *ngIf="buscandoPorCapa">
          <span class="spinner-scan"></span>
          <h3>Analisando capa...</h3>
          <p>Aguarde um instante</p>
        </div>
      </div>

      <!-- Resultados do ImageHash -->
      <div class="resultados-overlay" *ngIf="mostrandoResultadosCapa">
        <div class="resultados-card">
          <div class="resultados-header">
            <h3>📚 Livros encontrados</h3>
            <button class="btn-close-resultados" (click)="fecharResultadosCapa()">✕</button>
          </div>

          <p class="resultados-info">
            Escolha o livro correto ({{ resultadosCapa.length }} opções)
          </p>

          <div class="resultados-lista">
            <div
              class="resultado-item"
              *ngFor="let livro of resultadosCapa"
              (click)="selecionarResultado(livro)">

              <div class="resultado-similaridade">
                {{ livro.similaridade }}%
              </div>

              <img
                [src]="livro.imagemUrl || 'assets/capas/perfilSemFoto.png'"
                [alt]="livro.titulo"
                class="resultado-capa"
                loading="lazy" />

              <div class="resultado-info">
                <strong>{{ livro.titulo }}</strong>
                <span>{{ livro.autor }}</span>
                <small class="resultado-fonte">
                  {{ livro.fonte === 'Catalogo' ? '📖 Catálogo' : '📚 Biblioteca' }}
                </small>
              </div>

              <svg class="resultado-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Modo de edição -->
      <div class="edit-overlay" *ngIf="editando">
        <div class="edit-card">
          <h3>Corrigir informações</h3>

          <label>Título:</label>
          <input type="text" [(ngModel)]="tituloEditado" placeholder="Título do livro">

          <label>Autor:</label>
          <input type="text" [(ngModel)]="autorEditado" placeholder="Autor do livro">

          <div class="edit-actions">
            <button (click)="cancelarEdicao()">Cancelar</button>
            <button (click)="confirmarEdicao()">Confirmar</button>
          </div>
        </div>
      </div>

      <!-- Botões -->
      <div class="scanner-actions"
           *ngIf="!erroCamera && !editando && !mostrandoResultadosCapa">

        <button class="btn-cancelar" (click)="cancelar()">✕ Cancelar</button>

        <!-- Botão Buscar por Capa (modo OCR) -->
        <button
          class="btn-buscar-capa"
          *ngIf="modoScanner === 'ocr'"
          (click)="ativarModoCapa()">
          🔍 Buscar por capa
        </button>

        <!-- Botão Capturar Agora (modo capa) -->
        <button
          class="btn-capturar-agora"
          *ngIf="modoScanner === 'capa' && !buscandoPorCapa"
          (click)="capturarAgora()">
          📸 Capturar agora
        </button>

        <!-- Botão Confirmar (modo OCR) -->
        <button
          class="btn-confirmar"
          *ngIf="modoScanner === 'ocr' && resultado"
          (click)="confirmar()">
          ✅ Confirmar
        </button>
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

    .erro-icone { font-size: 64px; margin-bottom: 16px; }
    .scanner-erro h3 { margin: 0 0 8px; font-size: 20px; }
    .scanner-erro p { margin: 0 0 24px; color: #ccc; font-size: 14px; }
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

    /* 🆕 MODO OCR - Retângulo pequeno */
    .scan-box.ocr {
      width: 90%;
      max-width: 340px;
      height: 120px;
      border: 2px solid rgba(255,255,255,0.7);
      position: relative;
      transition: all 0.3s;
      background: rgba(0,0,0,0.1);
    }

    .scan-box.ocr.found {
      border-color: #4caf50;
      box-shadow: 0 0 30px rgba(76, 175, 80, 0.6);
      background: rgba(76, 175, 80, 0.1);
    }

    /* 🆕 MODO CAPA - Retângulo grande (2:3) */
    .scan-box.capa {
      width: 75%;
      max-width: 280px;
      aspect-ratio: 2/3;
      border: 3px solid #ffcc00;
      position: relative;
      transition: all 0.3s;
      background: rgba(0,0,0,0.1);
      box-shadow: 0 0 30px rgba(255, 204, 0, 0.4);
      animation: capa-pulse 2s infinite;
    }

    @keyframes capa-pulse {
      0%, 100% {
        border-color: rgba(255, 204, 0, 0.8);
        box-shadow: 0 0 30px rgba(255, 204, 0, 0.4);
      }
      50% {
        border-color: rgba(255, 204, 0, 1);
        box-shadow: 0 0 40px rgba(255, 204, 0, 0.6);
      }
    }

    .scan-corner {
      position: absolute;
      width: 25px;
      height: 25px;
      border: 3px solid #fff;
    }

    .scan-box.capa .scan-corner {
      border-color: #ffcc00;
      width: 30px;
      height: 30px;
    }

    .tl { top: -3px; left: -3px; border-right: none; border-bottom: none; }
    .tr { top: -3px; right: -3px; border-left: none; border-bottom: none; }
    .bl { bottom: -3px; left: -3px; border-right: none; border-top: none; }
    .br { bottom: -3px; right: -3px; border-left: none; border-top: none; }

    .scan-guide-line {
      position: absolute;
      left: 10%;
      right: 10%;
      top: 50%;
      height: 2px;
      background: rgba(255,204,0,0.6);
      animation: guide-pulse 2s infinite;
    }

    .scan-instructions {
      margin-top: 20px;
      text-align: center;
      color: #fff;
      background: rgba(0,0,0,0.7);
      padding: 12px 20px;
      border-radius: 12px;
    }

    .pulse {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ffcc00;
      animation: pulse 1.5s infinite;
      margin-right: 8px;
    }

    .instruction-title { margin: 8px 0 4px; font-size: 16px; font-weight: 600; }
    .instruction-sub { margin: 0; font-size: 13px; color: #ccc; }

    .scan-result {
      margin-top: 20px;
      padding: 16px;
      background: rgba(0,0,0,0.85);
      border-radius: 12px;
      text-align: center;
      color: #fff;
      pointer-events: auto;
      min-width: 250px;
    }

    .check { font-size: 32px; display: block; margin-bottom: 8px; }
    .scan-result h3 { margin: 0 0 4px; font-size: 18px; }
    .scan-result p { margin: 0 0 8px; color: #ccc; font-size: 14px; }
    .scan-result small { color: #999; }

    .spinner-scan {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #ffcc00;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 8px;
    }

    .btn-editar {
      display: block;
      margin: 12px auto 0;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid #fff;
      background: transparent;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      pointer-events: auto;
    }

    /* ===== RESULTADOS IMAGEHASH ===== */
    .resultados-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.85);
      z-index: 20;
      padding: 16px;
    }

    .resultados-card {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 420px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .resultados-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }

    .resultados-header h3 {
      margin: 0;
      font-size: 17px;
      color: #333;
    }

    .btn-close-resultados {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      padding: 4px 8px;
    }

    .resultados-info {
      margin: 0;
      padding: 12px 16px;
      font-size: 13px;
      color: #666;
      background: #f9f9f9;
    }

    .resultados-lista {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .resultado-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }

    .resultado-item:hover { background: #f5f5f5; }
    .resultado-item:active { background: #eee; }

    .resultado-similaridade {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #4caf50;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 10px;
    }

    .resultado-capa {
      width: 50px;
      aspect-ratio: 2/3;
      object-fit: cover;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }

    .resultado-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .resultado-info strong {
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .resultado-info span {
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .resultado-fonte { font-size: 11px; color: #999; }

    .resultado-seta {
      width: 18px;
      height: 18px;
      stroke: #999;
      flex-shrink: 0;
    }

    /* ===== EDIT ===== */
    .edit-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.8);
      z-index: 10;
    }

    .edit-card {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      width: 90%;
      max-width: 350px;
    }

    .edit-card h3 { margin: 0 0 16px; color: #333; font-size: 18px; }
    .edit-card label {
      display: block;
      margin: 12px 0 4px;
      color: #666;
      font-size: 13px;
      font-weight: 600;
    }
    .edit-card input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
      box-sizing: border-box;
    }

    .edit-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .edit-actions button {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    .edit-actions button:first-child { background: #f0f0f0; color: #333; }
    .edit-actions button:last-child { background: #4caf50; color: #fff; }

    /* ===== AÇÕES ===== */
    .scanner-actions {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      display: flex;
      gap: 8px;
      justify-content: center;
      pointer-events: auto;
      padding: 0 16px;
      flex-wrap: wrap;
    }

    .scanner-actions button {
      padding: 12px 20px;
      border-radius: 25px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancelar { background: rgba(255,255,255,0.2); color: #fff; }

    .btn-buscar-capa {
      background: linear-gradient(135deg, #ff6b6b, #ff4757);
      color: #fff;
      box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    }

    .btn-capturar-agora {
      background: linear-gradient(135deg, #ffcc00, #ff9900);
      color: #000;
      font-weight: 700;
    }

    .btn-confirmar { background: #4caf50; color: #fff; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    @keyframes guide-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.2; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BookScannerComponent implements OnInit, OnDestroy {
  @Output() aoFechar = new EventEmitter<void>();
  @Output() livroReconhecido = new EventEmitter<BookInfo>();

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('capaBox') capaBox!: ElementRef<HTMLDivElement>;

  // Estado
  resultado: BookInfo | null = null;
  erroCamera = false;
  mensagemErro = '';
  editando = false;
  tituloEditado = '';
  autorEditado = '';

  // 🆕 Modo do scanner
  modoScanner: 'ocr' | 'capa' = 'ocr';

  // 🆕 ImageHash
  buscandoPorCapa = false;
  mostrandoResultadosCapa = false;
  resultadosCapa: LivroEncontrado[] = [];
  contadorCaptura = 3;

  private stream: MediaStream | null = null;
  private contadorInterval: any = null;

  constructor(
    private scannerService: BookScannerService,
    private capaHashService: CapaHashService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const sucesso = await this.iniciarCamera();

    if (sucesso) {
      this.scannerService.resultado$.subscribe(resultado => {
        // Só aceita resultado OCR se estiver no modo OCR
        if (resultado && !this.editando && !this.mostrandoResultadosCapa && this.modoScanner === 'ocr') {
          this.resultado = resultado;
          this.tituloEditado = resultado.titulo;
          this.autorEditado = resultado.autor;
          this.cdr.markForCheck();
        }
      });

      this.scannerService.startLoop(this.video.nativeElement);
    }
  }

  ngOnDestroy() {
    this.pararCamera();
    this.scannerService.destroy();
    this.pararContador();
  }

  // ============ CÂMERA ============
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

  // ============ MODO CAPA ============
  ativarModoCapa() {
    this.modoScanner = 'capa';
    this.resultado = null;
    this.contadorCaptura = 3;
    this.cdr.markForCheck();

    // 🆕 Contador regressivo
    this.contadorInterval = setInterval(() => {
      this.contadorCaptura--;
      this.cdr.markForCheck();

      if (this.contadorCaptura <= 0) {
        this.pararContador();
        this.capturarEEnviar();
      }
    }, 1000);
  }

  capturarAgora() {
    this.pararContador();
    this.capturarEEnviar();
  }

  private pararContador() {
    if (this.contadorInterval) {
      clearInterval(this.contadorInterval);
      this.contadorInterval = null;
    }
  }

  // ============ CAPTURA + ENVIO ============
  private capturarEEnviar() {
    if (!this.video || !this.capaBox) return;

    this.buscandoPorCapa = true;
    this.cdr.markForCheck();

    try {
      // 🆕 1. Obter dimensões da tela
      const video = this.video.nativeElement;
      const videoRect = video.getBoundingClientRect();
      const boxRect = this.capaBox.nativeElement.getBoundingClientRect();

      // 🆕 2. Calcular proporção da área de recorte em relação ao vídeo
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const cropX = (boxRect.left - videoRect.left) * scaleX;
      const cropY = (boxRect.top - videoRect.top) * scaleY;
      const cropW = boxRect.width * scaleX;
      const cropH = boxRect.height * scaleY;

      // 🆕 3. Criar canvas e recortar
      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        video,
        cropX, cropY, cropW, cropH,  // Fonte (área do retângulo)
        0, 0, cropW, cropH           // Destino (canvas)
      );

      // 🆕 4. Converter para base64 (qualidade 0.85)
      const imagemBase64 = canvas.toDataURL('image/jpeg', 0.85);

      console.log(`📸 Imagem capturada: ${cropW}x${cropH}, ~${Math.round(imagemBase64.length / 1024)} KB`);

      // 🆕 5. Enviar para o backend
      this.enviarParaBackend(imagemBase64);

    } catch (error) {
      console.error('Erro ao capturar:', error);
      this.buscandoPorCapa = false;
      alert('Erro ao capturar imagem. Tente novamente.');
      this.cdr.markForCheck();
    }
  }

  private enviarParaBackend(imagemBase64: string) {
    this.capaHashService.buscarPorCapa(imagemBase64).subscribe({
      next: (resultados) => {
        this.buscandoPorCapa = false;

        if (!resultados || resultados.length === 0) {
          alert('Nenhum livro encontrado. Tente novamente com melhor iluminação.');
          this.modoScanner = 'ocr';
          this.cdr.markForCheck();
          return;
        }

        this.resultadosCapa = resultados;
        this.mostrandoResultadosCapa = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erro ao buscar por capa:', err);
        this.buscandoPorCapa = false;

        if (err.status === 404) {
          alert('Nenhum livro encontrado. Tente novamente.');
        } else if (err.status === 429) {
          alert('Muitas tentativas. Aguarde um momento.');
        } else {
          alert('Erro ao buscar. Tente novamente.');
        }

        this.modoScanner = 'ocr';
        this.cdr.markForCheck();
      }
    });
  }

  // ============ RESULTADOS ============
  selecionarResultado(livro: LivroEncontrado) {
    const bookInfo: BookInfo = {
      titulo: livro.titulo,
      autor: livro.autor,
      confianca: Math.round(livro.similaridade),
      // 🆕 Dados extras
      idLivro: livro.idLivro,
      imagemUrl: livro.imagemUrl,
      fonte: livro.fonte
    };

    this.pararCamera();
    this.livroReconhecido.emit(bookInfo);
  }

  fecharResultadosCapa() {
    this.mostrandoResultadosCapa = false;
    this.resultadosCapa = [];
    this.modoScanner = 'ocr';
    this.cdr.markForCheck();
  }

  // ============ EDIT ============
  abrirEdicao() {
    this.editando = true;
    this.tituloEditado = this.resultado?.titulo || '';
    this.autorEditado = this.resultado?.autor || '';
    this.cdr.markForCheck();
  }

  cancelarEdicao() {
    this.editando = false;
    this.cdr.markForCheck();
  }

  confirmarEdicao() {
    if (this.tituloEditado.trim()) {
      this.resultado = {
        titulo: this.tituloEditado.trim(),
        autor: this.autorEditado.trim(),
        confianca: 100
      };
    }
    this.editando = false;
    this.cdr.markForCheck();
  }

  // ============ AÇÕES ============
  cancelar() {
    this.pararContador();
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
