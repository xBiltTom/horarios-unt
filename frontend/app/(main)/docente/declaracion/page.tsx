"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Printer, Download, ArrowRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiFetch, API_BASE } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CargaNoLectivaItem = {
  rubro: string;
  horas_asignadas: number;
  descripcion: string | null;
};

type DocenteInfo = {
  id: number;
  nombre: string;
  apellidos: string;
  modalidad: string;
  condicion: string;
};

type Asignacion = {
  id: number;
  curso: {
    codigo: string;
    nombre: string;
    ciclo: number;
    horas_teoria: number;
    horas_practica: number;
    horas_laboratorio: number;
    num_alumnos: number;
  };
  dicta_teoria: boolean;
  dicta_practica: boolean;
  turnos_laboratorio: any[];
};

const RUBROS = [
  { id: "preparacion", label: "2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)", hasDesc: false },
  { id: "consejeria", label: "3. CONSEJERIA Y TUTORIA (señalar número de alumnos y el ciclo académico)", hasDesc: true },
  { id: "investigacion", label: "4. INVESTIGACIÓN (Consignar el nro de inscripción, código, nombre y duración)", hasDesc: true },
  { id: "capacitacion", label: "5. CAPACITACIÓN (Señale lo referente a este rubro)", hasDesc: true },
  { id: "actividades_gobierno", label: "6. ACTIVIDADES DE GOBIERNO (Se desempeña cargo indique)", hasDesc: true },
  { id: "actividades_administracion", label: "7. ACTIVIDADES DE ADMINISTRACION (Si desempeña cargo indique)", hasDesc: true },
  { id: "asesoria", label: "8. ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROFESIONAL", hasDesc: true },
  { id: "rsu", label: "9. RESPONSABILIDAD SOCIAL UNIVERSITARIA", hasDesc: true },
  { id: "comites_comisiones", label: "10. COMITES TECNICOS Y COMISIONES", hasDesc: true },
];

type Step = "view_lectiva" | "edit_no_lectiva" | "summary";

export default function DeclaracionPage() {
  const [step, setStep] = useState<Step>("view_lectiva");
  const [docente, setDocente] = useState<DocenteInfo | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [carga, setCarga] = useState<Record<string, { horas: number; descripcion: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleDownload(formato: string) {
    setDownloading(true);
    try {
      const token = localStorage.getItem("unt_token");
      const res = await fetch(`${API_BASE}/api/carga-no-lectiva/pdf?formato=${formato}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Error al descargar el PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Declaracion_${formato === 'all' ? 'Completa' : `Formato_${formato}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Hubo un error al generar el PDF." });
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const userInfo = await apiFetch<any>("/api/auth/me");
        if (userInfo.rol === "docente") {
          const docData = await apiFetch<DocenteInfo>("/api/docentes/me");
          setDocente(docData);
          
          const asigData = await apiFetch<Asignacion[]>(`/api/asignaciones/docente/${docData.id}`);
          setAsignaciones(asigData);

          const cargaData = await apiFetch<CargaNoLectivaItem[]>("/api/carga-no-lectiva/mi-carga");
          const initCarga: any = {};
          let initialTotalNoLectivo = 0;
          
          RUBROS.forEach((r) => {
            initCarga[r.id] = { horas: 0, descripcion: "" };
          });
          cargaData.forEach((c) => {
            initialTotalNoLectivo += c.horas_asignadas;
            if (initCarga[c.rubro]) {
              initCarga[c.rubro] = { horas: c.horas_asignadas, descripcion: c.descripcion || "" };
            } else {
              initCarga[c.rubro] = { horas: c.horas_asignadas, descripcion: c.descripcion || "" };
            }
          });
          setCarga(initCarga);
          
          if (initialTotalNoLectivo > 0) {
            setStep("summary");
          } else {
            setStep("view_lectiva");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!docente) return <div className="p-8 text-center text-red-500">No autorizado.</div>;

  const totalLectivo = asignaciones.reduce((acc, a) => {
    let t = 0;
    if (a.dicta_teoria) t += a.curso.horas_teoria;
    if (a.dicta_practica) t += a.curso.horas_practica;
    t += a.curso.horas_laboratorio * a.turnos_laboratorio.length;
    return acc + t;
  }, 0);

  const totalNoLectivo = Object.values(carga).reduce((acc, c) => acc + (c?.horas || 0), 0);
  const totalGeneral = totalLectivo + totalNoLectivo;
  
  const horasRequeridas = docente.modalidad === "tiempo_completo" ? 40 : 20;
  const isComplete = totalGeneral === horasRequeridas;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const items: CargaNoLectivaItem[] = [];
      Object.keys(carga).forEach((key) => {
        if (carga[key].horas > 0 || carga[key].descripcion) {
          items.push({
            rubro: key,
            horas_asignadas: carga[key].horas,
            descripcion: carga[key].descripcion,
          });
        }
      });
      await apiFetch("/api/carga-no-lectiva/mi-carga", {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      

      
      setMessage({ type: "success", text: "Declaración guardada exitosamente." });
      setStep("summary");
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-primary">Declaración de Carga Horaria</h1>
          <p className="text-muted-foreground mt-1">Completa tus horas no lectivas y genera tu formato.</p>
        </div>
        {step === "summary" && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2")} disabled={downloading}>
              {downloading ? "Generando..." : <><Printer className="h-4 w-4" /> Descargar Formatos PDF</>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("all")} className="font-bold cursor-pointer">
                <Download className="h-4 w-4 mr-2 text-indigo-600" /> Todos los Formatos (1, 2 y 3)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("1")} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" /> Solo Formato 1 (Carga Horaria)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("2")} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" /> Solo Formato 2 (Incompatibilidad)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("3")} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2" /> Solo Formato 3 (Sedes)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-6 print:hidden">
          {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>{message.type === "error" ? "Error" : "Éxito"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* FORMATO IMPRIMIBLE */}
      <div className="print-container bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-0 sm:p-8 rounded-xl shadow-sm border border-border print:bg-white print:text-black print:shadow-none print:border-none print:p-0">
        
        {/* Cabecera */}
        <div className="border-b-2 border-indigo-600 dark:border-indigo-500 pb-4 mb-6 print:border-blue-800">
          <h2 className="text-xl font-bold text-center text-indigo-700 dark:text-indigo-400 uppercase print:text-blue-900">
            Carga Horaria - Declaración de Carga Horaria Asignada
          </h2>
        </div>

            {/* Datos Personales */}
            <div className="mb-6 text-sm">
              <h3 className="font-bold mb-2">I. DATOS SOBRE LA SITUACIÓN DEL PROFESOR:</h3>
              <div className="grid grid-cols-2 gap-y-2 border-b border-border pb-4">
                <div className="font-semibold">FACULTAD:</div>
                <div>Ingeniería</div>
                <div className="font-semibold">DPTO. ACADÉMICO:</div>
                <div>Ingeniería de Sistemas</div>
                <div className="font-semibold">FECHA:</div>
                <div>{new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <table className="w-full mt-4 text-center border-collapse border border-border print:border-blue-200">
                <thead>
                  <tr className="bg-indigo-600 dark:bg-indigo-900/50 text-white print:bg-blue-600 print:text-white font-semibold">
                    <th className="border border-border print:border-blue-200 p-2">NOMBRE COMPLETO</th>
                    <th className="border border-border print:border-blue-200 p-2">CONDICIÓN</th>
                    <th className="border border-border print:border-blue-200 p-2">MODALIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border print:border-blue-200 p-2">{docente.apellidos}, {docente.nombre}</td>
                    <td className="border border-border print:border-blue-200 p-2 uppercase">{docente.condicion}</td>
                    <td className="border border-border print:border-blue-200 p-2 uppercase">{docente.modalidad.replace("_", " ")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 1. TRABAJO LECTIVO */}
            <div className="mb-6">
              <h3 className="font-bold text-sm mb-2">1. TRABAJO LECTIVO.- Datos completos y con claridad</h3>
          <table className="w-full text-xs text-center border-collapse border border-border print:border-gray-300">
            <thead>
              <tr className="bg-indigo-600 dark:bg-indigo-900/50 text-white print:bg-blue-600 print:text-white font-semibold">
                <th className="border border-border print:border-gray-300 p-1">CÓDIGO</th>
                <th className="border border-border print:border-gray-300 p-1">NOMBRE DEL CURSO</th>
                <th className="border border-border print:border-gray-300 p-1">CICLO</th>
                <th className="border border-border print:border-gray-300 p-1">ALUMNOS</th>
                <th className="border border-border print:border-gray-300 p-1">HRS TEORÍA</th>
                <th className="border border-border print:border-gray-300 p-1">HRS PRÁCTICA</th>
                <th className="border border-border print:border-gray-300 p-1">HRS LAB/GRUPOS</th>
                <th className="border border-border print:border-gray-300 p-1 bg-indigo-700 dark:bg-indigo-800/50 print:bg-blue-800">TOTAL HRS</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a) => {
                let ht = a.dicta_teoria ? a.curso.horas_teoria : 0;
                let hp = a.dicta_practica ? a.curso.horas_practica : 0;
                let hl = a.curso.horas_laboratorio * a.turnos_laboratorio.length;
                let subtotal = ht + hp + hl;
                return (
                  <tr key={a.id} className="bg-zinc-50 dark:bg-zinc-900/30 print:bg-orange-50/30">
                    <td className="border border-border print:border-gray-300 p-1 font-mono">{a.curso.codigo}</td>
                    <td className="border border-border print:border-gray-300 p-1 text-left px-2">{a.curso.nombre}</td>
                    <td className="border border-border print:border-gray-300 p-1">{a.curso.ciclo}</td>
                    <td className="border border-border print:border-gray-300 p-1">Aprox. {a.curso.num_alumnos}</td>
                    <td className="border border-border print:border-gray-300 p-1">{ht}</td>
                    <td className="border border-border print:border-gray-300 p-1">{hp}</td>
                    <td className="border border-border print:border-gray-300 p-1">{hl} ({a.turnos_laboratorio.length} grp)</td>
                    <td className="border border-border print:border-gray-300 p-1 font-bold">{subtotal}</td>
                  </tr>
                );
              })}
              {asignaciones.length === 0 && (
                <tr><td colSpan={8} className="border border-border print:border-gray-300 p-2 text-zinc-500">No hay cursos asignados</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} className="border border-border print:border-gray-300 p-1 text-right font-bold pr-4">Total Lectivo:</td>
                <td className="border border-border print:border-gray-300 p-1 font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 print:bg-blue-100 print:text-black">{totalLectivo}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {step === "view_lectiva" && (
          <div className="mt-8 flex justify-center print:hidden border-t border-border pt-6">
            <Button size="lg" className="gap-2" onClick={() => setStep("edit_no_lectiva")}>
              Asignar Carga No Lectiva <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 2 AL 10. TRABAJO NO LECTIVO */}
        {(step === "edit_no_lectiva" || step === "summary") && (
        <>
        <div className="space-y-4 text-sm border-t border-border pt-4">
          {RUBROS.map((rubro) => (
            <div key={rubro.id} className="flex flex-col md:flex-row gap-4 border-b border-border pb-4 print:pb-2">
              <div className="flex-1">
                <Label className="font-bold block mb-2">{rubro.label}</Label>
                {rubro.hasDesc ? (
                  <Textarea
                    disabled={step === "summary"}
                    className="resize-none bg-zinc-50 dark:bg-zinc-900/50 border-border dark:text-zinc-300 print:border-none print:bg-transparent print:p-0 h-16 disabled:opacity-75 disabled:cursor-default"
                    value={carga[rubro.id]?.descripcion || ""}
                    onChange={(e) => setCarga({ ...carga, [rubro.id]: { ...carga[rubro.id], descripcion: e.target.value } })}
                    placeholder="Escriba aquí los detalles..."
                  />
                ) : (
                  <p className="text-xs text-zinc-500 print:hidden">No requiere descripción</p>
                )}
              </div>
              <div className="w-32 flex flex-col items-end justify-start pt-6">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">Horas:</span>
                  <Input
                    disabled={step === "summary"}
                    type="number"
                    min="0"
                    className="w-16 text-center font-bold border-border h-8 print:border-none print:p-0 print:bg-transparent disabled:opacity-75 disabled:cursor-default"
                    value={carga[rubro.id]?.horas || 0}
                    onChange={(e) => setCarga({ ...carga, [rubro.id]: { ...carga[rubro.id], horas: parseInt(e.target.value) || 0 } })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totales y validación */}
        <div className="mt-8 pt-4 border-t-2 border-border flex justify-end items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Horas requeridas: {horasRequeridas}</p>
            {!isComplete && (
              <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">La suma no coincide con su modalidad</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-lg">
            <span className="font-bold">Total Horas:</span>
            <div className={`w-20 text-center font-bold border-2 p-1 rounded-md ${isComplete ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-600/50 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-600/50 text-red-700 dark:text-red-400'} print:border-gray-800 print:bg-transparent print:text-black`}>
              {totalGeneral}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Firmas (Solo visible en print) */}
        <div className="hidden print:flex justify-between mt-24 pt-8">
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="font-bold text-sm text-black">Firma del Docente</p>
          </div>
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="font-bold text-sm text-black">Firma del Director de Escuela</p>
          </div>
        </div>

      </div>

      {step === "edit_no_lectiva" && (
        <div className="mt-6 flex justify-between gap-4 print:hidden">
          <Button variant="outline" className="gap-2" onClick={() => {
            if (totalNoLectivo > 0) setStep("summary");
            else setStep("view_lectiva");
          }}>
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? "Guardando..." : "Guardar Declaración"}
          </Button>
        </div>
      )}

      {step === "summary" && (
        <div className="mt-6 flex justify-end gap-4 print:hidden">
          <Button variant="secondary" onClick={() => setStep("edit_no_lectiva")}>
            Editar Carga No Lectiva
          </Button>
        </div>
      )}
    </div>
  );
}
