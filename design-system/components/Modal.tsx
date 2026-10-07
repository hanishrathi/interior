import { useId, useLayoutEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { cx } from './cx';

export interface ModalProps {
  open: boolean;
  /**
   * Called when the user asks to dismiss the dialog (close button or Escape). The dialog
   * stays open until the parent sets `open` to false, so the parent may refuse — for
   * example to confirm discarding unsaved changes first.
   */
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
 * containment, an inert background and focus return. `open` is the single source of
 * truth — the native dialog only opens and closes when it changes.
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

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Unmounting while open (`{open && <Modal open … />}`) would leave focus on <body>;
  // closing first returns it to the element that opened the dialog.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  // Escape asks the parent instead of closing the dialog directly.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!event.cancelable) return; // reported by handleClose
    event.preventDefault();
    onClose();
  };

  // Browsers still close the dialog themselves when Escape is repeated without a user
  // gesture (the cancel event is then not cancelable); report that while the parent
  // considers the dialog open.
  const handleClose = () => {
    if (open) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={cx('cd-modal', `cd-modal--${size}`, className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClose={handleClose}
    >
      <div className="cd-modal__header">
        <h2 id={titleId} className="cd-modal__title">
          {title}
        </h2>
        <button type="button" className="cd-modal__close" aria-label={closeLabel} onClick={onClose}>
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
