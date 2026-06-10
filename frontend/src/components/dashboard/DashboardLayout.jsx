/**
 * DashboardLayout — Paleta institucional Acapulco
 * Dorado #B8952A | Guinda #8B1A2F | Fondo cálido oscuro
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV = [
  { to: '/dashboard',     icon: '⌂', label: 'Inicio'         },
  { to: '/plantillas',     icon: '◧', label: 'Plantillas'      },
  { to: '/cursos',         icon: '◑', label: 'Cursos'          },
  { to: '/cursos-archivados', icon: '◫', label: 'Cursos Archivados' },
  { to: '/estadisticas',  icon: '◉', label: 'Estadisticas'    },
  { to: '/configuracion', icon: '◈', label: 'Configuracion'   },
];

export default function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div style={styles.shell}>
      <style>{globalCSS}</style>

      {/* Sidebar */}
      <aside style={styles.sidebar}>

        {/* Logo */}
        <div style={styles.brandWrap}>
          <img src="/logo-acapulco.png" alt="Acapulco" style={styles.brandLogo} />
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={styles.sidebarBottom}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {(user?.nombre || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={styles.userName}>
                {user?.display_name || user?.email}
              </div>
              <div style={styles.userProvider}>{user?.proveedor_oauth}</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {title && <h1 style={styles.pageTitle}>{title}</h1>}
        <div>{children}</div>
      </main>
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #0f0a08; }
  a { text-decoration: none; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(184,149,42,0.2); border-radius: 3px; }

  @media (max-width: 768px) {
    .sidebar { width: 100% !important; position: relative !important; height: auto !important; flex-direction: row !important; padding: 12px 16px !important; }
    .main-content { margin-left: 0 !important; padding: 24px 16px !important; }
  }
`;

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    background: '#0f0a08',
    color: '#e8e0d0',
  },

  /* SIDEBAR */
  sidebar: {
    width: 240,
    background: 'rgba(15,10,8,0.95)',
    borderRight: '1px solid rgba(184,149,42,0.1)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 14px',
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    zIndex: 50,
  },
  brandWrap: {
    padding: '0 6px 28px',
    borderBottom: '1px solid rgba(184,149,42,0.1)',
    marginBottom: 20,
  },
  brandLogo: {
    height: 44,
    width: 'auto',
    filter: 'drop-shadow(0 2px 6px rgba(184,149,42,0.2))',
  },

  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '10px 12px',
    borderRadius: 10,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14, fontWeight: 500,
    transition: 'all 0.15s',
    border: '1px solid transparent',
  },
  navActive: {
    background: 'rgba(184,149,42,0.1)',
    color: '#D4A832',
    border: '1px solid rgba(184,149,42,0.2)',
  },
  navIcon: { fontSize: 17, width: 22, textAlign: 'center', flexShrink: 0 },

  sidebarBottom: {
    paddingTop: 20,
    borderTop: '1px solid rgba(184,149,42,0.1)',
  },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 12, padding: '0 4px',
  },
  userAvatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, #8B1A2F, #B8292A)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  userName: {
    fontSize: 13, fontWeight: 600, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: 148,
  },
  userProvider: {
    fontSize: 11, color: 'rgba(255,255,255,0.3)',
    marginTop: 2, textTransform: 'capitalize',
  },
  logoutBtn: {
    width: '100%', padding: '8px 12px',
    background: 'transparent',
    border: '1px solid rgba(184,149,42,0.15)',
    borderRadius: 8, color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer', fontSize: 13,
    transition: 'all 0.2s',
  },

  /* MAIN */
  main: {
    marginLeft: 240,
    flex: 1,
    padding: '40px 48px',
    minHeight: '100vh',
    background: '#0f0a08',
  },
  pageTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 30, fontWeight: 700,
    color: '#fff', margin: '0 0 32px',
    letterSpacing: '-0.5px',
  },
};
