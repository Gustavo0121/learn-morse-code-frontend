# learn-morse-code-frontend

Frontend Angular do **Learn Morse Code** — interface de aprendizado de código Morse com geração de áudio no navegador (Web Audio API) e captura de sinais via teclado.

## Stack

- Angular 22 (standalone components, signals, TypeScript `strict`)
- Angular Material + Tailwind CSS v4
- Vitest + Angular Testing Library
- ESLint + Prettier
- GitHub Actions (CI)

## Setup local

```bash
npm ci
npm start          # dev server em http://localhost:4200
```

O dev server faz proxy de `/api` para o backend Django em `http://localhost:8000` (`proxy.conf.json`), mantendo cookies em contexto same-origin. Suba o backend antes para usar login/refresh.

## Comandos

| Comando                | Descrição                         |
| ---------------------- | --------------------------------- |
| `npm start`            | Servidor de desenvolvimento       |
| `npm test`             | Testes unitários (Vitest)         |
| `npm run lint`         | ESLint (TS + templates)           |
| `npm run format`       | Formata o código com Prettier     |
| `npm run format:check` | Verifica formatação (usado no CI) |
| `npm run build`        | Build de produção em `dist/`      |

## Estrutura

```
src/app/
├── core/          # auth, guards, interceptors
├── features/      # login, dashboard, lessons, practice, settings
├── shared/        # componentes visuais do design system (ui/)
└── services/      # serviços de domínio (morse-audio, morse-input, ...)
```

## Autenticação

- **Access token só em memória** (Signal no `AuthService`) — nunca em `localStorage`/`sessionStorage`; se perde no reload, por design.
- **Refresh token em cookie `httpOnly`** definido pelo backend; o frontend nunca lê esse cookie.
- **Bootstrap silencioso**: `provideAppInitializer` chama `POST /api/auth/refresh` no carregamento para restaurar a sessão.
- **Proteção CSRF**: as rotas que dependem do cookie (`/auth/refresh`, `/auth/logout`) recebem o header `X-CSRF-Protection: 1` exigido pelo backend.
- **Refresh automático**: o `authInterceptor` anexa `Authorization: Bearer` e, em `401`, renova o token e reenvia a requisição original (requisições simultâneas compartilham um único refresh); se o refresh falhar, a sessão é limpa e o usuário volta ao login.
- **Guard**: `authGuard` protege a área autenticada (`/dashboard`; lessons/practice/settings entram nas próximas fases) com redirect para `/login?returnUrl=...`.
- Após login, as preferências Morse (`GET /api/users/morse-settings`) e o perfil do usuário (`GET /api/users/profile`, exposto em `AuthService.currentUser`) são carregados para memória.
- **Cadastro**: a tela de login alterna para o modo "Create account" (`POST /api/auth/register` com `{username, email, password}`) e autentica automaticamente após criar a conta.

## Design system

Identidade minimalista premium (fundo `#050505`, texto `#FFFFFF`/`#A0A0A0`, fontes Inter/Manrope). Os design tokens ficam em `src/tailwind.css` (`@theme`), com contraste validado WCAG AA/AAA; o tema do Angular Material é alinhado a eles em `src/styles.scss`.
