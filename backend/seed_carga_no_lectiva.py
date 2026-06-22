# backend/seed_carga_no_lectiva.py
# Run with: python seed_carga_no_lectiva.py

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import func
from database import SessionLocal
from models import (
    Docente, Semestre, AsignacionCarga, TurnoLaboratorio,
    CargaNoLectiva, ModalidadEnum, TipoBloqueEnum,
)

db = SessionLocal()


def run():
    print("Seeding carga no lectiva...")

    # Use the semestre that actually has asignaciones (handles duplicate seeds)
    result = (
        db.query(AsignacionCarga.semestre_id, func.count().label("n"))
        .group_by(AsignacionCarga.semestre_id)
        .order_by(func.count().desc())
        .first()
    )
    if not result:
        print("No hay asignaciones en la base de datos.")
        return
    semestre = db.query(Semestre).filter(Semestre.id == result.semestre_id).first()
    print(f"Usando semestre id={semestre.id} ({semestre.numero} {semestre.anio}) con {result.n} asignaciones")

    docentes = db.query(Docente).all()
    inserted = 0
    skipped = 0

    for doc in docentes:
        existing = db.query(CargaNoLectiva).filter(
            CargaNoLectiva.docente_id == doc.id,
            CargaNoLectiva.semestre_id == semestre.id,
        ).first()
        if existing:
            skipped += 1
            continue

        lectiva_h = 0
        for asig in db.query(AsignacionCarga).filter(
            AsignacionCarga.docente_id == doc.id,
            AsignacionCarga.semestre_id == semestre.id,
        ).all():
            if asig.dicta_teoria:
                lectiva_h += asig.curso.horas_teoria
            if asig.dicta_practica:
                lectiva_h += asig.curso.horas_practica
            num_turnos = db.query(TurnoLaboratorio).filter(
                TurnoLaboratorio.asignacion_id == asig.id,
            ).count()
            lectiva_h += asig.curso.horas_laboratorio * num_turnos

        if doc.modalidad == ModalidadEnum.tiempo_completo:
            rubros = [
                (TipoBloqueEnum.preparacion,   min(int(lectiva_h * 0.5), 11)),
                (TipoBloqueEnum.consejeria,    2),
                (TipoBloqueEnum.investigacion, 6),
                (TipoBloqueEnum.rsu,           2),
                (TipoBloqueEnum.asesoria,      2),
                (TipoBloqueEnum.capacitacion,  2),
            ]
        else:
            rubros = [
                (TipoBloqueEnum.preparacion,   min(int(lectiva_h * 0.5), 4)),
                (TipoBloqueEnum.consejeria,    1),
                (TipoBloqueEnum.investigacion, 0),
                (TipoBloqueEnum.rsu,           1),
                (TipoBloqueEnum.asesoria,      1),
                (TipoBloqueEnum.capacitacion,  0),
            ]

        for rubro, horas in rubros:
            if horas > 0:
                db.add(CargaNoLectiva(
                    docente_id=doc.id,
                    semestre_id=semestre.id,
                    rubro=rubro,
                    horas_asignadas=horas,
                ))

        inserted += 1

    db.commit()
    print(f"Listo. {inserted} docentes procesados, {skipped} omitidos (ya tenian registros).")


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()
