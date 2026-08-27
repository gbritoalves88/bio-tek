export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  codigoBarras?: string;
  descricao?: string;
  status: StatusLeitura;
  progresso?: number;
  paginaAtual?: number;
  totalPaginas?: number;
  pausado?: boolean;
  ultimaLeitura?: string;
  dataCriacao?: string;
  tipo?: string;                    // 🆕
  minutoAtual?: number | null;      // 🆕
  totalMinutos?: number | null;     // 🆕
  avaliacao?: { nota: number };
}

export interface LivroLeitura {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  status: number;
  dataCriacao?: string;
}

export interface LivroTop {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  media: number;
  totalAvaliacoes: number;
}

export interface DashboardData {
  livroAtual: Livro | null;
  listaLeitura: LivroLeitura[];
  topAvaliados: LivroTop[];
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
