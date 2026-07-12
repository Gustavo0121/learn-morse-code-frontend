import { Injectable, signal } from '@angular/core';

import { Locale, MESSAGES, MessageKey } from './messages';

const STORAGE_KEY = 'lmc.locale';

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt' || stored === 'en') {
      return stored;
    }
  } catch {
    // Storage indisponível (ex.: cookies bloqueados) — segue o padrão.
  }
  return 'pt';
}

/**
 * Tradução em runtime baseada em signal: `t()` lê o `locale`, então qualquer
 * binding/computed que o chame reage à troca de idioma automaticamente. A
 * preferência persiste em localStorage (não é dado sensível).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>(initialLocale());

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Sem persistência; a troca ainda vale para a sessão atual.
    }
  }

  t(key: MessageKey, params?: Record<string, string | number>): string {
    let message = MESSAGES[key][this.locale()];
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        message = message.replaceAll(`{${name}}`, String(value));
      }
    }
    return message;
  }
}
