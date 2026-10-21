import type { SVGProps } from "react";

const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const BagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></svg>
);
export const FilterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);
export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="m15 5-7 7 7 7" /></svg>
);
export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="m9 5 7 7-7 7" /></svg>
);
export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
);
export const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".8" fill="currentColor" /></svg>
);
export const WhatsAppIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19L4 20Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.4-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2L9 9.5Z" /></svg>
);
export const CopyIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
);
export const ZoomIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4M11 8v6M8 11h6" /></svg>
);
