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
  tokenType: string;
  user: AuthenticatedUser;
}

export interface AlterarSenhaRequestDTO {
  senhaAtual: string;
  novaSenha: string;
  confirmacaoNovaSenha: string;
}
