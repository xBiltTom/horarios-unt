"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Aula { id: number; nombre: string; ubicacion: string }
interface FormState { nombre: string; ubicacion: string }
const EMPTY: FormState = { nombre: "", ubicacion: "" };

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

export default function AulasPage() {
  const [items, setItems] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Aula | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Aula | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setItems(await apiFetch<Aula[]>("/api/aulas"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true); }
  function openEdit(item: Aula) {
    setEditing(item);
    setForm({ nombre: item.nombre, ubicacion: item.ubicacion });
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError("El nombre es requerido"); return; }
    if (!form.ubicacion.trim()) { setFormError("La ubicación es requerida"); return; }
    try {
      setSaving(true);
      setFormError(null);
      if (editing) {
        await apiFetch(`/api/aulas/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await apiFetch("/api/aulas", { method: "POST", body: JSON.stringify(form) });
      }
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/aulas/${deleteTarget.id}`, { method: "DELETE" });
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
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Aulas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Ambientes de enseñanza disponibles</p>
        </div>
        <button onClick={openCreate} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98]">
          Nueva aula
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="mx-8 mt-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Ubicación</th>
              <th className="text-right px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-8 py-12 text-sm text-zinc-400 text-center">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-8 py-12 text-sm text-zinc-400 text-center">No hay aulas registradas</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                <td className="px-8 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{item.nombre}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{item.ubicacion}</td>
                <td className="px-8 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(item)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-[4px] transition-colors duration-150">Editar</button>
                    <button onClick={() => setDeleteTarget(item)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Eliminar</button>
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">{editing ? "Editar aula" : "Nueva aula"}</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Aula 101" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Ubicación</label>
                <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej. Pabellón A, Piso 1" className={inputCls} />
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar aula</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Eliminar <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deleteTarget.nombre}</span>?</p>
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
