from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import require_admin, require_secretaria
from database import get_db
from models import Departamento, EscuelaProfesional, Usuario
from schemas import EscuelaCreate, EscuelaResponse, EscuelaUpdate

router = APIRouter(prefix="/api/escuelas", tags=["escuelas"])


def _load_one(db: Session, escuela_id: int) -> EscuelaProfesional | None:
    return (
        db.query(EscuelaProfesional)
        .options(
            joinedload(EscuelaProfesional.departamento).joinedload(Departamento.facultad)
        )
        .filter(EscuelaProfesional.id == escuela_id)
        .first()
    )


@router.get("", response_model=list[EscuelaResponse])
def list_escuelas(db: Session = Depends(get_db), _: Usuario = Depends(require_secretaria)):
    return (
        db.query(EscuelaProfesional)
        .options(
            joinedload(EscuelaProfesional.departamento).joinedload(Departamento.facultad)
        )
        .order_by(EscuelaProfesional.nombre)
        .all()
    )


@router.post("", response_model=EscuelaResponse, status_code=status.HTTP_201_CREATED)
def create_escuela(
    data: EscuelaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    if not db.query(Departamento).filter(Departamento.id == data.departamento_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")
    escuela = EscuelaProfesional(nombre=data.nombre, departamento_id=data.departamento_id)
    db.add(escuela)
    db.commit()
    db.refresh(escuela)
    return _load_one(db, escuela.id)


@router.put("/{escuela_id}", response_model=EscuelaResponse)
def update_escuela(
    escuela_id: int,
    data: EscuelaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    escuela = db.query(EscuelaProfesional).filter(EscuelaProfesional.id == escuela_id).first()
    if not escuela:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escuela no encontrada")
    if data.nombre is not None:
        escuela.nombre = data.nombre
    if data.departamento_id is not None:
        if not db.query(Departamento).filter(Departamento.id == data.departamento_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")
        escuela.departamento_id = data.departamento_id
    db.commit()
    return _load_one(db, escuela.id)


@router.delete("/{escuela_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_escuela(
    escuela_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    escuela = db.query(EscuelaProfesional).filter(EscuelaProfesional.id == escuela_id).first()
    if not escuela:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escuela no encontrada")
    db.delete(escuela)
    db.commit()
