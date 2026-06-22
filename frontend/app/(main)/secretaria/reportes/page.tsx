"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;
type DiaKey = (typeof DIAS)[number];

const DIA_LABEL: Record<DiaKey, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié",
  jueves: "Jue", viernes: "Vie", sabado: "Sáb",
};

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7);

const CURSO_PALETTE = [
  { bg: "bg-indigo-500", text: "text-white", border: "border-indigo-400" },
  { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-400" },
  { bg: "bg-amber-500", text: "text-white", border: "border-amber-400" },
  { bg: "bg-rose-500", text: "text-white", border: "border-rose-400" },
  { bg: "bg-cyan-500", text: "text-white", border: "border-cyan-400" },
  { bg: "bg-violet-500", text: "text-white", border: "border-violet-400" },
  { bg: "bg-orange-500", text: "text-white", border: "border-orange-400" },
  { bg: "bg-teal-500", text: "text-white", border: "border-teal-400" },
];

function getCursoColor(cursoId: number) {
  return CURSO_PALETTE[cursoId % CURSO_PALETTE.length];
}

const NL_COLOR = { bg: "bg-slate-500", text: "text-white", border: "border-slate-400" };
const FALLBACK_COLOR = { bg: "bg-zinc-600", text: "text-white", border: "border-zinc-500" };

function parseHora(s: string) { return parseInt(s.split(":")[0], 10); }

interface Semestre { id: number; anio: number; numero: string; activo: boolean }
interface Docente { id: number; nombre: string; apellidos: string }
interface Curso { id: number; nombre: string; ciclo: number }
interface Asignacion { id: number; curso: Curso; docente_id: number }
interface Aula { id: number; nombre: string; ubicacion?: string }
interface Laboratorio { id: number; nombre: string; capacidad: number }
interface Bloque { id: number; docente_id: number; asignacion_id: number | null; tipo: string; dia: string; hora_inicio: string; hora_fin: string; aula_id: number | null; laboratorio_id: number | null; turno_laboratorio_id: number | null }

const CICLOS = [1, 3, 5, 7, 9];

export default function ReportesGlobalesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [semestre, setSemestre] = useState<Semestre | null>(null);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [labs, setLabs] = useState<Laboratorio[]>([]);

  const [modo, setModo] = useState<"ciclo" | "espacio" | "docente">("ciclo");
  
  const [selCiclo, setSelCiclo] = useState<number>(1);
  const [selEspacio, setSelEspacio] = useState<string>(""); // "aula-X" or "lab-X"
  const [selDocente, setSelDocente] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const sRes = await apiFetch<Semestre>("/api/semestres/activo").catch(() => null);
        setSemestre(sRes);

        if (!sRes) {
          setLoading(false);
          return;
        }

        const [bRes, aRes, dRes, auRes, lbRes] = await Promise.all([
          apiFetch<Bloque[]>("/api/horarios/bloques"),
          apiFetch<Asignacion[]>("/api/asignaciones"),
          apiFetch<Docente[]>("/api/docentes"),
          apiFetch<Aula[]>("/api/aulas"),
          apiFetch<Laboratorio[]>("/api/laboratorios"),
        ]);
        
        setBloques(bRes);
        setAsignaciones(aRes);
        setDocentes(dRes);
        setAulas(auRes);
        setLabs(lbRes);

        if (auRes.length > 0) setSelEspacio(`aula-${auRes[0].id}`);
        else if (lbRes.length > 0) setSelEspacio(`lab-${lbRes[0].id}`);
        if (dRes.length > 0) setSelDocente(dRes[0].id);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando datos");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const asignacionMap = useMemo(() => {
    const map = new Map<number, Asignacion>();
    for (const a of asignaciones) map.set(a.id, a);
    return map;
  }, [asignaciones]);

  const docenteMap = useMemo(() => {
    const map = new Map<number, Docente>();
    for (const d of docentes) map.set(d.id, d);
    return map;
  }, [docentes]);

  const aulaMap = useMemo(() => {
    const map = new Map<number, Aula>();
    for (const a of aulas) map.set(a.id, a);
    return map;
  }, [aulas]);

  const labMap = useMemo(() => {
    const map = new Map<number, Laboratorio>();
    for (const l of labs) map.set(l.id, l);
    return map;
  }, [labs]);

  // Derived filtered blocks
  const filteredBlocks = useMemo(() => {
    return bloques.filter((b) => {
      const asig = b.asignacion_id ? asignacionMap.get(b.asignacion_id) : null;
      
      if (modo === "ciclo") {
        if (!asig) return false; // Non-lectiva has no curso/ciclo
        return asig.curso.ciclo === selCiclo;
      }
      
      if (modo === "espacio") {
        if (!selEspacio) return false;
        const [type, idStr] = selEspacio.split("-");
        const id = parseInt(idStr, 10);
        if (type === "aula") return b.aula_id === id;
        if (type === "lab") return b.laboratorio_id === id;
        return false;
      }
      
      if (modo === "docente") {
        return b.docente_id === selDocente;
      }

      return false;
    });
  }, [bloques, asignacionMap, modo, selCiclo, selEspacio, selDocente]);

  // Renders the block content based on mode
  const renderBlockContent = (bloque: Bloque) => {
    const asig = bloque.asignacion_id ? asignacionMap.get(bloque.asignacion_id) : null;
    const docente = docenteMap.get(bloque.docente_id);
    
    let espacioStr = "—";
    if (bloque.aula_id) {
      espacioStr = aulaMap.get(bloque.aula_id)?.nombre ?? "Aula";
    } else if (bloque.laboratorio_id) {
      espacioStr = labMap.get(bloque.laboratorio_id)?.nombre ?? "Laboratorio";
    }

    const title = asig ? asig.curso.nombre : (bloque.tipo.charAt(0).toUpperCase() + bloque.tipo.slice(1));
    const subtitle1 = docente ? `${docente.apellidos}, ${docente.nombre}` : "Desconocido";
    const subtitle2 = espacioStr;

    return (
      <>
        <p className="font-medium leading-tight truncate mb-0.5">{title}</p>
        <p className="text-[10px] leading-tight truncate opacity-90">{subtitle1}</p>
        <p className="text-[10px] leading-tight truncate opacity-80 mt-0.5">{subtitle2}</p>
      </>
    );
  };

  const LECTIVA_TIPOS = new Set(["teoria", "practica", "laboratorio"]);

  if (loading) {
    return <div className="p-8 text-zinc-500">Cargando reportes...</div>;
  }

  if (!semestre) {
    return <div className="p-8 text-zinc-500">No hay un semestre activo para mostrar horarios.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Header & Tabs */}
      <div className="border-b border-border px-8 py-5 flex flex-col gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Reportes Globales</h1>
          <p className="text-sm text-zinc-500">Consolidado de Horarios - Semestre {semestre.numero} {semestre.anio}</p>
        </div>

        <div className="flex items-end justify-between">
          <div className="flex gap-2">
            {(["ciclo", "espacio", "docente"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors duration-150 capitalize ${
                  modo === m 
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                Por {m}
              </button>
            ))}
          </div>

          <div className="flex gap-4 items-center">
            {modo === "ciclo" && (
              <select
                value={selCiclo}
                onChange={(e) => setSelCiclo(parseInt(e.target.value, 10))}
                className="h-9 w-40 px-3 bg-white dark:bg-zinc-900 border border-input rounded-[5px] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {CICLOS.map((c) => (
                  <option key={c} value={c}>Ciclo {c}</option>
                ))}
              </select>
            )}

            {modo === "espacio" && (
              <select
                value={selEspacio}
                onChange={(e) => setSelEspacio(e.target.value)}
                className="h-9 w-56 px-3 bg-white dark:bg-zinc-900 border border-input rounded-[5px] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {aulas.length > 0 && <optgroup label="Aulas">
                  {aulas.map((a) => <option key={`aula-${a.id}`} value={`aula-${a.id}`}>{a.nombre}</option>)}
                </optgroup>}
                {labs.length > 0 && <optgroup label="Laboratorios">
                  {labs.map((l) => <option key={`lab-${l.id}`} value={`lab-${l.id}`}>{l.nombre}</option>)}
                </optgroup>}
              </select>
            )}

            {modo === "docente" && (
              <select
                value={selDocente}
                onChange={(e) => setSelDocente(parseInt(e.target.value, 10))}
                className="h-9 w-64 px-3 bg-white dark:bg-zinc-900 border border-input rounded-[5px] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>{d.apellidos}, {d.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {error && <div className="m-4 text-xs text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4 relative bg-zinc-50/50 dark:bg-zinc-900/10">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `56px repeat(6, minmax(140px, 1fr))`,
            gridTemplateRows: `32px repeat(14, 60px)`,
            position: "relative",
            minWidth: "1000px"
          }}
        >
          {/* Header */}
          <div style={{ gridColumn: 1, gridRow: 1 }} />
          {DIAS.map((dia, di) => (
            <div
              key={dia}
              style={{ gridColumn: di + 2, gridRow: 1 }}
              className="text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-r border-border flex items-center justify-center uppercase tracking-wider"
            >
              {DIA_LABEL[dia]}
            </div>
          ))}

          {/* Time cells */}
          {HORAS.map((hora, hi) => (
            <React.Fragment key={`hora-${hora}`}>
              <div
                style={{ gridColumn: 1, gridRow: hi + 2 }}
                className="text-right pr-2 text-[11px] text-zinc-500 font-medium border-b border-black/[0.04] dark:border-white/4 flex items-start pt-1.5"
              >
                {hora}:00
              </div>
              {DIAS.map((dia, di) => (
                <div
                  key={`${dia}-${hora}`}
                  style={{ gridColumn: di + 2, gridRow: hi + 2, zIndex: 1 }}
                  className="border-b border-r border-black/[0.04] dark:border-white/4 min-h-[60px]"
                />
              ))}
            </React.Fragment>
          ))}

          {/* Blocks with Absolute Positioning and Clustering */}
          {DIAS.map((dia, colIdx) => {
            const diaBloques = filteredBlocks
              .filter((b) => b.dia === dia)
              .map((b) => ({
                ...b,
                startH: parseHora(b.hora_inicio),
                endH: parseHora(b.hora_fin),
              }))
              .sort((a, b) => a.startH - b.startH || b.endH - a.endH);

            // 1. Find overlapping clusters
            const clusters: (typeof diaBloques)[] = [];
            let currentCluster: typeof diaBloques = [];
            let clusterEnd = -1;

            for (const b of diaBloques) {
              if (b.startH >= clusterEnd) {
                if (currentCluster.length > 0) clusters.push(currentCluster);
                currentCluster = [b];
                clusterEnd = b.endH;
              } else {
                currentCluster.push(b);
                clusterEnd = Math.max(clusterEnd, b.endH);
              }
            }
            if (currentCluster.length > 0) clusters.push(currentCluster);

            return (
              <div
                key={`col-${dia}`}
                style={{ gridColumn: colIdx + 2, gridRow: "2 / span 14", position: "relative", zIndex: 2 }}
              >
                {clusters.map((cluster, cIdx) => {
                  // 2. Determine columns inside cluster to avoid overlap
                  const columns: (typeof diaBloques)[] = [];
                  const blockCols = new Map<number, number>();

                  for (const b of cluster) {
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                      const col = columns[i];
                      if (col[col.length - 1].endH <= b.startH) {
                        col.push(b);
                        blockCols.set(b.id, i);
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) {
                      columns.push([b]);
                      blockCols.set(b.id, columns.length - 1);
                    }
                  }

                  const numCols = columns.length;
                  const colWidth = 100 / numCols;

                  return cluster.map((b) => {
                    const c = blockCols.get(b.id) || 0;
                    const top = (b.startH - 7) * 60;
                    const height = (b.endH - b.startH) * 60;
                    const leftStr = `${c * colWidth}%`;
                    const widthStr = `${colWidth}%`;

                    let colors = NL_COLOR;
                    if (LECTIVA_TIPOS.has(b.tipo)) {
                      if (b.asignacion_id) {
                        const asig = asignacionMap.get(b.asignacion_id);
                        if (asig) colors = getCursoColor(asig.curso.id);
                        else colors = FALLBACK_COLOR;
                      } else {
                        colors = FALLBACK_COLOR;
                      }
                    }

                    return (
                      <div
                        key={b.id}
                        style={{
                          position: "absolute",
                          top: top + 1,
                          height: height - 2,
                          left: leftStr,
                          width: widthStr,
                          padding: "2px",
                        }}
                      >
                        <div
                          className={`h-full w-full rounded-[5px] border ${colors.bg} ${colors.text} ${colors.border} p-1.5 text-xs overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col`}
                        >
                          {renderBlockContent(b)}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
