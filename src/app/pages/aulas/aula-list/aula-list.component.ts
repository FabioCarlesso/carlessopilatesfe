import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AulaService } from '../../../core/services/aula.service';
import { AulaResponseDTO } from '../../../core/models/plano';

@Component({
  selector: 'app-aula-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './aula-list.component.html',
  styleUrl: './aula-list.component.scss'
})
export class AulaListComponent implements OnInit {
  pacienteId!: number;
  aulas: AulaResponseDTO[] = [];
  loading = false;
  erro: string | null = null;

  constructor(private service: AulaService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.pacienteId = +this.route.snapshot.paramMap.get('id')!;
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.pacienteId).subscribe({
      next: aulas => {
        this.aulas = aulas;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar aulas.';
        this.loading = false;
      }
    });
  }

  confirmar(id: number): void {
    this.service.confirmar(id).subscribe({
      next: () => this.carregar(),
      error: () => (this.erro = 'Erro ao confirmar presença.')
    });
  }
}
