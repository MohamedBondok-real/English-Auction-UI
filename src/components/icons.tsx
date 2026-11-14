import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

export const IconSun = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M20.5 15.2A8.5 8.5 0 1 1 8.8 3.5a6.8 6.8 0 0 0 11.7 11.7Z" />
  </svg>
);

export const IconGavel = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M13.6 3.6 20.4 10.4M17.5 6.5l-3.3 3.3M9.9 7.2l6.9 6.9M8.2 8.9l6.9 6.9M6 20.5l7.1-7.1M4.3 20.5h4.4" />
  </svg>
);

export const IconHammer = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14.5 3 8.2 9.3a2 2 0 0 0 0 2.8l3.7 3.7a2 2 0 0 0 2.8 0L21 9.5" />
    <path d="m11 13 -7 7M14 6l4 4" />
  </svg>
);

export const IconArrowUpRight = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const IconArrowRight = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const IconEye = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </svg>
);

export const IconEyeOff = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.6M6.5 7.2C4.2 8.8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 4.2-1.1" />
  </svg>
);

export const IconStar = ({ size, filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8Z" />
  </svg>
);

export const IconClock = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3.2 2" />
  </svg>
);

export const IconPause = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M9 5v14M15 5v14" strokeWidth={2.2} />
  </svg>
);

export const IconPlay = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <path d="M7.5 5.2a1 1 0 0 1 1.5-.86l9 6.8a1 1 0 0 1 0 1.72l-9 6.8a1 1 0 0 1-1.5-.86Z" />
  </svg>
);

export const IconClose = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </svg>
);

export const IconCheck = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconTrend = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 17.5 9.5 11l4 4L21 7.5M21 7.5h-5M21 7.5v5" />
  </svg>
);

export const IconUsers = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.5c0-2.9 2.7-4.8 6-4.8s6 1.9 6 4.8M16.5 5.2a3.2 3.2 0 0 1 0 6M18 14.9c2 .5 3.5 2 3.5 4.6" />
  </svg>
);

export const IconSpark = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
  </svg>
);

export const IconSearch = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconLayers = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3.5 12.2 8.5 4.8 8.5-4.8M3.5 16.4 12 21.2l8.5-4.8" />
  </svg>
);

export const IconChevronDown = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const IconInfo = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.2" />
  </svg>
);

export const IconBolt = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M13 2.5 4.5 13.5H11l-1 8 9-11.5h-6.5Z" />
  </svg>
);

export const IconCommand = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M8.5 4a2.5 2.5 0 1 0 0 5h7a2.5 2.5 0 1 0 0-5M8.5 20a2.5 2.5 0 1 1 0-5h7a2.5 2.5 0 1 1 0 5M9 9v6M15 9v6" />
  </svg>
);
