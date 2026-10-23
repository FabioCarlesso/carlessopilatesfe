import { UserRole } from './auth';
import { Page } from './common';

export interface UsuarioAdminResponseDTO {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
  active?: boolean;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}

export interface UsuarioAdminCreateRequestDTO {
  name: string;
  email: string;
  password: string;
  /** Ao menos um papel; a API responde `400` para lista vazia. */
  roles: UserRole[];
}

export interface UsuarioAdminUpdateRequestDTO {
  name?: string;
  email?: string;
  password?: string;
  /** Quando enviado, substitui o conjunto inteiro de papéis. */
  roles?: UserRole[];
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}

/** Fallback do formulário se `GET /users/roles` falhar; mesma ordem e rótulos da API. */
export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'PROFISSIONAL', label: 'Profissional' },
  { value: 'RECEPCAO', label: 'Recepção' },
  { value: 'FINANCEIRO', label: 'Financeiro' }
];

// Rótulo de exibição do perfil, para a listagem administrativa e a identificação
// na navbar. `PACIENTE` não está nas opções do formulário, mas tem rótulo.
export const ROLE_LABEL: Record<UserRole, string> = {
  ...ROLE_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  }, {} as Record<UserRole, string>),
  PACIENTE: 'Paciente'
};

/** Rótulos dos papéis separados por vírgula, na ordem em que vieram da API. */
export function rotuloPapeis(roles: readonly UserRole[]): string {
  return roles.map(role => ROLE_LABEL[role] ?? role).join(', ');
}

export type UsuarioAdminPage = Page<UsuarioAdminResponseDTO>;
