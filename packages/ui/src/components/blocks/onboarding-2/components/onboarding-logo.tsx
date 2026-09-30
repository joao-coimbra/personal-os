import { cn } from "cn";
import { useId } from "react";

export function OnboardingLogo({ className }: { className?: string }) {
  const reactId = useId().replaceAll(":", "");
  const bgId = `pos-onboard2-bg-${reactId}`;
  const ringId = `pos-onboard2-ring-${reactId}`;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        aria-hidden="true"
        className="size-7 shrink-0"
        fill="none"
        role="presentation"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={bgId}
            x1="8"
            x2="56"
            y1="6"
            y2="58"
          >
            <stop stopColor="#0F766E" />
            <stop offset="1" stopColor="#134E4A" />
          </linearGradient>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={ringId}
            x1="18"
            x2="48"
            y1="14"
            y2="50"
          >
            <stop stopColor="#99F6E4" />
            <stop offset="1" stopColor="#5EEAD4" />
          </linearGradient>
        </defs>
        <rect fill={`url(#${bgId})`} height="64" rx="16" width="64" />
        <rect
          fill="#042F2E"
          fillOpacity="0.35"
          height="48"
          rx="12"
          width="48"
          x="8"
          y="8"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="18"
          ry="11"
          stroke={`url(#${ringId})`}
          strokeOpacity="0.55"
          strokeWidth="2"
          transform="rotate(-28 32 32)"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="18"
          ry="11"
          stroke="#CCFBF1"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          transform="rotate(42 32 32)"
        />
        <circle cx="32" cy="32" fill="#F0FDFA" r="7.5" />
        <circle cx="32" cy="32" fill="#14B8A6" r="3.25" />
        <circle cx="46.5" cy="24" fill="#5EEAD4" r="2.25" />
        <circle cx="21" cy="43.5" fill="#99F6E4" fillOpacity="0.9" r="1.75" />
      </svg>
      <span className="font-medium text-[0.9375rem] tracking-tight">
        PersonalOS
      </span>
    </div>
  );
}
