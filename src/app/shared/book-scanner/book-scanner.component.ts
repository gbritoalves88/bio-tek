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
  templateUrl: './book-scanner.component.html',
  styleUrl: './book-scanner.component.scss'
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

  // 🆕 Modo do scanner (começa em CAPA/ImageHash)
  modoScanner: 'ocr' | 'capa' = 'capa';

  // 🆕 ImageHash
  buscandoPorCapa = false;
  mostrandoResultadosCapa = false;
  resultadosCapa: LivroEncontrado[] = [];
  contadorCaptura = 5;

  // 🆕 Controle de intervalo
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
      // 🆕 Inscrever no OCR (só aceita se modo OCR)
      this.scannerService.resultado$.subscribe(resultado => {
        if (resultado && !this.editando && !this.mostrandoResultadosCapa && this.modoScanner === 'ocr') {
          this.resultado = resultado;
          this.tituloEditado = resultado.titulo;
          this.autorEditado = resultado.autor;
          this.cdr.markForCheck();
        }
      });

      // 🆕 Inicia OCR em background
      this.scannerService.startLoop(this.video.nativeElement);

      // 🆕 Inicia contador do modo CAPA (5s)
      this.iniciarContador();
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

  // ============ CONTADOR ============
  private iniciarContador() {
    this.pararContador();
    this.contadorCaptura = 5;

    // 🆕 Só conta se estiver no modo CAPA
    if (this.modoScanner !== 'capa') return;

    this.contadorInterval = setInterval(() => {
      this.contadorCaptura--;
      this.cdr.markForCheck();

      if (this.contadorCaptura <= 0) {
        this.pararContador();
        this.capturarEEnviar();
      }
    }, 1000);
  }

  private pararContador() {
    if (this.contadorInterval) {
      clearInterval(this.contadorInterval);
      this.contadorInterval = null;
    }
  }

  // ============ MODO CAPA ============
  ativarModoCapa() {
    this.modoScanner = 'capa';
    this.resultado = null;
    this.iniciarContador();
    this.cdr.markForCheck();
  }

  // ============ MODO OCR ============
  ativarModoOCR() {
    this.modoScanner = 'ocr';
    this.resultado = null;
    this.pararContador();  // 🆕 OCR não tem contador
    this.cdr.markForCheck();
  }

  capturarAgora() {
    this.pararContador();
    this.capturarEEnviar();
  }

  // ============ CAPTURA + ENVIO ============
  private capturarEEnviar() {
    if (!this.video || !this.capaBox) return;

    this.buscandoPorCapa = true;
    this.cdr.markForCheck();

    try {
      const video = this.video.nativeElement;
      const videoRect = video.getBoundingClientRect();
      const boxRect = this.capaBox.nativeElement.getBoundingClientRect();

      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const cropX = (boxRect.left - videoRect.left) * scaleX;
      const cropY = (boxRect.top - videoRect.top) * scaleY;
      const cropW = boxRect.width * scaleX;
      const cropH = boxRect.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        video,
        cropX, cropY, cropW, cropH,
        0, 0, cropW, cropH
      );

      const imagemBase64 = canvas.toDataURL('image/jpeg', 0.85);

      console.log(`📸 Imagem capturada: ${cropW}x${cropH}, ~${Math.round(imagemBase64.length / 1024)} KB`);

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
          // 🆕 Volta para modo CAPA com novo contador
          this.iniciarContador();
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

        // 🆕 Volta para modo CAPA
        this.iniciarContador();
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
      idLivro: livro.idLivro,
      imagemUrl: livro.imagemUrl,
      fonte: livro.fonte,

      // 🆕 Dados completos
      descricao: livro.descricao,
      editora: livro.editora,
      anoPublicacao: livro.anoPublicacao,
      generos: livro.generos,
      idioma: livro.idioma,
      numeroPaginas: livro.numeroPaginas,
      codigoBarras: livro.codigoBarras,
      avaliacaoMedia: livro.avaliacaoMedia
    };

    this.pararCamera();
    this.livroReconhecido.emit(bookInfo);
  }

  fecharResultadosCapa() {
    this.mostrandoResultadosCapa = false;
    this.resultadosCapa = [];
    // 🆕 Volta para modo CAPA
    this.ativarModoCapa();
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
