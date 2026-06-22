"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Semestre { id: number; anio: number; numero: "I" | "II"; fecha_inicio: string; fecha_fin: string; activo: boolean }
interface Escuela { id: number; nombre: string; departamento: { id: number; nombre: string; facultad: { id: number; nombre: string } } }
interface EscuelaBasic { id: number; nombre: string }
interface Curso {
  id: number; codigo: string; nombre: string; ciclo: number;
  horas_teoria: number; horas_practica: number; horas_laboratorio: number;
  num_alumnos: number; tipo: string; escuela_id: number; semestre_id: number; escuela: EscuelaBasic;
}
interface FormState {
  codigo: string; nombre: string; ciclo: string;
  horas_teoria: string; horas_practica: string; horas_laboratorio: string;
  num_alumnos: string; tipo: string; escuela_id: string;
}
const EMPTY: FormState = { codigo: "", nombre: "", ciclo: "", horas_teoria: "", horas_practica: "", horas_laboratorio: "0", num_alumnos: "", tipo: "obligatorio", escuela_id: "" };
const TIPO_LABEL: Record<string, string> = { obligatorio: "Obligatorio", electivo: "Electivo" };
const CICLOS = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";

export default function CursosPage() {
  const [semestre, setSemestre] = useState<Semestre | null>(null);
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [items, setItems] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Curso | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [cursos, escuelasData, semestreActivo] = await Promise.allSettled([
        apiFetch<Curso[]>("/api/cursos"),
        apiFetch<Escuela[]>("/api/escuelas"),
        apiFetch<Semestre>("/api/semestres/activo"),
      ]);
      if (cursos.status === "fulfilled") setItems(cursos.value);
      if (escuelasData.status === "fulfilled") setEscuelas(escuelasData.value);
      setSemestre(semestreActivo.status === "fulfilled" ? semestreActivo.value : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setF(field: keyof FormState, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true); }
  function openEdit(curso: Curso) {
    setEditing(curso);
    setForm({
      codigo: curso.codigo, nombre: curso.nombre, ciclo: curso.ciclo.toString(),
      horas_teoria: curso.horas_teoria.toString(), horas_practica: curso.horas_practica.toString(),
      horas_laboratorio: curso.horas_laboratorio.toString(), num_alumnos: curso.num_alumnos.toString(),
      tipo: curso.tipo, escuela_id: curso.escuela_id.toString(),
    });
    setFormError(null);
    setOpen(true);
  }

  function validateForm(): string | null {
    if (!form.codigo.trim()) return "El código es requerido";
    if (!form.nombre.trim()) return "El nombre es requerido";
    if (!form.ciclo) return "El ciclo es requerido";
    if (!form.horas_teoria || isNaN(parseInt(form.horas_teoria))) return "Ingresa horas de teoría válidas";
    if (!form.horas_practica || isNaN(parseInt(form.horas_practica))) return "Ingresa horas de práctica válidas";
    if (isNaN(parseInt(form.horas_laboratorio))) return "Ingresa horas de laboratorio válidas";
    if (!form.num_alumnos || isNaN(parseInt(form.num_alumnos))) return "Ingresa el número de alumnos";
    if (!form.escuela_id) return "Selecciona una escuela";
    return null;
  }

  async function handleSave() {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    if (!editing && !semestre) { setFormError("No hay semestre activo"); return; }
    try {
      setSaving(true);
      setFormError(null);
      const body = {
        codigo: form.codigo, nombre: form.nombre, ciclo: parseInt(form.ciclo),
        horas_teoria: parseInt(form.horas_teoria), horas_practica: parseInt(form.horas_practica),
        horas_laboratorio: parseInt(form.horas_laboratorio) || 0,
        num_alumnos: parseInt(form.num_alumnos), tipo: form.tipo, escuela_id: parseInt(form.escuela_id),
        ...(editing ? {} : { semestre_id: semestre!.id }),
      };
      if (editing) {
        await apiFetch(`/api/cursos/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/cursos", { method: "POST", body: JSON.stringify(body) });
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
      await apiFetch(`/api/cursos/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const byCiclo: Record<number, Curso[]> = {};
  for (const c of items) {
    if (!byCiclo[c.ciclo]) byCiclo[c.ciclo] = [];
    byCiclo[c.ciclo].push(c);
  }
  const ciclos = Object.keys(byCiclo).map(Number).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cursos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {semestre ? `Semestre ${semestre.numero} ${semestre.anio} · ${formatDate(semestre.fecha_inicio)} al ${formatDate(semestre.fecha_fin)}` : "Sin semestre activo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {semestre && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-400 ring-1 ring-indigo-500/20">Activo</span>
          )}
          <button onClick={openCreate} disabled={!semestre} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
            Nuevo curso
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="mx-8 mt-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        {!semestre && !loading && (
          <div className="mx-8 mt-5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-3">
            No hay semestre activo. Activa uno en Administración → Semestres.
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Código</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">T</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">P</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">L</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Alumnos</th>
              <th className="text-left px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Escuela</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo</th>
              <th className="text-right px-8 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-8 py-12 text-sm text-zinc-600 text-center">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-8 py-12 text-sm text-zinc-600 text-center">{semestre ? "No hay cursos en este semestre" : "Active un semestre para ver los cursos"}</td></tr>
            ) : ciclos.map((ciclo) => (
              <React.Fragment key={ciclo}>
                <tr className="border-b border-border">
                  <td colSpan={9} className="px-8 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-600">Ciclo {ciclo}</span>
                    <span className="ml-2 text-[10px] text-zinc-700">{byCiclo[ciclo].length} {byCiclo[ciclo].length === 1 ? "curso" : "cursos"}</span>
                  </td>
                </tr>
                {byCiclo[ciclo].map((curso) => (
                  <tr key={curso.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="px-8 py-3 text-sm font-mono text-zinc-400">{curso.codigo}</td>
                    <td className="px-8 py-3 text-sm text-zinc-800 dark:text-zinc-200 font-medium">{curso.nombre}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-center">{curso.horas_teoria}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-center">{curso.horas_practica}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-center">{curso.horas_laboratorio}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400 text-center">{curso.num_alumnos}</td>
                    <td className="px-8 py-3 text-sm text-zinc-500">{curso.escuela.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${curso.tipo === "electivo" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-400"}`}>{TIPO_LABEL[curso.tipo] ?? curso.tipo}</span>
                    </td>
                    <td className="px-8 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(curso)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-[4px] transition-colors duration-150">Editar</button>
                        <button onClick={() => setDeleteTarget(curso)} className="h-7 px-2.5 text-xs text-zinc-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">{editing ? "Editar curso" : "Nuevo curso"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Código</label>
                <input value={form.codigo} onChange={(e) => setF("codigo", e.target.value)} placeholder="Ej. MAT101" className={inputCls + " font-mono"} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Ciclo</label>
                <Select value={form.ciclo} onValueChange={(v) => setF("ciclo", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar ciclo" /></SelectTrigger>
                  <SelectContent>{CICLOS.map((c) => <SelectItem key={c} value={c}>Ciclo {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre</label>
                <input value={form.nombre} onChange={(e) => setF("nombre", e.target.value)} placeholder="Ej. Cálculo Diferencial e Integral" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas teoría</label>
                <input type="number" min={0} value={form.horas_teoria} onChange={(e) => setF("horas_teoria", e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas práctica</label>
                <input type="number" min={0} value={form.horas_practica} onChange={(e) => setF("horas_practica", e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas laboratorio</label>
                <input type="number" min={0} value={form.horas_laboratorio} onChange={(e) => setF("horas_laboratorio", e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">N° alumnos</label>
                <input type="number" min={1} value={form.num_alumnos} onChange={(e) => setF("num_alumnos", e.target.value)} placeholder="30" className={inputCls} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Escuela profesional</label>
                <Select value={form.escuela_id} onValueChange={(v) => setF("escuela_id", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar escuela">{form.escuela_id ? escuelas.find((e) => e.id.toString() === form.escuela_id)?.nombre : undefined}</SelectValue></SelectTrigger>
                  <SelectContent>{escuelas.map((e) => <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Tipo</label>
                <Select value={form.tipo} onValueChange={(v) => setF("tipo", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue>{TIPO_LABEL[form.tipo] ?? form.tipo}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obligatorio">Obligatorio</SelectItem>
                    <SelectItem value="electivo">Electivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && <p className="text-xs text-red-400 mt-4">{formError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOpen(false)} className="h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear curso"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar curso</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Eliminar <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deleteTarget.nombre}</span>? Solo se puede eliminar si no tiene asignaciones.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="h-8 px-3.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">{deleting ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
