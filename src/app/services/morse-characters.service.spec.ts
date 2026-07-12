import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MorseCharacter, MorseCharactersService } from './morse-characters.service';

const CHARACTERS: MorseCharacter[] = [
  { id: 1, character: 'A', code: '.-', type: 'letter' },
  { id: 2, character: '5', code: '.....', type: 'number' },
];

describe('MorseCharactersService', () => {
  let service: MorseCharactersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MorseCharactersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca o alfabeto uma única vez e cacheia (conteúdo estático)', () => {
    const results: MorseCharacter[][] = [];
    service.list().subscribe((characters) => results.push(characters));

    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    service.list().subscribe((characters) => results.push(characters));
    http.expectNone('/api/morse-characters');

    expect(results).toEqual([CHARACTERS, CHARACTERS]);
  });

  it('falha descarta o cache e permite nova tentativa', () => {
    let failed = false;
    service.list().subscribe({ error: () => (failed = true) });
    http
      .expectOne('/api/morse-characters')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(failed).toBe(true);

    let result: MorseCharacter[] | undefined;
    service.list().subscribe((characters) => (result = characters));
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    expect(result).toEqual(CHARACTERS);
  });
});
