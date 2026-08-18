import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private http: HttpClient
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('api.imgbb.com') || req.url.includes('/auth/refresh')) {
      return next.handle(req);
    }

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');

      if (token) {
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });

        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              return this.tentarRefreshToken(cloned, next);
            }
            return throwError(() => error);
          })
        );
      }
    }

    return next.handle(req);
  }

  private tentarRefreshToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        this.fazerLogout();
        return throwError(() => new Error('Sem refresh token'));
      }

      return this.http.post<any>(`${environment.apiUrl}/Auth/refresh`, { refreshToken }).pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
          this.refreshTokenSubject.next(response.token);
          return next.handle(this.adicionarToken(req, response.token));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.fazerLogout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.adicionarToken(req, token!)))
      );
    }
  }

  private adicionarToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  private fazerLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
