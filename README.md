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

## Design system

Identidade minimalista premium (fundo `#050505`, texto `#FFFFFF`/`#A0A0A0`, fontes Inter/Manrope). Os design tokens ficam em `src/tailwind.css` (`@theme`), com contraste validado WCAG AA/AAA; o tema do Angular Material é alinhado a eles em `src/styles.scss`.
