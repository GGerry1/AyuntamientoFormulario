/**
 * CourseStatsPage - Individual course statistics by nombre_curso
 * Route: /estadisticas/curso/:nombre
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import FlexChart from '../components/charts/FlexChart';
import { coursesAPI } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const COLORS = ['#B8952A','#4ade80','#f59e0b','#60a5fa','#f87171','#D4A832','#34d399','#fb923c'];

export default function CourseStatsPage() {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isArchived = searchParams.get('archived') === '1';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const decodedNombre = decodeURIComponent(nombre);
  const shareUrl = `${window.location.origin}/reporte/${encodeURIComponent(decodedNombre)}`;

  useEffect(() => {
    coursesAPI.statsByName(decodedNombre, isArchived)
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [decodedNombre, isArchived]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const completedData = (() => {
    if (!stats || stats.total === 0) return {};
    return { 'Completados': stats.completaron || 0, 'Pendientes': stats.pendientes || 0 };
  })();

  if (loading) return (
    <DashboardLayout title="Estadisticas del Curso">
      <p style={{ color:'rgba(255,255,255,0.5)' }}>Cargando...</p>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={`Estadisticas: ${decodedNombre}`}>
      <style>{printStyles}</style>

      {/* Actions */}
      <div style={styles.topBar} className="no-print">
        <button
          style={styles.btnBack}
          onClick={() => navigate(isArchived ? '/cursos-archivados' : '/estadisticas')}
        >
          Volver
        </button>
        <div style={{ display:'flex', gap:10 }}>
          {!isArchived && (
            <button style={styles.btnShare} onClick={handleCopyLink}>
              {copied ? 'Link copiado!' : 'Compartir link'}
            </button>
          )}
          <button style={styles.btnPrint} onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>

      {/* Share URL */}
      {!isArchived && (
        <div style={styles.shareBox} className="no-print">
          <span style={styles.shareLabel}>Link publico:</span>
          <span style={styles.shareUrl}>{shareUrl}</span>
        </div>
      )}

      {/* Summary */}
      <div style={styles.summaryRow}>
        <SummaryCard label="Total Inscritos" value={stats?.total || 0} color="#B8952A" />
        <SummaryCard label="Completaron" value={stats?.completaron || 0} color="#4ade80" />
        <SummaryCard label="Pendientes" value={stats?.pendientes || 0} color="#f59e0b" />
      </div>

      {/* Charts */}
      <div style={styles.grid}>
        {(stats?.campos || []).map(campo => {
          if (!campo.distribucion || Object.keys(campo.distribucion).length === 0) return null;
          return <FlexChart key={campo.campo_clave} title={campo.label} data={campo.distribucion} colors={COLORS} />;
        })}
        {Object.keys(completedData).length > 0 && (
          <FlexChart title="Completados vs Pendientes" data={completedData} colors={['#4ade80','#f59e0b']} />
        )}
        {(stats?.campos || []).length === 0 && (
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14 }}>Sin datos de inscripciones para este curso aun.</p>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ ...styles.summaryCard, borderColor: color + '44' }}>
      <div style={{ fontSize:32, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:4 }}>{label}</div>
    </div>
  );
}

const printStyles = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; color: black !important; }
    nav, aside { display: none !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

const styles = {
  topBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  btnBack: { padding:'8px 18px', background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:13 },
  btnShare: { padding:'8px 18px', background:'rgba(184,149,42,0.12)', border:'1px solid rgba(108,99,255,0.3)', borderRadius:8, color:'#D4A832', cursor:'pointer', fontSize:13, fontWeight:600 },
  btnPrint: { padding:'8px 18px', background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:8, color:'#4ade80', cursor:'pointer', fontSize:13, fontWeight:600 },
  shareBox: { display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, marginBottom:24, flexWrap:'wrap' },
  shareLabel: { fontSize:12, color:'rgba(255,255,255,0.35)', flexShrink:0 },
  shareUrl: { fontSize:12, color:'#D4A832', wordBreak:'break-all' },
  summaryRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:28 },
  summaryCard: { background:'rgba(255,255,255,0.03)', border:'1px solid', borderRadius:14, padding:'20px 24px', textAlign:'center' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:24 },
};
