import { FormBuilder } from '@angular/forms';
import { EvolucaoSessaoResponseDTO } from '../../core/models/evolucao-sessao';
import {
  camposDoFormularioEvolucao,
  criarFormularioEvolucao,
  paraDateTimeLocal,
  preencherFormularioEvolucao
} from './evolucao-form';

describe('evolucao-form', () => {
  const fb = new FormBuilder();

  it('should start with the current date/time and validate the pain range', () => {
    const form = criarFormularioEvolucao(fb);
    expect(form.value.dataHoraRegistro).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(form.valid).toBeTrue();

    form.patchValue({ dorAntes: 11 });
    expect(form.get('dorAntes')?.invalid).toBeTrue();
    form.patchValue({ dorAntes: -1 });
    expect(form.get('dorAntes')?.invalid).toBeTrue();
    form.patchValue({ dorAntes: 0, dataHoraRegistro: '' });
    expect(form.get('dorAntes')?.valid).toBeTrue();
    expect(form.get('dataHoraRegistro')?.invalid).toBeTrue();
  });

  it('should normalize blank text to null and pain to number', () => {
    const form = criarFormularioEvolucao(fb);
    form.patchValue({
      dataHoraRegistro: '2026-11-18T08:50',
      exerciciosRealizados: '  Ponte ',
      cargasMolas: '   ',
      dorAntes: '3',
      dorDepois: ''
    });

    expect(camposDoFormularioEvolucao(form)).toEqual({
      dataHoraRegistro: '2026-11-18T08:50',
      exerciciosRealizados: 'Ponte',
      equipamentosUtilizados: null,
      cargasMolas: null,
      dorAntes: 3,
      dorDepois: null,
      respostaPaciente: null,
      intercorrencias: null,
      orientacoes: null,
      observacoesFisioterapeuta: null
    });
  });

  it('should fill the form from an evolution', () => {
    const form = criarFormularioEvolucao(fb);
    preencherFormularioEvolucao(form, {
      dataHoraRegistro: '2026-11-18T08:50:00',
      exerciciosRealizados: 'Ponte',
      equipamentosUtilizados: null,
      cargasMolas: null,
      dorAntes: 4,
      dorDepois: null,
      respostaPaciente: null,
      intercorrencias: null,
      orientacoes: 'Caminhar',
      observacoesFisioterapeuta: null
    } as EvolucaoSessaoResponseDTO);

    expect(form.value).toEqual(jasmine.objectContaining({
      dataHoraRegistro: '2026-11-18T08:50',
      exerciciosRealizados: 'Ponte',
      equipamentosUtilizados: '',
      dorAntes: 4,
      orientacoes: 'Caminhar'
    }));
  });

  it('should return empty for an invalid date', () => {
    expect(paraDateTimeLocal('não é data')).toBe('');
    expect(paraDateTimeLocal(new Date(2026, 0, 2, 3, 4))).toBe('2026-01-02T03:04');
  });
});
