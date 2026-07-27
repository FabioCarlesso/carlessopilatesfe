import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { isOnPush } from '../../../../testing/onpush';
import { PacienteEvolucaoListComponent } from './paciente-evolucao-list.component';

const mockPaciente: PacienteResponseDTO = {
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

function sessao(dados: Partial<SessaoResponseDTO> & { id: number; dataHora: string }): SessaoResponseDTO {
  return {
    pacienteId: 10,
    nomePaciente: 'Ana Silva',
    tipo: 'PILATES',
    duracao: 50,
    profissionalId: 3,
    nomeProfissional: 'Carla Fisio',
    status: 'REALIZADA',
    observacoes: null,
    dataCriacao: '2026-05-01T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

function evolucao(dados: Partial<EvolucaoSessaoResponseDTO> & { id: number; sessaoId: number }): EvolucaoSessaoResponseDTO {
  return {
    dataHoraRegistro: '2026-05-10T10:30:00',
    exerciciosRealizados: null,
    equipamentosUtilizados: null,
    cargasMolas: null,
    dorAntes: null,
    dorDepois: null,
    respostaPaciente: null,
    intercorrencias: null,
    orientacoes: null,
    observacoesFisioterapeuta: null,
    dataCriacao: '2026-05-10T10:30:00',
    dataAtualizacao: null,
    ...dados
  };
}

const sessaoAntiga = sessao({ id: 1, dataHora: '2026-05-01T08:00' });
const sessaoRecente = sessao({ id: 2, dataHora: '2026-05-20T14:00', tipo: 'FISIOTERAPIA' });

const evolucaoAntiga = evolucao({
  id: 100,
  sessaoId: 1,
  dorAntes: 7,
  dorDepois: 3,
  observacoesFisioterapeuta: 'Paciente tolerou bem a carga.',
  exerciciosRealizados: 'Ponte, dead bug.'
});

const evolucaoRecente = evolucao({
  id: 200,
  sessaoId: 2,
  dorAntes: 2,
  dorDepois: 5,
  observacoesFisioterapeuta: 'Queixa de desconforto lombar ao final.'
});

describe('PacienteEvolucaoListComponent', () => {
  let component: PacienteEvolucaoListComponent;
  let fixture: ComponentFixture<PacienteEvolucaoListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let evolucaoServiceSpy: jasmine.SpyObj<EvolucaoSessaoService>;

  async function setup(
    sessoes: SessaoResponseDTO[] = [sessaoAntiga, sessaoRecente],
    evolucoes: EvolucaoSessaoResponseDTO[] = [evolucaoAntiga, evolucaoRecente],
    pacienteId = '10'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['listarPorPaciente']);
    evolucaoServiceSpy = jasmine.createSpyObj('EvolucaoSessaoService', ['listarPorPaciente']);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    sessaoServiceSpy.listarPorPaciente.and.returnValue(of(sessoes));
    evolucaoServiceSpy.listarPorPaciente.and.returnValue(of(evolucoes));

    await TestBed.configureTestingModule({
      imports: [PacienteEvolucaoListComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: EvolucaoSessaoService, useValue: evolucaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteEvolucaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should use OnPush change detection', () => {
    expect(isOnPush(PacienteEvolucaoListComponent)).toBeTrue();
  });

  it('should load patient, sessions and evolucoes', async () => {
    await setup();

    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(sessaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(evolucaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should sort the timeline from the most recent session to the oldest', async () => {
    await setup();

    expect(component.itens.map(item => item.sessaoId)).toEqual([2, 1]);
  });

  it('should join each session with its evolucao by sessaoId', async () => {
    await setup();

    expect(component.itens[0].evolucao).toEqual(evolucaoRecente);
    expect(component.itens[0].tipo).toBe('Fisioterapia');
    expect(component.itens[0].nomeProfissional).toBe('Carla Fisio');
    expect(component.itens[1].evolucao).toEqual(evolucaoAntiga);
  });

  it('should classify the pain trend of each card', async () => {
    await setup();

    expect(component.itens[0].tendenciaDor).toBe('piora');
    expect(component.itens[1].tendenciaDor).toBe('melhora');
  });

  it('should not classify the pain trend when one of the values is missing', async () => {
    await setup([sessaoAntiga], [evolucao({ id: 100, sessaoId: 1, dorAntes: 4, dorDepois: null })]);

    expect(component.itens[0].tendenciaDor).toBeNull();
  });

  it('should fall back to an em dash for the pain value that is missing', async () => {
    await setup([sessaoAntiga], [evolucao({ id: 100, sessaoId: 1, dorAntes: 4, dorDepois: null })]);

    // Angular remove os nós de texto só-espaço entre os `<span>`; a separação
    // visual vem do `gap` do flex, então o texto sai concatenado.
    const dor: HTMLElement = fixture.nativeElement.querySelector('.evolucao-dor');
    expect(dor.textContent?.trim()).toBe('Dor4→—');
    expect(component.itens[0].dorDepois).toBeNull();
  });

  // A API declara os dois campos como não-opcionais, mas um corpo sem eles não
  // pode virar um par de dor em branco no cabeçalho.
  it('should ignore a pain pair whose fields are absent from the response body', async () => {
    const semDor = evolucao({ id: 100, sessaoId: 1 }) as unknown as Record<string, unknown>;
    delete semDor['dorAntes'];
    delete semDor['dorDepois'];
    await setup([sessaoAntiga], [semDor as unknown as EvolucaoSessaoResponseDTO]);

    expect(component.itens[0].dorAntes).toBeNull();
    expect(component.itens[0].descricaoDor).toBeNull();
    expect(fixture.nativeElement.querySelector('.evolucao-dor')).toBeNull();
  });

  // O `→` é decorativo (`aria-hidden`): sem rótulo o leitor de tela anunciaria
  // apenas "Dor 7 3 melhora".
  it('should expose an accessible label for the pain pair', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);

    const dor: HTMLElement = fixture.nativeElement.querySelector('.evolucao-dor');
    expect(dor.getAttribute('aria-label')).toBe('Dor antes 7, depois 3, melhora');
    expect(dor.getAttribute('role')).toBe('img');
  });

  it('should break ties by sessaoId when two entries share the same timestamp', async () => {
    const mesmaHora = '2026-05-01T08:00';
    await setup(
      [sessao({ id: 1, dataHora: mesmaHora }), sessao({ id: 7, dataHora: mesmaHora }), sessao({ id: 4, dataHora: mesmaHora })],
      [evolucao({ id: 100, sessaoId: 1 }), evolucao({ id: 101, sessaoId: 7 }), evolucao({ id: 102, sessaoId: 4 })]
    );

    expect(component.itens.map(item => item.sessaoId)).toEqual([7, 4, 1]);
  });

  it('should mark realizada sessions without evolucao', async () => {
    await setup([sessaoAntiga, sessaoRecente], [evolucaoRecente]);

    const pendente = component.itens.find(item => item.sessaoId === 1);
    expect(pendente?.evolucao).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sem evolução registrada');
  });

  it('should keep agendada and cancelada sessions without evolucao out of the timeline', async () => {
    await setup(
      [sessao({ id: 3, dataHora: '2026-06-01T08:00', status: 'AGENDADA' }),
        sessao({ id: 4, dataHora: '2026-04-01T08:00', status: 'CANCELADA' }),
        sessaoAntiga],
      [evolucaoAntiga]
    );

    expect(component.itens.map(item => item.sessaoId)).toEqual([1]);
  });

  it('should keep an evolucao whose session is missing from the list', async () => {
    await setup([], [evolucaoAntiga]);

    expect(component.itens.length).toBe(1);
    expect(component.itens[0].sessaoId).toBe(1);
    expect(component.itens[0].tipo).toBeNull();
  });

  it('should always render the therapist notes and hide empty fields', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Observações do fisioterapeuta');
    expect(texto).toContain('Paciente tolerou bem a carga.');
    expect(texto).not.toContain('Intercorrências');
    expect(texto).not.toContain('Orientações');
  });

  it('should hide the collapsible fields until the card is expanded', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);
    document.body.appendChild(fixture.nativeElement);

    try {
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.evolucao-toggle');
      const painel: HTMLElement = fixture.nativeElement.querySelector('.evolucao-detalhes');

      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(getComputedStyle(painel).display).toBe('none');

      toggle.click();
      fixture.detectChanges();

      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(getComputedStyle(painel).display).toBe('grid');
      expect(painel.textContent).toContain('Ponte, dead bug.');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // O painel fica no DOM mesmo recolhido: um `aria-controls` apontando para um
  // id inexistente é referência quebrada para o leitor de tela e para o axe.
  it('should keep aria-controls resolvable while the card is collapsed', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);
    document.body.appendChild(fixture.nativeElement);

    try {
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.evolucao-toggle');
      const id = toggle.getAttribute('aria-controls');

      expect(id).toBe(`evolucao-detalhes-${component.itens[0].chave}`);
      expect(component.itens[0].expandido).toBeFalse();
      expect(document.getElementById(id!)).not.toBeNull();

      component.alternar(component.itens[0]);
      fixture.detectChanges();

      expect(document.getElementById(id!)).not.toBeNull();
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('should omit the toggle when the evolucao has no collapsible field', async () => {
    await setup([sessaoAntiga], [evolucao({ id: 100, sessaoId: 1, observacoesFisioterapeuta: 'Só a observação.' })]);

    expect(component.itens[0].temDetalhes).toBeFalse();
    expect(fixture.nativeElement.querySelector('.evolucao-toggle')).toBeNull();
  });

  it('should expand and collapse every card at once', async () => {
    await setup();
    const recolhidos = () => fixture.nativeElement.querySelectorAll('.evolucao-detalhes-recolhido').length;

    const [expandirTudo, recolherTudo]: HTMLButtonElement[] =
      Array.from(fixture.nativeElement.querySelectorAll('.timeline-controles button'));

    expect(recolhidos()).toBe(1);

    expandirTudo.click();
    fixture.detectChanges();

    expect(component.itens.filter(item => item.expandido).length).toBe(1);
    expect(component.itens.find(item => item.sessaoId === 1)?.expandido).toBeTrue();
    expect(recolhidos()).toBe(0);

    recolherTudo.click();
    fixture.detectChanges();

    expect(component.itens.every(item => !item.expandido)).toBeTrue();
    expect(recolhidos()).toBe(1);
  });

  it('should hide the bulk controls when no card has collapsible fields', async () => {
    await setup([sessaoAntiga], [evolucao({ id: 100, sessaoId: 1, observacoesFisioterapeuta: 'Só a observação.' })]);

    expect(component.temItensExpansiveis).toBeFalse();
    expect(fixture.nativeElement.querySelector('.timeline-controles')).toBeNull();
  });

  it('should link each card to the evolucao screen of its session', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.evolucao-acoes a');
    expect(link.getAttribute('href')).toBe('/pacientes/10/sessoes/1/evolucao');
    expect(link.textContent?.trim()).toBe('Editar evolução');
  });

  it('should show the empty state when the patient has no timeline entries', async () => {
    await setup([], []);

    expect(component.itens.length).toBe(0);
    expect(component.erro).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent?.trim())
      .toBe('Nenhuma evolução registrada.');
  });

  // `--surface`, `--c-primary` e `--radius-lg`, usados pelos cards das demais
  // listagens do prontuário, nunca foram definidos em `_tokens.scss`: o fundo
  // some, a borda cai para `currentColor` e o raio para `0`. O guard trava os
  // nomes que existem de fato (`--bg-elev`, `--text-brand`, `--r-lg`).
  it('should paint the card with real tokens in both themes', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const card = (fixture.nativeElement as HTMLElement).querySelector('.evolucao-card') as HTMLElement;

      expect(getComputedStyle(card).borderRadius).toBe('8px');

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(55, 79, 108)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(24, 34, 48)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(168, 188, 202)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // O texto vem da API com quebras de linha (blocos de queixas e conduta) e o
  // HTML as colapsaria num parágrafo só sem `pre-wrap`.
  it('should preserve the line breaks of the therapist notes', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);
    document.body.appendChild(fixture.nativeElement);

    try {
      const texto = (fixture.nativeElement as HTMLElement).querySelector('.evolucao-texto') as HTMLElement;
      expect(getComputedStyle(texto).whiteSpace).toBe('pre-wrap');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // --- Gráfico de evolução da dor (#206) ---

  it('should render the chart above the timeline when at least two sessions have a pain value', async () => {
    await setup();

    const raiz: HTMLElement = fixture.nativeElement;
    const grafico = raiz.querySelector('.grafico');
    const timeline = raiz.querySelector('.timeline');

    expect(component.grafico).not.toBeNull();
    expect(grafico).not.toBeNull();
    // `DOCUMENT_POSITION_FOLLOWING` = a linha do tempo vem depois do gráfico.
    expect(grafico!.compareDocumentPosition(timeline!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should hide the chart when only one session has a pain value', async () => {
    await setup([sessaoAntiga, sessaoRecente], [evolucaoAntiga, evolucao({ id: 200, sessaoId: 2 })]);

    expect(component.grafico).toBeNull();
    expect(fixture.nativeElement.querySelector('.grafico')).toBeNull();
    // A linha do tempo segue normal sem o gráfico.
    expect(fixture.nativeElement.querySelectorAll('.evolucao-card').length).toBe(2);
  });

  it('should hide the chart when no session has a pain value', async () => {
    await setup(
      [sessaoAntiga, sessaoRecente],
      [evolucao({ id: 100, sessaoId: 1 }), evolucao({ id: 200, sessaoId: 2 })]
    );

    expect(component.grafico).toBeNull();
    expect(fixture.nativeElement.querySelector('.grafico')).toBeNull();
  });

  // Duas medições em séries diferentes não se ligam: sem esta guarda o gráfico
  // renderizava eixos e legenda em volta de dois pontos soltos, sem linha.
  it('should hide the chart when no series reaches two points', async () => {
    await setup([sessaoAntiga, sessaoRecente], [
      evolucao({ id: 100, sessaoId: 1, dorAntes: 7, dorDepois: null }),
      evolucao({ id: 200, sessaoId: 2, dorAntes: null, dorDepois: 2 })
    ]);

    expect(component.grafico).toBeNull();
    expect(fixture.nativeElement.querySelector('.grafico')).toBeNull();
    // As duas medições continuam legíveis nos cards da linha do tempo.
    expect(fixture.nativeElement.querySelectorAll('.evolucao-dor').length).toBe(2);
  });

  // Acontece de verdade quando a fisioterapeuta só registra a dor inicial.
  it('should drop a series with no point from the chart and the legend', async () => {
    await setup([sessaoAntiga, sessaoRecente], [
      evolucao({ id: 100, sessaoId: 1, dorAntes: 7, dorDepois: null }),
      evolucao({ id: 200, sessaoId: 2, dorAntes: 4, dorDepois: null })
    ]);

    const svg: SVGElement = fixture.nativeElement.querySelector('.grafico-svg');

    expect(component.grafico!.series.map(serie => serie.chave)).toEqual(['antes']);
    expect(fixture.nativeElement.querySelectorAll('.grafico-legenda-item').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.grafico-serie-depois')).toBeNull();
    // A legenda e o rótulo acessível passam a contar a mesma história.
    expect(svg.getAttribute('aria-label')).not.toContain('Dor depois');
  });

  // A lista é decrescente e o eixo X é cronológico crescente: as duas vistas
  // saem da mesma coleção, então a inversão é o ponto a travar.
  it('should plot the points from the oldest session to the newest', async () => {
    await setup();

    const antes = component.grafico!.series[0];
    expect(antes.chave).toBe('antes');
    expect(antes.pontos.map(ponto => ponto.data)).toEqual(['01/05/2026', '20/05/2026']);
    expect(antes.pontos.map(ponto => ponto.valor)).toEqual([7, 2]);
    expect(antes.pontos[0].x).toBeLessThan(antes.pontos[1].x);
    expect(component.itens.map(item => item.sessaoId)).toEqual([2, 1]);
  });

  it('should keep the y axis on the 0 to 10 scale regardless of the plotted values', async () => {
    await setup(
      [sessaoAntiga, sessaoRecente],
      [evolucao({ id: 100, sessaoId: 1, dorAntes: 4, dorDepois: 4 }),
        evolucao({ id: 200, sessaoId: 2, dorAntes: 5, dorDepois: 5 })]
    );

    const { area, marcasY, series } = component.grafico!;
    expect(marcasY.map(marca => marca.rotulo)).toEqual(['0', '5', '10']);
    expect(marcasY[0].y).toBe(area.base);
    expect(marcasY[2].y).toBe(area.topo);
    // Nenhum valor chega ao topo nem à base: a escala não foi normalizada.
    series.forEach(serie => serie.pontos.forEach(ponto => {
      expect(ponto.y).toBeGreaterThan(area.topo);
      expect(ponto.y).toBeLessThan(area.base);
    }));
  });

  it('should break the series instead of plotting a missing pain value as zero', async () => {
    const sessoes = [1, 2, 3, 4].map(id => sessao({ id, dataHora: `2026-05-0${id}T08:00` }));
    await setup(sessoes, [
      evolucao({ id: 101, sessaoId: 1, dorAntes: 7, dorDepois: 6 }),
      evolucao({ id: 102, sessaoId: 2, dorAntes: 5, dorDepois: 4 }),
      evolucao({ id: 103, sessaoId: 3, dorAntes: null, dorDepois: 3 }),
      evolucao({ id: 104, sessaoId: 4, dorAntes: 2, dorDepois: 1 })
    ]);

    const antes = component.grafico!.series[0];
    const base = component.grafico!.area.base;

    expect(antes.pontos.map(ponto => ponto.valor)).toEqual([7, 5, 2]);
    expect(antes.pontos.every(ponto => ponto.y !== base)).toBeTrue();
    // Dois trechos, mas o segundo tem um ponto só e não vira linha.
    expect(antes.linhas.length).toBe(1);
    expect(component.grafico!.series[1].linhas.length).toBe(1);
    expect(component.grafico!.series[1].pontos.length).toBe(4);
  });

  it('should describe the pain trend in an accessible label', async () => {
    await setup();

    const svg: SVGElement = fixture.nativeElement.querySelector('.grafico-svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(
      'Gráfico da evolução da dor ao longo de 2 sessões, de 01/05/2026 a 20/05/2026. ' +
      'Dor antes: de 7 em 01/05/2026 para 2 em 20/05/2026. ' +
      'Dor depois: de 3 em 01/05/2026 para 5 em 20/05/2026.'
    );
  });

  it('should name both series in the legend', async () => {
    await setup();

    const legenda: string[] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.grafico-legenda-item'),
      (item: Element) => item.textContent?.trim() ?? ''
    );
    expect(legenda).toEqual(['Dor antes', 'Dor depois']);
  });

  // O gráfico consome a coleção já carregada: uma requisição por causa dele
  // seria uma terceira chamada na carga da tela.
  it('should not fire any extra request because of the chart', async () => {
    await setup();

    expect(pacienteServiceSpy.buscar).toHaveBeenCalledTimes(1);
    expect(sessaoServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
    expect(evolucaoServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
  });

  it('should paint each series with a token that stays legible in both themes', async () => {
    await setup();
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const raiz = fixture.nativeElement as HTMLElement;
      const antes = raiz.querySelector('.grafico-serie-antes .grafico-linha') as SVGElement;
      const depois = raiz.querySelector('.grafico-serie-depois .grafico-linha') as SVGElement;

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(antes).stroke).toBe('rgb(122, 92, 30)');
      expect(getComputedStyle(depois).stroke).toBe('rgb(55, 79, 108)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(antes).stroke).toBe('rgb(176, 136, 66)');
      expect(getComputedStyle(depois).stroke).toBe('rgb(168, 188, 202)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // Sem `viewBox` + largura relativa o SVG assume 300px fixos e, num paciente
  // com muitas sessões, empurraria a página para o lado em 375px.
  it('should scale the chart by the viewBox instead of overflowing the page', async () => {
    await setup();
    document.body.appendChild(fixture.nativeElement);

    try {
      const svg = (fixture.nativeElement as HTMLElement).querySelector('.grafico-svg') as SVGElement;
      expect(svg.getAttribute('viewBox')).toBe('0 0 480 220');
      expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
      expect(getComputedStyle(svg).maxWidth).toBe('480px');
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // Uma sessão sem evolução ainda ocupa posição no eixo X: é o intervalo em que
  // a dor não foi medida, e ignorá-la comprimiria a linha do tempo do gráfico.
  it('should label at most five x marks and always the first and the last session', async () => {
    const sessoes = Array.from({ length: 12 }, (_valor, indice) =>
      sessao({ id: indice + 1, dataHora: `2026-05-${`${indice + 1}`.padStart(2, '0')}T08:00` }));
    await setup(sessoes, sessoes.map(atual =>
      evolucao({ id: 100 + atual.id, sessaoId: atual.id, dorAntes: 8, dorDepois: 4 })));

    const marcas = component.grafico!.marcasX;
    expect(marcas.length).toBe(5);
    expect(marcas[0].rotulo).toBe('01/05');
    expect(marcas[0].ancora).toBe('start');
    expect(marcas[4].rotulo).toBe('12/05');
    expect(marcas[4].ancora).toBe('end');
    expect(marcas[0].x).toBe(component.grafico!.area.esquerda);
    expect(marcas[4].x).toBe(component.grafico!.area.direita);
  });

  // Um paciente da base real chega a 381 sessões: com um círculo por ponto em
  // cada série, os marcadores viram uma faixa sólida e centenas de nós no DOM.
  it('should drop the point markers on a dense chart but keep the isolated ones', async () => {
    const sessoes = Array.from({ length: 40 }, (_valor, indice) =>
      sessao({ id: indice + 1, dataHora: `2026-05-01T08:${`${indice}`.padStart(2, '0')}` }));
    await setup(sessoes, sessoes.map(atual => evolucao({
      id: 100 + atual.id,
      sessaoId: atual.id,
      dorAntes: 5,
      // A sessão 20 fica sem `dorDepois`, isolando a 21 entre dois furos.
      dorDepois: atual.id === 20 || atual.id === 22 ? null : 4
    })));

    const [antes, depois] = component.grafico!.series;

    // A série contínua fica só com a linha; a `depois` quebra em dois trechos
    // longos mais o ponto solto da sessão 21, que sem círculo desapareceria.
    expect(antes.pontos.length).toBe(40);
    expect(antes.marcadores.length).toBe(0);
    expect(depois.linhas.length).toBe(2);
    expect(depois.marcadores.length).toBe(1);
    expect(depois.marcadores[0].x).toBe(antes.pontos[20].x);
    expect(fixture.nativeElement.querySelectorAll('.grafico-ponto').length).toBe(1);
  });

  it('should set erro when patient loading fails', async () => {
    await setup();
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when the evolucoes request fails', async () => {
    await setup();
    evolucaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();
    fixture.detectChanges();

    expect(component.erro).toBe('Não foi possível carregar o histórico de evoluções.');
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.alert-danger')?.textContent?.trim())
      .toBe('Não foi possível carregar o histórico de evoluções.');
  });

  // O `forkJoin` colapsa as duas falhas: a mensagem não pode culpar as evoluções
  // quando quem falhou foi a listagem de sessões.
  it('should set the same neutral erro when the sessions request fails', async () => {
    await setup();
    sessaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Não foi possível carregar o histórico de evoluções.');
    expect(component.loading).toBeFalse();
  });

  it('should surface the backend message when the API explains the failure', async () => {
    await setup();
    evolucaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Paciente inativo.' }
    })));

    component.carregar();

    expect(component.erro).toBe('Paciente inativo.');
  });

  it('should set erro without any request when pacienteId is invalid', async () => {
    await setup([], [], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(sessaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(evolucaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });
});
