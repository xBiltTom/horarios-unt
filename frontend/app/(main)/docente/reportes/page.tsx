"use client";

import { useEffect, useState } from "react";
import { getCurrentUserEmail } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { FileText, FileSpreadsheet, Download, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocenteInfo {
  id: number;
  nombre: string;
  apellidos: string;
  condicion: string;
  modalidad: string;
}

export default function ReportesPage() {
  const [docenteInfo, setDocenteInfo] = useState<DocenteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const email = getCurrentUserEmail();
      if (!email) {
        setLoading(false);
        return;
      }
      try {
        const docente = await apiFetch<DocenteInfo>("/api/docentes/me");
        setDocenteInfo(docente);
      } catch (e) {
        console.error("Error cargando info de docente:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function downloadBlob(path: string, filename: string) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("unt_token") : null;
      const res = await fetch(`${API_BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al descargar archivo");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al descargar el documento. Es posible que aún no hayas generado los datos necesarios o falte configurar firmas.");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  if (!docenteInfo) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
          No se encontró información del docente. Inicia sesión con una cuenta válida.
        </div>
      </div>
    );
  }

  const reportGroups = [
    {
      title: "Mi Horario",
      description: "Descarga la grilla completa con tus horas de carga lectiva y no lectiva.",
      items: [
        { label: "Horario Semanal", url: `/api/documentos/mi-horario/${docenteInfo.id}/pdf`, ext: "pdf", icon: FileText, color: "text-red-500", bg: "bg-red-50" },
        { label: "Horario Editable", url: `/api/documentos/mi-horario/${docenteInfo.id}/excel`, ext: "xlsx", icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" },
      ]
    },
    {
      title: "Formatos Oficiales (PDF)",
      description: "Tus declaraciones juradas actualizadas con los formatos reglamentarios (F-1, F-2 y F-3).",
      items: [
        { label: "Solo Formato 1 (Carga)", url: `/api/carga-no-lectiva/pdf?formato=1`, ext: "pdf", icon: FileText, color: "text-red-500", bg: "bg-red-50" },
        { label: "Solo Formato 2 (Incompatibilidad)", url: `/api/carga-no-lectiva/pdf?formato=2`, ext: "pdf", icon: FileText, color: "text-red-500", bg: "bg-red-50" },
        { label: "Solo Formato 3 (Sedes)", url: `/api/carga-no-lectiva/pdf?formato=3`, ext: "pdf", icon: FileText, color: "text-red-500", bg: "bg-red-50" },
        { label: "Todos los Formatos (1, 2 y 3)", url: `/api/carga-no-lectiva/pdf?formato=all`, ext: "pdf", icon: Download, color: "text-indigo-600", bg: "bg-indigo-50" },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-8 border-b border-black/5 dark:border-white/5 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Reportes y Descargas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
          Aquí puedes descargar tus reportes de horarios y declaraciones juradas en los formatos oficiales de la UNT.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reportGroups.map((group, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 rounded-[10px] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md">
            <div className="p-5 flex-1 flex flex-col">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2.5">{group.title}</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 flex-1">
                {group.description}
              </p>
              
              <div className="space-y-2 mt-auto">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => downloadBlob(item.url, `${item.label.toLowerCase().replace(/\s+/g, "-")}.${item.ext}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-[6px] border border-black/[0.04] dark:border-white/[0.04] hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-[5px] ${item.bg} dark:bg-zinc-800`}>
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      </div>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {item.label}
                      </span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
