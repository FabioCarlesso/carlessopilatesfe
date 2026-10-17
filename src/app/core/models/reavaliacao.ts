export interface ReavaliacaoRequestDTO {
  pacienteId: number;
  dataReavaliacao: string;
  comparativoAvaliacaoAnterior?: string | null;
  evolucaoDor?: string | null;
  evolucaoForca?: string | null;
  evolucaoMobilidade?: string | null;
  evolucaoFuncional?: string | null;
  objetivosAlcancados?: string | null;
  pontosAtencao?: string | null;
  ajustesRecomendados?: string | null;
  observacoesGerais?: string | null;
}

export interface ReavaliacaoUpdateDTO {
  dataReavaliacao?: string | null;
  comparativoAvaliacaoAnterior?: string | null;
  evolucaoDor?: string | null;
  evolucaoForca?: string | null;
  evolucaoMobilidade?: string | null;
  evolucaoFuncional?: string | null;
  objetivosAlcancados?: string | null;
  pontosAtencao?: string | null;
  ajustesRecomendados?: string | null;
  observacoesGerais?: string | null;
  /** Versão recebida no GET (locking otimista da API); divergente da atual responde `409 concurrent-modification`. */
  version?: number | null;
}

export interface ReavaliacaoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataReavaliacao: string;
  comparativoAvaliacaoAnterior: string | null;
  evolucaoDor: string | null;
  evolucaoForca: string | null;
  evolucaoMobilidade: string | null;
  evolucaoFuncional: string | null;
  objetivosAlcancados: string | null;
  pontosAtencao: string | null;
  ajustesRecomendados: string | null;
  observacoesGerais: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
  /** Versão do registro para o locking otimista: devolva-a no próximo update. */
  version: number;
}
