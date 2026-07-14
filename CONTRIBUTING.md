# Contribuindo

Obrigado pelo interesse em contribuir com o Learn Morse Code! Este guia explica como preparar o ambiente e o que esperamos de uma contribuição.

## Antes de começar

- Procure nas [issues](https://github.com/Gustavo0121/learn-morse-code-frontend/issues) se o bug/ideia já foi reportado.
- Para mudanças grandes, abra uma issue primeiro para alinharmos a abordagem antes de você investir tempo no código.
- Leia o [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — ele documenta as decisões técnicas e os contratos com a API que as contribuições devem respeitar.

## Preparando o ambiente

1. Faça um fork e clone o repositório.
2. Use **Node 22** (mesma versão do CI).
3. Instale as dependências e suba o dev server:

   ```bash
   npm ci
   npm start          # http://localhost:4200
   ```

4. Para fluxos autenticados, suba também o [backend](https://github.com/Gustavo0121/learn-morse-code-backend) em `http://localhost:8000` — o dev server faz proxy de `/api` para ele.

## Fluxo de trabalho

- Crie sua branch a partir da **`dev`** e abra o PR **para `dev`** (a `main` é reservada para releases — push nela dispara deploy em produção).
- Antes de abrir o PR, rode localmente o mesmo pipeline do CI:

  ```bash
  npm run lint
  npm run format:check
  npm test
  npm run audit:security
  npm run build
  ```

- O CI precisa passar por completo para o PR ser considerado.

## O que esperamos do código

- **TypeScript estrito**: sem `any`, sem `eslint-disable`, sem `TODO` no `src/`.
- **Testes acompanham a mudança** (Vitest + Angular Testing Library). A cobertura de statements do projeto deve se manter **≥ 90%**.
- **Regras de negócio em serviços dedicados** — componentes enxutos, seguindo a estrutura existente (`core/`, `features/`, `shared/`, `services/`).
- **i18n**: toda string nova visível ao usuário entra como chave tipada em `core/i18n/messages.ts` (PT e EN). Rótulos editoriais do design que são iguais nos dois idiomas ficam fora do dicionário.
- **Contratos com a API**: nomes de campo e regras de validação devem espelhar exatamente o backend (ex.: `speed_wpm`, nunca `speed`; `correct` nunca é enviado pelo cliente).
- **Identidade visual**: siga o design system (tokens em `src/tailwind.css`, tema Material em `src/styles.scss`) — minimalista, escuro, editorial.

## Reportando bugs e sugerindo funcionalidades

Abra uma [issue](https://github.com/Gustavo0121/learn-morse-code-frontend/issues) descrevendo:

- **Bug**: passos para reproduzir, comportamento esperado × observado, navegador/SO.
- **Funcionalidade**: o problema que ela resolve e, se possível, uma proposta de como se encaixa na experiência atual.

Vulnerabilidades de segurança **não** devem ser abertas como issue pública — veja [`SECURITY.md`](SECURITY.md).
