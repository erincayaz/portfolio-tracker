/**
 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 */

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600 active:bg-zinc-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-700 active:bg-zinc-600',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Reusable button primitive.
 *
 * @param {{
 *   variant?: ButtonVariant,
 *   size?: ButtonSize,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   className?: string,
 *   children: React.ReactNode,
 * } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
};

export default Button;
