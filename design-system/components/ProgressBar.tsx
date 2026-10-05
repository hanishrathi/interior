import { useId, type ReactNode } from 'react';
import type { StatusTone } from '../utils/status';
import { cx } from './cx';

export interface ProgressBarProps {
  /** Visible label, e.g. "Products verified". */
  label: ReactNode;
  value: number;
  max?: number;
  /** Text shown beside the label and announced to assistive technology, e.g. "3 of 12". */
  valueText?: string;
  tone?: Extract<StatusTone, 'neutral' | 'positive' | 'caution' | 'critical' | 'info'>;
  className?: string;
}

export function ProgressBar({ label, value, max = 100, valueText, tone = 'neutral', className }: ProgressBarProps) {
  const labelId = useId();
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : Math.round((clamped / max) * 100);
  const text = valueText ?? `${percent}%`;
  return (
    <div className={cx('cd-progress', `cd-progress--${tone}`, className)}>
      <div className="cd-progress__header">
        <span id={labelId} className="cd-progress__label">
          {label}
        </span>
        <span className="cd-progress__value">{text}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={text}
        className="cd-progress__track"
      >
        <div className="cd-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
