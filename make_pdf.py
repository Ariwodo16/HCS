from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors

W, H = letter  # 612 x 792


def header(c, page=1):
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, H - 0.55*inch, "Home Care Solutions LLC")
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, H - 0.75*inch,
        "3235 Satellite Blvd, Bldg 400 Ste 300. Duluth GA 30096.  Tel: 404-528-5327; Fax: 678-364-7955")
    c.setFont("Helvetica-Bold", 15 if page == 1 else 12)
    title = "Employment Application" if page == 1 else "Employment Application Continued"
    c.drawCentredString(W/2, H - 1.1*inch, title)


def section_bar(c, y, lbl):
    c.setFillColorRGB(0.15, 0.15, 0.15)
    c.rect(0.65*inch, y - 0.05*inch, W - 1.3*inch, 0.28*inch, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W/2, y + 0.04*inch, lbl)
    c.setFillColorRGB(0, 0, 0)


def txt_field(acro, name, x, y, width, height=0.22*inch):
    acro.textfield(
        name=name, tooltip=name,
        x=x, y=y, width=width, height=height,
        borderWidth=0.5,
        borderColor=colors.HexColor('#999999'),
        fillColor=colors.HexColor('#F5F5F5'),
        fontSize=9, textColor=colors.black,
        fieldFlags='',
    )


def chk(acro, name, x, y, size=10):
    acro.checkbox(
        name=name, tooltip=name,
        x=x, y=y, size=size,
        borderWidth=0.5,
        borderColor=colors.HexColor('#999999'),
        fillColor=colors.HexColor('#F5F5F5'),
    )


def lbl(c, text, x, y, bold=False, size=8.5):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, text)


def make_pdf(path):
    c = canvas.Canvas(path, pagesize=letter)
    acro = c.acroForm

    # ── PAGE 1 ──────────────────────────────────────────────────
    header(c, 1)
    y = H - 1.45*inch

    # Applicant Personal Information
    section_bar(c, y, "Applicant Personal Information")
    y -= 0.38*inch

    lbl(c, "Full Name:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "last_name",   1.35*inch, y, 1.6*inch);  lbl(c, "Last name",      1.37*inch, y - 0.13*inch, size=7.5)
    txt_field(acro, "first_name",  3.05*inch, y, 1.6*inch);  lbl(c, "First name",     3.07*inch, y - 0.13*inch, size=7.5)
    txt_field(acro, "middle_init", 4.75*inch, y, 0.72*inch); lbl(c, "Middle initial", 4.77*inch, y - 0.13*inch, size=7.5)
    lbl(c, "Date:", 5.57*inch, y + 0.06*inch)
    txt_field(acro, "date_p1", 5.9*inch, y, 1.0*inch)
    y -= 0.52*inch

    lbl(c, "Address:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "street_address", 1.35*inch, y, 3.6*inch); lbl(c, "Street address", 1.37*inch, y - 0.13*inch, size=7.5)
    txt_field(acro, "apt_num",        5.05*inch, y, 0.85*inch); lbl(c, "Apartment #",   5.07*inch, y - 0.13*inch, size=7.5)
    y -= 0.52*inch

    txt_field(acro, "city",  0.65*inch, y, 2.5*inch);  lbl(c, "City",  0.67*inch, y - 0.13*inch, size=7.5)
    txt_field(acro, "state", 3.25*inch, y, 0.9*inch);  lbl(c, "State", 3.27*inch, y - 0.13*inch, size=7.5)
    txt_field(acro, "zip",   4.25*inch, y, 1.2*inch);  lbl(c, "Zip",   4.27*inch, y - 0.13*inch, size=7.5)
    y -= 0.52*inch

    lbl(c, "Phone:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "phone", 1.1*inch, y, 2.0*inch)
    lbl(c, "Email:", 3.25*inch, y + 0.06*inch)
    txt_field(acro, "email", 3.7*inch, y, 4.2*inch)
    y -= 0.4*inch

    lbl(c, "Date Available:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "date_available", 1.6*inch, y, 1.3*inch)
    lbl(c, "Social Security #:", 3.1*inch, y + 0.06*inch)
    txt_field(acro, "ssn", 4.15*inch, y, 1.45*inch)
    lbl(c, "Desired Salary:", 5.75*inch, y + 0.06*inch)
    txt_field(acro, "desired_salary", 6.65*inch, y, 0.75*inch)
    lbl(c, "/HR", 7.43*inch, y + 0.06*inch)
    y -= 0.4*inch

    lbl(c, "Position Applied For:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "position", 1.75*inch, y, 2.5*inch)
    lbl(c, "Certifications:", 4.38*inch, y + 0.06*inch)
    lbl(c, "CNA", 5.28*inch, y + 0.06*inch);        chk(acro, "cert_cna", 5.5*inch, y)
    lbl(c, "CPR/First Aid", 5.72*inch, y + 0.06*inch); chk(acro, "cert_cpr", 6.52*inch, y)
    lbl(c, "RN", 6.72*inch, y + 0.06*inch);         chk(acro, "cert_rn",  6.9*inch,  y)
    lbl(c, "LPN", 7.1*inch, y + 0.06*inch);         chk(acro, "cert_lpn", 7.3*inch,  y)
    y -= 0.45*inch

    # Yes/No rows
    def yn(q, ny, nn, qx, qy, follow=None, fn=None, fw=1.8*inch):
        lbl(c, q, qx, qy + 0.06*inch)
        lbl(c, "YES", qx + 3.3*inch, qy + 0.06*inch); chk(acro, ny, qx + 3.6*inch, qy)
        lbl(c, "NO",  qx + 3.82*inch, qy + 0.06*inch); chk(acro, nn, qx + 4.08*inch, qy)
        if follow:
            lbl(c, follow, qx + 4.3*inch, qy + 0.06*inch)
            txt_field(acro, fn, qx + 4.3*inch + len(follow)*0.055*inch, qy, fw)

    yn("Are you a citizen of the United States?", "citizen_yes", "citizen_no", 0.65*inch, y)
    # auth to work – right side
    lbl(c, "If no, authorized to work in US?", 5.05*inch, y + 0.06*inch)
    lbl(c, "Yes", 7.0*inch, y + 0.06*inch); chk(acro, "auth_yes", 7.22*inch, y)
    lbl(c, "No",  7.42*inch, y + 0.06*inch); chk(acro, "auth_no",  7.6*inch,  y)
    y -= 0.38*inch

    lbl(c, "Have you ever worked for this company?", 0.65*inch, y + 0.06*inch)
    lbl(c, "YES", 4.0*inch, y + 0.06*inch); chk(acro, "worked_yes", 4.28*inch, y)
    lbl(c, "NO",  4.5*inch, y + 0.06*inch); chk(acro, "worked_no",  4.75*inch, y)
    lbl(c, "If yes, when?", 4.97*inch, y + 0.06*inch)
    txt_field(acro, "worked_when", 5.7*inch, y, 2.2*inch)
    y -= 0.38*inch

    lbl(c, "Have you ever been convicted of a felony?", 0.65*inch, y + 0.06*inch)
    lbl(c, "YES", 4.0*inch, y + 0.06*inch); chk(acro, "felony_yes", 4.28*inch, y)
    lbl(c, "NO",  4.5*inch, y + 0.06*inch); chk(acro, "felony_no",  4.75*inch, y)
    lbl(c, "If yes, explain:", 4.97*inch, y + 0.06*inch)
    txt_field(acro, "felony_explain", 5.85*inch, y, 2.05*inch)
    y -= 0.55*inch

    # Education
    section_bar(c, y, "Education")
    y -= 0.38*inch

    lbl(c, "High School:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "hs_name", 1.4*inch, y, 2.2*inch)
    lbl(c, "Address:", 3.72*inch, y + 0.06*inch)
    txt_field(acro, "hs_address", 4.2*inch, y, 3.7*inch)
    y -= 0.38*inch

    lbl(c, "From:", 0.65*inch, y + 0.06*inch); txt_field(acro, "hs_from", 1.0*inch, y, 0.8*inch)
    lbl(c, "To:",   1.92*inch, y + 0.06*inch); txt_field(acro, "hs_to",   2.15*inch, y, 0.8*inch)
    lbl(c, "Did you graduate?", 3.05*inch, y + 0.06*inch)
    lbl(c, "YES", 4.12*inch, y + 0.06*inch); chk(acro, "hs_grad_yes", 4.37*inch, y)
    lbl(c, "NO",  4.58*inch, y + 0.06*inch); chk(acro, "hs_grad_no",  4.8*inch,  y)
    lbl(c, "Diploma:", 5.0*inch, y + 0.06*inch)
    txt_field(acro, "hs_diploma", 5.47*inch, y, 2.43*inch)
    y -= 0.45*inch

    lbl(c, "College:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "col_name", 1.2*inch, y, 2.4*inch)
    lbl(c, "Address:", 3.72*inch, y + 0.06*inch)
    txt_field(acro, "col_address", 4.2*inch, y, 3.7*inch)
    y -= 0.38*inch

    lbl(c, "From:", 0.65*inch, y + 0.06*inch); txt_field(acro, "col_from", 1.0*inch, y, 0.8*inch)
    lbl(c, "To:",   1.92*inch, y + 0.06*inch); txt_field(acro, "col_to",   2.15*inch, y, 0.8*inch)
    lbl(c, "Did you graduate?", 3.05*inch, y + 0.06*inch)
    lbl(c, "YES", 4.12*inch, y + 0.06*inch); chk(acro, "col_grad_yes", 4.37*inch, y)
    lbl(c, "NO",  4.58*inch, y + 0.06*inch); chk(acro, "col_grad_no",  4.8*inch,  y)
    lbl(c, "Diploma:", 5.0*inch, y + 0.06*inch)
    txt_field(acro, "col_diploma", 5.47*inch, y, 2.43*inch)
    y -= 0.45*inch

    lbl(c, "Other:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "other_school", 1.1*inch, y, 2.5*inch)
    lbl(c, "Address:", 3.72*inch, y + 0.06*inch)
    txt_field(acro, "other_address", 4.2*inch, y, 3.7*inch)
    y -= 0.55*inch

    # References
    section_bar(c, y, "References")
    y -= 0.28*inch
    lbl(c, "Please list three professional references:", 0.65*inch, y)
    y -= 0.32*inch

    for i in range(1, 4):
        lbl(c, "Full Name:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"ref{i}_name", 1.3*inch, y, 3.1*inch)
        lbl(c, "Relationship:", 4.52*inch, y + 0.06*inch)
        txt_field(acro, f"ref{i}_rel", 5.3*inch, y, 2.6*inch)
        y -= 0.36*inch
        lbl(c, "Company:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"ref{i}_company", 1.25*inch, y, 3.1*inch)
        lbl(c, "Phone:", 4.52*inch, y + 0.06*inch)
        txt_field(acro, f"ref{i}_phone", 4.95*inch, y, 2.95*inch)
        y -= 0.36*inch
        lbl(c, "Address:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"ref{i}_address", 1.2*inch, y, 6.7*inch)
        y -= 0.42*inch

    c.showPage()

    # ── PAGE 2 ──────────────────────────────────────────────────
    header(c, 2)
    y = H - 1.45*inch

    for n in range(1, 3):
        section_bar(c, y, f"Previous Employment {n}")
        y -= 0.38*inch

        lbl(c, "Company:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_company", 1.25*inch, y, 3.8*inch)
        lbl(c, "Phone:", 5.18*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_phone", 5.62*inch, y, 2.28*inch)
        y -= 0.38*inch

        lbl(c, "Address:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_address", 1.2*inch, y, 3.8*inch)
        lbl(c, "Supervisor:", 5.18*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_supervisor", 5.9*inch, y, 2.0*inch)
        y -= 0.38*inch

        lbl(c, "Job Title:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_title", 1.2*inch, y, 2.8*inch)
        lbl(c, "Starting Salary:", 4.12*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_start_sal", 5.05*inch, y, 1.0*inch)
        lbl(c, "Ending Salary:", 6.2*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_end_sal", 7.05*inch, y, 0.85*inch)
        y -= 0.38*inch

        lbl(c, "Responsibilities:", 0.65*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_resp", 1.6*inch, y, 6.3*inch)
        y -= 0.38*inch

        lbl(c, "From:", 0.65*inch, y + 0.06*inch); txt_field(acro, f"emp{n}_from", 1.0*inch, y, 0.9*inch)
        lbl(c, "To:",   2.02*inch, y + 0.06*inch); txt_field(acro, f"emp{n}_to",   2.25*inch, y, 0.9*inch)
        lbl(c, "Reason for Leaving:", 3.28*inch, y + 0.06*inch)
        txt_field(acro, f"emp{n}_reason", 4.45*inch, y, 3.45*inch)
        y -= 0.38*inch

        lbl(c, "May we contact your previous supervisor for a reference?", 0.65*inch, y + 0.06*inch)
        lbl(c, "YES", 4.88*inch, y + 0.06*inch); chk(acro, f"emp{n}_contact_yes", 5.15*inch, y)
        lbl(c, "NO",  5.35*inch, y + 0.06*inch); chk(acro, f"emp{n}_contact_no",  5.58*inch, y)
        y -= 0.6*inch

    # Disclaimer & Signature
    section_bar(c, y, "Disclaimer and Signature")
    y -= 0.35*inch

    c.setFont("Helvetica-Oblique", 8.5)
    lines = [
        "I certify that my answers are true and complete to the best of my knowledge.",
        "If this application leads to employment, I understand that false or misleading information in my",
        "application or interview may result in my release.",
    ]
    for line in lines:
        c.drawString(0.65*inch, y, line)
        y -= 0.22*inch
    y -= 0.18*inch

    lbl(c, "Signature:", 0.65*inch, y + 0.06*inch)
    txt_field(acro, "signature", 1.3*inch, y, 4.2*inch)
    lbl(c, "Date:", 5.65*inch, y + 0.06*inch)
    txt_field(acro, "sig_date", 6.05*inch, y, 1.85*inch)

    c.save()
    print("PDF created successfully.")


make_pdf(r"C:\Users\ariwo\Downloads\employment-application.pdf")
