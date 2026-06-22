from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_active_user, hash_password, require_admin, require_secretaria
from database import get_db
from models import Departamento, Docente, RolEnum, Usuario
from schemas import DocenteCreate, DocenteResponse, DocenteUpdate

router = APIRouter(prefix="/api/docentes", tags=["docentes"])


def _load_one(db: Session, docente_id: int) -> Docente | None:
    return (
        db.query(Docente)
        .options(
            joinedload(Docente.departamento),
            joinedload(Docente.usuario),
        )
        .filter(Docente.id == docente_id)
        .first()
    )


@router.get("/me", response_model=DocenteResponse)
def get_mi_docente(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_active_user),
):
    docente = db.query(Docente).filter(Docente.usuario_id == current.id).first()
    if not docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de docente no encontrado")
    return _load_one(db, docente.id)


@router.get("", response_model=list[DocenteResponse])
def list_docentes(db: Session = Depends(get_db), _: Usuario = Depends(require_secretaria)):
    return (
        db.query(Docente)
        .options(
            joinedload(Docente.departamento),
            joinedload(Docente.usuario),
        )
        .order_by(Docente.apellidos, Docente.nombre)
        .all()
    )


@router.get("/activos/count")
def count_docentes_activos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_active_user),
):
    from models import Usuario as Usr
    return {"count": db.query(Docente).join(Docente.usuario).filter(Usr.activo == True).count()}


@router.get("/{docente_id}", response_model=DocenteResponse)
def get_docente(
    docente_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_secretaria),
):
    docente = _load_one(db, docente_id)
    if not docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return docente


@router.post("", response_model=DocenteResponse, status_code=status.HTTP_201_CREATED)
def create_docente(
    data: DocenteCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    if db.query(Docente).filter(Docente.dni == data.dni).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="DNI ya registrado")
    if db.query(Docente).filter(Docente.codigo_ibm == data.codigo_ibm).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código IBM ya registrado")
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya registrado")
    if not db.query(Departamento).filter(Departamento.id == data.departamento_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")

    usuario = Usuario(
        email=data.email,
        password_hash=hash_password(data.password),
        rol=RolEnum.docente,
        activo=True,
    )
    db.add(usuario)
    db.flush()

    docente = Docente(
        nombre=data.nombre,
        apellidos=data.apellidos,
        dni=data.dni,
        codigo_ibm=data.codigo_ibm,
        condicion=data.condicion,
        modalidad=data.modalidad,
        fecha_ingreso_unt=data.fecha_ingreso_unt,
        departamento_id=data.departamento_id,
        usuario_id=usuario.id,
    )
    db.add(docente)
    db.commit()
    db.refresh(docente)
    return _load_one(db, docente.id)


@router.put("/{docente_id}", response_model=DocenteResponse)
def update_docente(
    docente_id: int,
    data: DocenteUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")

    if data.dni is not None:
        existing = db.query(Docente).filter(Docente.dni == data.dni, Docente.id != docente_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="DNI ya registrado")
        docente.dni = data.dni
    if data.codigo_ibm is not None:
        existing = db.query(Docente).filter(Docente.codigo_ibm == data.codigo_ibm, Docente.id != docente_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código IBM ya registrado")
        docente.codigo_ibm = data.codigo_ibm
    if data.departamento_id is not None:
        if not db.query(Departamento).filter(Departamento.id == data.departamento_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado")
        docente.departamento_id = data.departamento_id

    for field in ("nombre", "apellidos", "condicion", "modalidad", "fecha_ingreso_unt"):
        val = getattr(data, field)
        if val is not None:
            setattr(docente, field, val)

    db.commit()
    return _load_one(db, docente.id)


@router.delete("/{docente_id}", response_model=DocenteResponse)
def deactivate_docente(
    docente_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    docente = _load_one(db, docente_id)
    if not docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    if docente.usuario:
        docente.usuario.activo = False
    db.commit()
    return _load_one(db, docente_id)
