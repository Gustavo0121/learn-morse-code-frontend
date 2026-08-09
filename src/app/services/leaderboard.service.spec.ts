import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LeaderboardEntry, LeaderboardService } from './leaderboard.service';

const ENTRIES: LeaderboardEntry[] = [
  { position: 1, username: 'gu', accuracy: 0.92, cpm: 45.3, score: 137.3 },
];

describe('LeaderboardService', () => {
  it('list: busca o ranking filtrado por velocidade, modo e período', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(LeaderboardService);
    const http = TestBed.inject(HttpTestingController);

    let result: LeaderboardEntry[] | undefined;
    service
      .list({ speed_wpm: 20, exercise_type: 'key_capture', period: 'weekly' })
      .subscribe((entries) => (result = entries));

    const request = http.expectOne(
      (req) =>
        req.url === '/api/leaderboard' &&
        req.params.get('speed_wpm') === '20' &&
        req.params.get('exercise_type') === 'key_capture' &&
        req.params.get('period') === 'weekly',
    );
    expect(request.request.method).toBe('GET');
    request.flush(ENTRIES);

    expect(result).toEqual(ENTRIES);
    http.verify();
  });
});
