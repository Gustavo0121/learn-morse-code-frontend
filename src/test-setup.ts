import '@testing-library/jest-dom/vitest';

// O runner de testes do Angular roda todos os specs no mesmo ambiente global
// (jsdom compartilhado, `isolate: false` por padrão — mesmo comportamento do
// Karma). Sem isso, um teste que troca o locale (`I18nService.setLocale`)
// vaza `localStorage` para specs seguintes, que leem o locale errado ao
// construir o serviço.
beforeEach(() => {
  localStorage.clear();
});
