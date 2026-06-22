import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def generate_plan_estudios_pdf(cursos, escuela_nombre="INGENIERIA DE SISTEMAS", anio_plan="2018"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )

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
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=11,
        alignment=TA_CENTER,
        spaceAfter=15,
        fontName='Helvetica-Bold'
    )

    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_LEFT,
        spaceAfter=10
    )

    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT
    )

    cell_bold_style = ParagraphStyle(
        'CellBoldStyle',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )

    story = []

    # Header
    now = datetime.now()
    fecha_str = f"Fecha de Impresión: {now.strftime('%Y-%m-%d')} ({now.strftime('%H:%M:%S')})"
    story.append(Paragraph(fecha_str, date_style))
    story.append(Paragraph("UNIVERSIDAD NACIONAL DE TRUJILLO", title_style))
    story.append(Paragraph(f"PLAN DE ESTUDIOS DE {escuela_nombre.upper()} {anio_plan}", subtitle_style))

    # Group courses by ciclo
    ciclos_dict = {}
    for c in cursos:
        if c.ciclo not in ciclos_dict:
            ciclos_dict[c.ciclo] = []
        ciclos_dict[c.ciclo].append(c)

    # Sort ciclos
    ciclos_sorted = sorted(ciclos_dict.keys())

    # Map for Tipo
    tipo_map = {
        "obligatorio": "OB",
        "electivo": "EL",
        "opcional": "OP",
        "sello": "S"
    }

    # Build the table data
    table_data = []
    
    # Headers
    # #    Ciclo Tipo
    # Curso Curso T P L C Departamento Responsable
    # We will simulate this using a 2-row header or a clean 1-row header that covers the fields.
    table_data.append(["# Curso", "Ciclo", "Tipo", "Curso", "T", "P", "L", "C", "Departamento Responsable"])

    for ciclo in ciclos_sorted:
        suma_creditos = 0
        cursos_ciclo = ciclos_dict[ciclo]
        
        # We can sort courses by code or name within cycle
        cursos_ciclo.sort(key=lambda x: x.codigo)

        for c in cursos_ciclo:
            tipo_str = tipo_map.get(c.tipo.value, "OB")
            dpto = c.departamento.nombre if c.departamento else "—"
            
            # The row
            table_data.append([
                Paragraph(str(c.codigo), cell_style),
                Paragraph(str(c.ciclo), cell_style),
                Paragraph(tipo_str, cell_style),
                Paragraph(c.nombre, cell_style),
                Paragraph(str(c.horas_teoria), cell_style),
                Paragraph(str(c.horas_practica), cell_style),
                Paragraph(str(c.horas_laboratorio), cell_style),
                Paragraph(str(c.creditos), cell_style),
                Paragraph(dpto, cell_style)
            ])
            suma_creditos += c.creditos
            
            # We don't have prerequisites in the DB yet, so we skip the lines with "*"

        # Suma de créditos row
        # Add a custom row that spans multiple columns to show "Suma de créditos: X"
        table_data.append([
            "", "", "", Paragraph(f"<b>Suma de créditos: {suma_creditos}</b>", cell_style),
            "", "", "", "", ""
        ])

    colWidths = [1.5*cm, 1*cm, 1*cm, 6.5*cm, 0.8*cm, 0.8*cm, 0.8*cm, 0.8*cm, 4.5*cm]
    
    t = Table(table_data, colWidths=colWidths, repeatRows=1)
    
    # Add table style
    ts = TableStyle([
        # Header style
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4A6CF7')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        
        # Grid
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
    ])

    # Add specific alignment for columns
    for row_idx in range(1, len(table_data)):
        # Align T, P, L, C to center
        ts.add('ALIGN', (4, row_idx), (7, row_idx), 'CENTER')
        
        # Merge columns for "Suma de creditos" row
        if "Suma de créditos:" in str(table_data[row_idx][3]):
            ts.add('SPAN', (3, row_idx), (7, row_idx))
            ts.add('ALIGN', (3, row_idx), (7, row_idx), 'RIGHT')
            ts.add('BACKGROUND', (0, row_idx), (-1, row_idx), colors.HexColor('#F3F4F6'))

    t.setStyle(ts)
    story.append(t)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
