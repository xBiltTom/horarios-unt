from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_active_user, require_admin
from database import get_db
from models import Aula, Usuario
from schemas import AulaCreate, AulaResponse, AulaUpdate

router = APIRouter(prefix="/api/aulas", tags=["aulas"])


@router.get("", response_model=list[AulaResponse])
def list_aulas(db: Session = Depends(get_db), _: Usuario = Depends(get_current_active_user)):
    return db.query(Aula).order_by(Aula.nombre).all()


@router.post("", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def create_aula(
    data: AulaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    aula = Aula(nombre=data.nombre, ubicacion=data.ubicacion)
    db.add(aula)
    db.commit()
    db.refresh(aula)
    return aula


@router.put("/{aula_id}", response_model=AulaResponse)
def update_aula(
    aula_id: int,
    data: AulaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    if data.nombre is not None:
        aula.nombre = data.nombre
    if data.ubicacion is not None:
        aula.ubicacion = data.ubicacion
    db.commit()
    db.refresh(aula)
    return aula


@router.delete("/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_aula(
    aula_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada")
    db.delete(aula)
    db.commit()
