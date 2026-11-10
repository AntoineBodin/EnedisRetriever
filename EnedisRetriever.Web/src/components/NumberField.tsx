import { useState } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Unit shown inside the field, e.g. "€/kWh". */
  unit: string;
  hint?: string;
};

function toText(value: number): string {
  return String(value).replace('.', ',');
}

function parse(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));

  return text.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Decimal input that accepts a comma or a dot and never fights the user while
 * typing: the text is free-form until it is a valid number.
 */
function NumberField({ label, value, onChange, unit, hint }: Props) {
  // Text being typed; null when the field simply mirrors `value`.
  const [draft, setDraft] = useState<string | null>(null);

  const invalid = draft !== null && parse(draft) === null;

  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-unit">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft ?? toText(value)}
          aria-invalid={invalid}
          onChange={(event) => {
            const text = event.target.value;
            const parsed = parse(text);

            setDraft(text);

            if (parsed !== null) {
              onChange(parsed);
            }
          }}
          onBlur={() => setDraft(null)}
        />
        <span aria-hidden="true">{unit}</span>
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default NumberField;
