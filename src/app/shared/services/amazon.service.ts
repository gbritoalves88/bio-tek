import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AmazonService {
  private readonly TAG = 'bliteca10-20';
  private readonly BUSCA_URL = 'https://www.amazon.com.br/s';

  constructor() {}

  /**
   * Gera link de busca por ISBN (mais confiável)
   */
  gerarLinkPorIsbn(codigoBarras: string | null | undefined): string | null {
    if (!codigoBarras) return null;

    // Remove caracteres não numéricos do ISBN
    const isbn = codigoBarras.replace(/\D/g, '');

    if (!isbn) return null;

    return `${this.BUSCA_URL}?k=${isbn}&tag=${this.TAG}`;
  }

  /**
   * Gera link de busca por título e autor
   */
  gerarLinkPorTitulo(titulo: string, autor?: string): string | null {
    if (!titulo) return null;

    const termos = [titulo, autor].filter(Boolean).join(' ');
    const busca = encodeURIComponent(termos.trim());

    return `${this.BUSCA_URL}?k=${busca}&tag=${this.TAG}`;
  }

  /**
   * Gera o melhor link possível:
   * 1. Busca por ISBN (se disponível)
   * 2. Busca por título + autor (fallback)
   */
  gerarLinkCompleto(livro: any): string | null {
    // 1. Tenta busca por ISBN
    if (livro?.codigoBarras) {
      const linkIsbn = this.gerarLinkPorIsbn(livro.codigoBarras);
      if (linkIsbn) return linkIsbn;
    }

    // 2. Fallback: busca por título + autor
    if (livro?.titulo) {
      return this.gerarLinkPorTitulo(livro.titulo, livro.autor);
    }

    return null;
  }
}
