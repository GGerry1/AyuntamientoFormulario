/**
 * FlexChart - Chart with 3 view modes: bars, donut, line
 * Used in both StatisticsPage and CourseStatsPage
 */
import { useState } from 'react';

const ICONS = {
  bar:   '▬',
  donut: '◉',
  line:  '∿',
};

export default function FlexChart({ title, data = {}, colors = ['#B8952A','#4ade80','#f59e0b','#60a5fa','#f87171'] }) {
  const [mode, setMode] = useState('bar');
  const entries = Object.entries(data);
  const total = entries.reduce((s, [,v]) => s + v, 0);
  const hasData = entries.length > 0 && total > 0;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        <div style={styles.toggleGroup}>
          {['bar','donut','line'].map(m => (
            <button
              key={m}
              style={{ ...styles.toggleBtn, ...(mode === m ? styles.toggleActive : {}) }}
              onClick={() => setMode(m)}
              title={m === 'bar' ? 'Barras' : m === 'donut' ? 'Dona' : 'Linea'}
            >
              {ICONS[m]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p style={styles.noData}>Sin datos aun.</p>
      ) : mode === 'bar' ? (
        <BarChart entries={entries} total={total} colors={colors} />
      ) : mode === 'donut' ? (
        <DonutChart entries={entries} total={total} colors={colors} />
      ) : (
        <LineChart entries={entries} total={total} colors={colors} />
      )}
    </div>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────

function BarChart({ entries, total, colors }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {entries.map(([label, count], i) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:110, fontSize:12, color:'rgba(255,255,255,0.65)', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {label}
            </div>
            <div style={{ flex:1, height:10, background:'rgba(184,149,42,0.1)', borderRadius:5, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:colors[i % colors.length], borderRadius:5, transition:'width 0.6s ease' }} />
            </div>
            <div style={{ width:32, fontSize:12, color:'#fff', textAlign:'right', fontWeight:600 }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut Chart ────────────────────────────────────────────────

function DonutChart({ entries, total, colors }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const ir = 36;

  let cumAngle = -90;
  const slices = entries.map(([label, count], i) => {
    const angle = (count / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { label, count, angle, startAngle: start, color: colors[i % colors.length] };
  });

  const polarToXY = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeSlice = (startAngle, angle, outerR, innerR) => {
    if (angle >= 360) angle = 359.99;
    const p1 = polarToXY(startAngle, outerR);
    const p2 = polarToXY(startAngle + angle, outerR);
    const p3 = polarToXY(startAngle + angle, innerR);
    const p4 = polarToXY(startAngle, innerR);
    const large = angle > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {slices.map((s, i) => (
          <path key={i} d={describeSlice(s.startAngle, s.angle, r, ir)} fill={s.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="18" fontWeight="700">
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
          total
        </text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1 }}>
        {entries.map(([label, count], i) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:colors[i % colors.length], flexShrink:0 }} />
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line Chart ─────────────────────────────────────────────────

function LineChart({ entries, total, colors }) {
  const w = 260;
  const h = 100;
  const pad = 16;
  const vals = entries.map(([,v]) => v);
  const maxV = Math.max(...vals, 1);

  const points = entries.map(([,v], i) => {
    const x = pad + (i / Math.max(entries.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - v / maxV) * (h - pad * 2);
    return { x, y };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M ${points[0]?.x} ${h} ` +
    points.map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1]?.x} ${h} Z`;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow:'visible' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineGrad)" />
        <polyline points={polyline} fill="none" stroke={colors[0]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={colors[i % colors.length]} stroke="#150e0b" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
        {entries.map(([label, count], i) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>{label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:colors[i % colors.length] }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  title: { fontSize:15, fontWeight:700, color:'#fff', margin:0 },
  toggleGroup: { display:'flex', gap:4 },
  toggleBtn: { width:28, height:28, border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, background:'transparent', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' },
  toggleActive: { background:'rgba(184,149,42,0.2)', borderColor:'rgba(184,149,42,0.5)', color:'#D4A832' },
  noData: { color:'rgba(255,255,255,0.35)', fontSize:14 },
};
