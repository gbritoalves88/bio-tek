export interface LivroBiblioteca {
  id: string;
  titulo: string;
  autor: string;
  descricao?: string;
  imagem?: string;
  codigoBarras?: string;
  status: number; // 1=QueroLer, 2=Lendo, 3=Lido
  progresso?: number;
  estrelas?: number;
  dataCriacao?: string;
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
