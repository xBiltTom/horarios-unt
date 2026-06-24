from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user, require_secretaria
from database import get_db
from models import (
    AsignacionCarga, BloqueHorario, ColaHorario, Curso, Docente,
    EstadoColaEnum, EstadoFaseEnum, FaseHorario, RolEnum,
    Semestre, TipoBloqueEnum, TipoCursoEnum, TurnoLaboratorio, Usuario,
)
from schemas import (
    BloqueHorarioCreate, BloqueHorarioResponse, BloqueNoLectivaCreate,
    FaseHorarioResponse, MiTurnoResponse,
)

LECTIVA_TIPOS = {TipoBloqueEnum.teoria, TipoBloqueEnum.practica, TipoBloqueEnum.laboratorio}
NO_LECTIVA_TIPOS = {
    TipoBloqueEnum.preparacion, TipoBloqueEnum.consejeria, TipoBloqueEnum.investigacion,
    TipoBloqueEnum.rsu, TipoBloqueEnum.asesoria, TipoBloqueEnum.capacitacion,
    TipoBloqueEnum.actividades_gobierno, TipoBloqueEnum.actividades_administracion,
    TipoBloqueEnum.comites_comisiones,
}
from ws_manager import manager as ws_manager
from auto_fill import populate_auto_fill

router = APIRouter(prefix="/api/horarios", tags=["horarios"])

TURNO_MINUTOS = 15


def _active_semestre(db: Session) -> Semestre:
    s = db.query(Semestre).filter(Semestre.activo == True).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay semestre activo")
    return s


def _get_docente_id(current: Usuario) -> int:
    if not current.docente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene perfil de docente")
    return current.docente.id


def _load_fase(db: Session, semestre_id: int) -> FaseHorario | None:
    return (
        db.query(FaseHorario)
        .options(
            joinedload(FaseHorario.colas).joinedload(ColaHorario.docente)
        )
        .filter(FaseHorario.semestre_id == semestre_id)
        .first()
    )


def _fase_to_broadcast(fase: FaseHorario) -> dict:
    return {
        "id": fase.id,
        "semestre_id": fase.semestre_id,
        "estado": fase.estado.value,
        "colas": [
            {
                "id": c.id,
                "orden": c.orden,
                "estado": c.estado.value,
                "turno_inicio": c.turno_inicio.isoformat() if c.turno_inicio else None,
                "turno_fin": c.turno_fin.isoformat() if c.turno_fin else None,
                "docente": {
                    "id": c.docente.id,
                    "nombre": c.docente.nombre,
                    "apellidos": c.docente.apellidos,
                    "modalidad": c.docente.modalidad.value,
                },
            }
            for c in sorted(fase.colas, key=lambda x: x.orden)
        ],
    }


@router.post("/iniciar", response_model=FaseHorarioResponse)
async def iniciar_fase(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = _active_semestre(db)

    # Reset existing fase and bloques
    existing = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
    if existing:
        db.query(ColaHorario).filter(ColaHorario.fase_id == existing.id).delete()
        db.query(BloqueHorario).filter(BloqueHorario.semestre_id == semestre.id).delete()
        db.delete(existing)
        db.commit()

    fase = FaseHorario(semestre_id=semestre.id, estado=EstadoFaseEnum.activo)
    db.add(fase)
    db.flush()

    docentes = (
        db.query(Docente)
        .order_by(Docente.fecha_ingreso_unt.asc(), Docente.id.asc())
        .all()
    )

    now = datetime.now(timezone.utc)
    for i, docente in enumerate(docentes):
        cola = ColaHorario(
            fase_id=fase.id,
            docente_id=docente.id,
            orden=i + 1,
            estado=EstadoColaEnum.pendiente,
        )
        if i == 0:
            cola.estado = EstadoColaEnum.activo
            cola.turno_inicio = now
            cola.turno_fin = now + timedelta(minutes=TURNO_MINUTOS)
        db.add(cola)

    db.commit()
    fase = _load_fase(db, semestre.id)
    await ws_manager.broadcast({"tipo": "fase_iniciada", "fase": _fase_to_broadcast(fase)})
    return fase


@router.get("/fase", response_model=FaseHorarioResponse)
def get_fase(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = _active_semestre(db)
    fase = _load_fase(db, semestre.id)
    if not fase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay fase de horario iniciada")
    return fase


@router.delete("/fase")
async def limpiar_fase(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = _active_semestre(db)
    existing = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
    if existing:
        db.query(ColaHorario).filter(ColaHorario.fase_id == existing.id).delete()
        db.query(BloqueHorario).filter(BloqueHorario.semestre_id == semestre.id).delete()
        db.delete(existing)
        db.commit()
        await ws_manager.broadcast({"tipo": "fase_limpiada"})
    return {"message": "Fase y horarios eliminados"}


@router.get("/mi-turno", response_model=MiTurnoResponse)
def get_mi_turno(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente_id = _get_docente_id(current)
    semestre = _active_semestre(db)

    fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
    if not fase:
        return MiTurnoResponse(
            en_cola=False, estado=None, orden=None,
            turno_inicio=None, turno_fin=None,
            es_mi_turno=False, tiempo_restante_segundos=None,
            fase_estado=None,
        )

    cola = (
        db.query(ColaHorario)
        .filter(ColaHorario.fase_id == fase.id, ColaHorario.docente_id == docente_id)
        .first()
    )
    if not cola:
        return MiTurnoResponse(
            en_cola=False, estado=None, orden=None,
            turno_inicio=None, turno_fin=None,
            es_mi_turno=False, tiempo_restante_segundos=None,
            fase_estado=fase.estado.value,
        )

    es_mi_turno = cola.estado == EstadoColaEnum.activo
    tiempo_restante = None
    if es_mi_turno and cola.turno_fin:
        now = datetime.now(timezone.utc)
        tf = cola.turno_fin.replace(tzinfo=timezone.utc) if cola.turno_fin.tzinfo is None else cola.turno_fin
        tiempo_restante = max(0, int((tf - now).total_seconds()))

    return MiTurnoResponse(
        en_cola=True,
        estado=cola.estado.value,
        orden=cola.orden,
        turno_inicio=cola.turno_inicio,
        turno_fin=cola.turno_fin,
        es_mi_turno=es_mi_turno,
        tiempo_restante_segundos=tiempo_restante,
        fase_estado=fase.estado.value,
    )


@router.get("/bloques", response_model=list[BloqueHorarioResponse])
def get_bloques(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_active_user),
):
    semestre = _active_semestre(db)
    return db.query(BloqueHorario).filter(BloqueHorario.semestre_id == semestre.id).all()


@router.post("/bloques", response_model=BloqueHorarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_bloque(
    data: BloqueHorarioCreate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente_id = _get_docente_id(current)
    semestre = _active_semestre(db)

    if current.rol == RolEnum.docente:
        fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
        if not fase or fase.estado != EstadoFaseEnum.activo:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La fase de horarios no está activa")
        cola = db.query(ColaHorario).filter(
            ColaHorario.fase_id == fase.id,
            ColaHorario.docente_id == docente_id,
        ).first()
        if not cola or cola.estado != EstadoColaEnum.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es tu turno")
        if data.tipo not in LECTIVA_TIPOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La carga no lectiva se asigna fuera de la ventana de turno",
            )

    if data.hora_inicio >= data.hora_fin:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="hora_inicio debe ser anterior a hora_fin")

    # Rule 1: Docente self-conflict (always applies)
    overlap_self = (
        db.query(BloqueHorario)
        .filter(
            BloqueHorario.docente_id == docente_id,
            BloqueHorario.semestre_id == semestre.id,
            BloqueHorario.dia == data.dia,
            BloqueHorario.hora_inicio < data.hora_fin,
            BloqueHorario.hora_fin > data.hora_inicio,
        )
        .first()
    )
    if overlap_self:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El docente ya tiene un bloque en ese horario")

    # Rule 2: Aula conflict (always applies, no exceptions — same aula = conflict)
    if data.aula_id:
        overlap_aula = (
            db.query(BloqueHorario)
            .filter(
                BloqueHorario.aula_id == data.aula_id,
                BloqueHorario.semestre_id == semestre.id,
                BloqueHorario.dia == data.dia,
                BloqueHorario.hora_inicio < data.hora_fin,
                BloqueHorario.hora_fin > data.hora_inicio,
            )
            .first()
        )
        if overlap_aula:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El aula ya está ocupada en ese horario")

    # Rule 3: Laboratorio conflict (always applies, no exceptions — same lab = conflict)
    if data.laboratorio_id:
        overlap_lab = (
            db.query(BloqueHorario)
            .filter(
                BloqueHorario.laboratorio_id == data.laboratorio_id,
                BloqueHorario.semestre_id == semestre.id,
                BloqueHorario.dia == data.dia,
                BloqueHorario.hora_inicio < data.hora_fin,
                BloqueHorario.hora_fin > data.hora_inicio,
            )
            .first()
        )
        if overlap_lab:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El laboratorio ya está ocupado en ese horario")

    # Rule 4: Ciclo time-overlap conflict with electivo exception
    # Two blocks in the same ciclo can overlap ONLY IF both belong to electivo courses
    # AND they are in DIFFERENT aulas OR DIFFERENT labs (Rules 2+3 already ensure same-space is rejected).
    if data.asignacion_id:
        new_curso = (
            db.query(Curso)
            .join(AsignacionCarga, Curso.id == AsignacionCarga.curso_id)
            .filter(AsignacionCarga.id == data.asignacion_id)
            .first()
        )
        if new_curso:
            conflicting_pairs = (
                db.query(BloqueHorario, Curso)
                .join(AsignacionCarga, BloqueHorario.asignacion_id == AsignacionCarga.id)
                .join(Curso, AsignacionCarga.curso_id == Curso.id)
                .filter(
                    BloqueHorario.semestre_id == semestre.id,
                    BloqueHorario.dia == data.dia,
                    BloqueHorario.hora_inicio < data.hora_fin,
                    BloqueHorario.hora_fin > data.hora_inicio,
                    Curso.ciclo == new_curso.ciclo,
                )
                .all()
            )
            for blq, existing_curso in conflicting_pairs:
                is_electivo_exception = (
                    new_curso.tipo == TipoCursoEnum.electivo
                    and existing_curso.tipo == TipoCursoEnum.electivo
                )
                is_group_exception = (
                    data.tipo == TipoBloqueEnum.laboratorio or
                    blq.tipo == TipoBloqueEnum.laboratorio
                )

                if is_electivo_exception or is_group_exception:
                    continue
                else:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Conflicto de ciclo: '{existing_curso.nombre}' "
                            f"(ciclo {new_curso.ciclo}) ya tiene Teoría/Práctica en este horario. "
                            "No se pueden cruzar clases de Teoría o Práctica del mismo ciclo."
                        ),
                    )

    bloque = BloqueHorario(
        docente_id=docente_id,
        semestre_id=semestre.id,
        tipo=data.tipo,
        dia=data.dia,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
        aula_id=data.aula_id,
        laboratorio_id=data.laboratorio_id,
        turno_laboratorio_id=data.turno_laboratorio_id,
        asignacion_id=data.asignacion_id,
    )
    db.add(bloque)
    db.commit()
    db.refresh(bloque)

    await ws_manager.broadcast({
        "tipo": "bloque_added",
        "bloque": {
            "id": bloque.id,
            "docente_id": bloque.docente_id,
            "semestre_id": bloque.semestre_id,
            "tipo": bloque.tipo.value,
            "dia": bloque.dia.value,
            "hora_inicio": str(bloque.hora_inicio),
            "hora_fin": str(bloque.hora_fin),
            "aula_id": bloque.aula_id,
            "laboratorio_id": bloque.laboratorio_id,
            "turno_laboratorio_id": bloque.turno_laboratorio_id,
            "asignacion_id": bloque.asignacion_id,
        },
    })
    return bloque


@router.post("/bloques/no-lectiva", response_model=BloqueHorarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_bloque_no_lectiva(
    data: BloqueNoLectivaCreate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente_id = _get_docente_id(current)
    semestre = _active_semestre(db)

    if data.tipo not in NO_LECTIVA_TIPOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten tipos no lectivos en este endpoint",
        )

    if current.rol == RolEnum.docente:
        fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
        if not fase or fase.estado != EstadoFaseEnum.completado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La fase de horarios debe estar completada para asignar carga no lectiva",
            )

    if data.hora_inicio >= data.hora_fin:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="hora_inicio debe ser anterior a hora_fin")

    overlap_self = (
        db.query(BloqueHorario)
        .filter(
            BloqueHorario.docente_id == docente_id,
            BloqueHorario.semestre_id == semestre.id,
            BloqueHorario.dia == data.dia,
            BloqueHorario.hora_inicio < data.hora_fin,
            BloqueHorario.hora_fin > data.hora_inicio,
        )
        .first()
    )
    if overlap_self:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El bloque se superpone con otro bloque propio")

    bloque = BloqueHorario(
        docente_id=docente_id,
        semestre_id=semestre.id,
        tipo=data.tipo,
        dia=data.dia,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
    )
    db.add(bloque)
    db.commit()
    db.refresh(bloque)

    await ws_manager.broadcast({
        "tipo": "bloque_added",
        "bloque": {
            "id": bloque.id,
            "docente_id": bloque.docente_id,
            "semestre_id": bloque.semestre_id,
            "tipo": bloque.tipo.value,
            "dia": bloque.dia.value,
            "hora_inicio": str(bloque.hora_inicio),
            "hora_fin": str(bloque.hora_fin),
            "aula_id": None,
            "laboratorio_id": None,
            "turno_laboratorio_id": None,
            "asignacion_id": None,
        },
    })
    return bloque


@router.delete("/bloques/{bloque_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_bloque(
    bloque_id: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente_id = _get_docente_id(current)

    bloque = db.query(BloqueHorario).filter(BloqueHorario.id == bloque_id).first()
    if not bloque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque no encontrado")
    if bloque.docente_id != docente_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminar un bloque de otro docente")

    if current.rol == RolEnum.docente:
        semestre = _active_semestre(db)
        fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
        if bloque.tipo in LECTIVA_TIPOS:
            cola = None
            if fase:
                cola = db.query(ColaHorario).filter(
                    ColaHorario.fase_id == fase.id,
                    ColaHorario.docente_id == docente_id,
                ).first()
            if not cola or cola.estado != EstadoColaEnum.activo:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es tu turno para modificar bloques lectivos")
        else:
            if not fase or fase.estado != EstadoFaseEnum.completado:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La fase lectiva debe estar completada para modificar carga no lectiva")

    db.delete(bloque)
    db.commit()
    await ws_manager.broadcast({"tipo": "bloque_removed", "bloque_id": bloque_id})


@router.post("/confirmar")
async def confirmar_turno(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente_id = _get_docente_id(current)
    semestre = _active_semestre(db)

    fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
    if not fase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay fase de horario iniciada")

    cola = db.query(ColaHorario).filter(
        ColaHorario.fase_id == fase.id,
        ColaHorario.docente_id == docente_id,
    ).first()
    if not cola or cola.estado != EstadoColaEnum.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No es tu turno o ya lo confirmaste")

    cola.estado = EstadoColaEnum.completado

    next_cola = (
        db.query(ColaHorario)
        .filter(
            ColaHorario.fase_id == fase.id,
            ColaHorario.estado == EstadoColaEnum.pendiente,
        )
        .order_by(ColaHorario.orden.asc())
        .first()
    )
    if next_cola:
        now = datetime.now(timezone.utc)
        next_cola.estado = EstadoColaEnum.activo
        next_cola.turno_inicio = now
        next_cola.turno_fin = now + timedelta(minutes=TURNO_MINUTOS)
    else:
        fase.estado = EstadoFaseEnum.completado

    db.commit()
    fase_updated = _load_fase(db, semestre.id)
    await ws_manager.broadcast({"tipo": "turno_avanzado", "fase": _fase_to_broadcast(fase_updated)})
    return {"ok": True}


@router.post("/auto-fill")
async def auto_fill_endpoint(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre = _active_semestre(db)
    
    db.query(BloqueHorario).filter(BloqueHorario.semestre_id == semestre.id).delete()
    
    fase = db.query(FaseHorario).filter(FaseHorario.semestre_id == semestre.id).first()
    if fase:
        db.query(ColaHorario).filter(ColaHorario.fase_id == fase.id).delete()
        fase.estado = EstadoFaseEnum.completado
    else:
        fase = FaseHorario(semestre_id=semestre.id, estado=EstadoFaseEnum.completado)
        db.add(fase)

    db.commit()
    
    try:
        populate_auto_fill(db, semestre.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    await ws_manager.broadcast({"tipo": "bloques_reloaded"})
    return {"message": "Auto-fill completed successfully"}
