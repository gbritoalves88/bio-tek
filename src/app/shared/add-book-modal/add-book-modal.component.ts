// src/app/shared/add-book-modal/add-book-modal.component.ts

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

  etapa: 'escolha' | 'scanner' | 'digitar' | 'manual' | 'confirmar' = 'escolha';
  escaneando = false;
  buscandoInfo = false;
  livroEncontrado = false;
  livroNaoEncontrado = false;
  flashAtivo = false;

  private readonly TAMANHO_MAXIMO = 10 * 1024 * 1024;
  private readonly COMPRESSAO_MAX_WIDTH = 1200;
  private readonly COMPRESSAO_QUALIDADE = 0.7;

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
  private comprimirImagem(base64: string, maxWidth: number = 1200, qualidade: number = 0.7): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
    });
  }

  tirarFoto(): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
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
}
