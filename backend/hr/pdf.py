import io
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT


def _fmt_php(amount):
    if amount is None:
        return 'PHP 0.00'
    return f'PHP {Decimal(amount):,.2f}'


def generate_payslip_pdf(payslip):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm,
                            leftMargin=15 * mm, rightMargin=15 * mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20,
                                 textColor=colors.HexColor('#0c4a6e'))
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=9,
                                    textColor=colors.grey, alignment=TA_CENTER)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=13,
                                   textColor=colors.HexColor('#0c4a6e'), spaceAfter=4)
    section_style = ParagraphStyle('Section', parent=styles['Heading3'], fontSize=11,
                                   textColor=colors.HexColor('#075985'), spaceAfter=4)
    normal_style = styles['Normal']
    bold_style = ParagraphStyle('Bold', parent=normal_style, fontName='Helvetica-Bold')
    right_style = ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)
    footer_style = ParagraphStyle('Footer', parent=normal_style, fontSize=8,
                                  textColor=colors.grey, alignment=TA_CENTER)

    elements = []
    emp = payslip.employee
    user = emp.user
    run = payslip.run
    period = run.period
    comp = payslip.compensation_snapshot

    elements.append(Paragraph('Adel Beach Resort', title_style))
    elements.append(Paragraph('Lawigan, Surigao Del Sur | 09685361395 | arnelarcos@adel-resort.ph',
                              subtitle_style))
    elements.append(Paragraph('Employer TIN: 000-000-000-00000', subtitle_style))
    elements.append(Spacer(1, 6 * mm))

    elements.append(Paragraph('PAYSLIP', heading_style))

    period_label = f'{period.start_date} to {period.end_date}'
    if period.half == 'thirteenth_month':
        period_label = f'13th Month {period.year}'
    header_data = [
        ['Payslip No.:', payslip.payslip_number, 'Pay Period:', period_label],
        ['Pay Date:', str(period.pay_date), 'Run #:', str(run.id)],
    ]
    header_table = Table(header_data, colWidths=[70, 180, 70, 180])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 5 * mm))

    elements.append(Paragraph('Employee Information', section_style))
    guest_name = f'{user.first_name} {user.last_name}'.strip() or user.username
    emp_data = [
        ['Name:', guest_name, 'Employee Code:', emp.employee_code],
        ['Position:', emp.position or '-', 'Department:', emp.department or '-'],
        ['TIN:', emp.tin or '-', 'SSS No.:', emp.sss_number or '-'],
        ['PhilHealth No.:', emp.philhealth_number or '-', 'Pag-IBIG No.:', emp.pagibig_number or '-'],
        ['Pay Schedule:', comp.get_pay_schedule_display() if comp else '-',
         'Status:', emp.get_employment_status_display()],
    ]
    emp_table = Table(emp_data, colWidths=[70, 180, 70, 180])
    emp_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('BOX', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 5 * mm))

    line_items = list(payslip.line_items.all())
    earnings = [li for li in line_items if li.category == 'earning']
    deductions = [li for li in line_items if li.category == 'deduction']
    employer_lines = [li for li in line_items if li.category == 'employer_contribution']
    info_lines = [li for li in line_items if li.category == 'info']

    elements.append(Paragraph('Earnings', section_style))
    earnings_data = [['Code', 'Description', 'Amount']]
    earnings_total = Decimal('0.00')
    for li in earnings:
        earnings_data.append([li.code, li.label, _fmt_php(li.amount)])
        earnings_total += Decimal(li.amount or 0)
    earnings_data.append(['', 'Total Earnings', _fmt_php(earnings_total)])

    earnings_table = Table(earnings_data, colWidths=[90, 290, 120])
    earnings_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0f2fe')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f9ff')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(earnings_table)
    elements.append(Spacer(1, 4 * mm))

    elements.append(Paragraph('Deductions', section_style))
    deductions_data = [['Code', 'Description', 'Amount']]
    deductions_total = Decimal('0.00')
    for li in deductions:
        deductions_data.append([li.code, li.label, _fmt_php(li.amount)])
        deductions_total += Decimal(li.amount or 0)
    deductions_data.append(['', 'Total Deductions', _fmt_php(deductions_total)])

    deductions_table = Table(deductions_data, colWidths=[90, 290, 120])
    deductions_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fffbeb')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(deductions_table)
    elements.append(Spacer(1, 5 * mm))

    if info_lines:
        elements.append(Paragraph('Attendance Summary', section_style))
        info_data = [['', '']]
        for li in info_lines:
            info_data.append([li.code, li.label])
        info_table = Table(info_data, colWidths=[90, 310])
        info_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f9ff')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 5 * mm))

    net_data = [['NET PAY', _fmt_php(payslip.net_pay)]]
    net_table = Table(net_data, colWidths=[380, 120])
    net_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 13),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0c4a6e')),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 6 * mm))

    if employer_lines:
        elements.append(Paragraph('Employer Contributions (for reference — not deducted)',
                                  section_style))
        er_data = [['Code', 'Description', 'Amount']]
        er_total = Decimal('0.00')
        for li in employer_lines:
            er_data.append([li.code, li.label, _fmt_php(li.amount)])
            er_total += Decimal(li.amount or 0)
        er_data.append(['', 'Total Employer Share', _fmt_php(er_total)])
        er_table = Table(er_data, colWidths=[90, 290, 120])
        er_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e5e7eb')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(er_table)
        elements.append(Spacer(1, 6 * mm))

    sig_data = [
        ['', ''],
        ['_______________________', '_______________________'],
        ['Prepared By', 'Received By'],
    ]
    sig_table = Table(sig_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, 0), 20),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 8 * mm))

    elements.append(Paragraph(
        'This is a computer-generated payslip. BIR-compliant per RR 11-2018.',
        footer_style))
    elements.append(Paragraph('Adel Beach Resort | adel-resort.ph', footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
