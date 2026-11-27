import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOpcoesAvaliacaoFake } from '../../../../testing/opcoes-avaliacao';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteReavaliacaoListComponent } from './paciente-reavaliacao-list.component';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { AnamneseResponseDTO } from '../../../core/models/anamnese';
import { HttpErrorResponse } from '@angular/common/http';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true,
  cpfNaNota: false,
  tomadorId: null,
  tomadorNome: null,
  tomadorCpfCnpj: null
};

const mockReavaliacao: ReavaliacaoResponseDTO = {
  version: 0,
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataReavaliacao: '2026-05-10',
  comparativoAvaliacaoAnterior: 'Melhora significativa.',
  evolucaoDor: 'Redução de 7 para 3.',
  evolucaoForca: null,
  evolucaoMobilidade: null,
  evolucaoFuncional: null,
  objetivosAlcancados: 'Redução de dor.',
  pontosAtencao: null,
  ajustesRecomendados: null,
  observacoesGerais: null,
  dataCriacao: '2026-05-10T09:00:00',
  dataAtualizacao: null
};

const mockReavaliacao2: ReavaliacaoResponseDTO = {
  ...mockReavaliacao,
  id: 2,
  dataReavaliacao: '2026-04-01',
  comparativoAvaliacaoAnterior: 'Evolução lenta.'
};

describe('PacienteReavaliacaoListComponent', () => {
  let component: PacienteReavaliacaoListComponent;
  let fixture: ComponentFixture<PacienteReavaliacaoListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let reavaliacaoServiceSpy: jasmine.SpyObj<ReavaliacaoService>;

  let avaliacaoServiceSpy: jasmine.SpyObj<AvaliacaoFisioterapeuticaService>;
  let anamneseServiceSpy: jasmine.SpyObj<AnamneseService>;

  async function setup(
    reavaliacoes: ReavaliacaoResponseDTO[] = [mockReavaliacao],
    pacienteId = '10',
    avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [],
    anamnese: Partial<AnamneseResponseDTO> | null = null
  ) {
    avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', ['listarPorPaciente']);
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(of(avaliacoes));
    anamneseServiceSpy = jasmine.createSpyObj('AnamneseService', ['buscarPorPaciente']);
    anamneseServiceSpy.buscarPorPaciente.and.returnValue(
      anamnese ? of(anamnese as AnamneseResponseDTO) : throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    reavaliacaoServiceSpy = jasmine.createSpyObj('ReavaliacaoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    reavaliacaoServiceSpy.listarPorPaciente.and.returnValue(of(reavaliacoes));

    await TestBed.configureTestingModule({
      imports: [PacienteReavaliacaoListComponent, RouterTestingModule],
      providers: [
        provideOpcoesAvaliacaoFake(),
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: ReavaliacaoService, useValue: reavaliacaoServiceSpy },
        { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
        { provide: AnamneseService, useValue: anamneseServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteReavaliacaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient and reavaliacoes', async () => {
    await setup([mockReavaliacao]);

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(reavaliacaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.reavaliacoes).toEqual([mockReavaliacao]);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should show empty state when no reavaliacoes exist', async () => {
    await setup([]);

    expect(component.reavaliacoes.length).toBe(0);
    expect(component.erro).toBeNull();
  });

  it('should display multiple reavaliacoes', async () => {
    await setup([mockReavaliacao, mockReavaliacao2]);

    expect(component.reavaliacoes.length).toBe(2);
  });

  it('should display date-only values without timezone shift', async () => {
    await setup([mockReavaliacao]);

    const dateElement: HTMLElement | null = fixture.nativeElement.querySelector('.reavaliacao-data');

    expect(dateElement?.textContent?.trim()).toBe('10/05/2026');
  });

  it('should set erro when patient loading fails', async () => {
    await setup([]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when reavaliacoes loading fails', async () => {
    await setup([]);
    reavaliacaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component['carregarReavaliacoes']();

    expect(component.erro).toBe('Erro ao carregar reavaliações.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when pacienteId is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  // O card usava `--surface`, `--c-primary` e `--radius-lg`, que nunca foram
  // definidos em `_tokens.scss`: o fundo não era pintado, a borda de destaque caía
  // para `currentColor` (faixa creme de 4px no tema escuro) e o raio para `0`
  // (issue #213). O guard trava os nomes que existem de fato.
  it('should paint the card with real tokens in both themes', async () => {
    await setup([mockReavaliacao]);
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const card = (fixture.nativeElement as HTMLElement).querySelector('.reavaliacao-card') as HTMLElement;

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

  it('should offer the create CTA in the empty state (issue #146)', async () => {
    await setup([]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state__mensagem')?.textContent?.trim()).toBe('Nenhuma reavaliação cadastrada.');
    const cta = el.querySelector('.empty-state__acoes a');
    expect(cta?.textContent?.trim()).toBe('Nova Reavaliação');
    expect(cta?.getAttribute('href')).toBe('/pacientes/10/reavaliacoes/nova');
  });

  describe('opções pré-definidas (issue #306)', () => {
    const avaliacao = {
      id: 7, pacienteId: 10, dataAvaliacao: '2026-03-01',
      achadosPosturais: ['ESCOLIOSE'], testesFuncionais: [{ teste: 'SCHOBER', resultado: 'POSITIVO' }],
      equilibrioOpcao: 'ALTERACAO_LEVE', padraoRespiratorioOpcao: null, coordenacaoMotoraOpcao: null
    } as unknown as AvaliacaoFisioterapeuticaResponseDTO;
    const comOpcoes: ReavaliacaoResponseDTO = {
      ...mockReavaliacao,
      regioesDor: ['LOMBAR'],
      achadosPosturais: ['ESCOLIOSE', 'PE_PLANO'],
      equilibrioOpcao: 'PRESERVADO',
      padraoRespiratorioOpcao: null,
      coordenacaoMotoraOpcao: null,
      testesFuncionais: [{ teste: 'SCHOBER', resultado: 'NEGATIVO' }],
      achadosPosturaisComplemento: 'Leve'
    };

    it('mostra as opções selecionadas com os rótulos do catálogo', async () => {
      await setup([comOpcoes], '10', [avaliacao], { regioesDor: ['CERVICAL'] });
      const el = fixture.nativeElement as HTMLElement;
      const achados = el.querySelector('.opcoes-item[data-campo="achadosPosturais"]');
      expect(achados?.textContent).toContain('Escoliose');
      expect(achados?.textContent).toContain('Pé plano');
      expect(achados?.textContent).toContain('Leve');
    });

    it('compara com a avaliação anterior e com as regiões de dor da anamnese', async () => {
      await setup([comOpcoes], '10', [avaliacao], { regioesDor: ['CERVICAL'] });
      const comparativo = (fixture.nativeElement as HTMLElement).querySelector('[data-comparativo]');
      expect(comparativo?.textContent).toContain('à avaliação inicial de 01/03/2026');
      expect(comparativo?.querySelector('[data-campo="regioesDor"]')?.textContent)
        .toContain('incluído: Lombar; removido: Cervical');
      expect(comparativo?.querySelector('[data-campo="equilibrioOpcao"]')?.textContent)
        .toContain('de Alteração leve para Preservado');
      expect(comparativo?.querySelector('[data-campo="testesFuncionais"]')?.textContent)
        .toContain('Schober: de Positivo para Negativo');
      expect(component.anteriores.get(1)?.referencia).toBe('à avaliação inicial de 01/03/2026');
    });

    it('lista normalmente quando avaliações e anamnese falham', async () => {
      await setup([comOpcoes]);
      avaliacaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

      component['carregarReavaliacoes']();

      expect(component.erro).toBeNull();
      expect(component.reavaliacoes).toEqual([comOpcoes]);
      expect(component.anteriores.size).toBe(0);
    });

    it('registro antigo, sem os campos, não mostra resumo nem comparativo', async () => {
      await setup([mockReavaliacao], '10', [avaliacao]);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.opcoes-resumo')).toBeNull();
      expect(el.querySelector('[data-comparativo]')).toBeNull();
    });
  });
});
