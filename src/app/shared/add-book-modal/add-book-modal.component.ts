import { Component, EventEmitter, Output, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { AddBookModalService } from './add-book-modal.service';
import { UploadService } from '../services/upload.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-add-book-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  templateUrl: './add-book-modal.component.html',
  styleUrl: './add-book-modal.component.scss'
})
export class AddBookModalComponent {
  @Output() fechar = new EventEmitter<void>();
  @Output() livroAdicionado = new EventEmitter<any>();

  abaAtiva: 'manual' | 'codigo' = 'codigo';
  escaneando = false;
  buscandoInfo = false;
  livroEncontrado = false;
  livroNaoEncontrado = false;
  flashAtivo = false;

  // ⬅️ AUMENTAR LIMITE PARA 10MB (arquivo original)
  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10MB

  // ⬅️ CONFIGURAÇÕES DE COMPRESSÃO
  private readonly COMPRESSAO_MAX_WIDTH = 1200; // pixels
  private readonly COMPRESSAO_QUALIDADE = 0.7; // 70%

  novoLivro = {
    titulo: '',
    autor: '',
    descricao: '',
    codigoBarras: '',
    capa: ''
  };

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
    this.novoLivro = { titulo: '', autor: '', descricao: '', codigoBarras: '', capa: '' };
    this.livroEncontrado = false;
    this.livroNaoEncontrado = false;
    this.buscandoInfo = false;
    this.cdr.markForCheck();
    this.fechar.emit();
  }

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
    this.cdr.markForCheck();
    this.buscarPorCodigo();
  }

  onHasDevices(hasDevices: boolean): void { this.scannerDisponivel = hasDevices; this.cdr.markForCheck(); }
  onScanError(error: any): void {
    this.escaneando = false;
    this.cdr.markForCheck();
  }

  buscarPorCodigo(): void {
    if (!this.novoLivro.codigoBarras) {
      this.alertService.warning('Digite ou escaneie um código de barras');
      return;
    }

    this.buscandoInfo = true;
    this.livroEncontrado = false;
    this.livroNaoEncontrado = false;
    this.cdr.markForCheck();

    this.addBookService.buscarPorCodigoBarras(this.novoLivro.codigoBarras).subscribe({
      next: (livro) => {
        this.buscandoInfo = false;
        if (livro && livro.titulo) {
          this.novoLivro.titulo = livro.titulo;
          this.novoLivro.autor = livro.autor;
          this.novoLivro.descricao = livro.descricao || '';
          this.novoLivro.capa = livro.imagem || '';
          this.livroEncontrado = true;
          this.alertService.success('Livro encontrado! Verifique os dados.');
        } else {
          this.livroNaoEncontrado = true;
          this.alertService.info('Livro não encontrado. Preencha os dados manualmente.');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.buscandoInfo = false;
        this.livroNaoEncontrado = true;
        this.cdr.markForCheck();

        if (err.status === 404) {
          this.alertService.info('ISBN não encontrado. Preencha os dados manualmente.');
        } else {
          this.alertService.error('Erro ao buscar livro. Tente novamente.');
        }
      }
    });
  }

  async fazerUploadEFinalizar(): Promise<void> {
    // Validações antes de enviar
    if (!this.novoLivro.titulo || !this.novoLivro.titulo.trim()) {
      this.alertService.warning('Preencha o título do livro');
      return;
    }

    if (!this.novoLivro.autor || !this.novoLivro.autor.trim()) {
      this.alertService.warning('Preencha o autor do livro');
      return;
    }

    // Se não tem imagem, salva direto
    if (!this.novoLivro.capa || !this.novoLivro.capa.startsWith('data:')) {
      this.adicionarLivro();
      return;
    }

    // Se tem imagem, comprime e faz upload
    try {
      // ⬅️ COMPRESSÃO MAIS EFICIENTE
      const imagemComprimida = await this.comprimirImagem(
        this.novoLivro.capa,
        this.COMPRESSAO_MAX_WIDTH,
        this.COMPRESSAO_QUALIDADE
      );

      this.uploadService.uploadImagem(imagemComprimida).subscribe({
        next: (url) => {
          this.novoLivro.capa = url;
          this.adicionarLivro();
        },
        error: () => {
          this.alertService.error('Erro ao enviar imagem. Tente novamente.');
          this.adicionarLivro();
        }
      });
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      this.alertService.error('Erro ao processar imagem');
      this.adicionarLivro();
    }
  }

  private adicionarLivro(): void {
    const dados = {
      titulo: this.novoLivro.titulo.trim(),
      autor: this.novoLivro.autor.trim(),
      descricao: this.novoLivro.descricao || '',
      imagem: this.novoLivro.capa || null,
      codigoBarras: this.novoLivro.codigoBarras || null
    };

    this.addBookService.adicionarLivro(dados).subscribe({
      next: (livro) => {
        this.livroAdicionado.emit(livro);
        this.fecharModal();
      },
      error: (err) => {
        if (err.status === 0) {
          this.alertService.error('Erro de conexão com o servidor');
        } else if (err.status === 401) {
          this.alertService.error('Sessão expirada. Faça login novamente.');
        } else if (err.status === 403) {
          this.alertService.error('Você não tem permissão para adicionar livros.');
        } else if (err.status === 409) {
          this.alertService.warning('Este livro já existe na sua biblioteca.');
        } else if (err.status === 400) {
          this.alertService.warning('Dados inválidos. Verifique as informações.');
        } else {
          this.alertService.error('Erro ao adicionar livro. Tente novamente.');
        }
      }
    });
  }

  adicionarLivroEncontrado(): void {
    this.fazerUploadEFinalizar();
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

  // ⬅️ COMPRESSÃO OTIMIZADA
  private comprimirImagem(base64: string, maxWidth: number = 1200, qualidade: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensiona se necessário
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erro ao criar canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta JPEG primeiro (melhor compressão), fallback para PNG
        try {
          resolve(canvas.toDataURL('image/jpeg', qualidade));
        } catch {
          resolve(canvas.toDataURL('image/png', qualidade));
        }
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    });
  }

  // ⬅️ PROCESSAMENTO DE IMAGEM COM COMPRESSÃO ANTES DO LIMITE
  private processarImagem(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Verifica tipo
      if (!file.type.startsWith('image/')) {
        reject(new Error('Apenas imagens são permitidas'));
        return;
      }

      // Avisa se for muito grande, mas não bloqueia
      if (file.size > this.TAMANHO_MAXIMO) {
        this.alertService.warning(`Imagem grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Será comprimida automaticamente.`);
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        // Comprime antes de salvar o preview
        try {
          const comprimida = await this.comprimirImagem(base64, this.COMPRESSAO_MAX_WIDTH, this.COMPRESSAO_QUALIDADE);
          resolve(comprimida);
        } catch {
          // Fallback: usa a imagem original
          resolve(base64);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
      reader.readAsDataURL(file);
    });
  }

  tirarFoto(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const imagemComprimida = await this.processarImagem(file);
        this.novoLivro.capa = imagemComprimida;
        this.alertService.success('Imagem selecionada e otimizada!');
        this.cdr.markForCheck();
      } catch (error: any) {
        this.alertService.error(error.message || 'Erro ao processar imagem');
      }
    };
    input.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Processa a imagem de forma assíncrona
    this.processarImagem(file)
      .then(imagemComprimida => {
        this.novoLivro.capa = imagemComprimida;
        this.alertService.success('Imagem selecionada e otimizada!');
        this.cdr.markForCheck();
      })
      .catch(error => {
        this.alertService.error(error.message || 'Erro ao processar imagem');
      });
  }
}
