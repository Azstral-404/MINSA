import { LayoutDashboard, Settings, FileText, Database, Package } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useApp } from '@/contexts/AppContext';
import minsaLogo from '@/assets/minsa-logo.png';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const { data } = useApp();

  const logoSrc = data.settings.customLogo || minsaLogo;
  const appName = data.settings.appName || 'MANAJEMEN SURAT';

  const suratItems = data.settings.jenisSurat.map(js => ({
    title: js.label, url: `/surat/${js.slug}`, icon: FileText,
  }));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
      <SidebarContent>
        <div className="flex flex-col items-center gap-1 px-3 py-4">
          <img src={logoSrc} alt={appName} className={`rounded-full ${collapsed ? 'w-12 h-12' : 'w-36 h-36'} object-cover transition-all`} />
          {!collapsed && (
            <span className="font-bold text-xl text-sidebar-foreground tracking-wide">{appName}</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold tracking-wider uppercase">
            {!collapsed && 'Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {suratItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold tracking-wider uppercase">
              {!collapsed && 'Surat'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {suratItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* FITUR Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold tracking-wider uppercase">
            {!collapsed && 'Fitur'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(data.settings.repositories || []).map((repo: any) => (
                <SidebarMenuItem key={repo.id}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={`/fitur/${repo.id}`} 
                      className="hover:bg-sidebar-accent/50" 
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      title={!repo.installed ? 'Belum terpasang - install via Pengaturan' : undefined}
                    >
                      <Database className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{repo.name}</span>}
                      {!collapsed && !repo.installed && <span className="ml-auto text-xs opacity-50">(off)</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {!(data.settings.repositories || []).length && !collapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild disabled>
                    <span className="text-muted-foreground cursor-not-allowed">
                      <Package className="mr-2 h-4 w-4" />
                      Tidak ada fitur
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="text-center text-[10px] text-muted-foreground py-1">
            © copyright AZSTRAL
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/pengaturan" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                <Settings className="mr-2 h-4 w-4" />
                {!collapsed && <span>Pengaturan</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
