/**
 * LandingPage — Paleta institucional Acapulco
 * v4: footer completo con direccion, telefono, emergencias
 */
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  InstitutionalHeader,
  institutionalCss,
} from '../components/public/InstitutionalLayout';

export default function LandingPage() {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) logout();
  }, [user, logout]);

  return (
    <div style={styles.page}>
      <style>{css}</style>

      {/* NAV */}
      <InstitutionalHeader />

      {/* HERO */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent} className="fade-up">
          <div style={styles.badge}>Plataforma institucional</div>
          <h1 style={styles.title}>
            Gestion de cursos<br />y certificados
          </h1>
          <a href="/admin" style={styles.cta}>Administrar cursos</a>

          <div style={styles.features}>
            {[
              { icon: '◈', title: 'Escanea el QR',        desc: 'El participante escanea el codigo QR unico del curso desde su celular.' },
              { icon: '◧', title: 'Llena el formulario',   desc: 'Completa el formulario de inscripcion con sus datos personales.' },
              { icon: '◉', title: 'Recibe su diploma',     desc: 'Al finalizar el curso recibe su constancia directamente en su correo.' },
            ].map((f) => (
              <div key={f.title} style={styles.featureCard} className="feature-card">
                <span style={styles.featureIcon}>{f.icon}</span>
                <div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.decorCircle1} />
        <div style={styles.decorCircle2} />
      </section>

      {/* FRASE INSTITUCIONAL */}
      <section style={styles.phraseSection}>
        <div style={styles.phraseDeco} />
        <div style={styles.phraseContent}>
          <div style={styles.phraseQuote}>"</div>
          <blockquote style={styles.phrase}>
            Servir con honestidad<br />y justicia
          </blockquote>
          <div style={styles.phraseAuthor}>
            H. Ayuntamiento de Acapulco de Juarez — 2024 · 2027
          </div>
          <div style={styles.phraseRule} />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerTop} className="footer-top">

          {/* Col 1: Logo + datos institucionales */}
          <div style={styles.footerCol}>
            <img src="/logo-acapulco.png" alt="Acapulco" style={styles.footerLogo} />
            <div style={styles.footerName}>H. Ayuntamiento de Acapulco de Juarez</div>
            <div style={styles.footerMeta}>Direccion de Capacitacion y Desarrollo</div>
            <div style={styles.footerMeta}>Guerrero, Mexico · 2024 – 2027</div>
            <div style={{ ...styles.footerMeta, marginTop: 8 }}>
              Direccion: Hornitos 7, Centro,<br />39300 Acapulco de Juarez, Gro.
            </div>
            <div style={styles.footerMeta}>Contacto: 744 440 7031</div>
          </div>

          {/* Col 2: Numeros de emergencia */}
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
          GSC Company {new Date().getFullYear()} — Sistema de Gestion de Cursos Institucional
        </div>
      </footer>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
  ${institutionalCss}
  * { box-sizing: border-box; }
  .fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .feature-card { transition: transform 0.22s ease, border-color 0.22s ease; }
  .feature-card:hover { transform: translateY(-4px); border-color: rgba(184,149,42,0.35) !important; }
  @media (max-width: 640px) {
    .footer-top { flex-direction: column !important; gap: 32px !important; }
  }
`;

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0f0a08 0%, #1a0e0b 50%, #120808 100%)',
    fontFamily: '"DM Sans", system-ui, sans-serif',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  nav: {
    display: 'flex', alignItems: 'center',
    padding: '20px 48px',
    borderBottom: '1px solid rgba(184,149,42,0.12)',
    position: 'sticky', top: 0, zIndex: 20,
    background: 'rgba(15,10,8,0.92)',
    backdropFilter: 'blur(12px)',
  },
  logoImg: { height: 52, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(184,149,42,0.25))' },
  heroSection: {
    position: 'relative', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 'calc(100vh - 93px)', padding: '60px 24px 80px', overflow: 'hidden',
  },
  heroContent: {
    position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column',
    alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: 600,
  },
  badge: {
    display: 'inline-block', background: 'rgba(184,149,42,0.12)', color: '#D4A832',
    border: '1px solid rgba(184,149,42,0.28)', padding: '6px 20px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, marginBottom: 28, letterSpacing: '1.5px', textTransform: 'uppercase',
  },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif', fontSize: 58, fontWeight: 800,
    lineHeight: 1.08, margin: '0 0 36px', letterSpacing: '-1px',
    background: 'linear-gradient(150deg, #ffffff 0%, #f0d080 55%, #B8952A 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  cta: {
    display: 'inline-block', padding: '16px 44px',
    background: 'linear-gradient(135deg, #B8952A, #D4A832)',
    borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15,
    textDecoration: 'none', boxShadow: '0 8px 32px rgba(184,149,42,0.35)',
    marginBottom: 56, letterSpacing: '0.3px',
  },
  features: { display: 'flex', flexDirection: 'column', gap: 12, width: '100%' },
  featureCard: {
    display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 22px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,149,42,0.12)',
    borderRadius: 14, textAlign: 'left', backdropFilter: 'blur(6px)',
  },
  featureIcon: { fontSize: 22, color: '#B8952A', flexShrink: 0, marginTop: 2 },
  featureTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 },
  featureDesc: { fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 },
  decorCircle1: {
    position: 'absolute', top: -160, right: -160, width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,26,47,0.14) 0%, transparent 65%)', pointerEvents: 'none',
  },
  decorCircle2: {
    position: 'absolute', bottom: -80, left: -80, width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,149,42,0.10) 0%, transparent 65%)', pointerEvents: 'none',
  },
  phraseSection: {
    padding: '110px 24px', background: '#0a0705',
    borderTop: '1px solid rgba(139,26,47,0.15)', borderBottom: '1px solid rgba(139,26,47,0.15)',
    position: 'relative', overflow: 'hidden', textAlign: 'center',
  },
  phraseDeco: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,26,47,0.07) 0%, transparent 70%)', pointerEvents: 'none',
  },
  phraseContent: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  phraseQuote: {
    fontFamily: '"Playfair Display", Georgia, serif', fontSize: 96, lineHeight: 0.6,
    color: '#B8952A', opacity: 0.35, marginBottom: 8, userSelect: 'none',
  },
  phrase: {
    fontFamily: '"Playfair Display", Georgia, serif', fontSize: 46, fontWeight: 700,
    lineHeight: 1.22, color: '#fff', margin: '0 0 22px', fontStyle: 'italic', letterSpacing: '-0.3px',
  },
  phraseAuthor: { fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 28 },
  phraseRule: { width: 56, height: 2, background: 'linear-gradient(90deg, transparent, #B8952A, transparent)', borderRadius: 1 },

  /* FOOTER */
  footer: { background: '#080604', padding: '52px 48px 28px', borderTop: '1px solid rgba(184,149,42,0.08)' },
  footerTop: {
    maxWidth: 960, margin: '0 auto', display: 'flex',
    justifyContent: 'space-between', gap: 48, marginBottom: 40, flexWrap: 'wrap',
  },
  footerCol: { display: 'flex', flexDirection: 'column', gap: 4 },
  footerLogo: {
    display: 'block', width: 220, height: 54,
    objectFit: 'contain', objectPosition: 'left center',
    opacity: 0.75, filter: 'drop-shadow(0 2px 6px rgba(184,149,42,0.15))',
    marginBottom: 10,
  },
  footerName: { fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  footerMeta: { fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8 },

  /* Emergencias */
  footerEmergTitle: {
    fontSize: 11, fontWeight: 700, color: 'rgba(184,149,42,0.7)',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12,
  },
  emergRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  emergNum: {
    fontSize: 16, fontWeight: 800, color: '#D4A832',
    minWidth: 40, fontFamily: 'monospace',
  },
  emergLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1 },

  footerDivider: { maxWidth: 960, margin: '0 auto 20px', height: 1, background: 'rgba(255,255,255,0.05)' },
  footerCopy: {
    maxWidth: 960, margin: '0 auto', fontSize: 11,
    color: 'rgba(255,255,255,0.18)', textAlign: 'center', letterSpacing: '0.5px',
  },
};
