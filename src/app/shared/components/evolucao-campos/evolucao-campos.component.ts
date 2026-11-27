import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * Campos da evolução clínica (issue #303), usados pela evolução da sessão e
 * pelo atendimento da aula. O `FormGroup` é da página, criado por
 * `criarFormularioEvolucao`: é ela que valida, envia e decide o que fazer com a
 * resposta. `Eager` porque o `markAllAsTouched` do submit da página precisa
 * acender as mensagens daqui, e com `OnPush` o input não mudaria.
 */
@Component({
  selector: 'app-evolucao-campos',
  imports: [ReactiveFormsModule],
  templateUrl: './evolucao-campos.component.html',
  styleUrl: './evolucao-campos.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class EvolucaoCamposComponent {
  @Input({ required: true }) form!: FormGroup;

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}
