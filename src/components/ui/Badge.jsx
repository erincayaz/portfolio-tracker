/**
 * @typedef {'BIST' | 'US' | 'CRYPTO' | 'default'} BadgeVariant
 */

const variantClasses = {
  BIST:    'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  US:      'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
  CRYPTO:  'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30',
  default: 'bg-zinc-700 text-zinc-300 ring-1 ring-zinc-600',
};

/**
 * Market / label badge.
 *
 * @param {{
 *   variant?: BadgeVariant,
 *   className?: string,
 *   children: React.ReactNode,
 * }} props
 */
const Badge = ({ variant = 'default', className = '', children }) => (
  <span
    className={[
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
      variantClasses[variant] ?? variantClasses.default,
      className,
    ].join(' ')}
  >
    {children}
  </span>
);

export default Badge;
