export interface EvolucaoSessaoRequestDTO {
  sessaoId: number;
  dataHoraRegistro: string;
  exerciciosRealizados?: string | null;
  equipamentosUtilizados?: string | null;
  cargasMolas?: string | null;
  dorAntes?: number | null;
  dorDepois?: number | null;
  respostaPaciente?: string | null;
  intercorrencias?: string | null;
  orientacoes?: string | null;
  observacoesFisioterapeuta?: string | null;
}

export interface EvolucaoSessaoUpdateDTO {
  dataHoraRegistro?: string | null;
  exerciciosRealizados?: string | null;
  equipamentosUtilizados?: string | null;
  cargasMolas?: string | null;
  dorAntes?: number | null;
  dorDepois?: number | null;
  respostaPaciente?: string | null;
  intercorrencias?: string | null;
  orientacoes?: string | null;
  observacoesFisioterapeuta?: string | null;
}

export interface EvolucaoSessaoResponseDTO {
  id: number;
  sessaoId: number;
  dataHoraRegistro: string;
  exerciciosRealizados: string | null;
  equipamentosUtilizados: string | null;
  cargasMolas: string | null;
  dorAntes: number | null;
  dorDepois: number | null;
  respostaPaciente: string | null;
  intercorrencias: string | null;
  orientacoes: string | null;
  observacoesFisioterapeuta: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
