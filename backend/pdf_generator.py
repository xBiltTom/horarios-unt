import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT

def generate_pdf(docente, asignaciones, carga_dict, semestre, formato="all"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    
    if formato in ["all", "1"]:
        story.extend(_build_formato_1(docente, asignaciones, carga_dict, semestre))
    
    if formato in ["all", "2"]:
        if formato == "all":
            story.append(PageBreak())
        story.extend(_build_formato_2(docente, semestre))
        
    if formato in ["all", "3"]:
        if formato == "all":
            story.append(PageBreak())
        story.extend(_build_formato_3(docente, semestre))

    doc.build(story)
    buffer.seek(0)
    return buffer

def _get_styles():
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    normal_justify = ParagraphStyle(
        'NormalJustify',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        leading=14
    )
    
    normal_center = ParagraphStyle(
        'NormalCenter',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=12
    )

    bold_justify = ParagraphStyle(
        'BoldJustify',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_JUSTIFY,
        spaceAfter=12,
        leading=14,
        fontName='Helvetica-Bold'
    )

    return styles, title_style, normal_justify, normal_center, bold_justify

def _build_formato_1(docente, asignaciones, carga_dict, semestre):
    styles, title_style, normal_justify, normal_center, _ = _get_styles()
    story = []

    # Title
    story.append(Paragraph("FORMATO N° 1", title_style))
    story.append(Paragraph("DECLARACION DE CARGA HORARIA ASIGNADA", title_style))
    story.append(Spacer(1, 10))

    # Personal Data
    story.append(Paragraph("<b>I. DATOS SOBRE LA SITUACION DEL PROFESOR:</b>", styles['Normal']))
    story.append(Spacer(1, 5))
    
    facultad_nombre = docente.departamento.facultad.nombre if docente.departamento and docente.departamento.facultad else "Ingeniería"
    dpto_nombre = docente.departamento.nombre if docente.departamento else "Ingeniería de Sistemas"

    data_sit = [
        ["FACULTAD:", facultad_nombre],
        ["DPTO. ACADEMICO:", dpto_nombre]
    ]
    t_sit = Table(data_sit, colWidths=[120, 395])
    t_sit.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_sit)
    story.append(Spacer(1, 10))

    # Table 2: Name, Condition, Category, Modality
    cat_str = "Asociado" # Assuming a default since we don't have this field
    mod_str = docente.modalidad.value.replace("_", " ").title() if docente.modalidad else "Tiempo Completo"
    if mod_str.lower() == "tiempo completo":
        mod_str = "Tiempo Completo 40 H"

    data_prof = [
        ["NOMBRE COMPLETO", "CONDICION", "CATEGORIA", "MODALIDAD"],
        [f"{docente.apellidos}, {docente.nombre}".upper(), docente.condicion.value.title() if docente.condicion else "Nombrado", cat_str, mod_str]
    ]
    t_prof = Table(data_prof, colWidths=[230, 95, 95, 95])
    t_prof.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,1), (0,1), 'LEFT'), # Left align name
    ]))
    story.append(t_prof)
    story.append(Spacer(1, 5))

    # Semester dates
    sem_anio = semestre.anio if semestre else "2026"
    sem_num = semestre.numero.value if semestre and semestre.numero else "I"
    f_ini = semestre.fecha_inicio.strftime("%d/%m/%Y") if semestre and semestre.fecha_inicio else ""
    f_fin = semestre.fecha_fin.strftime("%d/%m/%Y") if semestre and semestre.fecha_fin else ""

    data_sem = [
        [f"AÑO ACADEMICO:   {sem_anio}    CICLO(SEM):   {sem_num}", f"INICIO: {f_ini}  -  FINAL: {f_fin}"]
    ]
    t_sem = Table(data_sem, colWidths=[250, 265])
    t_sem.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(t_sem)
    story.append(Spacer(1, 10))

    # Lectivo Data
    story.append(Paragraph("1. TRABAJO LECTIVO.- Datos completos y con claridad", styles['Normal']))
    
    headers_lectivo = ["CODIGO", "NOMBRE DEL CURSO", "CUR.", "ESCUELA PROF.", "CIC.", "SEC.", "N° AL.", "H.T.", "H.P.", "H.L.", "Total"]
    data_lectivo = [headers_lectivo]
    
    tipo_map = {
        "sello": "S",
        "obligatorio": "OB",
        "opcional": "OP",
        "electivo": "EL"
    }

    total_lectivo = 0
    for a in asignaciones:
        curso = a.curso
        ht = curso.horas_teoria * a.grupos_teoria if a.dicta_teoria else 0
        hp = curso.horas_practica * a.grupos_practica if a.dicta_practica else 0
        hl = curso.horas_laboratorio * len(a.turnos_laboratorio)
        total = ht + hp + hl
        total_lectivo += total
        
        escuela = curso.escuela.nombre if curso.escuela else ""
        if "Ingenieria" in escuela:
            escuela = escuela.replace("Ingeniería de ", "Ing. ").replace("Ingenieria de ", "Ing. ")
        
        row = [
            curso.codigo,
            Paragraph(curso.nombre, ParagraphStyle('t', fontSize=7, leading=8)),
            tipo_map.get(curso.tipo.value, "OB"), # Tipo
            Paragraph(escuela, ParagraphStyle('t', fontSize=7, leading=8)),
            str(curso.ciclo),
            "A", # Seccion (mocked)
            str(curso.num_alumnos),
            str(ht) if ht else "0",
            str(hp) if hp else "0",
            str(hl) if hl else "0",
            str(total)
        ]
        data_lectivo.append(row)

    if not asignaciones:
        data_lectivo.append(["", "Sin cursos asignados", "", "", "", "", "", "", "", "", "0"])

    col_widths = [45, 140, 30, 80, 25, 25, 30, 30, 30, 30, 50]
    t_lectivo = Table(data_lectivo, colWidths=col_widths)
    t_lectivo.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,1), (1,-1), 'LEFT'), # Course names left aligned
    ]))
    story.append(t_lectivo)

    # Non-Lectivo Data
    rubros_config = [
        ("preparacion", "2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)"),
        ("consejeria", "3. CONSEJERIA: Señalar número de alumnos y el ciclo académico..."),
        ("investigacion", "4. INVESTIGACION: Consignar el N° de inscripción, código, nombre y duración..."),
        ("capacitacion", "5. CAPACITACION: Señale lo referente a este rubro..."),
        ("actividades_gobierno", "6. ACTIVIDADES DE GOBIERNO: Si desempeña cargo indique."),
        ("actividades_administracion", "7. ACTIVIDADES DE ADMINISTRACION: Si desempeña cargo indique."),
        ("asesoria", "8. ASESORIA DE TESIS, EXAMENES PROFESIONALES Y EXPERIENCIA PROF..."),
        ("rsu", "9. RESPONSABILIDAD SOCIAL UNIVERSITARIA: Señalar actividad..."),
        ("comites_comisiones", "10. COMITES TECNICOS Y COMISIONES: Consignar número de Resolución...")
    ]

    total_no_lectivo = 0
    data_no_lectivo = []
    for r_id, label in rubros_config:
        horas = 0
        desc = ""
        if r_id in carga_dict:
            horas = carga_dict[r_id].get("horas", 0)
            desc = carga_dict[r_id].get("descripcion", "")
        
        total_no_lectivo += horas
        
        row = [
            Paragraph(label, ParagraphStyle('r_label', fontSize=8, leading=9)),
            Paragraph(desc or "", ParagraphStyle('r_desc', fontSize=8, leading=9, textColor=colors.darkgray)),
            str(horas)
        ]
        data_no_lectivo.append(row)

    # Totals Row
    total_general = total_lectivo + total_no_lectivo
    data_no_lectivo.append(["", "TOTAL", str(total_general)])

    t_nl = Table(data_no_lectivo, colWidths=[210, 255, 50])
    t_nl.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('SPAN', (0,-1), (1,-1)), # Span TOTAL text
        ('ALIGN', (0,-1), (1,-1), 'RIGHT'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
    ]))
    story.append(t_nl)
    story.append(Spacer(1, 20))

    # Date
    curr_date = datetime.now()
    meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    fecha_str = f"Trujillo, {curr_date.day} de {meses[curr_date.month-1]} del {curr_date.year}"
    story.append(Paragraph(fecha_str, ParagraphStyle('date', alignment=TA_RIGHT, fontSize=10)))
    story.append(Spacer(1, 50))

    # Signatures
    sig_data = [
        ["_____________________________", "_____________________________"],
        ["Firma del Profesor", "Firma del Director de Dpto."]
    ]
    t_sig = Table(sig_data, colWidths=[250, 250])
    t_sig.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,1), 9),
    ]))
    story.append(t_sig)
    
    story.append(Spacer(1, 40))
    story.append(Paragraph("_____________________________", ParagraphStyle('sig', alignment=TA_CENTER)))
    story.append(Paragraph("V° B° DECANO FAC.", ParagraphStyle('sig2', alignment=TA_CENTER, fontSize=9)))

    return story

def _build_formato_2(docente, semestre):
    styles, title_style, normal_justify, normal_center, bold_justify = _get_styles()
    story = []

    story.append(Paragraph("FORMATO N° 2", title_style))
    story.append(Paragraph("DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL", title_style))
    story.append(Spacer(1, 30))

    dpto_nombre = docente.departamento.nombre if docente.departamento else "Ingeniería de Sistemas"
    facultad_nombre = docente.departamento.facultad.nombre if docente.departamento and docente.departamento.facultad else "Ingeniería"
    mod_str = docente.modalidad.value.replace("_", " ").title() if docente.modalidad else "Tiempo Completo"
    if mod_str.lower() == "tiempo completo":
        mod_str = "Tiempo Completo 40 H"

    p1 = f"Yo, {docente.apellidos}, {docente.nombre} identificado con DNI. Nro {docente.dni} con Código IBM Nro {docente.codigo_ibm} del Departamento Académico Dpto. de {dpto_nombre} Facultad de {facultad_nombre}; en el marco del programa de Homologación de la remuneración de los docentes universitarios, dispuesto por el D.U. Nro 033-2006 y D.S. Nro 019-2006-EF, DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD, que:"
    story.append(Paragraph(p1, normal_justify))

    p2 = "NO ESTOY INCURSO en causales de incompatibilidad laboral y NO TENGO impedimento para ejercer la docencia en la Universidad Nacional de Trujillo, de conformidad con lo previsto en el capitulo VII de las Incompatibilidades e Impedimentos, del Título VI: Los Profesores, del Estatuto Institucional vigente."
    story.append(Paragraph(p2, normal_justify))

    p3 = f"Soy docente {docente.condicion.value.title() if docente.condicion else 'Nombrado'}, a {mod_str} y NO desempeño cargo público o privado en horas que coincidan con el horario establecido en la Universidad Nacional de Trujillo (De conformidad con los artículos 270ro y 277ro del Estatuto Institucional vigente)."
    story.append(Paragraph(p3, normal_justify))

    p4 = "EN CASO DE FALTAR A LA VERDAD ME SOMETO A LAS SANCIONES QUE SEAN APLICABLES DE ACUERDO A LEY; ASIMISMO, DE ENCONTRARME INCURSO EN SITUACION DE INCOMPATIBILIDAD O IMPEDIMENTO PARA EJERCER LA DOCENCIA EN LA U.N.T., ME SOMETO A LAS SANCIONES PREVISTAS POR SU ESTATUTO,"
    story.append(Paragraph(p4, normal_justify))

    p5 = "<i>Y AUTORIZO AL FUNCIONARIO COMPETENTE DISPONGA EL DESCUENTO DE MI PLANILLA DE HABERES, DEL MONTO QUE LA UNIDAD DE REMUNERACIONES LIQUIDE COMO PAGOS INDEBIDOS POR EL LAPSO DE TIEMPO LABORADO ILEGALMENTE.</i>"
    story.append(Paragraph(p5, bold_justify))
    story.append(Spacer(1, 40))

    # Date
    from reportlab.lib.enums import TA_RIGHT
    curr_date = datetime.now()
    meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    fecha_str = f"Trujillo, {curr_date.day} de {meses[curr_date.month-1]} del {curr_date.year}"
    story.append(Paragraph(fecha_str, ParagraphStyle('date', alignment=TA_RIGHT, fontSize=11, fontName='Helvetica-Bold')))
    story.append(Spacer(1, 60))

    # Signature
    story.append(Paragraph("__________________________________________", normal_center))
    story.append(Paragraph("FIRMA DEL DECLARANTE", ParagraphStyle('sig', alignment=TA_CENTER, fontName='Helvetica-Bold')))
    story.append(Paragraph(f"DNI: {docente.dni}", normal_center))

    return story

def _build_formato_3(docente, semestre):
    styles, title_style, normal_justify, normal_center, bold_justify = _get_styles()
    story = []

    story.append(Paragraph("DECLARACION JURADA DE LOS DOCENTES QUE PRESTAN SERVICIOS EN SEDES DESCENTRALIZADAS", title_style))
    story.append(Spacer(1, 30))

    dpto_nombre = docente.departamento.nombre if docente.departamento else "Ingeniería de Sistemas"
    facultad_nombre = docente.departamento.facultad.nombre if docente.departamento and docente.departamento.facultad else "Ingeniería"

    p1 = f"Yo, {docente.apellidos}, {docente.nombre} identificado con DNI. Nro {docente.dni} con Código IBM Nro {docente.codigo_ibm} del Departamento Académico Dpto. de {dpto_nombre} Facultad de {facultad_nombre}; en el marco del reglamento de funcionamiento de Sedes Descentralizadas (RCU Nro 072 CU-COG-2005/UNT) y la Directiva Nro 01-2007-VAC/UNT sobre Racionalización Académica del Personal Docentes que labora en las Sedes descentralizadas (R.C.U. Nro 576-2007/UNT) DECLARO BAJO JURAMENTO Y EN HONOR A LA VERDAD QUE:"
    story.append(Paragraph(p1, normal_justify))

    p2 = "EN MI PRESTACION DE SERVICIOS EN SEDES DESCENTRALIZADAS NO ESTOY INCURSO EN INCOMPATIBILIDAD HORARIA NI CONTRAVENGO LA SIGUIENTE NORMATIVIDAD INSTITUCIONAL:"
    story.append(Paragraph(p2, normal_justify))

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=normal_justify,
        leftIndent=10,
        spaceBefore=6
    )

    bullets = [
        "Los docentes ordinarios a Dedicación Exclusiva y Tiempo Completo solo pueden tener carga horaria máxima de diez (10) horas semanales (num. 1 de la Directiva).",
        "Los docentes que ejercen cargos académicos y administrativos de: Jefe de Departamento Académico, Director de Escuela Académico Profesional, Director de Sección de Postgrado, Profesor Secretario de Facultad. Jefe de Oficina General, o cargos Directivos en Centros de Producción o líneas de Rentabilidad pueden asumir carga máxima de 05 horas semanales, siempre que sea en forma excepcional y por no contar con docente de la especialidad habilitada para asumir dicha carga. (num. 2 y 3 de la Directiva RCU Nro 005-2009/UNT y art.23 del Reglamento).",
        "Los docentes que ejercen cargo de Decano o Director de Postgrado y aquellos que prestan servicios en Centros de Producción y línea de Rentabilidad no pueden asumir carga horaria en Sedes Descentralizadas. (num. 3 de la Directiva ya art 23 del Reglamento).",
        "Los docentes beneficiados con becas de estudio de maestría o doctorado o Segunda especialidad solo pueden tener carga horaria máxima de tres (03) horas semanales. (num. 4 de la Directiva).",
        "El desarrollo de la carga en sede descentralizada no puede inferir con la carga lectiva y no lectiva asignada en la Sede Central; salvo el caso de las Sedes de Cascas, Huamachuco, Tayabamba y Santiago de Chuco en que se debe contar con Licencia por comisión de servicios y carta de compromiso del docente que asumiría la carga horaria en la Sede Central (num. 5 y 7 de la Directiva y art. 23 del Reglamento).",
        "Los docentes que asumen carga horaria en las Sedes de Huamachuco, Cascas, Santiago de Chuco y Tayabamba no pueden asumir labores durante el mismo periodo en otra Sede (num. 6 de la Directiva)."
    ]

    for b in bullets:
        story.append(Paragraph(b, bullet_style))
        story.append(Spacer(1, 6))

    p_final1 = "En caso de faltar a la verdad así como de incurrir en incompatibilidad horaria contraviniendo los dispositivos pre-citados me avengo a las sanciones que correspondan,"
    story.append(Paragraph(p_final1, normal_justify))

    p_final2 = "<i>y autorizo al funcionario competente disponga el descuento del pago por mis servicios en Sedes Descentralizadas, conforme al monto que la unidad de remuneraciones liquide como pago indebido por el periodo ilegalmente laborado.</i>"
    story.append(Paragraph(p_final2, bold_justify))
    story.append(Spacer(1, 40))

    # Date
    from reportlab.lib.enums import TA_RIGHT
    curr_date = datetime.now()
    meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    fecha_str = f"Trujillo, {curr_date.day} de {meses[curr_date.month-1]} del {curr_date.year}"
    story.append(Paragraph(fecha_str, ParagraphStyle('date', alignment=TA_RIGHT, fontSize=11, fontName='Helvetica-Bold')))
    story.append(Spacer(1, 60))

    # Signature
    story.append(Paragraph("__________________________________________", normal_center))
    story.append(Paragraph("FIRMA DEL DECLARANTE", ParagraphStyle('sig', alignment=TA_CENTER, fontName='Helvetica-Bold')))
    story.append(Paragraph(f"DNI: {docente.dni}", normal_center))

    return story
