// Common components — Carlesso Admin
// Symbol, icons, brand pieces, layout primitives.

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// === SYMBOL — recreated tetraknot (4 entrelaced circles) ===
// 4 circles in a diamond pattern, each with a small tail stroke (the "curl" on each lobe).
function BrandSymbol({ size = 32, color = 'currentColor', strokeWidth = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <g stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
        {/* Top */}
        <circle cx="50" cy="28" r="22" />
        {/* Right */}
        <circle cx="72" cy="50" r="22" />
        {/* Bottom */}
        <circle cx="50" cy="72" r="22" />
        {/* Left */}
        <circle cx="28" cy="50" r="22" />
      </g>
    </svg>
  );
}

// More refined symbol matching the original — circles with slight offset + small inner "tails"
function SymbolFancy({ size = 64, color = 'var(--c-horizonte)', strokeWidth = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <g stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
        <circle cx="60" cy="32" r="26" />
        <circle cx="88" cy="60" r="26" />
        <circle cx="60" cy="88" r="26" />
        <circle cx="32" cy="60" r="26" />
      </g>
    </svg>
  );
}

// CARLESSO wordmark
function Wordmark({ size = 24, color = 'currentColor', tracking = '0.05em' }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 400,
        letterSpacing: tracking,
        color,
        lineHeight: 1,
        textTransform: 'uppercase',
      }}
    >
      CARLESSO
    </span>
  );
}

// Lockup: symbol + CARLESSO + tagline
function Lockup({ size = 48, tagline = 'Pilates e Fisioterapia', layout = 'horizontal', color = 'var(--c-horizonte)' }) {
  if (layout === 'vertical') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color }}>
        <SymbolFancy size={size} color={color} />
        <Wordmark size={size * 0.42} color={color} />
        {tagline && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: size * 0.13,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color,
            opacity: 0.8,
          }}>{tagline}</div>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color }}>
      <SymbolFancy size={size} color={color} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Wordmark size={size * 0.42} color={color} />
        {tagline && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: Math.max(8, size * 0.14),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color,
            opacity: 0.7,
          }}>{tagline}</div>
        )}
      </div>
    </div>
  );
}

// === ICONS — line, 1.5px, 18px viewBox 24 ===
const I = (props) => ({
  ...props,
  // helper
});
function Icon({ name, size = 18, color = 'currentColor' }) {
  const sw = 1.5;
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></>,
    users: <><circle cx="9" cy="9" r="3.5" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 11.5a3.5 3.5 0 0 0 0-5" /><path d="M21 20c0-2.5-1.8-4.3-4-4.8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    'user-md': <><circle cx="12" cy="7" r="3.5" /><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M9 17v3" /><path d="M9 17h2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    'credit-card': <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    chart: <><path d="M4 20V8M10 20v-8M16 20V4M22 20H2" /></>,
    'file-text': <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8M8 17h6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
    check: <><path d="M5 13l4 4L19 7" /></>,
    x: <><path d="M6 6l12 12M6 18L18 6" /></>,
    edit: <><path d="M16 3l5 5-12 12H4v-5z" /><path d="M14 5l5 5" /></>,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-3.2 4.4M6.6 6.6A18 18 0 0 0 2 12s3.5 8 10 8c1.7 0 3.3-.4 4.7-1M14.1 14.1A3 3 0 0 1 9.9 9.9M2 2l20 20" /></>,
    chevron: <><path d="M9 6l6 6-6 6" /></>,
    'chevron-down': <><path d="M6 9l6 6 6-6" /></>,
    'chevron-up': <><path d="M6 15l6-6 6 6" /></>,
    'chevron-left': <><path d="M15 6l-6 6 6 6" /></>,
    'arrow-right': <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    'arrow-up-right': <><path d="M7 17L17 7M9 7h8v8" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    upload: <><path d="M12 21V9M7 14l5-5 5 5M5 21h14" stroke={color} /></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4" /></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    'arrow-left': <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
    activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></>,
    'alert-circle': <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
    phone: <><path d="M22 16.9V20a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3.1a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 17z" /></>,
    mail: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 7l10 7 10-7" /></>,
    'map-pin': <><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    'more-h': <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>,
    leaf: <><path d="M11 20A7 7 0 0 1 4 13c0-3.6 2.6-7 6-9 3.4 2 6 5.4 6 9a7 7 0 0 1-5 6.7" /><path d="M11 20v-9" /></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
    print: <><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    star: <><path d="M12 2l3 7 7 .8-5 5 1.5 7L12 18l-6.5 3.8L7 14.8l-5-5L9 9z" /></>,
    'pie-chart': <><path d="M21 15a9 9 0 1 1-9-9v9z" /><path d="M21 15V6a9 9 0 0 0-6-3" /></>,
    'trending-up': <><path d="M22 7L13 16l-4-4L2 19" /><path d="M16 7h6v6" /></>,
    'trending-down': <><path d="M22 17L13 8l-4 4L2 5" /><path d="M16 17h6v-6" /></>,
  };
  return <svg {...common}>{paths[name] || paths.x}</svg>;
}

// === Decorative bracket frame [ ] for citações ===
function BracketFrame({ children, color = 'var(--c-horizonte)' }) {
  return (
    <div style={{
      position: 'relative',
      padding: '20px 48px',
      fontFamily: 'var(--font-aux)',
      fontStyle: 'italic',
      fontSize: 18,
      lineHeight: 1.35,
    }}>
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        borderLeft: `1.5px solid ${color}`, borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}`,
        width: 14,
      }} />
      <span style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        borderRight: `1.5px solid ${color}`, borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}`,
        width: 14,
      }} />
      {children}
    </div>
  );
}

// === Padronagem (background pattern of the symbol) ===
function PatternBackground({ opacity = 0.05, density = 'normal', children, style = {} }) {
  const size = density === 'sparse' ? 160 : density === 'dense' ? 80 : 120;
  // Inline SVG data URL for the four-circle symbol
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><g stroke="%23374f6c" stroke-width="2" fill="none" stroke-linecap="round" opacity="${opacity}"><circle cx="60" cy="32" r="26"/><circle cx="88" cy="60" r="26"/><circle cx="60" cy="88" r="26"/><circle cx="32" cy="60" r="26"/></g></svg>`;
  const url = `url("data:image/svg+xml;utf8,${svg}")`;
  return (
    <div style={{
      backgroundImage: url,
      backgroundSize: `${size}px ${size}px`,
      backgroundRepeat: 'repeat',
      ...style,
    }}>
      {children}
    </div>
  );
}

// === Section eyebrow (like "→ HIERARQUIA OFICIAL" in the manual) ===
function Eyebrow({ children, arrow = true, color }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: color || 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {arrow && <span style={{ opacity: 0.6 }}>→</span>}
      {children}
    </div>
  );
}

// === Avatar with initials ===
function Avatar({ name = '', size = 36, color = 'var(--c-azul-soft)', textColor = 'var(--c-horizonte)' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '999px',
      background: color, color: textColor,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.42, fontWeight: 400,
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// === Status badge w/ semantic colors ===
function Badge({ children, variant = 'default', dot = false }) {
  return (
    <span className={`badge${variant !== 'default' ? ` badge--${variant}` : ''}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

// === Button ===
function Button({ children, variant = 'secondary', size, icon, iconRight, block, onClick, type = 'button', disabled, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant}${size ? ` btn--${size}` : ''}${block ? ' btn--block' : ''}${className ? ' ' + className : ''}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

// === Page header ===
function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="page__header">
      <div className="page__title-block">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="page__title">{title}</h1>
        {sub && <p className="page__sub">{sub}</p>}
      </div>
      {actions && <div className="page__actions">{actions}</div>}
    </div>
  );
}

// === Empty state ===
function EmptyState({ title, desc, action, iconElement }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        {iconElement || <SymbolFancy size={56} color="var(--c-azul-3)" />}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {desc && <p className="empty-state__desc">{desc}</p>}
      {action}
    </div>
  );
}

// === Sidebar nav ===
function Sidebar({ activeKey, collapsed, onToggle, onNav, brandTagline = 'Centro de Contrologia e Movimento' }) {
  const items = [
    { group: 'Operação', items: [
      { key: 'dashboard', label: 'Início', icon: 'home' },
      { key: 'pacientes', label: 'Pacientes', icon: 'users', count: 247 },
      { key: 'profissionais', label: 'Profissionais', icon: 'user-md', count: 8 },
      { key: 'aulas', label: 'Aulas', icon: 'calendar' },
      { key: 'pagamentos', label: 'Pagamentos', icon: 'credit-card' },
    ]},
    { group: 'Análise', items: [
      { key: 'relatorios', label: 'Relatórios', icon: 'file-text' },
    ]},
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <SymbolFancy size={collapsed ? 28 : 32} color="var(--c-horizonte)" />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <Wordmark size={15} tracking="0.08em" color="var(--c-horizonte)" />
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Unidade Casa Azul
            </div>
          </div>
        )}
      </div>
      <nav className="sidebar__nav">
        {items.map((group, gi) => (
          <div key={gi}>
            {!collapsed && <div className="sidebar__group-label">{group.group}</div>}
            {group.items.map(it => (
              <a
                key={it.key}
                className={`nav-item${activeKey === it.key ? ' nav-item--active' : ''}`}
                onClick={(e) => { e.preventDefault(); onNav && onNav(it.key); }}
              >
                <Icon name={it.icon} size={18} />
                {!collapsed && <span>{it.label}</span>}
                {!collapsed && it.count != null && <span className="nav-item__count">{it.count}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar__footer">
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
            <Avatar name="Claudia Carlesso" size={32} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Claudia Carlesso</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Administradora</div>
            </div>
            <button className="btn btn--ghost btn--icon btn--sm" style={{ marginLeft: 'auto' }} aria-label="Sair">
              <Icon name="logout" size={14} />
            </button>
          </div>
        ) : (
          <Avatar name="Claudia Carlesso" size={32} />
        )}
      </div>
    </aside>
  );
}

// === Topbar ===
function Topbar({ crumbs = [], rightSlot, onMenuToggle }) {
  return (
    <header className="topbar">
      {onMenuToggle && (
        <button className="btn btn--ghost btn--icon btn--sm" onClick={onMenuToggle} aria-label="Menu">
          <Icon name="menu" />
        </button>
      )}
      <div className="topbar__crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="topbar__sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightSlot}
        <button className="btn btn--ghost btn--icon" aria-label="Notificações">
          <Icon name="bell" />
        </button>
      </div>
    </header>
  );
}

// === Tab nav ===
function Tabs({ items, activeKey, onChange }) {
  return (
    <div className="tabs">
      {items.map(it => (
        <button
          key={it.key}
          className={`tab${activeKey === it.key ? ' tab--active' : ''}`}
          onClick={() => onChange && onChange(it.key)}
        >
          {it.label}
          {it.count != null && (
            <span style={{
              marginLeft: 6,
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 999,
              background: activeKey === it.key ? 'var(--c-horizonte)' : 'var(--border-subtle)',
              color: activeKey === it.key ? 'var(--c-cloud-dancer)' : 'var(--text-secondary)',
              letterSpacing: 0,
              textTransform: 'none',
              fontWeight: 500,
            }}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// === Field ===
function Field({ label, hint, error, required, children }) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}{required && <span style={{ color: 'var(--c-danger)', marginLeft: 4 }}>*</span>}</label>}
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

// === Skeleton row ===
function SkelRow({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      <td><div className="skel" style={{ height: 14, width: 24, display: 'inline-block', verticalAlign: 'middle' }} /></td>
      <td><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="skel" style={{ width: 32, height: 32, borderRadius: 999 }} />
        <div className="skel" style={{ height: 14, width: 160 }} />
      </div></td>
      <td><div className="skel" style={{ height: 12, width: 120 }} /></td>
      <td><div className="skel" style={{ height: 12, width: 90 }} /></td>
      <td><div className="skel" style={{ height: 18, width: 60, borderRadius: 999 }} /></td>
      <td><div className="skel" style={{ height: 14, width: 24, marginLeft: 'auto' }} /></td>
    </tr>
  ));
}

// === Pagination ===
function Pagination({ page, totalPages, onChange, totalItems, pageSize, onSizeChange }) {
  const window = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - window + 1));
  const pages = Array.from({ length: Math.min(window, totalPages) }, (_, i) => start + i);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return (
    <div className="pagination">
      <div>
        Mostrando <strong style={{ color: 'var(--text-primary)' }}>{from}–{to}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong>
      </div>
      <div className="pagination__pages">
        <button className="page-btn" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}><Icon name="chevron-left" size={14} /></button>
        {pages[0] > 1 && <><button className="page-btn" onClick={() => onChange(1)}>1</button>{pages[0] > 2 && <span style={{ padding: '0 4px' }}>…</span>}</>}
        {pages.map(p => (
          <button key={p} className={`page-btn${p === page ? ' page-btn--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
        {pages[pages.length-1] < totalPages && <>{pages[pages.length-1] < totalPages - 1 && <span style={{ padding: '0 4px' }}>…</span>}<button className="page-btn" onClick={() => onChange(totalPages)}>{totalPages}</button></>}
        <button className="page-btn" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}><Icon name="chevron" size={14} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Por página</span>
        <select className="select" style={{ width: 70, height: 30, padding: '0 24px 0 10px', fontSize: 12 }} value={pageSize} onChange={e => onSizeChange && onSizeChange(Number(e.target.value))}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

// Export
Object.assign(window, {
  BrandSymbol, SymbolFancy, Wordmark, Lockup, Icon,
  BracketFrame, PatternBackground, Eyebrow,
  Avatar, Badge, Button, PageHeader, EmptyState,
  Sidebar, Topbar, Tabs, Field, SkelRow, Pagination,
});
