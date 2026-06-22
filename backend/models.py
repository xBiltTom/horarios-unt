import enum
from datetime import date, time, datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, String, Time, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RolEnum(str, enum.Enum):
    admin = "admin"
    director = "director"
    secretaria = "secretaria"
    docente = "docente"


class CondicionEnum(str, enum.Enum):
    nombrado = "nombrado"
    contratado = "contratado"


class ModalidadEnum(str, enum.Enum):
    tiempo_completo = "tiempo_completo"
    tiempo_parcial = "tiempo_parcial"


class TipoCursoEnum(str, enum.Enum):
    sello = "sello"
    obligatorio = "obligatorio"
    opcional = "opcional"
    electivo = "electivo"


class SemestreNumeroEnum(str, enum.Enum):
    I = "I"
    II = "II"


class TipoBloqueEnum(str, enum.Enum):
    teoria = "teoria"
    practica = "practica"
    laboratorio = "laboratorio"
    preparacion = "preparacion"
    consejeria = "consejeria"
    investigacion = "investigacion"
    rsu = "rsu"
    asesoria = "asesoria"
    capacitacion = "capacitacion"
    actividades_gobierno = "actividades_gobierno"
    actividades_administracion = "actividades_administracion"
    comites_comisiones = "comites_comisiones"


class DiaEnum(str, enum.Enum):
    lunes = "lunes"
    martes = "martes"
    miercoles = "miercoles"
    jueves = "jueves"
    viernes = "viernes"
    sabado = "sabado"


class EstadoFaseEnum(str, enum.Enum):
    pendiente = "pendiente"
    activo = "activo"
    completado = "completado"


class EstadoColaEnum(str, enum.Enum):
    pendiente = "pendiente"
    activo = "activo"
    completado = "completado"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    docente = relationship("Docente", back_populates="usuario", uselist=False)


class Facultad(Base):
    __tablename__ = "facultad"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)

    departamentos = relationship("Departamento", back_populates="facultad")


class Departamento(Base):
    __tablename__ = "departamento"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    facultad_id = Column(Integer, ForeignKey("facultad.id"), nullable=False)

    facultad = relationship("Facultad", back_populates="departamentos")
    escuelas = relationship("EscuelaProfesional", back_populates="departamento")
    docentes = relationship("Docente", back_populates="departamento")


class EscuelaProfesional(Base):
    __tablename__ = "escuela_profesional"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    departamento_id = Column(Integer, ForeignKey("departamento.id"), nullable=False)

    departamento = relationship("Departamento", back_populates="escuelas")
    cursos = relationship("Curso", back_populates="escuela")


class Docente(Base):
    __tablename__ = "docente"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    apellidos = Column(String(255), nullable=False)
    dni = Column(String(20), unique=True, nullable=False)
    codigo_ibm = Column(String(50), unique=True, nullable=False)
    condicion = Column(Enum(CondicionEnum), nullable=False)
    modalidad = Column(Enum(ModalidadEnum), nullable=False)
    fecha_ingreso_unt = Column(Date, nullable=False)
    departamento_id = Column(Integer, ForeignKey("departamento.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), unique=True, nullable=True)

    departamento = relationship("Departamento", back_populates="docentes")
    usuario = relationship("Usuario", back_populates="docente")
    asignaciones = relationship("AsignacionCarga", back_populates="docente")
    bloques = relationship("BloqueHorario", back_populates="docente")
    colas = relationship("ColaHorario", back_populates="docente")
    carga_no_lectiva = relationship("CargaNoLectiva", back_populates="docente")


class Semestre(Base):
    __tablename__ = "semestre"

    id = Column(Integer, primary_key=True)
    anio = Column(Integer, nullable=False)
    numero = Column(Enum(SemestreNumeroEnum), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    activo = Column(Boolean, default=False, nullable=False)

    cursos = relationship("Curso", back_populates="semestre")
    asignaciones = relationship("AsignacionCarga", back_populates="semestre")
    bloques = relationship("BloqueHorario", back_populates="semestre")
    fase = relationship("FaseHorario", back_populates="semestre", uselist=False)
    carga_no_lectiva = relationship("CargaNoLectiva", back_populates="semestre")


class Curso(Base):
    __tablename__ = "curso"

    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), nullable=False)
    nombre = Column(String(255), nullable=False)
    ciclo = Column(Integer, nullable=False)
    horas_teoria = Column(Integer, nullable=False)
    horas_practica = Column(Integer, nullable=False)
    horas_laboratorio = Column(Integer, default=0, nullable=False)
    creditos = Column(Integer, default=3, nullable=False)
    num_alumnos = Column(Integer, nullable=False)
    tipo = Column(Enum(TipoCursoEnum), default=TipoCursoEnum.obligatorio, nullable=False)
    escuela_id = Column(Integer, ForeignKey("escuela_profesional.id"), nullable=False)
    semestre_id = Column(Integer, ForeignKey("semestre.id"), nullable=False)
    departamento_id = Column(Integer, ForeignKey("departamento.id"), nullable=True)

    escuela = relationship("EscuelaProfesional", back_populates="cursos")
    semestre = relationship("Semestre", back_populates="cursos")
    departamento = relationship("Departamento")
    asignaciones = relationship("AsignacionCarga", back_populates="curso")


class Aula(Base):
    __tablename__ = "aula"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    ubicacion = Column(String(255), nullable=False)

    bloques = relationship("BloqueHorario", back_populates="aula")


class Laboratorio(Base):
    __tablename__ = "laboratorio"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    capacidad = Column(Integer, nullable=False)

    bloques = relationship("BloqueHorario", back_populates="laboratorio")
    turnos = relationship("TurnoLaboratorio", back_populates="laboratorio")


class AsignacionCarga(Base):
    __tablename__ = "asignacion_carga"

    id = Column(Integer, primary_key=True)
    docente_id = Column(Integer, ForeignKey("docente.id"), nullable=False)
    curso_id = Column(Integer, ForeignKey("curso.id"), nullable=False)
    semestre_id = Column(Integer, ForeignKey("semestre.id"), nullable=False)
    dicta_teoria = Column(Boolean, default=False, nullable=False)
    grupos_teoria = Column(Integer, default=1, nullable=False)
    dicta_practica = Column(Boolean, default=False, nullable=False)
    grupos_practica = Column(Integer, default=1, nullable=False)

    docente = relationship("Docente", back_populates="asignaciones")
    curso = relationship("Curso", back_populates="asignaciones")
    semestre = relationship("Semestre", back_populates="asignaciones")
    turnos_laboratorio = relationship("TurnoLaboratorio", back_populates="asignacion")
    bloques = relationship("BloqueHorario", back_populates="asignacion")


class TurnoLaboratorio(Base):
    __tablename__ = "turno_laboratorio"

    id = Column(Integer, primary_key=True)
    asignacion_id = Column(Integer, ForeignKey("asignacion_carga.id"), nullable=False)
    laboratorio_id = Column(Integer, ForeignKey("laboratorio.id"), nullable=True)
    numero_turno = Column(Integer, nullable=False)

    asignacion = relationship("AsignacionCarga", back_populates="turnos_laboratorio")
    laboratorio = relationship("Laboratorio", back_populates="turnos")
    bloques = relationship("BloqueHorario", back_populates="turno_laboratorio")


class BloqueHorario(Base):
    __tablename__ = "bloque_horario"

    id = Column(Integer, primary_key=True)
    docente_id = Column(Integer, ForeignKey("docente.id"), nullable=False)
    semestre_id = Column(Integer, ForeignKey("semestre.id"), nullable=False)
    tipo = Column(Enum(TipoBloqueEnum), nullable=False)
    dia = Column(Enum(DiaEnum), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    aula_id = Column(Integer, ForeignKey("aula.id"), nullable=True)
    laboratorio_id = Column(Integer, ForeignKey("laboratorio.id"), nullable=True)
    turno_laboratorio_id = Column(Integer, ForeignKey("turno_laboratorio.id"), nullable=True)
    asignacion_id = Column(Integer, ForeignKey("asignacion_carga.id"), nullable=True)

    docente = relationship("Docente", back_populates="bloques")
    semestre = relationship("Semestre", back_populates="bloques")
    aula = relationship("Aula", back_populates="bloques")
    laboratorio = relationship("Laboratorio", back_populates="bloques")
    turno_laboratorio = relationship("TurnoLaboratorio", back_populates="bloques")
    asignacion = relationship("AsignacionCarga", back_populates="bloques")


class FaseHorario(Base):
    __tablename__ = "fase_horario"

    id = Column(Integer, primary_key=True)
    semestre_id = Column(Integer, ForeignKey("semestre.id"), unique=True, nullable=False)
    estado = Column(Enum(EstadoFaseEnum), default=EstadoFaseEnum.pendiente, nullable=False)

    semestre = relationship("Semestre", back_populates="fase")
    colas = relationship("ColaHorario", back_populates="fase")


class ColaHorario(Base):
    __tablename__ = "cola_horario"

    id = Column(Integer, primary_key=True)
    fase_id = Column(Integer, ForeignKey("fase_horario.id"), nullable=False)
    docente_id = Column(Integer, ForeignKey("docente.id"), nullable=False)
    orden = Column(Integer, nullable=False)
    estado = Column(Enum(EstadoColaEnum), default=EstadoColaEnum.pendiente, nullable=False)
    turno_inicio = Column(DateTime, nullable=True)
    turno_fin = Column(DateTime, nullable=True)

    fase = relationship("FaseHorario", back_populates="colas")
    docente = relationship("Docente", back_populates="colas")


class CargaNoLectiva(Base):
    __tablename__ = "carga_no_lectiva"

    id = Column(Integer, primary_key=True)
    docente_id = Column(Integer, ForeignKey("docente.id"), nullable=False)
    semestre_id = Column(Integer, ForeignKey("semestre.id"), nullable=False)
    rubro = Column(Enum(TipoBloqueEnum), nullable=False)
    horas_asignadas = Column(Integer, nullable=False, default=0)
    descripcion = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("docente_id", "semestre_id", "rubro", name="uq_carga_no_lectiva"),
    )

    docente = relationship("Docente", back_populates="carga_no_lectiva")
    semestre = relationship("Semestre", back_populates="carga_no_lectiva")
