export interface Prateleira {
  id: string;
  nome: string;
  descricao?: string | null;
  totalLivros?: number;
  capas?: string[];
  dataCriacao?: string;
}
