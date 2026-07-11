export const environment = {
  /**
   * Base relativa: em desenvolvimento o dev-server faz proxy para o backend
   * (proxy.conf.json); em produção a aplicação é servida sob o mesmo domínio
   * da API, mantendo os cookies de refresh em contexto same-origin.
   */
  apiUrl: '/api',
};
