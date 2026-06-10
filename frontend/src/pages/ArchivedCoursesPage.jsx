import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { coursesAPI } from '../utils/api';

export default function ArchivedCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    coursesAPI.archivedCourses()
      .then(({ data }) => {
        setCourses(data);
        setSelected(data[0]?.nombre || null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) {
      setRegistrations([]);
      return;
    }
    setLoadingDetail(true);
    coursesAPI.archivedRegistrations(selected)
      .then(({ data }) => setRegistrations(data))
      .finally(() => setLoadingDetail(false));
  }, [selected]);

  const handleDelete = async (nombre) => {
    const confirmed = window.confirm(
      `ADVERTENCIA: eliminar definitivamente "${nombre}" borrara todos sus inscritos, respuestas y estadisticas. Esta accion NO se puede deshacer.\n\n¿Deseas continuar?`
    );
    if (!confirmed) return;

    try {
      await coursesAPI.deleteArchivedCourse(nombre);
      const remaining = courses.filter(course => course.nombre !== nombre);
      setCourses(remaining);
      setSelected(remaining[0]?.nombre || null);
    } catch {
      window.alert('Error al eliminar el curso archivado.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Cursos Archivados">
        <p style={styles.muted}>Cargando...</p>
      </DashboardLayout>
    );
  }

  const current = courses.find(course => course.nombre === selected);

  return (
    <DashboardLayout title="Cursos Archivados">
      <style>{css}</style>
      <p style={styles.hint}>
        Los cursos archivados son historicos: pueden consultarse o eliminarse
        definitivamente, pero no restaurarse.
      </p>

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Historico</div>
          {courses.length === 0 ? (
            <p style={styles.muted}>No hay cursos archivados.</p>
          ) : courses.map(course => (
            <button
              key={course.nombre}
              style={{
                ...styles.courseButton,
                ...(selected === course.nombre ? styles.courseButtonActive : {}),
              }}
              onClick={() => setSelected(course.nombre)}
            >
              <span style={styles.courseName}>{course.nombre}</span>
              <span style={styles.count}>{course.total}</span>
            </button>
          ))}
        </aside>

        <section style={styles.panel}>
          {!current ? (
            <p style={styles.muted}>Selecciona un curso archivado.</p>
          ) : (
            <>
              <div style={styles.header}>
                <div>
                  <h2 style={styles.title}>{current.nombre}</h2>
                  <div style={styles.badges}>
                    <span style={styles.badgeGold}>{current.total} inscritos</span>
                    <span style={styles.badgeGreen}>{current.completados} completados</span>
                    <span style={styles.badgeRed}>{current.pendientes} pendientes</span>
                  </div>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.statsButton}
                    onClick={() => navigate(`/estadisticas/curso/${encodeURIComponent(current.nombre)}?archived=1`)}
                  >
                    Ver estadisticas
                  </button>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(current.nombre)}
                  >
                    Eliminar definitivamente
                  </button>
                </div>
              </div>

              {loadingDetail ? (
                <p style={styles.muted}>Cargando inscritos...</p>
              ) : registrations.length === 0 ? (
                <p style={styles.muted}>Sin inscritos.</p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Nombre', 'Correo', 'Telefono', 'No. Empleado', 'Estatus'].map(label => (
                          <th key={label} style={styles.th}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((registration, index) => (
                        <tr
                          key={registration.id}
                          style={{
                            ...styles.tr,
                            ...(index % 2 === 0 ? styles.trEven : {}),
                          }}
                          className="archived-row"
                        >
                          <td style={styles.td}>{registration.nombre || '-'}</td>
                          <td style={{ ...styles.td, ...styles.mono }}>{registration.correo}</td>
                          <td style={styles.td}>{registration.telefono || '-'}</td>
                          <td style={styles.td}>{registration.numero_empleado || '-'}</td>
                          <td style={styles.td}>
                            <span style={registration.completado ? styles.done : styles.pending}>
                              {registration.completado ? 'Completado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

const css = `
  .archived-row:hover { background: rgba(184,149,42,0.05) !important; }
`;

const styles = {
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '-18px 0 28px' },
  layout: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  sidebar: { width: 230, flexShrink: 0 },
  sidebarTitle: { color: 'rgba(184,149,42,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  courseButton: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 12px', marginBottom: 5, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', textAlign: 'left' },
  courseButtonActive: { background: 'rgba(184,149,42,0.1)', borderColor: 'rgba(184,149,42,0.25)', color: '#fff' },
  courseName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 },
  count: { minWidth: 24, padding: '2px 6px', borderRadius: 9, background: 'rgba(184,149,42,0.12)', color: '#D4A832', textAlign: 'center', fontSize: 11, fontWeight: 700 },
  panel: { flex: 1, minWidth: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 },
  title: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, color: '#fff', margin: '0 0 8px' },
  badges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badgeGold: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(184,149,42,0.12)', color: '#D4A832', border: '1px solid rgba(184,149,42,0.25)' },
  badgeGreen: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' },
  badgeRed: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  statsButton: { padding: '8px 14px', background: 'rgba(184,149,42,0.12)', border: '1px solid rgba(184,149,42,0.3)', borderRadius: 8, color: '#D4A832', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  deleteButton: { padding: '8px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'rgba(184,149,42,0.7)', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid rgba(184,149,42,0.15)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  trEven: { background: 'rgba(255,255,255,0.01)' },
  td: { padding: '11px 14px', color: 'rgba(255,255,255,0.75)' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  done: { color: '#4ade80', fontWeight: 700 },
  pending: { color: '#f59e0b', fontWeight: 700 },
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
};
