import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize, timeout } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  private readonly REFRESH_TIMEOUT_MS = 15000;
  private readonly QUEUE_TIMEOUT_MS = 20000;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private http: HttpClient
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('api.imgbb.com') || req.url.includes('/Auth/refresh')) {
      return next.handle(req);
    }

    if (!isPlatformBrowser(this.platformId)) {
      return next.handle(req);
    }

    const token = this.getTokenValido();
    if (!token) {
      return next.handle(req);
    }

    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });

    return next.handle(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        // 🆕 Só tenta refresh em 401 real. Erros de rede (0), timeout, 500, etc.
        //    passam direto — NÃO derrubam a sessão.
        if (error.status === 401 && !req.url.includes('/Auth/refresh')) {
          return this.tentarRefreshToken(cloned, next);
        }
        return throwError(() => error);
      })
    );
  }

  private tentarRefreshToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.getRefreshTokenValido();

      if (!refreshToken) {
        return this.encerrarSessao();
      }

      return this.http
        .post<any>(`${environment.apiUrl}/Auth/refresh`, { refreshToken })
        .pipe(
          timeout(this.REFRESH_TIMEOUT_MS),
          switchMap((response) => {
            const novoToken = response?.token;
            const novoRefresh = response?.refreshToken;

            if (!novoToken || !novoRefresh) {
              return this.encerrarSessao();
            }

            localStorage.setItem('token', novoToken);
            localStorage.setItem('refreshToken', novoRefresh);

            this.refreshTokenSubject.next(novoToken);
            this.isRefreshing = false;

            return next.handle(this.adicionarToken(req, novoToken));
          }),
          catchError((err) => {
            // 🆕 Só encerra sessão se o backend RESPONDEU dizendo que o refresh
            //    é inválido (401/403). Se foi timeout/erro de rede, propaga sem
            //    derrubar a sessão.
            if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
              return this.encerrarSessao();
            }
            this.isRefreshing = false;
            this.refreshTokenSubject.next(null);
            return throwError(() => err);
          }),
          finalize(() => {
            this.isRefreshing = false;
          })
        );
    }

    return this.refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.adicionarToken(req, token))),
      timeout(this.QUEUE_TIMEOUT_MS),
      catchError((err) => {
        // 🆕 Mesma regra: só encerra sessão em 401/403 real
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          return this.encerrarSessao();
        }
        return throwError(() => err);
      })
    );
  }

  private adicionarToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private encerrarSessao(): Observable<never> {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');

    const urlAtual = this.router.url;
    if (!urlAtual.startsWith('/login') && urlAtual !== '/') {
      this.router.navigate(['/']);
    }

    return throwError(() => new Error('Sessão expirada'));
  }

  private getTokenValido(): string | null {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return null;
    }
    return token;
  }

  private getRefreshTokenValido(): string | null {
    const token = localStorage.getItem('refreshToken');
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return null;
    }
    return token;
  }
}
