// Ordenação clicável das listagens paginadas (issue #151). Modela o estado de
// ordenação (campo + direção) e concentra a conversão para o parâmetro `sort`
// do Pageable do Spring, além do ciclo asc → desc → volta ao padrão acionado a
// cada clique no cabeçalho de coluna. Mantém o contrato da API inalterado: só o
// valor de `sort` muda (ex.: `sort=email,asc`).

export type DirecaoOrdenacao = 'asc' | 'desc';

export interface Ordenacao {
  campo: string;
  direcao: DirecaoOrdenacao;
}

// Converte a ordenação para o parâmetro `sort` esperado pelo Pageable do Spring
// (ex.: `{ campo: 'email', direcao: 'asc' }` → `'email,asc'`).
export function toSortParam(ordenacao: Ordenacao): string {
  return `${ordenacao.campo},${ordenacao.direcao}`;
}

// Calcula a próxima ordenação ao clicar num cabeçalho, seguindo o ciclo:
// coluna diferente → asc; mesma coluna asc → desc; mesma coluna desc → volta ao
// padrão da listagem (nome asc). Nunca muta os argumentos.
export function proximaOrdenacao(atual: Ordenacao, campo: string, padrao: Ordenacao): Ordenacao {
  if (atual.campo !== campo) {
    return { campo, direcao: 'asc' };
  }
  if (atual.direcao === 'asc') {
    return { campo, direcao: 'desc' };
  }
  return { ...padrao };
}
