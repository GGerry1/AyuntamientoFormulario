export function InstitutionalHeader() {
  return (
    <nav style={styles.nav}>
      <img
        src="/logo-acapulco.png"
        alt="Acapulco 2024-2027"
        style={styles.headerLogo}
      />
    </nav>
  );
}

export function InstitutionalFooter() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerTop} className="institutional-footer-top">
        <div style={styles.footerCol}>
          <div style={styles.footerLogoWrap}>
            <img src="/logo-acapulco.png" alt="Acapulco" style={styles.footerLogo} />
          </div>
          <div style={styles.footerName}>H. Ayuntamiento de Acapulco de Juarez</div>
          <div style={styles.footerMeta}>Direccion de Capacitacion y Desarrollo</div>
          <div style={styles.footerMeta}>Guerrero, Mexico · 2024 - 2027</div>
          <div style={{ ...styles.footerMeta, marginTop: 8 }}>
            Direccion: Hornitos 7, Centro,<br />39300 Acapulco de Juarez, Gro.
          </div>
          <div style={styles.footerMeta}>Contacto: 744 440 7031</div>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerEmergTitle}>Numeros de emergencia</div>
          {[
            { num: '911', label: 'Servicio de Emergencias' },
            { num: '089', label: 'Denuncia Anonima' },
            { num: '073', label: 'CAPAMA' },
            { num: '072', label: 'Proteccion Civil' },
            { num: '071', label: 'CFE' },
          ].map(({ num, label }) => (
            <div key={num} style={styles.emergRow}>
              <span style={styles.emergNum}>{num}</span>
              <span style={styles.emergLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.footerDivider} />
      <div style={styles.footerCopy}>
        GSC Company {new Date().getFullYear()} - Sistema de Gestion de Cursos Institucional
      </div>
    </footer>
  );
}

export const institutionalCss = `
  @media (max-width: 640px) {
    .institutional-footer-top {
      flex-direction: column !important;
      gap: 32px !important;
    }
  }
`;

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', minHeight: 93,
    padding: '20px 48px',
    borderBottom: '1px solid rgba(184,149,42,0.12)',
    position: 'sticky', top: 0, zIndex: 20,
    background: 'rgba(15,10,8,0.92)', backdropFilter: 'blur(12px)',
  },
  headerLogo: {
    display: 'block', width: 'min(220px, 62vw)', height: 52,
    objectFit: 'contain', objectPosition: 'left center',
    filter: 'drop-shadow(0 2px 8px rgba(184,149,42,0.25))',
  },
  footer: {
    background: '#080604', padding: '52px 48px 28px',
    borderTop: '1px solid rgba(184,149,42,0.08)',
  },
  footerTop: {
    maxWidth: 960, margin: '0 auto 40px', display: 'flex',
    justifyContent: 'space-between', gap: 48, flexWrap: 'wrap',
  },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 4 },
  footerLogoWrap: {
    width: 220, height: 54, marginBottom: 10,
    display: 'flex', alignItems: 'center',
  },
  footerLogo: {
    display: 'block', width: '100%', height: '100%',
    objectFit: 'contain', objectPosition: 'left center', opacity: 0.75,
    filter: 'drop-shadow(0 2px 6px rgba(184,149,42,0.15))',
  },
  footerName: {
    fontSize: 14, fontWeight: 700,
    color: 'rgba(255,255,255,0.8)', marginBottom: 2,
  },
  footerMeta: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8,
  },
  footerEmergTitle: {
    fontSize: 11, fontWeight: 700, color: 'rgba(184,149,42,0.7)',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12,
  },
  emergRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  emergNum: {
    fontSize: 16, fontWeight: 800, color: '#D4A832',
    minWidth: 40, fontFamily: 'monospace',
  },
  emergLabel: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1,
  },
  footerDivider: {
    maxWidth: 960, margin: '0 auto 20px', height: 1,
    background: 'rgba(255,255,255,0.05)',
  },
  footerCopy: {
    maxWidth: 960, margin: '0 auto', fontSize: 11,
    color: 'rgba(255,255,255,0.18)', textAlign: 'center',
    letterSpacing: '0.5px',
  },
};
