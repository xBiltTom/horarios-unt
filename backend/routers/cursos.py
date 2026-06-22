from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import require_director, require_secretaria
from database import get_db
from models import AsignacionCarga, Curso, EscuelaProfesional, Semestre, Usuario
from schemas import CursoCreate, CursoResponse, CursoUpdate

router = APIRouter(prefix="/api/cursos", tags=["cursos"])


def _load_one(db: Session, curso_id: int) -> Curso | None:
    return (
        db.query(Curso)
        .options(joinedload(Curso.escuela))
        .options(joinedload(Curso.departamento))
        .filter(Curso.id == curso_id)
        .first()
    )


@router.get("", response_model=list[CursoResponse])
def list_cursos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    semestre_activo = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre_activo:
        return []
    return (
        db.query(Curso)
        .options(joinedload(Curso.escuela))
        .options(joinedload(Curso.departamento))
        .filter(Curso.semestre_id == semestre_activo.id)
        .order_by(Curso.ciclo, Curso.nombre)
        .all()
    )


@router.get("/{curso_id}", response_model=CursoResponse)
def get_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    curso = _load_one(db, curso_id)
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    return curso


@router.post("", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
def create_curso(
    data: CursoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_director),
):
    if not db.query(Semestre).filter(Semestre.id == data.semestre_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semestre no encontrado")
    if not db.query(EscuelaProfesional).filter(EscuelaProfesional.id == data.escuela_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escuela no encontrada")
    if not 1 <= data.ciclo <= 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El ciclo debe estar entre 1 y 10")

    curso = Curso(
        codigo=data.codigo,
        nombre=data.nombre,
        ciclo=data.ciclo,
        horas_teoria=data.horas_teoria,
        horas_practica=data.horas_practica,
        horas_laboratorio=data.horas_laboratorio,
        creditos=data.creditos,
        num_alumnos=data.num_alumnos,
        tipo=data.tipo,
        escuela_id=data.escuela_id,
        semestre_id=data.semestre_id,
        departamento_id=data.departamento_id,
    )
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return _load_one(db, curso.id)


@router.put("/{curso_id}", response_model=CursoResponse)
def update_curso(
    curso_id: int,
    data: CursoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_director),
):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    if data.escuela_id is not None:
        if not db.query(EscuelaProfesional).filter(EscuelaProfesional.id == data.escuela_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escuela no encontrada")
    if data.ciclo is not None and not 1 <= data.ciclo <= 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="El ciclo debe estar entre 1 y 10")

    for field in ("codigo", "nombre", "ciclo", "horas_teoria", "horas_practica",
                  "horas_laboratorio", "creditos", "num_alumnos", "tipo", "escuela_id", "departamento_id"):
        val = getattr(data, field)
        if val is not None:
            setattr(curso, field, val)
    db.commit()
    return _load_one(db, curso.id)


@router.delete("/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_director),
):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    if db.query(AsignacionCarga).filter(AsignacionCarga.curso_id == curso_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: el curso tiene asignaciones de carga",
        )
    db.delete(curso)
    db.commit()
