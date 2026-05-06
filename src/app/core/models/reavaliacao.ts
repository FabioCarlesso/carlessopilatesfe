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
  ajustesPlanoTratamento?: string | null;
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
  ajustesPlanoTratamento?: string | null;
  observacoesGerais?: string | null;
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
  ajustesPlanoTratamento: string | null;
  observacoesGerais: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
