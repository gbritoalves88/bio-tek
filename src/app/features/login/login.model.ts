export interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  nickname?: string;
  descricao?: string;
  avatar?: string;
  tema: number;
  adm: boolean;  // ⬅️ minúsculo para consistência
  Adm?: boolean;
  aceitouTermos?: boolean;  // ⬅️ fallback
}

export interface LoginResponse {
  token: string;
  novoUsuario: boolean;
  usuario: UsuarioLogin;
}
