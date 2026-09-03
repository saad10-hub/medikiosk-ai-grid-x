import { Logo } from '@/components/Logo';
import { LayoutDashboard, Users, AlertTriangle, FileText, Calendar, Settings, LogOut, Stethoscope } from 'lucide-react';
import type { Profile } from '@/types';

interface DoctorLayoutProps {
  profile: Profile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'patients', label: 'Patients', icon: Users },
  { key: 'alerts', label: 'Priority Alerts', icon: AlertTriangle },
  { key: 'histories', label: 'Clinical Histories', icon: FileText },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'timeline', label: 'Medical Timeline', icon: Calendar },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function DoctorLayout({ profile, activeTab, onTabChange, onSignOut, children }: DoctorLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-neutral-200">
          <Logo size="sm" />
        </div>

        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-neutral-500 capitalize">{profile.role}{profile.department ? ` • ${profile.department}` : ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.key
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-200">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-error-50 hover:text-error-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
