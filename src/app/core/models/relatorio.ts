export interface RelatorioNfseResponseDTO {
  nome: string;
  cpfCnpj: string;
  valorPago: number;
  competencia: string;
  descricaoServico: string;
  notaAnteriorEmitida: boolean;
  dataPagamento: string;
  observacoes: string | null;
}

export type RelatorioNfseFormatoExportacao = 'CSV' | 'XLSX';
