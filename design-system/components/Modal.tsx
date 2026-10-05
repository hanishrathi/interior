import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';

export interface ModalProps {
  open: boolean;
  /** Called when the user dismisses the dialog (close button or Escape). */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Dialog actions, e.g. Cancel / Confirm buttons. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
  className?: string;
}

/**
 * Modal dialog built on the native `<dialog>` element: `showModal()` provides focus
 * containment, Escape to close, an inert background and focus return for free.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeLabel = 'Close',
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The native `close` event fires for Escape, the close button and programmatic closes;
  // only report it while the parent still considers the dialog open.
  const handleClose = () => {
    if (open) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={cx('cd-modal', `cd-modal--${size}`, className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
    >
      <div className="cd-modal__header">
        <h2 id={titleId} className="cd-modal__title">
          {title}
        </h2>
        <button type="button" className="cd-modal__close" aria-label={closeLabel} onClick={() => dialogRef.current?.close()}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {description ? (
        <p id={descriptionId} className="cd-modal__description">
          {description}
        </p>
      ) : null}
      {children ? <div className="cd-modal__body">{children}</div> : null}
      {footer ? <div className="cd-modal__footer">{footer}</div> : null}
    </dialog>
  );
}
