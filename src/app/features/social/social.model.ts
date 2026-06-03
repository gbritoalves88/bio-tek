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
  Adm?: boolean;  // ⬅️ COM A MAIÚSCULO
  adm?: boolean;  // ⬅️ TAMBÉM ACEITA MINÚSCULO (fallback)
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
