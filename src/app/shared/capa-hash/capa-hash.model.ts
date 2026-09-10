// src/app/shared/capa-hash/capa-hash.model.ts

export interface LivroEncontrado {
  idLivro: string;
  fonte: string;        // "Catalogo" | "Livro"
  titulo: string;
  autor: string;
  imagemUrl?: string;
  similaridade: number; // 0-100
}

export interface BuscarPorCapaRequest {
  imagemBase64: string;
}
