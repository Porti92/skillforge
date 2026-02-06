import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TwitterFollowButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export const TwitterFollowButton: React.FC<TwitterFollowButtonProps> = ({
  title = "Follow us on X",
  subtitle,
  size = "md",
  className,
  ...props
}) => {
  const sizes = {
    sm: "p-2.5 rounded-lg",
    md: "p-4 rounded-2xl",
    lg: "p-6 rounded-3xl",
  };

  const iconSizes = {
    sm: "p-1.5",
    md: "p-3",
    lg: "p-4",
  };

  return (
    <a
      {...props}
      className={cn(
        `group relative overflow-hidden border cursor-pointer transition-all duration-500 ease-out
        shadow-lg hover:shadow-zinc-500/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95
        border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black block`,
        sizes[size],
        className
      )}
      style={{ paddingTop: '10px', paddingBottom: '10px', boxSizing: 'border-box', ...props.style }}
    >
      {/* Moving gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>

      {/* Overlay glow */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-zinc-500/10 via-zinc-400/5 to-zinc-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Content */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            "rounded-md bg-white group-hover:bg-zinc-100 transition-all duration-300",
            iconSizes[size]
          )}
        >
          <Image
            src="/X_logo_2023.svg"
            alt="X"
            width={16}
            height={16}
            className="w-4 h-4 transition-all duration-300 group-hover:scale-110"
          />
        </div>

        {/* Texts */}
        <div className="flex-1 text-left">
          <p className="text-zinc-100 font-semibold text-sm whitespace-nowrap group-hover:text-white transition-colors duration-300">
            {title}
          </p>
          {subtitle && (
            <p className="text-zinc-400 text-xs group-hover:text-zinc-300 transition-colors duration-300">
              {subtitle}
            </p>
          )}
        </div>

        {/* Arrow */}
        <div className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
          <svg
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
            className="w-4 h-4 text-zinc-400"
          >
            <path
              d="M9 5l7 7-7 7"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            ></path>
          </svg>
        </div>
      </div>
    </a>
  );
};
