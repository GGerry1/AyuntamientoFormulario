/**
 * PublicReportPage - Shareable public report by curso name
 * Route: /reporte/:nombre
 * No auth, no admin nav. Shows "not available" if hidden/deleted.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import FlexChart from '../components/charts/FlexChart';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const COLORS = ['#B8952A','#4ade80','#f59e0b','#60a5fa','#f87171','#D4A832','#34d399','#fb923c'];

export default function PublicReportPage() {
  const { nombre } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const decodedNombre = decodeURIComponent(nombre);

  useEffect(() => {
    axios.get(`${API_BASE}/courses/public-report-name/${encodeURIComponent(decodedNombre)}/`)
      .then(res => setData(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [decodedNombre]);

  if (loading) return (
    <div style={styles.page}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'rgba(255,255,255,0.5)', fontSize:16 }}>
        Cargando reporte...
      </div>
    </div>
  );

  if (notFound || !data) return (
    <div style={styles.page}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, textAlign:'center', padding:24 }}>
        <div style={{ fontSize:48 }}>⚠</div>
        <h2 style={{ fontSize:24, fontWeight:700, color:'#fff', margin:0 }}>Reporte no disponible</h2>
        <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', maxWidth:360, lineHeight:1.6 }}>
          Este reporte ya no existe o fue eliminado por el administrador.
        </p>
      </div>
    </div>
  );

  const completedData = (() => {
    const total = data.total || 0;
    if (total === 0) return {};
    return { 'Completados': data.completaron || 0, 'Pendientes': data.pendientes || 0 };
  })();

  return (
    <div style={styles.page}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div style={styles.header}>
        <div style={styles.brand}>CursoGov</div>
        <button style={styles.btnPrint} onClick={() => window.print()} className="no-print">
          Imprimir
        </button>
      </div>

      <div style={styles.container}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#fff', margin:'0 0 8px' }}>{data.nombre_curso}</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.35)', margin:0 }}>
            Reporte de Estadisticas — {new Date().toLocaleDateString('es-MX')}
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:32 }}>
          {[['Total Inscritos', data.total, '#B8952A'], ['Completaron', data.completaron, '#4ade80'], ['Pendientes', data.pendientes, '#f59e0b']].map(([label, value, color]) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}44`, borderRadius:16, padding:'20px 24px', textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:700, color }}>{value}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:6 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24, marginBottom:48 }}>
          {(data.campos || []).map(campo => {
            if (!campo.distribucion || Object.keys(campo.distribucion).length === 0) return null;
            return <FlexChart key={campo.campo_clave} title={campo.label} data={campo.distribucion} colors={COLORS} />;
          })}
          {Object.keys(completedData).length > 0 && (
            <FlexChart title="Completados vs Pendientes" data={completedData} colors={['#4ade80','#f59e0b']} />
          )}
        </div>

        <div style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.2)', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24 }}>
          Reporte generado por CursoGov
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', background:'#0f0a08', color:'#fff', fontFamily:'system-ui, sans-serif' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid rgba(255,255,255,0.06)' },
  brand: { fontSize:20, fontWeight:800, background:'linear-gradient(135deg, #B8952A, #D4A832)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  btnPrint: { padding:'8px 18px', background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:8, color:'#4ade80', cursor:'pointer', fontSize:13, fontWeight:600 },
  container: { maxWidth:1000, margin:'0 auto', padding:'40px 24px' },
};
