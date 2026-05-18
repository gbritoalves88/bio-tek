// src/app/features/login/login.model.ts

export interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  nickname?: string;
  descricao?: string;
  avatar?: string;
  tema: number;
}

export interface LoginResponse {
  token: string;
  novoUsuario: boolean;
  usuario: UsuarioLogin;
}
