export interface Comentario {
  id: string;
  idUsuario: string;
  usuarioNome?: string;
  usuarioNickname?: string;
  comentario: string;
  dataCriacao: string;
  usuario?: {
    id: string;
    nome: string;
    nickname: string;
    avatar?: string;
  };
}
export interface AtividadeComunidade {
  curtidas: number;
  curtiu: boolean;
  id: string;
  tipo: 'livro_novo' | 'livro_lido' | 'livro_lendo' | 'livro_avaliado' | 'livro_progresso';
  usuario: {
    segue: any;
    id: string;
    nome: string;
    nickname: string;
    avatar?: string;
  };
  livro: {
    id: string;
    titulo: string;
    autor: string;
    descricao?: string;
    imagem?: string;
  };
  avaliacao?: {
    id?: string;
    nota: number;
  };
  comentarios?: Comentario[];
  data: string;
  progresso?: number;
  paginaAtual?: number;
  totalPaginas?: number;
  minutoAtual?: number;
  totalMinutos?: number;
  frase?: string;
}
