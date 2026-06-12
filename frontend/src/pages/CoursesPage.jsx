/**
 * CoursesPage - Updated
 * - Max 10 plantillas
 * - Activate/deactivate toggle
 * - Delete plantilla
 * - Edit individual fields (label, options)
 * - Cannot delete base fields
 * - Default fields auto-created on new plantilla
 */
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { coursesAPI, fieldsAPI } from '../utils/api';

const FIELD_TYPES = [
  { value: 'short_text', label: 'Texto corto' },
  { value: 'long_text', label: 'Texto largo' },
  { value: 'email', label: 'Correo electronico' },
  { value: 'number', label: 'Numero' },
  { value: 'select', label: 'Menu desplegable' },
  { value: 'radio', label: 'Opcion unica (radio)' },
  { value: 'checkbox', label: 'Seleccion multiple' },
  { value: 'date', label: 'Fecha' },
  { value: 'time', label: 'Hora' },
  { value: 'datetime', label: 'Fecha y hora' },
];

const MAX_PLANTILLAS = 10;

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState(null); // field obj to edit
  const [confirmDelete, setConfirmDelete] = useState(null); // course to delete
  const [activeDeleteWarning, setActiveDeleteWarning] = useState(null);

  // Form states
  const [newCourse, setNewCourse] = useState({ titulo: '', descripcion: '', instructores: '' });
  const [fieldForm, setFieldForm] = useState({
    label: '', tipo: 'short_text', obligatorio: false, orden: 0, options: [],
  });
  const [optionInput, setOptionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const { data } = await coursesAPI.list();
      setCourses(data.results || data);
    } finally { setLoading(false); }
  };

  const loadFields = async (courseId) => {
    const { data } = await fieldsAPI.list(courseId);
    setFields(data.results || data);
  };

  // ── DRAG & DROP REORDER ──
  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOver.current = index;
  };

  const handleDragEnd = async () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    const reordered = [...fields];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    // Assign new orden values
    const updated = reordered.map((f, i) => ({ ...f, orden: i + 1 }));
    setFields(updated);
    dragItem.current = null;
    dragOver.current = null;
    // Save new order to backend
    try {
      await Promise.all(
        updated.map(f => fieldsAPI.update(selectedCourse.id, f.id, { orden: f.orden }))
      );
    } catch { setError('Error al guardar el orden.'); }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    await loadFields(course.id);
  };

  // ── CREATE COURSE ──
  const handleCreateCourse = async () => {
    if (!newCourse.titulo.trim()) { setError('El titulo es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await coursesAPI.create(newCourse);
      await loadCourses();
      setShowCreate(false);
      setNewCourse({ titulo: '', descripcion: '', instructores: '' });
      // Auto-select and load the new course
      setSelectedCourse(data);
      await loadFields(data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la plantilla.');
    } finally { setSaving(false); }
  };

  // ── DELETE COURSE ──
  const requestDeleteCourse = (course) => {
    if (course.activo) {
      setActiveDeleteWarning(course);
      return;
    }
    setConfirmDelete(course);
  };

  const handleDeleteCourse = async () => {
    if (!confirmDelete) return;
    try {
      await coursesAPI.delete(confirmDelete.id);
      setCourses(prev => prev.filter(c => c.id !== confirmDelete.id));
      if (selectedCourse?.id === confirmDelete.id) {
        setSelectedCourse(null);
        setFields([]);
      }
      setConfirmDelete(null);
    } catch (err) {
      setConfirmDelete(null);
      setError(
        err.response?.data?.detail ||
        'Error al eliminar la plantilla.'
      );
    }
  };

  // ── TOGGLE ACTIVE ──
  const handleToggleActive = async (course) => {
    try {
      const { data } = await coursesAPI.toggleActive(
        course.id,
        !course.activo
     );

      setCourses(prev =>
        prev.map(c => ({
          ...c,
         activo: c.id === data.id ? data.activo : false
        }))
     );

      if (selectedCourse?.id === course.id) {
        setSelectedCourse(data);
     }

    } catch (err) {
      console.error(err);
      console.error(err.response?.data);

      setError(
       err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Error al cambiar el estado.'
      );
    }
  };

  // ── CREATE FIELD ──
  const handleCreateField = async () => {
    if (!fieldForm.label.trim()) { setError('La etiqueta es obligatoria.'); return; }
    setSaving(true);
    try {
      await fieldsAPI.create(selectedCourse.id, fieldForm);
      await loadFields(selectedCourse.id);
      setShowFieldForm(false);
      resetFieldForm();
    } catch { setError('Error al crear el campo.'); }
    finally { setSaving(false); }
  };

  // ── EDIT FIELD ──
  const openEditField = (field) => {
    setEditingField({
      ...field,
      options: field.options || [],
    });
    setOptionInput('');
  };

  const handleSaveEditField = async () => {
    if (!editingField.label.trim()) { setError('La etiqueta es obligatoria.'); return; }
    setSaving(true);
    try {
      await fieldsAPI.update(selectedCourse.id, editingField.id, {
        label: editingField.label,
        placeholder: editingField.placeholder || '',
        ayuda: editingField.ayuda || '',
        obligatorio: editingField.obligatorio,
        options: editingField.options,
      });
      await loadFields(selectedCourse.id);
      setEditingField(null);
    } catch { setError('Error al guardar el campo.'); }
    finally { setSaving(false); }
  };

  // ── DELETE FIELD ──
  const handleDeleteField = async (field) => {
    if (field.es_campo_base) {
      setError('Los campos base no se pueden eliminar.');
      return;
    }
    if (!window.confirm(`Eliminar campo "${field.label}"?`)) return;
    try {
      await fieldsAPI.delete(selectedCourse.id, field.id);
      await loadFields(selectedCourse.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar el campo.');
    }
  };

  // ── TOGGLE FIELD ACTIVE ──
  const handleToggleField = async (field) => {
    await fieldsAPI.update(selectedCourse.id, field.id, { activo: !field.activo });
    await loadFields(selectedCourse.id);
  };

  // ── OPTIONS HELPERS ──
  const addOption = (isEdit = false) => {
    if (!optionInput.trim()) return;
    const newOpt = { valor: optionInput.trim(), etiqueta: optionInput.trim(), orden: 0 };
    if (isEdit) {
      setEditingField(prev => ({
        ...prev,
        options: [...(prev.options || []), { ...newOpt, orden: prev.options.length }],
      }));
    } else {
      setFieldForm(prev => ({
        ...prev,
        options: [...prev.options, { ...newOpt, orden: prev.options.length }],
      }));
    }
    setOptionInput('');
  };

  const removeOption = (i, isEdit = false) => {
    if (isEdit) {
      setEditingField(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));
    } else {
      setFieldForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));
    }
  };

  const resetFieldForm = () => {
    setFieldForm({ label: '', tipo: 'short_text', obligatorio: false, orden: 0, options: [] });
    setOptionInput('');
    setError('');
  };

  const needsOptions = (tipo) => ['select', 'radio', 'checkbox'].includes(tipo);
  const activeCourse =
  courses.find(c => c.activo);
  
  return (
    <DashboardLayout title="Plantillas de Curso">
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}>x</button>
        </div>
      )}

      <div style={styles.layout}>
        {/* ── LEFT: Course List ── */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Mis Plantillas</h3>
              <p style={styles.panelSub}>{courses.length}/{MAX_PLANTILLAS} plantillas</p>
            </div>
            {courses.length < MAX_PLANTILLAS && (
              <button style={styles.btnPrimary} onClick={() => setShowCreate(true)}>
                + Nueva
              </button>
            )}
          </div>

          {loading ? (
            <p style={styles.empty}>Cargando...</p>
          ) : courses.length === 0 ? (
            <p style={styles.empty}>No tienes plantillas. Crea la primera.</p>
          ) : (
            courses.map(c => (
              <div
                key={c.id}
                style={{
                  ...styles.courseItem,
                  ...(selectedCourse?.id === c.id ? styles.courseItemActive : {}),
                }}
                onClick={() => selectCourse(c)}
              >
                <div style={styles.courseItemTop}>
                  <span style={styles.courseItemTitle}>{c.titulo}</span>
                  {c.activo && <span style={styles.activeBadge}>ACTIVA</span>}
                </div>
                <div style={styles.courseItemMeta}>
                  {c.total_inscritos} inscritos
                </div>
                <div style={styles.courseItemActions} onClick={e => e.stopPropagation()}>
                  <button
                    style={{ ...styles.iconBtn, ...(c.activo ? styles.btnDeactivate : styles.btnActivate) }}
                    onClick={() => handleToggleActive(c)}
                    title={c.activo ? 'Desactivar' : 'Activar'}
                  >
                    {c.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    style={{ ...styles.iconBtn, ...styles.btnDelete }}
                    onClick={() => requestDeleteCourse(c)}
                    title={c.activo ? 'La plantilla activa no se puede eliminar' : 'Eliminar'}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}

          {activeCourse && (
            <div style={styles.activeInfo}>
              <span style={{ color: '#4ade80' }}>QR apunta a:</span>
              <br />
              <strong style={{ color: '#fff', fontSize: 13 }}>{activeCourse.titulo}</strong>
            </div>
          )}
        </div>

        {/* ── RIGHT: Fields Panel ── */}
        {selectedCourse && (
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <h3 style={styles.panelTitle}>Campos: {selectedCourse.titulo}</h3>
                <p style={styles.panelSub}>
                  Los campos con <span style={{ color: '#f59e0b' }}>*base*</span> no se pueden eliminar
                </p>
              </div>
              <button style={styles.btnPrimary} onClick={() => { setShowFieldForm(true); setError(''); }}>
                + Campo
              </button>
            </div>

            {fields.length === 0 ? (
              <p style={styles.empty}>No hay campos.</p>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    ...styles.fieldItem,
                    opacity: field.activo ? 1 : 0.5,
                    cursor: 'grab',
                  }}
                >
                  {/* Drag handle */}
                  <div style={styles.dragHandle} title="Arrastrar para reordenar">
                    ⠿
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.fieldLabel}>
                      {field.label}
                      {field.es_campo_base && (
                        <span style={styles.baseBadge}>base</span>
                      )}
                    </div>
                    <div style={styles.fieldMeta}>
                      {FIELD_TYPES.find(t => t.value === field.tipo)?.label}
                      {field.obligatorio && <span style={styles.reqBadge}>Obligatorio</span>}
                      {field.validacion?.max_digits && (
                        <span style={styles.validBadge}>max {field.validacion.max_digits} digitos</span>
                      )}
                    </div>
                    {field.options?.length > 0 && (
                      <div style={styles.optionPreview}>
                        {field.options.map(o => o.etiqueta).join(' / ')}
                      </div>
                    )}
                  </div>
                  <div style={styles.fieldActions}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => openEditField(field)}
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleToggleField(field)}
                      title={field.activo ? 'Desactivar' : 'Activar'}
                    >
                      {field.activo ? 'Ocultar' : 'Mostrar'}
                    </button>
                    {!field.es_campo_base && (
                      <button
                        style={{ ...styles.actionBtn, ...styles.actionBtnDelete }}
                        onClick={() => handleDeleteField(field)}
                        title="Eliminar"
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Create Course ── */}
      {showCreate && (
        <Modal title="Nueva Plantilla" onClose={() => { setShowCreate(false); setError(''); }}>
          <Input
            label="Titulo de la plantilla *"
            value={newCourse.titulo}
            onChange={v => setNewCourse({ ...newCourse, titulo: v })}
          />
          <Input
            label="Descripcion"
            value={newCourse.descripcion}
            onChange={v => setNewCourse({ ...newCourse, descripcion: v })}
            textarea
          />
          <Input
            label="Instructores"
            value={newCourse.instructores}
            onChange={v => setNewCourse({ ...newCourse, instructores: v })}
          />
          {error && <p style={styles.modalError}>{error}</p>}
          <p style={styles.modalNote}>
            Se crearan automaticamente los campos base del formulario.
          </p>
          <ModalActions
            onCancel={() => { setShowCreate(false); setError(''); }}
            onSave={handleCreateCourse}
            saving={saving}
            saveLabel="Crear plantilla"
          />
        </Modal>
      )}

      {/* ── MODAL: Create Field ── */}
      {showFieldForm && (
        <Modal title="Nuevo Campo" onClose={() => { setShowFieldForm(false); resetFieldForm(); }}>
          <Input
            label="Etiqueta *"
            value={fieldForm.label}
            onChange={v => setFieldForm({ ...fieldForm, label: v })}
          />
          <div style={styles.formGroup}>
            <label style={styles.inputLabel}>Tipo de campo</label>
            <select
              style={styles.select}
              value={fieldForm.tipo}
              onChange={e => setFieldForm({ ...fieldForm, tipo: e.target.value })}
            >
              {FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={fieldForm.obligatorio}
              onChange={e => setFieldForm({ ...fieldForm, obligatorio: e.target.checked })}
            />
            Campo obligatorio
          </label>
          <Input
            label="Orden"
            value={fieldForm.orden}
            onChange={v => setFieldForm({ ...fieldForm, orden: parseInt(v) || 0 })}
            type="number"
          />
          {needsOptions(fieldForm.tipo) && (
            <OptionsEditor
              options={fieldForm.options}
              optionInput={optionInput}
              setOptionInput={setOptionInput}
              onAdd={() => addOption(false)}
              onRemove={i => removeOption(i, false)}
            />
          )}
          {error && <p style={styles.modalError}>{error}</p>}
          <ModalActions
            onCancel={() => { setShowFieldForm(false); resetFieldForm(); }}
            onSave={handleCreateField}
            saving={saving}
            saveLabel="Guardar campo"
          />
        </Modal>
      )}

      {/* ── MODAL: Edit Field ── */}
      {editingField && (
        <Modal
          title={`Editar: ${editingField.label}`}
          onClose={() => setEditingField(null)}
        >
          <Input
            label="Etiqueta *"
            value={editingField.label}
            onChange={v => setEditingField({ ...editingField, label: v })}
          />
          <Input
            label="Texto de ayuda"
            value={editingField.ayuda || ''}
            onChange={v => setEditingField({ ...editingField, ayuda: v })}
          />
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={editingField.obligatorio}
              onChange={e => setEditingField({ ...editingField, obligatorio: e.target.checked })}
            />
            Campo obligatorio
          </label>
          {needsOptions(editingField.tipo) && (
            <OptionsEditor
              options={editingField.options || []}
              optionInput={optionInput}
              setOptionInput={setOptionInput}
              onAdd={() => addOption(true)}
              onRemove={i => removeOption(i, true)}
            />
          )}
          {editingField.es_campo_base && (
            <p style={styles.modalNote}>
              Campo base: solo puedes editar la etiqueta, placeholder y opciones.
            </p>
          )}
          {error && <p style={styles.modalError}>{error}</p>}
          <ModalActions
            onCancel={() => setEditingField(null)}
            onSave={handleSaveEditField}
            saving={saving}
            saveLabel="Guardar cambios"
          />
        </Modal>
      )}

      {/* ── MODAL: Confirm Delete Course ── */}
      {confirmDelete && (
        <Modal title="Eliminar Plantilla" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6 }}>
            Vas a eliminar la plantilla <strong style={{ color: '#fff' }}>{confirmDelete.titulo}</strong>.
            <br /><br />
            Los cursos e inscripciones asociados pasaran a Cursos Archivados,
            donde conservaran sus inscritos y estadisticas. La plantilla no se
            puede restaurar.
          </p>
          <ModalActions
            onCancel={() => setConfirmDelete(null)}
            onSave={handleDeleteCourse}
            saveLabel="Si, eliminar"
            danger
          />
        </Modal>
      )}

      {activeDeleteWarning && (
        <Modal
          title="No se puede eliminar"
          onClose={() => setActiveDeleteWarning(null)}
        >
          <div style={styles.warningBox}>
            <strong style={styles.warningTitle}>Plantilla activa</strong>
            <p style={styles.warningText}>
              La plantilla <strong style={{ color: '#fff' }}>
                {activeDeleteWarning.titulo}
              </strong> esta activa y no se puede eliminar.
            </p>
            <p style={styles.warningText}>
              Primero desactivala y despues vuelve a intentar la eliminacion.
            </p>
          </div>
          <div style={styles.modalActions}>
            <button
              style={styles.btnSave}
              onClick={() => setActiveDeleteWarning(null)}
            >
              Entendido
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button style={styles.modalCloseBtn} onClick={onClose}>x</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, textarea, type = 'text' }) {
  return (
    <div style={styles.formGroup}>
      {label && <label style={styles.inputLabel}>{label}</label>}
      {textarea ? (
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          type={type}
          style={styles.input}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function OptionsEditor({ options, optionInput, setOptionInput, onAdd, onRemove }) {
  return (
    <div style={styles.optionsSection}>
      <p style={styles.optionsTitle}>Opciones del campo:</p>
      {options.map((opt, i) => (
        <div key={i} style={styles.optionRow}>
          <span style={{ color: '#fff', fontSize: 13 }}>{opt.etiqueta}</span>
          <button onClick={() => onRemove(i)} style={styles.removeOpt}>x</button>
        </div>
      ))}
      <div style={styles.addOptRow}>
        <input
          style={{ ...styles.input, flex: 1 }}
          placeholder="Nueva opcion..."
          value={optionInput}
          onChange={e => setOptionInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
        />
        <button style={styles.addOptBtn} onClick={onAdd}>+</button>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSave, saving, saveLabel = 'Guardar', danger }) {
  return (
    <div style={styles.modalActions}>
      <button style={styles.btnCancel} onClick={onCancel}>Cancelar</button>
      <button
        style={{ ...styles.btnSave, ...(danger ? styles.btnDanger : {}) }}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? 'Guardando...' : saveLabel}
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  panel: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 24,
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  panelTitle: { fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 },
  panelSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' },
  empty: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

  courseItem: {
    padding: '14px 16px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 8, cursor: 'pointer',
  },
  courseItemActive: { background: 'rgba(108,99,255,0.12)', borderColor: 'rgba(108,99,255,0.35)' },
  courseItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  courseItemTitle: { fontSize: 14, fontWeight: 600, color: '#fff' },
  courseItemMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 8px' },
  courseItemActions: { display: 'flex', gap: 6 },
  activeBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
    background: 'rgba(74,222,128,0.2)', color: '#4ade80',
    padding: '2px 8px', borderRadius: 4,
  },
  activeInfo: {
    marginTop: 16, padding: '12px 16px',
    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
    borderRadius: 10, fontSize: 13,
  },

  fieldItem: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 16px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8,
  },
  fieldLabel: { fontSize: 14, fontWeight: 600, color: '#fff', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  fieldMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  optionPreview: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontStyle: 'italic' },
  fieldActions: { display: 'flex', gap: 6, flexShrink: 0 },

  baseBadge: { background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em' },
  reqBadge: { background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 10, padding: '1px 6px', borderRadius: 4 },
  validBadge: { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontSize: 10, padding: '1px 6px', borderRadius: 4 },

  btnPrimary: { padding: '8px 16px', background: 'linear-gradient(135deg, #B8952A, #D4A832)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  iconBtn: { padding: '5px 10px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnActivate: { background: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  btnDeactivate: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' },
  btnDelete: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
  actionBtn: { padding: '4px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer' },
  actionBtnDelete: { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' },

  errorBanner: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  errorClose: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, padding: '0 4px' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalCard: { background: '#150e0b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  modalCloseBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: 4 },
  modalBody: { padding: '20px 24px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  modalError: { fontSize: 13, color: '#f87171', margin: 0 },
  modalNote: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  warningBox: {
    padding: '16px',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 10,
  },
  warningTitle: {
    display: 'block', marginBottom: 8,
    color: '#fbbf24', fontSize: 15,
  },
  warningText: {
    margin: '6px 0', color: 'rgba(255,255,255,0.7)',
    fontSize: 14, lineHeight: 1.6,
  },

  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  inputLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' },
  checkLabel: { display: 'flex', gap: 8, alignItems: 'center', color: '#fff', fontSize: 14, cursor: 'pointer' },

  optionsSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  optionsTitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 },
  optionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 },
  removeOpt: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  addOptRow: { display: 'flex', gap: 8 },
  addOptBtn: { padding: '10px 14px', background: '#B8952A', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 16 },

  btnCancel: { padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 },
  btnSave: { padding: '10px 20px', background: 'linear-gradient(135deg, #B8952A, #D4A832)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnDanger: { background: 'linear-gradient(135deg, #ef4444, #f87171)' },
  dragHandle: {
    fontSize: 18, color: 'rgba(255,255,255,0.25)',
    cursor: 'grab', userSelect: 'none',
    padding: '0 8px 0 0', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
};
