interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function AmountInput({ value, onChange, disabled }: AmountInputProps) {
  const handleInput = (val: string) => {
    // Strip non-numeric chars except dot
    const cleaned = val.replace(/[^0-9.]/g, '');

    // Reject bare dot
    if (cleaned === '.') return;

    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      onChange(parts[0] + '.' + parts[1].slice(0, 2));
      return;
    }

    // Strip leading zeros (but keep single "0" or "0.xxx")
    const intPart = parts[0].replace(/^0+(\d)/, '$1');

    // Max 10 integer digits
    if (intPart.length > 10) return;

    if (parts.length === 2) {
      onChange(intPart + '.' + parts[1]);
    } else {
      onChange(intPart);
    }
  };

  const intLen = (value || '').split('.')[0].length;
  const fontSize = intLen > 8 ? 'text-3xl' : intLen > 5 ? 'text-4xl' : 'text-5xl';

  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className={`${fontSize} font-bold text-gray-400`}>¥</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        disabled={disabled}
        placeholder="0.00"
        className={`${fontSize} font-bold text-gray-800 bg-transparent outline-none text-left placeholder-gray-200 caret-primary-500`}
        style={{ width: `${Math.max((value || '0.00').length + 1, 5)}ch`, minWidth: '4ch', lineHeight: '1.2' }}
      />
    </div>
  );
}
