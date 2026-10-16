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
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

/**
 * Os campos `profissional*` são um snapshot gravado pelo backend a partir da
 * sessão no momento do registro (issue #214): o frontend só os consome, nunca
 * os envia nem os recalcula a partir do cadastro atual do profissional — o
 * prontuário precisa continuar mostrando quem de fato registrou a evolução,
 * mesmo que o cadastro mude depois. São nulos na evolução de uma sessão sem
 * profissional vinculado.
 */
export interface EvolucaoSessaoResponseDTO {
  id: number;
  sessaoId: number;
  profissionalId: number | null;
  profissionalNome: string | null;
  profissionalNumeroRegistro: string | null;
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
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}
