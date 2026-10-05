export interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  nickname?: string;
  descricao?: string;
  avatar?: string;
  tema: number;
  adm?: boolean;
  Adm?: boolean;         // fallback enquanto backend não normalizar
  aceitouTermos?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;   // ⬅️ opcional — sempre validar
  novoUsuario: boolean;
  precisaAceitarTermos?: boolean;
  usuario: UsuarioLogin;
}
