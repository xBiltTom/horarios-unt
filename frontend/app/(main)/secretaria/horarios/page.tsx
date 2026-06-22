"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

interface DocenteBasic { id: number; nombre: string; apellidos: string; modalidad: string }
interface ColaItem { id: number; orden: number; estado: string; turno_inicio: string | null; turno_fin: string | null; docente: DocenteBasic }
interface Fase { id: number; semestre_id: number; estado: string; colas: ColaItem[] }
interface Semestre { id: number; anio: number; numero: string; activo: boolean }

const ESTADO_COLORS: Record<string, string> = {
  pendiente:  "bg-zinc-100 dark:bg-white/5 text-zinc-500",
  activo:     "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-400 ring-1 ring-emerald-500/20",
  completado: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400 ring-1 ring-indigo-500/20",
};
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  completado: "Completado",
};

function formatDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SecretariaHorariosPage() {
  const [semestre, setSemestre] = useState<Semestre | null>(null);
  const [fase, setFase] = useState<Fase | null>(null);
  const [loading, setLoading] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    const [sRes, fRes] = await Promise.allSettled([
      apiFetch<Semestre>("/api/semestres/activo"),
      apiFetch<Fase>("/api/horarios/fase"),
    ]);
    if (sRes.status === "fulfilled") setSemestre(sRes.value);
    if (fRes.status === "fulfilled") setFase(fRes.value);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/horarios");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tipo === "fase_iniciada" || data.tipo === "turno_avanzado") {
        setFase(data.fase as Fase);
      } else if (data.tipo === "fase_limpiada") {
        setFase(null);
      } else if (data.tipo === "bloques_reloaded") {
        // Just triggering a re-render or data re-fetch if we had local state
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  async function handleIniciar() {
    setIniciando(true);
    setError(null);
    try {
      const f = await apiFetch<Fase>("/api/horarios/iniciar", { method: "POST" });
      setFase(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar la fase");
    } finally {
      setIniciando(false);
    }
  }

  async function handleAutoFill() {
    if (!confirm("¿Estás seguro de que quieres sobreescribir todos los horarios actuales con la Fuente de Verdad?")) return;
    setAutoFilling(true);
    setError(null);
    try {
      await apiFetch("/api/horarios/auto-fill", { method: "POST" });
      alert("Horario auto-llenado exitosamente. Revisa la grilla de horarios.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al auto-llenar el horario");
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleLimpiar() {
    if (!confirm("¿Seguro que deseas detener la fase y eliminar todos los horarios generados?")) return;
    setIniciando(true);
    setError(null);
    try {
      await apiFetch("/api/horarios/fase", { method: "DELETE" });
      setFase(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al limpiar la fase");
    } finally {
      setIniciando(false);
    }
  }

  if (loading) {
    return <div className="flex flex-col h-full"><div className="px-8 py-12 text-sm text-zinc-500">Cargando...</div></div>;
  }

  const colasOrdenadas = fase ? [...fase.colas].sort((a, b) => a.orden - b.orden) : [];
  const docenteActivo = colasOrdenadas.find((c) => c.estado === "activo");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Fase de Horarios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {semestre ? `Semestre ${semestre.numero} ${semestre.anio}` : "Sin semestre activo"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fase && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_COLORS[fase.estado]}`}>
              {ESTADO_LABEL[fase.estado]}
            </span>
          )}
          {semestre && fase && (
            <button onClick={handleLimpiar} disabled={iniciando || autoFilling} className="h-8 px-3.5 border border-red-500/30 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">
              Detener Fase
            </button>
          )}
          {semestre && (
            <button onClick={handleAutoFill} disabled={autoFilling || iniciando} className="h-8 px-3.5 border border-orange-500/30 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">
              {autoFilling ? "Llenando..." : "Llenar Horario de Prueba"}
            </button>
          )}
          {semestre && (
            <button onClick={handleIniciar} disabled={iniciando || autoFilling} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">
              {iniciando ? "Iniciando..." : fase ? "Reiniciar fase" : "Iniciar fase"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {error && <div className="mb-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        {!semestre && <div className="mb-5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-3">No hay semestre activo. Activa uno primero.</div>}

        {!fase ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-sm gap-2">
            <p>La fase de horarios no ha sido iniciada.</p>
            {semestre && <p>Presiona <span className="text-zinc-600 dark:text-zinc-300 font-medium">&ldquo;Iniciar fase&rdquo;</span> para comenzar.</p>}
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {docenteActivo && (
              <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-[8px] px-5 py-4">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-1">Turno activo</p>
                <p className="text-sm text-zinc-800 dark:text-zinc-100 font-medium">
                  {docenteActivo.docente.apellidos}, {docenteActivo.docente.nombre}
                  <span className="ml-2 text-zinc-400 font-normal">— {docenteActivo.docente.modalidad}</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDateTime(docenteActivo.turno_inicio)} – {formatDateTime(docenteActivo.turno_fin)}
                </p>
              </div>
            )}
            {fase.estado === "completado" && (
              <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-[8px] px-5 py-4">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Fase completada</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Todos los docentes han construido su horario.</p>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Cola de docentes ({colasOrdenadas.length})</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-0 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Docente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Modalidad</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Inicio</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {colasOrdenadas.map((cola) => (
                    <tr key={cola.id} className={`border-b border-black/[0.04] dark:border-white/5 transition-colors duration-150 ${cola.estado === "activo" ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "hover:bg-zinc-50 dark:hover:bg-white/[0.02]"}`}>
                      <td className="py-3.5 text-sm text-zinc-500 font-medium">{cola.orden}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{cola.docente.apellidos}, {cola.docente.nombre}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{cola.docente.modalidad}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[cola.estado]}`}>
                          {ESTADO_LABEL[cola.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-zinc-500">{formatDateTime(cola.turno_inicio)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-500">{formatDateTime(cola.turno_fin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
