import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
