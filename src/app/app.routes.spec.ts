import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CanActivateFn, Routes, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { UserRole } from './core/models/auth';
import { routes } from './app.routes';
import { authGuard } from './core/guards/auth.guard';
import { visitanteGuard } from './core/guards/visitante.guard';
import { PacienteAvaliacaoComponent } from './pages/pacientes/paciente-avaliacao/paciente-avaliacao.component';
import { InadimplenciaComponent } from './pages/financeiro/inadimplencia/inadimplencia.component';
import { FinanceiroRelatorioComponent } from './pages/relatorios/financeiro-relatorio/financeiro-relatorio.component';
import { RecebimentosRelatorioComponent } from './pages/relatorios/recebimentos-relatorio/recebimentos-relatorio.component';
import { FrequenciaRelatorioComponent } from './pages/relatorios/frequencia-relatorio/frequencia-relatorio.component';
import { AulasSemEvolucaoRelatorioComponent } from './pages/relatorios/aulas-sem-evolucao-relatorio/aulas-sem-evolucao-relatorio.component';
import { AulaAtendimentoComponent } from './pages/aulas/aula-atendimento/aula-atendimento.component';
import { OcupacaoRelatorioComponent } from './pages/relatorios/ocupacao-relatorio/ocupacao-relatorio.component';
import { PacienteFinanceiroComponent } from './pages/pacientes/paciente-financeiro/paciente-financeiro.component';
import { PlanoListComponent } from './pages/planos/plano-list/plano-list.component';
import { PagamentoListComponent } from './pages/pagamentos/pagamento-list/pagamento-list.component';
import { PacienteNfseEmitidaListComponent } from './pages/pacientes/paciente-nfse-emitida-list/paciente-nfse-emitida-list.component';

function getAllPaths(routeList: Routes, prefix = ''): string[] {
  const result: string[] = [];
  for (const route of routeList) {
    const segment = route.path ?? '';
    const full = prefix ? (segment ? `${prefix}/${segment}` : prefix) : segment;
    if (!result.includes(full)) result.push(full);
    if (route.children) {
      for (const cp of getAllPaths(route.children, full)) {
        if (!result.includes(cp)) result.push(cp);
      }
    }
  }
  return result;
}

describe('app routes', () => {
  const paths = getAllPaths(routes);

  it('should contain all expected routes', () => {
    const expected = [
      '',
      'inicio',
      'perfil/alterar-senha',
      'login',
      'esqueci-senha',
      'resetar-senha',
      '403',
      'agenda',
      'lista-espera',
      'lista-espera/nova',
      'pacientes',
      'pacientes/novo',
      'pacientes/:id/editar',
      'pacientes/:pacienteId/avaliacao',
      'pacientes/:pacienteId/anamnese',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural',
      'pacientes/:pacienteId/sessoes/nova',
      'pacientes/:pacienteId/sessoes/:id/editar',
      'pacientes/:pacienteId/sessoes/:sessaoId/evolucao',
      'pacientes/:pacienteId/sessoes',
      'pacientes/:pacienteId/evolucoes',
      'pacientes/:pacienteId/calendario',
      'pacientes/:pacienteId/plano-tratamento/novo',
      'pacientes/:pacienteId/plano-tratamento/:id/editar',
      'pacientes/:pacienteId/plano-tratamento',
      'pacientes/:pacienteId/reavaliacoes/nova',
      'pacientes/:pacienteId/reavaliacoes/:id/editar',
      'pacientes/:pacienteId/reavaliacoes',
      'pacientes/:pacienteId/nfse-emitidas/nova',
      'pacientes/:pacienteId/nfse-emitidas/:id/editar',
      'pacientes/:pacienteId/nfse-emitidas',
      'pacientes/:pacienteId/financeiro',
      'pacientes/:id',
      'planos/novo/:pacienteId',
      'planos/paciente/:pacienteId',
      'pagamentos/novo/:pacienteId',
      'pagamentos/paciente/:pacienteId',
      'aulas/paciente/:pacienteId',
      'aulas/pagamento/:pagamentoId',
      'aulas/:aulaId/atendimento',
      'relatorios',
      'relatorios/pacientes',
      'relatorios/frequencia',
      'relatorios/pagamento-profissional',
      'relatorios/nfse',
      'relatorios/financeiro',
      'relatorios/recebimentos',
      'relatorios/ocupacao',
      'relatorios/indicadores',
      'relatorios/aulas-sem-evolucao',
      'financeiro/inadimplencia',
      'admin',
      'admin/usuarios',
      'admin/usuarios/novo',
      'admin/usuarios/:id/editar',
      'admin/bloqueios',
      'admin/bloqueios/novo',
      'admin/bloqueios/:id/editar',
      'tomadores',
      'tomadores/novo',
      'tomadores/:id/editar',
      'tomadores/:id',
      'profissionais',
      'profissionais/novo',
      'profissionais/:id/editar',
      'profissionais/:id/agenda',
      'profissionais/:id',
    ];
    expect(paths).toEqual(expected);
  });

  it('should place pacientes/:id after static pacientes routes', () => {
    const idIndex = paths.indexOf('pacientes/:id');
    const anamneseIndex = paths.indexOf('pacientes/:pacienteId/anamnese');
    const avaliacaoIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica');
    const posturalNovaIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova');
    const posturalMarcarIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar');
    const posturalIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural');
    const sessoesNovaIndex = paths.indexOf('pacientes/:pacienteId/sessoes/nova');
    const sessoesEditarIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:id/editar');
    const sessoesEvolucaoIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:sessaoId/evolucao');
    const sessoesListIndex = paths.indexOf('pacientes/:pacienteId/sessoes');
    const evolucoesListIndex = paths.indexOf('pacientes/:pacienteId/evolucoes');
    const calendarioIndex = paths.indexOf('pacientes/:pacienteId/calendario');
    const planoTratamentoNovoIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/novo');
    const planoTratamentoEditarIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/:id/editar');
    const planoTratamentoListIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento');
    const reavaliacaoNovaIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/nova');
    const reavaliacaoEditarIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/:id/editar');
    const reavaliacaoListIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes');
    const nfseEmitidaNovaIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas/nova');
    const nfseEmitidaEditarIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas/:id/editar');
    const nfseEmitidaListIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas');
    const financeiroIndex = paths.indexOf('pacientes/:pacienteId/financeiro');
    const editarIndex = paths.indexOf('pacientes/:id/editar');
    const novoIndex = paths.indexOf('pacientes/novo');
    const listIndex = paths.indexOf('pacientes');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(anamneseIndex);
    expect(anamneseIndex).toBeLessThan(avaliacaoIndex);
    expect(avaliacaoIndex).toBeLessThan(posturalNovaIndex);
    expect(posturalNovaIndex).toBeLessThan(posturalMarcarIndex);
    expect(posturalMarcarIndex).toBeLessThan(posturalIndex);
    expect(posturalIndex).toBeLessThan(sessoesNovaIndex);
    expect(sessoesNovaIndex).toBeLessThan(sessoesEditarIndex);
    expect(sessoesEditarIndex).toBeLessThan(sessoesEvolucaoIndex);
    expect(sessoesEvolucaoIndex).toBeLessThan(sessoesListIndex);
    expect(sessoesListIndex).toBeLessThan(evolucoesListIndex);
    expect(evolucoesListIndex).toBeLessThan(calendarioIndex);
    expect(calendarioIndex).toBeLessThan(planoTratamentoNovoIndex);
    expect(planoTratamentoNovoIndex).toBeLessThan(planoTratamentoEditarIndex);
    expect(planoTratamentoEditarIndex).toBeLessThan(planoTratamentoListIndex);
    expect(planoTratamentoListIndex).toBeLessThan(reavaliacaoNovaIndex);
    expect(reavaliacaoNovaIndex).toBeLessThan(reavaliacaoEditarIndex);
    expect(reavaliacaoEditarIndex).toBeLessThan(reavaliacaoListIndex);
    expect(reavaliacaoListIndex).toBeLessThan(nfseEmitidaNovaIndex);
    expect(nfseEmitidaNovaIndex).toBeLessThan(nfseEmitidaEditarIndex);
    expect(nfseEmitidaEditarIndex).toBeLessThan(nfseEmitidaListIndex);
    expect(nfseEmitidaListIndex).toBeLessThan(financeiroIndex);
    expect(financeiroIndex).toBeLessThan(idIndex);
  });

  it('should place pacientes/:id before planos routes', () => {
    const idIndex = paths.indexOf('pacientes/:id');
    const planosIndex = paths.indexOf('planos/novo/:pacienteId');
    expect(idIndex).toBeLessThan(planosIndex);
  });

  it('should group profissionais routes together', () => {
    const listIndex = paths.indexOf('profissionais');
    const novoIndex = paths.indexOf('profissionais/novo');
    const editarIndex = paths.indexOf('profissionais/:id/editar');
    const idIndex = paths.indexOf('profissionais/:id');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(idIndex);
  });

  it('should group admin routes with home before usuarios subroutes', () => {
    const homeIndex = paths.indexOf('admin');
    const listIndex = paths.indexOf('admin/usuarios');
    const novoIndex = paths.indexOf('admin/usuarios/novo');
    const editarIndex = paths.indexOf('admin/usuarios/:id/editar');

    expect(homeIndex).toBeLessThan(listIndex);
    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
  });

  it('should group admin bloqueios routes with the list before the forms', () => {
    const homeIndex = paths.indexOf('admin');
    const listIndex = paths.indexOf('admin/bloqueios');
    const novoIndex = paths.indexOf('admin/bloqueios/novo');
    const editarIndex = paths.indexOf('admin/bloqueios/:id/editar');

    expect(homeIndex).toBeLessThan(listIndex);
    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
  });

  // A landing é o único conteúdo público indexável do sistema: se ela ganhar um
  // `authGuard` por engano, a raiz volta a redirecionar para o login e a página
  // deixa de existir para quem ainda não entrou (issue #244).
  it('should serve the landing on the root path behind the visitor guard', () => {
    const raiz = routes.find(r => r.path === '');

    expect(raiz).toBeTruthy();
    expect(raiz!.canActivate).toEqual([visitanteGuard]);
  });

  it('should mark the landing route as fluid layout', () => {
    const raiz = routes.find(r => r.path === '');
    expect(raiz!.data?.['layoutFluido']).toBeTrue();
  });

  it('should keep the dashboard on /inicio behind the auth guard', () => {
    const inicio = routes.find(r => r.path === 'inicio');

    expect(inicio).toBeTruthy();
    expect(inicio!.canActivate).toEqual([authGuard]);
  });

  it('should expose the password recovery routes without an auth guard', () => {
    for (const path of ['login', 'esqueci-senha', 'resetar-senha']) {
      const route = routes.find(r => r.path === path);
      expect(route).withContext(`route ${path} should exist`).toBeTruthy();
      expect(route!.canActivate).withContext(`route ${path} should be public`).toBeUndefined();
    }
  });

  it('should guard the patient assessment flow and lazy load its component', async () => {
    const route = routes.find(r => r.path === 'pacientes/:pacienteId/avaliacao');
    expect(route).toBeTruthy();
    expect(route!.canActivate?.length).toBe(1);
    expect(await (route!.loadComponent as () => Promise<unknown>)()).toBe(PacienteAvaliacaoComponent);
  });

  it('should guard the delinquency screen and lazy load its component', async () => {
    const route = routes.find(r => r.path === 'financeiro/inadimplencia');
    expect(route).toBeTruthy();
    expect(route!.canActivate?.length).toBe(1);
    expect(await (route!.loadComponent as () => Promise<unknown>)()).toBe(InadimplenciaComponent);
  });

  it('should guard the financial report and lazy load its component', async () => {
    const route = routes.find(r => r.path === 'relatorios/financeiro');
    expect(route).toBeTruthy();
    expect(route!.canActivate?.length).toBe(1);
    expect(await (route!.loadComponent as () => Promise<unknown>)()).toBe(FinanceiroRelatorioComponent);
  });

  it('should open the financial report to ADMIN and FINANCEIRO only, as the API does', () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const guard = routes.find(r => r.path === 'relatorios/financeiro')!.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['FINANCEIRO'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
  });

  it('should open the receipts report to ADMIN and FINANCEIRO only and lazy load it', async () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const route = routes.find(r => r.path === 'relatorios/recebimentos')!;
    const guard = route.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['FINANCEIRO'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
    expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(RecebimentosRelatorioComponent);
  });

  it('should open the attendance report to ADMIN and RECEPCAO only and lazy load it', async () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const route = routes.find(r => r.path === 'relatorios/frequencia')!;
    const guard = route.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeTrue();
      expect(ativar(['FINANCEIRO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
    expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(FrequenciaRelatorioComponent);
  });

  it('should open the classes without evolution report to ADMIN only and lazy load it', async () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const route = routes.find(r => r.path === 'relatorios/aulas-sem-evolucao')!;
    const guard = route.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['FINANCEIRO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
    expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(AulasSemEvolucaoRelatorioComponent);
  });

  it('should open the class atendimento to ADMIN and PROFISSIONAL only and lazy load it (issue #303)', async () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const route = routes.find(r => r.path === 'aulas/:aulaId/atendimento')!;
    const guard = route.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['PROFISSIONAL'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['FINANCEIRO'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
    expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(AulaAtendimentoComponent);
  });

  it('should open the grade occupation to ADMIN and RECEPCAO only and lazy load it', async () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const route = routes.find(r => r.path === 'relatorios/ocupacao')!;
    const guard = route.canActivate![0] as CanActivateFn;
    const ativar = (roles: UserRole[]) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    };

    try {
      expect(ativar(['ADMIN'])).toBeTrue();
      expect(ativar(['RECEPCAO'])).toBeTrue();
      expect(ativar(['FINANCEIRO'])).toBeInstanceOf(UrlTree);
      expect(ativar(['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    } finally {
      localStorage.clear();
    }
    expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(OcupacaoRelatorioComponent);
  });

  it('should guard the patient financial history with the billing roles and lazy load it', async () => {
    const route = routes.find(r => r.path === 'pacientes/:pacienteId/financeiro');
    expect(route).toBeTruthy();
    expect(route!.canActivate?.length).toBe(1);
    expect(await (route!.loadComponent as () => Promise<unknown>)()).toBe(PacienteFinanceiroComponent);
  });

  describe('financeiro do paciente e subtelas (issue #302)', () => {
    function ativar(path: string, roles: UserRole[]): unknown {
      const guard = routes.find(r => r.path === path)!.canActivate![0] as CanActivateFn;
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles }));
      try {
        return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
      } finally {
        localStorage.clear();
      }
    }

    beforeEach(() => TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] }));

    it('should open the unified screen to ADMIN, RECEPCAO and FINANCEIRO, as before', () => {
      const path = 'pacientes/:pacienteId/financeiro';
      expect(ativar(path, ['ADMIN'])).toBeTrue();
      expect(ativar(path, ['RECEPCAO'])).toBeTrue();
      expect(ativar(path, ['FINANCEIRO'])).toBeTrue();
      expect(ativar(path, ['PROFISSIONAL'])).toBeInstanceOf(UrlTree);
    });

    // As rotas antigas não redirecionam: continuam servindo as próprias telas,
    // agora como subtelas do financeiro, com os mesmos papéis de antes.
    it('should keep the plan and payment lists reachable by the billing roles', async () => {
      for (const path of ['planos/paciente/:pacienteId', 'pagamentos/paciente/:pacienteId']) {
        expect(ativar(path, ['RECEPCAO'])).withContext(path).toBeTrue();
        expect(ativar(path, ['FINANCEIRO'])).withContext(path).toBeTrue();
        expect(ativar(path, ['PROFISSIONAL'])).withContext(path).toBeInstanceOf(UrlTree);
      }
      const carregar = (path: string) => (routes.find(r => r.path === path)!.loadComponent as () => Promise<unknown>)();
      expect(await carregar('planos/paciente/:pacienteId')).toBe(PlanoListComponent);
      expect(await carregar('pagamentos/paciente/:pacienteId')).toBe(PagamentoListComponent);
    });

    it('should keep the NFSE list reachable by the fiscal roles only', async () => {
      const path = 'pacientes/:pacienteId/nfse-emitidas';
      expect(ativar(path, ['FINANCEIRO'])).toBeTrue();
      expect(ativar(path, ['RECEPCAO'])).toBeInstanceOf(UrlTree);
      const route = routes.find(r => r.path === path)!;
      expect(route.redirectTo).toBeUndefined();
      expect(await (route.loadComponent as () => Promise<unknown>)()).toBe(PacienteNfseEmitidaListComponent);
    });
  });

  it('should protect every admin route with a canActivate guard on the parent', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute).toBeTruthy();
    expect(adminRoute!.canActivate?.length).toBeGreaterThan(0);
    expect(adminRoute!.children?.length).toBeGreaterThan(0);
  });
});
