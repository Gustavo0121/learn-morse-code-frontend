import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  function authenticate(token: string): void {
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush({ access: token });
  }

  it('anexa Authorization: Bearer às requisições autenticadas', () => {
    authenticate('token-a');

    client.get('/api/lessons').subscribe();

    const request = http.expectOne('/api/lessons');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-a');
    request.flush([]);
  });

  it('não anexa token nem tenta refresh em endpoints de autenticação', () => {
    authenticate('token-a');

    let failed = false;
    client.post('/api/auth/login', {}).subscribe({ error: () => (failed = true) });

    const request = http.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ detail: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
  });

  it('em 401, renova o token via cookie e reenvia a requisição original', () => {
    authenticate('token-expirado');

    let result: unknown;
    client.get('/api/lessons').subscribe((response) => (result = response));

    http
      .expectOne('/api/lessons')
      .flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush({ access: 'token-novo' });

    const retried = http.expectOne('/api/lessons');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer token-novo');
    retried.flush(['ok']);

    expect(result).toEqual(['ok']);
    expect(auth.accessToken()).toBe('token-novo');
  });

  it('se o refresh falhar, limpa a sessão e redireciona para /login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    authenticate('token-expirado');

    let failed = false;
    client.get('/api/lessons').subscribe({ error: () => (failed = true) });

    http
      .expectOne('/api/lessons')
      .flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne('/api/auth/refresh')
      .flush({ detail: 'invalid cookie' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
