import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginResponse, UsuarioLogin } from './login.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  // ============ LOGIN: TWA / Web (Google Authorization Code) ============
  loginComGoogleCode(code: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/google-code`, {
      code,
      redirectUri: environment.google.redirectUri
    }).pipe(
      tap(response => this.persistirSessao(response))
    );
  }

  // ============ LOGIN: Capacitor nativo (Google ID Token) ============
  loginComGoogleToken(idToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/google`, {
      idToken
    }).pipe(
      tap(response => this.persistirSessao(response))
    );
  }

  // ============ LOGIN: Mock (dev) ============
  loginMock(nome: string, email: string, nickname?: string): Observable<LoginResponse> {
    const id = 'mock-' + Date.now();
    return this.http.post<LoginResponse>(`${this.apiUrl}/mock`, {
      id,
      idToken: 'fake-mock-token',
      nome,
      email,
      nickname
    }).pipe(
      tap(response => {
        if (!response?.token) {
          throw new Error('Resposta de login mock sem token');
        }
        localStorage.setItem('token', response.token);
        // Mock não tem refreshToken real — não persiste
        const usuario = this.normalizarUsuario(response.usuario);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      })
    );
  }

  // ============ HELPERS ============

  /**
   * Persiste a sessão no localStorage, validando a resposta do backend.
   * Lança erro se o backend não retornar token/refreshToken — evita
   * salvar "undefined" no localStorage (bug histórico).
   */
  private persistirSessao(response: LoginResponse): void {
    if (!response?.token) {
      console.error('❌ Login sem token:', response);
      throw new Error('Resposta de login sem token de acesso');
    }

    if (!response.refreshToken) {
      console.warn('⚠️ Login sem refreshToken. Sessão não vai renovar sozinha.');
      // Não lança — salva mesmo assim
    }

    localStorage.setItem('token', response.token);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    const usuario = this.normalizarUsuario(response.usuario);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  /**
   * Normaliza o usuário vindo do backend.
   * Resolve o conflito adm/Adm (PascalCase vs camelCase) e garante defaults.
   */
  private normalizarUsuario(u: any): UsuarioLogin {
    return {
      id: u?.id ?? '',
      nome: u?.nome ?? '',
      email: u?.email ?? '',
      nickname: u?.nickname,
      descricao: u?.descricao,
      avatar: u?.avatar,
      tema: u?.tema ?? 1,
      adm: u?.adm ?? u?.Adm ?? false,
      aceitouTermos: u?.aceitouTermos ?? false
    };
  }

  // ============ API PÚBLICA ============

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('refreshToken');
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  getUsuario(): UsuarioLogin | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('usuario');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioLogin;
    } catch {
      return null;
    }
  }

  estaLogado(): boolean {
    return !!this.getToken();
  }

  /**
   * Limpa a sessão local. NÃO navega — quem decide pra onde ir é o caller
   * (interceptor, guard ou componente), evitando navegação dupla.
   */
  sair(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
  }
}
