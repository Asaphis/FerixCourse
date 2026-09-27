"use client";
import type { CSSProperties } from "react";

/*
  One icon set for the whole console.

  The console previously used lucide-react. That is a fine library, but the
  learner dashboard already ships its own 24x24 grid icon component, and having
  two different icon systems across two sides of the same product is exactly
  the kind of drift this task exists to remove. Same grid (24x24), same stroke
  weight (1.9), same line-caps as the learner side.
*/

const paths: Record<string, string> = {
  grid: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  users:
    "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1.5a4 4 0 0 0-3-3.87M16.5 3.6a4 4 0 0 1 0 7.75",
  bookOpen: "M12 7v13M3.5 5.5A2.5 2.5 0 0 1 6 3h4.5a1.5 1.5 0 0 1 1.5 1.5V20a2 2 0 0 0-2-2H6a2.5 2.5 0 0 1-2.5-2.5zM20.5 5.5A2.5 2.5 0 0 0 18 3h-4.5A1.5 1.5 0 0 0 12 4.5V20a2 2 0 0 1 2-2h4a2.5 2.5 0 0 0 2.5-2.5z",
  radio: "M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM6.5 6.5a8 8 0 0 0 0 11M17.5 6.5a8 8 0 0 1 0 11M9.5 9.5a4 4 0 0 0 0 5M14.5 9.5a4 4 0 0 1 0 5",
  monitorPlay: "M3 5h18v11H3zM8 20h8M12 16v4M10 8.5l4 2.5-4 2.5z",
  video: "M15 8.5 21.5 5v14L15 15.5zM3 6.5A1.5 1.5 0 0 1 4.5 5h9A1.5 1.5 0 0 1 15 6.5v11A1.5 1.5 0 0 1 13.5 19h-9A1.5 1.5 0 0 1 3 17.5z",
  screenShare: "M3 5h18v11H3zM8 20h8M12 16v4M12 8v5M9.5 10.5 12 8l2.5 2.5",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3",
  micOff: "M15 9V6a3 3 0 0 0-5.9-.7M9 10.4V12a3 3 0 0 0 5.6 1.4M5.5 11.5a6.5 6.5 0 0 0 10 5.5M12 18v3M3 3l18 18",
  cameraOff: "M15 9.5V6.5A1.5 1.5 0 0 0 13.5 5h-5M3 3l18 18M3 6.5A1.5 1.5 0 0 1 4.5 5M8.4 19h5.1a1.5 1.5 0 0 0 1.5-1.5v-4.4M15 12.5 21.5 5v14L18 16",
  inbox: "M3 12h4l2 3h6l2-3h4M5 5h14l2 7v7H3v-7z",
  calendarCheck: "M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5zM8 3v4M16 3v4M3.5 10h17M9 15.5l2 2 4-4",
  receipt: "M6 3h12v18l-2.5-1.5L13 21l-1-1.5L11 21l-2.5-1.5L6 21zM9.5 8h5M9.5 12h5",
  disc: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  folder: "M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l2 2.5h7.8A2.5 2.5 0 0 1 21 10v7.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z",
  messageSquare: "M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.8-.4L4 21l1.2-4.2A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z",
  bell: "M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5M13.7 20a2 2 0 0 1-3.4 0",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1A1.7 1.7 0 0 0 2.6 15H2.4a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3.7 8l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 2.9-1.2V3.7a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1.1Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 13.2A9 9 0 1 1 10.8 3a7 7 0 1 0 10.2 10.2Z",
  logOut: "M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
  refresh: "M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 4v5h-5",
  alertCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16.5h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.5h.01",
  trash: "M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  play: "M6 4l14 8-14 8z",
  pause: "M9 5v14M15 5v14",
  stop: "M6 6h12v12H6z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  usersPlus:
    "M14 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M8.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 8v6M16 11h6",
  shield: "M12 21c5-2 8-5.5 8-10V5.8L12 3 4 5.8V11c0 4.5 3 8 8 10Z",
  activity: "M3 12h4l2.5-7 4 14L16 12h5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2",
  calendar: "M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5zM8 3v4M16 3v4M3.5 10h17",
  graduationCap: "M22 9 12 4 2 9l10 5zM6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5M22 9v6",
  dollar: "M12 2v20M17 6.5A4 4 0 0 0 13.5 4h-3a3.5 3.5 0 0 0 0 7h3a3.5 3.5 0 0 1 0 7h-3A4 4 0 0 1 7 17.5",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z",
  layers: "M12 2.5 2.5 7.5 12 12.5l9.5-5zM2.5 16.5 12 21.5l9.5-5M2.5 12 12 17l9.5-5",
  fileText: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9.5 13h5M9.5 17h5",
  upload: "M12 16V4M7.5 8.5 12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  download: "M12 4v12M7.5 11.5 12 16l4.5-4.5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1ZM14 7.5a5 5 0 0 1 0 9M17 5a8.5 8.5 0 0 1 0 14",
  clipboard: "M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 12h6M9 16h4",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  lock: "M5 11h14v10H5zM8 11V7.5a4 4 0 0 1 8 0V11",
  user: "M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5z",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5 15l.7 1.6 1.6.7-1.6.7L5 19.6l-.7-1.6L2.7 17.3l1.6-.7z",
  menu: "M3 6h18M3 12h18M3 18h18",
  filter: "M3 5h18l-7 8v6l-4-2v-4z",
  moreVertical: "M12 6.5h.01M12 12h.01M12 17.5h.01",
};

export type IconName = keyof typeof paths | string;

export function Icon({
  name,
  size = 18,
  style,
  className,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
  className?: string;
  strokeWidth?: number;
}) {
  const d = paths[name];
  /* An unknown name renders nothing rather than a broken box, and in dev the
     console warns so a typo is caught immediately. */
  if (!d) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[admin] Unknown icon: "${name}"`);
    }
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <path d={d} />
    </svg>
  );
}

export const iconNames = Object.keys(paths);
