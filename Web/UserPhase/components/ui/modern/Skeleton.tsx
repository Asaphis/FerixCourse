import { type ReactNode } from "react";

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "avatar";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = ({ variant = "text", width, height, className = "" }: SkeletonProps) => {
  const baseStyle: React.CSSProperties = {};
  if (width) baseStyle.width = typeof width === "number" ? `${width}px` : width;
  if (height) baseStyle.height = typeof height === "number" ? `${height}px` : height;

  const variantStyles = {
    text: "fc-skel fc-skel-text",
    circular: "fc-skel fc-skel-circular",
    rectangular: "fc-skel fc-skel-rectangular",
    avatar: "fc-skel fc-skel-avatar",
  };

  return <div className={`${variantStyles[variant]} ${className}`.trim()} style={baseStyle} aria-hidden="true" />;
};