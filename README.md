<div align="center">

# Learn Morse Code

Frontend Angular do Learn Morse Code — aprenda código Morse com áudio gerado no navegador e captura de sinais.

<br>

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white)](https://rxjs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Testing Library](https://img.shields.io/badge/Testing_Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white)](https://testing-library.com/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)](https://prettier.io/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)

</div>

## Sobre

Interface de aprendizado de código Morse com estética minimalista, construída em Angular 22 (standalone components, signals, TypeScript `strict`). Todo o som é sintetizado no navegador via Web Audio API, e a entrada Morse é capturada pelo teclado — do jeito que um operador transmitiria.

## Funcionalidades

- **Quatro modos de prática**: Key capture (transmita o código com a tecla configurada), Texto → Morse, Morse → Texto e Listening — com sessões por tempo ou por quantidade de caracteres.
- **Trilha de lições** com treino guiado: estudo dos caracteres com áudio, exercícios nos quatro modos e resumo de desempenho.
- **Áudio 100% no navegador**: velocidade (WPM), frequência, volume e tipo de onda configuráveis, com timing padrão PARIS.
- **Captura via teclado ou toque na tela**: tecla configurável no desktop e superfície de toque no mobile, com classificação ponto/traço idêntica à validação do backend.
- **Dashboard** com precisão, velocidade (cpm), tempo de treino e histórico recente.
- **Conta de usuário** com preferências persistidas e sessão segura (access token em memória + cookie `httpOnly`).
- **Interface PT/EN** com troca de idioma em runtime.

## Rodando localmente

```bash
npm ci
npm start          # dev server em http://localhost:4200
```

O dev server faz proxy de `/api` para o backend Django em `http://localhost:8000` (`proxy.conf.json`). Suba o [backend](https://github.com/Gustavo0121/learn-morse-code-backend) antes para usar login/refresh.

## Comandos

| Comando                  | Descrição                                    |
| ------------------------ | -------------------------------------------- |
| `npm start`              | Servidor de desenvolvimento                  |
| `npm test`               | Testes unitários (Vitest)                    |
| `npm run lint`           | ESLint (TS + templates)                      |
| `npm run format`         | Formata o código com Prettier                |
| `npm run format:check`   | Verifica formatação (usado no CI)            |
| `npm run audit:security` | `npm audit` com gate em `high` (usado no CI) |
| `npm run build`          | Build de produção em `dist/`                 |

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura, decisões técnicas, contratos com a API, segurança e qualidade.

## Backend

A API é o [learn-morse-code-backend](https://github.com/Gustavo0121/learn-morse-code-backend) (Django + DRF). O CI valida lint, formatação, testes, auditoria de segurança e build a cada push; push na `main` dispara o deploy no Render.

## Bugs e sugestões

Encontrou um bug ou tem uma ideia? Abra uma [issue](https://github.com/Gustavo0121/learn-morse-code-frontend/issues) — o [`CONTRIBUTING.md`](CONTRIBUTING.md) descreve o que incluir no reporte.

## Quer contribuir?

Contribuições são bem-vindas! Leia o [`CONTRIBUTING.md`](CONTRIBUTING.md) para preparar o ambiente, entender o fluxo de branches e o que esperamos do código.

## Código de conduta

Ao participar do projeto, você concorda com o nosso [Código de Conduta](CODE_OF_CONDUCT.md).

## Segurança

Vulnerabilidades não devem ser reportadas em issues públicas — veja o processo de divulgação responsável em [`SECURITY.md`](SECURITY.md).
