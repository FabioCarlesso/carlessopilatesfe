import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TomadorService } from '../../../core/services/tomador.service';
import { AuthService } from '../../../core/services/auth.service';
import { PAPEIS } from '../../../core/models/auth';
import { TomadorPacienteDTO, TomadorResponseDTO } from '../../../core/models/tomador';
import { exibirValorGravado } from '../../../shared/utils/mascara';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-tomador-detail',
  imports: [RouterLink, CarregandoComponent, ConfirmarDialogComponent],
  templateUrl: './tomador-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class TomadorDetailComponent implements OnInit {
  tomador: TomadorResponseDTO | null = null;
  pacientes: TomadorPacienteDTO[] = [];
  loading = false;
  erro: string | null = null;
  confirmandoSituacao = false;
  processando = false;
  readonly papeis = PAPEIS;
  private id: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: TomadorService,
    readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.id = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.id === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  documento(cpfCnpj: string): string {
    return exibirValorGravado('cpfCnpj', cpfCnpj);
  }

  telefone(valor: string): string {
    return exibirValorGravado('telefone', valor);
  }

  alterarSituacao(): void {
    if (!this.tomador || this.processando) return;
    this.processando = true;
    const acao = this.tomador.ativo ? this.service.inativar(this.tomador.id) : this.service.ativar(this.tomador.id);
    acao.subscribe({
      next: () => {
        this.processando = false;
        this.confirmandoSituacao = false;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao alterar a situação do tomador.';
        this.processando = false;
        this.confirmandoSituacao = false;
      }
    });
  }

  private carregar(): void {
    if (this.id === null) return;
    this.loading = true;
    this.erro = null;
    forkJoin([this.service.buscar(this.id), this.service.pacientes(this.id)]).subscribe({
      next: ([tomador, pacientes]) => {
        this.tomador = tomador;
        this.pacientes = pacientes;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar tomador.';
        this.loading = false;
      }
    });
  }
}
