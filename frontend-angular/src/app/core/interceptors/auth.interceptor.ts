import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Envia cookies al backend y redirige a login ante sesiones vencidas.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const request = req.clone({ withCredentials: true });

    return next.handle(request).pipe(
      catchError((error) => {
        if (error?.status === 401 && !req.url.includes('/auth/login')) {
          this.auth.limpiarSesionLocal();
          void this.router.navigate(['/login']);
        }
        return throwError(() => error);
      }),
    );
  }
}
