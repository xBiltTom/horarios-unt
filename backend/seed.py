from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import RolEnum, Usuario
from auth import hash_password


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.email == "admin@unt.edu.pe").first()
        if existing:
            print("Admin user already exists, skipping.")
            return

        admin = Usuario(
            email="admin@unt.edu.pe",
            password_hash=hash_password("admin123"),
            rol=RolEnum.admin,
            activo=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created: admin@unt.edu.pe / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
