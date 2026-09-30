import type { SVGProps } from "react";

/** Official Trello mark (Atlassian blue). */
const Trello = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <title>Trello</title>
    <path
      d="M21.212 0H2.788C1.246 0 0 1.246 0 2.788v18.424C0 22.754 1.246 24 2.788 24h18.424C22.754 24 24 22.754 24 21.212V2.788C24 1.246 22.754 0 21.212 0ZM10.42 19.474a1.274 1.274 0 0 1-1.274 1.275H4.526a1.274 1.274 0 0 1-1.274-1.275V4.526A1.274 1.274 0 0 1 4.526 3.252h4.62A1.274 1.274 0 0 1 10.42 4.526Zm10.329-6.5a1.275 1.275 0 0 1-1.275 1.275h-4.62a1.274 1.274 0 0 1-1.274-1.275V4.526A1.274 1.274 0 0 1 14.854 3.252h4.62a1.275 1.275 0 0 1 1.275 1.274Z"
      fill="#0052CC"
    />
  </svg>
);

export { Trello };
