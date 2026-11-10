import type { ReactNode } from 'react';

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const BoltIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M13 2 4.5 13.5H11L10 22l9-12h-6.5L13 2Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icon>
);

export const SlidersIcon = () => (
  <Icon>
    <path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icon>
);

export const ChevronLeftIcon = () => (
  <Icon>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const ChevronRightIcon = () => (
  <Icon>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon size={16}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
  </Icon>
);

export const AlertIcon = () => (
  <Icon>
    <path d="M12 3 2.5 19.5h19L12 3Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </Icon>
);
