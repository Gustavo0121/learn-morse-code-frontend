import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { StatisticsService, UserStatistics } from './statistics.service';

const STATS: UserStatistics = {
  characters_seen: 40,
  characters_correct: 38,
  accuracy: 0.95,
  average_speed: 12.5,
  training_time: 192_000,
  updated_at: '2026-07-12T00:00:00Z',
};

describe('StatisticsService', () => {
  it('get: busca o agregado do usuário autenticado', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(StatisticsService);
    const http = TestBed.inject(HttpTestingController);

    let result: UserStatistics | undefined;
    service.get().subscribe((stats) => (result = stats));

    const request = http.expectOne('/api/users/statistics');
    expect(request.request.method).toBe('GET');
    request.flush(STATS);

    expect(result).toEqual(STATS);
    http.verify();
  });
});
