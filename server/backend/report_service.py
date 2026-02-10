from flask import Blueprint, send_file, jsonify
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from datetime import datetime
from db_connect import get_connection

report_bp = Blueprint('report', __name__)

@report_bp.route('/api/reports/risk', methods=['GET'])
def generate_risk_report():
    """Generate PDF report for high-risk students"""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Fetch high-risk students
        cur.execute("SELECT * FROM students WHERE risk_level = 'High' ORDER BY risk_score DESC")
        high_risk_students = cur.fetchall()
        cur.close()
        
        if not high_risk_students:
            return jsonify({"error": "No high-risk students found"}), 404
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=18)
        
        # Container for the 'Flowable' objects
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#EF4444'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("EduPredict Risk Assessment Report", title_style))
        
        # Date
        date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], 
                                    fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", date_style))
        elements.append(Spacer(1, 20))
        
        # Summary Box
        summary_text = f"""
        <b>Total High Risk Students:</b> {len(high_risk_students)}<br/>
        <b>Action Required:</b> Immediate counseling recommended for listed students.
        """
        summary_style = ParagraphStyle('Summary', parent=styles['Normal'], 
                                       fontSize=11, leftIndent=20, rightIndent=20)
        elements.append(Paragraph(summary_text, summary_style))
        elements.append(Spacer(1, 20))
        
        # Table Data
        data = [['ID', 'Name', 'Department', 'Risk Score', 'Attendance', 'Backlogs']]
        for student in high_risk_students:
            data.append([
                student['student_id'],
                student['name'],
                student['department'],
                str(student['risk_score']),
                f"{student['attendance_percentage']}%",
                str(student['backlogs'])
            ])
        
        # Create Table
        table = Table(data, colWidths=[1*inch, 2*inch, 1.5*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EF4444')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FEF2F2')])
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'EduPredict_Risk_Report_{datetime.now().strftime("%Y-%m-%d")}.pdf'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@report_bp.route('/api/reports/performance', methods=['GET'])
def generate_performance_report():
    """Generate PDF report for class performance"""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        
        # Fetch all students
        cur.execute("SELECT * FROM students ORDER BY sgpa DESC")
        students = cur.fetchall()
        cur.close()
        
        if not students:
            return jsonify({"error": "No student data found"}), 404
        
        # Calculate averages
        avg_attendance = sum(s['attendance_percentage'] for s in students) / len(students)
        avg_sgpa = sum(s['sgpa'] for s in students) / len(students)
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30,
                               topMargin=30, bottomMargin=18)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2563EB'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("EduPredict Academic Performance Report", title_style))
        
        # Date
        date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], 
                                    fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
        elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", date_style))
        elements.append(Spacer(1, 20))
        
        # Summary Box
        summary_text = f"""
        <b>Class Average Attendance:</b> {avg_attendance:.1f}%<br/>
        <b>Class Average SGPA:</b> {avg_sgpa:.2f}
        """
        summary_style = ParagraphStyle('Summary', parent=styles['Normal'], 
                                       fontSize=11, leftIndent=20, rightIndent=20)
        elements.append(Paragraph(summary_text, summary_style))
        elements.append(Spacer(1, 20))
        
        # Table Data
        data = [['ID', 'Name', 'Dept', 'Sem', 'SGPA', 'Attendance', 'Risk']]
        for student in students:
            data.append([
                student['student_id'],
                student['name'][:20],  # Truncate if too long
                student['department'][:10],
                student['semester'],
                f"{student['sgpa']:.2f}",
                f"{student['attendance_percentage']:.0f}%",
                student['risk_level']
            ])
        
        # Create Table
        table = Table(data, colWidths=[0.8*inch, 1.8*inch, 1*inch, 0.6*inch, 0.7*inch, 1*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightblue])
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'EduPredict_Performance_Report_{datetime.now().strftime("%Y-%m-%d")}.pdf'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
