/**
 * Surface card wrapper.
 *
 * @param {{
 *   className?: string,
 *   children: React.ReactNode,
 * } & React.HTMLAttributes<HTMLDivElement>} props
 */
const Card = ({ className = '', children, ...rest }) => (
  <div
    className={[
      'rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm',
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
);

/**
 * Optional header section inside a Card.
 *
 * @param {{ className?: string, children: React.ReactNode }} props
 */
Card.Header = ({ className = '', children }) => (
  <div className={['px-5 py-4 border-b border-zinc-800', className].join(' ')}>
    {children}
  </div>
);

/**
 * Main content body inside a Card.
 *
 * @param {{ className?: string, children: React.ReactNode }} props
 */
Card.Body = ({ className = '', children }) => (
  <div className={['px-5 py-4', className].join(' ')}>
    {children}
  </div>
);

/**
 * Optional footer section inside a Card.
 *
 * @param {{ className?: string, children: React.ReactNode }} props
 */
Card.Footer = ({ className = '', children }) => (
  <div className={['px-5 py-4 border-t border-zinc-800', className].join(' ')}>
    {children}
  </div>
);

export default Card;
