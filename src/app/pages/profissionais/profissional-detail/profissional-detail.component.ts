import { Component, OnInit } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-profissional-detail',
  imports: [NgIf, DatePipe, RouterLink],
  templateUrl: './profissional-detail.component.html',
  styleUrl: './profissional-detail.component.scss'
})
export class ProfissionalDetailComponent implements OnInit {
  profissional: ProfissionalResponseDTO | null = null;
  loading = false;
  erro: string | null = null;
  confirmarAtivar = false;
  confirmarInativar = false;

  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;

  constructor(
    private service: ProfissionalService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (id === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.loading = true;
    this.service.buscar(id).subscribe({
      next: profissional => {
        this.profissional = profissional;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Profissional não encontrado.';
        this.loading = false;
      }
    });
  }

  ativar(): void {
    if (!this.profissional) return;

    this.service.ativar(this.profissional.id).subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: () => (this.erro = 'Erro ao ativar profissional.')
    });
  }

  inativar(): void {
    if (!this.profissional) return;

    this.service.inativar(this.profissional.id).subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: () => (this.erro = 'Erro ao inativar profissional.')
    });
  }
}
