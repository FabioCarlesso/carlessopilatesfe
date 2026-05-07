import { Component, OnInit } from '@angular/core';
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
  isEdit = false;
  usuarioId: number | null = null;
  parametroInvalido = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === null) return;

    this.usuarioId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.usuarioId === null) {
      this.parametroInvalido = true;
      return;
    }

    this.isEdit = true;
  }
}
