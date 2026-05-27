// src/app/shared/add-book-modal/add-book-modal.component.ts

import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { AddBookModalService } from './add-book-modal.service';
import { UploadService } from '../../shared/services/upload.service';

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
  private readonly TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2MB

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
    private uploadService: UploadService, // ⬅️ Upload compartilhado
    private cdr: ChangeDetectorRef
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
  onScanError(error: any): void { console.error('Erro no scanner:', error); this.escaneando = false; this.cdr.markForCheck(); }

  buscarPorCodigo(): void {
    if (!this.novoLivro.codigoBarras) return;
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
        } else {
          this.livroNaoEncontrado = true;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.buscandoInfo = false; this.livroNaoEncontrado = true; this.cdr.markForCheck(); }
    });
  }

  // ⬅️ NOVO: Comprime + Upload + Salva
  async fazerUploadEFinalizar(): Promise<void> {
    if (!this.novoLivro.capa || !this.novoLivro.capa.startsWith('data:')) {
      this.adicionarLivro();
      return;
    }

    try {
      const imagemComprimida = await this.comprimirImagem(this.novoLivro.capa, 800, 0.6);
      this.uploadService.uploadImagem(imagemComprimida).subscribe({
        next: (url) => {
          this.novoLivro.capa = url;
          this.adicionarLivro();
        },
        error: () => this.adicionarLivro()
      });
    } catch {
      this.adicionarLivro();
    }
  }

  private adicionarLivro(): void {
    const dados = {
      titulo: this.novoLivro.titulo,
      autor: this.novoLivro.autor,
      descricao: this.novoLivro.descricao,
      imagem: this.novoLivro.capa || null,
      codigoBarras: this.novoLivro.codigoBarras || null
    };
    this.addBookService.adicionarLivro(dados).subscribe({
      next: (livro) => { this.livroAdicionado.emit(livro); this.fecharModal(); },
      error: (err) => console.error('Erro:', err)
    });
  }

  adicionarLivroEncontrado(): void { this.fazerUploadEFinalizar(); }

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

  private comprimirImagem(base64: string, maxWidth: number = 800, qualidade: number = 0.7): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
    });
  }

  tirarFoto(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // ⬅️ Valida tipo
      if (!file.type.startsWith('image/')) {
        console.warn('Apenas imagens são permitidas');
        return;
      }

      // ⬅️ Valida tamanho
      if (file.size > this.TAMANHO_MAXIMO) {
        console.warn(`Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => { this.novoLivro.capa = reader.result as string; this.cdr.markForCheck(); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // ⬅️ Valida tipo
    if (!file.type.startsWith('image/')) {
      console.warn('Apenas imagens são permitidas');
      return;
    }

    // ⬅️ Valida tamanho
    if (file.size > this.TAMANHO_MAXIMO) {
      console.warn(`Imagem muito grande. Máximo: ${this.TAMANHO_MAXIMO / 1024 / 1024}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => { this.novoLivro.capa = reader.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }
}
