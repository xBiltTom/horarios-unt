"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUserRole, getCurrentUserEmail, logout } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

const mainItems = [{ href: "/dashboard", label: "Dashboard" }];

const adminItems = [
  { href: "/admin/facultades", label: "Facultades" },
  { href: "/admin/departamentos", label: "Departamentos" },
  { href: "/admin/escuelas", label: "Escuelas" },
  { href: "/admin/aulas", label: "Aulas" },
  { href: "/admin/laboratorios", label: "Laboratorios" },
  { href: "/admin/docentes", label: "Docentes" },
  { href: "/admin/semestres", label: "Semestres" },
  { href: "/admin/plan-estudios", label: "Plan de Estudios" },
];

const directorItems = [{ href: "/director/cursos", label: "Cursos" }];

const secretariaItems = [
  { href: "/secretaria/asignaciones", label: "Asignaciones" },
  { href: "/secretaria/horarios", label: "Fase de horarios" },
  { href: "/secretaria/reportes", label: "Reportes Globales" },
  { href: "/documentos", label: "Documentos" },
];

const docenteItems = [
  { href: "/docente/horario", label: "Mi horario" },
  { href: "/docente/declaracion", label: "Declaración Jurada" },
  { href: "/docente/reportes", label: "Reportes y Descargas" }
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center h-7 px-2.5 rounded-[5px] text-sm transition-all duration-150",
        active
          ? "bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-600/20"
          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] font-normal"
      )}
    >
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-500/70 dark:text-indigo-400/50 select-none">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setRole(getCurrentUserRole());
    setEmail(getCurrentUserEmail());
    setMounted(true);
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const isAdmin = role === "admin";
  const isDirector = role === "admin" || role === "director";
  const isSecretaria = role === "admin" || role === "director" || role === "secretaria";
  const isDocente = role === "docente";

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    director: "Director",
    secretaria: "Secretaría",
    docente: "Docente",
  };

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-black/8 dark:border-white/7 bg-zinc-50 dark:bg-zinc-950">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-black/8 dark:border-white/7 shrink-0">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          UNT Horarios
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {mainItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {isAdmin && (
          <>
            <SectionLabel>Administración</SectionLabel>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {isDirector && (
          <>
            <SectionLabel>Director</SectionLabel>
            {directorItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {isSecretaria && (
          <>
            <SectionLabel>Secretaría</SectionLabel>
            {secretariaItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}

        {isDocente && (
          <>
            <SectionLabel>Docente</SectionLabel>
            {docenteItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-black/8 dark:border-white/7 p-2 shrink-0">
        <div className="px-2.5 py-2 mb-0.5">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate leading-tight">
            {email ?? "..."}
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
            {role ? (roleLabel[role] ?? role) : "..."}
          </p>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center justify-between h-7 px-2.5 rounded-[5px] text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150 mb-0.5"
          >
            <span>Apariencia</span>
            {theme === "dark"
              ? <Sun className="w-3.5 h-3.5" />
              : <Moon className="w-3.5 h-3.5" />
            }
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center h-7 px-2.5 rounded-[5px] text-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
