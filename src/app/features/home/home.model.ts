export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  status?: number;
  progresso?: number;
  tipo?: string;
  totalPaginas?: number;
  totalMinutos?: number;
  paginaAtual?: number;
  minutoAtual?: number;
  pausado?: boolean;
  ultimaLeitura?: string;
  // 🆕 Novos campos
  generos?: string[];
  anoPublicacao?: number;
  editora?: string;
  idioma?: string;
  arquivoLeitura?: string | null;  // 🆕
}

export interface LivroLeitura {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  status?: number;
  tipo?: string;
  totalPaginas?: number;
  totalMinutos?: number;
  dataCriacao?: string;
  // 🆕 Novos campos
  generos?: string[];
  anoPublicacao?: number;
  editora?: string;
  idioma?: string;
  arquivoLeitura?: string | null;  // 🆕
}

export interface LivroTop {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  tipo?: string;
  totalPaginas?: number;
  totalMinutos?: number;
  media?: number;
  totalAvaliacoes?: number;
  // 🆕 Novos campos
  generos?: string[];
  anoPublicacao?: number;
  editora?: string;
  idioma?: string;
  arquivoLeitura?: string | null;  // 🆕
}

export interface DashboardData {
  livroAtual: Livro | null;
  outrosEmAndamento?: any[];   // 🆕
  listaLeitura: LivroLeitura[];
  topAvaliados: LivroTop[];
  streak?: {
    sequenciaAtual: number;
    maiorSequencia: number;
    ultimaDataAtividade: string | null;
    leuHoje: boolean;
  } | null;
}

export enum StatusLeitura {
  QueroLer = 1,
  Lendo = 2,
  Lido = 3
}

export interface StreakData {
  sequenciaAtual: number;
  maiorSequencia: number;
  ultimaDataAtividade: string | null;
  leuHoje: boolean;
}

// ============ OFERTAS (Amazon Afiliado) ============
export interface BookOffer {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  affiliateUrl: string;
  displayOrder: number;
}

export interface BookOffersResponse {
  offers: BookOffer[];
  updatedAt: string;
}
