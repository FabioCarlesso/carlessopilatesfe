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

  // `--surface` e `--c-primary`, usados pelos cards das demais listagens do
  // prontuário, nunca foram definidos em `_tokens.scss`: o fundo some e a borda
  // cai para `currentColor`. O guard trava os tokens que existem de fato.
  it('should paint the card with real tokens in both themes', async () => {
    await setup([sessaoAntiga], [evolucaoAntiga]);
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const card = (fixture.nativeElement as HTMLElement).querySelector('.evolucao-card') as HTMLElement;

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
