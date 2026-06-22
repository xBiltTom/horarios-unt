from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import require_admin
from database import get_db
from models import Departamento, Facultad, Usuario
from schemas import DepartamentoCreate, DepartamentoResponse, DepartamentoUpdate

router = APIRouter(prefix="/api/departamentos", tags=["departamentos"])


@router.get("", response_model=list[DepartamentoResponse])
def list_departamentos(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return (
        db.query(Departamento)
        .options(joinedload(Departamento.facultad))
        .order_by(Departamento.nombre)
        .all()
    )


@router.post("", response_model=DepartamentoResponse, status_code=status.HTTP_201_CREATED)
def create_departamento(
    data: DepartamentoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    if not db.query(Facultad).filter(Facultad.id == data.facultad_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facultad no encontrada")
    dep = Departamento(nombre=data.nombre, facultad_id=data.facultad_id)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return db.query(Departamento).options(joinedload(Departamento.facultad)).filter(Departamento.id == dep.id).first()


@router.put("/{dep_id}", response_model=DepartamentoResponse)
def update_departamento(
    dep_id: int,
    data: DepartamentoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    dep = db.query(Departamento).filter(Departamento.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")
    if data.nombre is not None:
        dep.nombre = data.nombre
    if data.facultad_id is not None:
        if not db.query(Facultad).filter(Facultad.id == data.facultad_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facultad no encontrada")
        dep.facultad_id = data.facultad_id
    db.commit()
    return db.query(Departamento).options(joinedload(Departamento.facultad)).filter(Departamento.id == dep.id).first()


@router.delete("/{dep_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_departamento(
    dep_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    dep = db.query(Departamento).filter(Departamento.id == dep_id).first()
    if not dep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")
    db.delete(dep)
    db.commit()
