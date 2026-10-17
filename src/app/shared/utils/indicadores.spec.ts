import {
  formatarPercentual,
  formatarValorCompacto,
  GRAFICO_LARGURA,
  montarGraficoBarras,
  periodoDoMesAtual,
  rotuloMesCurto,
  rotuloMesExtenso,
  taxaOcupacao,
  validarPeriodoRanking
} from './indicadores';

describe('indicadores', () => {
  describe('rótulos de mês', () => {
    it('abrevia o mês com o ano em dois dígitos', () => {
      expect(rotuloMesCurto('2026-01')).toBe('jan/26');
      expect(rotuloMesCurto('2025-12')).toBe('dez/25');
    });

    it('escreve o mês por extenso', () => {
      expect(rotuloMesExtenso('2026-03')).toBe('março de 2026');
    });
  });

  describe('taxaOcupacao', () => {
    it('divide as realizadas pelo total de aulas do mês', () => {
      expect(taxaOcupacao(30, 10)).toBe(0.75);
    });

    it('é nula em mês sem aula, em vez de 0%', () => {
      expect(taxaOcupacao(0, 0)).toBeNull();
      expect(formatarPercentual(null)).toBe('—');
    });

    it('formata como percentual inteiro', () => {
      expect(formatarPercentual(0.756)).toBe('76%');
    });
  });

  it('compacta milhares no eixo', () => {
    expect(formatarValorCompacto(0)).toBe('0');
    expect(formatarValorCompacto(500)).toBe('500');
    expect(formatarValorCompacto(1500)).toBe('1,5 mil');
  });

  describe('periodoDoMesAtual', () => {
    it('vai do primeiro ao último dia do mês', () => {
      expect(periodoDoMesAtual('2026-02-14')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
      expect(periodoDoMesAtual('2028-02-01')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' });
      expect(periodoDoMesAtual('2026-10-31')).toEqual({ inicio: '2026-10-01', fim: '2026-10-31' });
    });
  });

  describe('validarPeriodoRanking', () => {
    it('aceita período válido, inclusive de um dia', () => {
      expect(validarPeriodoRanking('2026-01-01', '2026-06-30')).toBeNull();
      expect(validarPeriodoRanking('2026-01-01', '2026-01-01')).toBeNull();
    });

    it('recusa datas ausentes ou invertidas', () => {
      expect(validarPeriodoRanking('', '2026-01-01')).toContain('Informe');
      expect(validarPeriodoRanking('2026-02-01', '2026-01-01')).toContain('menor ou igual');
    });

    it('aplica o teto de 366 dias da API', () => {
      expect(validarPeriodoRanking('2028-01-01', '2028-12-31')).toBeNull();
      expect(validarPeriodoRanking('2026-01-01', '2027-01-02')).toContain('366');
    });
  });

  describe('montarGraficoBarras', () => {
    const meses = ['2026-01', '2026-02', '2026-03'];

    it('desenha uma barra por série em cada mês, proporcional ao valor', () => {
      const grafico = montarGraficoBarras(
        meses,
        [
          { chave: 'realizadas', rotulo: 'Realizadas', valores: [40, 20, 0] },
          { chave: 'agendadas', rotulo: 'Agendadas', valores: [10, 5, 0] }
        ],
        { titulo: 'Aulas', formatarEixo: String, inteiro: true }
      );

      expect(grafico.grupos.length).toBe(3);
      expect(grafico.grupos.map(g => g.barras.length)).toEqual([2, 2, 2]);
      const [realizadasJan, agendadasJan] = grafico.grupos[0].barras;
      const realizadasFev = grafico.grupos[1].barras[0];
      expect(realizadasJan.altura).toBeCloseTo(realizadasFev.altura * 2, 5);
      expect(agendadasJan.x).toBeGreaterThan(realizadasJan.x);
      expect(grafico.grupos[2].barras.every(barra => barra.altura === 0)).toBeTrue();
      // A barra cresce de baixo para cima: o topo mais a altura é a base do eixo.
      expect(realizadasJan.y + realizadasJan.altura).toBeCloseTo(grafico.area.base, 5);
    });

    it('arredonda o eixo Y para passos redondos que cobrem o máximo', () => {
      const grafico = montarGraficoBarras(
        meses,
        [{ chave: 'receita', rotulo: 'Receita', valores: [1630, 900, 0] }],
        { titulo: 'Receita', formatarEixo: formatarValorCompacto }
      );

      expect(grafico.marcasY.map(m => m.rotulo)).toEqual(['0', '500', '1 mil', '1,5 mil', '2 mil']);
      expect(grafico.marcasY[grafico.marcasY.length - 1].y).toBe(grafico.area.topo);
    });

    it('não cria marcas fracionárias em contagens pequenas', () => {
      const grafico = montarGraficoBarras(
        meses,
        [{ chave: 'novos', rotulo: 'Novos', valores: [1, 3, 2] }],
        { titulo: 'Pacientes', formatarEixo: String, inteiro: true }
      );

      expect(grafico.marcasY.map(m => m.rotulo)).toEqual(['0', '1', '2', '3']);
    });

    it('mantém um eixo válido quando tudo é zero', () => {
      const grafico = montarGraficoBarras(
        meses,
        [{ chave: 'novos', rotulo: 'Novos', valores: [0, 0, 0] }],
        { titulo: 'Pacientes', formatarEixo: String, inteiro: true }
      );

      expect(grafico.marcasY.map(m => m.rotulo)).toEqual(['0', '1']);
      expect(grafico.grupos.every(g => g.barras.every(b => Number.isFinite(b.y) && b.altura === 0))).toBeTrue();
    });

    it('limita os rótulos do eixo X e sempre rotula o mês atual', () => {
      const vinteEQuatro = Array.from({ length: 24 }, (_v, i) => {
        const indice = i + 10;
        return `${2024 + Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
      });
      const grafico = montarGraficoBarras(
        vinteEQuatro,
        [{ chave: 'receita', rotulo: 'Receita', valores: vinteEQuatro.map(() => 100) }],
        { titulo: 'Receita', formatarEixo: String }
      );

      expect(grafico.marcasX.length).toBeLessThanOrEqual(6);
      expect(grafico.marcasX[grafico.marcasX.length - 1].rotulo).toBe(rotuloMesCurto(vinteEQuatro[23]));
    });

    it('não ultrapassa a largura do desenho', () => {
      const grafico = montarGraficoBarras(
        meses,
        [{ chave: 'receita', rotulo: 'Receita', valores: [1, 2, 3] }],
        { titulo: 'Receita', formatarEixo: String }
      );
      const ultima = grafico.grupos[2].barras[0];

      expect(ultima.x + ultima.largura).toBeLessThanOrEqual(grafico.area.direita);
      expect(grafico.area.direita).toBeLessThanOrEqual(GRAFICO_LARGURA);
    });

    it('descreve o gráfico e aponta para a tabela no rótulo acessível', () => {
      const grafico = montarGraficoBarras(
        meses,
        [{ chave: 'receita', rotulo: 'Receita', valores: [1, 2, 3] }],
        { titulo: 'Receita confirmada', formatarEixo: String }
      );

      expect(grafico.ariaLabel).toContain('Receita confirmada');
      expect(grafico.ariaLabel).toContain('de janeiro de 2026 a março de 2026');
      expect(grafico.ariaLabel).toContain('tabela');
    });
  });
});
