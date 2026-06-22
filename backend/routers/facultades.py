from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Facultad, Usuario
from schemas import FacultadCreate, FacultadResponse, FacultadUpdate

router = APIRouter(prefix="/api/facultades", tags=["facultades"])


@router.get("", response_model=list[FacultadResponse])
def list_facultades(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return db.query(Facultad).order_by(Facultad.nombre).all()


@router.post("", response_model=FacultadResponse, status_code=status.HTTP_201_CREATED)
def create_facultad(
    data: FacultadCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    facultad = Facultad(nombre=data.nombre)
    db.add(facultad)
    db.commit()
    db.refresh(facultad)
    return facultad


@router.put("/{facultad_id}", response_model=FacultadResponse)
def update_facultad(
    facultad_id: int,
    data: FacultadUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    facultad = db.query(Facultad).filter(Facultad.id == facultad_id).first()
    if not facultad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facultad no encontrada")
    if data.nombre is not None:
        facultad.nombre = data.nombre
    db.commit()
    db.refresh(facultad)
    return facultad


@router.delete("/{facultad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_facultad(
    facultad_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    facultad = db.query(Facultad).filter(Facultad.id == facultad_id).first()
    if not facultad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facultad no encontrada")
    db.delete(facultad)
    db.commit()
