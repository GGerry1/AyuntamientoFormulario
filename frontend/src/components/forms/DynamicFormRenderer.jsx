/**
 * DynamicFormRenderer
 * Renders form fields dynamically from backend schema.
 * Supports all field types: short_text, long_text, email, number,
 * select, radio, checkbox, date, time, datetime
 */

const FIELD_TYPES = {
  short_text: 'text',
  long_text: 'textarea',
  email: 'email',
  number: 'number',
  select: 'select',
  radio: 'radio',
  checkbox: 'checkbox',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
};

export default function DynamicFormRenderer({ fields, values, onChange, errors }) {
  return (
    <div style={styles.form}>
      {fields.map((field) => (
        <FieldWrapper
          key={field.id}
          field={field}
          value={values[field.id] ?? (field.tipo === 'checkbox' ? [] : '')}
          onChange={(val) => onChange(field.id, val)}
          error={errors?.[field.id]}
        />
      ))}
    </div>
  );
}

function FieldWrapper({ field, value, onChange, error }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>
        {field.label}
        {field.obligatorio && <span style={styles.required}>*</span>}
      </label>
      {field.ayuda && <p style={styles.help}>{field.ayuda}</p>}
      <FieldInput field={field} value={value} onChange={onChange} />
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { tipo, options = [], placeholder } = field;

  if (tipo === 'long_text') {
    return (
      <textarea
        style={{ ...styles.input, ...styles.textarea }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    );
  }

  if (tipo === 'select') {
    return (
      <select
        style={{ ...styles.input, ...styles.select }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">- Selecciona una opcion -</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.valor}>{opt.etiqueta}</option>
        ))}
      </select>
    );
  }

  if (tipo === 'radio') {
    return (
      <div style={styles.optionsGroup}>
        {options.map((opt) => (
          <label key={opt.id} style={styles.optionLabel}>
            <input
              type="radio"
              style={styles.optionInput}
              name={field.id}
              value={opt.valor}
              checked={value === opt.valor}
              onChange={() => onChange(opt.valor)}
            />
            <span style={styles.optionText}>{opt.etiqueta}</span>
          </label>
        ))}
      </div>
    );
  }

  if (tipo === 'checkbox') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={styles.optionsGroup}>
        {options.map((opt) => (
          <label key={opt.id} style={styles.optionLabel}>
            <input
              type="checkbox"
              style={styles.optionInput}
              value={opt.valor}
              checked={selected.includes(opt.valor)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, opt.valor]);
                } else {
                  onChange(selected.filter((v) => v !== opt.valor));
                }
              }}
            />
            <span style={styles.optionText}>{opt.etiqueta}</span>
          </label>
        ))}
      </div>
    );
  }

  // Number: only allow digits, enforce max_digits
  if (tipo === 'number') {
    const maxDigits = field.validacion?.max_digits || null;
    return (
      <input
        type="text"
        inputMode="numeric"
        style={styles.input}
        value={value}
        placeholder={placeholder || (maxDigits ? `Max ${maxDigits} digitos` : '')}
        maxLength={maxDigits || undefined}
        onKeyDown={(e) => {
          const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
          if (allowed.includes(e.key)) return;
          if (!/^\d$/.test(e.key)) e.preventDefault();
        }}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '');
          if (maxDigits && val.length > maxDigits) return;
          onChange(val);
        }}
      />
    );
  }

  // Default: text, email, date, time, datetime
  const inputType = FIELD_TYPES[tipo] || 'text';
  return (
    <input
      type={inputType}
      style={styles.input}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 15, fontWeight: 600, color: '#150e0b',
    display: 'flex', gap: 4, alignItems: 'center',
  },
  required: { color: '#e53e3e', fontSize: 16 },
  help: { fontSize: 13, color: '#718096', margin: 0 },
  input: {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10, fontSize: 15,
    background: '#fff', color: '#150e0b',
    outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical', minHeight: 100 },
  select: { cursor: 'pointer', appearance: 'none' },
  optionsGroup: { display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 },
  optionLabel: {
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', padding: '10px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: 14, color: '#150e0b',
    transition: 'border-color 0.2s',
  },
  optionInput: { width: 18, height: 18, cursor: 'pointer', accentColor: '#B8952A' },
  optionText: { flex: 1 },
  error: { fontSize: 13, color: '#e53e3e', margin: 0 },
};
