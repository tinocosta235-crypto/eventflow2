import Link from "next/link";
import { Settings, Users, User, Building2, Mail } from "lucide-react";

const TABS = [
  { href: "/settings/profile", label: "Profilo", icon: User },
  { href: "/settings/org", label: "Organizzazione", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/email", label: "Email", icon: Mail },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
      </div>

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
