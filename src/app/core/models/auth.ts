export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  nome: string;
  email: string;
  perfil: string;
}

export interface UsuarioLogado {
  nome: string;
  email: string;
  perfil: string;
}
