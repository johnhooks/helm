import type { CSSProperties, ReactNode } from "react";

export interface AppRootProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function AppRoot({ children, className, style }: AppRootProps) {
  const classNames = ["helm-app-root", className].filter(Boolean).join(" ");

  return (
    <div className={classNames} style={style}>
      {children}
    </div>
  );
}
