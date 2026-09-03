import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ThemeProvider } from "./ThemeProvider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="ify-main">
          <Topbar />
          <div className="ify-main-content">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}
