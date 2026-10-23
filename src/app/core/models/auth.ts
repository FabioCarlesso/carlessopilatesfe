export interface LoginRequestDTO {
  email: string;
  password: string;
}

/**
 * Papéis de negócio da API (carlessopilatesapi#131). Um usuário acumula um ou
 * mais e acessa a soma das áreas deles. `PACIENTE` é reservado ao portal do
 * paciente: a API não o oferece em `GET /users/roles` nem aceita no cadastro.
 */
export type UserRole = 'ADMIN' | 'PROFISSIONAL' | 'RECEPCAO' | 'FINANCEIRO' | 'PACIENTE';

export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'PROFISSIONAL', 'RECEPCAO', 'FINANCEIRO', 'PACIENTE'];

/**
 * Papéis que liberam cada área, espelhando o `SecurityConfig` da API. `ADMIN`
 * entra em todas. A proteção real é da API; aqui decide-se só o que a tela
 * mostra e quais rotas o `roleGuard` deixa abrir, para o usuário não cair num
 * `403` ao clicar.
 */
export const PAPEIS = {
  equipe: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO', 'FINANCEIRO'],
  clinica: ['ADMIN', 'PROFISSIONAL'],
  agenda: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  cobranca: ['ADMIN', 'RECEPCAO', 'FINANCEIRO'],
  fiscal: ['ADMIN', 'FINANCEIRO'],
  admin: ['ADMIN']
} as const satisfies Record<string, readonly UserRole[]>;

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  /** Um ou mais papéis, na ordem do enum da API. */
  roles: UserRole[];
  active?: boolean;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: AuthenticatedUser;
}

/** Corpo de `POST /auth/refresh` e de `POST /auth/logout`. */
export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface AlterarSenhaRequestDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
}

export interface ForgotPasswordRequestDTO {
  email: string;
}

export interface ResetPasswordRequestDTO {
  token: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
}
