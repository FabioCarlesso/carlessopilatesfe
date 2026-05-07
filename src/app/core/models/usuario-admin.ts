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

export type UsuarioAdminPage = Page<UsuarioAdminResponseDTO>;
