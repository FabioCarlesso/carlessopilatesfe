// Carlesso Admin — All app screens
// Each Screen* component is a full-bleed admin page rendered inside a fixed-size frame.

const { useState: useStateS, useEffect: useEffectS, useRef: useRefS, useMemo: useMemoS } = React;

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_PACIENTES = [
  { id: 1, nome: 'Ana Beatriz Moretti', email: 'ana.moretti@email.com', cpf: '482.193.554-21', telefone: '(45) 99918-3344', ativo: true, plano: 'Mensal · 3x/sem', proxima: '2026-04-29', desde: '2024-03-12' },
  { id: 2, nome: 'Bruno Henrique Cavalcante', email: 'bruno.cavalcante@email.com', cpf: '391.728.611-09', telefone: '(45) 99182-7710', ativo: true, plano: 'Trimestral · 2x/sem', proxima: '2026-04-30', desde: '2025-01-08' },
  { id: 3, nome: 'Carolina Vasques de Almeida', email: 'carolina.vasques@email.com', cpf: '728.391.044-55', telefone: '(45) 99812-0091', ativo: true, plano: 'Anual · 3x/sem', proxima: '2026-05-02', desde: '2023-08-21' },
  { id: 4, nome: 'Diogo Felipe Santos', email: 'diogo.santos@email.com', cpf: '199.483.722-18', telefone: '(45) 98817-3322', ativo: false, plano: '—', proxima: '—', desde: '2022-11-04' },
  { id: 5, nome: 'Eliana Souza Tavares', email: 'eliana.tavares@email.com', cpf: '845.213.661-30', telefone: '(45) 99221-4408', ativo: true, plano: 'Mensal · 2x/sem', proxima: '2026-04-29', desde: '2025-09-15' },
  { id: 6, nome: 'Fernando Augusto Ribeiro', email: 'fernando.ribeiro@email.com', cpf: '513.928.077-44', telefone: '(45) 99887-0162', ativo: true, plano: 'Trimestral · 3x/sem', proxima: '2026-05-03', desde: '2024-06-30' },
  { id: 7, nome: 'Gabriela Pinheiro Lima', email: 'gabriela.lima@email.com', cpf: '921.483.005-77', telefone: '(45) 98712-3308', ativo: true, plano: 'Mensal · 2x/sem', proxima: '2026-04-28', desde: '2025-12-02' },
  { id: 8, nome: 'Henrique Otávio Branco', email: 'henrique.branco@email.com', cpf: '688.342.910-12', telefone: '(45) 99918-2275', ativo: true, plano: 'Anual · 2x/sem', proxima: '2026-05-01', desde: '2023-02-14' },
  { id: 9, nome: 'Isabela Cristina Vieira', email: 'isabela.vieira@email.com', cpf: '328.911.422-66', telefone: '(45) 98821-7733', ativo: false, plano: '—', proxima: '—', desde: '2024-04-19' },
  { id: 10, nome: 'João Pedro Rocha Nogueira', email: 'joao.nogueira@email.com', cpf: '744.821.099-31', telefone: '(45) 99100-2284', ativo: true, plano: 'Mensal · 3x/sem', proxima: '2026-04-30', desde: '2025-07-01' },
];

const MOCK_PROFISSIONAIS = [
  { id: 1, nome: 'Claudia Carlesso', funcao: 'Fisioterapeuta · RT', registro: 'CREFITO 84.221-F', email: 'claudia@carlesso.com.br', telefone: '(45) 99919-1006', ativo: true, aulasMes: 142 },
  { id: 2, nome: 'Camila Fornazero', funcao: 'Fisioterapeuta', registro: 'CREFITO 91.408-F', email: 'camila@carlesso.com.br', telefone: '(45) 99812-3344', ativo: true, aulasMes: 118 },
  { id: 3, nome: 'Renata Oliveira', funcao: 'Instrutora de Pilates', registro: 'SPC-2218', email: 'renata@carlesso.com.br', telefone: '(45) 98817-2210', ativo: true, aulasMes: 96 },
  { id: 4, nome: 'Marcelo Tavares', funcao: 'Fisioterapeuta', registro: 'CREFITO 102.337-F', email: 'marcelo@carlesso.com.br', telefone: '(45) 99918-7740', ativo: true, aulasMes: 84 },
];

const MOCK_AULAS_HOJE = [
  { hora: '07:00', paciente: 'Ana Beatriz M.', profissional: 'Claudia C.', status: 'realizada' },
  { hora: '07:00', paciente: 'João Pedro R.', profissional: 'Claudia C.', status: 'realizada' },
  { hora: '08:00', paciente: 'Carolina V.', profissional: 'Camila F.', status: 'realizada' },
  { hora: '08:00', paciente: 'Eliana S.', profissional: 'Camila F.', status: 'realizada' },
  { hora: '09:00', paciente: 'Bruno H.', profissional: 'Renata O.', status: 'em_andamento' },
  { hora: '09:00', paciente: 'Fernando A.', profissional: 'Renata O.', status: 'em_andamento' },
  { hora: '10:00', paciente: 'Gabriela P.', profissional: 'Marcelo T.', status: 'agendada' },
  { hora: '10:00', paciente: 'Henrique O.', profissional: 'Marcelo T.', status: 'agendada' },
  { hora: '14:00', paciente: 'Isabela C.', profissional: 'Claudia C.', status: 'agendada' },
  { hora: '14:00', paciente: 'Diogo F.', profissional: 'Claudia C.', status: 'agendada' },
  { hora: '15:00', paciente: 'Ana Beatriz M.', profissional: 'Camila F.', status: 'agendada' },
  { hora: '16:00', paciente: 'Carolina V.', profissional: 'Camila F.', status: 'agendada' },
];

// ============================================================================
// LOGIN
// ============================================================================
function ScreenLogin() {
  return (
    <div style={{
      minHeight: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg-app)',
    }}>
      {/* Left: brand canvas */}
      <PatternBackground opacity={0.06} density="sparse" style={{
        background: 'var(--c-cloud-dancer)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 56,
      }}>
        <Lockup size={56} layout="horizontal" tagline="Pilates e Fisioterapia" color="var(--c-horizonte)" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Eyebrow>Manifesto</Eyebrow>
          <div className="t-display" style={{ fontSize: 56, color: 'var(--c-tempestade)', maxWidth: 460, lineHeight: 1.05 }}>
            Onde a ciência<br />
            encontra a arte<br />
            <em style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic' }}>de mover-se.</em>
          </div>
          <BracketFrame>
            A base sólida: o movimento começa na base para ganhar altura com segurança.
          </BracketFrame>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span>Unidade Casa Azul</span>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--c-azul-3)' }} />
          <span>Est. 2015</span>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--c-azul-3)' }} />
          <span>Foz do Iguaçu</span>
        </div>
      </PatternBackground>

      {/* Right: form */}
      <div style={{
        background: 'var(--bg-elev)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 56,
      }}>
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Eyebrow>Acesso administrativo</Eyebrow>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)', margin: 0, letterSpacing: '0' }}>
              Entrar
            </h1>
            <p className="t-body-sm" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Use as credenciais fornecidas pela responsável técnica do estúdio.
            </p>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => e.preventDefault()}>
            <Field label="E-mail">
              <div className="input-wrap">
                <span className="input-wrap__icon"><Icon name="mail" size={16} /></span>
                <input className="input input--with-icon" type="email" defaultValue="claudia@carlesso.com.br" />
              </div>
            </Field>
            <Field label="Senha">
              <div className="input-wrap">
                <span className="input-wrap__icon"><Icon name="eye-off" size={16} /></span>
                <input className="input input--with-icon" type="password" defaultValue="••••••••••" />
              </div>
            </Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="check">
                <input type="checkbox" defaultChecked />
                <span className="check__box"><Icon name="check" size={11} /></span>
                <span>Manter conectada</span>
              </label>
              <a href="#" style={{ fontSize: 12, color: 'var(--text-brand)', textDecoration: 'none' }}>Esqueci a senha</a>
            </div>
            <Button variant="primary" block iconRight="arrow-right">Entrar no painel</Button>
          </form>

          <div className="divider--ornament">
            <span className="divider__dot" />
            <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>2026 · Carlesso</span>
            <span className="divider__dot" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================
function StatCard({ label, value, delta, deltaDir, sub, accent }) {
  return (
    <div className="stat" style={accent ? { background: 'var(--c-horizonte)', color: 'var(--c-cloud-dancer)' } : {}}>
      <div className="stat__label" style={accent ? { color: 'var(--c-azul-soft)' } : {}}>{label}</div>
      <div className="stat__value" style={accent ? { color: 'var(--c-cloud-dancer)' } : {}}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? 'var(--c-azul-soft)' : 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
      {delta && (
        <div className={`stat__delta stat__delta--${deltaDir}`} style={accent ? { color: 'var(--c-azul-soft)' } : {}}>
          <Icon name={deltaDir === 'up' ? 'trending-up' : 'trending-down'} size={12} />
          {delta}
        </div>
      )}
    </div>
  );
}

function ScreenDashboard() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="dashboard" />
      <div className="app-main">
        <Topbar crumbs={['Início']} rightSlot={<Button variant="secondary" size="sm" icon="search">Buscar</Button>} />
        <div className="page">
          <PageHeader
            eyebrow="Terça-feira · 28 de abril, 2026"
            title="Bom dia, Claudia."
            sub="12 aulas agendadas para hoje. 2 pagamentos aguardando confirmação."
            actions={
              <>
                <Button variant="secondary" icon="plus">Novo paciente</Button>
                <Button variant="primary" icon="calendar">Aulas de hoje</Button>
              </>
            }
          />

          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Pacientes ativos" value="247" delta="+12 este mês" deltaDir="up" accent />
            <StatCard label="Aulas no mês" value="864" delta="+8% vs mar" deltaDir="up" sub="Meta · 900" />
            <StatCard label="Faturamento (abr)" value="R$ 86,4k" delta="+R$ 4,2k" deltaDir="up" sub="Receita confirmada" />
            <StatCard label="Pendências" value="9" sub="2 pagamentos · 7 NFSEs" delta="3 atrasadas" deltaDir="down" />
          </div>

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Left: today's classes */}
            <div className="card">
              <div className="card__header">
                <div>
                  <Eyebrow>Hoje · 28 abril</Eyebrow>
                  <h2 className="t-h2" style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontSize: 24 }}>Aulas em andamento</h2>
                </div>
                <Button variant="ghost" size="sm" iconRight="arrow-right">Ver todas</Button>
              </div>
              <div style={{ padding: '8px 16px 16px' }}>
                {[
                  { t: '07:00', dur: 'concluído', a: 'Ana Beatriz M.', b: 'João Pedro R.', prof: 'Claudia C.', st: 'realizada' },
                  { t: '08:00', dur: 'concluído', a: 'Carolina V.', b: 'Eliana S.', prof: 'Camila F.', st: 'realizada' },
                  { t: '09:00', dur: 'em curso · 22 min', a: 'Bruno H.', b: 'Fernando A.', prof: 'Renata O.', st: 'em_andamento' },
                  { t: '10:00', dur: 'em 32 min', a: 'Gabriela P.', b: 'Henrique O.', prof: 'Marcelo T.', st: 'agendada' },
                  { t: '14:00', dur: 'em 4h32', a: 'Isabela C.', b: 'Diogo F.', prof: 'Claudia C.', st: 'agendada' },
                ].map((a, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr auto',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 12px',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: a.st === 'agendada' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{a.t}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a.a} · {a.b}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.prof} · {a.dur}</div>
                    </div>
                    <Badge variant={a.st === 'realizada' ? 'success' : a.st === 'em_andamento' ? 'info' : 'default'} dot>
                      {a.st === 'realizada' ? 'Realizada' : a.st === 'em_andamento' ? 'Em curso' : 'Agendada'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: quote + activity */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <PatternBackground opacity={0.05} density="dense" style={{
                background: 'var(--bg-paper)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '32px 28px',
              }}>
                <div style={{ marginBottom: 12 }}>
                  <Eyebrow>Da semana</Eyebrow>
                </div>
                <BracketFrame>
                  Uma estrutura só permanece de pé se cada componente estiver em harmonia.
                </BracketFrame>
                <div style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Manual de marca · 2026
                </div>
              </PatternBackground>

              <div className="card">
                <div className="card__header">
                  <Eyebrow>Atividade</Eyebrow>
                </div>
                <div style={{ padding: '8px 20px 20px' }}>
                  {[
                    { t: 'agora', txt: <><strong>Camila F.</strong> registrou aula realizada de <strong>Carolina V.</strong></> },
                    { t: '12 min', txt: <><strong>Sistema</strong> gerou 24 aulas a partir do plano de <strong>Henrique O.</strong></> },
                    { t: '38 min', txt: <><strong>Claudia C.</strong> confirmou pagamento de R$ 720,00 de <strong>Ana B.</strong></> },
                    { t: '1h', txt: <>Novo cadastro · <strong>Larissa Mendes</strong></> },
                    { t: '2h', txt: <>NFSE emitida · competência <strong>04/2026</strong></> },
                  ].map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12, lineHeight: 1.5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--c-azul-3)', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)' }}>{a.txt}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{a.t} atrás</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PACIENTES — LIST
// ============================================================================
function ScreenPacientesList() {
  const [page, setPage] = useStateS(1);
  const [pageSize, setPageSize] = useStateS(10);
  return (
    <div className="app-shell">
      <Sidebar activeKey="pacientes" />
      <div className="app-main">
        <Topbar crumbs={['Início', 'Pacientes']} />
        <div className="page">
          <PageHeader
            eyebrow="Cadastros"
            title="Pacientes"
            sub="247 ativos · 38 inativos"
            actions={
              <>
                <Button variant="secondary" icon="download">Exportar</Button>
                <Button variant="primary" icon="plus">Novo paciente</Button>
              </>
            }
          />

          {/* Filters */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 140px', gap: 12, padding: 20 }}>
              <div className="input-wrap">
                <span className="input-wrap__icon"><Icon name="search" size={16} /></span>
                <input className="input input--with-icon" placeholder="Buscar por nome, e-mail, CPF…" />
              </div>
              <input className="input" placeholder="CPF" />
              <input className="input" placeholder="Telefone" />
              <select className="select" defaultValue="ativos">
                <option value="ativos">Status · Ativos</option>
                <option value="inativos">Inativos</option>
                <option value="todos">Todos</option>
              </select>
              <Button variant="secondary" icon="filter">Filtros</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', flexWrap: 'wrap' }}>
              <Badge variant="info" dot>Ativos · 247</Badge>
              <Badge dot>Inativos · 38</Badge>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Última atualização · agora
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><label className="check"><input type="checkbox" /><span className="check__box"><Icon name="check" size={11} /></span></label></th>
                  <th>Paciente</th>
                  <th>Contato</th>
                  <th>Plano atual</th>
                  <th>Próxima aula</th>
                  <th>Status</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PACIENTES.map(p => (
                  <tr key={p.id}>
                    <td><label className="check"><input type="checkbox" /><span className="check__box"><Icon name="check" size={11} /></span></label></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={p.nome} size={34} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.nome}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{p.cpf}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12 }}>{p.email}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.telefone}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{p.plano}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic', fontSize: 14 }}>{p.proxima === '—' ? '—' : new Date(p.proxima).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span></td>
                    <td>
                      {p.ativo
                        ? <Badge variant="success" dot>Ativo</Badge>
                        : <Badge dot>Inativo</Badge>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn--ghost btn--icon btn--sm"><Icon name="more-h" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={25} pageSize={pageSize} totalItems={247} onChange={setPage} onSizeChange={setPageSize} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PACIENTE DETAIL
// ============================================================================
function ScreenPacienteDetail() {
  const [tab, setTab] = useStateS('overview');
  const p = MOCK_PACIENTES[2];
  return (
    <div className="app-shell">
      <Sidebar activeKey="pacientes" />
      <div className="app-main">
        <Topbar crumbs={['Pacientes', p.nome]} />
        <div className="page">
          {/* Hero */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <Avatar name={p.nome} size={88} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow>Paciente · ativo desde {new Date(p.desde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Eyebrow>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, margin: 0, color: 'var(--text-primary)', letterSpacing: '0' }}>
                {p.nome}
              </h1>
              <div style={{ display: 'flex', gap: 24, marginTop: 8, color: 'var(--text-secondary)', fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="mail" size={14} />{p.email}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="phone" size={14} />{p.telefone}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="user" size={14} />{p.cpf}</span>
                <Badge variant="success" dot>Ativo</Badge>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" icon="edit">Editar</Button>
              <Button variant="ghost" icon="minus">Inativar</Button>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Plano vigente" value="Anual" sub="3x/sem · ter, qui, sáb" />
            <StatCard label="Aulas restantes" value="84" sub="de 144 contratadas" />
            <StatCard label="Última aula" value="26 abr" sub="Camila F. · realizada" />
            <StatCard label="Próximo pgto." value="01 mai" sub="R$ 1.840,00" />
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: 'overview', label: 'Visão geral' },
              { key: 'planos', label: 'Planos', count: 3 },
              { key: 'pagamentos', label: 'Pagamentos', count: 12 },
              { key: 'aulas', label: 'Aulas', count: 84 },
              { key: 'anotacoes', label: 'Anotações' },
            ]}
          />

          {/* Tab content */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Próximas aulas list */}
            <div className="card">
              <div className="card__header">
                <Eyebrow>Próximas aulas</Eyebrow>
                <Button variant="ghost" size="sm" iconRight="arrow-right">Ver todas</Button>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Data</th>
                    <th>Hora</th>
                    <th>Profissional</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { d: '29 abr', h: '08:00', prof: 'Camila Fornazero', st: 'agendada' },
                    { d: '02 mai', h: '08:00', prof: 'Claudia Carlesso', st: 'agendada' },
                    { d: '04 mai', h: '08:00', prof: 'Camila Fornazero', st: 'agendada' },
                    { d: '06 mai', h: '08:00', prof: 'Renata Oliveira', st: 'agendada' },
                    { d: '09 mai', h: '08:00', prof: 'Claudia Carlesso', st: 'agendada' },
                  ].map((a, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic', fontSize: 14 }}>{a.d}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{a.h}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={a.prof} size={24} />
                          <span style={{ fontSize: 12 }}>{a.prof}</span>
                        </div>
                      </td>
                      <td><Badge dot>Agendada</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <Button variant="ghost" size="sm" icon="check-circle">Confirmar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right column: anamnese / contact / etc */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card__body">
                  <Eyebrow>Plano vigente</Eyebrow>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '8px 0 0', color: 'var(--text-primary)' }}>Anual · 3 aulas/sem</h3>
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Início · 12 jan, 2026<br />
                    Vigência · 11 jan, 2027<br />
                    Dias · ter, qui, sáb · 08:00<br />
                    Valor · R$ 22.080,00 / ano
                  </div>
                  <Button variant="secondary" size="sm" style={{ marginTop: 16 }} icon="file-text">Ver contrato</Button>
                </div>
              </div>

              <div className="card">
                <div className="card__body">
                  <Eyebrow>Anamnese · resumo</Eyebrow>
                  <BracketFrame>
                    Lombalgia mecânica crônica. Foco em fortalecimento do core e mobilidade torácica.
                  </BracketFrame>
                  <Button variant="ghost" size="sm" iconRight="arrow-right" style={{ marginTop: 8 }}>Ficha completa</Button>
                </div>
              </div>

              <div className="card">
                <div className="card__body">
                  <Eyebrow>Endereço</Eyebrow>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                    R. Almirante Barroso, 2117<br />
                    Centro · Foz do Iguaçu / PR<br />
                    85852-220
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PACIENTE FORM
// ============================================================================
function ScreenPacienteForm() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="pacientes" />
      <div className="app-main">
        <Topbar crumbs={['Pacientes', 'Novo cadastro']} />
        <div className="page" style={{ maxWidth: 980, margin: '0 auto', width: '100%' }}>
          <PageHeader
            eyebrow="Novo cadastro"
            title="Cadastrar paciente"
            sub="As informações abaixo são obrigatórias para o cadastro inicial."
            actions={
              <>
                <Button variant="ghost">Cancelar</Button>
                <Button variant="secondary">Salvar rascunho</Button>
                <Button variant="primary" icon="check">Cadastrar</Button>
              </>
            }
          />

          {/* Section 1: identificação */}
          <div className="card">
            <div className="card__header">
              <div>
                <Eyebrow>01 · Identificação</Eyebrow>
                <h2 className="t-h2" style={{ marginTop: 4 }}>Dados pessoais</h2>
              </div>
            </div>
            <div className="card__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <Field label="Nome completo" required>
                <input className="input" placeholder="Ex.: Carolina Vasques de Almeida" />
              </Field>
              <Field label="Nome social" hint="Nome pelo qual prefere ser chamada(o)">
                <input className="input" placeholder="Carol" />
              </Field>
              <Field label="CPF" required>
                <input className="input" placeholder="000.000.000-00" />
              </Field>
              <Field label="Data de nascimento" required>
                <input className="input" placeholder="DD/MM/AAAA" />
              </Field>
              <Field label="E-mail" required>
                <input className="input" type="email" placeholder="nome@email.com" />
              </Field>
              <Field label="Telefone" required>
                <input className="input" placeholder="(00) 00000-0000" />
              </Field>
            </div>
          </div>

          {/* Section 2: endereço */}
          <div className="card">
            <div className="card__header">
              <div>
                <Eyebrow>02 · Endereço</Eyebrow>
                <h2 className="t-h2" style={{ marginTop: 4 }}>Onde encontramos a/o paciente</h2>
              </div>
            </div>
            <div className="card__body" style={{ display: 'grid', gridTemplateColumns: '120px 2fr 1fr', gap: 20 }}>
              <Field label="CEP">
                <input className="input" placeholder="00000-000" />
              </Field>
              <Field label="Logradouro">
                <input className="input" />
              </Field>
              <Field label="Número">
                <input className="input" />
              </Field>
              <Field label="Complemento">
                <input className="input" />
              </Field>
              <Field label="Bairro">
                <input className="input" />
              </Field>
              <Field label="Cidade">
                <input className="input" defaultValue="Foz do Iguaçu" />
              </Field>
            </div>
          </div>

          {/* Section 3: clínico */}
          <div className="card">
            <div className="card__header">
              <div>
                <Eyebrow>03 · Histórico clínico</Eyebrow>
                <h2 className="t-h2" style={{ marginTop: 4 }}>Informações para o atendimento</h2>
              </div>
            </div>
            <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Field label="Queixa principal">
                <textarea className="textarea" placeholder="Descreva a queixa principal ou objetivo do paciente." />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label="Histórico de cirurgias">
                  <textarea className="textarea" placeholder="—" style={{ minHeight: 80 }} />
                </Field>
                <Field label="Medicações em uso">
                  <textarea className="textarea" placeholder="—" style={{ minHeight: 80 }} />
                </Field>
              </div>
              <Field label="Restrições / contraindicações">
                <textarea className="textarea" placeholder="—" style={{ minHeight: 60 }} />
              </Field>
              <div style={{ display: 'flex', gap: 24 }}>
                <label className="check"><input type="checkbox" /><span className="check__box"><Icon name="check" size={11} /></span>Possui atestado médico anexado</label>
                <label className="check"><input type="checkbox" defaultChecked /><span className="check__box"><Icon name="check" size={11} /></span>Autorização de imagem</label>
                <label className="check"><input type="checkbox" defaultChecked /><span className="check__box"><Icon name="check" size={11} /></span>Concorda com a LGPD</label>
              </div>
            </div>
            <div className="card__footer">
              <Button variant="ghost">Voltar</Button>
              <Button variant="primary" icon="check">Cadastrar paciente</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROFISSIONAIS
// ============================================================================
function ScreenProfissionais() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="profissionais" />
      <div className="app-main">
        <Topbar crumbs={['Profissionais']} />
        <div className="page">
          <PageHeader
            eyebrow="Equipe"
            title="Profissionais"
            sub="8 ativos · CREFITO + instrutoras"
            actions={<><Button variant="primary" icon="plus">Novo profissional</Button></>}
          />

          {/* Featured cards (top tier) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {MOCK_PROFISSIONAIS.slice(0, 2).map(pr => (
              <div key={pr.id} className="card">
                <PatternBackground opacity={0.04} density="dense" style={{ padding: '28px 28px 8px' }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <Avatar name={pr.nome} size={80} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Eyebrow>{pr.funcao}</Eyebrow>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.05, margin: '4px 0 0', color: 'var(--text-primary)' }}>
                        {pr.nome}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{pr.registro}</div>
                    </div>
                  </div>
                </PatternBackground>
                <div className="card__body" style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Aulas (abr)</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 4 }}>{pr.aulasMes}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pacientes ativos</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginTop: 4 }}>{Math.round(pr.aulasMes/12)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</div>
                    <div style={{ marginTop: 8 }}><Badge variant="success" dot>Ativo</Badge></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* List of remaining */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Função</th>
                  <th>Registro</th>
                  <th>Contato</th>
                  <th>Aulas (abr)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PROFISSIONAIS.map(pr => (
                  <tr key={pr.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={pr.nome} size={32} />
                        <span style={{ fontWeight: 500 }}>{pr.nome}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{pr.funcao}</span></td>
                    <td><span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{pr.registro}</span></td>
                    <td><span style={{ fontSize: 12 }}>{pr.email}</span></td>
                    <td><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{pr.aulasMes}</span></td>
                    <td>{pr.ativo ? <Badge variant="success" dot>Ativo</Badge> : <Badge dot>Inativo</Badge>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" iconRight="chevron">Detalhes</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AULAS — calendar/agenda view
// ============================================================================
function ScreenAulas() {
  const horas = ['07:00', '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const dias = [
    { d: 'Seg', n: 27, ativo: false },
    { d: 'Ter', n: 28, ativo: true },
    { d: 'Qua', n: 29, ativo: false },
    { d: 'Qui', n: 30, ativo: false },
    { d: 'Sex', n: 1, ativo: false, mes: 'mai' },
    { d: 'Sáb', n: 2, ativo: false, mes: 'mai' },
  ];
  // a few aulas mapped to (diaIdx, horaIdx)
  const grid = {};
  MOCK_AULAS_HOJE.forEach((a, i) => {
    const hi = horas.indexOf(a.hora);
    if (hi >= 0) {
      const key = `1-${hi}`; // hoje = ter
      if (!grid[key]) grid[key] = [];
      grid[key].push(a);
    }
  });
  // Fill some other days
  grid['0-1'] = [{ paciente: 'Eliana S.', profissional: 'Claudia C.', status: 'realizada' }, { paciente: 'João P.', profissional: 'Claudia C.', status: 'realizada' }];
  grid['0-3'] = [{ paciente: 'Bruno H.', profissional: 'Camila F.', status: 'realizada' }];
  grid['2-2'] = [{ paciente: 'Carolina V.', profissional: 'Renata O.', status: 'agendada' }];
  grid['2-5'] = [{ paciente: 'Henrique O.', profissional: 'Marcelo T.', status: 'agendada' }];
  grid['3-1'] = [{ paciente: 'Ana B.', profissional: 'Claudia C.', status: 'agendada' }, { paciente: 'João P.', profissional: 'Claudia C.', status: 'agendada' }];
  grid['3-7'] = [{ paciente: 'Diogo F.', profissional: 'Camila F.', status: 'agendada' }];
  grid['4-1'] = [{ paciente: 'Eliana S.', profissional: 'Claudia C.', status: 'agendada' }];
  grid['5-2'] = [{ paciente: 'Gabriela P.', profissional: 'Renata O.', status: 'agendada' }];

  return (
    <div className="app-shell">
      <Sidebar activeKey="aulas" />
      <div className="app-main">
        <Topbar crumbs={['Aulas']} />
        <div className="page">
          <PageHeader
            eyebrow="Semana 18 · Abril 2026"
            title="Aulas"
            sub="48 aulas agendadas · 19 realizadas · 2 canceladas"
            actions={
              <>
                <div style={{ display: 'inline-flex', borderRadius: 4, border: '1px solid var(--border-default)' }}>
                  <button className="btn btn--ghost btn--sm" style={{ borderRadius: 0, height: 34 }}><Icon name="grid" size={14} />Semana</button>
                  <span style={{ width: 1, background: 'var(--border-subtle)' }} />
                  <button className="btn btn--ghost btn--sm" style={{ borderRadius: 0, height: 34 }}><Icon name="list" size={14} />Lista</button>
                </div>
                <Button variant="secondary" icon="filter">Filtros</Button>
                <Button variant="primary" icon="plus">Nova aula</Button>
              </>
            }
          />

          {/* Week toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button variant="ghost" icon="chevron-left" size="sm">Anterior</Button>
              <Button variant="secondary" size="sm">Hoje</Button>
              <Button variant="ghost" iconRight="chevron" size="sm">Próxima</Button>
              <span style={{ marginLeft: 16, fontFamily: 'var(--font-display)', fontSize: 22 }}>27 abr — 2 mai</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-azul-soft)' }}/>Agendada</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-horizonte)' }}/>Realizada</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-warning)' }}/>Em andamento</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sunken)' }}>
              <div />
              {dias.map((d, i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  borderLeft: '1px solid var(--border-subtle)',
                  background: d.ativo ? 'var(--c-cloud-dancer-3)' : 'transparent',
                }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{d.d}{d.mes ? ` · ${d.mes}` : ''}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: d.ativo ? 'var(--c-horizonte)' : 'var(--text-primary)', marginTop: 2 }}>{d.n}</div>
                </div>
              ))}
            </div>
            <div>
              {horas.map((h, hi) => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '60px repeat(6, 1fr)', borderBottom: '1px solid var(--border-subtle)', minHeight: 62 }}>
                  <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h}</div>
                  {dias.map((d, di) => {
                    const cell = grid[`${di}-${hi}`] || [];
                    return (
                      <div key={di} style={{ borderLeft: '1px solid var(--border-subtle)', padding: 4, position: 'relative', background: d.ativo ? 'rgba(112,141,163,0.04)' : 'transparent' }}>
                        {cell.map((a, ai) => {
                          const colorMap = {
                            realizada: { bg: 'var(--c-horizonte)', fg: 'var(--c-cloud-dancer)', border: 'transparent' },
                            agendada: { bg: 'var(--c-cloud-dancer-3)', fg: 'var(--c-horizonte)', border: 'var(--c-azul-soft)' },
                            em_andamento: { bg: 'var(--c-warning-bg)', fg: 'var(--c-warning)', border: 'var(--c-warning)' },
                          };
                          const c = colorMap[a.status];
                          return (
                            <div key={ai} style={{
                              background: c.bg,
                              color: c.fg,
                              border: `1px solid ${c.border}`,
                              borderRadius: 3,
                              padding: '4px 8px',
                              fontSize: 11,
                              marginBottom: 2,
                              cursor: 'pointer',
                            }}>
                              <div style={{ fontWeight: 500 }}>{a.paciente}</div>
                              <div style={{ opacity: 0.75, fontSize: 10 }}>{a.profissional}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGAMENTOS / PLANOS
// ============================================================================
function ScreenPagamentos() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="pagamentos" />
      <div className="app-main">
        <Topbar crumbs={['Pagamentos']} />
        <div className="page">
          <PageHeader
            eyebrow="Movimentações"
            title="Pagamentos"
            sub="Abril 2026 · R$ 86.420,00 confirmado · R$ 4.200,00 pendente"
            actions={
              <>
                <Button variant="secondary" icon="download">Exportar</Button>
                <Button variant="primary" icon="plus">Registrar</Button>
              </>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Confirmado · abril" value="R$ 86,4k" delta="+12% vs mar" deltaDir="up" accent />
            <StatCard label="A confirmar" value="R$ 4,2k" sub="2 pagamentos" />
            <StatCard label="Atrasados" value="R$ 1,8k" sub="3 pacientes" delta="" deltaDir="down" />
            <StatCard label="Ticket médio" value="R$ 980" sub="entre planos ativos" />
          </div>

          {/* Tabs status */}
          <Tabs
            activeKey="todos"
            onChange={() => {}}
            items={[
              { key: 'todos', label: 'Todos', count: 142 },
              { key: 'confirmados', label: 'Confirmados', count: 138 },
              { key: 'pendentes', label: 'Pendentes', count: 2 },
              { key: 'atrasados', label: 'Atrasados', count: 3 },
            ]}
          />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Plano</th>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Forma</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'Ana Beatriz Moretti', plano: 'Mensal · 3x/sem', comp: '04/2026', venc: '01 mai', valor: 'R$ 720,00', forma: 'Pix', st: 'pendente' },
                  { n: 'Carolina Vasques', plano: 'Anual · 3x/sem', comp: '04/2026', venc: '01 mai', valor: 'R$ 1.840,00', forma: 'Cartão · 12x', st: 'confirmado' },
                  { n: 'Bruno Henrique', plano: 'Trimestral · 2x/sem', comp: '04/2026', venc: '28 abr', valor: 'R$ 1.560,00', forma: 'Boleto', st: 'atrasado' },
                  { n: 'Henrique Otávio', plano: 'Anual · 2x/sem', comp: '04/2026', venc: '01 mai', valor: 'R$ 1.480,00', forma: 'Pix', st: 'confirmado' },
                  { n: 'Gabriela Pinheiro', plano: 'Mensal · 2x/sem', comp: '04/2026', venc: '03 mai', valor: 'R$ 540,00', forma: 'Pix', st: 'pendente' },
                  { n: 'Eliana Souza', plano: 'Mensal · 2x/sem', comp: '04/2026', venc: '15 abr', valor: 'R$ 540,00', forma: 'Cartão · 1x', st: 'confirmado' },
                  { n: 'Fernando Ribeiro', plano: 'Trimestral · 3x/sem', comp: '04/2026', venc: '15 abr', valor: 'R$ 2.220,00', forma: 'Boleto', st: 'confirmado' },
                  { n: 'João Pedro Rocha', plano: 'Mensal · 3x/sem', comp: '04/2026', venc: '12 abr', valor: 'R$ 720,00', forma: 'Pix', st: 'confirmado' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={row.n} size={28} />
                        <span style={{ fontWeight: 500 }}>{row.n}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{row.plano}</span></td>
                    <td><span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{row.comp}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic', fontSize: 14 }}>{row.venc}</span></td>
                    <td><span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{row.valor}</span></td>
                    <td><span style={{ fontSize: 12 }}>{row.forma}</span></td>
                    <td>
                      {row.st === 'confirmado' && <Badge variant="success" dot>Confirmado</Badge>}
                      {row.st === 'pendente' && <Badge variant="warning" dot>Pendente</Badge>}
                      {row.st === 'atrasado' && <Badge variant="danger" dot>Atrasado</Badge>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.st === 'confirmado'
                        ? <Button variant="ghost" size="sm" icon="file-text">NFSE</Button>
                        : <Button variant="primary" size="sm" icon="check">Confirmar</Button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RELATÓRIOS
// ============================================================================
function ScreenRelatorios() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="relatorios" />
      <div className="app-main">
        <Topbar crumbs={['Relatórios', 'Pagamento de profissional']} />
        <div className="page">
          <PageHeader
            eyebrow="Relatórios"
            title="Pagamento de profissional"
            sub="Consolidação por período e profissional. Exporta em PDF, XLSX e CSV."
            actions={
              <>
                <Button variant="secondary" icon="print">Imprimir</Button>
                <Button variant="secondary" icon="download">PDF</Button>
                <Button variant="primary" icon="download">XLSX</Button>
              </>
            }
          />

          {/* Filters card */}
          <PatternBackground opacity={0.03} density="dense" style={{
            background: 'var(--bg-paper)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 24,
          }}>
            <Eyebrow>Filtros do relatório</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 16, alignItems: 'end', marginTop: 16 }}>
              <Field label="Profissional">
                <select className="select" defaultValue="claudia">
                  <option value="claudia">Claudia Carlesso · CREFITO 84.221-F</option>
                  <option>Camila Fornazero · CREFITO 91.408-F</option>
                  <option>Renata Oliveira · SPC-2218</option>
                </select>
              </Field>
              <Field label="Início"><input className="input" defaultValue="01/04/2026" /></Field>
              <Field label="Fim"><input className="input" defaultValue="30/04/2026" /></Field>
              <Button variant="primary" icon="refresh">Atualizar</Button>
            </div>
          </PatternBackground>

          {/* Result heading */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
            <div>
              <Eyebrow>Resultado · 01 abr — 30 abr · 142 aulas</Eyebrow>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1, margin: '8px 0 0' }}>
                Claudia Carlesso
              </h2>
              <p style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                CREFITO 84.221-F · Fisioterapeuta e responsável técnica
              </p>
            </div>
            <BracketFrame>
              R$ 6.840,00 a pagar · base 142 aulas
            </BracketFrame>
          </div>

          {/* Two-up summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Aulas realizadas" value="142" sub="duetos + individuais" />
            <StatCard label="Valor por aula" value="R$ 48,00" sub="média ponderada" />
            <StatCard label="Bonificação" value="R$ 24,00" sub="meta atingida" />
            <StatCard label="Total" value="R$ 6,84k" accent />
          </div>

          {/* Detail table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card__header">
              <div>
                <Eyebrow>Detalhamento por aula</Eyebrow>
                <h3 className="t-h3" style={{ marginTop: 4 }}>142 registros</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                <Icon name="info" size={14} />Apenas aulas com presença confirmada são contabilizadas.
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Data</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Plano</th>
                  <th>Modalidade</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { d: '01/04', h: '07:00', p: 'Ana Beatriz Moretti', pl: 'Mensal 3x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '01/04', h: '07:00', p: 'João Pedro Rocha', pl: 'Mensal 3x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '01/04', h: '08:00', p: 'Carolina Vasques', pl: 'Anual 3x', m: 'Vip class', v: 'R$ 72,00' },
                  { d: '02/04', h: '07:00', p: 'Eliana Souza', pl: 'Mensal 2x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '02/04', h: '08:00', p: 'Henrique Otávio', pl: 'Anual 2x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '03/04', h: '07:00', p: 'Bruno Henrique', pl: 'Trimestral 2x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '03/04', h: '09:00', p: 'Fernando Ribeiro', pl: 'Trimestral 3x', m: 'Dueto', v: 'R$ 48,00' },
                  { d: '04/04', h: '07:00', p: 'Gabriela Pinheiro', pl: 'Mensal 2x', m: 'Vip class', v: 'R$ 72,00' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td><span style={{ fontFamily: 'var(--font-aux)', fontStyle: 'italic', fontSize: 14 }}>{r.d}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{r.h}</td>
                    <td style={{ fontWeight: 500 }}>{r.p}</td>
                    <td><span style={{ fontSize: 12 }}>{r.pl}</span></td>
                    <td><Badge>{r.m}</Badge></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span>Mostrando <strong style={{ color: 'var(--text-primary)' }}>1–8</strong> de <strong style={{ color: 'var(--text-primary)' }}>142</strong></span>
              <Button variant="ghost" size="sm" iconRight="arrow-right">Ver todos</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY / ERROR / LOADING
// ============================================================================
function ScreenStates() {
  return (
    <div className="app-shell">
      <Sidebar activeKey="pacientes" />
      <div className="app-main">
        <Topbar crumbs={['Estados']} />
        <div className="page">
          <PageHeader eyebrow="Design system" title="Estados de tela" sub="Vazio, carregando, erro" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <div className="card">
              <div className="card__header"><Eyebrow>Vazio</Eyebrow></div>
              <EmptyState
                title="Nenhum paciente ainda"
                desc="Cadastre o primeiro paciente para começar a registrar planos, pagamentos e aulas."
                action={<Button variant="primary" icon="plus">Cadastrar paciente</Button>}
              />
            </div>
            <div className="card">
              <div className="card__header"><Eyebrow>Carregando</Eyebrow></div>
              <table className="table">
                <thead><tr><th>#</th><th>Paciente</th><th>Contato</th><th>Plano</th><th>Status</th><th></th></tr></thead>
                <tbody><SkelRow count={5} /></tbody>
              </table>
            </div>
            <div className="card">
              <div className="card__header"><Eyebrow>Erro</Eyebrow></div>
              <div className="empty-state">
                <div style={{ width: 56, height: 56, display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--c-danger-bg)', color: 'var(--c-danger)' }}>
                  <Icon name="alert-circle" size={28} />
                </div>
                <h3 className="empty-state__title">Não foi possível carregar</h3>
                <p className="empty-state__desc">A API não respondeu a tempo. Verifique a conexão ou tente novamente em alguns instantes.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost">Detalhes</Button>
                  <Button variant="primary" icon="refresh">Tentar de novo</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE — paciente list (responsive demo)
// ============================================================================
function ScreenMobile() {
  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100%', padding: 0, fontSize: 14 }}>
      <div style={{
        background: 'var(--bg-elev)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button className="btn btn--ghost btn--icon btn--sm"><Icon name="menu" /></button>
        <SymbolFancy size={26} color="var(--c-horizonte)" />
        <Wordmark size={14} color="var(--c-horizonte)" />
        <button className="btn btn--ghost btn--icon btn--sm" style={{ marginLeft: 'auto' }}><Icon name="search" /></button>
        <button className="btn btn--ghost btn--icon btn--sm"><Icon name="bell" /></button>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Eyebrow>Pacientes · 247</Eyebrow>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: '4px 0 0', lineHeight: 1 }}>
            Pacientes
          </h1>
        </div>
        <div className="input-wrap">
          <span className="input-wrap__icon"><Icon name="search" size={16} /></span>
          <input className="input input--with-icon" placeholder="Buscar paciente…" />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Badge variant="info" dot>Ativos · 247</Badge>
          <Badge dot>Inativos · 38</Badge>
          <Badge>Mensal</Badge>
          <Badge>Anual</Badge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_PACIENTES.slice(0, 6).map(p => (
            <div key={p.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar name={p.nome} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.plano}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p.ativo
                    ? <Badge variant="success" dot>Ativo</Badge>
                    : <Badge dot>Inativo</Badge>
                  }
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-aux)', fontStyle: 'italic' }}>
                    Próx · {p.proxima === '—' ? '—' : new Date(p.proxima).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom tab nav */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--bg-elev)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '6px 0',
      }}>
        {[
          { n: 'home', l: 'Início' },
          { n: 'users', l: 'Pacientes', a: true },
          { n: 'calendar', l: 'Aulas' },
          { n: 'credit-card', l: 'Pgtos.' },
          { n: 'file-text', l: 'Mais' },
        ].map((t, i) => (
          <button key={i} style={{
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 0', color: t.a ? 'var(--c-horizonte)' : 'var(--text-muted)',
            fontSize: 10, fontWeight: 500,
          }}>
            <Icon name={t.n} size={20} />{t.l}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export
Object.assign(window, {
  ScreenLogin, ScreenDashboard, ScreenPacientesList, ScreenPacienteDetail,
  ScreenPacienteForm, ScreenProfissionais, ScreenAulas, ScreenPagamentos,
  ScreenRelatorios, ScreenStates, ScreenMobile, StatCard,
});
