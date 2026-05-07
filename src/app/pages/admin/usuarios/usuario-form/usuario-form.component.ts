import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { parseRouteNumberParam } from '../../../../shared/utils/route-param';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss'
})
export class UsuarioFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  isEdit = false;
  usuarioId: number | null = null;
  parametroInvalido = false;

  ngOnInit(): void {
    if (!this.route.snapshot.paramMap.has('id')) return;

    this.usuarioId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.usuarioId === null) {
      this.parametroInvalido = true;
      return;
    }

    this.isEdit = true;
  }
}
