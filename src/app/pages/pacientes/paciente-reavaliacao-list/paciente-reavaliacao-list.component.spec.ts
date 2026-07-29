import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteReavaliacaoListComponent } from './paciente-reavaliacao-list.component';

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

const mockReavaliacao: ReavaliacaoResponseDTO = {
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
  ajustesPlanoTratamento: null,
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

  async function setup(
    reavaliacoes: ReavaliacaoResponseDTO[] = [mockReavaliacao],
    pacienteId = '10'
  ) {
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
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: ReavaliacaoService, useValue: reavaliacaoServiceSpy },
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
});
