import { type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

export const Avatar = ({
  src,
  alt,
  name,
  size = "md",
  status,
  className = "",
}: AvatarProps) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={`fc-avatar fc-avatar-${size} ${className}`.trim()}>
      {src ? (
        <img src={src} alt={alt || name || "Avatar"} className="fc-avatar-img" />
      ) : (
        <span className="fc-avatar-initials" aria-hidden="true">
          {initials}
        </span>
      )}
      {status && (
        <span className={`fc-avatar-status fc-avatar-status-${status}`} aria-label={status} />
      )}
    </div>
  );
};