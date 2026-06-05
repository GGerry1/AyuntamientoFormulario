/**
 * ConfigPage — Paleta institucional Acapulco
 */
import { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../utils/api';

export default function ConfigPage() {
  const { user, refreshUser } = useAuth();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await authAPI.updateProfile({ nombre });
    await refreshUser();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout title="Configuracion">
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Perfil de administrador</h3>

        <Field label="Correo electronico">
          <div style={styles.readOnly}>{user?.email}</div>
        </Field>

        <Field label="Nombre completo">
          <input
            style={styles.input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
          />
        </Field>

        <Field label="Proveedor OAuth">
          <div style={styles.readOnly}>{user?.proveedor_oauth}</div>
        </Field>

        <Field label="Token QR">
          <div style={{ ...styles.readOnly, fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.5px' }}>
            {user?.qr_token}
          </div>
        </Field>

        <button style={styles.saveBtn} onClick={handleSave}>
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(184,149,42,0.15)',
    borderRadius: 16, padding: 32, maxWidth: 520,
  },
  sectionTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 18, fontWeight: 700,
    color: '#fff', margin: '0 0 28px',
  },
  label: {
    display: 'block', fontSize: 11,
    color: 'rgba(184,149,42,0.7)',
    marginBottom: 6, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  readOnly: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(184,149,42,0.1)',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)', fontSize: 14,
  },
  input: {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(184,149,42,0.2)',
    borderRadius: 8, color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  saveBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #B8952A, #D4A832)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
    boxShadow: '0 4px 16px rgba(184,149,42,0.25)',
  },
};
