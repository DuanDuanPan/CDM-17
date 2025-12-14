import type { CSSProperties } from 'react';
import { cx } from '../utils/cx';

export type WatermarkProps = {
  text?: string;
  className?: string;
};

const overlayStyle: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(15,23,42,0.06) 0, rgba(15,23,42,0.06) 10px, transparent 10px, transparent 40px)',
};

export function Watermark({ text = 'CONFIDENTIAL', className }: WatermarkProps) {
  return (
    <div className={cx('relative overflow-hidden min-h-40 bg-surface border border-dashed border-border', className)}>
      <div className="absolute inset-0" style={overlayStyle} aria-hidden />
      <div className="relative p-4 text-neutral-900">{text}</div>
    </div>
  );
}

