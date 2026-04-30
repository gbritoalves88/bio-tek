export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  capa: string; // caminho para assets
  progresso?: number; // porcentagem
  capituloAtual?: number;
  totalCapitulos?: number;
  estrelas?: number;
  status?: 'lendo' | 'nao-lido' | 'lido';
}
