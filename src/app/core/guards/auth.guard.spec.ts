import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  function runGuard(url = '/dashboard'): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('bloqueia sem sessão, redirecionando ao login com returnUrl', () => {
    const result = runGuard('/dashboard');

    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('permite acesso com sessão ativa', () => {
    const auth = TestBed.inject(AuthService);
    auth.refresh().subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/refresh').flush({ access: 't' });

    expect(runGuard()).toBe(true);
  });
});
