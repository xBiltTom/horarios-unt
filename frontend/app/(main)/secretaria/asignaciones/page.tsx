"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Departamento { id: number; nombre: string }
interface Docente { id: number; nombre: string; apellidos: string; modalidad: string; departamento: Departamento; usuario: { id: number; email: string; activo: boolean } | null }
interface Escuela { id: number; nombre: string }
interface Curso { id: number; codigo: string; nombre: string; ciclo: number; horas_teoria: number; horas_practica: number; horas_laboratorio: number; escuela: Escuela }
interface TurnoLab { id: number; numero_turno: number; laboratorio_id: number | null }
interface Asignacion { id: number; docente_id: number; curso_id: number; dicta_teoria: boolean; grupos_teoria: number; dicta_practica: boolean; grupos_practica: number; curso: Curso; turnos_laboratorio: TurnoLab[] }
interface CargaItem { id: number; rubro: string; horas_asignadas: number }
interface Semestre { id: number; anio: number; numero: string; activo: boolean }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORAS_MAX: Record<string, number> = { tiempo_completo: 40, tiempo_parcial: 20 };

function horasMax(modalidad: string) { return HORAS_MAX[modalidad] ?? 40; }
function computeHorasLectivas(asigs: Asignacion[]) {
  return asigs.reduce((sum, a) => {
    let h = 0;
    if (a.dicta_teoria) h += a.curso.horas_teoria * a.grupos_teoria;
    if (a.dicta_practica) h += a.curso.horas_practica * a.grupos_practica;
    h += a.curso.horas_laboratorio * a.turnos_laboratorio.length;
    return sum + h;
  }, 0);
}
function computeHorasNoLectivas(carga: CargaItem[]) {
  return carga.reduce((sum, c) => sum + c.horas_asignadas, 0);
}

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="w-full bg-zinc-200 dark:bg-white/5 rounded-full h-1 mt-1">
      <div className={`${color} h-1 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AsignacionesPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [allAsignaciones, setAllAsignaciones] = useState<Asignacion[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [semestreActivo, setSemestreActivo] = useState<Semestre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Docente | null>(null);
  const [docenteAsigs, setDocenteAsigs] = useState<Asignacion[]>([]);
  const [cargaNL, setCargaNL] = useState<CargaItem[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [cForm, setCForm] = useState({ curso_id: "", dicta_teoria: false, grupos_teoria: "1", dicta_practica: false, grupos_practica: "1", num_turnos: "0" });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Asignacion | null>(null);
  const [eForm, setEForm] = useState({ dicta_teoria: false, grupos_teoria: "1", dicta_practica: false, grupos_practica: "1", num_turnos: "0" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Asignacion | null>(null);
  const [deleting, setDeleting] = useState(false);


  async function loadGlobal() {
    setLoading(true);
    setError(null);
    const [dRes, aRes, sRes, cRes] = await Promise.allSettled([
      apiFetch<Docente[]>("/api/docentes"),
      apiFetch<Asignacion[]>("/api/asignaciones"),
      apiFetch<Semestre>("/api/semestres/activo"),
      apiFetch<Curso[]>("/api/cursos"),
    ]);
    if (dRes.status === "fulfilled") setDocentes(dRes.value);
    if (aRes.status === "fulfilled") setAllAsignaciones(aRes.value);
    if (sRes.status === "fulfilled") setSemestreActivo(sRes.value);
    if (cRes.status === "fulfilled") setCursos(cRes.value);
    setLoading(false);
  }

  async function reloadGlobal() {
    const [dRes, aRes] = await Promise.allSettled([
      apiFetch<Docente[]>("/api/docentes"),
      apiFetch<Asignacion[]>("/api/asignaciones"),
    ]);
    if (dRes.status === "fulfilled") setDocentes(dRes.value);
    if (aRes.status === "fulfilled") setAllAsignaciones(aRes.value);
  }

  async function loadPanel(docente: Docente) {
    setLoadingPanel(true);
    const [aRes, cRes] = await Promise.allSettled([
      apiFetch<Asignacion[]>(`/api/asignaciones/docente/${docente.id}`),
      apiFetch<CargaItem[]>(`/api/carga-no-lectiva/docente/${docente.id}`),
    ]);
    if (aRes.status === "fulfilled") setDocenteAsigs(aRes.value);
    if (cRes.status === "fulfilled") setCargaNL(cRes.value);
    setLoadingPanel(false);
  }

  useEffect(() => { loadGlobal(); }, []);

  async function selectDocente(docente: Docente) {
    setSelected(docente);
    setDocenteAsigs([]);
    setCargaNL([]);
    await loadPanel(docente);
  }

  async function handleCreate() {
    if (!selected || !semestreActivo) return;
    if (!cForm.curso_id) { setFormErr("Selecciona un curso"); return; }
    if (!cForm.dicta_teoria && !cForm.dicta_practica && parseInt(cForm.num_turnos) === 0) {
      setFormErr("Selecciona al menos una actividad"); return;
    }
    try {
      setSaving(true);
      setFormErr(null);
      await apiFetch("/api/asignaciones", {
        method: "POST",
        body: JSON.stringify({
          docente_id: selected.id, curso_id: parseInt(cForm.curso_id),
          semestre_id: semestreActivo.id, dicta_teoria: cForm.dicta_teoria, grupos_teoria: parseInt(cForm.grupos_teoria) || 1,
          dicta_practica: cForm.dicta_practica, grupos_practica: parseInt(cForm.grupos_practica) || 1, num_turnos_laboratorio: parseInt(cForm.num_turnos) || 0,
        }),
      });
      setOpenCreate(false);
      setCForm({ curso_id: "", dicta_teoria: false, grupos_teoria: "1", dicta_practica: false, grupos_practica: "1", num_turnos: "0" });
      await Promise.all([loadPanel(selected), reloadGlobal()]);
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(a: Asignacion) {
    setEditTarget(a);
    setEForm({ dicta_teoria: a.dicta_teoria, grupos_teoria: a.grupos_teoria.toString(), dicta_practica: a.dicta_practica, grupos_practica: a.grupos_practica.toString(), num_turnos: a.turnos_laboratorio.length.toString() });
    setEditErr(null);
  }

  async function handleEdit() {
    if (!editTarget || !selected) return;
    try {
      setSavingEdit(true);
      setEditErr(null);
      await apiFetch(`/api/asignaciones/${editTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({ dicta_teoria: eForm.dicta_teoria, grupos_teoria: parseInt(eForm.grupos_teoria) || 1, dicta_practica: eForm.dicta_practica, grupos_practica: parseInt(eForm.grupos_practica) || 1, num_turnos_laboratorio: parseInt(eForm.num_turnos) || 0 }),
      });
      setEditTarget(null);
      await Promise.all([loadPanel(selected), reloadGlobal()]);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !selected) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/asignaciones/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await Promise.all([loadPanel(selected), reloadGlobal()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const asigsByDocente = allAsignaciones.reduce<Record<number, Asignacion[]>>((acc, a) => {
    if (!acc[a.docente_id]) acc[a.docente_id] = [];
    acc[a.docente_id].push(a);
    return acc;
  }, {});

  const horasLectivasSelected = computeHorasLectivas(docenteAsigs);
  const horasNLSelected = computeHorasNoLectivas(cargaNL);
  const totalSelected = horasLectivasSelected + horasNLSelected;
  const maxSelected = selected ? horasMax(selected.modalidad) : 40;
  const selectedCurso = cursos.find((c) => c.id === parseInt(cForm.curso_id));

  if (loading) {
    return <div className="flex flex-col h-full"><div className="px-8 py-12 text-sm text-zinc-600">Cargando...</div></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Asignaciones de carga</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {semestreActivo ? `Semestre ${semestreActivo.numero} ${semestreActivo.anio}` : "Sin semestre activo"}
          </p>
        </div>
      </div>

      {error && <div className="mx-8 mt-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
      {!semestreActivo && <div className="mx-8 mt-4 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-3">No hay semestre activo. Activa uno para gestionar asignaciones.</div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-64 shrink-0 border-r border-border overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Docentes</p>
          </div>
          {docentes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-600">No hay docentes registrados</p>
          ) : (
            <ul>
              {docentes.map((docente) => {
                const asigs = asigsByDocente[docente.id] ?? [];
                const hl = computeHorasLectivas(asigs);
                const max = horasMax(docente.modalidad);
                const isSelected = selected?.id === docente.id;
                return (
                  <li key={docente.id}>
                    <button
                      onClick={() => selectDocente(docente)}
                      className={`w-full text-left px-4 py-3 border-b border-black/[0.04] dark:border-white/4 transition-colors duration-150 ${isSelected ? "bg-indigo-50 dark:bg-white/6 border-l-2 border-l-indigo-600" : "hover:bg-zinc-50 dark:hover:bg-white/[0.03]"}`}
                    >
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{docente.apellidos}, {docente.nombre}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{docente.modalidad} · {docente.departamento.nombre}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-zinc-500">{hl}h / {max}h</span>
                        <span className={`text-xs font-medium ${hl > max ? "text-red-500 dark:text-red-400" : "text-zinc-500"}`}>
                          {max > 0 ? Math.round((hl / max) * 100) : 0}%
                        </span>
                      </div>
                      <ProgressBar value={hl} max={max} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
              Selecciona un docente para ver sus asignaciones
            </div>
          ) : loadingPanel ? (
            <div className="flex h-full items-center justify-center text-zinc-500 text-sm">Cargando...</div>
          ) : (
            <div className="p-6 space-y-7 max-w-4xl">
              {/* Summary */}
              <div className="border border-border rounded-[8px] bg-white dark:bg-zinc-900 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{selected.apellidos}, {selected.nombre}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{selected.modalidad} · {selected.departamento.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{totalSelected}h</p>
                    <p className="text-xs text-zinc-500">de {maxSelected}h máx.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-[6px] bg-blue-500/8 border border-blue-500/15 px-3 py-2 text-center">
                    <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Lectivas</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">{horasLectivasSelected}h</p>
                  </div>
                  <div className="rounded-[6px] bg-violet-500/8 border border-violet-500/15 px-3 py-2 text-center">
                    <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">No lectivas</p>
                    <p className="text-lg font-bold text-violet-700 dark:text-violet-300 tabular-nums">{horasNLSelected}h</p>
                  </div>
                  <div className={`rounded-[6px] px-3 py-2 text-center ${totalSelected > maxSelected ? "bg-red-500/8 border border-red-500/15" : "bg-emerald-500/8 border border-emerald-500/15"}`}>
                    <p className={`text-[10px] font-medium uppercase tracking-wider ${totalSelected > maxSelected ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>Restantes</p>
                    <p className={`text-lg font-bold tabular-nums ${totalSelected > maxSelected ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>{Math.max(0, maxSelected - totalSelected)}h</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={totalSelected} max={maxSelected} />
                </div>
              </div>

              {/* Asignaciones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cursos asignados</h3>
                  <button disabled={!semestreActivo} onClick={() => { setCForm({ curso_id: "", dicta_teoria: false, grupos_teoria: "1", dicta_practica: false, grupos_practica: "1", num_turnos: "0" }); setFormErr(null); setOpenCreate(true); }} className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-[4px] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]">
                    Nueva asignación
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Curso</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ciclo</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">T</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">P</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Lab</th>
                      <th className="text-right py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docenteAsigs.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-sm text-zinc-500 text-center">Sin cursos asignados</td></tr>
                    ) : docenteAsigs.map((a) => (
                      <tr key={a.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                        <td className="py-3">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{a.curso.nombre}</p>
                          <p className="text-xs text-zinc-500">{a.curso.codigo} · {a.curso.escuela.nombre}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-zinc-500 text-center">{a.curso.ciclo}</td>
                        <td className="px-3 py-3 text-center">
                          {a.dicta_teoria ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/12 text-blue-600 dark:text-blue-400">{a.curso.horas_teoria}h × {a.grupos_teoria}</span> : <span className="text-zinc-400 dark:text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {a.dicta_practica ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">{a.curso.horas_practica}h × {a.grupos_practica}</span> : <span className="text-zinc-400 dark:text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {a.turnos_laboratorio.length > 0 ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/12 text-violet-600 dark:text-violet-400">{a.turnos_laboratorio.length}t</span> : <span className="text-zinc-400 dark:text-zinc-700">—</span>}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(a)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/6 rounded-[4px] transition-colors duration-150">Editar</button>
                            <button onClick={() => setDeleteTarget(a)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Create modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenCreate(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">Nueva asignación</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Curso</label>
                <Select value={cForm.curso_id} onValueChange={(v) => setCForm({ ...cForm, curso_id: v ?? "", num_turnos: "0" })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecciona un curso" /></SelectTrigger>
                  <SelectContent>{cursos.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre} — Ciclo {c.ciclo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Actividades</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input type="checkbox" checked={cForm.dicta_teoria} onChange={(e) => setCForm({ ...cForm, dicta_teoria: e.target.checked })} className="h-4 w-4 rounded border-border accent-indigo-600" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Teoría{selectedCurso && ` (${selectedCurso.horas_teoria}h/sem)`}</span>
                  </label>
                  {cForm.dicta_teoria && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Grupos:</span>
                      <input type="number" min={1} value={cForm.grupos_teoria} onChange={(e) => setCForm({ ...cForm, grupos_teoria: e.target.value })} className={`${inputCls} w-16 h-7`} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input type="checkbox" checked={cForm.dicta_practica} onChange={(e) => setCForm({ ...cForm, dicta_practica: e.target.checked })} className="h-4 w-4 rounded border-border accent-indigo-600" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Práctica{selectedCurso && ` (${selectedCurso.horas_practica}h/sem)`}</span>
                  </label>
                  {cForm.dicta_practica && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Grupos:</span>
                      <input type="number" min={1} value={cForm.grupos_practica} onChange={(e) => setCForm({ ...cForm, grupos_practica: e.target.value })} className={`${inputCls} w-16 h-7`} />
                    </div>
                  )}
                </div>
              </div>
              {selectedCurso && selectedCurso.horas_laboratorio > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Turnos de laboratorio ({selectedCurso.horas_laboratorio}h c/u)</label>
                  <input type="number" min={0} max={10} value={cForm.num_turnos} onChange={(e) => setCForm({ ...cForm, num_turnos: e.target.value })} className={inputCls} />
                </div>
              )}
              {formErr && <p className="text-xs text-red-500 dark:text-red-400">{formErr}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpenCreate(false)} className={cancelCls}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className={saveCls}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">Editar asignación</h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-white/4 border border-border rounded-[6px] px-3 py-2.5">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{editTarget.curso.nombre}</p>
                <p className="text-xs text-zinc-500">{editTarget.curso.codigo}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Actividades</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input type="checkbox" checked={eForm.dicta_teoria} onChange={(e) => setEForm({ ...eForm, dicta_teoria: e.target.checked })} className="h-4 w-4 rounded border-border accent-indigo-600" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Teoría ({editTarget.curso.horas_teoria}h/sem)</span>
                  </label>
                  {eForm.dicta_teoria && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Grupos:</span>
                      <input type="number" min={1} value={eForm.grupos_teoria} onChange={(e) => setEForm({ ...eForm, grupos_teoria: e.target.value })} className={`${inputCls} w-16 h-7`} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input type="checkbox" checked={eForm.dicta_practica} onChange={(e) => setEForm({ ...eForm, dicta_practica: e.target.checked })} className="h-4 w-4 rounded border-border accent-indigo-600" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Práctica ({editTarget.curso.horas_practica}h/sem)</span>
                  </label>
                  {eForm.dicta_practica && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Grupos:</span>
                      <input type="number" min={1} value={eForm.grupos_practica} onChange={(e) => setEForm({ ...eForm, grupos_practica: e.target.value })} className={`${inputCls} w-16 h-7`} />
                    </div>
                  )}
                </div>
              </div>
              {editTarget.curso.horas_laboratorio > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Turnos de laboratorio ({editTarget.curso.horas_laboratorio}h c/u)</label>
                  <input type="number" min={0} max={10} value={eForm.num_turnos} onChange={(e) => setEForm({ ...eForm, num_turnos: e.target.value })} className={inputCls} />
                </div>
              )}
              {editErr && <p className="text-xs text-red-500 dark:text-red-400">{editErr}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditTarget(null)} className={cancelCls}>Cancelar</button>
              <button onClick={handleEdit} disabled={savingEdit} className={saveCls}>{savingEdit ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar asignación</h2>
            <p className="text-sm text-zinc-500 mb-6">¿Eliminar la asignación de <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deleteTarget.curso.nombre}</span>? Se eliminarán los turnos de laboratorio asociados.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className={cancelCls}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="h-8 px-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">{deleting ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
