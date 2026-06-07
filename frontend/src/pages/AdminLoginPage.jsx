/**
 * AdminLoginPage — reCAPTCHA v2 + logo centrado + texto actualizado
 * Paleta institucional Acapulco
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'https://tusitio.com';
// Reemplaza con tu Site Key real de Google reCAPTCHA v2
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // clave de prueba

export default function AdminLoginPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [captchaOk, setCaptchaOk] = useState(false);
  const captchaRef = useRef(null);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Load reCAPTCHA script
  useEffect(() => {
    if (window.grecaptcha) { renderCaptcha(); return; }
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    window.onRecaptchaLoad = () => renderCaptcha();
    document.head.appendChild(script);
    return () => { delete window.onRecaptchaLoad; };
  }, []);

  const renderCaptcha = () => {
    if (!captchaRef.current || captchaRef.current.dataset.rendered) return;
    captchaRef.current.dataset.rendered = 'true';
    window.grecaptcha.render(captchaRef.current, {
      sitekey: RECAPTCHA_SITE_KEY,
      theme: 'dark',
      callback: () => setCaptchaOk(true),
      'expired-callback': () => setCaptchaOk(false),
    });
  };

  const loginWithGoogle = () => {
    if (!captchaOk) return;
    window.location.href =`${API_BASE}/accounts/google/login/?process=login`;
  };

  const loginWithMicrosoft = () => {
    if (!captchaOk) return;
    window.location.href =`${API_BASE}/accounts/microsoft/login/?process=login`;
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <div style={styles.decorTL} />
      <div style={styles.decorBR} />

      <div style={styles.card} className="login-card">

        {/* Logo centrado */}
        <div style={styles.logoWrap}>
          <img src="/logo-acapulco.png" alt="Acapulco 2024-2027" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Portal Administrativo</h1>
        <p style={styles.subtitle}>
          Accede con un correo electronico oficial para gestionar cursos y participantes.
        </p>

        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>Iniciar sesion</span>
          <div style={styles.dividerLine} />
        </div>

        <button
          style={{ ...styles.oauthBtn, ...(!captchaOk ? styles.oauthDisabled : {}) }}
          onClick={loginWithGoogle}
          disabled={!captchaOk}
          className="oauth-btn"
        >
          <GoogleIcon />
          <span>Continuar con Google</span>
        </button>

        <button
          style={{ ...styles.oauthBtn, ...styles.msBtn, ...(!captchaOk ? styles.oauthDisabled : {}) }}
          onClick={loginWithMicrosoft}
          disabled={!captchaOk}
          className="oauth-btn"
        >
          <MicrosoftIcon />
          <span>Continuar con Microsoft</span>
        </button>

        {/* reCAPTCHA */}
        <div style={styles.captchaWrap}>
          <div ref={captchaRef} />
          {!captchaOk && (
            <p style={styles.captchaHint}>
              Completa la verificacion para continuar
            </p>
          )}
        </div>

        <p style={styles.note}>
          No almacenamos contrasenas. Tu identidad es verificada por Google o Microsoft.
        </p>
      </div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  .login-card { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(24px); }
    to   { opacity:1; transform: translateY(0); }
  }
  .oauth-btn:not(:disabled):hover {
    background: rgba(184,149,42,0.1) !important;
    border-color: rgba(184,149,42,0.35) !important;
    transform: translateY(-1px);
  }
  .oauth-btn { transition: all 0.2s !important; }
`;

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00"/>
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(160deg, #0f0a08 0%, #1a0e0b 50%, #120808 100%)',
    fontFamily: '"DM Sans", system-ui, sans-serif', padding: 20,
    position: 'relative', overflow: 'hidden',
  },
  decorTL: {
    position: 'fixed', top: -150, right: -150, width: 450, height: 450, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,26,47,0.13) 0%, transparent 65%)', pointerEvents: 'none',
  },
  decorBR: {
    position: 'fixed', bottom: -100, left: -100, width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,149,42,0.09) 0%, transparent 65%)', pointerEvents: 'none',
  },
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,149,42,0.15)',
    borderRadius: 20, padding: '44px 40px', width: '100%', maxWidth: 420,
    backdropFilter: 'blur(20px)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 2,
  },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 28 },
  logo: { height: 56, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(184,149,42,0.2))' },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif', fontSize: 24, fontWeight: 700,
    color: '#fff', margin: '0 0 10px', lineHeight: 1.2, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.65, margin: '0 0 24px', textAlign: 'center',
  },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, background: 'rgba(184,149,42,0.15)' },
  dividerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase', flexShrink: 0 },
  oauthBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 18px', borderRadius: 11,
    border: '1px solid rgba(184,149,42,0.18)', cursor: 'pointer',
    fontSize: 14, fontWeight: 500, marginBottom: 10,
    background: 'rgba(255,255,255,0.04)', color: '#fff',
  },
  oauthDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  msBtn: { marginBottom: 0 },
  captchaWrap: {
    margin: '20px 0 0', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8,
  },
  captchaHint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, textAlign: 'center' },
  note: { fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 },
};
