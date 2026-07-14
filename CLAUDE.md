# Guia para agentes — Learn Morse Code Frontend

SPA Angular para aprendizado de código Morse: áudio sintetizado no navegador (Web Audio API) e captura de sinais via teclado. A API é um backend Django em repositório separado ([learn-morse-code-backend](https://github.com/Gustavo0121/learn-morse-code-backend)).

**Fontes de verdade**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (decisões técnicas e contratos com a API — leia antes de mexer em auth, prática ou timing Morse) e [`CONTRIBUTING.md`](CONTRIBUTING.md) (fluxo de contribuição).

## Comandos

| Comando                                       | Uso                                          |
| --------------------------------------------- | -------------------------------------------- |
| `npm start`                                   | Dev server em :4200 (proxy `/api` → :8000)   |
| `npm test`                                    | Vitest em watch                              |
| `npm test -- --include src/app/**/x.spec.ts`  | Um único arquivo de teste                    |
| `npm run test:ci`                             | Todos os testes + cobertura                  |
| `npm run lint` / `npm run format:check`       | ESLint / Prettier (ambos rodam no CI)        |
| `npm run audit:security`                      | `npm audit` com gate em `high` (roda no CI)  |
| `npm run build`                               | Build de produção                            |

## Stack e estrutura

Angular 22 (standalone components + signals), TypeScript `strict`, Tailwind CSS v4 (CSS-first), Angular Material, Vitest + Angular Testing Library.

```
src/app/
├── core/          # auth (service/interceptor/guard), i18n
├── features/      # login, dashboard, lessons, practice, settings (lazy, uma rota por feature)
├── shared/ui/     # componentes visuais do design system
└── services/      # domínio: morse-audio, morse-input, morse-timing, practice, ...
```

## Regras do projeto

- **TypeScript estrito**: sem `any`, sem `eslint-disable`, sem `TODO` em `src/`.
- **Regras de negócio ficam em serviços** (`services/` para domínio, `core/` para infra); componentes enxutos.
- **Testes acompanham qualquer mudança** (spec ao lado do arquivo); cobertura de statements deve se manter ≥ 90%.
- **i18n**: toda string nova visível ao usuário vira chave tipada em `core/i18n/messages.ts` (PT e EN) — nunca string solta no template. Rótulos editoriais do design, iguais nos dois idiomas, ficam fora do dicionário.
- **Estilo**: Tailwind com os design tokens de `src/tailwind.css` (`@theme`); tema Material alinhado em `src/styles.scss`. Identidade minimalista dark (`#050505`/branco/cinza) — não introduzir cores vibrantes nem cards tradicionais.
- **Segurança**: access token só em memória (Signal no `AuthService`); refresh token em cookie `httpOnly` que o frontend nunca lê; nada sensível em `localStorage` (única chave persistida: `lmc.locale`); nenhum `innerHTML`.

## Contratos com a API (não quebrar)

- Nomes de campo exatos do backend: `speed_wpm` (nunca `speed`); `correct` nunca é enviado pelo cliente; exercícios `key_capture` enviam `press_durations` + `input_method` (nunca `user_answer` junto).
- A fórmula de timing Morse vive **só** em `services/morse-timing.ts` (padrão PARIS: ponto = `1200/wpm` ms) e espelha a validação do backend (`apps/practice/services.py`) — qualquer mudança precisa ser coordenada nos dois repositórios.
- Rotas que usam o cookie de refresh (`/auth/refresh`, `/auth/logout`) exigem o header `X-CSRF-Protection: 1`.
- Há um único `environment.ts` com `apiUrl: '/api'` (relativo) para todos os ambientes — não criar environments por ambiente.

## Pegadinhas conhecidas

- Fake timers do Vitest também substituem `performance.now`, quebrando a medição de duração da captura — use `toFake` restrito nos testes que envolvem `MorseInputService`.
- `AudioContext` só pode ser criado após gesto do usuário; nos testes, siga o padrão existente de fake de `AudioContext` dos specs do `MorseAudioService`.

## Git

- Branches saem da `dev`; PR para `dev`. Push na `main` publica em produção — nunca commitar direto nela.
- Não faça commit nem push por conta própria: deixe o working tree pronto e resuma as mudanças; o mantenedor commita manualmente.

## Planejamento

Em modo de planejamento, faça perguntas de esclarecimento antes de propor o plano e termine com a lista concisa de dúvidas não resolvidas.
