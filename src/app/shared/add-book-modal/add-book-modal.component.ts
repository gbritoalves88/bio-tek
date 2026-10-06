// src/app/shared/add-book-modal/add-book-modal.component.ts

import { Component, EventEmitter, Output, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { AddBookModalService } from './add-book-modal.service';
import { UploadService } from '../services/upload.service';
import { AlertService } from '../services/alert.service';
// Adicionar imports
import { BookScannerComponent } from '../book-scanner/book-scanner.component';
import { BookInfo } from '../book-scanner/book-scanner.model';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

@Component({
  selector: 'app-add-book-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule, BookScannerComponent],
  templateUrl: './add-book-modal.component.html',
  styleUrl: './add-book-modal.component.scss'
})
export class AddBookModalComponent {
  @Output() fechar = new EventEmitter<void>();
  @Output() livroAdicionado = new EventEmitter<any>();

  etapa: 'escolha' | 'scanner' | 'digitar' | 'manual' | 'confirmar' | 'scanner-ocr' = 'escolha';
  escaneando = false;
  buscandoInfo = false;
  livroEncontrado = false;
  livroNaoEncontrado = false;
  flashAtivo = false;


  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;
  private readonly COMPRESSAO_MAX_WIDTH = 800;
  private readonly COMPRESSAO_QUALIDADE = 0.6;

  novoLivro = {
    titulo: '',
    autor: '',
    descricao: '',
    codigoBarras: '',
    capa: '',
    editora: '',
    anoPublicacao: null as number | null,
    numeroPaginas: null as number | null,
    generos: [] as string[],
    avaliacaoMedia: null as number | null,
    idioma: '',
    arquivoLeitura: '' as string | null,
    tipo: 'livro',  // Padrão
    status: 1       // Padrão: Quero ler
  };

  // Gêneros disponíveis para seleção
  generosDisponiveis = [
    'Fantasia', 'Ficção', 'Romance', 'Terror',
    'Suspense', 'Biografia', 'História', 'Infantil',
    'Aventura', 'Drama', 'Poesia', 'Ficção Científica'
  ];

  allowedFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.UPC_A];
  scannerDisponivel = false;
  scannerAtivo = false;

  constructor(
    private addBookService: AddBookModalService,
    private uploadService: UploadService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  fecharModal(): void {
    this.desativarScanner();
    this.resetarEstado();
    this.fechar.emit();
  }

  private resetarEstado(): void {
    this.etapa = 'escolha';
    this.novoLivro = {
      titulo: '', autor: '', descricao: '', codigoBarras: '', capa: '',
      editora: '', anoPublicacao: null, numeroPaginas: null, generos: [], avaliacaoMedia: null,
      idioma: '',
      arquivoLeitura: null,
      tipo: 'livro',
      status: 1
    };
    this.livroEncontrado = false;
    this.livroNaoEncontrado = false;
    this.buscandoInfo = false;
    this.cdr.markForCheck();
  }

  abrirFormularioManual(): void {
    this.livroNaoEncontrado = false;
    this.cdr.markForCheck();
  }

  // Toggle gênero no formulário
  toggleGenero(genero: string): void {
    const index = this.novoLivro.generos.indexOf(genero);
    if (index > -1) {
      this.novoLivro.generos.splice(index, 1);
    } else {
      if (this.novoLivro.generos.length < 3) {
        this.novoLivro.generos.push(genero);
      } else {
        this.alertService.warning('Máximo 3 gêneros');
      }
    }
  }

  // ===== SCANNER =====
  ativarScanner(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scannerAtivo = true;
    this.escaneando = true;
    this.flashAtivo = false;
    this.cdr.markForCheck();
  }

  desativarScanner(): void {
    this.scannerAtivo = false;
    this.escaneando = false;
    this.flashAtivo = false;
    this.cdr.markForCheck();
  }

  alternarFlash(): void { this.flashAtivo = !this.flashAtivo; }

  onCodeResult(result: string): void {
    this.novoLivro.codigoBarras = result;
    this.desativarScanner();
    this.etapa = 'digitar';
    this.cdr.markForCheck();
    this.buscarPorCodigo();
  }

  onHasDevices(hasDevices: boolean): void { this.scannerDisponivel = hasDevices; this.cdr.markForCheck(); }
  onScanError(error: any): void { this.escaneando = false; this.cdr.markForCheck(); }

  // ===== BUSCA =====
  buscarPorCodigo(): void {
    if (!this.novoLivro.codigoBarras?.trim()) {
      this.alertService.warning('Digite ou escaneie um código de barras');
      return;
    }

    this.buscandoInfo = true;
    this.livroEncontrado = false;
    this.livroNaoEncontrado = false;
    this.cdr.markForCheck();

    this.addBookService.buscarPorCodigoBarras(this.novoLivro.codigoBarras.trim()).subscribe({
      next: (livro) => {
        this.buscandoInfo = false;
        if (livro && livro.titulo) {
          this.novoLivro.titulo = livro.titulo;
          this.novoLivro.autor = livro.autor;
          this.novoLivro.descricao = livro.descricao || '';
          this.novoLivro.capa = livro.imagem || '';
          this.novoLivro.editora = livro.editora || '';
          this.novoLivro.anoPublicacao = livro.anoPublicacao || null;
          this.novoLivro.numeroPaginas = livro.numeroPaginas || null;
          this.novoLivro.generos = livro.generos || [];
          this.novoLivro.avaliacaoMedia = livro.avaliacaoMedia || null;
          this.novoLivro.idioma = livro.idioma || '';
          this.novoLivro.tipo = livro.tipo || 'livro';
          this.novoLivro.status = 1;
          this.livroEncontrado = true;
          this.etapa = 'confirmar';
          this.alertService.success('Livro encontrado!');
        } else {
          this.livroNaoEncontrado = true;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.buscandoInfo = false;
        this.livroNaoEncontrado = true;
        this.cdr.markForCheck();
      }
    });
  }

  tentarNovamente(): void {
    this.novoLivro.codigoBarras = '';
    this.novoLivro.titulo = '';
    this.novoLivro.autor = '';
    this.novoLivro.descricao = '';
    this.novoLivro.capa = '';
    this.livroNaoEncontrado = false;
    this.livroEncontrado = false;
    this.cdr.markForCheck();
  }

  // ===== SALVAR =====
  adicionarLivroEncontrado(): void {
    if (!this.novoLivro.titulo?.trim() || !this.novoLivro.autor?.trim()) {
      this.alertService.warning('Preencha título e autor');
      return;
    }

    if (this.novoLivro.capa?.startsWith('data:')) {
      this.comprimirImagem(this.novoLivro.capa, this.COMPRESSAO_MAX_WIDTH, this.COMPRESSAO_QUALIDADE).then(comprimida => {
        this.uploadService.uploadImagem(comprimida).subscribe({
          next: (url) => {
            this.novoLivro.capa = url;
            this.adicionarLivro();
          },
          error: () => {
            this.alertService.error('Erro ao enviar imagem. Tente novamente.');
          }
        });
      });
    } else {
      this.adicionarLivro();
    }
  }

  private adicionarLivro(): void {
    this.addBookService.adicionarLivro({
      titulo: this.novoLivro.titulo.trim(),
      autor: this.novoLivro.autor.trim(),
      descricao: this.novoLivro.descricao || '',
      imagem: this.novoLivro.capa || null,
      codigoBarras: this.novoLivro.codigoBarras || null,
      generos: this.novoLivro.generos || [],
      anoPublicacao: this.novoLivro.anoPublicacao ?
        parseInt(this.novoLivro.anoPublicacao.toString()) : null,
      editora: this.novoLivro.editora || null,
      idioma: this.novoLivro.idioma || null,
      arquivoLeitura: this.novoLivro.arquivoLeitura || null,
      tipo: this.novoLivro.tipo || 'livro',
      status: this.novoLivro.status || 1
    }).subscribe({
      next: (livro) => {
        this.livroAdicionado.emit(livro);
        this.fecharModal();
      },
      error: (err) => {
        if (err.status === 409 || err.status === 400) {
          this.alertService.warning(err.error?.mensagem || 'Livro já existe');
        } else {
          this.alertService.error('Erro ao adicionar livro');
        }
      }
    });
  }

  // ===== IMAGEM =====
  private comprimirImagem(base64: string, maxWidth: number = 800, qualidade: number = 0.6): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // 🆕 Forçar JPEG baseline (não progressivo)
        // 1. Pega base64 inicial
        const tempBase64 = canvas.toDataURL('image/jpeg', qualidade);

        // 2. Recria a imagem (isso força baseline)
        const img2 = new Image();
        img2.onload = () => {
          const canvas2 = document.createElement('canvas');
          canvas2.width = img2.width;
          canvas2.height = img2.height;
          const ctx2 = canvas2.getContext('2d')!;
          ctx2.drawImage(img2, 0, 0);
          resolve(canvas2.toDataURL('image/jpeg', qualidade));
        };
        img2.src = tempBase64;
      };
    });
  }

  async tirarFoto(): Promise<void> {
    // 📱 App nativo: usa plugin @capacitor/camera
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // pergunta: câmera ou galeria
          promptLabelHeader: 'Escolher foto',
          promptLabelPhoto: 'Da galeria',
          promptLabelPicture: 'Tirar foto'
        });

        if (image.dataUrl) {
          this.novoLivro.capa = image.dataUrl;
          this.cdr.markForCheck();
        }
      } catch (error) {
        console.error('Erro ao tirar foto:', error);
        this.alertService.error('Erro ao acessar câmera');
      }
      return;
    }

    // 🌐 Web: mantém o método atual
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.novoLivro.capa = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.novoLivro.capa = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  voltarParaBusca(): void {
    this.etapa = 'digitar';
    this.cdr.markForCheck();
  }

  validarAno(): void {
    if (this.novoLivro.anoPublicacao) {
      const anoStr = this.novoLivro.anoPublicacao.toString();

      // Se tem mais de 4 dígitos, corta
      if (anoStr.length > 4) {
        this.novoLivro.anoPublicacao = parseInt(anoStr.slice(0, 4));
      }

      // Se for menor que 1000 ou maior que 9999, limpa
      if (this.novoLivro.anoPublicacao < 1000 || this.novoLivro.anoPublicacao > 9999) {
        this.novoLivro.anoPublicacao = null;
      }
    }
  }

  ativarScannerOCR(): void {
    this.etapa = 'scanner-ocr';
    this.cdr.markForCheck();
  }

  onLivroReconhecido(bookInfo: BookInfo): void {
    // 🆕 Se veio do ImageHash (tem imagemUrl), usa direto
    if (bookInfo.imagemUrl) {
      this.novoLivro.titulo = bookInfo.titulo;
      this.novoLivro.autor = bookInfo.autor;
      this.novoLivro.capa = bookInfo.imagemUrl;

      // 🆕 Dados completos
      this.novoLivro.descricao = bookInfo.descricao || '';
      this.novoLivro.editora = bookInfo.editora || '';
      this.novoLivro.anoPublicacao = bookInfo.anoPublicacao || null;
      this.novoLivro.numeroPaginas = bookInfo.numeroPaginas || null;
      this.novoLivro.generos = bookInfo.generos || [];
      this.novoLivro.idioma = bookInfo.idioma || '';
      this.novoLivro.codigoBarras = bookInfo.codigoBarras || '';
      this.novoLivro.avaliacaoMedia = bookInfo.avaliacaoMedia || null;

      this.livroEncontrado = true;
      this.buscandoInfo = false;
      this.etapa = 'confirmar';

      this.alertService.success('Livro selecionado!');
      this.cdr.markForCheck();
      return;
    }

    // 🔄 Se veio do OCR (só texto), busca no backend
    this.buscandoInfo = true;
    this.etapa = 'confirmar';
    this.cdr.markForCheck();

    this.addBookService.buscarPorTitulo(bookInfo.titulo, bookInfo.autor).subscribe({
      next: (resultados) => {
        this.buscandoInfo = false;

        if (resultados && resultados.length > 0) {
          const livro = resultados[0];

          this.novoLivro.titulo = livro.titulo;
          this.novoLivro.autor = livro.autor;
          this.novoLivro.descricao = livro.descricao || '';
          this.novoLivro.capa = livro.imagem || '';
          this.novoLivro.codigoBarras = livro.codigoBarras || '';
          this.novoLivro.editora = livro.editora || '';
          this.novoLivro.anoPublicacao = livro.anoPublicacao || null;
          this.novoLivro.numeroPaginas = livro.numeroPaginas || null;
          this.novoLivro.generos = livro.generos || [];
          this.novoLivro.idioma = livro.idioma || '';

          this.livroEncontrado = true;
          this.alertService.success('Livro encontrado!');
        } else {
          // Usar dados do OCR
          this.novoLivro.titulo = bookInfo.titulo;
          this.novoLivro.autor = bookInfo.autor;
          this.livroEncontrado = true;
          this.alertService.info('Livro adicionado com dados do OCR');
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.buscandoInfo = false;
        this.novoLivro.titulo = bookInfo.titulo;
        this.novoLivro.autor = bookInfo.autor;
        this.livroEncontrado = true;
        this.cdr.markForCheck();
      }
    });
  }

  async vincularArquivo(): Promise<void> {
    // 🌐 TWA/PWA: usa input file
    if (!Capacitor.isNativePlatform()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.epub,application/pdf,application/epub+zip';
      input.onchange = (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 🆕 Impressão digital: nome + tamanho + data
        // Formato: "pwa://nome.pdf|1234567|1696880000000"
        const nome = file.name;
        const tamanho = file.size;
        const modificado = file.lastModified;

        this.novoLivro.arquivoLeitura = `pwa://${nome}|${tamanho}|${modificado}`;

        this.alertService.success(`Arquivo vinculado: ${nome}`);
        this.cdr.markForCheck();
      };
      input.click();
      return;
    }

    // 📱 Capacitor (Android nativo): FilePicker com URI persistente
    try {
      const result = await FilePicker.pickFiles({
        types: ['application/pdf', 'application/epub+zip'],
        readData: false
      });

      if (!result.files || result.files.length === 0) return;

      const file = result.files[0];
      const uri = file.path || '';

      if (!uri) {
        this.alertService.error('Não foi possível obter o caminho do arquivo.');
        return;
      }

      this.novoLivro.arquivoLeitura = uri;
      this.alertService.success(`Arquivo vinculado: ${file.name}`);
      this.cdr.markForCheck();

    } catch (error: any) {
      if (error?.message?.includes('cancel')) return;
      console.error('Erro ao vincular arquivo:', error);
      this.alertService.error('Erro ao selecionar arquivo.');
    }
  }


  get temArquivoVinculado(): boolean {
    return !!this.novoLivro.arquivoLeitura;
  }

  get nomeArquivoVinculado(): string {
    const uri = this.novoLivro.arquivoLeitura;
    if (!uri) return '';

    // 🆕 Formato TWA: "pwa://nome.pdf|123|456"
    if (uri.startsWith('pwa://')) {
      const semPrefixo = uri.replace('pwa://', '');
      const partes = semPrefixo.split('|');
      return decodeURIComponent(partes[0] || '');
    }

    // 🆕 Formato Capacitor: "content://..." ou caminho normal
    const partes = uri.split('/');
    return decodeURIComponent(partes[partes.length - 1] || '');
  }
}
