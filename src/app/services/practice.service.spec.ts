import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PracticeRecord, PracticeService } from './practice.service';

const RECORD: PracticeRecord = {
  id: 1,
  exercise_type: 'key_capture',
  input_method: 'Space',
  question: 'A',
  expected_answer: '.-',
  user_answer: '.-',
  correct: true,
  response_time: 1500,
  created_at: '2026-07-12T00:00:00Z',
};

describe('PracticeService', () => {
  let service: PracticeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PracticeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('submit: envia POST com o payload exato do contrato (sem correct)', () => {
    let result: PracticeRecord | undefined;
    service
      .submit({
        exercise_type: 'key_capture',
        input_method: 'Space',
        question: 'A',
        expected_answer: '.-',
        press_durations: [100, 210],
        response_time: 1500,
      })
      .subscribe((record) => (result = record));

    const request = http.expectOne('/api/practice/history');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      exercise_type: 'key_capture',
      input_method: 'Space',
      question: 'A',
      expected_answer: '.-',
      press_durations: [100, 210],
      response_time: 1500,
    });
    request.flush(RECORD, { status: 201, statusText: 'Created' });

    expect(result).toEqual(RECORD);
  });

  it('history: busca o histórico do usuário', () => {
    let result: PracticeRecord[] | undefined;
    service.history().subscribe((records) => (result = records));

    const request = http.expectOne('/api/practice/history');
    expect(request.request.method).toBe('GET');
    request.flush([RECORD]);

    expect(result).toEqual([RECORD]);
  });
});
