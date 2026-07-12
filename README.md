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
- **Guard**: `authGuard` protege a área autenticada (`/dashboard`, `/lessons`, `/practice`, `/settings`) com redirect para `/login?returnUrl=...`.
- Após login, as preferências Morse (`GET /api/users/morse-settings`) e o perfil do usuário (`GET /api/users/profile`, exposto em `AuthService.currentUser`) são carregados para memória.
- **Cadastro**: a tela de login alterna para o modo "Create account" (`POST /api/auth/register` com `{username, email, password}`) e autentica automaticamente após criar a conta.

## Settings (preferências Morse)

- Tela `/settings` (autenticada) com blocos **Audio** (velocidade `5–60 WPM`, frequência Grave/Médio/Agudo = `400/700/1000 Hz`, volume `0–1`, tipo de onda) e **Input** (tecla de captura).
- As opções espelham exatamente os choices/validators do backend; a tecla de captura é restrita à whitelist retornada por `GET /api/morse-settings/allowed-keys` (mesma lista que o servidor valida — nada de blacklist local).
- Alterações passam por **confirmação visual** antes do `PUT /api/users/morse-settings`; nomes de campo seguem o contrato (`speed_wpm`, nunca `speed`).
- **Test sound** toca "LMC" em Morse com as configurações do rascunho — demonstra timbre e velocidade antes de salvar.

## Áudio Morse (`MorseAudioService`)

- Som gerado 100% no navegador via Web Audio API — nenhum arquivo de áudio vem do backend.
- `playSequence(code, settings)` reproduz sequências (`'.'`/`'-'`, espaço entre letras, `/` entre palavras) com timing derivado de `speed_wpm` pelo padrão PARIS (ponto = `1200/wpm` ms; traço 3 unidades; pausas 1/3/7). A fórmula vive em `services/morse-timing.ts` e será a mesma usada pela classificação de captura (Fase 4), mantendo consistência com a validação do backend.
- O `AudioContext` é criado de forma lazy no primeiro gesto do usuário (nunca no carregamento da página); tons agendados na timeline do contexto com rampa de ganho anti-click; `stop()`/nova reprodução interrompem a anterior com segurança, e o estado é exposto no signal `playing`.

## Captura de entrada Morse (`MorseInputService`)

- `startCapture()`/`stopCapture()` registram os listeners de `keydown`/`keyup` da tecla configurada (das preferências; `setInputKey()` sobrepõe em tempo de execução) e `onSymbolDetected()` emite cada pressionamento com duração e símbolo.
- A classificação usa **exatamente a regra do backend** (`morse-timing.ts` ⇄ `apps/practice/services.py`): ponto abaixo de 2 unidades (`1200/speed_wpm` ms), traço a partir daí, e `symbol: null` quando a duração sai da faixa `0 < d < 6 unidades` que o servidor aceita — a UI sinaliza entrada inválida em vez de divergir da validação do backend.
- Robustez: ignora auto-repeat da tecla segurada, ignora outras teclas, faz `preventDefault` só na tecla de captura (Space não rola a página) e descarta pressões interrompidas por perda de foco da janela.

## Lições

- `/lessons` lista a trilha (`GET /api/lessons`, já ordenada por `order`) com número, título, descrição e nível; estados de carregamento, erro (com retry) e vazio.
- `/lessons/:id` mostra o detalhe da lição (`GET /api/lessons/{id}` via component input binding) e o **alfabeto Morse de referência** (`GET /api/morse-characters`, cacheado — conteúdo estático), agrupado em Letras/Números/Pontuação. **Clicar em um caractere toca o código dele** com as preferências do usuário.
- Falha no alfabeto não derruba a página da lição; cada bloco tem retry próprio.

## Prática (`/practice`)

- Quatro modos: **Key capture** (vê o caractere e transmite o código com a tecla configurada), **Texto → Morse** e **Morse → Texto** (múltipla escolha) e **Listening** (ouve o código e identifica o caractere).
- **Barras de configuração da sessão** (estilo monkeytype), visíveis após escolher o modo: conteúdo (**Punctuation**/**Numbers** — letras sempre entram no sorteio), tipo de sessão (**Time**/**Characters**) e valores (15/30/60/120 s ou 10/25/50/100 caracteres). Mudar qualquer opção reinicia a sessão.
- Fim de sessão (tempo esgotado ou meta de caracteres atingida) mostra um painel de resultados — precisão em destaque, tipo do teste, configuração da sessão, velocidade (cpm, mesma fórmula do agregado do backend: caracteres ÷ soma dos tempos de resposta), acertos/total e tempo — com **Restart** e **Change mode**.
- Tela de treino em layout de foco: modo, progresso (`N/meta` na sessão por caracteres), tempo (`mm:ss`, regressivo na sessão por tempo; o relógio só dispara no primeiro input do usuário) e precisão no topo; caractere/código em destaque no centro.
- No key_capture, os símbolos aparecem conforme a captura (`.-`); uma pausa (gap de palavra, mínimo 600 ms) encerra o caractere e envia automaticamente. Pressionamentos fora da faixa aceita pelo backend são descartados com aviso — nunca entram no envio.
- Envio para `POST /api/practice/history` com os campos exatos do contrato: key_capture manda `press_durations` + `input_method` (o backend reclassifica e deriva `user_answer`); os demais mandam `user_answer`; `correct` nunca é enviado. Erro de rede oferece retry com o mesmo payload.
- Feedback de acerto/erro com resposta esperada, resposta dada e tempo de reação.

## Dashboard (`/dashboard`)

- Bloco **Progress** com o agregado de `GET /api/users/statistics` (calculado só no backend): precisão, velocidade média (cpm), tempo total de treino e acertos/tentativas. Sem tentativas registradas, precisão e velocidade aparecem como `—`.
- Bloco **Recent training** com os últimos 8 registros de `GET /api/practice/history` (já ordenado do mais recente): acerto/erro, questão → resposta, modo, tempo de reação e data. Estado vazio traz chamada para `/practice`.
- Cada bloco tem carregamento, erro e retry independentes — a falha de um não derruba o outro.

## Design system

Identidade minimalista premium (fundo `#050505`, texto `#FFFFFF`/`#A0A0A0`, fontes Inter/Manrope). Os design tokens ficam em `src/tailwind.css` (`@theme`), com contraste validado WCAG AA/AAA; o tema do Angular Material é alinhado a eles em `src/styles.scss`.
