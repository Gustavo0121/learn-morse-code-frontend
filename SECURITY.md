# Política de Segurança

## Versões suportadas

Este projeto entrega continuamente a partir da branch `main` — apenas a versão em produção (último deploy da `main`) recebe correções de segurança.

## Reportando uma vulnerabilidade

**Não abra issue pública para vulnerabilidades.**

Prefira o canal privado do GitHub: na aba **Security** do repositório, use **"Report a vulnerability"** (GitHub Private Vulnerability Reporting). Alternativamente, envie e-mail para **gus0512san@gmail.com** com o assunto `[SECURITY] learn-morse-code`.

Inclua no reporte:

- Descrição da vulnerabilidade e o impacto potencial.
- Passos para reproduzir (URLs, payloads, configuração necessária).
- Versão/commit afetado e ambiente (navegador/SO), se relevante.

Você receberá uma confirmação de recebimento em até **72 horas** e atualizações conforme a análise avançar. Pedimos que a divulgação pública aguarde a correção estar em produção (divulgação coordenada).

## Escopo

- Este repositório cobre o **frontend** (SPA Angular). Vulnerabilidades na API devem ser reportadas no repositório do [backend](https://github.com/Gustavo0121/learn-morse-code-backend) pelo mesmo processo.
- Contexto útil: o access token vive apenas em memória e o refresh token em cookie `httpOnly` — detalhes na seção de segurança do [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Dependências passam por `npm audit` com gate de severidade `high` no CI; reportes sobre advisories em dependências são bem-vindos, especialmente quando exploráveis no contexto do app.
