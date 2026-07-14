import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Não adicionar token para APIs externas
    if (req.url.includes('api.imgbb.com')) {
      return next.handle(req).pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
    }

    // Só acessa localStorage no navegador
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');

      if (token) {
        const cloned = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });

        return next.handle(cloned).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('usuario');
              this.router.navigate(['/']);
            }
            return throwError(() => error);
          })
        );
      }
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }
}
