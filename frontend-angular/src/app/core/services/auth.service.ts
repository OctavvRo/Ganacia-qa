import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface UsuarioAutenticado {
  id: string;
  correo: string;
}

/**
 * Maneja sesion del usuario. El token vive en cookie HttpOnly del backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarioSubject = new BehaviorSubject<UsuarioAutenticado | null>(null);
  usuario$ = this.usuarioSubject.asObservable();

  constructor(private api: ApiService) {}

  login(correo: string, contrasena: string): Observable<UsuarioAutenticado> {
    return this.api
      .post<{ usuario: UsuarioAutenticado }>('/auth/login', { correo, contrasena })
      .pipe(
        map((respuesta) => respuesta.usuario),
        tap((usuario) => this.usuarioSubject.next(usuario)),
      );
  }

  cargarSesion(): Observable<UsuarioAutenticado> {
    return this.api.get<{ usuario: UsuarioAutenticado }>('/auth/me').pipe(
      map((respuesta) => respuesta.usuario),
      tap((usuario) => this.usuarioSubject.next(usuario)),
    );
  }

  logout(): Observable<unknown> {
    return this.api.post('/auth/logout', {}).pipe(tap(() => this.usuarioSubject.next(null)));
  }

  limpiarSesionLocal(): void {
    this.usuarioSubject.next(null);
  }
}
