"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "@/lib/api";

interface Semestre { id: number; anio: number; numero: string; activo: boolean }
interface Docente { id: number; nombre: string; apellidos: string; modalidad: string; condicion: string }
interface Aula { id: number; nombre: string }
interface Laboratorio { id: number; nombre: string }

async function downloadBlob(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("unt_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `Error ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DownloadButton({ label, path, filename }: { label: string; path: string; filename: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      await downloadBlob(path, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al descargar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button onClick={handle} disabled={loading} className="h-7 px-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 border border-border hover:border-zinc-300 dark:hover:border-white/18 rounded-[4px] transition-colors duration-150 disabled:opacity-50 active:scale-[0.98]">
        {loading ? "Descargando..." : label}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}

export default function DocumentosPage() {
  const [semestre, setSemestre] = useState<Semestre | null>(null);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [espacioTab, setEspacioTab] = useState<"aulas" | "laboratorios">("aulas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sRes, dRes, aRes, lRes] = await Promise.allSettled([
        apiFetch<Semestre>("/api/semestres/activo"),
        apiFetch<Docente[]>("/api/docentes"),
        apiFetch<Aula[]>("/api/aulas"),
        apiFetch<Laboratorio[]>("/api/laboratorios"),
      ]);
      if (sRes.status === "fulfilled") setSemestre(sRes.value);
      if (dRes.status === "fulfilled") {
        setDocentes([...dRes.value].sort((a, b) => a.apellidos.localeCompare(b.apellidos)));
      }
      if (aRes.status === "fulfilled") setAulas(aRes.value);
      if (lRes.status === "fulfilled") setLaboratorios(lRes.value);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex flex-col h-full"><div className="px-8 py-12 text-sm text-zinc-600">Cargando...</div></div>;
  }

  const semestreLabel = semestre ? `Semestre ${semestre.numero} ${semestre.anio}` : "Sin semestre activo";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Documentos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{semestreLabel}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-7 space-y-10">
        {/* Horario por ciclo */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">Horario por ciclo</h2>
          <p className="text-xs text-zinc-500 mb-4">Horario completo del semestre agrupado por ciclo académico.</p>
          {!semestre ? (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-3">
              No hay semestre activo. Activa uno primero.
            </div>
          ) : (
            <div className="border border-border rounded-[8px] bg-white dark:bg-zinc-900 px-5 py-4 flex flex-wrap gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">PDF (ZIP)</p>
                <DownloadButton
                  label="Descargar ZIP de PDFs"
                  path={`/api/documentos/horario/${semestre.id}/pdf`}
                  filename={`horarios_${semestre.numero}_${semestre.anio}.zip`}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Excel</p>
                <DownloadButton
                  label="Descargar Excel"
                  path={`/api/documentos/horario/${semestre.id}/excel`}
                  filename={`horarios_${semestre.numero}_${semestre.anio}.xlsx`}
                />
              </div>
            </div>
          )}
        </section>

        {/* Horarios por espacio */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">Horarios por espacio</h2>
          <p className="text-xs text-zinc-500 mb-4">Horario semanal de cada aula o laboratorio.</p>
          {!semestre ? (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-3">
              No hay semestre activo.
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-4">
                {(["aulas", "laboratorios"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setEspacioTab(tab)}
                    className={`h-7 px-3 text-xs font-medium rounded-[5px] transition-colors duration-150 capitalize ${
                      espacioTab === tab
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {espacioTab === "aulas" && (
                aulas.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hay aulas registradas.</p>
                ) : (
                  <div className="border border-border rounded-[8px] overflow-hidden bg-white dark:bg-zinc-900">
                    {aulas.map((aula, i) => (
                      <div
                        key={aula.id}
                        className={`flex items-center justify-between px-5 py-3 ${i < aulas.length - 1 ? "border-b border-black/[0.04] dark:border-white/5" : ""}`}
                      >
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{aula.nombre}</span>
                        <div className="flex gap-2">
                          <DownloadButton
                            label="PDF"
                            path={`/api/documentos/horario-por-aula/${semestre.id}/${aula.id}/pdf`}
                            filename={`horario_${aula.nombre.replace(/\s+/g, "_")}.pdf`}
                          />
                          <DownloadButton
                            label="Excel"
                            path={`/api/documentos/horario-por-aula/${semestre.id}/${aula.id}/excel`}
                            filename={`horario_${aula.nombre.replace(/\s+/g, "_")}.xlsx`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {espacioTab === "laboratorios" && (
                laboratorios.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hay laboratorios registrados.</p>
                ) : (
                  <div className="border border-border rounded-[8px] overflow-hidden bg-white dark:bg-zinc-900">
                    {laboratorios.map((lab, i) => (
                      <div
                        key={lab.id}
                        className={`flex items-center justify-between px-5 py-3 ${i < laboratorios.length - 1 ? "border-b border-black/[0.04] dark:border-white/5" : ""}`}
                      >
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{lab.nombre}</span>
                        <div className="flex gap-2">
                          <DownloadButton
                            label="PDF"
                            path={`/api/documentos/horario-por-laboratorio/${semestre.id}/${lab.id}/pdf`}
                            filename={`horario_${lab.nombre.replace(/\s+/g, "_")}.pdf`}
                          />
                          <DownloadButton
                            label="Excel"
                            path={`/api/documentos/horario-por-laboratorio/${semestre.id}/${lab.id}/excel`}
                            filename={`horario_${lab.nombre.replace(/\s+/g, "_")}.xlsx`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </section>

        {/* Declaraciones por docente */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">Declaraciones por docente</h2>
          <p className="text-xs text-zinc-500 mb-4">Formato N°1 (declaración de carga lectiva) y Formato N°2 (declaración jurada) por docente.</p>
          {docentes.length === 0 ? (
            <p className="text-sm text-zinc-600">No hay docentes registrados.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Docente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Modalidad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Condición</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Formato N°1</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Formato N°2</th>
                </tr>
              </thead>
              <tbody>
                {docentes.map((docente) => {
                  const safeName = `${docente.apellidos}_${docente.nombre}`.replace(/\s+/g, "_");
                  return (
                    <tr key={docente.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                      <td className="py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{docente.apellidos}, {docente.nombre}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400">{docente.modalidad}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-500 capitalize">{docente.condicion}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <DownloadButton label="Word" path={`/api/documentos/declaracion/${docente.id}/word`} filename={`declaracion_${safeName}.docx`} />
                          <DownloadButton label="PDF" path={`/api/documentos/declaracion/${docente.id}/pdf`} filename={`declaracion_${safeName}.pdf`} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <DownloadButton label="Word" path={`/api/documentos/declaracion-jurada/${docente.id}/word`} filename={`decl_jurada_${safeName}.docx`} />
                          <DownloadButton label="PDF" path={`/api/documentos/declaracion-jurada/${docente.id}/pdf`} filename={`decl_jurada_${safeName}.pdf`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
