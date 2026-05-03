export interface AvaliacaoFisioterapeuticaRequestDTO {
  pacienteId: number;
  dataAvaliacao: string;
  queixaFuncional: string;
  avaliacaoPostural?: string | null;
  mobilidadeArticular?: string | null;
  forcaMuscular?: string | null;
  flexibilidade?: string | null;
  equilibrio?: string | null;
  coordenacaoMotora?: string | null;
  padraoRespiratorio?: string | null;
  escalaDor: number;
  testesFuncionaisRealizados?: string | null;
  diagnosticoFisioterapeutico: string;
  observacoesGerais?: string | null;
}

export interface AvaliacaoFisioterapeuticaUpdateDTO {
  dataAvaliacao?: string | null;
  queixaFuncional?: string | null;
  avaliacaoPostural?: string | null;
  mobilidadeArticular?: string | null;
  forcaMuscular?: string | null;
  flexibilidade?: string | null;
  equilibrio?: string | null;
  coordenacaoMotora?: string | null;
  padraoRespiratorio?: string | null;
  escalaDor?: number | null;
  testesFuncionaisRealizados?: string | null;
  diagnosticoFisioterapeutico?: string | null;
  observacoesGerais?: string | null;
}

export interface AvaliacaoFisioterapeuticaResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataAvaliacao: string;
  queixaFuncional: string;
  avaliacaoPostural: string | null;
  mobilidadeArticular: string | null;
  forcaMuscular: string | null;
  flexibilidade: string | null;
  equilibrio: string | null;
  coordenacaoMotora: string | null;
  padraoRespiratorio: string | null;
  escalaDor: number;
  testesFuncionaisRealizados: string | null;
  diagnosticoFisioterapeutico: string;
  observacoesGerais: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
