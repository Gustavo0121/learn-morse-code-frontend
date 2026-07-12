/**
 * Contrato assumido com a API Django (JWT + refresh token em cookie httpOnly).
 * O refresh token nunca aparece no corpo das respostas — apenas o access token.
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** Perfil retornado por GET /api/users/profile. */
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access: string;
}

/**
 * Proteção CSRF exigida pelo backend nas rotas que dependem do cookie de
 * refresh (`/auth/refresh` e `/auth/logout`): header customizado que
 * formulários cross-site não conseguem definir.
 */
export const CSRF_PROTECTION_HEADERS = { 'X-CSRF-Protection': '1' } as const;
