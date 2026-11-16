"""
Genera el PDF con las fichas FreireBot 2026 para todos los alumnos:
- Tamaño ideal A4: 8 fichas por hoja (2 columnas x 4 filas), ~9.5 cm x 6.3 cm
- Máxima calidad y legibilidad para imprimir y recortar sin perder la tarjeta
- Nombre completo del alumno centrado en la línea de Usuario
- Nombre de usuario único (3 letras nombre + 3 apellido) junto al rótulo "Usuario:"
- PIN secreto de 4 dígitos en números grandes y espaciados centrado en la línea de PIN
- Guías punteadas de corte y pie de ficha identificatorio
- Organizado por Grado y Grupo (cada grupo inicia en página nueva)
"""
import json
import os
import shutil
from collections import OrderedDict

import pymupdf
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_PATH = os.path.join(BASE_DIR, 'img', 'ficha_freirebot.jpg')
JSON_PATH = os.path.join(BASE_DIR, 'alumnos_robotica_2026.json')
OUT_PDF_PAGINA = os.path.join(BASE_DIR, 'fichas_freirebot_2026.pdf')
OUT_PDF_ADMIN = os.path.join(os.path.dirname(BASE_DIR), 'pagina-admin', 'fichas_freirebot_2026.pdf')
PREVIEW_PNG = r'C:\Users\Admin\.gemini\antigravity\brain\70bb4172-33f2-45a1-95b3-ec2830a765c8\vista_previa_fichas_a4.png'

# Registrar fuentes TTF estándar de Windows
pdfmetrics.registerFont(TTFont('ArialBold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))

# Geometría de la página A4 (595.28 x 841.89 pt)
PAGE_W, PAGE_H = A4
COLS, ROWS = 2, 4
PER_PAGE = COLS * ROWS

# Tarjeta a tamaño máximo dentro de A4 manteniendo proporción 1024 x 682
CARD_W = 270.0                          # ~95.3 mm de ancho
CARD_H = CARD_W * 682.0 / 1024.0        # ~63.5 mm de alto (~179.8 pt)
SCALE = CARD_W / 1024.0                 # factor de escala ~0.26367

GAP_X = 16.0
GAP_Y = 18.0
MARGIN_X = (PAGE_W - (COLS * CARD_W + (COLS - 1) * GAP_X)) / 2.0  # ~19.6 pt (~7 mm)
TOP_ROW_Y = PAGE_H - 44.0

# Paleta de colores institucionales
COLOR_DARK_GREEN = (12 / 255.0, 74 / 255.0, 42 / 255.0)    # Verde oscuro colegio
COLOR_USER = (18 / 255.0, 100 / 255.0, 55 / 255.0)         # Verde medio institucional
COLOR_CUT = (0.75, 0.75, 0.75)                             # Guía de corte gris suave
COLOR_HEADER_SUB = (0.42, 0.42, 0.42)


def main():
    if not os.path.exists(IMG_PATH):
        raise FileNotFoundError(f'No se encontró la plantilla de imagen: {IMG_PATH}')
    if not os.path.exists(JSON_PATH):
        raise FileNotFoundError(f'No se encontró la base de datos de alumnos: {JSON_PATH}')

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        alumnos = json.load(f)

    # Agrupar alumnos preservando el orden pedagógico (5 Años -> 6° Primaria)
    grupos = OrderedDict()
    for a in alumnos:
        key = (a['grade'], a['group'])
        grupos.setdefault(key, []).append(a)

    img = ImageReader(IMG_PATH)
    c = canvas.Canvas(OUT_PDF_PAGINA, pagesize=A4)
    c.setTitle('Fichas de Acceso FreireBot 2026 - Colegio Paulo Freire')
    c.setAuthor('Taller de Robótica y Programación - Colegio Paulo Freire')
    c.setSubject('Credenciales de Alumnos con Usuario y PIN Secreto')

    total_fichas = 0
    total_paginas = 0

    for (grado, grupo), lista in grupos.items():
        total_in_group = len(lista)
        group_pages = -(-total_in_group // PER_PAGE)

        for page_idx in range(group_pages):
            total_paginas += 1
            chunk = lista[page_idx * PER_PAGE : (page_idx + 1) * PER_PAGE]

            # Encabezado superior de la página
            c.setFillColorRGB(*COLOR_DARK_GREEN)
            c.setFont('ArialBold', 11)
            c.drawString(MARGIN_X, PAGE_H - 24, f'FreireBot 2026  ·  {grado}  ·  Grupo {grupo}')

            c.setFont('Arial', 8)
            c.setFillColorRGB(*COLOR_HEADER_SUB)
            c.drawRightString(
                PAGE_W - MARGIN_X,
                PAGE_H - 24,
                f'{total_in_group} alumnos  ·  Página {page_idx + 1} de {group_pages}  (8 fichas / hoja A4)'
            )

            for i, al in enumerate(chunk):
                col = i % COLS
                row = i // COLS
                x0 = MARGIN_X + col * (CARD_W + GAP_X)
                y0 = TOP_ROW_Y - (row + 1) * CARD_H - row * GAP_Y

                # 1. Dibujar plantilla base de la ficha
                c.drawImage(img, x0, y0, width=CARD_W, height=CARD_H)

                # 2. Nombre de usuario al lado del rótulo "Usuario:"
                c.setFillColorRGB(*COLOR_USER)
                c.setFont('ArialBold', 32.0 * SCALE)
                c.drawString(x0 + 475.0 * SCALE, y0 + (682.0 - 310.0) * SCALE, str(al['username']))

                # 3. Nombre completo del alumno centrado sobre la línea 1
                c.setFillColorRGB(*COLOR_DARK_GREEN)
                name = str(al['name'])
                line1_x0 = x0 + 356.0 * SCALE
                line1_w = 315.0 * SCALE
                max_name_w = line1_w - 6.0
                name_size = 32.0 * SCALE
                while name_size > 5.0 and stringWidth(name, 'ArialBold', name_size) > max_name_w:
                    name_size -= 0.2
                c.setFont('ArialBold', name_size)
                w_name = stringWidth(name, 'ArialBold', name_size)
                name_x = line1_x0 + (line1_w - w_name) / 2.0
                c.drawString(name_x, y0 + (682.0 - 349.0) * SCALE, name)

                # 4. PIN de 4 dígitos centrado sobre la línea 2 (números grandes y espaciados)
                pin_str = '  '.join(list(str(al['password'])))
                line2_x0 = x0 + 357.0 * SCALE
                line2_w = 380.0 * SCALE
                pin_size = 42.0 * SCALE
                c.setFont('ArialBold', pin_size)
                w_pin = stringWidth(pin_str, 'ArialBold', pin_size)
                pin_x = line2_x0 + (line2_w - w_pin) / 2.0
                c.drawString(pin_x, y0 + (682.0 - 466.0) * SCALE, pin_str)

                # 5. Guía de corte punteada exterior
                c.setStrokeColorRGB(*COLOR_CUT)
                c.setLineWidth(0.4)
                c.setDash(2.5, 2.5)
                c.rect(x0 - 1.5, y0 - 1.5, CARD_W + 3.0, CARD_H + 3.0, stroke=1, fill=0)
                c.setDash()

                # 6. Pie identificatorio debajo de la tarjeta (para recortar y archivar fácilmente)
                c.setFillColorRGB(0.28, 0.28, 0.28)
                c.setFont('ArialBold', 7.5)
                c.drawString(x0, y0 - 11, f"{al['name']}  ·  Usuario: {al['username']}")
                c.setFont('Arial', 7)
                c.setFillColorRGB(0.48, 0.48, 0.48)
                c.drawRightString(x0 + CARD_W, y0 - 11, f"{al['grade']} · {al['group']}")

                total_fichas += 1

            c.showPage()

    c.save()
    print(f'[OK] PDF generado con éxito en: {OUT_PDF_PAGINA}')
    print(f'[INFO] Total de fichas: {total_fichas} | Total de páginas: {total_paginas}')

    # Copiar también al panel admin si existe la carpeta
    if os.path.exists(os.path.dirname(OUT_PDF_ADMIN)):
        shutil.copy2(OUT_PDF_PAGINA, OUT_PDF_ADMIN)
        print(f'[OK] PDF copiado a panel admin: {OUT_PDF_ADMIN}')

    # Renderizar vista previa de la página 1 en alta resolución
    try:
        doc = pymupdf.open(OUT_PDF_PAGINA)
        pix = doc[0].get_pixmap(dpi=150)
        pix.save(PREVIEW_PNG)
        print(f'[OK] Vista previa de página 1 guardada en: {PREVIEW_PNG}')
    except Exception as e:
        print(f'[AVISO] No se pudo generar la vista previa: {e}')


if __name__ == '__main__':
    main()
