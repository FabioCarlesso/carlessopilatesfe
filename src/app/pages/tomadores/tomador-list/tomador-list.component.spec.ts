import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { TomadorListComponent } from './tomador-list.component';
import { TomadorService } from '../../../core/services/tomador.service';
import { TomadorResponseDTO } from '../../../core/models/tomador';

const empresa: TomadorResponseDTO = {
  id: 3, nome: 'Empresa Ltda', cpfCnpj: '11222333000181', email: null, telefone: null, observacoes: null,
  ativo: true, quantidadePacientes: 2, version: 0
};

describe('TomadorListComponent', () => {
  let fixture: ComponentFixture<TomadorListComponent>;
  let component: TomadorListComponent;
  let serviceSpy: jasmine.SpyObj<TomadorService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TomadorService', ['listar']);
    serviceSpy.listar.and.returnValue(of({
      content: [empresa],
      page: { size: 20, number: 0, totalElements: 1, totalPages: 1 }
    }));
    await TestBed.configureTestingModule({
      imports: [TomadorListComponent, RouterTestingModule],
      providers: [{ provide: TomadorService, useValue: serviceSpy }]
    }).compileComponents();
    fixture = TestBed.createComponent(TomadorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should list active tomadores with masked document and patient count', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 20, { nome: '', cpfCnpj: '', ativo: true });
    const celulas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody td'))
      .map(td => td.textContent?.trim());
    expect(celulas.slice(0, 4)).toEqual(['Empresa Ltda', '11.222.333/0001-81', '2', 'Ativo']);
  });

  it('should search inactive tomadores by name', () => {
    component.filtro = { nome: ' Emp ', cpfCnpj: '', situacao: 'inativos' };
    component.buscar();
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 20, { nome: 'Emp', cpfCnpj: '', ativo: false });
    expect(component.buscaFiltrada).toBeTrue();
  });

  it('should show an error when loading fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar tomadores.');
  });
});
