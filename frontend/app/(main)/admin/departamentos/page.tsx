"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Facultad { id: number; nombre: string }
interface Departamento { id: number; nombre: string; facultad_id: number; facultad: Facultad }
interface FormState { nombre: string; facultad_id: string }
const EMPTY: FormState = { nombre: "", facultad_id: "" };

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

export default function DepartamentosPage() {
  const [items, setItems] = useState<Departamento[]>([]);
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Departamento | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Departamento | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [deps, facs] = await Promise.all([
        apiFetch<Departamento[]>("/api/departamentos"),
        apiFetch<Facultad[]>("/api/facultades"),
      ]);
      setItems(deps);
      setFacultades(facs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true); }
  function openEdit(item: Departamento) {
    setEditing(item);
    setForm({ nombre: item.nombre, facultad_id: item.facultad_id.toString() });
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError("El nombre es requerido"); return; }
    if (!form.facultad_id) { setFormError("Selecciona una facultad"); return; }
    try {
      setSaving(true);
      setFormError(null);
      const body = { nombre: form.nombre, facultad_id: parseInt(form.facultad_id) };
      if (editing) {
        await apiFetch(`/api/departamentos/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/departamentos", { method: "POST", body: JSON.stringify(body) });
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
      await apiFetch(`/api/departamentos/${deleteTarget.id}`, { method: "DELETE" });
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
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Departamentos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Departamentos académicos</p>
        </div>
        <button onClick={openCreate} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98]">
          Nuevo departamento
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="mx-8 mt-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Facultad</th>
              <th className="text-right px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-8 py-12 text-sm text-zinc-400 text-center">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-8 py-12 text-sm text-zinc-400 text-center">No hay departamentos registrados</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                <td className="px-8 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{item.nombre}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{item.facultad.nombre}</td>
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">{editing ? "Editar departamento" : "Nuevo departamento"}</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Departamento de Matemáticas" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Facultad</label>
                <Select value={form.facultad_id} onValueChange={(v) => setForm({ ...form, facultad_id: v ?? "" })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar facultad">{form.facultad_id ? facultades.find((f) => f.id.toString() === form.facultad_id)?.nombre : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{facultades.map((f) => <SelectItem key={f.id} value={f.id.toString()}>{f.nombre}</SelectItem>)}</SelectContent>
                </Select>
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar departamento</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Eliminar <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deleteTarget.nombre}</span>? Esta acción no se puede deshacer.</p>
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
