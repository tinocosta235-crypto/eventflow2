import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div
      className="px-8 flex items-center justify-between border-b border-white/10 bg-slate-950/35 backdrop-blur-lg"
      style={{
        height: "72px",
      }}
    >
      <div>
        <h1 className="text-[17px] font-semibold leading-tight tracking-wide" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
