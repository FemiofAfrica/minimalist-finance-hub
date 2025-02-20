
import {
  Activity,
  CreditCard,
  FileText,
  LayoutDashboard,
  PieChart,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Transactions", icon: Activity, url: "/transactions" },
  { title: "Accounts", icon: Wallet, url: "/accounts" },
  { title: "Cards", icon: CreditCard, url: "/cards" },
  { title: "Analytics", icon: PieChart, url: "/analytics" },
  { title: "Reports", icon: FileText, url: "/reports" },
  { title: "Users", icon: Users, url: "/users" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

const DashboardSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader className="h-[60px] flex items-center px-6">
        <span className="text-xl font-semibold">MoneyWise Pro</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a
                      href={item.url}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
