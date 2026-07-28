import { UserRole } from './auth';
import { Page } from './common';

export interface UsuarioAdminResponseDTO {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
}

export interface UsuarioAdminCreateRequestDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UsuarioAdminUpdateRequestDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'USER', label: 'Usuário' }
];

// Rótulo de exibição do perfil, derivado das opções acima para manter uma única
// fonte de verdade entre a listagem administrativa e a identificação na navbar.
export const ROLE_LABEL: Record<UserRole, string> = ROLE_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {} as Record<UserRole, string>);

export type UsuarioAdminPage = Page<UsuarioAdminResponseDTO>;
