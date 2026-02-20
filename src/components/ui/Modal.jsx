import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Accessible modal dialog with backdrop.
 * Closes on Escape key and backdrop click.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   size?: 'sm' | 'md' | 'lg',
 *   children: React.ReactNode,
 * }} props
 */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal = ({ isOpen, onClose, title, size = 'md', children }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={[
          'relative z-10 w-full rounded-xl bg-zinc-900 border border-zinc-800',
          'shadow-xl flex flex-col',
          sizeClasses[size],
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 id="modal-title" className="text-base font-semibold text-zinc-100">
              {title}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
