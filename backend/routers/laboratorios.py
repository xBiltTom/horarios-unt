from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import require_admin, get_current_active_user
from database import get_db
from models import Laboratorio, Usuario
from schemas import LaboratorioCreate, LaboratorioResponse, LaboratorioUpdate

router = APIRouter(prefix="/api/laboratorios", tags=["laboratorios"])


@router.get("", response_model=list[LaboratorioResponse])
def list_laboratorios(db: Session = Depends(get_db), _: Usuario = Depends(get_current_active_user)):
    return db.query(Laboratorio).order_by(Laboratorio.nombre).all()


@router.post("", response_model=LaboratorioResponse, status_code=status.HTTP_201_CREATED)
def create_laboratorio(
    data: LaboratorioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    lab = Laboratorio(nombre=data.nombre, capacidad=data.capacidad)
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


@router.put("/{lab_id}", response_model=LaboratorioResponse)
def update_laboratorio(
    lab_id: int,
    data: LaboratorioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    lab = db.query(Laboratorio).filter(Laboratorio.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratorio no encontrado")
    if data.nombre is not None:
        lab.nombre = data.nombre
    if data.capacidad is not None:
        lab.capacidad = data.capacidad
    db.commit()
    db.refresh(lab)
    return lab


@router.delete("/{lab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_laboratorio(
    lab_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    lab = db.query(Laboratorio).filter(Laboratorio.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratorio no encontrado")
    db.delete(lab)
    db.commit()
