import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MorseSettingsService, UserMorseSettings } from './morse-settings.service';

const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

describe('MorseSettingsService', () => {
  let service: MorseSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MorseSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('load: busca as preferências e as mantém em memória', () => {
    service.load();

    const request = http.expectOne('/api/users/morse-settings');
    expect(request.request.method).toBe('GET');
    request.flush(SETTINGS);

    expect(service.settings()).toEqual(SETTINGS);
  });

  it('save: envia PUT com os nomes de campo do contrato e atualiza o estado', () => {
    const changed: UserMorseSettings = { ...SETTINGS, speed_wpm: 40, input_key: 'KeyA' };
    service.save(changed).subscribe();

    const request = http.expectOne('/api/users/morse-settings');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(changed);
    request.flush(changed);

    expect(service.settings()).toEqual(changed);
  });

  it('save: em erro de validação, propaga e não altera o estado local', () => {
    service.load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    let failed = false;
    service.save({ ...SETTINGS, input_key: 'KeyZ' }).subscribe({ error: () => (failed = true) });

    http
      .expectOne('/api/users/morse-settings')
      .flush({ input_key: ['Tecla não permitida.'] }, { status: 400, statusText: 'Bad Request' });

    expect(failed).toBe(true);
    expect(service.settings()).toEqual(SETTINGS);
  });

  it('loadAllowedKeys: expõe a whitelist do backend como lista de códigos', () => {
    service.loadAllowedKeys();

    const request = http.expectOne('/api/morse-settings/allowed-keys');
    expect(request.request.method).toBe('GET');
    request.flush([{ code: 'Enter' }, { code: 'KeyA' }, { code: 'Space' }]);

    expect(service.allowedKeys()).toEqual(['Enter', 'KeyA', 'Space']);
  });

  it('loadAllowedKeys: falha resulta em lista indisponível (null)', () => {
    service.loadAllowedKeys();

    http
      .expectOne('/api/morse-settings/allowed-keys')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(service.allowedKeys()).toBeNull();
  });

  it('clear: descarta preferências e whitelist', () => {
    service.load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    service.loadAllowedKeys();
    http.expectOne('/api/morse-settings/allowed-keys').flush([{ code: 'Space' }]);

    service.clear();

    expect(service.settings()).toBeNull();
    expect(service.allowedKeys()).toBeNull();
  });
});
