import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { App } from './app';

describe('App', () => {
  it('cria o shell com o header e o router-outlet', async () => {
    const { fixture } = await render(App, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    expect(screen.getByRole('link', { name: /lmc/i })).toBeVisible();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
