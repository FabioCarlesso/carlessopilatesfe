# Carlesso Pilates — Documentação do Frontend

## Visão Geral

**Projeto:** Carlesso Pilates Frontend  
**Versão:** 0.0.0  
**Tecnologia:** Angular 19 (SPA)  
**Propósito:** Interface web para gestão administrativa de um estúdio de pilates.
**Backend esperado:** API REST em `http://localhost:8080`

---

## Stack de Tecnologias

| Camada         | Tecnologia                              |
|----------------|-----------------------------------------|
| Framework      | Angular 19.2                            |
| Linguagem      | TypeScript 5.7                          |
| Estilos        | SCSS (Sass) + Design Tokens             |
| Forms          | Reactive Forms (@angular/forms)         |
| HTTP           | HttpClient (@angular/common/http)       |
| Roteamento     | Angular Router                          |
| Reatividade    | RxJS 7.8                                |
| Testes         | Karma + Jasmine                         |
| Build          | Angular CLI 19.2 / @angular-devkit      |
| Container      | Docker + Nginx                          |

---

## Módulos

| Módulo | Rotas | Funcionalidades |
|--------|-------|-----------------|
| Dashboard | `/` | Indicadores consolidados de pacientes, profissionais, pagamentos e aulas do mês atual |
| Pacientes | `/pacientes`, `/pacientes/:id`, `/pacientes/novo`, `/pacientes/:id/editar`, `/pacientes/:pacienteId/anamnese`, `/pacientes/:pacienteId/avaliacao-fisioterapeutica`, `/pacientes/:pacienteId/sessoes`, `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao`, `/pacientes/:pacienteId/plano-tratamento` | CRUD completo, filtros de busca, paginação, ativar/inativar, anamnese clínica, avaliação fisioterapêutica, sessões, evolução clínica da sessão e planos de tratamento |
| Profissionais | `/profissionais`, `/profissionais/:id`, `/profissionais/novo`, `/profissionais/:id/editar` | CRUD completo restrito a `ADMIN`, ativar/inativar, atualização via PUT, paginação com janela limitada, guarda de limites e sincronização com metadados da API |
| Planos | `/planos/paciente/:pacienteId`, `/planos/novo/:pacienteId` | Listar, criar (com seleção de dias, validação de frequência e labels centralizados no model), inativar |
| Pagamentos | `/pagamentos/paciente/:pacienteId`, `/pagamentos/novo/:pacienteId` | Listar, criar, confirmar pagamento |
| Aulas | `/aulas/paciente/:pacienteId`, `/aulas/pagamento/:pagamentoId` | Listar, exibir carregamento inicial por pagamento, confirmar presença e vincular profissional responsável |
| Relatórios | `/relatorios`, `/relatorios/pagamento-profissional`, `/relatorios/nfse` | Acessar relatórios administrativos restritos a `ADMIN`, consultar pagamento de profissional por período, emissão de NFSEs por competência e exportar PDF/XLSX/CSV |
| Autorização | `/403` | `roleGuard` para rotas por perfil e tela dedicada de acesso negado |

---

## Estrutura de Pastas

```
carlessopilatesfe/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   │   ├── paciente.ts          # DTOs e interfaces de pacientes
│   │   │   │   ├── plano-tratamento.ts  # DTOs e interfaces de planos de tratamento
│   │   │   │   ├── sessao.ts            # DTOs e interfaces de sessões
│   │   │   │   ├── evolucao-sessao.ts   # DTOs e interfaces de evoluções de sessão
│   │   │   │   └── profissional.ts      # DTOs e interfaces de profissionais
│   │   │   └── services/
│   │   │       ├── paciente.service.ts  # Serviço de integração com a API de pacientes
│   │   │       ├── plano-tratamento.service.ts # Serviço de planos de tratamento
│   │   │       ├── sessao.service.ts    # Serviço de sessões
│   │   │       ├── evolucao-sessao.service.ts # Serviço de evoluções de sessão
│   │   │       └── profissional.service.ts # Serviço de integração com a API de profissionais
│   │   ├── pages/
│   │   │   ├── dashboard/               # Tela inicial com indicadores do sistema
│   │   │   ├── pacientes/
│   │   │   │   ├── paciente-list/       # Listagem paginada de pacientes
│   │   │   │   ├── paciente-form/       # Formulário de cadastro e edição
│   │   │   │   ├── paciente-detail/     # Visualização detalhada
│   │   │   │   ├── paciente-anamnese/   # Cadastro e edição da anamnese
│   │   │   │   ├── paciente-avaliacao-fisioterapeutica/ # Avaliação fisioterapêutica
│   │   │   │   ├── paciente-sessao-list/ # Listagem de sessões
│   │   │   │   ├── paciente-sessao-form/ # Cadastro e edição de sessão
│   │   │   │   ├── paciente-evolucao-sessao/ # Cadastro e edição da evolução da sessão
│   │   │   │   ├── paciente-plano-tratamento-list/ # Listagem de planos de tratamento
│   │   │   │   └── paciente-plano-tratamento-form/ # Cadastro e edição de plano de tratamento
│   │   │   ├── profissionais/           # CRUD de profissionais
│   │   │   └── relatorios/              # Relatórios administrativos
│   │   ├── shared/
│   │   │   └── components/
│   │   │       └── confirmar-dialog/    # Componente de diálogo reutilizável
│   │   ├── app.component.*              # Componente raiz com navbar
│   │   ├── app.config.ts                # Configuração da aplicação
│   │   └── app.routes.ts                # Definição das rotas
│   ├── styles.scss                      # Estilos globais e classes parametrizadas
│   ├── styles/
│   │   └── _tokens.scss                  # Tokens do Design System Carlesso
│   ├── main.ts                          # Ponto de entrada (bootstrap)
│   └── index.html                       # HTML principal
├── assets/                               # Referências do Design System
├── docs/                                # Documentação do projeto
├── nginx/
│   └── default.conf.template            # Proxy /api e fallback da SPA em Docker
├── angular.json                         # Configuração do Angular CLI
├── Dockerfile                           # Build multi-stage e imagem Nginx
├── docker-compose.yml                   # Execução local em container
├── package.json                         # Dependências e scripts
└── tsconfig.json                        # Configuração do TypeScript
```

---

## Modelos de Dados

Arquivo: `src/app/core/models/dashboard.ts`

### `DashboardResumoDTO`
Resumo consolidado consumido pela tela inicial.
```typescript
interface DashboardResumoDTO {
  pacientes: {
    totalAtivos: number;
    totalInativos: number;
  };
  profissionais: {
    totalAtivos: number;
    totalInativos: number;
  };
  pagamentos: {
    totalPendentes: number;
    totalPagos: number;
    totalVencidos: number;
    receitaMesAtual: number;
  };
  aulas: {
    totalRealizadasMesAtual: number;
    totalAgendadasMesAtual: number;
  };
  geradoEm: string;
}
```

Arquivo: `src/app/core/models/paciente.ts`

### `EnderecoDTO`
```typescript
interface EnderecoDTO {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}
```

### `PacienteResponseDTO`
Retorno da API ao listar/buscar pacientes.
```typescript
interface PacienteResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  endereco: EnderecoDTO | null;
  ativo: boolean;
}
```

### `PacienteRequestDTO`
Payload para criação de paciente.
```typescript
interface PacienteRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}
```

### `PacienteUpdateDTO`
Payload para atualização (somente CPF é imutável; e-mail pode ser alterado).
```typescript
interface PacienteUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}
```

### `PageMetadata`
Metadados de paginação retornados aninhados pelo Spring Boot 3.x.
```typescript
interface PageMetadata {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

### `Page<T>`
Wrapper de resposta paginada da API. Os metadados ficam em `page.page` (estrutura aninhada do Spring Boot 3.x). O componente que consome essa resposta aplica fallback para os campos `number`, `size`, `totalPages` e `totalElements` para preservar o estado anterior caso o backend omita algum atributo, evitando exibição de `NaN` no resumo e seletor vazio na listagem de pacientes.
```typescript
interface Page<T> {
  content: T[];
  page: PageMetadata;
}
```

Arquivo: `src/app/core/models/anamnese.ts`

### `AnamneseRequestDTO`
Payload para criação de anamnese vinculada ao paciente.
```typescript
interface AnamneseRequestDTO {
  pacienteId: number;
  queixaPrincipal: string;
  historicoDoencas?: string;
  historicoCirurgias?: string;
  historicoLesoes?: string;
  medicamentosUso?: string;
  alergias?: string;
  nivelAtividadeFisica?: string;
  restricoesMedicas?: string;
  objetivos: string;
  observacoes?: string;
}
```

### `AnamneseResponseDTO`
Retorno da API ao consultar ou salvar anamnese.
```typescript
interface AnamneseResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  queixaPrincipal: string;
  historicoDoencas: string | null;
  historicoCirurgias: string | null;
  historicoLesoes: string | null;
  medicamentosUso: string | null;
  alergias: string | null;
  nivelAtividadeFisica: string | null;
  restricoesMedicas: string | null;
  objetivos: string;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
```

Arquivo: `src/app/core/models/plano-tratamento.ts`

### `PlanoTratamentoRequestDTO`
Payload para criação de plano de tratamento vinculado ao paciente.
```typescript
interface PlanoTratamentoRequestDTO {
  pacienteId: number;
  dataInicio: string;
  dataPrevisaoTermino?: string | null;
  objetivosTerapeuticos: string;
  frequenciaSemanal: number;
  condutasPropostas: string;
  exerciciosIndicados: string;
  exerciciosContraindicados?: string | null;
  equipamentosPrevistos?: string | null;
  observacoesClinicas?: string | null;
}
```

### `PlanoTratamentoResponseDTO`
Retorno da API ao listar, consultar ou salvar plano de tratamento.
```typescript
type PlanoTratamentoStatus = 'ATIVO' | 'ENCERRADO' | 'SUSPENSO';

interface PlanoTratamentoResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  dataInicio: string;
  dataPrevisaoTermino: string | null;
  objetivosTerapeuticos: string;
  frequenciaSemanal: number;
  condutasPropostas: string;
  exerciciosIndicados: string;
  exerciciosContraindicados: string | null;
  equipamentosPrevistos: string | null;
  observacoesClinicas: string | null;
  status: PlanoTratamentoStatus;
  dataCriacao: string;
  dataAtualizacao: string | null;
}
```

Arquivo: `src/app/core/models/profissional.ts`

### `ProfissionalResponseDTO`
Retorno da API ao listar/buscar profissionais.
```typescript
interface ProfissionalResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  tipoContrato: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula: number;
  dataInicio: string;
  ativo: boolean;
}
```

### `ProfissionalRequestDTO`
Payload para criação de profissional.
```typescript
interface ProfissionalRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  tipoContrato: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula: number;
  dataInicio: string;
}
```

### `ProfissionalUpdateDTO`
Payload para atualização de profissionais via `PUT /profissionais/{id}`.
```typescript
interface ProfissionalUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  tipoContrato?: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula?: number;
  dataInicio?: string;
}
```

### `ProfissionalPagamentoAulaDTO`
Detalhamento de cada aula realizada usada no relatório de pagamento.
```typescript
interface ProfissionalPagamentoAulaDTO {
  aulaId: number;
  data: string;
  pacienteId: number;
  pacienteNome: string;
  pagamentoId: number;
  valorPagamento: number;
  quantidadeAulasPagamento: number;
  valorBaseAula: number;
  percentualPagamentoAula: number;
  valorProfissional: number;
}
```

### `ProfissionalPagamentoRelatorioDTO`
Retorno consolidado do relatório de pagamento de profissional, usando o contrato estruturado da API.
```typescript
interface ProfissionalResumoDTO {
  id: number;
  nome: string;
  cpf: string;
  tipoContrato: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula: number;
}

interface ProfissionalPagamentoPeriodoDTO {
  inicio: string;
  fim: string;
}

interface ProfissionalPagamentoResumoFinanceiroDTO {
  totalAulas: number;
  quantidadePagamentos: number;
  totalPagamentosBruto: number;
  totalProfissional: number;
}

interface ProfissionalPagamentoResumoDTO {
  pagamentoId: number;
  valorPagamento: number;
  quantidadeAulasPagamento: number;
  quantidadeAulasNoPeriodo: number;
  valorBaseAula: number;
  totalProfissional: number;
}

interface ProfissionalPagamentoRelatorioDTO {
  profissional: ProfissionalResumoDTO;
  periodo: ProfissionalPagamentoPeriodoDTO;
  resumo: ProfissionalPagamentoResumoFinanceiroDTO;
  pagamentos: ProfissionalPagamentoResumoDTO[];
  aulas: ProfissionalPagamentoAulaDTO[];
  geradoEm: string;
}
```

Arquivo: `src/app/core/models/plano.ts`

### `AulaResponseDTO`
Retorno da API ao listar/buscar aulas.
```typescript
interface AulaResponseDTO {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  pagamentoId: number;
  data: string;
  realizada: boolean;
  profissionalId?: number | null;
  profissionalNome?: string | null;
}
```

### Labels e regras auxiliares de planos
O model centraliza os labels usados nas telas de planos, pagamentos e aulas:
```typescript
const DIAS_SEMANA_LABEL: Record<DiaSemana, string>;
const TIPO_LABEL: Record<TipoPagamento, string>;
const FREQUENCIA_LABEL: Record<FrequenciaSemanal, string>;
const FREQUENCIA_DIAS: Record<FrequenciaSemanal, number>;
```

O formulário de planos reutiliza essas constantes exportadas pelo model, evitando duplicação de textos de exibição para tipo, frequência e dias da semana.

---

## Serviços

### `PacienteService`
Arquivo: `src/app/core/services/paciente.service.ts`  
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/pacientes`

Em desenvolvimento local, o Angular CLI redireciona `/api` para `http://localhost:8080` via `proxy.conf.json`. Em Docker, o Nginx redireciona `/api` para o valor de `BACKEND_URL`. Em produção (Vercel), o `vercel.json` reescreve `/api/*` para o backend público no Railway, removendo o prefixo `/api` — o mesmo comportamento dos ambientes anteriores.

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listar(page, size, filtro)` | `GET /pacientes?page&size&sort=nome&nome&email&cpf&telefone&ativo` | Lista pacientes paginados com filtros opcionais |
| `buscar(id)`      | `GET /pacientes/{id}`       | Busca paciente por ID            |
| `cadastrar(dto)`  | `POST /pacientes`           | Cria novo paciente               |
| `atualizar(id, dto)` | `PUT /pacientes/{id}`    | Atualiza dados do paciente (e-mail incluso, CPF é imutável) |
| `ativar(id)`      | `PATCH /pacientes/{id}/ativar` | Reativa paciente inativo      |
| `inativar(id)`    | `PATCH /pacientes/{id}/inativar` | Inativa paciente (soft delete) |

### `PlanoTratamentoService`
Arquivo: `src/app/core/services/plano-tratamento.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/planos-tratamento`

| Método | Endpoint HTTP | Descrição |
|--------|---------------|-----------|
| `listarPorPaciente(pacienteId)` | `GET /planos-tratamento/paciente/{pacienteId}` | Lista planos do paciente |
| `buscar(id)` | `GET /planos-tratamento/{id}` | Busca plano por ID |
| `criar(dto)` | `POST /planos-tratamento` | Cria plano vinculado ao paciente |
| `atualizar(id, dto)` | `PUT /planos-tratamento/{id}` | Atualiza dados e status do plano |
| `encerrar(id)` | `PATCH /planos-tratamento/{id}/encerrar` | Encerra plano ativo ou suspenso |
| `suspender(id)` | `PATCH /planos-tratamento/{id}/suspender` | Suspende plano ativo |

### `SessaoService`
Arquivo: `src/app/core/services/sessao.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/sessoes`

| Método | Endpoint HTTP | Descrição |
|--------|---------------|-----------|
| `listarPorPaciente(pacienteId)` | `GET /sessoes/paciente/{pacienteId}` | Lista sessões do paciente |
| `buscar(id)` | `GET /sessoes/{id}` | Busca sessão por ID |
| `criar(dto)` | `POST /sessoes` | Cria sessão vinculada ao paciente |
| `atualizar(id, dto)` | `PUT /sessoes/{id}` | Atualiza data/hora, duração e observações da sessão |
| `realizar(id)` | `PATCH /sessoes/{id}/realizar` | Marca sessão agendada como realizada |
| `cancelar(id)` | `PATCH /sessoes/{id}/cancelar` | Cancela sessão agendada |

O model usado pelos componentes centraliza a data e hora em `dataHora` e a duração em `duracao`. O contrato atual da API de sessões usa `data`, `horario` e `duracaoMinutos`; por isso o `SessaoService` faz a tradução no `POST`/`PUT` e normaliza as respostas para o formato consumido pela UI. O `PUT` aceita apenas `data`, `horario`, `duracaoMinutos` e `observacoes`: o `SessaoUpdateDTO` reflete esse contrato (`dataHora`, `duracao`, `observacoes`) e o serviço não envia `status`, `tipo` nem `profissionalId` na atualização. A mudança de status é feita exclusivamente pelos `PATCH /sessoes/{id}/realizar` e `PATCH /sessoes/{id}/cancelar`, que validam a transição a partir de `AGENDADA`.

### `EvolucaoSessaoService`
Arquivo: `src/app/core/services/evolucao-sessao.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/evolucoes-sessao`

| Método | Endpoint HTTP | Descrição |
|--------|---------------|-----------|
| `listarPorPaciente(pacienteId)` | `GET /evolucoes-sessao/paciente/{pacienteId}` | Lista todas as evoluções do paciente; devolve lista vazia (não `404`) quando não há registros |
| `buscarPorSessao(sessaoId)` | `GET /evolucoes-sessao/sessao/{sessaoId}` | Busca evolução vinculada a uma sessão |
| `criar(dto)` | `POST /evolucoes-sessao` | Cria evolução com `sessaoId` e `dataHoraRegistro` |
| `atualizar(id, dto)` | `PUT /evolucoes-sessao/{id}` | Atualiza dados da evolução |

O contrato de evolução usa `dataHoraRegistro`, `exerciciosRealizados`, `equipamentosUtilizados`, `cargasMolas`, `dorAntes`, `dorDepois`, `respostaPaciente`, `intercorrencias`, `orientacoes` e `observacoesFisioterapeuta`. `dorAntes` e `dorDepois` aceitam apenas valores de 0 a 10 quando informados. O `EvolucaoSessaoResponseDTO` acrescenta `id`, `sessaoId`, `dataCriacao` e `dataAtualizacao`, e **não** desnormaliza dados da sessão: data/hora, tipo e profissional continuam vindo de `GET /api/sessoes/paciente/{pacienteId}` e são cruzados no frontend por `sessaoId` (é o que o histórico de evoluções faz).

### `ProfissionalService`
Arquivo: `src/app/core/services/profissional.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/profissionais`

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listar(page, size)` | `GET /profissionais?page&size&sort=nome` | Lista profissionais ativos paginados |
| `buscar(id)`      | `GET /profissionais/{id}`       | Busca profissional por ID        |
| `cadastrar(dto)`  | `POST /profissionais`           | Cria novo profissional           |
| `atualizar(id, dto)` | `PUT /profissionais/{id}`    | Atualiza dados do profissional   |
| `ativar(id)`      | `PATCH /profissionais/{id}/ativar` | Reativa profissional inativo  |
| `inativar(id)`    | `PATCH /profissionais/{id}/inativar` | Inativa profissional          |
| `relatorioPagamento(id, inicio, fim)` | `GET /profissionais/{id}/relatorio-pagamento?inicio&fim` | Consulta total devido e aulas realizadas no período |
| `exportarRelatorioPagamentoProfissionalPdf(id, inicio, fim)` | `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio&fim` | Baixa o relatório em PDF como `Blob` |
| `exportarRelatorioPagamentoProfissionalExcel(id, inicio, fim)` | `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio&fim` | Baixa o relatório em Excel/XLSX como `Blob` |

### Relatórios

#### Dashboard inicial
Rota: `/`

A tela inicial consome `GET /api/dashboard/resumo`, encaminhado pelo proxy local e pelo Nginx para `GET /dashboard/resumo` no backend. O endpoint retorna um objeto consolidado com pacientes, profissionais, pagamentos, aulas e `geradoEm`, evitando múltiplas consultas de listagem para montar os indicadores.

Contrato JSON consumido:
```http
GET /dashboard/resumo
```

Indicadores exibidos:
- Pacientes ativos e inativos
- Profissionais ativos e inativos
- Receita confirmada no mês atual
- Pagamentos pendentes, pagos e vencidos
- Aulas realizadas e agendadas no mês atual

#### Pagamento de Profissional
Rota: `/relatorios/pagamento-profissional`

A tela carrega profissionais ativos via `GET /profissionais?page=0&size=100&sort=nome`, exige profissional, data inicial e data final, e valida que `inicio <= fim` antes de consultar a API.

Contrato JSON consumido:
```http
GET /profissionais/{id}/relatorio-pagamento?inicio=2025-02-01&fim=2025-02-28
```

O resultado apresenta profissional, período, total de aulas, total devido, total bruto, resumo por pagamento e uma tabela com o detalhamento de cada aula realizada.

Contratos de exportação:
```http
GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=2025-02-01&fim=2025-02-28
GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=2025-02-01&fim=2025-02-28
```

As exportações são requisitadas com `responseType: 'blob'` e `observe: 'response'`. O frontend usa o header `Content-Disposition` para preservar o nome de arquivo definido pelo backend e aplica fallback local quando o header não está disponível. Os botões de exportação ficam bloqueados durante a geração do arquivo e erros exibem mensagem amigável na tela.

#### Emissão de NFSEs
Rota: `/relatorios/nfse`

A tela exige competência no formato `MM/AAAA`, valida mês de `01` a `12` e permite filtrar registros com ou sem nota anterior emitida. O backend expõe `GET /api/relatorios/nfse`; por isso o serviço Angular chama `/api/api/relatorios/nfse`, preservando o prefixo `/api` do backend após o proxy local e o Nginx removerem o primeiro `/api`. O resultado mostra total de registros, soma dos valores pagos e a tabela com nome, CPF/CNPJ, valor pago, competência, descrição do serviço, nota anterior emitida, data de pagamento e observações.

Contrato JSON consumido:
```http
GET /api/relatorios/nfse?competencia=04/2026
GET /api/relatorios/nfse?competencia=04/2026&notaAnteriorEmitida=false
```

Contratos de exportação:
```http
GET /api/relatorios/nfse?competencia=04/2026&formato=CSV
GET /api/relatorios/nfse?competencia=04/2026&formato=XLSX
```

As exportações são requisitadas como `Blob` e preservam o nome retornado em `Content-Disposition`, com fallback local no padrão `relatorio-nfse-MM-AAAA.csv|xlsx`.

### `AulaService`
Arquivo: `src/app/core/services/aula.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api`

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listarPorPaciente(pacienteId)` | `GET /aulas/paciente/{id}` | Lista aulas do paciente |
| `listarPorPagamento(pagamentoId)` | `GET /aulas/pagamento/{id}` | Lista aulas do pagamento |
| `realizar(aulaId, profissionalId)` | `PATCH /aulas/{id}/realizar?profissionalId={id}` | Marca aula como realizada e vincula o profissional responsável |

---

## Rotas

Arquivo: `src/app/app.routes.ts`  
Todos os componentes são carregados com **lazy loading** via `loadComponent()`.

Os parâmetros numéricos das rotas são validados antes de qualquer chamada à API. Apenas inteiros positivos seguros são aceitos; identificadores ausentes, não numéricos ou em formato inválido exibem **Identificador inválido.** e interrompem o carregamento da tela.

| Caminho                  | Componente              | Função                         |
|--------------------------|-------------------------|--------------------------------|
| `/`                      | `DashboardComponent`    | Dashboard inicial de indicadores |
| `/pacientes`             | `PacienteListComponent` | Lista de pacientes             |
| `/pacientes/novo`        | `PacienteFormComponent` | Formulário de cadastro         |
| `/pacientes/:id`         | `PacienteDetailComponent` | Detalhes do paciente         |
| `/pacientes/:id/editar`  | `PacienteFormComponent` | Formulário de edição           |
| `/pacientes/:pacienteId/anamnese` | `PacienteAnamneseComponent` | Cadastro e edição da anamnese |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica` | `PacienteAvaliacaoFisioterapeuticaComponent` | Cadastro e edição da avaliação fisioterapêutica |
| `/pacientes/:pacienteId/sessoes` | `PacienteSessaoListComponent` | Lista sessões de pilates/fisioterapia |
| `/pacientes/:pacienteId/sessoes/nova` | `PacienteSessaoFormComponent` | Cadastro de sessão |
| `/pacientes/:pacienteId/sessoes/:id/editar` | `PacienteSessaoFormComponent` | Edição de sessão |
| `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` | `PacienteEvolucaoSessaoComponent` | Cadastro e edição da evolução clínica da sessão |
| `/pacientes/:pacienteId/evolucoes` | `PacienteEvolucaoListComponent` | Histórico de evoluções do paciente em linha do tempo (somente leitura) |
| `/pacientes/:pacienteId/plano-tratamento` | `PacientePlanoTratamentoListComponent` | Lista planos de tratamento |
| `/pacientes/:pacienteId/plano-tratamento/novo` | `PacientePlanoTratamentoFormComponent` | Cadastro de plano de tratamento |
| `/pacientes/:pacienteId/plano-tratamento/:id/editar` | `PacientePlanoTratamentoFormComponent` | Edição de plano de tratamento |
| `/profissionais`         | `ProfissionalListComponent` | Lista de profissionais (`ADMIN`) |
| `/profissionais/novo`    | `ProfissionalFormComponent` | Formulário de cadastro (`ADMIN`) |
| `/profissionais/:id`     | `ProfissionalDetailComponent` | Detalhes do profissional (`ADMIN`) |
| `/profissionais/:id/editar` | `ProfissionalFormComponent` | Formulário de edição (`ADMIN`) |
| `/relatorios`            | `RelatorioListComponent` | Seção de relatórios (`ADMIN`) |
| `/relatorios/pagamento-profissional` | `ProfissionalPagamentoRelatorioComponent` | Relatório de pagamento de profissional (`ADMIN`) |
| `/relatorios/nfse`       | `NfseRelatorioComponent` | Relatório de emissão de NFSEs (`ADMIN`) |
| `/403`                   | `ForbiddenComponent` | Acesso negado |

---

## Componentes

### `AppComponent`
- Navbar com link para "Início"
- Navbar com link para "Pacientes"
- Navbar com links administrativos para "Profissionais" e "Relatórios" apenas para usuários `ADMIN`
- `<router-outlet>` para renderização das páginas

### `DashboardComponent`
- Consulta `DashboardService.resumo()` ao iniciar a tela
- Exibe cards de pacientes ativos, profissionais ativos, receita do mês e aulas do mês
- Detalha pagamentos pendentes, pagos e vencidos
- Calcula percentual de aulas realizadas no mês
- Trata estado de carregamento e erro de consulta
- Exibe ação de acesso a relatórios apenas para usuários `ADMIN`

### `PacienteListComponent`
- Tabela paginada de pacientes
- Filtros por nome, e-mail, CPF, telefone e status (ativos/inativos)
- Resumo do intervalo exibido e total de pacientes retornados pela API
- Seletor de itens por página com opções 5, 10, 20 e 50
- Navegação por página com botões anterior/próxima e janela de até 5 páginas visíveis
- Colunas: Nome, E-mail, CPF, Telefone, Status, Ações
- Ações: Ver, Editar, Inativar para ativos e Ativar para inativos
- Diálogo de confirmação (`ConfirmarDialogComponent`) para ativação e inativação
- Tratamento de erros e estado de carregamento

### `PacienteFormComponent`
- Modo duplo: cadastro e edição
- Reactive Form com seções: Dados Pessoais e Endereço
- Validações: campos obrigatórios, formato de e-mail, mínimo de 3 caracteres no nome
- Em modo edição: apenas CPF é desabilitado (e-mail pode ser atualizado)
- Feedback de erros em tempo real

### `PacienteDetailComponent`
- Exibição completa dos dados do paciente
- Badge de status: Ativo (verde) / Inativo (vermelho)
- Ações: Editar, Voltar; **Inativar** (se ativo) ou **Ativar** (se inativo)
- Diálogos de confirmação (`ConfirmarDialogComponent`) para ativação e inativação

### `PacienteSessaoListComponent`
- Lista sessões de pilates/fisioterapia por paciente
- Exibe status, tipo, data/hora, duração, profissional e observações
- Permite editar, acessar a evolução, realizar sessão agendada e cancelar sessão agendada
- Usa confirmação modal antes de realizar ou cancelar
- Trata estados de carregamento, vazio, sucesso e erro

### `PacienteSessaoFormComponent`
- Modo duplo: cadastro e edição
- Valida `pacienteId` e `id` antes de chamar a API
- Em edição, valida que a sessão retornada pertence ao paciente da rota antes de preencher o formulário
- Reactive Form com data/hora, tipo, duração, profissional opcional, observações e status
- Valida duração entre 1 e 480 minutos e profissional opcional como inteiro positivo
- Em edição, **tipo**, **profissional** e **status** ficam desabilitados (apenas informativos), pois o `PUT /sessoes/{id}` não os persiste; tipo e profissional são definidos no cadastro e o status muda pelas ações Realizar/Cancelar da listagem

### `PacienteEvolucaoSessaoComponent`
- Modo duplo: cadastro e edição da evolução vinculada a uma sessão
- Valida `pacienteId` e `sessaoId` antes de chamar a API
- Carrega a evolução somente depois de confirmar que a sessão pertence ao paciente da rota
- Reactive Form alinhado ao DTO do backend, com `dataHoraRegistro` obrigatório
- Valida `dorAntes` e `dorDepois` entre 0 e 10 quando informados
- Trata ausência de evolução por `404`, mantendo a tela em modo de cadastro

### `PacienteEvolucaoListComponent`
- Linha do tempo somente leitura com todas as evoluções do paciente em `/pacientes/:pacienteId/evolucoes` (`ChangeDetectionStrategy.OnPush`)
- Valida `pacienteId` antes de chamar a API e carrega paciente, sessões e evoluções (`forkJoin` das duas listagens), cruzando-as por `sessaoId`
- Ordena por data/hora da sessão em ordem decrescente, com desempate por `sessaoId`, e expõe a lista derivada num único ponto (`itens`) para reuso pelas fases seguintes
- Exibe sessões `REALIZADA` sem evolução como **Sem evolução registrada**, com link para registrar; sessões agendadas/canceladas sem evolução ficam fora da lista
- Cabeçalho com data/hora, tipo, profissional e variação `dorAntes → dorDepois` indicando melhora/piora
- **Observações do fisioterapeuta** sempre visível (com quebras de linha preservadas); demais campos atrás de expandir/recolher com `aria-expanded` e `aria-controls`, e **Expandir tudo**/**Recolher tudo** no topo. O painel permanece no DOM quando recolhido (classe `.evolucao-detalhes-recolhido`) para que o `aria-controls` sempre resolva
- Par de dor com `aria-label` próprio ("Dor antes 7, depois 3, melhora") e fallback `—` para o valor ausente
- Campos vazios não são renderizados; estado vazio e alerta de erro derivado de `extrairMensagemErro`, com mensagem neutra quando o `forkJoin` falha (a requisição que falhou pode ter sido a de sessões)
- Gráfico da evolução da dor acima da linha do tempo, em SVG inline montado pela função pura `montarGraficoDor(itens)` — deriva da coleção já carregada, sem requisição própria e sem biblioteca de gráficos
- Eixo Y fixo em 0–10 (escala do formulário de evolução) e eixo X com as sessões em ordem cronológica crescente, inversa à da lista; no máximo cinco datas escritas, sempre a primeira e a última
- Sessão com dor `null` quebra a série em vez de virar ponto em `0`; o gráfico é omitido enquanto nenhuma série chega a dois pontos, e séries sem nenhum ponto não são desenhadas nem entram na legenda
- `role="img"` com `aria-label` textual (sessões, período e a primeira e a última medição de cada série); grade, eixos e rótulos internos em `aria-hidden`
- Séries **Dor antes** e **Dor depois** distinguidas por cor de token (`--c-warning-text`/`--text-brand`) e por tracejado, nomeadas na legenda
- Responsivo por `viewBox` + `preserveAspectRatio` (`width: 100%`, `max-width: 480px`), sem gerar scroll horizontal

### `PacientePlanoTratamentoListComponent`
- Lista planos de tratamento por paciente
- Exibe status, datas, frequência semanal, objetivos, condutas, exercícios, equipamentos e observações
- Permite editar, suspender plano ativo e encerrar plano ativo ou suspenso
- Usa confirmação modal com semântica acessível antes de encerrar ou suspender
- Trata estados de carregamento, vazio, sucesso e erro

### `PacientePlanoTratamentoFormComponent`
- Modo duplo: cadastro e edição
- Valida `pacienteId` e `id` antes de chamar a API
- Em edição, valida que o plano retornado pertence ao paciente da rota antes de preencher o formulário
- Reactive Form com campos obrigatórios e opcionais do contrato
- Valida textos obrigatórios contra conteúdo somente com espaços e `frequenciaSemanal` entre 1 e 7

### `ProfissionalListComponent`
- Tabela paginada de profissionais ativos
- Navegação por página com janela de até 5 páginas visíveis para evitar excesso de botões no DOM
- Guarda de limites na navegação, ignorando páginas negativas, fora do total retornado ou iguais à página atual
- Sincroniza `currentPage` e `pageSize` com `page.number` e `page.size` retornados pela API, com fallback para o estado local quando metadados estiverem ausentes
- Colunas: Nome, E-mail, Contrato, % por Aula, Ações
- Ações: Ver, Editar e Inativar
- Diálogo de confirmação (`ConfirmarDialogComponent`) para inativação
- Tratamento de erros e estado de carregamento

### `AulaListComponent`
- Lista aulas por paciente ou pagamento
- Carrega profissionais ativos para seleção em aulas pendentes
- Exige profissional selecionado antes de marcar uma aula como realizada
- Abre o `ConfirmarDialogComponent` compartilhado antes do `PATCH /aulas/{id}/realizar`, exibindo a data da aula e o profissional selecionado (`acaoEmAndamento` bindado em `processando` evita duplo disparo)
- Destaca o `select` da linha (`is-invalid`/`aria-invalid` + `invalid-feedback` associado via `aria-describedby`) quando o usuário tenta confirmar sem escolher profissional, limpando o destaque e o erro assim que um profissional é selecionado
- Exibe hint ("Cadastre um profissional ativo para confirmar aulas") junto ao botão desabilitado quando não há profissionais ativos
- Define `aria-label` descritivo em cada `select` de profissional com a data da aula
- Envia `profissionalId` como query param no `PATCH /aulas/{id}/realizar`
- Exibe o nome do profissional vinculado em aulas realizadas quando retornado pela API

### `ConfirmarDialogComponent` _(shared)_
- Diálogo de confirmação reutilizável, usado por todas as telas que confirmam ações antes de disparar a requisição
- Inputs: `titulo`, `mensagem`, `textoConfirmar`, `textoCancelar`, `variante` (`primaria` | `secundaria` | `perigo`), `processando`, `confirmarDesabilitado` e `fecharAoClicarFora` (padrão `true`; desligado apenas no diálogo de pagamento, que tem formulário)
- Outputs: `confirmar` e `cancelar`
- `<ng-content>` para conteúdo projetado quando a mensagem não é texto simples (ex.: nome em negrito, formulário de data no diálogo de pagamento)
- Acessibilidade: `role="dialog"`, `aria-modal`, `aria-labelledby` (título), `aria-describedby` (corpo, cobrindo mensagem e conteúdo projetado), foco inicial no botão de confirmação, focus trap em Tab/Shift+Tab, fechamento por Esc e devolução do foco ao elemento disparador
- Trava o scroll do conteúdo de fundo enquanto está aberto (classe `dialog-aberto` no `body`)
- Enquanto `processando` está ativo, os botões ficam desabilitados e Esc não fecha o diálogo; todas as telas que confirmam ações bindam `processando` a um estado de ação em andamento, impedindo duplo disparo da requisição

---

## Design System

Arquivos principais:

- `assets/`: referências estáticas do Design System, incluindo `Fundacao.html`, `Componentes.html`, `Marca.html`, `tokens.css`, `common.jsx`, `design-canvas.jsx`, `browser-window.jsx` e `tweaks-panel.jsx`
- `src/styles/_tokens.scss`: tokens consumidos pelo Angular
- `src/styles.scss`: classes globais parametrizadas para o sistema

As páginas de referência usam `DesignCanvas`, `DCSection`, `DCArtboard`, `BrowserWindow`, `Frame` e painel de tweaks próprios. As URLs fictícias dos artboards seguem o domínio `carlesso.design`.

### Tokens CSS

Os tokens cobrem:

- Cores base, corpo, transição, assinatura, contraste, neutros e funcionais
- Tipografia display, UI/body e auxiliar
- Espaçamento, raio, sombra, foco, altura de botões, inputs e linhas de tabela
- Tema claro/escuro via `data-theme`
- Densidade `default`, `compact` e `comfortable` via `data-density`

O `StylePreferencesService` aplica os atributos no `documentElement`:

```html
<html data-theme="light" data-density="default">
```

### Elementos Estilizados Globalmente
- Navbar
- Botões: primary, secondary, danger, outline, tamanhos padrão e pequeno
- Inputs, selects e textareas com altura por token
- Tabelas com altura de linha por densidade
- Badges funcionais: sucesso, alerta, perigo, informação e neutro
- Formulários com seções e validação visual
- Cards de detalhe em grid
- Diálogos com overlay
- Paginação

---

## Scripts Disponíveis

```bash
npm start        # Servidor de desenvolvimento em http://localhost:4200
npm run build    # Build de produção em dist/carlessopilatesfe
npm run watch    # Build contínuo em modo desenvolvimento
npm test         # Execução dos testes unitários (Karma/Jasmine)
```

---

## Configuração de Build

| Ambiente    | Source Maps | Otimização | Output hashing |
|-------------|-------------|------------|----------------|
| Desenvolvimento | Sim     | Não        | Não            |
| Produção    | Não         | Sim        | Sim            |

**Budget de produção:**
- Initial bundle: máx. 500 KB
- Componente: máx. 4 KB

---

## Docker

O Dockerfile usa duas etapas:

| Etapa | Imagem | Responsabilidade |
|-------|--------|------------------|
| `build` | `node:22-alpine` | Instalar dependências com `npm ci` e gerar `dist/carlessopilatesfe/browser` |
| runtime | `nginx:1.27-alpine` | Servir a SPA e redirecionar `/api/*` para o backend |

### Execução com Compose

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:4200`. Por padrão, `BACKEND_URL` aponta para `http://host.docker.internal:8080`.

### Configurar backend

```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

### Execução com Docker

```bash
docker build -t carlessopilatesfe .
docker run --rm -p 4200:80 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  --add-host=host.docker.internal:host-gateway \
  carlessopilatesfe
```

---

## Testes Unitários

Framework: **Karma + Jasmine**  
Comando: `npm test`

### Arquivos de teste

| Arquivo | Cobertura |
|---------|-----------|
| `app/app.routes.spec.ts` | Inventário de rotas, agrupamento e precedência de rotas estáticas e dinâmicas |
| `app/app.component.spec.ts` | Renderização da navbar e router-outlet |
| `app/core/services/dashboard.service.spec.ts` | Contrato HTTP do resumo do dashboard |
| `app/core/services/paciente.service.spec.ts` | Todos os métodos HTTP e parâmetros de filtro em `listar` |
| `app/core/services/plano-tratamento.service.spec.ts` | Métodos HTTP de planos de tratamento, incluindo encerrar e suspender |
| `app/core/services/sessao.service.spec.ts` | Métodos HTTP de sessões, incluindo realizar e cancelar |
| `app/core/services/evolucao-sessao.service.spec.ts` | Métodos HTTP de evolução de sessão, incluindo busca por sessão, criação e atualização |
| `app/core/services/profissional.service.spec.ts` | Métodos HTTP de profissionais, incluindo atualização via PUT |
| `app/core/services/relatorio.service.spec.ts` | Contratos HTTP do relatório de NFSE e exportação CSV/XLSX |
| `app/core/services/style-preferences.service.spec.ts` | Aplicação de tema e densidade no `documentElement` |
| `app/pages/pacientes/paciente-list/paciente-list.component.spec.ts` | Carregamento, filtros, paginação, troca de tamanho de página, inativação, estados de erro |
| `app/pages/dashboard/dashboard/dashboard.component.spec.ts` | Carregamento de indicadores, cálculos derivados, renderização e estado de erro |
| `app/pages/profissionais/profissional-list/profissional-list.component.spec.ts` | Carregamento, inativação, estados de erro e janela limitada de páginas visíveis |
| `app/pages/pacientes/paciente-form/paciente-form.component.spec.ts` | Modo criação e edição, validações, navegação, erros |
| `app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts` | Carregamento, inativação, estados de erro |
| `app/pages/pacientes/paciente-sessao-list/paciente-sessao-list.component.spec.ts` | Carregamento, vazio, ações de status, confirmação e erros |
| `app/pages/pacientes/paciente-sessao-form/paciente-sessao-form.component.spec.ts` | Criação, edição, validações, vínculo paciente/sessão e erros |
| `app/pages/pacientes/paciente-evolucao-sessao/paciente-evolucao-sessao.component.spec.ts` | Criação, edição, validações, vínculo paciente/sessão, contrato de API e erros |
| `app/pages/pacientes/paciente-evolucao-list/paciente-evolucao-list.component.spec.ts` | Ordenação, join por `sessaoId`, tendência de dor, sessão sem evolução, expandir/recolher (clique, teclado e em massa), estado vazio, erros e guards de estilo |
| `app/pages/pacientes/paciente-plano-tratamento-list/paciente-plano-tratamento-list.component.spec.ts` | Carregamento, vazio, ações de status, confirmação e erros |
| `app/pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component.spec.ts` | Criação, edição, validações, vínculo paciente/plano e erros |
| `app/pages/planos/plano-form/plano-form.component.spec.ts` | Criação de plano, validação de frequência e dias, `ngOnDestroy`, reatividade do `valueChanges` |

### Estratégia de mocking

- **Serviço HTTP:** `HttpClientTestingModule` + `HttpTestingController` nos testes de serviço
- **PacienteService nos componentes:** `jasmine.createSpyObj` com retorno via `of()` ou `throwError()`
- **Router:** `RouterTestingModule` + `spyOn(router, 'navigate')`
- **ActivatedRoute:** objeto literal com `snapshot.paramMap.get()`

---

## Status do Projeto

### Implementado
- Dashboard inicial com indicadores consolidados de pacientes, profissionais, pagamentos e aulas
- CRUD completo de pacientes
- Filtros na listagem de pacientes por nome, e-mail, CPF, telefone e status
- Paginação da consulta de pacientes com resumo, navegação anterior/próxima, janela de páginas e tamanho de página configurável
- CRUD completo de profissionais com atualização via PUT
- Paginação server-side em pacientes e profissionais, com janela limitada de páginas visíveis e bloqueio de navegação fora dos limites
- Validação de formulários
- Feedback de erros e loading
- Integração com API REST (contratos alinhados com backend v2)
- Design responsivo
- Ativação e inativação de pacientes via PATCH
- E-mail mutável na edição (somente CPF é imutável)
- Módulo Planos: listagem, criação com seleção de dias, validação de frequência, reutilização dos labels exportados pelo model e cleanup de subscriptions via `ngOnDestroy`
- Plano de Tratamento do paciente: listagem, criação, edição, validação de vínculo paciente/plano e ações de encerrar/suspender
- Módulo Pagamentos: listagem, criação e confirmação de pagamento (PAGO)
- Módulo Aulas: listagem e confirmação de presença com vínculo do profissional responsável
- Módulo Relatórios: pagamento de profissional por período e emissão de NFSEs por competência
- Autenticação JWT com login, guard de rotas, interceptor HTTP e logout
- Autorização por perfil com `roleGuard`, rotas administrativas restritas a `ADMIN` e tela dedicada `/403`
- Navegação contextual na tela de detalhe do paciente (Planos / Pagamentos / Aulas / Anamnese / Avaliação Fisioterapêutica / Plano de Tratamento)
- Dockerfile, Docker Compose e Nginx para execução do frontend em container
- Testes unitários (serviço e todos os componentes de página)

### Não implementado / Próximos passos
- Configuração avançada de ambientes Angular, caso seja necessária no futuro
- Componente `ConfirmarDialog` integrado
- Testes E2E
- Busca e filtros nas demais listagens
- Animações e transições
