// src/app/features/biblioteca/biblioteca.model.ts

export interface ComentarioLivro {
  id: string;
  comentario: string;
  dataCriacao: string;
  usuario: {
    id: string;
    nome: string;
    nickname: string;
    avatar?: string;
  };
}

export interface LivroBiblioteca {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  status: number;
  progresso?: number;
  estrelas?: number;
  dataCriacao?: string;
  dataAtualizacao?: string;
  avaliacao?: {
    id: string;
    nota: number;
    dataCriacao: string;
  };
  comentarios?: ComentarioLivro[];
}

export enum StatusLeitura {
  QueroLer = 1,
  Lendo = 2,
  Lido = 3
}

export enum Nota {
  MuitoRuim = 1,
  Ruim = 2,
  Regular = 3,
  Bom = 4,
  Excelente = 5
}
