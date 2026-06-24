from datetime import date, time, datetime
from pydantic import BaseModel, EmailStr
from models import DiaEnum, RolEnum, CondicionEnum, ModalidadEnum, SemestreNumeroEnum, TipoBloqueEnum, TipoCursoEnum


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------

class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    rol: RolEnum


class UsuarioResponse(BaseModel):
    id: int
    email: str
    rol: RolEnum
    activo: bool

    model_config = {"from_attributes": True}


class UsuarioBasic(BaseModel):
    id: int
    email: str
    activo: bool

    model_config = {"from_attributes": True}


class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    rol: RolEnum | None = None
    activo: bool | None = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str
    rol: RolEnum


# ---------------------------------------------------------------------------
# Facultad
# ---------------------------------------------------------------------------

class FacultadCreate(BaseModel):
    nombre: str


class FacultadUpdate(BaseModel):
    nombre: str | None = None


class FacultadResponse(BaseModel):
    id: int
    nombre: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Departamento
# ---------------------------------------------------------------------------

class DepartamentoCreate(BaseModel):
    nombre: str
    facultad_id: int


class DepartamentoUpdate(BaseModel):
    nombre: str | None = None
    facultad_id: int | None = None


class DepartamentoResponse(BaseModel):
    id: int
    nombre: str
    facultad_id: int
    facultad: FacultadResponse

    model_config = {"from_attributes": True}


class DepartamentoBasic(BaseModel):
    id: int
    nombre: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# EscuelaProfesional
# ---------------------------------------------------------------------------

class EscuelaCreate(BaseModel):
    nombre: str
    departamento_id: int


class EscuelaUpdate(BaseModel):
    nombre: str | None = None
    departamento_id: int | None = None


class EscuelaResponse(BaseModel):
    id: int
    nombre: str
    departamento_id: int
    departamento: DepartamentoResponse

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Aula
# ---------------------------------------------------------------------------

class AulaCreate(BaseModel):
    nombre: str
    ubicacion: str


class AulaUpdate(BaseModel):
    nombre: str | None = None
    ubicacion: str | None = None


class AulaResponse(BaseModel):
    id: int
    nombre: str
    ubicacion: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Laboratorio
# ---------------------------------------------------------------------------

class LaboratorioCreate(BaseModel):
    nombre: str
    capacidad: int


class LaboratorioUpdate(BaseModel):
    nombre: str | None = None
    capacidad: int | None = None


class LaboratorioResponse(BaseModel):
    id: int
    nombre: str
    capacidad: int

    model_config = {"from_attributes": True}


class EscuelaBasic(BaseModel):
    id: int
    nombre: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Docente
# ---------------------------------------------------------------------------

class DocenteCreate(BaseModel):
    nombre: str
    apellidos: str
    dni: str
    codigo_ibm: str
    condicion: CondicionEnum
    modalidad: ModalidadEnum
    fecha_ingreso_unt: date
    departamento_id: int
    email: EmailStr
    password: str


class DocenteUpdate(BaseModel):
    nombre: str | None = None
    apellidos: str | None = None
    dni: str | None = None
    codigo_ibm: str | None = None
    condicion: CondicionEnum | None = None
    modalidad: ModalidadEnum | None = None
    fecha_ingreso_unt: date | None = None
    departamento_id: int | None = None


class DocenteResponse(BaseModel):
    id: int
    nombre: str
    apellidos: str
    dni: str
    codigo_ibm: str
    condicion: CondicionEnum
    modalidad: ModalidadEnum
    fecha_ingreso_unt: date
    departamento_id: int
    departamento: DepartamentoBasic
    usuario: UsuarioBasic | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Semestre
# ---------------------------------------------------------------------------

class SemestreCreate(BaseModel):
    anio: int
    numero: SemestreNumeroEnum
    fecha_inicio: date
    fecha_fin: date


class SemestreUpdate(BaseModel):
    anio: int | None = None
    numero: SemestreNumeroEnum | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None


class SemestreResponse(BaseModel):
    id: int
    anio: int
    numero: SemestreNumeroEnum
    fecha_inicio: date
    fecha_fin: date
    activo: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Curricula
# ---------------------------------------------------------------------------

class CurriculaCreate(BaseModel):
    nombre: str
    escuela_id: int
    activa: bool = True


class CurriculaUpdate(BaseModel):
    nombre: str | None = None
    escuela_id: int | None = None
    activa: bool | None = None


class CurriculaResponse(BaseModel):
    id: int
    nombre: str
    escuela_id: int
    activa: bool
    escuela: EscuelaBasic

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Curso
# ---------------------------------------------------------------------------

class CursoCreate(BaseModel):
    codigo: str
    nombre: str
    ciclo: int
    horas_teoria: int
    horas_practica: int
    horas_laboratorio: int = 0
    num_alumnos: int
    tipo: TipoCursoEnum = TipoCursoEnum.obligatorio
    escuela_id: int
    curricula_id: int


class CursoUpdate(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    ciclo: int | None = None
    horas_teoria: int | None = None
    horas_practica: int | None = None
    horas_laboratorio: int | None = None
    creditos: int | None = None
    num_alumnos: int | None = None
    tipo: TipoCursoEnum | None = None
    escuela_id: int | None = None
    curricula_id: int | None = None
    departamento_id: int | None = None


class CursoResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    ciclo: int
    horas_teoria: int
    horas_practica: int
    horas_laboratorio: int
    creditos: int
    num_alumnos: int
    tipo: TipoCursoEnum
    escuela_id: int
    curricula_id: int
    departamento_id: int | None = None
    escuela: EscuelaBasic
    departamento: DepartamentoBasic | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# TurnoLaboratorio
# ---------------------------------------------------------------------------

class TurnoLaboratorioResponse(BaseModel):
    id: int
    asignacion_id: int
    laboratorio_id: int | None
    numero_turno: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# AsignacionCarga
# ---------------------------------------------------------------------------

class DocenteBasic(BaseModel):
    id: int
    nombre: str
    apellidos: str
    modalidad: ModalidadEnum

    model_config = {"from_attributes": True}


class AsignacionCreate(BaseModel):
    docente_id: int
    curso_id: int
    semestre_id: int
    dicta_teoria: bool = False
    grupos_teoria: int = 1
    dicta_practica: bool = False
    grupos_practica: int = 1
    num_turnos_laboratorio: int = 0


class AsignacionUpdate(BaseModel):
    dicta_teoria: bool | None = None
    grupos_teoria: int | None = None
    dicta_practica: bool | None = None
    grupos_practica: int | None = None
    num_turnos_laboratorio: int | None = None


class AsignacionResponse(BaseModel):
    id: int
    docente_id: int
    curso_id: int
    semestre_id: int
    dicta_teoria: bool
    grupos_teoria: int
    dicta_practica: bool
    grupos_practica: int
    docente: DocenteBasic
    curso: CursoResponse
    turnos_laboratorio: list[TurnoLaboratorioResponse]

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# CargaNoLectiva
# ---------------------------------------------------------------------------

class RubroItem(BaseModel):
    rubro: str
    horas_asignadas: int


class CargaNoLectivaCreate(BaseModel):
    docente_id: int
    rubros: list[RubroItem]


class CargaNoLectivaResponse(BaseModel):
    id: int
    docente_id: int
    semestre_id: int
    rubro: TipoBloqueEnum
    horas_asignadas: int

    model_config = {"from_attributes": True}


class ResumenCargaResponse(BaseModel):
    horas_lectivas: int
    horas_no_lectivas: int
    total_horas: int
    horas_maximas: int
    horas_restantes: int


# ---------------------------------------------------------------------------
# Horarios
# ---------------------------------------------------------------------------

class ColaHorarioResponse(BaseModel):
    id: int
    orden: int
    estado: str
    turno_inicio: datetime | None
    turno_fin: datetime | None
    docente: DocenteBasic

    model_config = {"from_attributes": True}


class FaseHorarioResponse(BaseModel):
    id: int
    semestre_id: int
    estado: str
    colas: list[ColaHorarioResponse]

    model_config = {"from_attributes": True}


class BloqueHorarioCreate(BaseModel):
    tipo: TipoBloqueEnum
    dia: DiaEnum
    hora_inicio: time
    hora_fin: time
    aula_id: int | None = None
    laboratorio_id: int | None = None
    turno_laboratorio_id: int | None = None
    asignacion_id: int | None = None


class BloqueNoLectivaCreate(BaseModel):
    tipo: TipoBloqueEnum
    dia: DiaEnum
    hora_inicio: time
    hora_fin: time


class BloqueHorarioResponse(BaseModel):
    id: int
    docente_id: int
    semestre_id: int
    tipo: str
    dia: str
    hora_inicio: time
    hora_fin: time
    aula_id: int | None
    laboratorio_id: int | None
    turno_laboratorio_id: int | None
    asignacion_id: int | None

    model_config = {"from_attributes": True}


class MiTurnoResponse(BaseModel):
    en_cola: bool
    estado: str | None
    orden: int | None
    turno_inicio: datetime | None
    turno_fin: datetime | None
    es_mi_turno: bool
    tiempo_restante_segundos: int | None
    fase_estado: str | None = None

# ---------------------------------------------------------------------------
# Carga No Lectiva
# ---------------------------------------------------------------------------

class CargaNoLectivaItem(BaseModel):
    rubro: TipoBloqueEnum
    horas_asignadas: int
    descripcion: str | None = None

    model_config = {"from_attributes": True}

class CargaNoLectivaUpdate(BaseModel):
    items: list[CargaNoLectivaItem]
