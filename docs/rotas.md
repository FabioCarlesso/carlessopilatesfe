# Rotas

Mapa de todas as rotas da aplicação. O comportamento de cada tela está em
[`funcionalidades.md`](funcionalidades.md).

## Perfis

Cada rota protegida exige um grupo de papéis (`PAPEIS` em `core/models/auth.ts`),
que espelha a autorização da API (carlessopilatesapi#131). `ADMIN` entra em
todos. Um usuário pode **acumular** papéis e abre a rota se tiver qualquer um do
grupo; sem nenhum, o `roleGuard` leva a `/403`.

| Grupo | Papéis | Áreas |
|---|---|---|
| equipe | `ADMIN`, `PROFISSIONAL`, `RECEPCAO`, `FINANCEIRO` | Cadastro de pacientes |
| clínica | `ADMIN`, `PROFISSIONAL` | Prontuário: anamnese, avaliações, análise postural, evoluções, planos de tratamento, reavaliações |
| agenda | `ADMIN`, `PROFISSIONAL`, `RECEPCAO` | Agenda, lista de espera, sessões, calendário e aulas |
| cobrança | `ADMIN`, `RECEPCAO`, `FINANCEIRO` | Planos e pagamentos do paciente |
| fiscal | `ADMIN`, `FINANCEIRO` | NFSEs emitidas e relatórios de pagamento de profissional e de NFSE |
| admin | `ADMIN` | Profissionais, indicadores, inadimplência e `/admin` |

`/inicio` e `/perfil/alterar-senha` exigem só autenticação. `/aulas/pagamento/:pagamentoId`
lê o pagamento e depois as aulas, então exige agenda **e** cobrança.

## Rotas principais

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Landing pública de produto (**sem autenticação**); com sessão ativa, redireciona para `/inicio` |
| `/inicio`               | Dashboard inicial com indicadores do sistema |
| `/agenda`               | Agenda geral do estúdio: aulas e sessões de todos os pacientes no período, com visões semanal e diária (_agenda_) |
| `/lista-espera`         | Fila de interessados por dia da semana e faixa de horário, em ordem de chegada, com conversão em sessão e remoção (_agenda_) |
| `/lista-espera/nova`    | Inscrição de um paciente na lista de espera (_agenda_) |
| `/pacientes`            | Lista de pacientes com filtros e paginação (_equipe_) |
| `/pacientes/novo`       | Formulário de cadastro (_equipe_) |
| `/pacientes/:id/editar` | Formulário de edição (_equipe_) |
| `/pacientes/:pacienteId/anamnese` | Cadastro e edição da anamnese do paciente (_clínica_) |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica` | Cadastro e edição da avaliação fisioterapêutica do paciente (_clínica_) |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural` | Listagem das análises posturais da avaliação fisioterapêutica do paciente (_clínica_) |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova` | Nova análise postural: seleção de vista e upload de foto comprimida (_clínica_) |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar` | Editor de marcação postural (grade, prumo, marcação guiada e zoom) e resultados: medidas calculadas, observações e conclusão (_clínica_) |
| `/pacientes/:pacienteId/sessoes` | Lista de sessões de pilates/fisioterapia do paciente (_agenda_) |
| `/pacientes/:pacienteId/sessoes/nova` | Cadastro de sessão (_agenda_) |
| `/pacientes/:pacienteId/sessoes/:id/editar` | Edição de sessão (_agenda_) |
| `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` | Cadastro e edição da evolução clínica da sessão (_clínica_) |
| `/pacientes/:pacienteId/evolucoes` | Histórico de evoluções do paciente em linha do tempo, com gráfico de dor e filtros de período/tipo (somente leitura) (_clínica_) |
| `/pacientes/:pacienteId/calendario` | Calendário mensal/semanal das sessões e aulas do paciente (somente leitura) (_agenda_) |
| `/pacientes/:pacienteId/plano-tratamento` | Lista de planos de tratamento do paciente (_clínica_) |
| `/pacientes/:pacienteId/plano-tratamento/novo` | Cadastro de plano de tratamento (_clínica_) |
| `/pacientes/:pacienteId/plano-tratamento/:id/editar` | Edição de plano de tratamento (_clínica_) |
| `/pacientes/:pacienteId/reavaliacoes` | Lista de reavaliações do paciente (_clínica_) |
| `/pacientes/:pacienteId/reavaliacoes/nova` | Cadastro de reavaliação (_clínica_) |
| `/pacientes/:pacienteId/reavaliacoes/:id/editar` | Edição de reavaliação (_clínica_) |
| `/pacientes/:pacienteId/nfse-emitidas` | Lista de NFSEs emitidas do paciente, com destaque para a última (_fiscal_) |
| `/pacientes/:pacienteId/nfse-emitidas/nova` | Registro de NFSE emitida (_fiscal_) |
| `/pacientes/:pacienteId/nfse-emitidas/:id/editar` | Edição de NFSE emitida (_fiscal_) |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo) (_equipe_) |
| `/profissionais`        | Lista de profissionais com filtros e paginação (`ADMIN`) |
| `/profissionais/novo`   | Formulário de cadastro de profissional (`ADMIN`) |
| `/profissionais/:id`    | Detalhes do profissional (`ADMIN`)         |
| `/profissionais/:id/editar` | Formulário de edição de profissional (`ADMIN`) |
| `/profissionais/:id/agenda` | Agenda semanal do profissional: aulas e sessões do período, contadores e comissão (somente leitura, `ADMIN`) |
| `/relatorios`           | Seção de relatórios (_fiscal_) |
| `/relatorios/pagamento-profissional` | Relatório de pagamento de profissional (_fiscal_) |
| `/relatorios/nfse` | Relatório de emissão de NFSEs (_fiscal_) |
| `/relatorios/indicadores` | Indicadores históricos: receita, ocupação e evasão mês a mês, e ranking de aulas por profissional (`ADMIN`) |
| `/financeiro/inadimplencia` | Gestão de inadimplência: lista global paginada de pagamentos com dias em atraso, filtros e contatos de cobrança (`ADMIN`) |
| `/admin` | Hub da seção administrativa (`ADMIN`) |
| `/admin/usuarios` | Listagem administrativa de usuários (`ADMIN`) |
| `/admin/usuarios/novo` | Cadastro de usuário (`ADMIN`) |
| `/admin/usuarios/:id/editar` | Edição de usuário (`ADMIN`) |
| `/admin/bloqueios` | Bloqueios de agenda do período: feriados, manutenções e eventos em que o estúdio não funciona (`ADMIN`) |
| `/admin/bloqueios/novo` | Cadastro de bloqueio de agenda (`ADMIN`) |
| `/admin/bloqueios/:id/editar` | Edição de bloqueio de agenda (`ADMIN`) |
| `/perfil/alterar-senha` | Troca de senha do usuário autenticado |
| `/login` | Tela de autenticação (pública) |
| `/esqueci-senha` | Solicitação de recuperação de senha por e-mail (pública) |
| `/resetar-senha` | Redefinição de senha a partir do token recebido por e-mail (pública) |
| `/403` | Tela de acesso negado |

## Planos, pagamentos e aulas

| Caminho | Função |
|---------|--------|
| `/planos/paciente/:pacienteId` | Lista de planos do paciente (_cobrança_) |
| `/planos/novo/:pacienteId` | Criar novo plano (_cobrança_) |
| `/pagamentos/paciente/:pacienteId` | Lista de pagamentos (_cobrança_) |
| `/pagamentos/novo/:pacienteId` | Registrar novo pagamento (_cobrança_); aceita `planoId`, `valor`, `periodoInicio` e `dataVencimento` na query string para a renovação (issue #133) |
| `/aulas/paciente/:pacienteId` | Lista de aulas geradas (_agenda_) |
| `/aulas/pagamento/:pagamentoId` | Lista de aulas por pagamento (_agenda + cobrança_) |
