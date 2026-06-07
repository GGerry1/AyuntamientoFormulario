/**
 * OAuthCallbackPage
 * After OAuth redirect, Django issues JWT -> we store it and go to dashboard
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function OAuthCallbackPage() {
  const [error, setError] = useState('');
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
        try {
            const access = params.get('access');
            const refresh = params.get('refresh');

            if (access && refresh) {
                // Tokens vienen en la URL desde Django
                api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                const { data: user } = await api.get('/accounts/me/');
                loginWithTokens(access, refresh, user);
                navigate('/dashboard', { replace: true });
            } else {
                // Fallback legacy
                const { data } = await api.get('/auth/oauth/callback/');
                loginWithTokens(data.access, data.refresh, data.user);
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            setError('No se pudo completar la autenticacion. Por favor intenta de nuevo.');
        }
    }
    handleCallback();
}, []);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.box}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ color: '#fff', marginTop: 16 }}>{error}</p>
          <a href="/admin" style={styles.link}>Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <div style={styles.spinner} />
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>
          Verificando identidad…
        </p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f0a08', fontFamily: 'sans-serif',
  },
  box: {
    textAlign: 'center',
  },
  spinner: {
    width: 52, height: 52,
    border: '3px solid rgba(184,149,42,0.25)',
    borderTopColor: '#B8952A',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  link: {
    display: 'inline-block', marginTop: 20,
    color: '#B8952A', textDecoration: 'none',
  },
};
