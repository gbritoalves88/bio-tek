export interface LivroDetalhes {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  editora?: string;
  anoPublicacao?: number;
  numeroPaginas?: number;
  codigoBarras?: string;
  generos?: string[];
  descricao?: string;
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  totalNaBiblioteca: number;
  totalLendo: number;
  totalLido: number;
  totalQueroLer: number;
}

export interface LivroDetalhesInterno {
  avaliacaoMedia: number;
  totalAvaliacoes: number;
  totalNaBiblioteca: number;
  totalLendo: number;
  totalLido: number;
  totalQueroLer: number;
}
