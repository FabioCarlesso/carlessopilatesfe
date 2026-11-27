import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EvolucaoSessaoResponseDTO } from '../../core/models/evolucao-sessao';

/**
 * Formulário da evolução clínica, compartilhado pela tela de evolução da sessão
 * e pela tela de atendimento da aula (issue #303): os dois registram a mesma
 * evolução, com os mesmos campos e as mesmas validações, e não podem divergir.
 * Os campos visuais ficam em `app-evolucao-campos`.
 */

/** Campos da evolução como a API os recebe, já normalizados (texto vazio vira `null`). */
export interface CamposEvolucao {
  dataHoraRegistro: string;
  exerciciosRealizados: string | null;
  equipamentosUtilizados: string | null;
  cargasMolas: string | null;
  dorAntes: number | null;
  dorDepois: number | null;
  respostaPaciente: string | null;
  intercorrencias: string | null;
  orientacoes: string | null;
  observacoesFisioterapeuta: string | null;
}

export function criarFormularioEvolucao(fb: FormBuilder): FormGroup {
  return fb.group({
    dataHoraRegistro: [paraDateTimeLocal(new Date()), Validators.required],
    observacoesFisioterapeuta: [''],
    exerciciosRealizados: [''],
    equipamentosUtilizados: [''],
    cargasMolas: [''],
    dorAntes: [null, [Validators.min(0), Validators.max(10)]],
    dorDepois: [null, [Validators.min(0), Validators.max(10)]],
    respostaPaciente: [''],
    intercorrencias: [''],
    orientacoes: ['']
  });
}

/** Lê o formulário e normaliza: texto em branco vira `null` e a dor vira número. */
export function camposDoFormularioEvolucao(form: FormGroup): CamposEvolucao {
  const valor = form.value;
  const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
  const dor = (v: number | string | null | undefined): number | null =>
    v !== null && v !== undefined && v !== '' ? Number(v) : null;

  return {
    dataHoraRegistro: valor.dataHoraRegistro,
    exerciciosRealizados: opt(valor.exerciciosRealizados),
    equipamentosUtilizados: opt(valor.equipamentosUtilizados),
    cargasMolas: opt(valor.cargasMolas),
    dorAntes: dor(valor.dorAntes),
    dorDepois: dor(valor.dorDepois),
    respostaPaciente: opt(valor.respostaPaciente),
    intercorrencias: opt(valor.intercorrencias),
    orientacoes: opt(valor.orientacoes),
    observacoesFisioterapeuta: opt(valor.observacoesFisioterapeuta)
  };
}

export function preencherFormularioEvolucao(form: FormGroup, evolucao: EvolucaoSessaoResponseDTO): void {
  form.patchValue({
    dataHoraRegistro: paraDateTimeLocal(evolucao.dataHoraRegistro),
    exerciciosRealizados: evolucao.exerciciosRealizados ?? '',
    equipamentosUtilizados: evolucao.equipamentosUtilizados ?? '',
    cargasMolas: evolucao.cargasMolas ?? '',
    dorAntes: evolucao.dorAntes,
    dorDepois: evolucao.dorDepois,
    respostaPaciente: evolucao.respostaPaciente ?? '',
    intercorrencias: evolucao.intercorrencias ?? '',
    orientacoes: evolucao.orientacoes ?? '',
    observacoesFisioterapeuta: evolucao.observacoesFisioterapeuta ?? ''
  });
}

/** `yyyy-MM-ddTHH:mm` no fuso local, o formato do `input[type=datetime-local]`; vazio se a data for inválida. */
export function paraDateTimeLocal(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number): string => n.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
