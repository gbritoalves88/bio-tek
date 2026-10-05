import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  async canActivate(): Promise<boolean> {
    const token = this.getTokenValido();
    const refreshToken = this.getRefreshTokenValido();

    if (!token && !refreshToken) {
      this.router.navigate(['/']);
      return false;
    }

    if (token) {
      return true;
    }

    // Só refreshToken, tenta renovar
    if (refreshToken) {
      try {
        const response: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/Auth/refresh`, { refreshToken })
        );

        if (!response?.token || !response?.refreshToken) {
          this.limparTokens();
          this.router.navigate(['/']);
          return false;
        }

        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        return true;
      } catch {
        this.limparTokens();
        this.router.navigate(['/']);
        return false;
      }
    }

    this.router.navigate(['/']);
    return false;
  }

  // 🆕 Helpers
  private getTokenValido(): string | null {
    const t = localStorage.getItem('token');
    if (!t || t === 'undefined' || t === 'null' || t.length < 10) return null;
    return t;
  }

  private getRefreshTokenValido(): string | null {
    const t = localStorage.getItem('refreshToken');
    if (!t || t === 'undefined' || t === 'null' || t.length < 10) return null;
    return t;
  }

  private limparTokens(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
  }
}
