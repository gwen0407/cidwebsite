import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { CheckCircle2, LogOut, PanelLeft } from "lucide-react";
import { useLocation } from "wouter";
import { LucideIcon } from "lucide-react";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type AppLayoutProps = {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
};

export default function AppLayout({ children, navItems, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutInner navItems={navItems} title={title}>
        {children}
      </AppLayoutInner>
    </SidebarProvider>
  );
}

function AppLayoutInner({ children, navItems, title }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      {/* ----------------------------------------------------------------
          Sidebar
      ---------------------------------------------------------------- */}
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="h-16 justify-center px-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors shrink-0"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
            {!isCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded-md object-contain shrink-0" />
                <span className="font-semibold text-sm text-sidebar-foreground truncate">{title}</span>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-2">
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-10 font-normal transition-all"
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"}`} />
                    <span className={isActive ? "text-sidebar-foreground font-medium" : "text-sidebar-foreground/80"}>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">{user?.name || "—"}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate mt-1">{user?.email || "—"}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ----------------------------------------------------------------
          Main content
      ---------------------------------------------------------------- */}
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-border px-5 bg-background/95 backdrop-blur sticky top-0 z-40">
          <SidebarTrigger className="h-8 w-8 rounded-lg -ml-1" />
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">
            {navItems.find((n) => location === n.path || (n.path !== "/" && location.startsWith(n.path)))?.label ?? title}
          </span>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
