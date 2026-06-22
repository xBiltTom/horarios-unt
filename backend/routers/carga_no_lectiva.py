from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user
from database import get_db
from models import CargaNoLectiva, RolEnum, Semestre, Usuario, AsignacionCarga
from schemas import CargaNoLectivaItem, CargaNoLectivaUpdate
from pdf_generator import generate_pdf

router = APIRouter(prefix="/api/carga-no-lectiva", tags=["carga_no_lectiva"])


def _active_semestre(db: Session) -> Semestre:
    s = db.query(Semestre).filter(Semestre.activo == True).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No hay semestre activo")
    return s


@router.get("/mi-carga", response_model=list[CargaNoLectivaItem])
def get_mi_carga(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    if current.rol != RolEnum.docente or not current.docente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los docentes pueden acceder a su carga")

    semestre = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre:
        return []

    return db.query(CargaNoLectiva).filter(
        CargaNoLectiva.docente_id == current.docente.id,
        CargaNoLectiva.semestre_id == semestre.id
    ).all()


@router.put("/mi-carga", response_model=list[CargaNoLectivaItem])
def update_mi_carga(
    data: CargaNoLectivaUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    if current.rol != RolEnum.docente or not current.docente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los docentes pueden acceder a su carga")

    semestre = _active_semestre(db)
    docente_id = current.docente.id

    # Eliminar la carga actual
    db.query(CargaNoLectiva).filter(
        CargaNoLectiva.docente_id == docente_id,
        CargaNoLectiva.semestre_id == semestre.id
    ).delete()

    # Guardar la nueva carga
    nuevas_cargas = []
    for item in data.items:
        nueva_carga = CargaNoLectiva(
            docente_id=docente_id,
            semestre_id=semestre.id,
            rubro=item.rubro,
            horas_asignadas=item.horas_asignadas,
            descripcion=item.descripcion
        )
        db.add(nueva_carga)
        nuevas_cargas.append(nueva_carga)

    db.commit()
    for carga in nuevas_cargas:
        db.refresh(carga)
        
    return nuevas_cargas

# --- OLD ENDPOINTS FOR COMPATIBILITY ---

from pydantic import BaseModel

class CargaOldRubro(BaseModel):
    rubro: str
    horas_asignadas: int

class CargaOldRequest(BaseModel):
    docente_id: int
    rubros: list[CargaOldRubro]

@router.get("/docente/{docente_id}")
def get_carga_docente_old(docente_id: int, db: Session = Depends(get_db)):
    semestre = _active_semestre(db)
    return db.query(CargaNoLectiva).filter(
        CargaNoLectiva.docente_id == docente_id,
        CargaNoLectiva.semestre_id == semestre.id
    ).all()

@router.post("")
def save_carga_old(data: CargaOldRequest, db: Session = Depends(get_db)):
    semestre = _active_semestre(db)
    
    # Delete existing
    db.query(CargaNoLectiva).filter(
        CargaNoLectiva.docente_id == data.docente_id,
        CargaNoLectiva.semestre_id == semestre.id
    ).delete()

    nuevas = []
    for r in data.rubros:
        c = CargaNoLectiva(
            docente_id=data.docente_id,
            semestre_id=semestre.id,
            rubro=r.rubro,
            horas_asignadas=r.horas_asignadas
        )
        db.add(c)
        nuevas.append(c)

    db.commit()
    for c in nuevas:
        db.refresh(c)
    return nuevas


@router.get("/pdf")
def get_pdf(
    formato: str = "all",
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    if current.rol != RolEnum.docente or not current.docente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los docentes pueden acceder a su carga")

    semestre = db.query(Semestre).filter(Semestre.activo == True).first()
    if not semestre:
        raise HTTPException(status_code=400, detail="No hay semestre activo")

    # Fetch all assignments
    asignaciones = db.query(AsignacionCarga).options(
        joinedload(AsignacionCarga.curso)
    ).filter(
        AsignacionCarga.docente_id == current.docente.id,
        AsignacionCarga.semestre_id == semestre.id
    ).all()

    # Fetch all carga no lectiva
    cargas = db.query(CargaNoLectiva).filter(
        CargaNoLectiva.docente_id == current.docente.id,
        CargaNoLectiva.semestre_id == semestre.id
    ).all()

    carga_dict = {c.rubro: {"horas": c.horas_asignadas, "descripcion": c.descripcion} for c in cargas}

    pdf_buffer = generate_pdf(current.docente, asignaciones, carga_dict, semestre, formato=formato)
    
    filename = f"Declaracion_{current.docente.apellidos.replace(' ', '_')}.pdf"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf", headers=headers)
