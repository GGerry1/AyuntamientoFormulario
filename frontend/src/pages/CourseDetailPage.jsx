/**
 * CourseDetailPage — Inscritos por curso con estatus y envio de diploma
 * Paleta institucional Acapulco
 */
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { coursesAPI } from '../utils/api';

export default function CourseDetailPage() {
  const [cursos, setCursos] = useState([]);       // lista de nombres de curso
  const [selected, setSelected] = useState(null); // nombre_curso seleccionado
  const [inscritos, setInscritos] = useState([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [search, setSearch] = useState('');
  const [diplomaModal, setDiplomaModal] = useState(null); // {regId, nombre, correo}
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // Load course names from stats endpoint
  useEffect(() => {
    coursesAPI.adminStats()
      .then(res => {
        const lista = res.data.cursos_lista || [];
        setCursos(lista);
        if (lista.length > 0) {
          setSelected(lista[0].nombre);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCursos(false));
  }, []);

  // Load registrations when course changes
  useEffect(() => {
    if (!selected) return;
    setLoadingInscritos(true);
    setInscritos([]);
    coursesAPI.registrationsByCourse(selected)
      .then(res => setInscritos(res.data))
      .catch(() => {})
      .finally(() => setLoadingInscritos(false));
  }, [selected]);

  const handleToggle = async (regId) => {
    try {
      const res = await coursesAPI.toggleCompletado(regId);
      setInscritos(prev => prev.map(r =>
        r.id === regId ? { ...r, completado: res.data.completado } : r
      ));
    } catch { alert('Error al actualizar estatus.'); }
  };

  const handleArchiveCourse = async (nombre) => {
    const archiveConfirmed = window.confirm(
      `Archivar "${nombre}" lo movera a Cursos Archivados y lo eliminara de la plantilla para que ya no reciba nuevas inscripciones. Sus inscritos y estadisticas se conservaran, pero el curso NO se podra restaurar.\n\n¿Deseas continuar?`
    );
    if (!archiveConfirmed) return;
    try {
      await coursesAPI.archiveCourse(nombre);
      setCursos(prev => prev.filter(c => c.nombre !== nombre));
      if (selected === nombre) {
        setSelected(null);
        setInscritos([]);
      }
    } catch { alert('Error al archivar el curso.'); }
  };

  const reloadCourseData = async (courseName = selected) => {
    const [statsRes, registrationsRes] = await Promise.all([
      coursesAPI.adminStats(),
      courseName
        ? coursesAPI.registrationsByCourse(courseName)
        : Promise.resolve({ data: [] }),
    ]);
    const lista = statsRes.data.cursos_lista || [];
    setCursos(lista);
    if (courseName && lista.some(course => course.nombre === courseName)) {
      setSelected(courseName);
      setInscritos(registrationsRes.data);
    } else {
      setSelected(lista[0]?.nombre || null);
      setInscritos([]);
    }
  };

  const handleEditRegistration = async (regId) => {
    try {
      const response = await coursesAPI.getRegistration(regId);
      setEditModal(response.data);
    } catch {
      alert('No fue posible cargar la informacion del inscrito.');
    }
  };

  const handleDeleteRegistration = async () => {
    if (!deleteModal) return;
    try {
      await coursesAPI.deleteRegistration(deleteModal.id);
      setInscritos(prev => prev.filter(reg => reg.id !== deleteModal.id));
      setDeleteModal(null);
      await reloadCourseData(selected);
    } catch {
      alert('No fue posible eliminar al inscrito.');
    }
  };

  const filtered = inscritos.filter(r => {
    const q = search.toLowerCase();
    return (
      r.nombre?.toLowerCase().includes(q) ||
      r.correo?.toLowerCase().includes(q) ||
      r.numero_empleado?.toLowerCase().includes(q)
    );
  });

  const completados  = inscritos.filter(r => r.completado).length;
  const pendientes   = inscritos.length - completados;

  if (loadingCursos) return (
    <DashboardLayout title="Cursos">
      <p style={{ color:'rgba(255,255,255,0.4)' }}>Cargando...</p>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Cursos">
      <style>{css}</style>

      <div style={styles.layout}>

        {/* ── Sidebar de cursos ── */}
        <aside style={styles.courseSidebar}>
          <div style={styles.sidebarTitle}>Cursos</div>
          {cursos.length === 0 ? (
            <p style={styles.empty}>Sin inscripciones aun.</p>
          ) : (
            cursos.map(({ nombre, total }) => (
              <div key={nombre} style={styles.courseBtnWrap}>
                <button
                  style={{
                    ...styles.courseBtn,
                    ...(selected === nombre ? styles.courseBtnActive : {}),
                  }}
                  onClick={() => setSelected(nombre)}
                >
                  <span style={styles.courseBtnName}>{nombre}</span>
                  <span style={{
                    ...styles.courseBtnCount,
                    ...(selected === nombre ? styles.courseBtnCountActive : {}),
                  }}>{total}</span>
                </button>
                <button
                  style={styles.courseDeleteBtn}
                  onClick={() => handleArchiveCourse(nombre)}
                  title="Archivar curso"
                  className="course-delete-btn"
                >Archivar</button>
              </div>
            ))
          )}
        </aside>

        {/* ── Panel principal ── */}
        <div style={styles.mainPanel}>
          {selected ? (
            <>
              {/* Header */}
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>{selected}</h2>
                  <div style={styles.panelMeta}>
                    <span style={styles.badgeGold}>{inscritos.length} inscritos</span>
                    <span style={styles.badgeGreen}>{completados} completados</span>
                    <span style={styles.badgeRed}>{pendientes} pendientes</span>
                  </div>
                </div>
                <input
                  style={styles.search}
                  placeholder="Buscar por nombre, correo o empleado..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Table */}
              {loadingInscritos ? (
                <div style={styles.loading}>Cargando inscritos...</div>
              ) : filtered.length === 0 ? (
                <div style={styles.empty}>
                  {inscritos.length === 0 ? 'Sin inscritos en este curso.' : 'Sin resultados para tu busqueda.'}
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Nombre','Correo','Telefono','No. Empleado','Estatus','Diploma','Acciones'].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((reg, i) => (
                        <tr key={reg.id} style={{ ...styles.tr, ...(i % 2 === 0 ? styles.trEven : {}) }}
                          className="table-row">
                          <td style={styles.td}>{reg.nombre || '—'}</td>
                          <td style={{ ...styles.td, ...styles.tdMono }}>{reg.correo}</td>
                          <td style={styles.td}>{reg.telefono || '—'}</td>
                          <td style={{ ...styles.td, textAlign:'center' }}>{reg.numero_empleado || '—'}</td>
                          <td style={{ ...styles.td, textAlign:'center' }}>
                            <button
                              style={{
                                ...styles.statusBtn,
                                ...(reg.completado ? styles.statusDone : styles.statusPending),
                              }}
                              onClick={() => handleToggle(reg.id)}
                              className="status-btn"
                            >
                              {reg.completado ? '✓ Listo' : '⏳ Pendiente'}
                            </button>
                          </td>
                          <td style={{ ...styles.td, textAlign:'center' }}>
                            {reg.completado ? (
                              <button
                                style={{
                                  ...styles.diplomaBtn,
                                  ...(reg.diploma_enviado ? styles.diplomaSent : {}),
                                }}
                                onClick={() => setDiplomaModal({
                                  regId: reg.id,
                                  nombre: reg.nombre,
                                  correo: reg.correo,
                                })}
                                className="diploma-btn"
                              >
                                {reg.diploma_enviado ? '✓ Enviado' : 'Diploma'}
                              </button>
                            ) : (
                              <span style={styles.diplomaDisabled}>—</span>
                            )}
                          </td>
                          <td style={{ ...styles.td, textAlign:'center' }}>
                            <div style={styles.rowActions}>
                              <button
                                style={styles.editBtn}
                                onClick={() => handleEditRegistration(reg.id)}
                                className="edit-btn"
                              >
                                Editar
                              </button>
                              <button
                                style={styles.deleteBtn}
                                onClick={() => setDeleteModal(reg)}
                                className="delete-btn"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={styles.empty}>Selecciona un curso de la izquierda.</div>
          )}
        </div>
      </div>

      {/* ── Modal diploma ── */}
      {diplomaModal && (
        <DiplomaModal
          reg={diplomaModal}
          onClose={() => setDiplomaModal(null)}
          onSent={(regId) => {
            setInscritos(prev => prev.map(r =>
              r.id === regId ? { ...r, diploma_enviado: true } : r
            ));
            setDiplomaModal(null);
          }}
        />
      )}
      {editModal && (
        <EditRegistrationModal
          registration={editModal}
          onClose={() => setEditModal(null)}
          onSaved={async () => {
            setEditModal(null);
            await reloadCourseData(selected);
          }}
        />
      )}
      {deleteModal && (
        <ConfirmDeleteModal
          registration={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDeleteRegistration}
        />
      )}
    </DashboardLayout>
  );
}

function EditRegistrationModal({ registration, onClose, onSaved }) {
  const [answers, setAnswers] = useState(
    registration.answers.map(answer => ({ ...answer }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateValue = (id, value) => {
    setAnswers(prev => prev.map(answer =>
      answer.id === id ? { ...answer, value } : answer
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await coursesAPI.updateRegistration(registration.id, {
        answers: answers.map(answer => ({ id: answer.id, value: answer.value })),
      });
      await onSaved();
    } catch (e) {
      const details = e?.response?.data;
      const message = details?.answers?.[0] || details?.detail ||
        (typeof details === 'string' ? details : null);
      setError(message || 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        style={{ ...modal.card, maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }}
        className="fade-up"
      >
        <div style={modal.header}>
          <h3 style={modal.title}>Editar inscrito</h3>
          <button style={modal.closeBtn} onClick={onClose}>X</button>
        </div>
        <div style={modal.formGrid}>
          {answers.map(answer => (
            <RegistrationField
              key={answer.id}
              answer={answer}
              onChange={value => updateValue(answer.id, value)}
            />
          ))}
        </div>
        {error && <div style={modal.error}>{error}</div>}
        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            style={{ ...modal.sendBtn, ...(saving ? modal.sendBtnDisabled : {}) }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistrationField({ answer, onChange }) {
  const commonProps = {
    style: modal.input,
    value: answer.value ?? '',
    required: answer.obligatorio,
    onChange: event => onChange(event.target.value),
  };

  let input = <input type="text" {...commonProps} />;
  if (answer.field_tipo === 'email') {
    input = <input type="email" {...commonProps} />;
  } else if (answer.field_tipo === 'number') {
    input = (
      <input
        type="text"
        inputMode="numeric"
        maxLength={answer.validacion?.exact_digits || answer.validacion?.max_digits}
        {...commonProps}
        onChange={event => onChange(event.target.value.replace(/\D/g, ''))}
      />
    );
  } else if (answer.field_tipo === 'long_text') {
    input = <textarea {...commonProps} rows={3} />;
  } else if (answer.field_tipo === 'date') {
    input = <input type="date" {...commonProps} />;
  } else if (answer.field_tipo === 'time') {
    input = <input type="time" {...commonProps} />;
  } else if (answer.field_tipo === 'datetime') {
    input = <input type="datetime-local" {...commonProps} />;
  } else if (['select', 'radio'].includes(answer.field_tipo)) {
    input = (
      <select {...commonProps} className="registration-select">
        <option value="">Selecciona una opcion</option>
        {answer.options.map(option => (
          <option key={option.id} value={option.valor}>{option.etiqueta}</option>
        ))}
      </select>
    );
  } else if (answer.field_tipo === 'checkbox') {
    const selectedValues = Array.isArray(answer.value) ? answer.value : [];
    input = (
      <div style={modal.checkboxList}>
        {answer.options.map(option => (
          <label key={option.id} style={modal.checkboxLabel}>
            <input
              type="checkbox"
              checked={selectedValues.includes(option.valor)}
              onChange={event => {
                const next = event.target.checked
                  ? [...selectedValues, option.valor]
                  : selectedValues.filter(value => value !== option.valor);
                onChange(next);
              }}
            />
            {option.etiqueta}
          </label>
        ))}
      </div>
    );
  }

  return (
    <label style={modal.field}>
      <span style={modal.fieldLabel}>
        {answer.field_label}{answer.obligatorio ? ' *' : ''}
      </span>
      {input}
    </label>
  );
}

function ConfirmDeleteModal({ registration, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal.card} className="fade-up">
        <div style={modal.header}>
          <h3 style={modal.title}>Eliminar inscrito</h3>
          <button style={modal.closeBtn} onClick={onClose}>X</button>
        </div>
        <p style={modal.warningText}>
          Se eliminara definitivamente a <strong>{registration.nombre || registration.correo}</strong>,
          sus respuestas y sus datos en las estadisticas. Esta accion no se puede deshacer.
        </p>
        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancelar
          </button>
          <button
            style={{ ...modal.dangerBtn, ...(deleting ? modal.sendBtnDisabled : {}) }}
            onClick={confirm}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal de envio de diploma ───────────────────────────────── */
function DiplomaModal({ reg, onClose, onSent }) {
  const [file, setFile]       = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf','jpg','jpeg','png'].includes(ext)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleSend = async () => {
    if (!file) { setError('Selecciona un archivo primero.'); return; }
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('diploma', file);
      await coursesAPI.sendDiploma(reg.regId, fd);
      onSent(reg.regId);
    } catch (e) {
      const serverDetail = e?.response?.data?.detail;
      const networkDetail = e?.request && !e?.response
        ? 'El servidor no respondio. Revisa los logs de Render.'
        : '';
      setError(
        serverDetail ||
        networkDetail ||
        e?.message ||
        'Error al enviar. Verifica la configuracion de correo.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal.card} className="fade-up">
        <div style={modal.header}>
          <h3 style={modal.title}>Enviar Diploma</h3>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={modal.recipientBox}>
          <div style={modal.recipientLabel}>Destinatario</div>
          <div style={modal.recipientName}>{reg.nombre || reg.correo}</div>
          <div style={modal.recipientEmail}>{reg.correo}</div>
        </div>

        {/* Drop zone */}
        <div
          style={{ ...modal.dropZone, ...(file ? modal.dropZoneActive : {}) }}
          onClick={() => inputRef.current?.click()}
          className="drop-zone"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display:'none' }}
            onChange={handleFile}
          />
          {file ? (
            <div style={{ textAlign:'center' }}>
              <div style={modal.fileIcon}>
                {file.name.endsWith('.pdf') ? '📄' : '🖼'}
              </div>
              <div style={modal.fileName}>{file.name}</div>
              <div style={modal.fileSize}>
                {(file.size / 1024).toFixed(0)} KB
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center' }}>
              <div style={modal.uploadIcon}>⬆</div>
              <div style={modal.uploadText}>Haz clic para seleccionar</div>
              <div style={modal.uploadHint}>PDF, JPG o PNG</div>
            </div>
          )}
        </div>

        {error && <div style={modal.error}>{error}</div>}

        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button
            style={{ ...modal.sendBtn, ...(sending ? modal.sendBtnDisabled : {}) }}
            onClick={handleSend}
            disabled={sending || !file}
          >
            {sending ? 'Enviando...' : 'Enviar diploma'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CSS animations ──────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .fade-up { animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .table-row:hover { background: rgba(184,149,42,0.05) !important; }
  .status-btn:hover { opacity: 0.85; transform: scale(0.97); }
  .diploma-btn:hover { opacity: 0.85; transform: scale(0.97); }
  .edit-btn:hover { border-color: rgba(184,149,42,0.55) !important; }
  .delete-btn:hover { background: rgba(248,113,113,0.12) !important; }
  .course-delete-btn:hover { background: rgba(248,113,113,0.1) !important; border-color: rgba(248,113,113,0.5) !important; color: #f87171 !important; }
  .drop-zone:hover { border-color: rgba(184,149,42,0.5) !important; background: rgba(184,149,42,0.06) !important; cursor: pointer; }
  .registration-select { color-scheme: dark; }
  .registration-select option {
    background: #241a14;
    color: #ffffff;
  }
`;

/* ── Styles ──────────────────────────────────────────────────── */
const styles = {
  layout: {
    display: 'flex', gap: 24, alignItems: 'flex-start',
  },

  // Course sidebar
  courseSidebar: {
    width: 210, flexShrink: 0,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(184,149,42,0.12)',
    borderRadius: 14, padding: 14,
    position: 'sticky', top: 24,
  },
  sidebarTitle: {
    fontSize: 11, fontWeight: 700,
    color: 'rgba(184,149,42,0.7)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    marginBottom: 12, padding: '0 4px',
  },
  courseBtn: {
    width: '100%', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 10px', borderRadius: 9,
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', marginBottom: 4,
    textAlign: 'left', transition: 'all 0.15s',
  },
  courseBtnActive: {
    background: 'rgba(184,149,42,0.1)',
    border: '1px solid rgba(184,149,42,0.25)',
    color: '#D4A832',
  },
  courseBtnName: {
    minWidth: 0, flex: 1, overflowWrap: 'anywhere',
    whiteSpace: 'normal', lineHeight: 1.35,
  },
  courseBtnCount: {
    fontSize: 11, fontWeight: 700,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.4)',
    padding: '2px 7px', borderRadius: 10, flexShrink: 0, marginLeft: 6,
  },
  courseBtnCountActive: {
    background: 'rgba(184,149,42,0.2)',
    color: '#D4A832',
  },
  courseBtnWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'stretch', gap: 4, marginBottom: 8,
    minWidth: 0, overflow: 'hidden',
  },
  courseDeleteBtn: {
    width: '100%', minHeight: 28, padding: '4px 8px',
    background: 'transparent', border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 6, color: 'rgba(248,113,113,0.5)',
    cursor: 'pointer', fontSize: 11, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },

  // Main panel
  mainPanel: { flex: 1, minWidth: 0 },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 16, marginBottom: 20,
    flexWrap: 'wrap',
  },
  panelTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px',
  },
  panelMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badgeGold:  { fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:10, background:'rgba(184,149,42,0.12)', color:'#D4A832', border:'1px solid rgba(184,149,42,0.25)' },
  badgeGreen: { fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:10, background:'rgba(74,222,128,0.1)',  color:'#4ade80', border:'1px solid rgba(74,222,128,0.2)' },
  badgeRed:   { fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:10, background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)' },

  search: {
    padding: '9px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(184,149,42,0.2)',
    borderRadius: 9, color: '#fff', fontSize: 13,
    outline: 'none', width: 280, fontFamily: 'inherit',
  },

  // Table
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 700,
    color: 'rgba(184,149,42,0.7)',
    letterSpacing: '1px', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(184,149,42,0.15)',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' },
  trEven: { background: 'rgba(255,255,255,0.01)' },
  td: { padding: '11px 14px', color: 'rgba(255,255,255,0.75)', verticalAlign: 'middle' },
  tdMono: { fontFamily: 'monospace', fontSize: 12 },

  statusBtn: {
    padding: '5px 12px', borderRadius: 7,
    border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  statusDone: {
    background: 'rgba(74,222,128,0.12)',
    color: '#4ade80',
    border: '1px solid rgba(74,222,128,0.25)',
  },
  statusPending: {
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)',
  },
  diplomaBtn: {
    padding: '5px 12px', borderRadius: 7,
    background: 'rgba(184,149,42,0.12)',
    border: '1px solid rgba(184,149,42,0.3)',
    color: '#D4A832', cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  diplomaSent: {
    background: 'rgba(74,222,128,0.08)',
    border: '1px solid rgba(74,222,128,0.2)',
    color: '#4ade80',
  },
  diplomaDisabled: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },
  rowActions: {
    display: 'flex', gap: 6, justifyContent: 'center', whiteSpace: 'nowrap',
  },
  editBtn: {
    padding: '5px 10px', borderRadius: 7,
    background: 'rgba(184,149,42,0.1)',
    border: '1px solid rgba(184,149,42,0.25)',
    color: '#D4A832', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
  deleteBtn: {
    padding: '5px 10px', borderRadius: 7,
    background: 'transparent',
    border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },

  loading: { color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '40px 0' },
  empty:   { color: 'rgba(255,255,255,0.35)', fontSize: 14, padding: '40px 0' },
};

const modal = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
    backdropFilter: 'blur(4px)',
  },
  card: {
    background: '#1a120e',
    border: '1px solid rgba(184,149,42,0.2)',
    borderRadius: 18, padding: '32px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  title: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: 20, fontWeight: 700, color: '#fff', margin: 0,
  },
  closeBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.4)', fontSize: 18,
    cursor: 'pointer', padding: 4, lineHeight: 1,
  },
  recipientBox: {
    background: 'rgba(184,149,42,0.06)',
    border: '1px solid rgba(184,149,42,0.15)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
  },
  recipientLabel: {
    fontSize: 10, fontWeight: 700, color: 'rgba(184,149,42,0.6)',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4,
  },
  recipientName:  { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 },
  recipientEmail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' },

  dropZone: {
    border: '2px dashed rgba(184,149,42,0.25)',
    borderRadius: 12, padding: '28px 20px',
    textAlign: 'center', marginBottom: 16,
    transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.02)',
  },
  dropZoneActive: {
    borderColor: 'rgba(184,149,42,0.5)',
    background: 'rgba(184,149,42,0.06)',
  },
  uploadIcon:  { fontSize: 28, marginBottom: 8, color: 'rgba(184,149,42,0.5)' },
  uploadText:  { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginBottom: 4 },
  uploadHint:  { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  fileIcon:    { fontSize: 32, marginBottom: 6 },
  fileName:    { fontSize: 13, color: '#D4A832', fontWeight: 600, marginBottom: 3, wordBreak: 'break-all' },
  fileSize:    { fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  error: {
    fontSize: 13, color: '#f87171',
    background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 8, padding: '8px 12px', marginBottom: 16,
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16, marginBottom: 20,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  fieldLabel: {
    fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid rgba(184,149,42,0.2)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff', fontFamily: 'inherit', fontSize: 13, outline: 'none',
  },
  checkboxList: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 10, borderRadius: 8,
    border: '1px solid rgba(184,149,42,0.2)',
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: 'rgba(255,255,255,0.7)', fontSize: 13,
  },
  warningText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14,
    lineHeight: 1.6, margin: '0 0 24px',
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '10px 20px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 9, color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  sendBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #B8952A, #D4A832)',
    border: 'none', borderRadius: 9,
    color: '#fff', cursor: 'pointer',
    fontSize: 13, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(184,149,42,0.3)',
  },
  sendBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  dangerBtn: {
    padding: '10px 18px', background: 'rgba(248,113,113,0.14)',
    border: '1px solid rgba(248,113,113,0.35)',
    borderRadius: 9, color: '#f87171',
    cursor: 'pointer', fontSize: 13, fontWeight: 700,
  },
};
