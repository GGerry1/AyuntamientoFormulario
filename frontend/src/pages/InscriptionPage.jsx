/**
 * InscriptionPage - Public, accessed via QR code
 * Route: /inscripcion/:token
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '../utils/api';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';
import {
  InstitutionalFooter,
  InstitutionalHeader,
  institutionalCss,
} from '../components/public/InstitutionalLayout';

export default function InscriptionPage() {
  const { token } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    publicAPI.getForm(token)
      .then(({ data }) => setCourse(data))
      .catch(() => setError('Este curso no existe o ya no esta disponible.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (fieldId, value) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const validate = () => {
    const errors = {};
    course.fields.forEach((f) => {
      const val = values[f.id];
      const isEmpty = (
        val === undefined ||
        val === '' ||
        (Array.isArray(val) && val.length === 0)
      );
      if (f.obligatorio && isEmpty) {
        errors[f.id] = 'Este campo es obligatorio.';
        return;
      }
      const exactDigits = f.validacion?.exact_digits;
      if (!isEmpty && exactDigits && String(val).length !== exactDigits) {
        errors[f.id] = `Este campo debe contener exactamente ${exactDigits} digitos.`;
      }
    });
    return errors;
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('Debes aceptar los terminos y condiciones para continuar.');
      return;
    }
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const answers = Object.entries(values).map(([field_id, value]) => ({
        field_id, value
      }));
      await publicAPI.submitForm(token, { answers });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(' ') ||
        'Error al enviar el formulario.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  if (success) {
    return (
      <Page>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>v</div>
          <h2 style={styles.successTitle}>¡Inscripcion exitosa!</h2>
          <p style={styles.successText}>
            Tu inscripcion al curso <strong>{course?.titulo}</strong> ha sido registrada correctamente.
            Recibirás informacion por correo electronico.
          </p>
        </div>
      </Page>
    );
  }

  if (error && !course) {
    return (
      <Page>
        <div style={styles.errorCard}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <p style={styles.errorText}>{error}</p>
        </div>
      </Page>
    );
  }

  return (
    <>
      <Page>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.cardHeader}>
            <div style={styles.badge}>Inscripcion</div>
            <h1 style={styles.courseTitle}>{course?.titulo}</h1>
            {course?.descripcion && (
              <p style={styles.courseDesc}>{course.descripcion}</p>
            )}
            {course?.instructores && (
              <p style={styles.instructores}>
                <span style={styles.instrLabel}>Instructores:</span> {course.instructores}
              </p>
            )}
          </div>

          {/* Form */}
          <div style={styles.formSection}>
            <DynamicFormRenderer
              fields={course?.fields || []}
              values={values}
              onChange={handleChange}
              errors={fieldErrors}
            />

            {/* Terminos y condiciones */}
            <div style={styles.termsWrap}>
              <label style={styles.termsLabel}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  style={styles.termsCheck}
                />
                <span>
                  Acepto los{' '}
                  <button
                    type="button"
                    style={styles.termsLink}
                    onClick={() => setShowTerms(true)}
                  >
                    terminos y condiciones
                  </button>
                  {' '}de uso y el tratamiento de mis datos personales conforme a la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares.
                </span>
              </label>
            </div>

            {error && <p style={styles.submitError}>{error}</p>}

            <button
              style={{ ...styles.submitBtn, ...(submitting ? styles.submitDisabled : {}) }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Enviando…' : 'Enviar inscripcion'}
            </button>

            <p style={styles.privacy}>
              🔒 Tu informacion es confidencial y solo será utilizada para este curso.
            </p>
          </div>
        </div>
      </Page>

      {/* Modal terminos — FUERA de Page, dentro de InscriptionPage */}
      {showTerms && (
        <div style={styles.termsOverlay} onClick={() => setShowTerms(false)}>
          <div style={styles.termsModal} onClick={e => e.stopPropagation()}>
            <div style={styles.termsModalHeader}>
              <h3 style={styles.termsModalTitle}>Terminos y Condiciones</h3>
              <button style={styles.termsModalClose} onClick={() => setShowTerms(false)}>✕</button>
            </div>
            <div style={styles.termsModalBody}>
              <p><strong>H. Ayuntamiento de Acapulco de Juarez</strong><br />Direccion de Capacitacion y Desarrollo</p>
              <p><strong>1. Recopilacion de datos</strong><br />
              Los datos personales proporcionados en este formulario (nombre, correo electronico, telefono, numero de empleado, entre otros) seran utilizados exclusivamente para el registro, control y seguimiento de participantes en cursos de capacitacion impartidos por el H. Ayuntamiento de Acapulco de Juarez.</p>
              <p><strong>2. Uso de la informacion</strong><br />
              La informacion recopilada sera utilizada para: (a) gestionar tu inscripcion al curso, (b) enviarte tu constancia o diploma de participacion, (c) generar estadisticas internas de capacitacion. No se vendera ni compartira con terceros.</p>
              <p><strong>3. Derechos ARCO</strong><br />
              Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales. Para ejercer estos derechos puedes acudir a las oficinas de la Direccion de Capacitacion y Desarrollo ubicadas en Hornitos 7, Centro, 39300 Acapulco de Juarez, Gro., o comunicarte al 744 440 7031.</p>
              <p><strong>4. Seguridad</strong><br />
              El H. Ayuntamiento de Acapulco de Juarez implementa las medidas de seguridad necesarias para proteger tus datos personales contra perdida, mal uso o acceso no autorizado.</p>
              <p><strong>5. Consentimiento</strong><br />
              Al marcar la casilla de aceptacion, manifiestas tu consentimiento libre, especifico e informado para el tratamiento de tus datos personales conforme a lo establecido en estos terminos y en la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares.</p>
            </div>
            <div style={styles.termsModalFooter}>
              <button
                style={styles.termsAcceptBtn}
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
              >
                Aceptar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Page({ children }) {
  return (
    <div style={styles.page}>
      <InstitutionalHeader />
      <main style={styles.pageMain}>
        <div style={styles.pageInner}>{children}</div>
      </main>
      <InstitutionalFooter />
      <style>{`
        ${institutionalCss}
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, select:focus, textarea:focus {
          border-color: #B8952A !important;
          box-shadow: 0 0 0 3px rgba(184,149,42,0.15);
        }
        button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f7f8fc' }}>
      <div style={{ color: '#B8952A', fontSize: 16 }}>Cargando formulario…</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0f0a08 0%, #1a0e0b 50%, #120808 100%)',
    fontFamily: '"DM Sans", system-ui, sans-serif',
  },
  pageMain: {
    minHeight: 'calc(100vh - 93px)',
    padding: '56px 20px 72px',
    background: 'linear-gradient(160deg, #0f0a08 0%, #1a0e0b 50%, #120808 100%)',
  },
  pageInner: { maxWidth: 640, margin: '0 auto' },
  card: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 4px 24px rgba(184,149,42,0.1), 0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    background: 'linear-gradient(135deg, #150e0b 0%, #16213e 100%)',
    padding: '40px 40px 36px',
    color: '#fff',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(184,149,42,0.3)',
    color: '#D4A832',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  courseTitle: { fontSize: 28, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 },
  courseDesc: { fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', lineHeight: 1.6 },
  instructores: { fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 },
  instrLabel: { fontWeight: 600, color: 'rgba(255,255,255,0.8)' },
  formSection: { padding: '40px' },
  submitBtn: {
    width: '100%', marginTop: 32,
    padding: '16px',
    background: 'linear-gradient(135deg, #B8952A, #D4A832)',
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 16, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  submitDisabled: { opacity: 0.6, cursor: 'not-allowed', transform: 'none' },
  submitError: { color: '#e53e3e', fontSize: 14, marginTop: 16, textAlign: 'center' },
  termsWrap: { marginTop: 20, marginBottom: 4 },
  termsLabel: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: '#4a5568', lineHeight: 1.6 },
  termsCheck: { marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: '#B8952A', flexShrink: 0 },
  termsLink: { background: 'none', border: 'none', color: '#B8952A', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, textDecoration: 'underline' },
  termsOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  termsModal: { background: '#fff', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  termsModalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  termsModalTitle: { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: 0 },
  termsModalClose: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#718096', padding: 4 },
  termsModalBody: { padding: '20px 24px', overflowY: 'auto', fontSize: 13, color: '#4a5568', lineHeight: 1.7, flex: 1 },
  termsModalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' },
  termsAcceptBtn: { padding: '10px 24px', background: 'linear-gradient(135deg, #B8952A, #D4A832)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  privacy: { fontSize: 13, color: '#a0aec0', textAlign: 'center', marginTop: 16 },
  successCard: { textAlign: 'center', background: '#fff', borderRadius: 20, padding: '60px 40px' },
  successIcon: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 36, color: '#fff', margin: '0 auto 24px',
  },
  successTitle: { fontSize: 28, fontWeight: 700, color: '#150e0b', margin: '0 0 16px' },
  successText: { fontSize: 16, color: '#4a5568', lineHeight: 1.7 },
  errorCard: { textAlign: 'center', background: '#fff', borderRadius: 20, padding: '60px 40px' },
  errorText: { fontSize: 16, color: '#e53e3e' },
};
