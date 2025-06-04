import React from 'react';

export default function MultiSelect({ label, options, value = [], onChange, className = '' }) {
  const handleChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
    onChange(selected);
  };

  return (
    <div className={className}>
      {label && <label className="block text-text-secondary text-sm mb-xs">{label}</label>}
      <select
        multiple
        value={value}
        onChange={handleChange}
        className="w-full px-m py-s rounded-input border border-bg-tertiary bg-bg-primary text-text-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-primary text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
