import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function SearchIcon({ size = 20, strokeWidth = 2, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <circle cx="11" cy="11" r="7.5" />
      <line x1="16.6" y1="16.6" x2="21.5" y2="21.5" />
    </svg>
  );
}

export function PersonIcon({ size = 20, strokeWidth = 2, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  );
}

export function PlusIcon({ size = 20, strokeWidth = 2.2, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, strokeWidth = 2.4, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <polyline points="6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, strokeWidth = 2.4, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <polyline points="9.5 6 15.5 12 9.5 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 16, strokeWidth = 2.4, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <polyline points="14.5 6 8.5 12 14.5 18" />
    </svg>
  );
}

export function XMarkIcon({ size = 16, strokeWidth = 2.4, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function CheckIcon({ size = 18, strokeWidth = 2.6, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <polyline points="4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

export function TrashIcon({ size = 18, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l1 12.2A1.8 1.8 0 0 0 9.3 21h5.4a1.8 1.8 0 0 0 1.8-1.8l1-12.2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function PencilIcon({ size = 18, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M4 20l0.8-3.6L16.4 4.8a2 2 0 0 1 2.8 0l0 0a2 2 0 0 1 0 2.8L7.6 19.2z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  );
}

export function CameraIcon({ size = 18, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.6l1.5-2.2A1.5 1.5 0 0 1 9.85 4h4.3a1.5 1.5 0 0 1 1.25.8L16.9 7h2.6A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.7" r="3.4" />
    </svg>
  );
}

export function RepeatIcon({ size = 18, strokeWidth = 1.9, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <path d="M17.5 3.5 21 7l-3.5 3.5" />
      <path d="M21 7H8a4.5 4.5 0 0 0-4.5 4.5" />
      <path d="M6.5 20.5 3 17l3.5-3.5" />
      <path d="M3 17h13a4.5 4.5 0 0 0 4.5-4.5" />
    </svg>
  );
}

export function CalendarIcon({ size = 18, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
    </svg>
  );
}

export function ListIcon({ size = 18, strokeWidth = 2, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base(size)} strokeWidth={strokeWidth} style={style}>
      <line x1="8.5" y1="6" x2="20" y2="6" />
      <line x1="8.5" y1="12" x2="20" y2="12" />
      <line x1="8.5" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="0.8" fill="currentColor" />
      <circle cx="4.5" cy="12" r="0.8" fill="currentColor" />
      <circle cx="4.5" cy="18" r="0.8" fill="currentColor" />
    </svg>
  );
}
