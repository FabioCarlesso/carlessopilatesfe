export interface LoginRequestDTO {
  email: string;
  password: string;
}

export type UserRole = 'USER' | 'ADMIN';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
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
