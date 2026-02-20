/**
 * Styled text input with optional label and error message.
 *
 * @param {{
 *   label?: string,
 *   error?: string,
 *   className?: string,
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
const Input = ({ label, error, className = '', id, ...rest }) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full rounded-lg bg-zinc-800 border px-3 py-2 text-sm text-zinc-100',
          'placeholder:text-zinc-500 outline-none transition-colors duration-150',
          'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-zinc-700 hover:border-zinc-600',
          className,
        ].join(' ')}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;
