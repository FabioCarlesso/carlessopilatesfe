# Rotas

Mapa de todas as rotas da aplicação. O comportamento de cada tela está em
[`funcionalidades.md`](funcionalidades.md).

## Rotas principais

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Landing pública de produto (**sem autenticação**); com sessão ativa, redireciona para `/inicio` |
| `/inicio`               | Dashboard inicial com indicadores do sistema |
| `/agenda`               | Agenda geral do estúdio: aulas e sessões de todos os pacientes no período, com visões semanal e diária |
| `/lista-espera`         | Fila de interessados por dia da semana e faixa de horário, em ordem de chegada, com conversão em sessão e remoção |
| `/lista-espera/nova`    | Inscrição de um paciente na lista de espera |
| `/pacientes`            | Lista de pacientes com filtros e paginação  |
| `/pacientes/novo`       | Formulário de cadastro                      |
| `/pacientes/:id/editar` | Formulário de edição                        |
| `/pacientes/:pacienteId/anamnese` | Cadastro e edição da anamnese do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica` | Cadastro e edição da avaliação fisioterapêutica do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural` | Listagem das análises posturais da avaliação fisioterapêutica do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova` | Nova análise postural: seleção de vista e upload de foto comprimida |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar` | Editor de marcação postural (grade, prumo, marcação guiada e zoom) e resultados: medidas calculadas, observações e conclusão |
| `/pacientes/:pacienteId/sessoes` | Lista de sessões de pilates/fisioterapia do paciente |
| `/pacientes/:pacienteId/sessoes/nova` | Cadastro de sessão |
| `/pacientes/:pacienteId/sessoes/:id/editar` | Edição de sessão |
| `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` | Cadastro e edição da evolução clínica da sessão |
| `/pacientes/:pacienteId/evolucoes` | Histórico de evoluções do paciente em linha do tempo, com gráfico de dor e filtros de período/tipo (somente leitura) |
| `/pacientes/:pacienteId/calendario` | Calendário mensal/semanal das sessões e aulas do paciente (somente leitura) |
| `/pacientes/:pacienteId/plano-tratamento` | Lista de planos de tratamento do paciente |
| `/pacientes/:pacienteId/plano-tratamento/novo` | Cadastro de plano de tratamento |
| `/pacientes/:pacienteId/plano-tratamento/:id/editar` | Edição de plano de tratamento |
| `/pacientes/:pacienteId/reavaliacoes` | Lista de reavaliações do paciente |
| `/pacientes/:pacienteId/reavaliacoes/nova` | Cadastro de reavaliação |
| `/pacientes/:pacienteId/reavaliacoes/:id/editar` | Edição de reavaliação |
| `/pacientes/:pacienteId/nfse-emitidas` | Lista de NFSEs emitidas do paciente, com destaque para a última |
| `/pacientes/:pacienteId/nfse-emitidas/nova` | Registro de NFSE emitida |
| `/pacientes/:pacienteId/nfse-emitidas/:id/editar` | Edição de NFSE emitida |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/profissionais`        | Lista de profissionais com filtros e paginação (`ADMIN`) |
| `/profissionais/novo`   | Formulário de cadastro de profissional (`ADMIN`) |
| `/profissionais/:id`    | Detalhes do profissional (`ADMIN`)         |
| `/profissionais/:id/editar` | Formulário de edição de profissional (`ADMIN`) |
| `/profissionais/:id/agenda` | Agenda semanal do profissional: aulas e sessões do período, contadores e comissão (somente leitura, `ADMIN`) |
| `/relatorios`           | Seção de relatórios (`ADMIN`)              |
| `/relatorios/pagamento-profissional` | Relatório de pagamento de profissional (`ADMIN`) |
| `/relatorios/nfse` | Relatório de emissão de NFSEs (`ADMIN`) |
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
| `/planos/paciente/:pacienteId` | Lista de planos do paciente |
| `/planos/novo/:pacienteId` | Criar novo plano |
| `/pagamentos/paciente/:pacienteId` | Lista de pagamentos |
| `/pagamentos/novo/:pacienteId` | Registrar novo pagamento |
| `/aulas/paciente/:pacienteId` | Lista de aulas geradas |
| `/aulas/pagamento/:pagamentoId` | Lista de aulas por pagamento |
