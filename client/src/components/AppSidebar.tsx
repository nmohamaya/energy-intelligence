import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Server,
  Brain,
  Cpu,
  BarChart3,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/fleet", label: "Asset Fleet", icon: Server },
  { path: "/maintenance", label: "Predictive Maintenance", icon: Brain },
  { path: "/digital-twin", label: "Digital Twin", icon: Cpu },
  { path: "/analytics", label: "Energy Analytics", icon: BarChart3 },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 flex-shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-2 px-4 h-14 border-b border-sidebar-border flex-shrink-0", collapsed && "justify-center px-0")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Energy Intelligence
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto sidebar-scroll">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.path}
                key={item.path}
                data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Bottom controls */}
        <div className={cn("border-t border-sidebar-border p-2 space-y-1", collapsed && "flex flex-col items-center")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn("w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50", collapsed && "w-10 h-10 p-0 justify-center")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!collapsed && <span className="text-sm">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50", collapsed && "w-10 h-10 p-0 justify-center")}
            data-testid="button-collapse-sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background" data-testid="main-content">
        {children}
      </main>
    </div>
  );
}
