import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PAPEIS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErroBlob } from '../../utils/api-error';
import { baixarBlob } from '../../utils/file-download';

export const MENSAGEM_SEM_PERMISSAO_PRONTUARIO = 'Você não tem permissão para exportar o prontuário do paciente.';
export const MENSAGEM_PERIODO_PRONTUARIO_INVALIDO = 'A data inicial deve ser menor ou igual à data final.';
const MENSAGEM_FALHA_PRONTUARIO = 'Erro ao exportar o prontuário em PDF.';

/** Os ids de rótulo e erro precisam ser únicos se a tela tiver mais de uma instância. */
let proximoId = 0;

/**
 * Exportação do prontuário em PDF (issue #308, carlessopilatesapi#250), usada no
 * detalhe do paciente (área Clínico) e no histórico de evoluções.
 *
 * O período é opcional e cada lado vale sozinho: sem nenhum, a API exporta o
 * prontuário completo. Com os dois, `início <= fim` é conferido aqui, antes de
 * chamar a API (que também o recusa com `400`). Só os papéis clínicos veem o
 * bloco — a API devolve `403` aos demais, e esse `403` aparece aqui mesmo, em
 * vez de levar a `/403`.
 */
@Component({
  selector: 'app-exportar-prontuario',
  imports: [ReactiveFormsModule],
  templateUrl: './exportar-prontuario.component.html',
  styleUrl: './exportar-prontuario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportarProntuarioComponent {
  private readonly service = inject(PacienteService);
  private readonly authService = inject(AuthService);

  readonly pacienteId = input.required<number>();
  /** Desenha o bloco como cartão, para telas em que ele não está dentro de um. */
  readonly cartao = input(false);

  readonly podeExportar = this.authService.hasAnyRole(PAPEIS.clinica);
  readonly exportando = signal(false);
  readonly erroPeriodo = signal<string | null>(null);
  readonly erro = signal<string | null>(null);

  readonly ids = (() => {
    const sufixo = ++proximoId;
    return {
      titulo: `prontuario-titulo-${sufixo}`,
      inicio: `prontuario-inicio-${sufixo}`,
      fim: `prontuario-fim-${sufixo}`,
      erroPeriodo: `prontuario-periodo-erro-${sufixo}`
    };
  })();

  readonly form = inject(FormBuilder).nonNullable.group({
    inicio: [''],
    fim: ['']
  });

  exportar(): void {
    if (this.exportando()) return;

    const { inicio, fim } = this.form.getRawValue();
    if (inicio && fim && inicio > fim) {
      this.erroPeriodo.set(MENSAGEM_PERIODO_PRONTUARIO_INVALIDO);
      return;
    }
    this.erroPeriodo.set(null);

    const id = this.pacienteId();
    this.exportando.set(true);
    this.erro.set(null);
    this.service.exportarProntuarioPdf(id, { inicio: inicio || null, fim: fim || null }).subscribe({
      next: response => {
        try {
          baixarBlob(response, `prontuario-${id}.pdf`);
        } catch {
          this.erro.set(MENSAGEM_FALHA_PRONTUARIO);
        } finally {
          this.exportando.set(false);
        }
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.erro.set(MENSAGEM_SEM_PERMISSAO_PRONTUARIO);
          this.exportando.set(false);
          return;
        }
        // O corpo do erro chega como Blob: o `detail` da API precisa ser lido antes de aparecer.
        void extrairMensagemErroBlob(err, MENSAGEM_FALHA_PRONTUARIO).then(mensagem => {
          this.erro.set(mensagem);
          this.exportando.set(false);
        });
      }
    });
  }
}
