/**
 * StatisticsPage - Global stats + course list by nombre_curso field
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { coursesAPI } from '../utils/api';
import FlexChart from '../components/charts/FlexChart';

const COLORS = ['#B8952A','#4ade80','#f59e0b','#60a5fa','#f87171','#D4A832','#34d399','#fb923c'];

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hiddenCourses, setHiddenCourses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden_courses') || '[]'); }
    catch { return []; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    coursesAPI.adminStats()
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleCourses = (stats?.cursos_lista || []).filter(c => !hiddenCourses.includes(c.nombre));

  const handleHideCourse = (nombre) => {
    if (!window.confirm(`Eliminar "${nombre}" del listado? Los datos se conservaran en las estadisticas globales.`)) return;
    const updated = [...hiddenCourses, nombre];
    setHiddenCourses(updated);
    localStorage.setItem('hidden_courses', JSON.stringify(updated));
  };

  const top3 = [...(stats?.cursos_lista || [])].slice(0, 3);

  const completedData = (() => {
    if (!stats) return {};
    // Sum from all courses
    const total = (stats.cursos_lista || []).reduce((s, c) => s + c.total, 0);
    if (total === 0) return {};
    // We don't have completed per course in global stats, show total inscritos only
    return {};
  })();

  if (loading) return (
    <DashboardLayout title="Estadisticas">
      <p style={{ color:'rgba(255,255,255,0.5)' }}>Cargando...</p>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Estadisticas">

      <h2 style={styles.sectionTitle}>Estadisticas Globales</h2>
      <div style={styles.grid}>
        <FlexChart title="Sexo / Genero" data={stats?.sexo || {}} colors={COLORS} />
        <FlexChart title="Nivel de Estudios" data={stats?.nivel_estudios || {}} colors={COLORS} />
        <FlexChart title="Tipo de Empleado" data={stats?.tipo_empleado || {}} colors={COLORS} />
        <FlexChart title="Puesto Actual" data={stats?.puesto || {}} colors={COLORS} />

        {/* Top 3 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Top 3 Cursos mas Populares</h3>
          {top3.length === 0 ? <p style={styles.noData}>Sin datos aun.</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:8 }}>
              {top3.map(({ nombre, total }, i) => {
                const medals = ['Oro','Plata','Bronce'];
                const max = top3[0].total || 1;
                const pct = (total / max) * 100;
                return (
                  <div key={nombre}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ color:'#fff', fontSize:13 }}>{medals[i]} - {nombre}</span>
                      <span style={{ color:COLORS[i], fontWeight:700 }}>{total}</span>
                    </div>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.barFill, width:`${pct}%`, background:COLORS[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trend */}
        <div style={{ ...styles.card, gridColumn:'1 / -1' }}>
          <h3 style={styles.cardTitle}>Inscripciones por Mes</h3>
          <TrendBars data={stats?.inscripciones_por_mes || {}} />
        </div>
      </div>

      {/* Course list */}
      <h2 style={{ ...styles.sectionTitle, marginTop:48 }}>Estadisticas por Curso</h2>
      <p style={styles.hint}>Los cursos provienen del campo "Nombre del Curso" en los formularios de inscripcion.</p>

      {visibleCourses.length === 0 ? (
        <p style={styles.noData}>
          {(stats?.cursos_lista || []).length === 0
            ? 'Aun no hay inscripciones registradas.'
            : 'Todos los cursos han sido ocultados del listado.'}
        </p>
      ) : (
        <div style={styles.courseGrid}>
          {visibleCourses.map(({ nombre, total }) => (
            <div key={nombre} style={styles.courseCard}>
              <div style={styles.courseCardTop}>
                <div>
                  <div style={styles.courseCardTitle}>{nombre}</div>
                  <div style={styles.courseCardMeta}>{total} inscritos</div>
                </div>
              </div>
              <div style={styles.courseCardActions}>
                <button style={styles.btnView}
                  onClick={() => navigate(`/estadisticas/curso/${encodeURIComponent(nombre)}`)}>
                  Ver estadisticas
                </button>
                <button style={styles.btnDeleteCourse} onClick={() => handleHideCourse(nombre)}>
                  Ocultar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function TrendBars({ data }) {
  const entries = Object.entries(data).sort(([a],[b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([,v]) => v), 1);
  if (!entries.length) return <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14 }}>Sin datos aun.</p>;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:12, overflowX:'auto', paddingBottom:4, minHeight:160 }}>
      {entries.map(([month, count]) => {
        const h = Math.max((count/max)*140, 4);
        return (
          <div key={month} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:44 }}>
            <div style={{ height:140, display:'flex', alignItems:'flex-end' }}>
              <div style={{ width:32, height:h, background:'linear-gradient(to top, #B8952A, #D4A832)', borderRadius:'4px 4px 0 0', transition:'height 0.5s ease' }} />
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{month.slice(5)}/{month.slice(2,4)}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  sectionTitle: { fontSize:20, fontWeight:700, color:'#fff', margin:'0 0 8px' },
  hint: { fontSize:13, color:'rgba(255,255,255,0.35)', margin:'0 0 20px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 },
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:28 },
  cardTitle: { fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' },
  noData: { color:'rgba(255,255,255,0.35)', fontSize:14 },
  barTrack: { height:10, background:'rgba(184,149,42,0.1)', borderRadius:5, overflow:'hidden' },
  barFill: { height:'100%', borderRadius:5, transition:'width 0.6s ease' },
  courseGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 },
  courseCard: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:20 },
  courseCardTop: { marginBottom:16 },
  courseCardTitle: { fontSize:15, fontWeight:600, color:'#fff', marginBottom:4 },
  courseCardMeta: { fontSize:13, color:'rgba(255,255,255,0.35)' },
  courseCardActions: { display:'flex', gap:8 },
  btnView: { flex:1, padding:'8px 0', background:'rgba(184,149,42,0.12)', border:'1px solid rgba(108,99,255,0.3)', borderRadius:8, color:'#D4A832', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnDeleteCourse: { padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, color:'#f87171', fontSize:13, cursor:'pointer' },
};
