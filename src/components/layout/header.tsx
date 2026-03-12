import { ReactNode } from "react";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            placeholder="Cerca..."
            className="h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-44"
          />
        </div>
        <button className="relative h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <Bell className="h-4 w-4 text-gray-500" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600" />
        </button>
      </div>
    </div>
  );
}
