// src/app/shared/capa-hash/capa-hash.model.ts

export interface LivroEncontrado {
  idLivro: string;
  fonte: string;        // "Catalogo" | "Livro"
  titulo: string;
  autor: string;
  imagemUrl?: string;
  similaridade: number;

  // 🆕 Dados completos (retornados pelo backend)
  descricao?: string;
  editora?: string;
  anoPublicacao?: number;
  generos?: string[];
  idioma?: string;
  numeroPaginas?: number;
  codigoBarras?: string;
  avaliacaoMedia?: number;
}

export interface BuscarPorCapaRequest {
  imagemBase64: string;
}
