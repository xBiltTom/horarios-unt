"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Escuela { id: number; nombre: string }
interface Departamento { id: number; nombre: string }
interface Semestre { id: number; anio: number; numero: string; activo: boolean }
interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  ciclo: number;
  horas_teoria: number;
  horas_practica: number;
  horas_laboratorio: number;
  creditos: number;
  num_alumnos: number;
  tipo: string;
  escuela_id: number;
  departamento_id: number | null;
  semestre_id: number;
  escuela: Escuela;
  departamento: Departamento | null;
}

interface FormState {
  codigo: string;
  nombre: string;
  ciclo: string;
  horas_teoria: string;
  horas_practica: string;
  horas_laboratorio: string;
  creditos: string;
  num_alumnos: string;
  tipo: string;
  escuela_id: string;
  departamento_id: string;
}

const EMPTY: FormState = {
  codigo: "", nombre: "", ciclo: "1", horas_teoria: "0", horas_practica: "0",
  horas_laboratorio: "0", creditos: "3", num_alumnos: "40", tipo: "obligatorio",
  escuela_id: "", departamento_id: ""
};

const inputCls = "w-full h-9 bg-white dark:bg-zinc-950 border border-input rounded-[5px] px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150";
const cancelCls = "h-8 px-3.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-border dark:hover:border-white/14 rounded-[5px] transition-colors duration-150";
const saveCls = "h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50";

const TIPO_MAP: Record<string, string> = {
  "sello": "S",
  "obligatorio": "OB",
  "opcional": "OP",
  "electivo": "EL"
};

export default function PlanEstudiosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [escuelas, setEscuelas] = useState<Escuela[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [semestreActivo, setSemestreActivo] = useState<Semestre | null>(null);
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
      const [curRes, escRes, depRes, semRes] = await Promise.allSettled([
        apiFetch<Curso[]>("/api/cursos"),
        apiFetch<Escuela[]>("/api/escuelas"),
        apiFetch<Departamento[]>("/api/departamentos"),
        apiFetch<Semestre>("/api/semestres/activo")
      ]);
      if (curRes.status === "fulfilled") setCursos(curRes.value);
      if (escRes.status === "fulfilled") setEscuelas(escRes.value);
      if (depRes.status === "fulfilled") setDepartamentos(depRes.value);
      if (semRes.status === "fulfilled") setSemestreActivo(semRes.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setFormError(null); setOpen(true); }
  function openEdit(item: Curso) {
    setEditing(item);
    setForm({
      codigo: item.codigo,
      nombre: item.nombre,
      ciclo: item.ciclo.toString(),
      horas_teoria: item.horas_teoria.toString(),
      horas_practica: item.horas_practica.toString(),
      horas_laboratorio: item.horas_laboratorio.toString(),
      creditos: item.creditos.toString(),
      num_alumnos: item.num_alumnos.toString(),
      tipo: item.tipo,
      escuela_id: item.escuela_id.toString(),
      departamento_id: item.departamento_id ? item.departamento_id.toString() : ""
    });
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.codigo.trim() || !form.nombre.trim() || !form.escuela_id) {
      setFormError("Código, nombre y escuela son requeridos");
      return;
    }
    if (!semestreActivo && !editing) {
      setFormError("No hay un semestre activo");
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const body = {
        codigo: form.codigo,
        nombre: form.nombre,
        ciclo: parseInt(form.ciclo),
        horas_teoria: parseInt(form.horas_teoria),
        horas_practica: parseInt(form.horas_practica),
        horas_laboratorio: parseInt(form.horas_laboratorio),
        creditos: parseInt(form.creditos),
        num_alumnos: parseInt(form.num_alumnos),
        tipo: form.tipo,
        escuela_id: parseInt(form.escuela_id),
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
        semestre_id: editing ? editing.semestre_id : semestreActivo!.id
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

  // Agrupar cursos por ciclo
  const cursosPorCiclo = cursos.reduce((acc, c) => {
    if (!acc[c.ciclo]) acc[c.ciclo] = [];
    acc[c.ciclo].push(c);
    return acc;
  }, {} as Record<number, Curso[]>);
  
  const ciclosSorted = Object.keys(cursosPorCiclo).map(Number).sort((a,b) => a-b);

  async function handleDownloadPDF() {
    try {
      const token = localStorage.getItem("unt_token");
      const res = await fetch(`http://localhost:8000/api/documentos/plan-estudios/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Error al descargar el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plan_de_estudios.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Hubo un error al generar el PDF del Plan de Estudios.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Plan de Estudios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {semestreActivo ? `Plan activo del Semestre ${semestreActivo.numero} ${semestreActivo.anio}` : "Cursos del plan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF} className="h-8 px-3.5 bg-zinc-800 dark:bg-white/10 hover:bg-zinc-700 dark:hover:bg-white/20 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98]">
            Descargar PDF
          </button>
          <button disabled={!semestreActivo} onClick={openCreate} className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50">
            Nuevo curso
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {error && <div className="mb-5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-3">{error}</div>}
        
        {loading ? (
          <div className="text-sm text-zinc-500 text-center py-12">Cargando plan de estudios...</div>
        ) : ciclosSorted.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-12">No hay cursos registrados en el plan.</div>
        ) : (
          <div className="space-y-12 max-w-6xl mx-auto">
            {ciclosSorted.map((ciclo) => {
              const cursosCiclo = cursosPorCiclo[ciclo];
              const sumaCreditos = cursosCiclo.reduce((sum, c) => sum + c.creditos, 0);

              return (
                <div key={ciclo} className="bg-white dark:bg-zinc-900 border border-border rounded-[8px] overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-border bg-zinc-50 dark:bg-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">Ciclo {ciclo}</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-20">#</th>
                        <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-16">Tipo</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 tracking-wider">Curso</th>
                        <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-12">T</th>
                        <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-12">P</th>
                        <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-12">L</th>
                        <th className="text-center px-2 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-12">C</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 tracking-wider">Departamento Resp.</th>
                        <th className="text-right px-5 py-2.5 text-xs font-medium text-zinc-500 tracking-wider w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cursosCiclo.map((c) => (
                        <tr key={c.id} className="border-b border-black/[0.04] dark:border-white/5 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                          <td className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">{c.codigo}</td>
                          <td className="px-2 py-3 text-xs text-center font-medium text-indigo-600 dark:text-indigo-400">{TIPO_MAP[c.tipo] || c.tipo}</td>
                          <td className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">{c.nombre}</td>
                          <td className="px-2 py-3 text-xs text-center text-zinc-600 dark:text-zinc-400">{c.horas_teoria}</td>
                          <td className="px-2 py-3 text-xs text-center text-zinc-600 dark:text-zinc-400">{c.horas_practica}</td>
                          <td className="px-2 py-3 text-xs text-center text-zinc-600 dark:text-zinc-400">{c.horas_laboratorio}</td>
                          <td className="px-2 py-3 text-xs text-center font-semibold text-zinc-800 dark:text-zinc-200">{c.creditos}</td>
                          <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">{c.departamento ? c.departamento.nombre : "—"}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEdit(c)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-[4px] transition-colors duration-150">Edit</button>
                              <button onClick={() => setDeleteTarget(c)} className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-[4px] transition-colors duration-150">Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-zinc-50/50 dark:bg-white/[0.02]">
                        <td colSpan={6} className="px-5 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Suma de créditos:</td>
                        <td className="px-2 py-2.5 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100">{sumaCreditos}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto py-10 flex items-center justify-center" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-[10px] shadow-xl w-full max-w-2xl mx-4 p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">{editing ? "Editar curso" : "Nuevo curso del plan"}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Nombre del Curso</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Código</label>
                <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Tipo de Curso</label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obligatorio">Obligatorio (OB)</SelectItem>
                    <SelectItem value="sello">Sello (S)</SelectItem>
                    <SelectItem value="opcional">Opcional (OP)</SelectItem>
                    <SelectItem value="electivo">Electivo (EL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Ciclo (1-10)</label>
                <input type="number" min={1} max={10} value={form.ciclo} onChange={(e) => setForm({ ...form, ciclo: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Créditos</label>
                <input type="number" min={0} max={10} value={form.creditos} onChange={(e) => setForm({ ...form, creditos: e.target.value })} className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas Teoría</label>
                <input type="number" min={0} max={10} value={form.horas_teoria} onChange={(e) => setForm({ ...form, horas_teoria: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas Práctica</label>
                <input type="number" min={0} max={10} value={form.horas_practica} onChange={(e) => setForm({ ...form, horas_practica: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas Laboratorio</label>
                <input type="number" min={0} max={10} value={form.horas_laboratorio} onChange={(e) => setForm({ ...form, horas_laboratorio: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Alumnos por grupo</label>
                <input type="number" min={1} value={form.num_alumnos} onChange={(e) => setForm({ ...form, num_alumnos: e.target.value })} className={inputCls} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Escuela Profesional (Programa)</label>
                <Select value={form.escuela_id} onValueChange={(v) => setForm({ ...form, escuela_id: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar escuela" /></SelectTrigger>
                  <SelectContent>{escuelas.map((e) => <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Departamento Responsable (Opcional)</label>
                <Select value={form.departamento_id} onValueChange={(v) => setForm({ ...form, departamento_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar departamento">{form.departamento_id ? departamentos.find(d => d.id.toString() === form.departamento_id)?.nombre : "Ninguno"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {departamentos.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formError && <p className="mt-4 text-xs text-red-500 dark:text-red-400">{formError}</p>}
            
            <div className="flex justify-end gap-2 mt-8 border-t border-border pt-4">
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
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Eliminar curso</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">¿Eliminar <span className="text-zinc-800 dark:text-zinc-200 font-medium">{deleteTarget.nombre}</span>? Si tiene asignaciones no se podrá eliminar.</p>
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
