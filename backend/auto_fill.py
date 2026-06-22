from datetime import time
from sqlalchemy.orm import Session
from models import (
    BloqueHorario, AsignacionCarga, Docente, Curso,
    TipoBloqueEnum, DiaEnum, Aula, Laboratorio, TurnoLaboratorio
)

def populate_auto_fill(db: Session, semestre_id: int):
    # Retrieve lookup maps
    docentes = {d.usuario.email: d for d in db.query(Docente).all() if d.usuario}
    aulas = {a.nombre: a for a in db.query(Aula).all()}
    labs = {l.nombre: l for l in db.query(Laboratorio).all()}
    
    asignaciones = {}
    for a in db.query(AsignacionCarga).filter(AsignacionCarga.semestre_id == semestre_id).all():
        curso = db.query(Curso).filter(Curso.id == a.curso_id).first()
        docente = db.query(Docente).filter(Docente.id == a.docente_id).first()
        if docente and curso and docente.usuario:
            key = f"{docente.usuario.email}|{curso.nombre}"
            asignaciones[key] = a

    blocks = [
        # CICLO I
        ["mtorresvi@unt.edu.pe", "Introducción a la Programación", "teoria", "lunes", 7, 9, "aula", "A-307", None],
        ["mtorresvi@unt.edu.pe", "Introducción a la Programación", "laboratorio", "lunes", 14, 16, "lab", "Laboratorio 3", 1],
        ["mtorresvi@unt.edu.pe", "Introducción a la Programación", "laboratorio", "lunes", 16, 18, "lab", "Laboratorio 3", 2],

        ["amendozade@unt.edu.pe", "Introducción a la Ing. de Sistemas", "teoria", "martes", 7, 8, "aula", "A-307", None],
        ["amendozade@unt.edu.pe", "Introducción a la Ing. de Sistemas", "practica", "martes", 8, 10, "aula", "A-307", None],

        ["pcotrinaca@unt.edu.pe", "Introducción a la Programación", "laboratorio", "jueves", 9, 11, "lab", "Laboratorio 4", 1],
        ["pcotrinaca@unt.edu.pe", "Introducción a la Programación", "laboratorio", "jueves", 11, 13, "lab", "Laboratorio 4", 2],

        ["burtechoza@unt.edu.pe", "Desarrollo Personal", "teoria", "viernes", 9, 11, "tc", None, None],
        ["burtechoza@unt.edu.pe", "Desarrollo Personal", "practica", "viernes", 11, 13, "tc", None, None],

        ["jlpontebe@unt.edu.pe", "Desarrollo del Pens. Lógico Matemát.", "practica", "martes", 10, 13, "aula", "A-307", None],
        ["jlpontebe@unt.edu.pe", "Desarrollo del Pens. Lógico Matemát.", "teoria", "viernes", 7, 9, "aula", "A-307", None],

        ["jlriosgo@unt.edu.pe", "Lectura Crítica y Redac. Textos Acad.", "teoria", "jueves", 14, 16, "aula", "A-303", None],
        ["jlriosgo@unt.edu.pe", "Lectura Crítica y Redac. Textos Acad.", "practica", "jueves", 16, 18, "aula", "A-303", None],

        ["sguibaroб@unt.edu.pe", "Introducción al Análisis Matemático", "teoria", "lunes", 9, 11, "aula", "A-307", None],
        ["sguibaroб@unt.edu.pe", "Introducción al Análisis Matemático", "practica", "lunes", 11, 13, "aula", "A-307", None],
        ["sguibaroб@unt.edu.pe", "Introducción al Análisis Matemático", "practica", "martes", 16, 18, "aula", "A-307", None],

        ["mipanaqueza@unt.edu.pe", "Estadística General", "practica", "jueves", 7, 9, "tc", None, None],

        ["mcardoso@unt.edu.pe", "Estadística General", "teoria", "viernes", 14, 16, "aula", "A-303", None],
        ["mcardoso@unt.edu.pe", "Estadística General", "practica", "viernes", 16, 18, "tc", None, None],

        # CICLO III
        ["zvidalme@unt.edu.pe", "Programación Orientada a Objetos II", "laboratorio", "lunes", 9, 13, "lab", "Laboratorio 2", 1],
        ["zvidalme@unt.edu.pe", "Programación Orientada a Objetos II", "laboratorio", "martes", 9, 13, "lab", "Laboratorio 2", 2],
        ["zvidalme@unt.edu.pe", "Programación Orientada a Objetos II", "teoria", "martes", 14, 16, "aula", "I-4", None],
        ["zvidalme@unt.edu.pe", "Programación Orientada a Objetos II", "laboratorio", "viernes", 9, 13, "lab", "Laboratorio 4", 3],

        ["edagredaga@unt.edu.pe", "Sistémica", "teoria", "miercoles", 9, 10, "aula", "A-307", None],
        ["edagredaga@unt.edu.pe", "Sistémica", "practica", "miercoles", 10, 12, "aula", "A-307", None],
        ["edagredaga@unt.edu.pe", "Sistémica", "laboratorio", "miercoles", 14, 16, "lab", "Laboratorio 3", 1],
        ["edagredaga@unt.edu.pe", "Sistémica", "laboratorio", "miercoles", 16, 18, "lab", "Laboratorio 3", 2],
        ["edagredaga@unt.edu.pe", "Sistémica", "laboratorio", "jueves", 16, 18, "lab", "Laboratorio 3", 3],

        ["jcobandoro@unt.edu.pe", "Ingeniería Gráfica", "teoria", "miercoles", 7, 8, "aula", "A-303", None],
        ["jcobandoro@unt.edu.pe", "Ingeniería Gráfica", "practica", "miercoles", 8, 9, "aula", "A-303", None],
        ["jcobandoro@unt.edu.pe", "Ingeniería Gráfica", "laboratorio", "jueves", 7, 10, "lab", "Laboratorio 1", 1],
        ["jcobandoro@unt.edu.pe", "Ingeniería Gráfica", "laboratorio", "jueves", 10, 13, "lab", "Laboratorio 1", 2],

        ["mferrerre@unt.edu.pe", "Matemática Aplicada", "practica", "miercoles", 18, 21, "aula", "A-303", None],
        ["mferrerre@unt.edu.pe", "Matemática Aplicada", "teoria", "jueves", 14, 16, "tc", None, None],

        ["trojasga@unt.edu.pe", "Estadística Aplicada", "laboratorio", "martes", 16, 18, "aula", "A-303", 1],
        ["trojasga@unt.edu.pe", "Estadística Aplicada", "teoria", "jueves", 18, 19, "tc", None, None],
        ["trojasga@unt.edu.pe", "Estadística Aplicada", "practica", "jueves", 19, 21, "tc", None, None],
        ["trojasga@unt.edu.pe", "Estadística Aplicada", "laboratorio", "viernes", 7, 9, "tc", None, 2],
        ["trojasga@unt.edu.pe", "Estadística Aplicada", "laboratorio", "viernes", 16, 18, "aula", "A-303", 3],

        ["jcarrascalca@unt.edu.pe", "Administración General", "teoria", "lunes", 7, 9, "tc", None, None],
        ["jcarrascalca@unt.edu.pe", "Administración General", "practica", "martes", 7, 9, "aula", "Pabellon Ing. Industria", None],

        ["vmendezgi@unt.edu.pe", "Física Electrónica", "teoria", "lunes", 15, 17, "aula", "A-307", None],
        ["vmendezgi@unt.edu.pe", "Física Electrónica", "practica", "lunes", 17, 20, "aula", "A-307", None],
        ["vmendezgi@unt.edu.pe", "Física Electrónica", "laboratorio", "miercoles", 14, 16, "lab", "Laboratorio de Física", 1],
        ["vmendezgi@unt.edu.pe", "Física Electrónica", "laboratorio", "miercoles", 16, 18, "lab", "Laboratorio de Física", 2],
        ["vmendezgi@unt.edu.pe", "Física Electrónica", "laboratorio", "jueves", 7, 9, "lab", "Laboratorio de Física", 3],
        ["vmendezgi@unt.edu.pe", "Física Electrónica", "laboratorio", "jueves", 9, 11, "lab", "Laboratorio de Física", 4],

        ["slescobedoro@unt.edu.pe", "Psicología Organizacional", "teoria", "martes", 18, 20, "aula", "A-311", None],
        ["slescobedoro@unt.edu.pe", "Psicología Organizacional", "practica", "viernes", 18, 20, "aula", "A-311", None],

        # CICLO V
        ["lboych@unt.edu.pe", "Ingeniería de Datos I", "teoria", "lunes", 7, 9, "aula", "A-303", None],
        ["lboych@unt.edu.pe", "Ingeniería de Datos I", "practica", "lunes", 9, 10, "aula", "A-303", None],
        ["lboych@unt.edu.pe", "Ingeniería de Datos I", "laboratorio", "lunes", 10, 13, "lab", "Laboratorio 4", 1],
        ["lboych@unt.edu.pe", "Ingeniería de Datos I", "laboratorio", "martes", 7, 10, "lab", "Laboratorio 4", 2],
        ["lboych@unt.edu.pe", "Ingeniería de Datos I", "laboratorio", "martes", 10, 13, "lab", "Laboratorio 4", 3],

        ["jcobandoro@unt.edu.pe", "Sistemas de Información", "teoria", "miercoles", 9, 11, "aula", "A-303", None],
        ["jcobandoro@unt.edu.pe", "Sistemas de Información", "practica", "miercoles", 11, 13, "aula", "A-303", None],
        ["jcobandoro@unt.edu.pe", "Sistemas de Información", "laboratorio", "miercoles", 14, 16, "lab", "Laboratorio 1", 1],
        ["jcobandoro@unt.edu.pe", "Sistemas de Información", "laboratorio", "miercoles", 16, 18, "lab", "Laboratorio 1", 2],
        ["jcobandoro@unt.edu.pe", "Sistemas de Información", "laboratorio", "miercoles", 18, 20, "lab", "Laboratorio 1", 3],

        ["edagredaga@unt.edu.pe", "Transformación Digital", "laboratorio", "jueves", 7, 9, "lab", "Laboratorio 3", 1],
        ["edagredaga@unt.edu.pe", "Transformación Digital", "teoria", "jueves", 9, 11, "aula", "A-307", None],
        ["edagredaga@unt.edu.pe", "Transformación Digital", "laboratorio", "jueves", 11, 13, "lab", "Laboratorio 3", 2],

        ["rjsanchezti@unt.edu.pe", "Tecnología Web", "laboratorio", "lunes", 15, 18, "lab", "Laboratorio 1", 1],
        ["rjsanchezti@unt.edu.pe", "Tecnología Web", "laboratorio", "martes", 15, 18, "lab", "Laboratorio 1", 2],
        ["rjsanchezti@unt.edu.pe", "Tecnología Web", "teoria", "miercoles", 7, 8, "aula", "A-307", None],
        ["rjsanchezti@unt.edu.pe", "Tecnología Web", "practica", "miercoles", 8, 9, "aula", "A-307", None],
        ["rjsanchezti@unt.edu.pe", "Tecnología Web", "laboratorio", "jueves", 15, 18, "lab", "Laboratorio 4", 3],

        ["carellanosa@unt.edu.pe", "Arquitectura de Computadoras", "laboratorio", "miercoles", 14, 16, "lab", "Laboratorio 2", 1],
        ["carellanosa@unt.edu.pe", "Arquitectura de Computadoras", "laboratorio", "miercoles", 16, 18, "lab", "Laboratorio 2", 2],
        ["carellanosa@unt.edu.pe", "Arquitectura de Computadoras", "laboratorio", "miercoles", 18, 20, "lab", "Laboratorio 2", 3],
        ["carellanosa@unt.edu.pe", "Arquitectura de Computadoras", "teoria", "viernes", 9, 10, "aula", "A-307", None],
        ["carellanosa@unt.edu.pe", "Arquitectura de Computadoras", "practica", "viernes", 10, 12, "aula", "A-307", None],

        ["csuarezre@unt.edu.pe", "Teleinformática", "laboratorio", "martes", 13, 15, "lab", "Laboratorio 2", 1],
        ["csuarezre@unt.edu.pe", "Teleinformática", "laboratorio", "martes", 19, 21, "lab", "Laboratorio 2", 2],
        ["csuarezre@unt.edu.pe", "Teleinformática", "teoria", "viernes", 17, 18, "aula", "A-307", None],
        ["csuarezre@unt.edu.pe", "Teleinformática", "practica", "viernes", 18, 20, "aula", "A-307", None],

        ["mbacalo@unt.edu.pe", "Investigación de Operaciones", "laboratorio", "jueves", 7, 9, "lab", "Laboratorio 2", 1],
        ["mbacalo@unt.edu.pe", "Investigación de Operaciones", "laboratorio", "jueves", 9, 11, "lab", "Laboratorio 2", 2],
        ["mbacalo@unt.edu.pe", "Investigación de Operaciones", "teoria", "jueves", 11, 12, "aula", "A-307", None],
        ["mbacalo@unt.edu.pe", "Investigación de Operaciones", "practica", "jueves", 12, 14, "aula", "A-307", None],
        ["mbacalo@unt.edu.pe", "Investigación de Operaciones", "laboratorio", "viernes", 7, 9, "lab", "Laboratorio 2", 3],

        ["acuadrami@unt.edu.pe", "Contabilidad Gerencial", "laboratorio", "jueves", 18, 20, "aula", "A-307", 1],
        ["acuadrami@unt.edu.pe", "Contabilidad Gerencial", "teoria", "viernes", 14, 15, "aula", "A-307", None],
        ["acuadrami@unt.edu.pe", "Contabilidad Gerencial", "practica", "viernes", 15, 17, "aula", "A-307", None],

        # CICLO VII
        ["jpsantosfe@unt.edu.pe", "Ingeniería de Software I", "laboratorio", "martes", 7, 10, "lab", "Laboratorio 1", 1],
        ["jpsantosfe@unt.edu.pe", "Ingeniería de Software I", "teoria", "martes", 10, 12, "aula", "A-303", None],
        ["jpsantosfe@unt.edu.pe", "Ingeniería de Software I", "practica", "martes", 12, 13, "aula", "A-303", None],

        ["carellanosa@unt.edu.pe", "Redes y Comunicaciones I", "laboratorio", "lunes", 10, 13, "lab", "Laboratorio 3", 1],
        ["carellanosa@unt.edu.pe", "Redes y Comunicaciones I", "laboratorio", "lunes", 13, 16, "lab", "Laboratorio 2", 2],
        ["carellanosa@unt.edu.pe", "Redes y Comunicaciones I", "laboratorio", "lunes", 16, 19, "lab", "Laboratorio 2", 3],
        ["carellanosa@unt.edu.pe", "Redes y Comunicaciones I", "teoria", "viernes", 16, 17, "aula", "A-311", None],
        ["carellanosa@unt.edu.pe", "Redes y Comunicaciones I", "practica", "viernes", 17, 18, "aula", "A-311", None],

        ["rjsanchezti@unt.edu.pe", "Ingeniería de Software I", "laboratorio", "lunes", 7, 10, "lab", "Laboratorio 1", 2],
        ["rjsanchezti@unt.edu.pe", "Ingeniería de Software I", "laboratorio", "lunes", 10, 13, "lab", "Laboratorio 1", 3],

        ["edagredaga@unt.edu.pe", "Negocios Electrónicos", "teoria", "martes", 16, 18, "aula", "A-311", None],

        ["amendozade@unt.edu.pe", "Gestión de Servicios de TI", "teoria", "viernes", 7, 8, "aula", "A-303", None],
        ["amendozade@unt.edu.pe", "Gestión de Servicios de TI", "practica", "viernes", 8, 10, "aula", "A-303", None],
        ["amendozade@unt.edu.pe", "Gestión de Servicios de TI", "laboratorio", "viernes", 10, 12, "lab", "Laboratorio 1", 1],
        ["amendozade@unt.edu.pe", "Gestión de Servicios de TI", "laboratorio", "viernes", 12, 14, "lab", "Laboratorio 1", 2],

        ["pcotrinaca@unt.edu.pe", "Metodología de la Investigación Científica", "teoria", "jueves", 14, 16, "aula", "A-307", None],
        ["pcotrinaca@unt.edu.pe", "Metodología de la Investigación Científica", "practica", "jueves", 16, 18, "aula", "A-307", None],

        ["rmendozari@unt.edu.pe", "Administración de Base de Datos", "teoria", "jueves", 7, 8, "aula", "A-307", None],
        ["rmendozari@unt.edu.pe", "Administración de Base de Datos", "practica", "jueves", 8, 9, "aula", "A-307", None],
        ["rmendozari@unt.edu.pe", "Administración de Base de Datos", "laboratorio", "jueves", 18, 21, "lab", "Laboratorio 4", 1],
        ["rmendozari@unt.edu.pe", "Administración de Base de Datos", "laboratorio", "viernes", 18, 21, "lab", "Laboratorio 2", 2],

        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "teoria", "martes", 13, 14, "aula", "A-307", None],
        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "practica", "martes", 14, 16, "aula", "A-307", None],
        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "laboratorio", "miercoles", 13, 15, "lab", "Laboratorio 4", 1],
        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "laboratorio", "miercoles", 15, 17, "lab", "Laboratorio 4", 2],
        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "laboratorio", "miercoles", 17, 19, "aula", "Audiovisuales", 3],
        ["oralcantaramo@unt.edu.pe", "Planeamiento Estratégico de TI", "laboratorio", "jueves", 9, 11, "lab", "Laboratorio 3", 4],

        ["pcotrinaca@unt.edu.pe", "Negocios Electrónicos", "laboratorio", "lunes", 14, 16, "lab", "Laboratorio 4", 1],
        ["pcotrinaca@unt.edu.pe", "Negocios Electrónicos", "laboratorio", "lunes", 16, 18, "lab", "Laboratorio 4", 2],

        ["jgonzalezva@unt.edu.pe", "Cadena de Suministros", "teoria", "miercoles", 7, 9, "tc", None, None],
        ["jgonzalezva@unt.edu.pe", "Cadena de Suministros", "practica", "miercoles", 9, 11, "tc", None, None],

        # CICLO IX
        ["jpsantosfe@unt.edu.pe", "Tesis I", "teoria", "jueves", 7, 9, "aula", "A-303", None],
        ["jpsantosfe@unt.edu.pe", "Tesis I", "practica", "jueves", 9, 11, "aula", "A-303", None],
        ["jpsantosfe@unt.edu.pe", "Tesis I", "laboratorio", "jueves", 11, 13, "lab", "Laboratorio 2", 1],

        ["rmendozari@unt.edu.pe", "Tesis I", "teoria", "jueves", 14, 16, "aula", "A-311", None],
        ["rmendozari@unt.edu.pe", "Tesis I", "practica", "jueves", 16, 18, "aula", "A-311", None],
        ["rmendozari@unt.edu.pe", "Tesis I", "laboratorio", "viernes", 16, 18, "lab", "Laboratorio 4", 2],

        ["rmendozari@unt.edu.pe", "Analítica de Negocios", "teoria", "viernes", 10, 11, "aula", "A-303", None],
        ["rmendozari@unt.edu.pe", "Analítica de Negocios", "practica", "viernes", 11, 13, "aula", "A-303", None],
        ["rmendozari@unt.edu.pe", "Analítica de Negocios", "laboratorio", "viernes", 14, 16, "lab", "Laboratorio 4", 1],

        ["amendozade@unt.edu.pe", "Auditoría Informática", "teoria", "lunes", 10, 11, "aula", "A-303", None],
        ["amendozade@unt.edu.pe", "Auditoría Informática", "practica", "lunes", 11, 13, "aula", "A-303", None],
        ["amendozade@unt.edu.pe", "Auditoría Informática", "laboratorio", "martes", 10, 12, "lab", "Laboratorio 3", 1],
        ["amendozade@unt.edu.pe", "Auditoría Informática", "laboratorio", "martes", 12, 14, "lab", "Laboratorio 3", 2],

        ["jgomezav@unt.edu.pe", "Gestión de Proyectos de TI", "teoria", "lunes", 14, 15, "aula", "A-303", None],
        ["jgomezav@unt.edu.pe", "Gestión de Proyectos de TI", "practica", "lunes", 15, 17, "aula", "A-303", None],
        ["jgomezav@unt.edu.pe", "Gestión de Proyectos de TI", "laboratorio", "martes", 10, 12, "aula", "Audiovisuales", 1],
        ["jgomezav@unt.edu.pe", "Gestión de Proyectos de TI", "laboratorio", "martes", 13, 15, "lab", "Laboratorio 1", 2],
        ["jgomezav@unt.edu.pe", "Gestión de Proyectos de TI", "laboratorio", "martes", 19, 21, "lab", "Laboratorio 1", 3],

        ["oralcantaramo@unt.edu.pe", "Emprendimiento Tecnológico", "laboratorio", "viernes", 14, 16, "lab", "Laboratorio 2", 1],
        ["oralcantaramo@unt.edu.pe", "Emprendimiento Tecnológico", "laboratorio", "viernes", 16, 18, "lab", "Laboratorio 2", 2],
        ["oralcantaramo@unt.edu.pe", "Emprendimiento Tecnológico", "teoria", "viernes", 18, 20, "aula", "A-303", None],

        ["mtorresvi@unt.edu.pe", "Ingeniería Web", "teoria", "lunes", 18, 19, "aula", "A-303", None],
        ["mtorresvi@unt.edu.pe", "Ingeniería Web", "practica", "lunes", 19, 20, "aula", "A-303", None],
        ["mtorresvi@unt.edu.pe", "Ingeniería Web", "laboratorio", "martes", 14, 17, "lab", "Laboratorio 4", 1],
        ["mtorresvi@unt.edu.pe", "Ingeniería Web", "laboratorio", "martes", 17, 20, "lab", "Laboratorio 4", 2],
        ["mtorresvi@unt.edu.pe", "Ingeniería Web", "laboratorio", "jueves", 10, 13, "lab", "Laboratorio 4", 3],

        ["jgomezav@unt.edu.pe", "Computación en la Nube", "laboratorio", "lunes", 7, 10, "lab", "Laboratorio 3", 1],
        ["jgomezav@unt.edu.pe", "Computación en la Nube", "laboratorio", "miercoles", 7, 10, "lab", "Laboratorio 3", 2],
        ["jgomezav@unt.edu.pe", "Computación en la Nube", "laboratorio", "miercoles", 17, 20, "lab", "Laboratorio 3", 3],
        ["jgomezav@unt.edu.pe", "Computación en la Nube", "teoria", "jueves", 18, 19, "aula", "A-303", None],
        ["jgomezav@unt.edu.pe", "Computación en la Nube", "practica", "jueves", 19, 20, "aula", "A-303", None],

        ["csuarezre@unt.edu.pe", "Hackeo Ético", "teoria", "martes", 8, 10, "aula", "A-303", None],
        ["csuarezre@unt.edu.pe", "Hackeo Ético", "laboratorio", "martes", 15, 17, "lab", "Laboratorio 2", 1],
        ["csuarezre@unt.edu.pe", "Hackeo Ético", "laboratorio", "martes", 17, 19, "lab", "Laboratorio 2", 2],
    ]

    for d_email, c_nombre, tipo_str, dia_str, h_inicio, h_fin, espacio_tipo, espacio_nombre, lab_turno_num in blocks:
        docente = docentes.get(d_email)
        if not docente:
            print(f"Skipping {c_nombre} - docente {d_email} not found")
            continue
        
        key = f"{d_email}|{c_nombre}"
        asignacion = asignaciones.get(key)
        
        # Determine aula/lab
        aula_id = None
        lab_id = None
        
        # Robust manual mapping for edge cases
        norm = lambda s: s.lower().replace("ó", "o").replace("í", "i").replace("á", "a").replace("é", "e").replace("ú", "u") if s else ""
        en = norm(espacio_nombre)
        
        if espacio_tipo == "tc" or en == "tc" or "taller" in en or "confecciones" in en:
            for k, v in aulas.items():
                if "taller de confecciones" in norm(k):
                    aula_id = v.id
                    break
        elif "audiovisuales" in en:
            for k, v in labs.items():
                if "audiovisuales" in norm(k):
                    lab_id = v.id
                    break
        elif "fisica" in en:
            for k, v in labs.items():
                if "fisica" in norm(k):
                    lab_id = v.id
                    break
        elif "pabellon" in en:
            for k, v in aulas.items():
                if "pabellon" in norm(k):
                    aula_id = v.id
                    break
        else:
            if espacio_tipo == "aula" and espacio_nombre:
                for k, v in aulas.items():
                    nk = norm(k)
                    if en in nk or nk in en:
                        aula_id = v.id
                        break
            elif espacio_tipo == "lab" and espacio_nombre:
                for k, v in labs.items():
                    nk = norm(k)
                    if en in nk or nk in en or en.replace("laboratorio", "lab").strip() in nk or nk.replace("lab", "laboratorio").strip() in en:
                        lab_id = v.id
                        break

        # Determine turno_laboratorio_id
        turno_lab_id = None
        if asignacion and lab_turno_num is not None:
            tl = db.query(TurnoLaboratorio).filter(
                TurnoLaboratorio.asignacion_id == asignacion.id,
                TurnoLaboratorio.numero_turno == lab_turno_num
            ).first()
            if tl:
                turno_lab_id = tl.id

        tipo_enum = getattr(TipoBloqueEnum, tipo_str)
        dia_enum = getattr(DiaEnum, dia_str)

        bloque = BloqueHorario(
            docente_id=docente.id,
            semestre_id=semestre_id,
            tipo=tipo_enum,
            dia=dia_enum,
            hora_inicio=time(h_inicio, 0),
            hora_fin=time(h_fin, 0),
            aula_id=aula_id,
            laboratorio_id=lab_id,
            turno_laboratorio_id=turno_lab_id,
            asignacion_id=asignacion.id if asignacion else None
        )
        db.add(bloque)
    db.commit()
