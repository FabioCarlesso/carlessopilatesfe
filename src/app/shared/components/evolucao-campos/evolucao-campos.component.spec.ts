import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { criarFormularioEvolucao } from '../../utils/evolucao-form';
import { EvolucaoCamposComponent } from './evolucao-campos.component';

@Component({
  imports: [ReactiveFormsModule, EvolucaoCamposComponent],
  template: `<form [formGroup]="form"><app-evolucao-campos [form]="form" /></form>`
})
class HostComponent {
  form: FormGroup = criarFormularioEvolucao(new FormBuilder());
}

describe('EvolucaoCamposComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('should render every evolution field with its label', () => {
    const ids = Array.from(el().querySelectorAll('label')).map(label => label.getAttribute('for'));
    expect(ids).toEqual([
      'dataHoraRegistro', 'observacoesFisioterapeuta', 'exerciciosRealizados', 'equipamentosUtilizados',
      'cargasMolas', 'dorAntes', 'dorDepois', 'respostaPaciente', 'intercorrencias', 'orientacoes'
    ]);
    ids.forEach(id => expect(el().querySelector(`#${id}`)).withContext(id!).not.toBeNull());
  });

  it('should write into the form of the page', () => {
    const campo = el().querySelector<HTMLTextAreaElement>('#exerciciosRealizados')!;
    campo.value = 'Ponte';
    campo.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.form.value.exerciciosRealizados).toBe('Ponte');
  });

  it('should show the errors once the page marks the form as touched', () => {
    const form = fixture.componentInstance.form;
    form.patchValue({ dataHoraRegistro: '', dorAntes: 12, dorDepois: -1 });
    form.markAllAsTouched();
    fixture.detectChanges();

    expect(el().querySelector('#dataHoraRegistroError')?.textContent?.trim()).toBe('Data/hora do registro é obrigatória.');
    expect(el().querySelector('#dorAntesError')?.textContent?.trim()).toBe('A dor antes deve estar entre 0 e 10.');
    expect(el().querySelector('#dorDepoisError')?.textContent?.trim()).toBe('A dor depois deve estar entre 0 e 10.');
    expect(el().querySelector('#dorAntes')?.classList).toContain('is-invalid');
  });
});
