import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  share,
  switchMap,
  tap,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import { MorseSettingsService } from '../../services/morse-settings.service';
import {
  AuthResponse,
  CSRF_PROTECTION_HEADERS,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from './auth.models';

/**
 * Estado de autenticação da aplicação.
 *
 * O access token vive somente neste Signal (memória) e se perde em um reload
 * de página, por design; a sessão é restaurada pelo bootstrap silencioso via
 * cookie httpOnly de refresh, que o navegador envia sozinho — o frontend
 * nunca lê nem manipula esse cookie.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #morseSettings = inject(MorseSettingsService);

  readonly #accessToken = signal<string | null>(null);
  readonly accessToken = this.#accessToken.asReadonly();
  readonly isAuthenticated = computed(() => this.#accessToken() !== null);

  readonly #currentUser = signal<UserProfile | null>(null);
  readonly currentUser = this.#currentUser.asReadonly();

  #refreshInFlight: Observable<string> | null = null;

  login(credentials: LoginRequest): Observable<void> {
    return this.#http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(map((response) => this.#openSession(response.access)));
  }

  /** Cria a conta e autentica na sequência com as mesmas credenciais. */
  register(data: RegisterRequest): Observable<void> {
    return this.#http
      .post<UserProfile>(`${environment.apiUrl}/auth/register`, data)
      .pipe(switchMap(() => this.login({ username: data.username, password: data.password })));
  }

  /**
   * Renova o access token a partir do cookie de refresh. Chamadas simultâneas
   * (ex.: várias requisições respondendo 401 ao mesmo tempo) compartilham a
   * mesma requisição HTTP.
   */
  refresh(): Observable<string> {
    this.#refreshInFlight ??= this.#http
      .post<AuthResponse>(
        `${environment.apiUrl}/auth/refresh`,
        {},
        { withCredentials: true, headers: CSRF_PROTECTION_HEADERS },
      )
      .pipe(
        map((response) => response.access),
        tap((token) => this.#accessToken.set(token)),
        finalize(() => (this.#refreshInFlight = null)),
        share(),
      );
    return this.#refreshInFlight;
  }

  /**
   * Bootstrap silencioso (APP_INITIALIZER): tenta restaurar a sessão no
   * carregamento da aplicação. Sem cookie válido, resolve normalmente e a
   * aplicação segue deslogada.
   */
  async bootstrap(): Promise<void> {
    await firstValueFrom(
      this.refresh().pipe(
        tap(() => this.#loadSessionData()),
        catchError(() => of(null)),
      ),
    );
  }

  /**
   * Encerra a sessão: o backend expira/limpa o cookie de refresh; o access
   * token em memória é simplesmente descartado. Falha na chamada não impede
   * a limpeza local.
   */
  logout(): Observable<void> {
    return this.#http
      .post<void>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true, headers: CSRF_PROTECTION_HEADERS },
      )
      .pipe(
        catchError(() => of(undefined)),
        map(() => this.#closeSession()),
      );
  }

  /** Descarta a sessão local sem chamar o backend (usado quando o refresh falha). */
  clearSession(): void {
    this.#closeSession();
  }

  #openSession(token: string): void {
    this.#accessToken.set(token);
    this.#loadSessionData();
  }

  /** Preferências Morse e perfil; falha em qualquer um não derruba a sessão. */
  #loadSessionData(): void {
    this.#morseSettings.load();
    this.#http.get<UserProfile>(`${environment.apiUrl}/users/profile`).subscribe({
      next: (profile) => this.#currentUser.set(profile),
      error: () => this.#currentUser.set(null),
    });
  }

  #closeSession(): void {
    this.#accessToken.set(null);
    this.#currentUser.set(null);
    this.#morseSettings.clear();
    void this.#router.navigate(['/login']);
  }
}
