// src/app/features/perfil/perfil.model.ts

export interface Avaliacao {
  id: string;
  nota: number;
  dataCriacao: string;
}

export interface ComentarioUsuario {
  id: string;
  nickname: string;
}

export interface Comentario {
  id: string;
  comentario: string;
  dataCriacao: string;
  usuario: ComentarioUsuario;
}

export interface LivroDoUsuario {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  status: number;
  estrelas?: number;
  dataCriacao: string;
  tipo?: string;
  minutoAtual?: number | null;
  totalMinutos?: number | null;
  // 🆕 Novos campos
  generos?: string[];
  anoPublicacao?: number | null;
  editora?: string | null;
  idioma?: string | null;
  avaliacao?: Avaliacao | null;
  comentarios?: Comentario[];
}

export interface Usuario {
  id: string;
  nome: string;
  nickname: string;
  email: string;
  descricao?: string;
  avatar?: string;
  tema: number;
  quantidadeLivros: number;
  quantidadeLivrosLidos: number;
  mediaAvaliacoes: number;
  aceitouTermos?: boolean;
  dataAceiteTermos?: string;
  idGoogle?: string;
  adm?: boolean;
  ativo?: boolean;
  dataCriacao?: string;
  dataAtualizacao?: string;
  livros?: LivroDoUsuario[];
}

export interface AtividadeLeitura {
  id: string;
  comentario: string;
  dataCriacao: string;
  origem?: string;
  progresso?: number;
  paginaAtual?: number;
  totalPaginas?: number;
  minutoAtual?: number;
  totalMinutos?: number;
  livro: {
    id: string;
    titulo: string;
    autor: string;
    imagem?: string;
    tipo?: string;
  } | null;
}

export interface StreakData {
  sequenciaAtual: number;
  maiorSequencia: number;
  ultimaDataAtividade: string | null;
  leuHoje: boolean;
}

export interface StreakHistorico {
  dias: string[];
}

export interface MetricasMes {
  livrosLidos: number;
  paginasLidas: number;
  minutosOuvidos: number;
  diasDeLeitura: number;
}
