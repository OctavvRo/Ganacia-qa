import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea pantallas privadas si no existe una sesion valida en backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.cargarSesion().pipe(
      map(() => true),
      catchError(() => of(this.router.createUrlTree(['/login']))),
    );
  }
}
