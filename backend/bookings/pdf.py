import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT


def generate_booking_receipt_pdf(booking):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#0c4a6e'))
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#0c4a6e'), spaceAfter=6)
    normal_style = styles['Normal']
    bold_style = ParagraphStyle('Bold', parent=normal_style, fontName='Helvetica-Bold')
    right_style = ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)

    elements = []

    # Header
    elements.append(Paragraph('Adel Beach Resort', title_style))
    elements.append(Paragraph('Lawigan, Surigao Del Sur | 09685361395 | arnelarcos@adel-resort.ph', subtitle_style))
    elements.append(Spacer(1, 8*mm))

    # Receipt title
    elements.append(Paragraph('Booking Receipt', heading_style))
    elements.append(Spacer(1, 4*mm))

    # Booking info table
    guest_name = f'{booking.user.first_name} {booking.user.last_name}'.strip() or booking.user.username
    payment_type = ''
    payment_amount = ''
    if hasattr(booking, 'payment'):
        payment_type = booking.payment.get_payment_type_display() if hasattr(booking.payment, 'get_payment_type_display') else booking.payment.payment_type
        payment_amount = f'PHP {booking.payment.amount:,.2f}'

    info_data = [
        ['Reference:', booking.reference_code],
        ['Guest:', guest_name],
        ['Room:', booking.room.name],
        ['Check-in:', str(booking.check_in)],
        ['Check-out:', str(booking.check_out)],
        ['Guests:', str(booking.guests)],
        ['Slots:', booking.slots_summary],
        ['Status:', booking.status.title()],
    ]
    if payment_type:
        info_data.append(['Payment Type:', payment_type])
    if payment_amount:
        info_data.append(['Amount Paid:', payment_amount])

    info_table = Table(info_data, colWidths=[120, 350])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    # Voucher discount if any
    voucher_discount = None
    if hasattr(booking, 'voucher_usage'):
        voucher_discount = booking.voucher_usage.discount_amount

    # Total
    total_data = []
    if voucher_discount:
        total_data.append(['Voucher Discount:', f'-PHP {voucher_discount:,.2f}'])
    total_data.append(['Total Price:', f'PHP {booking.total_price:,.2f}'])

    total_table = Table(total_data, colWidths=[120, 350])
    total_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TEXTCOLOR', (-1, -1), (-1, -1), colors.HexColor('#0c4a6e')),
        ('LINEABOVE', (0, 0), (-1, 0), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 10*mm))

    # Special requests
    if booking.special_requests:
        elements.append(Paragraph('Special Requests:', bold_style))
        elements.append(Paragraph(booking.special_requests, normal_style))
        elements.append(Spacer(1, 6*mm))

    # Footer
    footer_style = ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph('This is a computer-generated receipt. No signature required.', footer_style))
    elements.append(Paragraph('Adel Beach Resort | adel-resort.ph', footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
