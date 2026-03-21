import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div
      className="px-8 flex items-center justify-between border-b backdrop-blur-lg"
      style={{
        borderColor: "rgba(109, 98, 243, 0.12)",
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 255, 0.90))",
        height: "72px",
        boxShadow: "0 8px 24px rgba(48, 61, 92, 0.04)",
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
