import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "./ThemeProvider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ify-main">{children}</main>
      </div>
    </ThemeProvider>
  );
}
