import { TestBed } from '@angular/core/testing';

import { I18nService } from './i18n.service';

describe('I18nService', () => {
  beforeEach(() => localStorage.removeItem('lmc.locale'));

  function setup(): I18nService {
    return TestBed.inject(I18nService);
  }

  it('usa pt por padrão e traduz ao trocar para en', () => {
    const i18n = setup();

    expect(i18n.locale()).toBe('pt');
    expect(i18n.t('common.correct')).toBe('Correto');

    i18n.setLocale('en');
    expect(i18n.t('common.correct')).toBe('Correct');
  });

  it('interpola parâmetros com {nome}', () => {
    const i18n = setup();

    expect(i18n.t('common.level', { level: 3 })).toBe('Nível 3');
    i18n.setLocale('en');
    expect(i18n.t('common.pressHint', { key: 'Space' })).toBe(
      'Press Space — release to end the character.',
    );
  });

  it('persiste a escolha em localStorage', () => {
    const i18n = setup();

    i18n.setLocale('en');

    expect(localStorage.getItem('lmc.locale')).toBe('en');
  });
});
