import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/** Endpoints de autenticação não recebem Bearer nem disparam refresh em 401. */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/');
}

/**
 * Anexa `Authorization: Bearer <access token>` às requisições autenticadas e,
 * em respostas 401 (access token expirado), tenta renovar via
 * `POST /api/auth/refresh` antes de reenviar a requisição original. Se o
 * refresh falhar, a sessão local é descartada e o usuário volta para o login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  const token = auth.accessToken();
  const outgoing = token && !isAuthEndpoint(request.url) ? withBearer(request, token) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const isExpiredToken =
        error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint(request.url);

      if (!isExpiredToken) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          auth.clearSession();
          return throwError(() => refreshError);
        }),
        switchMap((renewedToken) => next(withBearer(request, renewedToken))),
      );
    }),
  );
};
