"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Departamento { id: number; nombre: string }
interface Usuario { id: number; email: string; activo: boolean }
interface Docente {
  id: number;
  nombre: string;
  apellidos: string;
  dni: string;
  codigo_ibm: string;
  condicion: string;
  modalidad: string;
  fecha_ingreso_unt: string;
  departamento_id: number;
  departamento: Departamento;
  usuario: Usuario | null;
}

interface CreateForm {
  nombre: string; apellidos: string; dni: string; codigo_ibm: string;
  condicion: string; modalidad: string;
  fecha_ingreso_unt: string; departamento_id: string;
  email: string; password: string;
}
interface EditForm {
  nombre: string; apellidos: string; dni: string; codigo_ibm: string;
  condicion: string; modalidad: string;
  fecha_ingreso_unt: string; departamento_id: string;
}

const EMPTY_CREATE: CreateForm = {
  nombre: "", apellidos: "", dni: "", codigo_ibm: "",
  condicion: "", modalidad: "",
  fecha_ingreso_unt: "", departamento_id: "",
  email: "", password: "",
};

const CONDICIONES = ["nombrado", "contratado"];
const MODALIDADES = [
  { value: "tiempo_completo", label: "Tiempo Completo" },
  { value: "tiempo_parcial", label: "Tiempo Parcial" },
];
const MODALIDAD_LABEL: Record<string, string> = {
  tiempo_completo: "Tiempo Completo",
  tiempo_parcial: "Tiempo Parcial",
};

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const dateCls = inputCls + " dark:[color-scheme:dark]";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

export default function DocentesPage() {
  const [items, setItems] = useState<Docente[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Docente | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    nombre: "", apellidos: "", dni: "", codigo_ibm: "",
    condicion: "", modalidad: "",
    fecha_ingreso_unt: "", departamento_id: "",
  });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Docente | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [docs, deps] = await Promise.all([
        apiFetch<Docente[]>("/api/docentes"),
        apiFetch<Departamento[]>("/api/departamentos"),
      ]);
      setItems(docs);
      setDepartamentos(deps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEdit(doc: Docente) {
    setEditTarget(doc);
    setEditForm({
      nombre: doc.nombre, apellidos: doc.apellidos, dni: doc.dni,
      codigo_ibm: doc.codigo_ibm, condicion: doc.condicion,
      modalidad: doc.modalidad,
      fecha_ingreso_unt: doc.fecha_ingreso_unt,
      departamento_id: doc.departamento_id.toString(),
    });
    setEditError(null);
  }

  async function handleCreate() {
    const f = createForm;
    if (!f.nombre.trim() || !f.apellidos.trim() || !f.dni.trim() || !f.codigo_ibm.trim()) {
      setCreateError("Nombre, apellidos, DNI y código IBM son requeridos"); return;
    }
    if (!f.condicion || !f.modalidad || !f.fecha_ingreso_unt || !f.departamento_id) {
      setCreateError("Completa todos los campos requeridos"); return;
    }
    if (!f.email.trim() || !f.password.trim()) {
      setCreateError("Email y contraseña son requeridos"); return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await apiFetch("/api/docentes", { method: "POST", body: JSON.stringify({ ...f, departamento_id: parseInt(f.departamento_id) }) });
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit() {
    const f = editForm;
    if (!f.nombre.trim() || !f.apellidos.trim()) { setEditError("Nombre y apellidos son requeridos"); return; }
    try {
      setEditing(true);
      setEditError(null);
      await apiFetch(`/api/docentes/${editTarget!.id}`, { method: "PUT", body: JSON.stringify({ ...f, departamento_id: parseInt(f.departamento_id) }) });
      setEditTarget(null);
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setEditing(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      setDeactivating(true);
      await apiFetch(`/api/docentes/${deactivateTarget.id}`, { method: "DELETE" });
      setDeactivateTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar");
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  }

  function setC(field: keyof CreateForm, value: string | null) {
    setCreateForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }
  function setE(field: keyof EditForm, value: string | null) {
    setEditForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Docentes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Plana docente y sus accesos</p>
        </div>
        <button onClick={() => { setCreateForm(EMPTY_CREATE); setCreateError(null); setCreateOpen(true); }} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98]">
          Nuevo docente
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="mx-8 mt-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">DNI</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Condición</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Modalidad</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Departamento</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-8 py-12 text-sm text-zinc-400 text-center">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-8 py-12 text-sm text-zinc-400 text-center">No hay docentes registrados</td></tr>
            ) : items.map((doc) => (
              <tr key={doc.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                <td className="px-8 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{doc.apellidos}, {doc.nombre}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{doc.dni}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{doc.usuario?.email ?? "—"}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400 capitalize">{doc.condicion}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{MODALIDAD_LABEL[doc.modalidad] ?? doc.modalidad}</td>
                <td className="px-8 py-3.5 text-sm text-zinc-500 dark:text-zinc-400">{doc.departamento.nombre}</td>
                <td className="px-8 py-3.5">
                  {doc.usuario?.activo !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-400">Activo</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-white/5 text-zinc-500">Inactivo</span>
                  )}
                </td>
                <td className="px-8 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(doc)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-[4px] transition-colors duration-150">Editar</button>
                    {doc.usuario?.activo !== false && (
                      <button onClick={() => setDeactivateTarget(doc)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Desactivar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">Nuevo docente</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre</label>
                <input value={createForm.nombre} onChange={(e) => setC("nombre", e.target.value)} placeholder="Nombres" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Apellidos</label>
                <input value={createForm.apellidos} onChange={(e) => setC("apellidos", e.target.value)} placeholder="Apellidos" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">DNI</label>
                <input value={createForm.dni} onChange={(e) => setC("dni", e.target.value)} placeholder="12345678" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Código IBM</label>
                <input value={createForm.codigo_ibm} onChange={(e) => setC("codigo_ibm", e.target.value)} placeholder="Código IBM" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Condición</label>
                <Select value={createForm.condicion} onValueChange={(v) => setC("condicion", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{CONDICIONES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Modalidad</label>
                <Select value={createForm.modalidad} onValueChange={(v) => setC("modalidad", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar">{createForm.modalidad ? MODALIDAD_LABEL[createForm.modalidad] : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Fecha ingreso UNT</label>
                <input type="date" value={createForm.fecha_ingreso_unt} onChange={(e) => setC("fecha_ingreso_unt", e.target.value)} className={dateCls} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Departamento</label>
                <Select value={createForm.departamento_id} onValueChange={(v) => setC("departamento_id", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar departamento">{createForm.departamento_id ? departamentos.find((d) => d.id.toString() === createForm.departamento_id)?.nombre : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{departamentos.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Email de acceso</label>
                <input type="email" value={createForm.email} onChange={(e) => setC("email", e.target.value)} placeholder="docente@unt.edu.pe" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Contraseña</label>
                <input type="password" value={createForm.password} onChange={(e) => setC("password", e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
            </div>
            {createError && <p className="text-xs text-red-500 dark:text-red-400 mt-4">{createError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setCreateOpen(false)} className={cancelCls}>Cancelar</button>
              <button onClick={handleCreate} disabled={creating} className={saveCls}>{creating ? "Guardando..." : "Crear docente"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">Editar docente</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre</label>
                <input value={editForm.nombre} onChange={(e) => setE("nombre", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Apellidos</label>
                <input value={editForm.apellidos} onChange={(e) => setE("apellidos", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">DNI</label>
                <input value={editForm.dni} onChange={(e) => setE("dni", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Código IBM</label>
                <input value={editForm.codigo_ibm} onChange={(e) => setE("codigo_ibm", e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Condición</label>
                <Select value={editForm.condicion} onValueChange={(v) => setE("condicion", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDICIONES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Modalidad</label>
                <Select value={editForm.modalidad} onValueChange={(v) => setE("modalidad", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue>{editForm.modalidad ? MODALIDAD_LABEL[editForm.modalidad] : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Fecha ingreso UNT</label>
                <input type="date" value={editForm.fecha_ingreso_unt} onChange={(e) => setE("fecha_ingreso_unt", e.target.value)} className={dateCls} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Departamento</label>
                <Select value={editForm.departamento_id} onValueChange={(v) => setE("departamento_id", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue>{editForm.departamento_id ? departamentos.find((d) => d.id.toString() === editForm.departamento_id)?.nombre : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{departamentos.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {editError && <p className="text-xs text-red-500 dark:text-red-400 mt-4">{editError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditTarget(null)} className={cancelCls}>Cancelar</button>
              <button onClick={handleEdit} disabled={editing} className={saveCls}>{editing ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeactivateTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Desactivar docente</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Desactivar a <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deactivateTarget.apellidos}, {deactivateTarget.nombre}</span>? Su cuenta quedará inactiva.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeactivateTarget(null)} className={cancelCls}>Cancelar</button>
              <button onClick={handleDeactivate} disabled={deactivating} className="h-8 px-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">{deactivating ? "Desactivando..." : "Desactivar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
