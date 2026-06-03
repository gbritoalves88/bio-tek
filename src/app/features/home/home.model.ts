export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  codigoBarras?: string;
  descricao?: string;
  status: StatusLeitura;
  progresso?: number;
  estrelas?: number;
  dataCriacao?: string;
  avaliacao?: {
    nota: number;
  };
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
  livroAtual: Livro | null;        // ⬅️ ADICIONAR
  listaLeitura: LivroLeitura[];
  topAvaliados: LivroTop[];
}

export enum StatusLeitura {
  QueroLer = 1,
  Lendo = 2,
  Lido = 3
}
