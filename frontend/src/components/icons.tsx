// Ícones em SVG inline: sem biblioteca, e herdam a cor do texto (currentColor).

type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function LogoMark({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#0078D4" />
      <path
        d="M9 16.5l4.5 4.5L23 11.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeIcon({ className }: Props) {
  return (
    <svg className={className} {...base}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function CalendarIcon({ className }: Props) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14l2.5 2.5L16 12" />
    </svg>
  );
}

export function TargetIcon({ className }: Props) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function GiftIcon({ className }: Props) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13" />
      <path d="M12 8S10.5 3 8 3.5 6.5 8 12 8zM12 8s1.5-5 4-4.5S17.5 8 12 8z" />
    </svg>
  );
}

export function LogoutIcon({ className }: Props) {
  return (
    <svg className={className} {...base}>
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" />
    </svg>
  );
}
