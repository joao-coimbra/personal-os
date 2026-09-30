import type { SVGProps } from "react";

/** Google Calendar product mark. */
const GoogleCalendar = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 48 48">
    <title>Google Calendar</title>
    <path
      d="M39 12H9a3 3 0 0 0-3 3v24a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3V15a3 3 0 0 0-3-3Z"
      fill="#F8F9FA"
    />
    <path d="M9 12h30v8H9z" fill="#1A73E8" />
    <path d="M39 12H9a3 3 0 0 0-3 3v3h36v-3a3 3 0 0 0-3-3Z" fill="#185ABC" />
    <path
      d="M16 8a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2Zm16 0a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2Z"
      fill="#185ABC"
    />
    <path
      d="M24.5 27.75c1.2 0 1.95-.6 1.95-1.45 0-.8-.55-1.3-1.55-1.3h-2.5v-1.55h2.35c.9 0 1.4-.5 1.4-1.25 0-.7-.55-1.2-1.4-1.2-.8 0-1.35.4-1.55 1.05l-1.55-.65c.4-1.15 1.5-1.9 3.15-1.9 1.85 0 3.1 1 3.1 2.35 0 .95-.6 1.7-1.5 2.05.95.3 1.7 1.1 1.7 2.25 0 1.55-1.35 2.6-3.4 2.6-1.75 0-3-.85-3.4-2.1l1.6-.65c.25.75.9 1.25 1.9 1.25Z"
      fill="#1A73E8"
    />
    <path d="M6 18h3v24H9a3 3 0 0 1-3-3V18Z" fill="#EA4335" />
    <path d="M39 18h3v21a3 3 0 0 1-3 3h-3V18Z" fill="#34A853" />
    <path d="M6 39h36v3H9a3 3 0 0 1-3-3Z" fill="#FBBC04" />
  </svg>
);

export { GoogleCalendar };
