import { Sidebar } from "@/components/sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
