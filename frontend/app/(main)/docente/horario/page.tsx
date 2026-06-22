"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { apiFetch, API_BASE } from "@/lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;
type DiaKey = (typeof DIAS)[number];

const DIA_LABEL: Record<DiaKey, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié",
  jueves: "Jue", viernes: "Vie", sabado: "Sáb",
};

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7);

const NL_COLOR = { bg: "bg-slate-500", text: "text-white", border: "border-slate-400" };

const CURSO_PALETTE: Array<{ bg: string; text: string; border: string }> = [
  { bg: "bg-indigo-500",  text: "text-white", border: "border-indigo-400" },
  { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-400" },
  { bg: "bg-amber-500",   text: "text-white", border: "border-amber-400" },
  { bg: "bg-rose-500",    text: "text-white", border: "border-rose-400" },
  { bg: "bg-cyan-500",    text: "text-white", border: "border-cyan-400" },
  { bg: "bg-violet-500",  text: "text-white", border: "border-violet-400" },
  { bg: "bg-orange-500",  text: "text-white", border: "border-orange-400" },
  { bg: "bg-teal-500",    text: "text-white", border: "border-teal-400" },
];

function getCursoColor(cursoId: number) {
  return CURSO_PALETTE[cursoId % CURSO_PALETTE.length];
}

const FALLBACK_COLOR = { bg: "bg-zinc-600", text: "text-white", border: "border-zinc-500" };

const TIPO_LABEL: Record<string, string> = {
  teoria: "Teoría", practica: "Práctica", laboratorio: "Lab",
  preparacion: "Preparación", consejeria: "Consejería",
  investigacion: "Investigación", rsu: "RSU",
  asesoria: "Asesoría", capacitacion: "Capacitación",
};

const LECTIVA_TIPOS = new Set(["teoria", "practica", "laboratorio"]);

const RUBROS_NL = ["preparacion", "consejeria", "investigacion", "rsu", "asesoria", "capacitacion"] as const;
type RubroNL = (typeof RUBROS_NL)[number];

const RUBRO_LABEL_NL: Record<RubroNL, string> = {
  preparacion: "Preparación", consejeria: "Consejería",
  investigacion: "Investigación", rsu: "RSU",
  asesoria: "Asesoría", capacitacion: "Capacitación",
};

const RUBRO_LIMITS: Record<string, Record<RubroNL, number>> = {
  tiempo_completo: { preparacion: 11, consejeria: 2, investigacion: 6, rsu: 2, asesoria: 2, capacitacion: 2 },
  tiempo_parcial:  { preparacion: 4,  consejeria: 1, investigacion: 0, rsu: 1, asesoria: 1, capacitacion: 0 },
};

const EMPTY_CARGA = RUBROS_NL.reduce((acc, r) => ({ ...acc, [r]: "0" }), {} as Record<RubroNL, string>);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocenteInfo { id: number; nombre: string; apellidos: string; modalidad: string }
interface TurnoLab { id: number; numero_turno: number; laboratorio_id: number | null }
interface CursoInfo { id: number; nombre: string; codigo: string; horas_teoria: number; horas_practica: number; horas_laboratorio: number }
interface Asignacion { id: number; curso: CursoInfo; dicta_teoria: boolean; dicta_practica: boolean; turnos_laboratorio: TurnoLab[] }
interface CargaNoLectiva { id: number; rubro: string; horas_asignadas: number }
interface Aula { id: number; nombre: string; ubicacion?: string }
interface Bloque { id: number; docente_id: number; tipo: string; dia: string; hora_inicio: string; hora_fin: string; asignacion_id: number | null; turno_laboratorio_id: number | null; laboratorio_id: number | null; aula_id: number | null }
interface MiTurno { en_cola: boolean; estado: string | null; orden: number | null; turno_inicio: string | null; turno_fin: string | null; es_mi_turno: boolean; tiempo_restante_segundos: number | null }
interface ScheduleItem { id: string; tipo: string; label: string; duracion: number; curso_id?: number; asignacion_id?: number; turno_laboratorio_id?: number; laboratorio_id?: number }
interface PendingPlacement { dia: string; hora: number; item: ScheduleItem }
type BlockColors = { bg: string; text: string; border: string };

function getItemColors(item: ScheduleItem): BlockColors {
  if (LECTIVA_TIPOS.has(item.tipo) && item.curso_id !== undefined) {
    return getCursoColor(item.curso_id);
  }
  return NL_COLOR;
}

function getBlockColors(tipo: string, asignacionId: number | null, asignaciones: Asignacion[]): BlockColors {
  if (LECTIVA_TIPOS.has(tipo) && asignacionId !== null) {
    const asig = asignaciones.find((a) => a.id === asignacionId);
    if (asig) return getCursoColor(asig.curso.id);
  }
  return LECTIVA_TIPOS.has(tipo) ? FALLBACK_COLOR : NL_COLOR;
}

function parseHora(s: string) { return parseInt(s.split(":")[0], 10); }
function padHora(h: number) { return `${h.toString().padStart(2, "0")}:00:00`; }

async function downloadBlob(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("unt_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Error al descargar archivo");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// DnD sub-components
// ---------------------------------------------------------------------------

function DraggableItem({ item, disabled, colors }: { item: ScheduleItem; disabled: boolean; colors: BlockColors }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, disabled, data: item });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${colors.bg} ${colors.text} rounded-[5px] px-2.5 py-2 mb-1.5 text-xs select-none transition-opacity border ${colors.border} ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-20" : ""}`}
    >
      <p className="font-medium leading-tight truncate">{item.label}</p>
      <p className="opacity-70 mt-0.5">{item.duracion}h</p>
    </div>
  );
}

function DroppableCell({ id, gridColumn, gridRow, blocked, dragActive }: {
  id: string; gridColumn: number; gridRow: number; blocked: boolean; dragActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  let cls = "border-b border-r border-black/[0.04] dark:border-white/4 min-h-[50px] transition-colors duration-100";
  if (dragActive) {
    if (blocked) {
      cls = "border-b border-r border-red-400/20 min-h-[50px] bg-red-500/10 transition-colors duration-100";
    } else if (isOver) {
      cls = "border-b border-r border-blue-500/30 min-h-[50px] bg-blue-500/15 transition-colors duration-100";
    } else {
      cls = "border-b border-r border-green-400/20 min-h-[50px] bg-green-500/8 transition-colors duration-100";
    }
  }
  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn, gridRow, zIndex: 1 }}
      className={cls}
    />
  );
}

// ---------------------------------------------------------------------------
// Aula selection modal
// ---------------------------------------------------------------------------

function AulaModal({ aulas, bloques, dia, hora, duracion, onSelect, onCancel }: {
  aulas: Aula[];
  bloques: Bloque[];
  dia: string;
  hora: number;
  duracion: number;
  onSelect: (aulaId: number) => void;
  onCancel: () => void;
}) {
  const newEnd = hora + duracion;
  const freeSet = new Set(
    aulas
      .filter((aula) => !bloques.some((b) =>
        b.dia === dia &&
        b.aula_id === aula.id &&
        parseHora(b.hora_inicio) < newEnd &&
        parseHora(b.hora_fin) > hora
      ))
      .map((a) => a.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-[10px] shadow-2xl border border-border p-5 w-72 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">Seleccionar aula</h3>
        <p className="text-[11px] text-zinc-500 mb-3">
          {dia.charAt(0).toUpperCase() + dia.slice(1)} · {hora}:00 – {newEnd}:00
        </p>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {aulas.length === 0 && (
            <p className="text-xs text-zinc-500 py-2">No hay aulas registradas.</p>
          )}
          {aulas.map((aula) => {
            const available = freeSet.has(aula.id);
            return (
              <button
                key={aula.id}
                disabled={!available}
                onClick={() => onSelect(aula.id)}
                className={`w-full text-left px-3 py-2 rounded-[5px] transition-colors duration-100 ${
                  available
                    ? "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    : "opacity-35 cursor-not-allowed text-zinc-500"
                }`}
              >
                <span className="text-sm font-medium block leading-tight">{aula.nombre}</span>
                {aula.ubicacion && (
                  <span className="text-[10px] text-zinc-400">{aula.ubicacion}</span>
                )}
                {!available && (
                  <span className="text-[10px] text-red-400 block">Ocupada en ese horario</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocenteHorarioPage() {
  const [docenteInfo, setDocenteInfo] = useState<DocenteInfo | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [cargaNoLectiva, setCargaNoLectiva] = useState<CargaNoLectiva[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [miTurno, setMiTurno] = useState<MiTurno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [blockedStartHoras, setBlockedStartHoras] = useState<Set<string>>(new Set());
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [cargaForm, setCargaForm] = useState<Record<RubroNL, string>>(EMPTY_CARGA);
  const [savingCarga, setSavingCarga] = useState(false);
  const [cargaErr, setCargaErr] = useState<string | null>(null);
  const [cargaOk, setCargaOk] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Keep a ref to bloques/docenteInfo for use inside non-reactive functions
  const bloquesRef = useRef(bloques);
  const docenteInfoRef = useRef(docenteInfo);
  useEffect(() => { bloquesRef.current = bloques; }, [bloques]);
  useEffect(() => { docenteInfoRef.current = docenteInfo; }, [docenteInfo]);

  const fetchMiTurno = useCallback(async () => {
    try {
      const t = await apiFetch<MiTurno>("/api/horarios/mi-turno");
      setMiTurno(t);
    } catch { /* not fatal */ }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const docente = await apiFetch<DocenteInfo>("/api/docentes/me");
        setDocenteInfo(docente);
        const [asigRes, cargaRes, bloquesRes, turnoRes, aulasRes] = await Promise.allSettled([
          apiFetch<Asignacion[]>(`/api/asignaciones/docente/${docente.id}`),
          apiFetch<CargaNoLectiva[]>(`/api/carga-no-lectiva/docente/${docente.id}`),
          apiFetch<Bloque[]>("/api/horarios/bloques"),
          apiFetch<MiTurno>("/api/horarios/mi-turno"),
          apiFetch<Aula[]>("/api/aulas"),
        ]);
        if (asigRes.status === "fulfilled") setAsignaciones(asigRes.value);
        if (cargaRes.status === "fulfilled") {
          setCargaNoLectiva(cargaRes.value);
          const form = { ...EMPTY_CARGA };
          for (const c of cargaRes.value) form[c.rubro as RubroNL] = c.horas_asignadas.toString();
          setCargaForm(form);
        }
        if (bloquesRes.status === "fulfilled") setBloques(bloquesRes.value);
        if (turnoRes.status === "fulfilled") setMiTurno(turnoRes.value);
        if (aulasRes.status === "fulfilled") setAulas(aulasRes.value);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync turn status every 30 seconds
  useEffect(() => {
    const id = setInterval(fetchMiTurno, 30_000);
    return () => clearInterval(id);
  }, [fetchMiTurno]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/horarios");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tipo === "bloque_added") {
        setBloques((prev) => prev.find((b) => b.id === data.bloque.id) ? prev : [...prev, data.bloque as Bloque]);
      } else if (data.tipo === "bloque_removed") {
        setBloques((prev) => prev.filter((b) => b.id !== data.bloque_id));
      } else if (data.tipo === "turno_avanzado" || data.tipo === "fase_iniciada") {
        fetchMiTurno();
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [fetchMiTurno]);

  const misBloques = bloques.filter((b) => b.docente_id === docenteInfo?.id);
  const otrosBloques = bloques.filter((b) => b.docente_id !== docenteInfo?.id);

  const scheduleItems: ScheduleItem[] = [];
  for (const asig of asignaciones) {
    if (asig.dicta_teoria && asig.curso.horas_teoria > 0) {
      scheduleItems.push({ id: `teoria-${asig.id}`, tipo: "teoria", label: `Teoría - ${asig.curso.nombre}`, duracion: asig.curso.horas_teoria, curso_id: asig.curso.id, asignacion_id: asig.id });
    }
    if (asig.dicta_practica && asig.curso.horas_practica > 0) {
      scheduleItems.push({ id: `practica-${asig.id}`, tipo: "practica", label: `Práctica - ${asig.curso.nombre}`, duracion: asig.curso.horas_practica, curso_id: asig.curso.id, asignacion_id: asig.id });
    }
    for (const turno of asig.turnos_laboratorio) {
      if (asig.curso.horas_laboratorio > 0) {
        scheduleItems.push({ id: `lab-${turno.id}`, tipo: "laboratorio", label: `Lab T${turno.numero_turno} - ${asig.curso.nombre}`, duracion: asig.curso.horas_laboratorio, curso_id: asig.curso.id, asignacion_id: asig.id, turno_laboratorio_id: turno.id, laboratorio_id: turno.laboratorio_id ?? undefined });
      }
    }
  }
  for (const carga of cargaNoLectiva) {
    if (carga.horas_asignadas > 0) {
      scheduleItems.push({ id: `carga-${carga.rubro}`, tipo: carga.rubro, label: `${TIPO_LABEL[carga.rubro] ?? carga.rubro} (${carga.horas_asignadas}h)`, duracion: carga.horas_asignadas });
    }
  }

  function isItemPlaced(item: ScheduleItem): boolean {
    if (item.tipo === "teoria") return misBloques.some((b) => b.tipo === "teoria" && b.asignacion_id === item.asignacion_id);
    if (item.tipo === "practica") return misBloques.some((b) => b.tipo === "practica" && b.asignacion_id === item.asignacion_id);
    if (item.tipo === "laboratorio") return misBloques.some((b) => b.tipo === "laboratorio" && b.turno_laboratorio_id === item.turno_laboratorio_id);
    return misBloques.some((b) => b.tipo === item.tipo);
  }

  const lectivaItems = scheduleItems.filter((i) => LECTIVA_TIPOS.has(i.tipo));
  const noLectivaItems = scheduleItems.filter((i) => !LECTIVA_TIPOS.has(i.tipo));
  const lectivaPendientes = lectivaItems.filter((i) => !isItemPlaced(i));
  const lectivaColocados = lectivaItems.filter((i) => isItemPlaced(i));
  const noLectivaPendientes = noLectivaItems.filter((i) => !isItemPlaced(i));
  const noLectivaColocados = noLectivaItems.filter((i) => isItemPlaced(i));

  const modalidadKey = docenteInfo?.modalidad ?? "tiempo_completo";
  const limits = RUBRO_LIMITS[modalidadKey] ?? RUBRO_LIMITS.tiempo_completo;
  const rubrosActivos = RUBROS_NL.filter((r) => limits[r] > 0);

  // Compute which start positions in the grid are blocked for the given dragged item.
  // Rule 1: docente's own blocks. Rule 3: same lab as dragged item.
  // Also blocks positions where the item would extend past schedule end (21:00).
  function computeBlockedStartHoras(item: ScheduleItem): Set<string> {
    const currentBloques = bloquesRef.current;
    const currentDocente = docenteInfoRef.current;
    const blocked = new Set<string>();
    for (const dia of DIAS) {
      for (const hora of HORAS) {
        const newEnd = hora + item.duracion;
        if (newEnd > 21) { blocked.add(`${dia}-${hora}`); continue; }
        for (const bloque of currentBloques) {
          if (bloque.dia !== dia) continue;
          const bStart = parseHora(bloque.hora_inicio);
          const bEnd = parseHora(bloque.hora_fin);
          if (bStart >= newEnd || bEnd <= hora) continue;
          if (
            bloque.docente_id === currentDocente?.id ||
            (item.laboratorio_id != null && bloque.laboratorio_id === item.laboratorio_id)
          ) {
            blocked.add(`${dia}-${hora}`);
            break;
          }
        }
      }
    }
    return blocked;
  }

  function handleDragStart(event: DragStartEvent) {
    const item = scheduleItems.find((i) => i.id === event.active.id) ?? null;
    setActiveItem(item);
    if (item) setBlockedStartHoras(computeBlockedStartHoras(item));
  }

  async function doPlaceBlock(item: ScheduleItem, dia: string, hora: number, aulaId: number | null) {
    try {
      setError(null);
      let bloque: Bloque;
      if (LECTIVA_TIPOS.has(item.tipo)) {
        bloque = await apiFetch<Bloque>("/api/horarios/bloques", {
          method: "POST",
          body: JSON.stringify({
            tipo: item.tipo,
            dia,
            hora_inicio: padHora(hora),
            hora_fin: padHora(hora + item.duracion),
            asignacion_id: item.asignacion_id ?? null,
            turno_laboratorio_id: item.turno_laboratorio_id ?? null,
            laboratorio_id: item.laboratorio_id ?? null,
            aula_id: aulaId,
          }),
        });
      } else {
        bloque = await apiFetch<Bloque>("/api/horarios/bloques/no-lectiva", {
          method: "POST",
          body: JSON.stringify({ tipo: item.tipo, dia, hora_inicio: padHora(hora), hora_fin: padHora(hora + item.duracion) }),
        });
      }
      setBloques((prev) => [...prev, bloque]);
      setPendingPlacement(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al colocar el bloque");
      setPendingPlacement(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    setBlockedStartHoras(new Set());

    if (!over) return;
    const item = scheduleItems.find((i) => i.id === active.id);
    if (!item || isItemPlaced(item)) return;

    const overId = over.id as string;
    const dashIdx = overId.indexOf("-");
    const dia = overId.substring(0, dashIdx);
    const hora = parseInt(overId.substring(dashIdx + 1), 10);

    if (hora + item.duracion > 21) {
      setError(`El bloque de ${item.duracion}h no cabe empezando a las ${hora}:00`);
      return;
    }

    // Check for Rule 1 / Rule 3 conflicts
    const blocked = computeBlockedStartHoras(item);
    if (blocked.has(`${dia}-${hora}`)) {
      setError("Ese horario ya está ocupado.");
      return;
    }

    // Teoria/practica blocks need aula selection
    if (item.tipo === "teoria" || item.tipo === "practica") {
      setPendingPlacement({ dia, hora, item });
      return;
    }

    // Lab blocks use laboratorio_id from turno; no-lectiva blocks need no space
    await doPlaceBlock(item, dia, hora, null);
  }

  async function handleRemoveBloque(bloqueId: number) {
    try {
      setError(null);
      await apiFetch(`/api/horarios/bloques/${bloqueId}`, { method: "DELETE" });
      setBloques((prev) => prev.filter((b) => b.id !== bloqueId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar el bloque");
    }
  }

  async function handleSaveCarga() {
    if (!docenteInfo) return;
    try {
      setSavingCarga(true);
      setCargaErr(null);
      const rubros = rubrosActivos
        .map((r) => ({ rubro: r, horas_asignadas: parseInt(cargaForm[r]) || 0 }))
        .filter((r) => r.horas_asignadas > 0);
      await apiFetch("/api/carga-no-lectiva", {
        method: "POST",
        body: JSON.stringify({ docente_id: docenteInfo.id, rubros }),
      });
      const fresh = await apiFetch<CargaNoLectiva[]>(`/api/carga-no-lectiva/docente/${docenteInfo.id}`);
      setCargaNoLectiva(fresh);
      const form = { ...EMPTY_CARGA };
      for (const c of fresh) form[c.rubro as RubroNL] = c.horas_asignadas.toString();
      setCargaForm(form);
      setCargaOk(true);
      setTimeout(() => setCargaOk(false), 2500);
    } catch (e) {
      setCargaErr(e instanceof Error ? e.message : "Error al guardar carga");
    } finally {
      setSavingCarga(false);
    }
  }

  async function handleConfirmar() {
    setConfirmando(true);
    setError(null);
    try {
      await apiFetch("/api/horarios/confirmar", { method: "POST" });
      await fetchMiTurno();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar turno");
    } finally {
      setConfirmando(false);
    }
  }

  if (loading) return <div className="flex flex-col h-full"><div className="px-8 py-12 text-sm text-zinc-600">Cargando...</div></div>;
  if (!docenteInfo) return <div className="p-8 text-sm text-red-400">{error ?? "No se encontró perfil de docente."}</div>;

  const esMiTurno = miTurno?.es_mi_turno ?? false;
  const turnoCompletado = miTurno?.estado === "completado";
  const confirmDisabled = confirmando || lectivaPendientes.length > 0;
  const dragActive = activeItem !== null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Mi Horario</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{docenteInfo.apellidos}, {docenteInfo.nombre} - {docenteInfo.modalidad}</p>
          </div>
          <div className="flex items-center gap-4">
            {miTurno?.en_cola ? (
              <div className="text-right">
                {esMiTurno ? (
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Tu turno</p>
                ) : turnoCompletado ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-400 ring-1 ring-blue-500/20">Completado</span>
                ) : (
                  <div>
                    <p className="text-xs text-zinc-500">Posición: <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{miTurno.orden}</span></p>
                    <p className="text-xs text-zinc-600">Esperando turno...</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Fase no iniciada</p>
            )}
            {esMiTurno && (
              <span title={lectivaPendientes.length > 0 ? "Debes colocar todos tus bloques lectivos antes de confirmar" : undefined}>
                <button
                  onClick={handleConfirmar}
                  disabled={confirmDisabled}
                  className="h-8 px-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-[5px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {confirmando ? "Confirmando..." : "Confirmar horario"}
                </button>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[5px] px-4 py-2.5 shrink-0">{error}</div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <aside className="w-56 shrink-0 border-r border-border overflow-y-auto flex flex-col">

            {esMiTurno && (
              <div className="mx-2.5 mt-2.5 text-[10px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/8 border border-blue-200 dark:border-blue-500/20 rounded-[4px] px-2 py-1.5 leading-relaxed">
                Durante tu turno solo puedes asignar tu carga lectiva. Podras completar tu carga no lectiva despues.
              </div>
            )}
            {turnoCompletado && (
              <div className="mx-2.5 mt-2.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/8 border border-emerald-200 dark:border-emerald-500/20 rounded-[4px] px-2 py-1.5 leading-relaxed">
                Tu turno finalizo. Ahora puedes declarar y asignar tu carga no lectiva cuando quieras.
              </div>
            )}

            <div className="px-3 py-2 border-b border-black/[0.05] dark:border-white/6 mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-600">Carga Lectiva</p>
            </div>

            {lectivaPendientes.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-0.5">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Por colocar ({lectivaPendientes.length})</p>
                </div>
                <div className="px-2.5 pt-1.5 pb-1">
                  {lectivaPendientes.map((item, i) => (
                    <DraggableItem key={`lp-${i}-${item.id}`} item={item} disabled={!esMiTurno} colors={getItemColors(item)} />
                  ))}
                </div>
              </>
            )}
            {lectivaColocados.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-0.5">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Colocados ({lectivaColocados.length})</p>
                </div>
                <div className="px-2.5 pt-1.5 pb-1">
                  {lectivaColocados.map((item, i) => {
                    const c = getItemColors(item);
                    return (
                      <div key={`lc-${i}-${item.id}`} className={`${c.bg} ${c.text} opacity-50 border ${c.border} rounded-[5px] px-2.5 py-2 mb-1.5 text-xs`}>
                        <p className="font-medium leading-tight truncate">{item.label}</p>
                        <p className="opacity-70 mt-0.5">{item.duracion}h</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {lectivaPendientes.length === 0 && lectivaColocados.length === 0 && (
              <p className="px-3 py-3 text-[10px] text-zinc-500">Sin carga lectiva asignada</p>
            )}

            {turnoCompletado && (
              <>
                <div className="px-3 py-2 border-t border-b border-black/[0.05] dark:border-white/6 mt-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-600">No Lectiva</p>
                  {cargaOk && <span className="text-[10px] text-emerald-500 font-medium">Guardado</span>}
                </div>

                <div className="px-2.5 pt-2 pb-2 space-y-2">
                  {rubrosActivos.map((r) => (
                    <div key={r}>
                      <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-0.5 truncate">
                        {RUBRO_LABEL_NL[r]} (max {limits[r]}h)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={limits[r]}
                        value={cargaForm[r]}
                        onChange={(e) => setCargaForm((prev) => ({ ...prev, [r]: e.target.value }))}
                        className="w-full h-7 bg-white dark:bg-zinc-900 border border-input rounded-[4px] px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-600/60 focus:border-indigo-600/60 transition-colors duration-150"
                      />
                    </div>
                  ))}
                  {cargaErr && <p className="text-[10px] text-red-400">{cargaErr}</p>}
                  <button
                    onClick={handleSaveCarga}
                    disabled={savingCarga}
                    className="w-full h-7 text-[10px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-[4px] transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 mt-0.5"
                  >
                    {savingCarga ? "Guardando..." : "Declarar horas"}
                  </button>
                </div>

                {noLectivaPendientes.length > 0 && (
                  <>
                    <div className="px-3 pt-1 pb-0.5 border-t border-black/[0.05] dark:border-white/6">
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Por colocar ({noLectivaPendientes.length})</p>
                    </div>
                    <div className="px-2.5 pt-1.5 pb-1">
                      {noLectivaPendientes.map((item, i) => (
                        <DraggableItem key={`nlp-${i}-${item.id}`} item={item} disabled={false} colors={NL_COLOR} />
                      ))}
                    </div>
                  </>
                )}
                {noLectivaColocados.length > 0 && (
                  <>
                    <div className="px-3 pt-1 pb-0.5 border-t border-black/[0.05] dark:border-white/6">
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Colocados ({noLectivaColocados.length})</p>
                    </div>
                    <div className="px-2.5 pt-1.5 pb-1">
                      {noLectivaColocados.map((item, i) => (
                        <div key={`nlc-${i}-${item.id}`} className={`${NL_COLOR.bg} ${NL_COLOR.text} opacity-50 border ${NL_COLOR.border} rounded-[5px] px-2.5 py-2 mb-1.5 text-xs`}>
                          <p className="font-medium leading-tight truncate">{item.label}</p>
                          <p className="opacity-70 mt-0.5">{item.duracion}h</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {turnoCompletado && docenteInfo && (
              <div className="border-t border-black/[0.05] dark:border-white/6 px-2.5 py-2.5 space-y-1.5 mt-auto">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-600 px-0.5 mb-1.5">Descargas</p>
                {[
                  { label: "Mi horario PDF", url: `/api/documentos/mi-horario/${docenteInfo.id}/pdf`, ext: "pdf" },
                  { label: "Mi horario Excel", url: `/api/documentos/mi-horario/${docenteInfo.id}/excel`, ext: "xlsx" },
                  { label: "Declaración Carga Word", url: `/api/documentos/declaracion/${docenteInfo.id}/word`, ext: "docx" },
                  { label: "Declaración Carga PDF", url: `/api/documentos/declaracion/${docenteInfo.id}/pdf`, ext: "pdf" },
                  { label: "Declaración Jurada Word", url: `/api/documentos/declaracion-jurada/${docenteInfo.id}/word`, ext: "docx" },
                  { label: "Declaración Jurada PDF", url: `/api/documentos/declaracion-jurada/${docenteInfo.id}/pdf`, ext: "pdf" },
                ].map(({ label, url, ext }) => (
                  <button
                    key={url}
                    onClick={() => downloadBlob(url, `${label.toLowerCase().replace(/\s+/g, "-")}.${ext}`)}
                    className="w-full text-left text-[10px] px-2 py-1.5 rounded-[4px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors duration-150 truncate"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Grid */}
          <main className="flex-1 overflow-auto p-4">
            {!esMiTurno && !turnoCompletado && miTurno?.en_cola && (
              <div className="mb-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-[5px] px-4 py-2.5">
                Vista de solo lectura hasta que sea tu turno.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `56px repeat(6, minmax(100px, 1fr))`,
                gridTemplateRows: `32px repeat(14, 52px)`,
                position: "relative",
              }}
            >
              {/* Header */}
              <div style={{ gridColumn: 1, gridRow: 1 }} />
              {DIAS.map((dia, di) => (
                <div
                  key={dia}
                  style={{ gridColumn: di + 2, gridRow: 1 }}
                  className="text-center text-xs font-medium text-zinc-500 border-b border-r border-border flex items-center justify-center uppercase tracking-wider"
                >
                  {DIA_LABEL[dia]}
                </div>
              ))}

              {/* Time labels + droppable cells */}
              {HORAS.map((hora, hi) => (
                <React.Fragment key={`hora-${hora}`}>
                  <div
                    style={{ gridColumn: 1, gridRow: hi + 2 }}
                    className="text-right pr-2 text-[10px] text-zinc-500 dark:text-zinc-700 border-b border-black/[0.04] dark:border-white/4 flex items-start pt-1"
                  >
                    {hora}:00
                  </div>
                  {DIAS.map((dia, di) => (
                    <DroppableCell
                      key={`${dia}-${hora}`}
                      id={`${dia}-${hora}`}
                      gridColumn={di + 2}
                      gridRow={hi + 2}
                      blocked={blockedStartHoras.has(`${dia}-${hora}`)}
                      dragActive={dragActive}
                    />
                  ))}
                </React.Fragment>
              ))}

              {/* Other docentes' blocks */}
              {otrosBloques.map((bloque, index) => {
                const startHora = parseHora(bloque.hora_inicio);
                const endHora = parseHora(bloque.hora_fin);
                const startRow = startHora - 7 + 2;
                const span = endHora - startHora;
                const colIdx = DIAS.indexOf(bloque.dia as DiaKey);
                if (colIdx < 0) return null;
                return (
                  <div
                    key={`otro-${index}-${bloque.id}`}
                    style={{ gridColumn: colIdx + 2, gridRow: `${startRow} / span ${span}`, zIndex: 2 }}
                    className="m-0.5 rounded-[4px] bg-zinc-100 dark:bg-white/5 border border-black/[0.06] dark:border-white/8 text-zinc-500 dark:text-zinc-600 text-xs p-1 overflow-hidden"
                    title="Ocupado por otro docente"
                  >
                    <p className="text-[10px] leading-tight">Ocupado</p>
                  </div>
                );
              })}

              {/* My blocks */}
              {misBloques.map((bloque, index) => {
                const startHora = parseHora(bloque.hora_inicio);
                const endHora = parseHora(bloque.hora_fin);
                const startRow = startHora - 7 + 2;
                const span = endHora - startHora;
                const colIdx = DIAS.indexOf(bloque.dia as DiaKey);
                if (colIdx < 0) return null;
                const colors = getBlockColors(bloque.tipo, bloque.asignacion_id, asignaciones);
                const label = TIPO_LABEL[bloque.tipo] ?? bloque.tipo;
                const isLectiva = LECTIVA_TIPOS.has(bloque.tipo);
                const canDelete = (esMiTurno && isLectiva) || (turnoCompletado && !isLectiva);
                return (
                  <div
                    key={`mio-${index}-${bloque.id}`}
                    style={{ gridColumn: colIdx + 2, gridRow: `${startRow} / span ${span}`, zIndex: 3 }}
                    className={`m-0.5 rounded-[4px] ${colors.bg} ${colors.text} text-xs p-1.5 overflow-hidden flex flex-col border ${colors.border}`}
                  >
                    <p className="font-medium leading-tight truncate text-[11px]">{label}</p>
                    <p className="opacity-70 text-[10px] mt-0.5">{startHora}:00-{endHora}:00</p>
                    {canDelete && (
                      <button
                        onClick={() => handleRemoveBloque(bloque.id)}
                        className="mt-auto opacity-60 hover:opacity-100 text-[11px] font-bold text-left transition-opacity"
                        title="Quitar"
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      <DragOverlay>
        {activeItem && (() => {
          const colors = getItemColors(activeItem);
          return (
            <div className={`${colors.bg} ${colors.text} rounded-[5px] px-2.5 py-2 text-xs shadow-2xl opacity-90 pointer-events-none border ${colors.border}`}>
              <p className="font-medium">{activeItem.label}</p>
              <p className="opacity-70 mt-0.5">{activeItem.duracion}h</p>
            </div>
          );
        })()}
      </DragOverlay>

      {pendingPlacement && (
        <AulaModal
          aulas={aulas}
          bloques={bloques}
          dia={pendingPlacement.dia}
          hora={pendingPlacement.hora}
          duracion={pendingPlacement.item.duracion}
          onSelect={(aulaId) => doPlaceBlock(pendingPlacement.item, pendingPlacement.dia, pendingPlacement.hora, aulaId)}
          onCancel={() => setPendingPlacement(null)}
        />
      )}
    </DndContext>
  );
}
