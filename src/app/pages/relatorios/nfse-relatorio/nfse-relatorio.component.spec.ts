import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NfseRelatorioComponent } from './nfse-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { RelatorioNfseResponseDTO } from '../../../core/models/relatorio';

const mockRelatorio: RelatorioNfseResponseDTO[] = [
  {
    nome: 'Ana Silva',
    cpfCnpj: '123.456.789-00',
    valorPago: 250,
    competencia: '04/2026',
    descricaoServico: 'Aulas de Pilates - Competência 04/2026',
    notaAnteriorEmitida: false,
    dataPagamento: '2026-04-10',
    observacoes: 'Plano mensal'
  }
];

const mockExportResponse = new HttpResponse({
  body: new Blob(['xlsx'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }),
  headers: new HttpHeaders({
    'Content-Disposition': 'attachment; filename="relatorio-nfse-04-2026.xlsx"'
  })
});

describe('NfseRelatorioComponent', () => {
  let component: NfseRelatorioComponent;
  let fixture: ComponentFixture<NfseRelatorioComponent>;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('RelatorioService', [
      'relatorioNfse',
      'exportarRelatorioNfse'
    ]);
    serviceSpy.relatorioNfse.and.returnValue(of(mockRelatorio));
    serviceSpy.exportarRelatorioNfse.and.returnValue(of(mockExportResponse));

    await TestBed.configureTestingModule({
      imports: [NfseRelatorioComponent, RouterTestingModule],
      providers: [{ provide: RelatorioService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(NfseRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not request report when form is invalid', () => {
    component.form.setValue({ competencia: '13/2026', notaAnteriorEmitida: null });

    component.consultar();

    expect(serviceSpy.relatorioNfse).not.toHaveBeenCalled();
  });

  it('should request report and store response', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: false });

    component.consultar();

    expect(serviceSpy.relatorioNfse).toHaveBeenCalledWith('04/2026', false);
    expect(component.registros).toEqual(mockRelatorio);
    expect(component.consultado).toBeTrue();
  });

  it('should set erro when report request fails', () => {
    serviceSpy.relatorioNfse.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null });

    component.consultar();

    expect(component.erro).toBe('Erro ao carregar relatório de emissão de NFSEs.');
    expect(component.loadingRelatorio).toBeFalse();
  });

  it('should calculate total paid value', () => {
    component.registros = mockRelatorio;

    expect(component.totalValorPago()).toBe(250);
  });

  it('should export XLSX and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-xlsx');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: true });

    component.exportarExcel();

    expect(serviceSpy.exportarRelatorioNfse).toHaveBeenCalledWith('04/2026', 'XLSX', true);
    expect(component.exportandoExcel).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should export CSV and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-csv');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null });

    component.exportarCsv();

    expect(serviceSpy.exportarRelatorioNfse).toHaveBeenCalledWith('04/2026', 'CSV', null);
    expect(component.exportandoCsv).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should set friendly error when export fails', () => {
    serviceSpy.exportarRelatorioNfse.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null });

    component.exportarExcel();

    expect(component.erro).toBe('Erro ao exportar relatório em Excel.');
    expect(component.exportandoExcel).toBeFalse();
  });

  it('should render report rows after successful query', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null });
    component.consultar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ana Silva');
    expect(el.textContent).toContain('123.456.789-00');
    expect(el.textContent).toContain('Não');
  });
});
