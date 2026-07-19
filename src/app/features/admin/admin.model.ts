export interface AdminDashboard {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalComentarios: number;
  comentariosFlagged: number;
  totalLivros: number;
  totalAcessos: number;           // 🆕
  acessos7Dias: number;           // 🆕
  acessos30Dias: number;          // 🆕
  mediaAcessosPorUsuario: number; // 🆕
  usuariosAtivos30Dias: number;   // 🆕
}

export interface AdminComentario {
  id: string;
  idLivro: string;
  idUsuario: string;
  comentario: string;
  dataCriacao: string;
  flagged: boolean;
  toxicidadeScore: number | null;
  usuario: { id: string; nome: string; nickname: string } | null;
}

export interface AdminUsuario {
  id: string;
  nome: string;
  nickname: string;
  email: string;
  ativo: boolean;
  adm: boolean;
  dataCriacao: string;
  quantidadeLivros: number;
  quantidadeLivrosLidos: number;
  totalLivros?: number;
  totalLivrosLidos?: number;
  avatar?: string;
  aceitouTermos?: boolean;
  dataAceiteTermos?: string;
  descricao?: string;
  mediaAvaliacoes?: number;
  totalAcessos?: number;      // 🆕
  ultimoAcesso?: string;       // 🆕
  acessos30Dias?: number;      // 🆕
}

export interface Paginado<T> {
  dados: T[];
  total: number;
  totalPaginas: number;
  pagina: number;
}
