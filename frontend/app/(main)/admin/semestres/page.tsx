"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Semestre {
  id: number;
  anio: number;
  numero: "I" | "II";
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface FormState {
  anio: string;
  numero: string;
  fecha_inicio: string;
  fecha_fin: string;
}

const EMPTY: FormState = { anio: new Date().getFullYear().toString(), numero: "", fecha_inicio: "", fecha_fin: "" };

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const dateCls = inputCls + " dark:[color-scheme:dark]";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function SemestresPage() {
  const [items, setItems] = useState<Semestre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Semestre | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Semestre | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setItems(await apiFetch<Semestre[]>("/api/semestres"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true); }
  function openEdit(item: Semestre) {
    setEditing(item);
    setForm({ anio: item.anio.toString(), numero: item.numero, fecha_inicio: item.fecha_inicio, fecha_fin: item.fecha_fin });
    setFormError(null);
    setOpen(true);
  }

  function setF(field: keyof FormState, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  async function handleSave() {
    const anio = parseInt(form.anio);
    if (!form.anio || isNaN(anio)) { setFormError("El año es requerido"); return; }
    if (!form.numero) { setFormError("Selecciona el número de semestre"); return; }
    if (!form.fecha_inicio) { setFormError("La fecha de inicio es requerida"); return; }
    if (!form.fecha_fin) { setFormError("La fecha de fin es requerida"); return; }
    if (form.fecha_fin <= form.fecha_inicio) { setFormError("La fecha de fin debe ser posterior al inicio"); return; }
    try {
      setSaving(true);
      setFormError(null);
      const body = { anio, numero: form.numero, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin };
      if (editing) {
        await apiFetch(`/api/semestres/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/semestres", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivar(id: number) {
    try {
      setActivating(id);
      await apiFetch(`/api/semestres/${id}/activar`, { method: "PUT" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar");
    } finally {
      setActivating(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/semestres/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Semestres</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Períodos académicos registrados</p>
        </div>
        <button onClick={openCreate} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98]">
          Nuevo semestre
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="mx-8 mt-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Año</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Semestre</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Inicio</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Fin</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-8 py-12 text-sm text-zinc-400 text-center">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-8 py-12 text-sm text-zinc-400 text-center">No hay semestres registrados</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                <td className="px-8 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{item.anio}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-700 dark:text-zinc-300">Semestre {item.numero}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(item.fecha_inicio)}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(item.fecha_fin)}</td>
                <td className="px-8 py-3.5">
                  {item.activo ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400">Activo</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500">Inactivo</span>
                  )}
                </td>
                <td className="px-8 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!item.activo && (
                      <button onClick={() => handleActivar(item.id)} disabled={activating === item.id} className="h-7 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-[4px] transition-colors duration-150 disabled:opacity-50">
                        {activating === item.id ? "Activando..." : "Activar"}
                      </button>
                    )}
                    <button onClick={() => openEdit(item)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-[4px] transition-colors duration-150">Editar</button>
                    {!item.activo && (
                      <button onClick={() => setDeleteTarget(item)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Eliminar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">{editing ? "Editar semestre" : "Nuevo semestre"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Año</label>
                  <input type="number" min={2000} max={2100} value={form.anio} onChange={(e) => setF("anio", e.target.value)} placeholder="2025" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Número</label>
                  <Select value={form.numero} onValueChange={(v) => setF("numero", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="I / II" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Semestre I</SelectItem>
                      <SelectItem value="II">Semestre II</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={(e) => setF("fecha_inicio", e.target.value)} className={dateCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Fecha fin</label>
                  <input type="date" value={form.fecha_fin} onChange={(e) => setF("fecha_fin", e.target.value)} className={dateCls} />
                </div>
              </div>
              {formError && <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className={cancelCls}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className={saveCls}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar semestre</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Eliminar <span className="text-zinc-800 dark:text-zinc-200 font-medium">Semestre {deleteTarget.numero} {deleteTarget.anio}</span>?</p>
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
