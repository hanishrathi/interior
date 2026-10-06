import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, Modal } from '../../design-system';

/** A page that owns the open state, the way an application would. */
function ShareConcept({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Share concept
      </button>
      <button type="button">Behind the dialog</button>
      <Modal
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Share concept with client"
        description="The client receives the concept presentation for review."
        footer={<Button onClick={() => setOpen(false)}>Keep editing</Button>}
      >
        <p>Two layout options and the material palette are included.</p>
      </Modal>
    </>
  );
}

/** A parent that refuses to close — e.g. while it asks about unsaved changes. */
function UnsavedChanges({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Share concept
      </button>
      <Modal open={open} onClose={onClose} title="Unsaved changes">
        <p>The concept notes have not been saved.</p>
      </Modal>
    </>
  );
}

/** A parent that mounts the dialog only while it is open. */
function MountedWhileOpen({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Share concept
      </button>
      {open ? (
        <Modal
          open
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          title="Share concept with client"
          footer={<Button onClick={() => setOpen(false)}>Keep editing</Button>}
        />
      ) : null}
    </>
  );
}

const dialog = () => page.getByRole('dialog');
const closedDialog = () => page.getByRole('dialog', { includeHidden: true });
const trigger = () => page.getByRole('button', { name: 'Share concept' });

async function openDialog() {
  await trigger().click();
  await expect.element(dialog()).toBeVisible();
}

/** Resolves on the dialog's native `close` event, after React's `onClose` listener has run. */
function nextCloseEvent(): Promise<Event> {
  const element = dialog().element();
  return new Promise((resolve) => element.addEventListener('close', resolve, { once: true }));
}

describe('Modal in a browser', () => {
  it('stays closed until opened, then opens as a named, described modal dialog', async () => {
    await render(<ShareConcept onClose={vi.fn()} />);
    await expect.element(closedDialog()).not.toBeVisible();
    await expect.element(closedDialog()).not.toHaveAttribute('open');

    await openDialog();

    expect(dialog().element().matches(':modal')).toBe(true);
    await expect.element(dialog()).toHaveAccessibleName('Share concept with client');
    await expect.element(dialog()).toHaveAccessibleDescription('The client receives the concept presentation for review.');
  });

  it('opens on mount when rendered open', async () => {
    await render(<Modal open onClose={vi.fn()} title="Approve material sample" />);

    await expect.element(dialog()).toBeVisible();
    expect(dialog().element().matches(':modal')).toBe(true);
  });

  it('moves focus into the dialog and makes the page behind it inert', async () => {
    await render(<ShareConcept onClose={vi.fn()} />);
    const behind = page.getByRole('button', { name: 'Behind the dialog' }).element();

    await openDialog();

    const element = dialog().element();
    await expect.poll(() => element.contains(document.activeElement)).toBe(true);
    behind.focus();
    expect(document.activeElement).not.toBe(behind);
    expect(element.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape, reports the dismissal once and returns focus to the trigger', async () => {
    const onClose = vi.fn();
    await render(<ShareConcept onClose={onClose} />);
    await openDialog();

    const closed = nextCloseEvent();
    await userEvent.keyboard('{Escape}');
    await closed;

    expect(onClose).toHaveBeenCalledOnce();
    await expect.element(closedDialog()).not.toBeVisible();
    await expect.element(trigger()).toHaveFocus();
  });

  it('closes from the close button and reports the dismissal once', async () => {
    const onClose = vi.fn();
    await render(<ShareConcept onClose={onClose} />);
    await openDialog();

    const closed = nextCloseEvent();
    await page.getByRole('button', { name: 'Close' }).click();
    await closed;

    expect(onClose).toHaveBeenCalledOnce();
    await expect.element(closedDialog()).not.toBeVisible();
    await expect.element(trigger()).toHaveFocus();
  });

  it('does not report a dismissal when the parent closes it', async () => {
    const onClose = vi.fn();
    await render(<ShareConcept onClose={onClose} />);
    await openDialog();

    const closed = nextCloseEvent();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await closed;

    expect(onClose).not.toHaveBeenCalled();
    await expect.element(closedDialog()).not.toBeVisible();
    await expect.element(trigger()).toHaveFocus();
  });

  it('stays open while the parent keeps it open', async () => {
    const onClose = vi.fn();
    await render(<UnsavedChanges onClose={onClose} />);
    await openDialog();

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
    await page.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledTimes(2);

    // Both requests went to the parent, which kept the dialog open.
    await expect.element(dialog()).toBeVisible();
    expect(dialog().element().matches(':modal')).toBe(true);
  });

  it('returns focus to the trigger when it is unmounted while open', async () => {
    const onClose = vi.fn();
    await render(<MountedWhileOpen onClose={onClose} />);

    await openDialog();
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect.element(closedDialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();

    await openDialog();
    await userEvent.keyboard('{Escape}');
    await expect.element(closedDialog()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
    expect(onClose).toHaveBeenCalledOnce(); // Escape only; unmounting is not a dismissal
  });

  it('opens again after being dismissed', async () => {
    await render(<ShareConcept onClose={vi.fn()} />);
    await openDialog();
    const closed = nextCloseEvent();
    await userEvent.keyboard('{Escape}');
    await closed;

    await openDialog();

    expect(dialog().element().matches(':modal')).toBe(true);
  });
});
