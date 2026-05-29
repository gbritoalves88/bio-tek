// src/app/features/perfil/perfil.model.ts

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
  aceitouTermos?: boolean;       // ⬅️ NOVO
  dataAceiteTermos?: string;     // ⬅️ NOVO
  idGoogle?: string;
  adm?: boolean;
  ativo?: boolean;
  dataCriacao?: string;
  dataAtualizacao?: string;
}
