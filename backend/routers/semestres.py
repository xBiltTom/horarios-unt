from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import require_admin, require_director
from database import get_db
from models import Semestre, Usuario
from schemas import SemestreCreate, SemestreResponse, SemestreUpdate

router = APIRouter(prefix="/api/semestres", tags=["semestres"])


@router.get("/activo", response_model=SemestreResponse)
def get_semestre_activo(db: Session = Depends(get_db)):
    """Returns the currently active semestre. No auth required."""
    semestre = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay semestre activo")
    return semestre


@router.get("", response_model=list[SemestreResponse])
def list_semestres(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_director),
):
    return db.query(Semestre).order_by(Semestre.anio.desc(), Semestre.numero).all()


@router.post("", response_model=SemestreResponse, status_code=status.HTTP_201_CREATED)
def create_semestre(
    data: SemestreCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    semestre = Semestre(
        anio=data.anio,
        numero=data.numero,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        activo=False,
    )
    db.add(semestre)
    db.commit()
    db.refresh(semestre)
    return semestre


@router.put("/{semestre_id}/activar", response_model=SemestreResponse)
def activar_semestre(
    semestre_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    semestre = db.query(Semestre).filter(Semestre.id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semestre no encontrado")
    db.query(Semestre).filter(Semestre.id != semestre_id).update({"activo": False})
    semestre.activo = True
    db.commit()
    db.refresh(semestre)
    return semestre


@router.put("/{semestre_id}", response_model=SemestreResponse)
def update_semestre(
    semestre_id: int,
    data: SemestreUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    semestre = db.query(Semestre).filter(Semestre.id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semestre no encontrado")
    for field in ("anio", "numero", "fecha_inicio", "fecha_fin"):
        val = getattr(data, field)
        if val is not None:
            setattr(semestre, field, val)
    db.commit()
    db.refresh(semestre)
    return semestre


@router.delete("/{semestre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_semestre(
    semestre_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    semestre = db.query(Semestre).filter(Semestre.id == semestre_id).first()
    if not semestre:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semestre no encontrado")
    if semestre.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar el semestre activo",
        )
    db.delete(semestre)
    db.commit()
