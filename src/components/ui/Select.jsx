import { ChevronDown } from 'lucide-react';

/**
 * Styled native select with optional label and error message.
 *
 * @param {{
 *   label?: string,
 *   error?: string,
 *   className?: string,
 *   options: Array<{ value: string, label: string }>,
 * } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
const Select = ({ label, error, className = '', id, options = [], ...rest }) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={[
            'w-full appearance-none rounded-lg bg-zinc-800 border px-3 py-2 pr-8',
            'text-sm text-zinc-100 outline-none transition-colors duration-150',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-zinc-700 hover:border-zinc-600',
            className,
          ].join(' ')}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
