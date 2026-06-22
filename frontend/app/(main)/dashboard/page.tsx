"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Semestre { id: number; anio: number; numero: string; activo: boolean }
interface Docente { id: number; nombre: string; apellidos: string; modalidad: string }
interface Curso { id: number; codigo: string; nombre: string; ciclo: number }
interface Aula { id: number; nombre: string }
interface ColaItem {
  id: number;
  orden: number;
  estado: string;
  turno_fin: string | null;
  docente: { id: number; nombre: string; apellidos: string }
}
interface Fase { id: number; estado: string; colas: ColaItem[] }
interface Bloque { id: number; docente_id: number; hora_inicio: string; hora_fin: string }

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Animated number counter
// ---------------------------------------------------------------------------

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toString() + suffix);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, shouldReduce, count]);

  return <motion.span>{rounded}</motion.span>;
}

// ---------------------------------------------------------------------------
// Stat card accent system
// ---------------------------------------------------------------------------

type AccentKey = "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan";

const ACCENT: Record<AccentKey, { card: string; iconBg: string; iconColor: string }> = {
  blue:    { card: "bg-blue-50 dark:bg-blue-950/25",      iconBg: "bg-blue-100 dark:bg-blue-900/40",      iconColor: "text-blue-600 dark:text-blue-400" },
  emerald: { card: "bg-emerald-50 dark:bg-emerald-950/25",  iconBg: "bg-emerald-100 dark:bg-emerald-900/40",  iconColor: "text-emerald-600 dark:text-emerald-400" },
  violet:  { card: "bg-violet-50 dark:bg-violet-950/25",   iconBg: "bg-violet-100 dark:bg-violet-900/40",   iconColor: "text-violet-600 dark:text-violet-400" },
  amber:   { card: "bg-amber-50 dark:bg-amber-950/25",     iconBg: "bg-amber-100 dark:bg-amber-900/40",     iconColor: "text-amber-600 dark:text-amber-400" },
  rose:    { card: "bg-rose-50 dark:bg-rose-950/25",       iconBg: "bg-rose-100 dark:bg-rose-900/40",       iconColor: "text-rose-600 dark:text-rose-400" },
  cyan:    { card: "bg-cyan-50 dark:bg-cyan-950/25",       iconBg: "bg-cyan-100 dark:bg-cyan-900/40",       iconColor: "text-cyan-600 dark:text-cyan-400" },
};

const NUM_COLOR: Record<AccentKey, string> = {
  blue:    "text-blue-700 dark:text-blue-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  violet:  "text-violet-700 dark:text-violet-300",
  amber:   "text-amber-700 dark:text-amber-300",
  rose:    "text-rose-700 dark:text-rose-300",
  cyan:    "text-cyan-700 dark:text-cyan-300",
};

function StatCard({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: React.ElementType;
  label: string;
  accent: AccentKey;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", duration: 0.25, bounce: 0 }}
      className={`${a.card} rounded-[12px] p-5 shadow-sm`}
    >
      <div className={`inline-flex p-2 rounded-[8px] ${a.iconBg} mb-4`}>
        <Icon className={`w-4 h-4 ${a.iconColor}`} />
      </div>
      {children}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">{label}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Phase status
// ---------------------------------------------------------------------------

const FASE_COLORS: Record<string, string> = {
  pendiente:  "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  en_curso:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  completado: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

const FASE_LABEL: Record<string, string> = {
  pendiente:  "Sin iniciar",
  en_curso:   "En curso",
  completado: "Completada",
};

// ---------------------------------------------------------------------------
// Completion ring (SVG)
// ---------------------------------------------------------------------------

function CompletionRing({ done, total }: { done: number; total: number }) {
  const shouldReduce = useReducedMotion();
  const pct = total > 0 ? done / total : 0;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const pctLabel = total > 0 ? Math.round(pct * 100) : 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[84px] h-[84px] shrink-0">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" strokeWidth="7"
            className="stroke-zinc-100 dark:stroke-zinc-800" />
          <motion.circle
            cx="42" cy="42" r={r}
            fill="none" strokeWidth="7"
            stroke="#6366f1"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={shouldReduce
              ? { duration: 0 }
              : { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-100">
            {pctLabel}%
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {done} <span className="text-zinc-400 font-normal">de {total}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">docentes completaron</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom recharts tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[6px] px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-800 dark:text-zinc-200 mb-0.5">{label}</p>
      <p className="text-indigo-600 dark:text-indigo-400">{payload[0].value} cursos</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHora(s: string) { return parseInt(s.split(":")[0], 10); }

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const shouldReduce = useReducedMotion();

  const [semestre, setSemestre] = useState<Semestre | null>(null);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [docentesActivosCount, setDocentesActivosCount] = useState(0);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [fase, setFase] = useState<Fase | null>(null);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [sRes, dRes, cRes, aRes, fRes, bRes, actRes] = await Promise.allSettled([
        apiFetch<Semestre>("/api/semestres/activo"),
        apiFetch<Docente[]>("/api/docentes"),
        apiFetch<Curso[]>("/api/cursos"),
        apiFetch<Aula[]>("/api/aulas"),
        apiFetch<Fase>("/api/horarios/fase"),
        apiFetch<Bloque[]>("/api/horarios/bloques"),
        apiFetch<{ count: number }>("/api/docentes/activos/count"),
      ]);
      if (sRes.status === "fulfilled") setSemestre(sRes.value);
      if (dRes.status === "fulfilled") setDocentes(dRes.value);
      if (cRes.status === "fulfilled") setCursos(cRes.value);
      if (aRes.status === "fulfilled") setAulas(aRes.value);
      if (fRes.status === "fulfilled") setFase(fRes.value);
      if (bRes.status === "fulfilled") setBloques(bRes.value);
      if (actRes.status === "fulfilled") setDocentesActivosCount(actRes.value.count);
      setLoading(false);
    }
    load();
  }, []);

  // Derived data
  const docentesCompletados = fase ? fase.colas.filter((c) => c.estado === "completado").length : 0;
  const totalEnCola = fase ? fase.colas.length : 0;
  const faseEstado = fase?.estado ?? "pendiente";

  const totalHorasBloques = bloques.reduce(
    (sum, b) => sum + (parseHora(b.hora_fin) - parseHora(b.hora_inicio)), 0
  );
  const horasPromedio = docentesCompletados > 0 ? Math.round(totalHorasBloques / docentesCompletados) : 0;

  const cicloData = Object.entries(
    cursos.reduce((acc, c) => {
      const key = `Ciclo ${c.ciclo}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const na = parseInt(a.name.replace("Ciclo ", "")) || 0;
      const nb = parseInt(b.name.replace("Ciclo ", "")) || 0;
      return na - nb;
    });

  const recentActivity = fase
    ? [...fase.colas].filter((c) => c.estado === "completado").slice(-5).reverse()
    : [];

  const semestreLabel = semestre
    ? `Semestre ${semestre.numero} — ${semestre.anio}`
    : "Sin semestre activo";

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-border shrink-0">
          <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3.5 w-48 bg-zinc-100 dark:bg-zinc-800/60 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-[12px] animate-pulse" />
            ))}
          </div>
          <div className="h-56 bg-zinc-100 dark:bg-zinc-900 rounded-[10px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0"
      >
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{semestreLabel}</p>
        </div>
        {fase && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${FASE_COLORS[faseEstado] ?? ""}`}>
            Fase {(FASE_LABEL[faseEstado] ?? faseEstado)?.toLowerCase()}
          </span>
        )}
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="px-8 py-7 space-y-8"
        >
          {/* 6 stat cards */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
            <StatCard icon={Users} label="Docentes activos" accent="blue">
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${NUM_COLOR.blue}`}>
                <AnimatedNumber value={docentesActivosCount} />
              </div>
            </StatCard>

            <StatCard icon={BookOpen} label="Cursos del semestre" accent="emerald">
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${NUM_COLOR.emerald}`}>
                <AnimatedNumber value={cursos.length} />
              </div>
            </StatCard>

            <StatCard icon={Building2} label="Aulas registradas" accent="violet">
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${NUM_COLOR.violet}`}>
                <AnimatedNumber value={aulas.length} />
              </div>
            </StatCard>

            <StatCard icon={Calendar} label="Estado de la fase" accent="amber">
              <div className="py-0.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${FASE_COLORS[faseEstado] ?? ""}`}>
                  {FASE_LABEL[faseEstado] ?? faseEstado}
                </span>
              </div>
            </StatCard>

            <StatCard icon={CheckCircle} label="Docentes que completaron" accent="rose">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tabular-nums tracking-tight ${NUM_COLOR.rose}`}>
                  <AnimatedNumber value={docentesCompletados} />
                </span>
                {totalEnCola > 0 && (
                  <span className="text-sm text-zinc-400">de {totalEnCola}</span>
                )}
              </div>
            </StatCard>

            <StatCard icon={Clock} label="Horas promedio por docente" accent="cyan">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold tabular-nums tracking-tight ${NUM_COLOR.cyan}`}>
                  <AnimatedNumber value={horasPromedio} />
                </span>
                {horasPromedio > 0 && (
                  <span className="text-sm text-zinc-400">hrs</span>
                )}
              </div>
            </StatCard>
          </div>

          {/* Two-column: chart + completion */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Bar chart */}
            <motion.div
              variants={fadeUp}
              className="bg-white dark:bg-zinc-900 border border-border rounded-[10px] px-6 py-5"
            >
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-5">
                Cursos por ciclo
              </p>
              {cicloData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-zinc-400">
                  Sin datos de cursos
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={cicloData.length * 40 + 24}>
                  <BarChart
                    data={cicloData}
                    layout="vertical"
                    margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#71717a" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={56}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#71717a" }}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
                    <Bar
                      dataKey="count"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Right panel: completion + phase */}
            <div className="space-y-4">
              <motion.div
                variants={fadeUp}
                className="bg-white dark:bg-zinc-900 border border-border rounded-[10px] px-6 py-5"
              >
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                  Horarios completados
                </p>
                {fase ? (
                  <CompletionRing done={docentesCompletados} total={totalEnCola} />
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500">Fase no iniciada</p>
                )}
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="bg-white dark:bg-zinc-900 border border-border rounded-[10px] px-6 py-5"
              >
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Estado del sistema
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Semestre</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${semestre ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" : "text-zinc-500 bg-zinc-100 dark:bg-white/5"}`}>
                      {semestre ? "Activo" : "Ninguno"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Fase horarios</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${FASE_COLORS[faseEstado] ?? ""}`}>
                      {FASE_LABEL[faseEstado] ?? faseEstado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Total docentes</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{docentes.length}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Recent activity */}
          {recentActivity.length > 0 && (
            <motion.div variants={fadeUp}>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Actividad reciente
              </p>
              <div className="space-y-px rounded-[8px] overflow-hidden border border-border">
                {recentActivity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.5 + i * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-center justify-between bg-white dark:bg-zinc-900 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                        {item.docente.apellidos}, {item.docente.nombre}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-400">
                      Completado
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {docentes.length === 0 && cursos.length === 0 && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center py-16 text-zinc-400"
            >
              <p className="text-sm">El sistema no tiene datos configurados aun.</p>
              <p className="text-xs mt-1">Comienza creando facultades, docentes y cursos.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
