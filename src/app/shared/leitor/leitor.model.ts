export interface ArquivoParaAbrir {
  path: string;
  livroId: string;
  tipo: 'pdf' | 'epub';
  progressoInicial?: number;
  paginaInicial?: number;
  cfiInicial?: string;
  tituloLivro?: string;
}

export interface ProgressoLeitura {
  paginaAtual?: number | null;
  totalPaginas?: number | null;
  progresso?: number | null;
  cfi?: string | null; // 🆕 Salva a posição exata do EPUB
}
