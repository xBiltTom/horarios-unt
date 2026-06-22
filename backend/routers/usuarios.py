from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import hash_password, require_admin
from database import get_db
from models import Usuario
from schemas import UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    if db.query(Usuario).filter(Usuario.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya registrado")
    usuario = Usuario(
        email=data.email,
        password_hash=hash_password(data.password),
        rol=data.rol,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("", response_model=list[UsuarioResponse])
def list_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return db.query(Usuario).all()


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if data.email is not None:
        existing = db.query(Usuario).filter(Usuario.email == data.email, Usuario.id != usuario_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya registrado")
        usuario.email = data.email
    if data.rol is not None:
        usuario.rol = data.rol
    if data.activo is not None:
        usuario.activo = data.activo
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", response_model=UsuarioResponse)
def deactivate_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    usuario.activo = False
    db.commit()
    db.refresh(usuario)
    return usuario
