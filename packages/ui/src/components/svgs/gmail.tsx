import type { SVGProps } from "react";

/** Gmail product mark. */
const Gmail = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 48 48">
    <title>Gmail</title>
    <path
      d="M8 10h32a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z"
      fill="#F8F9FA"
    />
    <path
      d="M4 14.5 24 29 44 14.5V14a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v.5Z"
      fill="#EA4335"
    />
    <path d="M4 14.5V34a4 4 0 0 0 4 4h4V20L4 14.5Z" fill="#C5221F" />
    <path d="M44 14.5V34a4 4 0 0 1-4 4h-4V20l8-5.5Z" fill="#C5221F" />
    <path d="M12 38h24V20L24 29 12 20v18Z" fill="#ECEFF1" />
    <path
      d="M4 14.5 24 29 44 14.5"
      fill="none"
      stroke="#EA4335"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
    />
  </svg>
);

export { Gmail };
