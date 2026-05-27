export interface Livro {
  id: string;              // Era number, agora string (GUID)
  titulo: string;
  autor: string;
  imagem?: string;         // URL da capa (ImgBB ou placeholder)
  codigoBarras?: string;
  descricao?: string;
  status: StatusLeitura;   // Enum numérico
  progresso?: number;
  estrelas?: number;       // Mock por enquanto
  dataCriacao?: string;
  avaliacao?: {      // ⬅️ Adicione se não existir
    nota: number;
  };
}

export enum StatusLeitura {
  QueroLer = 1,
  Lendo = 2,
  Lido = 3
}
