# backend/seed_data.py
# Run with: python seed_data.py

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import (
    Usuario, Docente, Facultad, Departamento, EscuelaProfesional,
    Semestre, Curso, Aula, Laboratorio, AsignacionCarga, TurnoLaboratorio,
    RolEnum, CondicionEnum, ModalidadEnum,
    SemestreNumeroEnum, TipoCursoEnum,
)
from auth import hash_password
from datetime import date

db = SessionLocal()

def run():
    print("Seeding data...")

    # ─────────────────────────────────────────
    # FACULTAD
    # ─────────────────────────────────────────
    fac_ing = Facultad(nombre="Facultad de Ingeniería")
    fac_mat = Facultad(nombre="Facultad de Ciencias Físicas y Matemáticas")
    fac_adm = Facultad(nombre="Facultad de Ciencias Económicas")
    fac_psi = Facultad(nombre="Facultad de Ciencias Sociales")
    fac_est = Facultad(nombre="Facultad de Ingeniería - Estadística")
    fac_fis = Facultad(nombre="Facultad de Ciencias Físicas")
    fac_lit = Facultad(nombre="Facultad de Educación y Ciencias de la Comunicación")
    fac_ind = Facultad(nombre="Facultad de Ingeniería Industrial")
    fac_con = Facultad(nombre="Facultad de Ciencias Económicas - Contabilidad")
    db.add_all([fac_ing, fac_mat, fac_adm, fac_psi, fac_est, fac_fis, fac_lit, fac_ind, fac_con])
    db.flush()

    # ─────────────────────────────────────────
    # DEPARTAMENTOS
    # ─────────────────────────────────────────
    dep_sis = Departamento(nombre="Ingeniería de Sistemas", facultad_id=fac_ing.id)
    dep_mat = Departamento(nombre="Matemáticas", facultad_id=fac_mat.id)
    dep_adm = Departamento(nombre="Administración", facultad_id=fac_adm.id)
    dep_psi = Departamento(nombre="CC. Psicológicas", facultad_id=fac_psi.id)
    dep_est = Departamento(nombre="Estadística", facultad_id=fac_est.id)
    dep_fis = Departamento(nombre="Física", facultad_id=fac_fis.id)
    dep_lit = Departamento(nombre="Lengua Nacional y Literatura", facultad_id=fac_lit.id)
    dep_ind = Departamento(nombre="Ingeniería Industrial", facultad_id=fac_ind.id)
    dep_con = Departamento(nombre="Contabilidad y Finanzas", facultad_id=fac_con.id)
    db.add_all([dep_sis, dep_mat, dep_adm, dep_psi, dep_est, dep_fis, dep_lit, dep_ind, dep_con])
    db.flush()

    # ─────────────────────────────────────────
    # ESCUELA
    # ─────────────────────────────────────────
    escuela = EscuelaProfesional(nombre="Ingeniería de Sistemas", departamento_id=dep_sis.id)
    db.add(escuela)
    db.flush()

    # ─────────────────────────────────────────
    # AULAS Y LABORATORIOS
    # ─────────────────────────────────────────
    aula_a303 = Aula(nombre="Posgrado A-303", ubicacion="Posgrado")
    aula_a307 = Aula(nombre="Posgrado A-307", ubicacion="Posgrado")
    aula_a311 = Aula(nombre="Posgrado A-311", ubicacion="Posgrado")
    aula_pi   = Aula(nombre="II-2 Pabellón Ing. Industrial", ubicacion="Ing. Industrial")
    aula_tc   = Aula(nombre="Taller de Confecciones (Ing. Industrial)", ubicacion="Ing. Industrial")
    db.add_all([aula_a303, aula_a307, aula_a311, aula_pi, aula_tc])

    lab1 = Laboratorio(nombre="Lab 1", capacidad=20)
    lab2 = Laboratorio(nombre="Lab 2", capacidad=20)
    lab3 = Laboratorio(nombre="Lab 3", capacidad=20)
    lab4 = Laboratorio(nombre="Lab 4", capacidad=20)
    lab_fis = Laboratorio(nombre="Lab Física", capacidad=20)
    lab_av  = Laboratorio(nombre="Audiovisuales", capacidad=20)
    db.add_all([lab1, lab2, lab3, lab4, lab_fis, lab_av])
    db.flush()

    # ─────────────────────────────────────────
    # SEMESTRE
    # ─────────────────────────────────────────
    semestre = Semestre(
        anio=2026,
        numero=SemestreNumeroEnum.I,
        fecha_inicio=date(2026, 4, 13),
        fecha_fin=date(2026, 8, 8),
        activo=True
    )
    db.add(semestre)
    db.flush()

    # ─────────────────────────────────────────
    # USUARIOS Y DOCENTES
    # ─────────────────────────────────────────
    def crear_docente(nombre, apellidos, dni, codigo_ibm, condicion, modalidad,
                      fecha_ingreso, departamento_id, email, password="docente123"):
        u = Usuario(email=email, password_hash=hash_password(password), rol=RolEnum.docente)
        db.add(u)
        db.flush()
        d = Docente(
            nombre=nombre, apellidos=apellidos, dni=dni, codigo_ibm=codigo_ibm,
            condicion=condicion, modalidad=modalidad,
            fecha_ingreso_unt=fecha_ingreso,
            departamento_id=departamento_id, usuario_id=u.id
        )
        db.add(d)
        db.flush()
        return d

    TC = ModalidadEnum.tiempo_completo
    TP = ModalidadEnum.tiempo_parcial
    NOM = CondicionEnum.nombrado
    CON = CondicionEnum.contratado

    # Ing. de Sistemas — nombrados TC
    # Santos va primero (más antiguo), Ticona segundo
    santos     = crear_docente("Juan Pedro",   "Santos Fernández",       "17896289", "4247", NOM, TC, date(2000, 3, 1),  dep_sis.id, "jpsantosfe@unt.edu.pe")
    ticona     = crear_docente("Robert Jerry", "Sánchez Ticona",         "18001234", "4301", NOM, TC, date(2001, 3, 1),  dep_sis.id, "rjsanchezti@unt.edu.pe")
    marcelino  = crear_docente("Marcelino",    "Torres Villanueva",      "18002001", "4302", NOM, TC, date(2002, 3, 1),  dep_sis.id, "mtorresvi@unt.edu.pe")
    alberto    = crear_docente("Alberto",      "Mendoza de los Santos",  "18003001", "4303", NOM, TC, date(2003, 3, 1),  dep_sis.id, "amendozade@unt.edu.pe")
    paul       = crear_docente("Paul",         "Cotrina Castellanos",    "18004001", "4304", NOM, TC, date(2004, 3, 1),  dep_sis.id, "pcotrinaca@unt.edu.pe")
    everson    = crear_docente("Everson David","Agreda Gamboa",          "18005001", "4305", NOM, TC, date(2005, 3, 1),  dep_sis.id, "edagredaga@unt.edu.pe")
    zoraida    = crear_docente("Zoraida",      "Vidal Melgarejo",        "18006001", "4306", NOM, TC, date(2006, 3, 1),  dep_sis.id, "zvidalme@unt.edu.pe")
    juancarlos = crear_docente("Juan Carlos",  "Obando Roldán",          "18007001", "4307", NOM, TC, date(2007, 3, 1),  dep_sis.id, "jcobandoro@unt.edu.pe")
    luis_boy   = crear_docente("Luis",         "Boy Chavil",             "18008001", "4308", NOM, TC, date(2008, 3, 1),  dep_sis.id, "lboych@unt.edu.pe")
    cesar_a    = crear_docente("César",        "Arellano Salazar",       "18009001", "4309", NOM, TC, date(2009, 3, 1),  dep_sis.id, "carellanosa@unt.edu.pe")
    camilo     = crear_docente("Camilo",       "Suárez Rebaza",          "18010001", "4310", NOM, TC, date(2010, 3, 1),  dep_sis.id, "csuarezre@unt.edu.pe")
    ricardo    = crear_docente("Ricardo",      "Mendoza Rivera",         "18011001", "4311", NOM, TC, date(2011, 3, 1),  dep_sis.id, "rmendozari@unt.edu.pe")
    oscar      = crear_docente("Oscar Romel",  "Alcántara Moreno",       "18012001", "4312", NOM, TC, date(2012, 3, 1),  dep_sis.id, "oralcantaramo@unt.edu.pe")
    jose_gomez = crear_docente("José",         "Gómez Ávila",            "18013001", "4313", NOM, TC, date(2013, 3, 1),  dep_sis.id, "jgomezav@unt.edu.pe")
    jhoe       = crear_docente("Jhoe",         "González Vásquez",       "18014001", "4314", CON, TP, date(2014, 3, 1),  dep_ind.id, "jgonzalezva@unt.edu.pe")

    # Otros departamentos — contratados TP
    bertha     = crear_docente("Bertha",       "Urtecho Zavaleta",       "19001001", "5001", CON, TP, date(2015, 3, 1),  dep_psi.id, "burtechoza@unt.edu.pe")
    jose_ponte = crear_docente("Jose Luis",    "Ponte Bejarano",         "19002001", "5002", CON, TP, date(2015, 4, 1),  dep_mat.id, "jlpontebe@unt.edu.pe")
    jorge_rios = crear_docente("Jorge Luis",   "Rios Gonzales",          "19003001", "5003", CON, TP, date(2015, 5, 1),  dep_lit.id, "jlriosgo@unt.edu.pe")
    segundo    = crear_docente("Segundo",      "Guibar Obeso",           "19004001", "5004", CON, TP, date(2015, 6, 1),  dep_mat.id, "sguibaroб@unt.edu.pe")
    miguel     = crear_docente("Miguel",       "Ipanaque Zapata",        "19005001", "5005", CON, TP, date(2015, 7, 1),  dep_est.id, "mipanaqueza@unt.edu.pe")
    martha     = crear_docente("Martha",       "Cardoso",                "19006001", "5006", CON, TP, date(2015, 8, 1),  dep_est.id, "mcardoso@unt.edu.pe")
    marcos_f   = crear_docente("Marcos",       "Ferrer Reyna",           "19007001", "5007", CON, TP, date(2015, 9, 1),  dep_mat.id, "mferrerre@unt.edu.pe")
    teresita   = crear_docente("Teresita",     "Rojas García",           "19008001", "5008", CON, TP, date(2015,10, 1),  dep_est.id, "trojasga@unt.edu.pe")
    juan_ca    = crear_docente("Juan",         "Carrascal Cabanillas",   "19009001", "5009", CON, TP, date(2015,11, 1),  dep_adm.id, "jcarrascalca@unt.edu.pe")
    vilma      = crear_docente("Vilma",        "Mendez Gil",             "19010001", "5010", CON, TP, date(2015,12, 1),  dep_fis.id, "vmendezgi@unt.edu.pe")
    sheyla     = crear_docente("Sheyla Laura", "Escobedo Rodríguez",     "19011001", "5011", CON, TP, date(2016, 1, 1),  dep_psi.id, "slescobedoro@unt.edu.pe")
    marcos_b   = crear_docente("Marcos",       "Baca Lopez",             "19012001", "5012", CON, TP, date(2016, 2, 1),  dep_ind.id, "mbacalo@unt.edu.pe")
    ana        = crear_docente("Ana",          "Cuadra Mitzugaray",      "19013001", "5013", CON, TP, date(2016, 3, 1),  dep_con.id, "acuadrami@unt.edu.pe")

    # ─────────────────────────────────────────
    # USUARIOS ADICIONALES (admin, secretaria, director)
    # ─────────────────────────────────────────
    u_adm = Usuario(email="admin@unt.edu.pe", password_hash=hash_password("admin123"), rol=RolEnum.admin)
    u_dir = Usuario(email="director@unt.edu.pe", password_hash=hash_password("director123"), rol=RolEnum.director)
    u_sec = Usuario(email="secretaria@unt.edu.pe", password_hash=hash_password("secretaria123"), rol=RolEnum.secretaria)
    db.add_all([u_adm, u_dir, u_sec])
    db.flush()

    # ─────────────────────────────────────────
    # CURSOS
    # ─────────────────────────────────────────
    OBL = TipoCursoEnum.obligatorio
    ELE = TipoCursoEnum.electivo

    def curso(codigo, nombre, ciclo, ht, hp, hl, tipo=OBL):
        c = Curso(codigo=codigo, nombre=nombre, ciclo=ciclo,
                  horas_teoria=ht, horas_practica=hp, horas_laboratorio=hl,
                  num_alumnos=40, escuela_id=escuela.id,
                  semestre_id=semestre.id, tipo=tipo)
        db.add(c)
        db.flush()
        return c

    # CICLO I
    c1_prog    = curso("INF101", "Introducción a la Programación",          1, 2, 0, 2)
    c1_ing     = curso("INF102", "Introducción a la Ing. de Sistemas",      1, 1, 2, 0)
    c1_desper  = curso("HUM101", "Desarrollo Personal",                     1, 2, 2, 0)
    c1_logmat  = curso("MAT101", "Desarrollo del Pens. Lógico Matemát.",    1, 2, 3, 0)
    c1_lectura = curso("LEN101", "Lectura Crítica y Redac. Textos Acad.",   1, 2, 2, 0)
    c1_analmat = curso("MAT102", "Introducción al Análisis Matemático",     1, 2, 4, 0)
    c1_estadg  = curso("EST101", "Estadística General",                     1, 2, 2, 0)

    # CICLO III
    c3_poo2    = curso("INF301", "Programación Orientada a Objetos II",     3, 2, 0, 4)
    c3_sist    = curso("INF302", "Sistémica",                               3, 1, 2, 2)
    c3_grafic  = curso("INF303", "Ingeniería Gráfica",                      3, 1, 1, 3, ELE)
    c3_matap   = curso("MAT301", "Matemática Aplicada",                     3, 2, 3, 0)
    c3_estap   = curso("EST301", "Estadística Aplicada",                    3, 1, 2, 2)
    c3_admin   = curso("ADM301", "Administración General",                  3, 2, 2, 0)
    c3_fisica  = curso("FIS301", "Física Electrónica",                      3, 1, 2, 2)
    c3_psicorg = curso("PSI301", "Psicología Organizacional",               3, 2, 2, 0, ELE)

    # CICLO V
    c5_datos1  = curso("INF501", "Ingeniería de Datos I",                   5, 2, 1, 3)
    c5_sisinf  = curso("INF502", "Sistemas de Información",                 5, 2, 2, 2)
    c5_transf  = curso("INF503", "Transformación Digital",                  5, 2, 0, 2)
    c5_tecweb  = curso("INF504", "Tecnología Web",                          5, 1, 1, 3)
    c5_arqcom  = curso("INF505", "Arquitectura de Computadoras",            5, 1, 2, 2)
    c5_telein  = curso("INF506", "Teleinformática",                         5, 1, 2, 2, ELE)
    c5_invop   = curso("IND501", "Investigación de Operaciones",            5, 1, 2, 2, ELE)
    c5_contg   = curso("CON501", "Contabilidad Gerencial",                  5, 1, 2, 2)

    # CICLO VII
    c7_soft1   = curso("INF701", "Ingeniería de Software I",                7, 2, 1, 3)
    c7_redes   = curso("INF702", "Redes y Comunicaciones I",                7, 1, 1, 3)
    c7_negele  = curso("INF703", "Negocios Electrónicos",                   7, 2, 0, 2, ELE)
    c7_gesti   = curso("INF704", "Gestión de Servicios de TI",              7, 1, 2, 2)
    c7_metodo  = curso("INF705", "Metodología de la Investigación Científica", 7, 2, 2, 0)
    c7_bd      = curso("INF706", "Administración de Base de Datos",         7, 1, 1, 3)
    c7_plane   = curso("INF707", "Planeamiento Estratégico de TI",          7, 1, 2, 2)
    c7_cadena  = curso("IND701", "Cadena de Suministros",                   7, 2, 2, 0, ELE)

    # CICLO IX
    c9_tesis1  = curso("INF901", "Tesis I",                                 9, 2, 2, 2)
    c9_analit  = curso("INF902", "Analítica de Negocios",                   9, 1, 2, 2)
    c9_audit   = curso("INF903", "Auditoría Informática",                   9, 1, 2, 2)
    c9_gproj   = curso("INF904", "Gestión de Proyectos de TI",              9, 1, 2, 2)
    c9_emprend = curso("INF905", "Emprendimiento Tecnológico",              9, 2, 0, 2)
    c9_ingweb  = curso("INF906", "Ingeniería Web",                          9, 1, 1, 3)
    c9_nube    = curso("INF907", "Computación en la Nube",                  9, 1, 1, 3)
    c9_hackeo  = curso("INF908", "Hackeo Ético",                            9, 2, 0, 2, ELE)

    # ─────────────────────────────────────────
    # ASIGNACIONES DE CARGA
    # ─────────────────────────────────────────
    def asignar(docente, curso, teoria=False, practica=False, num_turnos=0):
        a = AsignacionCarga(
            docente_id=docente.id, curso_id=curso.id,
            semestre_id=semestre.id,
            dicta_teoria=teoria, dicta_practica=practica
        )
        db.add(a)
        db.flush()
        for i in range(1, num_turnos + 1):
            db.add(TurnoLaboratorio(asignacion_id=a.id, numero_turno=i))
        db.flush()
        return a

    # CICLO I
    asignar(marcelino,  c1_prog,   teoria=True,  practica=False, num_turnos=2)
    asignar(paul,       c1_prog,   teoria=False, practica=False, num_turnos=2)
    asignar(alberto,    c1_ing,    teoria=True,  practica=True,  num_turnos=0)
    asignar(bertha,     c1_desper, teoria=True,  practica=True,  num_turnos=0)
    asignar(jose_ponte, c1_logmat, teoria=True,  practica=True,  num_turnos=0)
    asignar(jorge_rios, c1_lectura,teoria=True,  practica=True,  num_turnos=0)
    asignar(segundo,    c1_analmat,teoria=True,  practica=True,  num_turnos=0)
    asignar(miguel,     c1_estadg, teoria=False, practica=True,  num_turnos=0)
    asignar(martha,     c1_estadg, teoria=True,  practica=True,  num_turnos=0)

    # CICLO III
    asignar(zoraida,    c3_poo2,   teoria=True,  practica=False, num_turnos=3)
    asignar(everson,    c3_sist,   teoria=True,  practica=True,  num_turnos=3)
    asignar(juancarlos, c3_grafic, teoria=True,  practica=True,  num_turnos=2)
    asignar(marcos_f,   c3_matap,  teoria=True,  practica=True,  num_turnos=0)
    asignar(teresita,   c3_estap,  teoria=True,  practica=True,  num_turnos=3)
    asignar(juan_ca,    c3_admin,  teoria=True,  practica=True,  num_turnos=0)
    asignar(vilma,      c3_fisica, teoria=True,  practica=True,  num_turnos=5)
    asignar(sheyla,     c3_psicorg,teoria=True,  practica=True,  num_turnos=0)

    # CICLO V
    asignar(luis_boy,   c5_datos1, teoria=True,  practica=True,  num_turnos=3)
    asignar(juancarlos, c5_sisinf, teoria=True,  practica=True,  num_turnos=3)
    asignar(everson,    c5_transf, teoria=True,  practica=False, num_turnos=2)
    asignar(ticona,     c5_tecweb, teoria=True,  practica=True,  num_turnos=3)
    asignar(cesar_a,    c5_arqcom, teoria=True,  practica=True,  num_turnos=3)
    asignar(camilo,     c5_telein, teoria=True,  practica=True,  num_turnos=2)
    asignar(marcos_b,   c5_invop,  teoria=True,  practica=True,  num_turnos=3)
    asignar(ana,        c5_contg,  teoria=True,  practica=True,  num_turnos=1)

    # CICLO VII
    asignar(santos,     c7_soft1,  teoria=True,  practica=True,  num_turnos=1)
    asignar(ticona,     c7_soft1,  teoria=False, practica=False, num_turnos=2)
    asignar(cesar_a,    c7_redes,  teoria=True,  practica=True,  num_turnos=3)
    asignar(everson,    c7_negele, teoria=True,  practica=False, num_turnos=0)
    asignar(paul,       c7_negele, teoria=False, practica=False, num_turnos=2)
    asignar(alberto,    c7_gesti,  teoria=True,  practica=True,  num_turnos=2)
    asignar(paul,       c7_metodo, teoria=True,  practica=True,  num_turnos=0)
    asignar(ricardo,    c7_bd,     teoria=True,  practica=True,  num_turnos=2)
    asignar(oscar,      c7_plane,  teoria=True,  practica=True,  num_turnos=4)
    asignar(jhoe,       c7_cadena, teoria=True,  practica=True,  num_turnos=0)

    # CICLO IX
    asignar(santos,     c9_tesis1, teoria=True,  practica=True,  num_turnos=1)
    asignar(ricardo,    c9_tesis1, teoria=True,  practica=True,  num_turnos=1)
    asignar(ricardo,    c9_analit, teoria=True,  practica=True,  num_turnos=1)
    asignar(alberto,    c9_audit,  teoria=True,  practica=True,  num_turnos=2)
    asignar(jose_gomez, c9_gproj,  teoria=True,  practica=True,  num_turnos=3)
    asignar(oscar,      c9_emprend,teoria=True,  practica=False, num_turnos=2)
    asignar(marcelino,  c9_ingweb, teoria=True,  practica=True,  num_turnos=3)
    asignar(jose_gomez, c9_nube,   teoria=True,  practica=True,  num_turnos=3)
    asignar(camilo,     c9_hackeo, teoria=True,  practica=False, num_turnos=2)

    db.commit()
    print("Seed completado exitosamente.")
    print("\nCredenciales:")
    print("  Admin:      admin@unt.edu.pe    / admin123")
    print("  Director:   director@unt.edu.pe / director123")
    print("  Secretaria: secretaria@unt.edu.pe / secretaria123")
    print("  Docentes:   [email] / docente123")
    print("\nDocentes con prioridad:")
    print("  1°: jpsantosfe@unt.edu.pe")
    print("  2°: rjsanchezti@unt.edu.pe")

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()
