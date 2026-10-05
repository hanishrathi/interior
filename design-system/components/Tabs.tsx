import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** Accessible name of the tab list, e.g. "Room details". */
  label: string;
  /** Controlled selected tab id. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/**
 * WAI-ARIA tabs with automatic activation: Arrow keys move between tabs, Home/End jump
 * to the first/last tab, and only the selected tab is in the tab order.
 */
export function Tabs({ items, label, value, defaultValue, onChange, className }: TabsProps) {
  const baseId = useId();
  const enabled = items.filter((item) => !item.disabled);
  const [internalValue, setInternalValue] = useState(defaultValue ?? enabled[0]?.id);
  const selected = value ?? internalValue;
  const focusableId = enabled.some((item) => item.id === selected) ? selected : enabled[0]?.id;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const select = (id: string) => {
    if (value === undefined) setInternalValue(id);
    onChange?.(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = enabled.findIndex((item) => item.id === id);
    const targets: Record<string, TabItem | undefined> = {
      ArrowRight: enabled[(index + 1) % enabled.length],
      ArrowLeft: enabled[(index - 1 + enabled.length) % enabled.length],
      Home: enabled[0],
      End: enabled[enabled.length - 1],
    };
    if (!(event.key in targets)) return;
    const next = targets[event.key];
    event.preventDefault();
    if (!next) return;
    tabRefs.current.get(next.id)?.focus();
    select(next.id);
  };

  return (
    <div className={cx('cd-tabs', className)}>
      <div role="tablist" aria-label={label} className="cd-tabs__list">
        {items.map((item) => {
          const isSelected = item.id === selected;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={isSelected}
              aria-controls={panelId(item.id)}
              tabIndex={item.id === focusableId ? 0 : -1}
              disabled={item.disabled}
              className={cx('cd-tabs__tab', isSelected && 'cd-tabs__tab--selected')}
              onClick={() => select(item.id)}
              onKeyDown={(event) => handleKeyDown(event, item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={panelId(item.id)}
          aria-labelledby={tabId(item.id)}
          hidden={item.id !== selected}
          tabIndex={0}
          className="cd-tabs__panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
