import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Send, 
  Users, 
  Settings, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Upload, label: 'Upload Contacts', path: '/upload' },
  { icon: Users, label: 'Contact Lists', path: '/lists' },
  { icon: Rocket, label: 'Campaigns', path: '/campaigns' },
  { icon: FileText, label: 'Templates', path: '/templates' },
  { icon: Mail, label: 'Drafts', path: '/drafts' },
  { icon: Send, label: 'Sent Emails', path: '/sent' },
  { icon: Building2, label: 'Sender Accounts', path: '/accounts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out",
        "shadow-elegant",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex items-center p-5 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="relative">
            <img 
              src="/favicon.jpeg" 
              alt="Samaveda Capital" 
              className={cn(
                "rounded-lg object-cover shadow-elegant transition-all duration-300",
                collapsed ? "w-10 h-10" : "w-11 h-11"
              )}
            />
            <div className="absolute inset-0 rounded-lg ring-1 ring-primary/20" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
                SAM
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Samaveda Capital
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          // Add separator before Settings
          const showSeparator = item.label === 'Settings';
          
          return (
            <div key={item.path}>
              {showSeparator && (
                <Separator className="my-3 bg-sidebar-border" />
              )}
              <NavLink
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <item.icon className={cn(
                  "w-[18px] h-[18px] transition-colors flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && (
                  <span className="text-sm">{item.label}</span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-3 border-t border-sidebar-border",
        collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between"
      )}>
        <ThemeToggle className={collapsed ? "" : ""} />
        
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
        
        {!collapsed && (
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            v1.0
          </div>
        )}
      </div>
    </aside>
  );
}
