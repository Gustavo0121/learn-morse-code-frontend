import { provideRouter } from '@angular/router';
import { render } from '@testing-library/angular';

import { App } from './app';

describe('App', () => {
  it('cria o shell da aplicação com o router-outlet', async () => {
    const { fixture } = await render(App, { providers: [provideRouter([])] });

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
