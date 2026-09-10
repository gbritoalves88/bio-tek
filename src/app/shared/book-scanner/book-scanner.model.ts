// src/app/shared/book-scanner/book-scanner.model.ts

export interface BookInfo {
  titulo: string;
  autor: string;
  confianca: number;

  // 🆕 Do ImageHash
  idLivro?: string;
  imagemUrl?: string;
  fonte?: string;

  // 🆕 Dados completos
  descricao?: string;
  editora?: string;
  anoPublicacao?: number;
  generos?: string[];
  idioma?: string;
  numeroPaginas?: number;
  codigoBarras?: string;
  avaliacaoMedia?: number;
}
