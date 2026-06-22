from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user, require_secretaria
from database import get_db
from models import AsignacionCarga, Curso, Docente, RolEnum, Semestre, TurnoLaboratorio, Usuario
from schemas import AsignacionCreate, AsignacionResponse, AsignacionUpdate

router = APIRouter(prefix="/api/asignaciones", tags=["asignaciones"])


def _load_one(db: Session, asignacion_id: int) -> AsignacionCarga | None:
    return (
        db.query(AsignacionCarga)
        .options(
            joinedload(AsignacionCarga.docente),
            joinedload(AsignacionCarga.curso).joinedload(Curso.escuela),
            joinedload(AsignacionCarga.turnos_laboratorio),
        )
        .filter(AsignacionCarga.id == asignacion_id)
        .first()
    )


def _active_semestre(db: Session) -> Semestre:
    s = db.query(Semestre).filter(Semestre.activo == True).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay semestre activo")
    return s


@router.get("", response_model=list[AsignacionResponse])
def list_asignaciones(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre:
        return []
    return (
        db.query(AsignacionCarga)
        .options(
            joinedload(AsignacionCarga.docente),
            joinedload(AsignacionCarga.curso).joinedload(Curso.escuela),
            joinedload(AsignacionCarga.turnos_laboratorio),
        )
        .filter(AsignacionCarga.semestre_id == semestre.id)
        .all()
    )


@router.get("/docente/{docente_id}", response_model=list[AsignacionResponse])
def get_asignaciones_docente(
    docente_id: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    if current.rol == RolEnum.docente:
        if not current.docente or current.docente.id != docente_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos")
    elif current.rol not in (RolEnum.admin, RolEnum.director, RolEnum.secretaria):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos")

    semestre = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre:
        return []

    return (
        db.query(AsignacionCarga)
        .options(
            joinedload(AsignacionCarga.docente),
            joinedload(AsignacionCarga.curso).joinedload(Curso.escuela),
            joinedload(AsignacionCarga.turnos_laboratorio),
        )
        .filter(
            AsignacionCarga.docente_id == docente_id,
            AsignacionCarga.semestre_id == semestre.id,
        )
        .all()
    )


@router.post("", response_model=AsignacionResponse, status_code=status.HTTP_201_CREATED)
def create_asignacion(
    data: AsignacionCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = _active_semestre(db)

    curso = db.query(Curso).filter(Curso.id == data.curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    if curso.semestre_id != semestre.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El curso no pertenece al semestre activo")

    if not db.query(Docente).filter(Docente.id == data.docente_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")

    # Check overlap: same docente+curso+semestre with overlapping teoria/practica
    existing = (
        db.query(AsignacionCarga)
        .filter(
            AsignacionCarga.docente_id == data.docente_id,
            AsignacionCarga.curso_id == data.curso_id,
            AsignacionCarga.semestre_id == semestre.id,
        )
        .first()
    )
    if existing:
        if (data.dicta_teoria and existing.dicta_teoria) or (data.dicta_practica and existing.dicta_practica):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El docente ya tiene asignada teoría o práctica para este curso",
            )

    asignacion = AsignacionCarga(
        docente_id=data.docente_id,
        curso_id=data.curso_id,
        semestre_id=semestre.id,
        dicta_teoria=data.dicta_teoria,
        grupos_teoria=data.grupos_teoria,
        dicta_practica=data.dicta_practica,
        grupos_practica=data.grupos_practica,
    )
    db.add(asignacion)
    db.flush()

    for i in range(1, data.num_turnos_laboratorio + 1):
        db.add(TurnoLaboratorio(
            asignacion_id=asignacion.id,
            laboratorio_id=None,
            numero_turno=i,
        ))

    db.commit()
    return _load_one(db, asignacion.id)


@router.put("/{asignacion_id}", response_model=AsignacionResponse)
def update_asignacion(
    asignacion_id: int,
    data: AsignacionUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    asignacion = db.query(AsignacionCarga).filter(AsignacionCarga.id == asignacion_id).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    if data.dicta_teoria is not None:
        asignacion.dicta_teoria = data.dicta_teoria
    if data.grupos_teoria is not None:
        asignacion.grupos_teoria = data.grupos_teoria
    if data.dicta_practica is not None:
        asignacion.dicta_practica = data.dicta_practica
    if data.grupos_practica is not None:
        asignacion.grupos_practica = data.grupos_practica

    if data.num_turnos_laboratorio is not None:
        current_count = (
            db.query(TurnoLaboratorio)
            .filter(TurnoLaboratorio.asignacion_id == asignacion_id)
            .count()
        )
        target = data.num_turnos_laboratorio
        if target > current_count:
            for i in range(current_count + 1, target + 1):
                db.add(TurnoLaboratorio(
                    asignacion_id=asignacion_id,
                    laboratorio_id=None,
                    numero_turno=i,
                ))
        elif target < current_count:
            excess = (
                db.query(TurnoLaboratorio)
                .filter(TurnoLaboratorio.asignacion_id == asignacion_id)
                .order_by(TurnoLaboratorio.numero_turno.desc())
                .limit(current_count - target)
                .all()
            )
            for t in excess:
                db.delete(t)

    db.commit()
    return _load_one(db, asignacion_id)


@router.delete("/{asignacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asignacion(
    asignacion_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    asignacion = db.query(AsignacionCarga).filter(AsignacionCarga.id == asignacion_id).first()
    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")

    db.query(TurnoLaboratorio).filter(TurnoLaboratorio.asignacion_id == asignacion_id).delete()
    db.delete(asignacion)
    db.commit()
