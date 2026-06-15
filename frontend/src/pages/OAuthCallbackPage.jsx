/**
 * OAuthCallbackPage
 * Django sets HttpOnly auth cookies before redirecting here.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../utils/api';

export default function OAuthCallbackPage() {
  const [error, setError] = useState('');
  const { setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        await authAPI.ensureCsrf();
        const { data: user } = await authAPI.me();
        setAuthenticatedUser(user);
        navigate('/dashboard', { replace: true });
      } catch {
        setError('No fue posible establecer la sesion. Intenta iniciar sesion nuevamente.');
      }
    }
    handleCallback();
  }, [navigate, setAuthenticatedUser]);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.box}>
          <p style={{ color: '#fff' }}>{error}</p>
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
          Verificando identidad...
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f0a08', fontFamily: 'sans-serif',
  },
  box: { textAlign: 'center' },
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
