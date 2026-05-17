
export interface Seguidor {
  id: string;
  idUsuario: string;
  idSeguidor: string;
  dataCriacao: string;
}

export interface UsuarioSocial {
  id: string;
  nome: string;
  nickname: string;
  avatar?: string;
  descricao?: string;
  quantidadeLivros: number;
  quantidadeLivrosLidos: number;
  mediaAvaliacoes: number;
}

export interface LivroSocial {
  id: string;
  titulo: string;
  autor: string;
  imagem?: string;
  status: number;
  dataCriacao: string;
  estrelas?: number;
}
