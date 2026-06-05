/**
 * DashboardPage — Paleta institucional Acapulco
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { coursesAPI } from '../utils/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    coursesAPI.list().then(({ data }) => {
      const list = data.results || data;
      setActiveCourse(list.find(c => c.activo) || null);
    }).catch(() => {});
  }, []);

  const downloadQR = () => {
    if (!user?.qr_image_base64) return;
    const link = document.createElement('a');
    link.href = user.qr_image_base64;
    link.download = `qr-inscripcion-${user.qr_token?.slice(0, 8)}.png`;
    link.click();
  };

  return (
    <DashboardLayout title={`Hola, ${user?.display_name}`}>
      <div style={styles.center}>
        <div style={styles.card}>

          <h2 style={styles.cardTitle}>Codigo QR de inscripcion</h2>
          <p style={styles.cardDesc}>
            Los participantes escanean este codigo para acceder al formulario activo.
          </p>

          {activeCourse ? (
            <div style={styles.activeBadge}>
              Plantilla activa: <strong>{activeCourse.titulo}</strong>
            </div>
          ) : (
            <div style={styles.warnBadge}>
              Sin plantilla activa — activa una desde "Cursos"
            </div>
          )}

          <div style={styles.qrWrap}>
            {user?.qr_image_base64 ? (
              <img src={user.qr_image_base64} alt="QR de inscripcion" style={styles.qrImg} />
            ) : (
              <div style={styles.qrPlaceholder}>Cargando QR...</div>
            )}
          </div>

          <button style={styles.downloadBtn} onClick={downloadQR}>
            Descargar PNG
          </button>

          {user?.qr_url && (
            <div style={styles.qrUrl}>{user.qr_url}</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

const styles = {
  center: { display: 'flex', justifyContent: 'center' },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(184,149,42,0.15)',
    borderRadius: 20, padding: 40,
    textAlign: 'center', maxWidth: 420, width: '100%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
  },
  cardTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 10px',
  },
  cardDesc: {
    fontSize: 14, color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.6, margin: '0 0 24px',
  },
  activeBadge: {
    background: 'rgba(184,149,42,0.1)',
    border: '1px solid rgba(184,149,42,0.25)',
    borderRadius: 8, padding: '10px 16px', marginBottom: 24,
    fontSize: 13, color: '#D4A832',
  },
  warnBadge: {
    background: 'rgba(139,26,47,0.1)',
    border: '1px solid rgba(139,26,47,0.25)',
    borderRadius: 8, padding: '10px 16px', marginBottom: 24,
    fontSize: 13, color: '#e07080',
  },
  qrWrap: {
    background: '#fff', borderRadius: 14, padding: 14,
    display: 'inline-block', marginBottom: 24,
    boxShadow: '0 4px 20px rgba(184,149,42,0.15)',
  },
  qrImg: { display: 'block', width: 200, height: 200 },
  qrPlaceholder: {
    width: 200, height: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#aaa', fontSize: 14,
  },
  downloadBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #B8952A, #D4A832)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginBottom: 16,
    boxShadow: '0 4px 16px rgba(184,149,42,0.3)',
  },
  qrUrl: {
    fontSize: 11, color: 'rgba(255,255,255,0.25)',
    wordBreak: 'break-all', marginTop: 4,
  },
};
