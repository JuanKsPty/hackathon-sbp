#!/usr/bin/env python3
"""Genera presentacion/deck.pptx (16:9, 15 láminas, con notas del orador).

    python3 -m venv .venv && .venv/bin/pip install -r presentacion/requirements.txt
    .venv/bin/python presentacion/generar_deck.py            # escribe presentacion/deck.pptx

Reglas del contenido (issue #71):
- Ninguna cifra de resultados (saldos, posiciones, ganadores). Solo números del documento del
  reto (25,000 / 27,500 / 30,000 filas, 12 bancos, 6 rankings, 22 subactividades) y cifras
  verificables en el repo, que están en el bloque CIFRAS de abajo.
- Los fondos y el logo salen de presentacion/assets/ (hechos con Higgsfield).
- Las tres plantillas (portada, sección y contenido) son diseños del archivo: el fondo vive en
  el diseño y el título es un marcador de posición, así que se pueden editar en PowerPoint.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls, qn
from pptx.util import Emu, Inches, Pt

AQUI = Path(__file__).resolve().parent
ASSETS = AQUI / "assets"
SALIDA = AQUI / "deck.pptx"

# ---------------------------------------------------------------------------------------------
# Cifras verificadas. Se midieron el 2026-11-27 con `cd server && npm test`, `cd client && npm test`
# y `cd server && npm run test:cobertura`. Si cambian, se actualizan aquí y se vuelve a generar.
# ---------------------------------------------------------------------------------------------
CIFRAS = {
    "pruebas_server": "353",
    "pruebas_client": "43",
    "cobertura_lineas": "96 %",
    "cobertura_ramas": "91 %",
    "cobertura_funciones": "96 %",
    "casos_eval_agente": "18",
}
URL_PUBLICA = "https://sbp.juank.tech"
URL_INTERNA = "https://interno.sbp.juank.tech"
URL_REPO = "github.com/JuanKsPty/hackathon-sbp"
AVISO = "Datos ficticios · Uso informativo, no opinión formal de la SBP"

# Paleta D (la misma de la app y de los fondos de Higgsfield).
INDIGO = "211E75"
INDIGO2 = "2E2B86"
ORO = "D2B26A"
ORO_TEXTO = "7A5C12"  # oro oscuro: el texto sobre fondo claro necesita contraste
TEXTO = "1E1E3C"
APAGADO = "4A4A68"
LAVANDA = "F3F1FB"
BORDE = "D5D1EC"
PALIDO = "E6E3F8"
BLANCO = "FFFFFF"

FUENTE = "Arial"
ANCHO, ALTO = 13.333, 7.5


def rgb(hex6: str) -> RGBColor:
    return RGBColor.from_string(hex6)


# ---------------------------------------------------------------------------------------------
# Estimación de texto (aviso temprano de desbordes). Es opcional: si no hay Arial, no hace nada.
# La revisión de verdad es mirar el deck convertido a imagen (ver README).
# ---------------------------------------------------------------------------------------------
_RUTAS_FUENTE = {
    False: [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ],
    True: [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ],
}
_cache_fuentes: dict = {}
AVISOS: list[str] = []


def _fuente(pt: float, negrita: bool):
    clave = (round(pt * 10), negrita)
    if clave not in _cache_fuentes:
        _cache_fuentes[clave] = None
        try:
            from PIL import ImageFont

            for ruta in _RUTAS_FUENTE[negrita]:
                if Path(ruta).exists():
                    _cache_fuentes[clave] = ImageFont.truetype(ruta, size=clave[0])
                    break
        except Exception:  # noqa: BLE001 - la estimación nunca debe romper la generación
            pass
    return _cache_fuentes[clave]


def _lineas(texto: str, pt: float, negrita: bool, ancho_pt: float) -> int:
    """Líneas que ocupa un párrafo (con **negritas**) en un ancho dado."""
    palabras = []
    for i, parte in enumerate(texto.split("**")):
        for palabra in re.findall(r"\S+\s*", parte):
            palabras.append((palabra, negrita or i % 2 == 1))
    lineas, actual = 1, 0.0
    for palabra, neg in palabras:
        f = _fuente(pt, neg)
        if f is None:
            return -1
        w = f.getlength(palabra.rstrip()) / 10
        espacio = f.getlength(palabra) / 10 - w
        if actual > 0 and actual + w > ancho_pt:
            lineas += 1
            actual = 0.0
        actual += w + espacio
    return lineas


def _estimar(parrafos, w, h, margen, etiqueta):
    ancho_pt = (w - 2 * margen) * 72
    alto = 0.0
    for p in parrafos:
        pt = p["size"]
        sangria = 0.28 * 72 if p.get("bullet") else 0
        n = _lineas(p["t"], pt, p["bold"], ancho_pt - sangria)
        if n < 0:
            return
        alto += n * pt * 1.17 + p.get("after", 0)
    if alto > (h - 2 * margen) * 72 + 1:
        AVISOS.append(f"{etiqueta}: el texto necesita {alto / 72:.2f} in y la caja mide {h - 2 * margen:.2f} in")


# ---------------------------------------------------------------------------------------------
# Tema y diseños
# ---------------------------------------------------------------------------------------------
def P(t: str, **kw) -> dict:
    """Un párrafo. Opciones: size, bold, color, bullet, after, align, italic."""
    return {"t": t, **kw}


def aplicar_tema(prs) -> None:
    """Colores y tipografía de la marca en el tema (para que PowerPoint los ofrezca al editar)."""
    maestro = prs.slide_master
    parte = maestro.part.part_related_by(RT.THEME)
    raiz = etree.fromstring(parte.blob)
    a = "http://schemas.openxmlformats.org/drawingml/2006/main"
    raiz.set("name", "Rankings SBP")
    colores = {
        "dk1": TEXTO, "lt1": BLANCO, "dk2": INDIGO, "lt2": LAVANDA,
        "accent1": INDIGO2, "accent2": ORO, "accent3": "1F6F4A", "accent4": "B3261E",
        "accent5": "5B57B8", "accent6": ORO_TEXTO, "hlink": INDIGO2, "folHlink": APAGADO,
    }
    esquema = raiz.find(f".//{{{a}}}clrScheme")
    esquema.set("name", "Paleta D")
    for nombre, valor in colores.items():
        nodo = esquema.find(f"{{{a}}}{nombre}")
        for hijo in list(nodo):
            nodo.remove(hijo)
        etree.SubElement(nodo, f"{{{a}}}srgbClr").set("val", valor)
    fuentes = raiz.find(f".//{{{a}}}fontScheme")
    fuentes.set("name", "Arial")
    for tipo in ("majorFont", "minorFont"):
        fuentes.find(f"{{{a}}}{tipo}/{{{a}}}latin").set("typeface", FUENTE)
    parte._blob = etree.tostring(raiz, xml_declaration=True, encoding="UTF-8", standalone=True)


def _poner_fondo(parte, c_sld, imagen: Path) -> None:
    _, r_id = parte.get_or_add_image_part(str(imagen))
    for viejo in c_sld.findall(qn("p:bg")):
        c_sld.remove(viejo)
    fondo = parse_xml(
        f'<p:bg {nsdecls("p", "a", "r")}><p:bgPr><a:blipFill dpi="0" rotWithShape="1">'
        f'<a:blip r:embed="{r_id}"/><a:srcRect/><a:stretch><a:fillRect/></a:stretch></a:blipFill>'
        "<a:effectLst/></p:bgPr></p:bg>"
    )
    c_sld.insert(0, fondo)


def _estilo_marcador(ph, *, x, y, w, h, size, color, bold, anchor, alinear="l") -> None:
    ph.left, ph.top, ph.width, ph.height = Inches(x), Inches(y), Inches(w), Inches(h)
    cuerpo = ph._element.txBody
    props = cuerpo.find(qn("a:bodyPr"))
    for hijo in list(props):
        props.remove(hijo)
    props.set("anchor", anchor)
    for atributo, valor in (("lIns", "0"), ("tIns", "0"), ("rIns", "0"), ("bIns", "0"), ("wrap", "square")):
        props.set(atributo, valor)
    etree.SubElement(props, qn("a:noAutofit"))
    estilos = cuerpo.find(qn("a:lstStyle"))
    for hijo in list(estilos):
        estilos.remove(hijo)
    nivel = etree.SubElement(estilos, qn("a:lvl1pPr"))
    nivel.set("marL", "0")
    nivel.set("indent", "0")
    nivel.set("algn", alinear)
    etree.SubElement(nivel, qn("a:buNone"))
    pred = etree.SubElement(nivel, qn("a:defRPr"))
    pred.set("sz", str(int(size * 100)))
    pred.set("b", "1" if bold else "0")
    relleno = etree.SubElement(pred, qn("a:solidFill"))
    etree.SubElement(relleno, qn("a:srgbClr")).set("val", color)
    etree.SubElement(pred, qn("a:latin")).set("typeface", FUENTE)


def preparar_diseños(prs) -> dict:
    """Deja tres diseños (portada, sección y contenido) con su fondo y sus marcadores."""
    maestro = prs.slide_master
    for forma in maestro.shapes:  # los marcadores del maestro vienen en 4:3
        forma.left, forma.width = int(forma.left * 4 / 3), int(forma.width * 4 / 3)
    conservar = {0: "Portada", 2: "Sección", 5: "Contenido"}
    todos = list(prs.slide_layouts)
    elegidos = {nombre: todos[i] for i, nombre in conservar.items()}
    for d in todos:
        if d not in elegidos.values():
            prs.slide_layouts.remove(d)
    for nombre, d in elegidos.items():
        d._element.cSld.set("name", nombre)
        for ph in list(d.placeholders):
            if ph.placeholder_format.idx >= 10:  # fecha, pie y número: no se usan
                ph._element.getparent().remove(ph._element)

    portada, seccion, contenido = elegidos["Portada"], elegidos["Sección"], elegidos["Contenido"]
    _poner_fondo(portada.part, portada._element.cSld, ASSETS / "fondo-portada.png")
    _poner_fondo(seccion.part, seccion._element.cSld, ASSETS / "fondo-seccion.png")
    _poner_fondo(contenido.part, contenido._element.cSld, ASSETS / "fondo-contenido.png")

    # Portada: el título va a la izquierda, antes de las barras del fondo.
    _estilo_marcador(portada.placeholders[0], x=0.8, y=2.55, w=7.9, h=1.1, size=50, color=BLANCO, bold=True, anchor="b")
    _estilo_marcador(portada.placeholders[1], x=0.8, y=3.85, w=7.2, h=1.1, size=22, color=PALIDO, bold=False, anchor="t")
    # Sección: título grande y texto de apoyo sobre la franja inferior.
    _estilo_marcador(seccion.placeholders[0], x=0.8, y=0.7, w=11.7, h=1.0, size=48, color=INDIGO, bold=True, anchor="b")
    _estilo_marcador(seccion.placeholders[1], x=0.8, y=1.8, w=11.7, h=0.5, size=20, color=APAGADO, bold=False, anchor="t")
    # Contenido: el título queda sobre la línea dorada del fondo (y = 0.82 in).
    _estilo_marcador(contenido.placeholders[0], x=0.6, y=0.1, w=12.15, h=0.64, size=28, color=INDIGO, bold=True, anchor="b")
    return {"portada": portada, "seccion": seccion, "contenido": contenido}


# ---------------------------------------------------------------------------------------------
# Piezas de dibujo
# ---------------------------------------------------------------------------------------------
_ALINEAR = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}
_ANCLAR = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}


def _runs(parrafo, texto: str, *, size, color, bold, italic) -> None:
    for i, parte in enumerate(texto.split("**")):
        if parte == "":
            continue
        r = parrafo.add_run()
        r.text = parte
        r.font.name = FUENTE
        r.font.size = Pt(size)
        r.font.bold = bold or i % 2 == 1
        r.font.italic = italic
        r.font.color.rgb = rgb(color)


def _viñeta(parrafo, size: float) -> None:
    pPr = parrafo._p.get_or_add_pPr()
    sangria = Inches(0.28)
    pPr.set("marL", str(sangria))
    pPr.set("indent", str(-sangria))
    for tag in ("a:buNone", "a:buChar", "a:buFont"):
        for viejo in pPr.findall(qn(tag)):
            pPr.remove(viejo)
    etree.SubElement(pPr, qn("a:buFont")).set("typeface", "Arial")
    etree.SubElement(pPr, qn("a:buChar")).set("char", "•")


def llenar(tf, parrafos, *, size, color, bold, align, anchor, margen, after) -> list[dict]:
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(margen)
    tf.vertical_anchor = _ANCLAR[anchor]
    norm = []
    for i, p in enumerate(parrafos if isinstance(parrafos, list) else [parrafos]):
        if isinstance(p, str):
            p = P(p)
        d = {
            "t": p["t"],
            "size": p.get("size", size),
            "bold": p.get("bold", bold),
            "color": p.get("color", color),
            "italic": p.get("italic", False),
            "bullet": p.get("bullet", False),
            "after": p.get("after", after),
            "align": p.get("align", align),
        }
        norm.append(d)
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = _ALINEAR[d["align"]]
        para.space_after = Pt(d["after"])
        para.space_before = Pt(0)
        _runs(para, d["t"], size=d["size"], color=d["color"], bold=d["bold"], italic=d["italic"])
        if d["bullet"]:
            _viñeta(para, d["size"])
    return norm


def _sin_estilo(forma) -> None:
    """Quita el estilo del tema (sombras y colores de línea por defecto): todo se define a mano."""
    estilo = forma._element.find(qn("p:style"))
    if estilo is not None:
        forma._element.remove(estilo)


class Lamina:
    """Una lámina en construcción: ayudas de dibujo con coordenadas en pulgadas."""

    def __init__(self, prs, diseño, numero: int, titulo: str, etiqueta: str):
        self.slide = prs.slides.add_slide(diseño)
        self.numero = numero
        self.etiqueta = etiqueta
        self.titulo = titulo
        if self.slide.shapes.title is not None:
            self.slide.shapes.title.text = titulo
            self.slide.shapes.title.name = "Título"

    # -- texto ---------------------------------------------------------------------------
    def texto(self, x, y, w, h, parrafos, *, size=16, color=TEXTO, bold=False, align="l", anchor="t",
              margen=0.0, after=0, nombre="Texto"):
        caja = self.slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        caja.name = nombre
        norm = llenar(caja.text_frame, parrafos, size=size, color=color, bold=bold, align=align,
                      anchor=anchor, margen=margen, after=after)
        _estimar(norm, w, h, margen, f"Lámina {self.numero} · {nombre}")
        return caja

    # -- formas --------------------------------------------------------------------------
    def caja(self, x, y, w, h, *, relleno=LAVANDA, borde=BORDE, radio=0.12, forma=None, grosor=1.0,
             discontinua=False, nombre="Tarjeta"):
        tipo = forma or (MSO_SHAPE.ROUNDED_RECTANGLE if radio else MSO_SHAPE.RECTANGLE)
        s = self.slide.shapes.add_shape(tipo, Inches(x), Inches(y), Inches(w), Inches(h))
        s.name = nombre
        if tipo == MSO_SHAPE.ROUNDED_RECTANGLE:
            s.adjustments[0] = min(0.5, radio / min(w, h))
        if relleno is None:
            s.fill.background()
        else:
            s.fill.solid()
            s.fill.fore_color.rgb = rgb(relleno)
        if borde is None:
            s.line.fill.background()
        else:
            s.line.color.rgb = rgb(borde)
            s.line.width = Pt(grosor)
            if discontinua:
                from pptx.enum.dml import MSO_LINE

                s.line.dash_style = MSO_LINE.DASH
        s.shadow.inherit = False
        _sin_estilo(s)
        return s

    def caja_texto(self, x, y, w, h, parrafos, *, relleno=LAVANDA, borde=BORDE, radio=0.12, size=15,
                   color=TEXTO, bold=False, align="l", anchor="t", margen=0.18, after=4, grosor=1.0,
                   nombre="Tarjeta"):
        s = self.caja(x, y, w, h, relleno=relleno, borde=borde, radio=radio, grosor=grosor, nombre=nombre)
        norm = llenar(s.text_frame, parrafos, size=size, color=color, bold=bold, align=align,
                      anchor=anchor, margen=margen, after=after)
        _estimar(norm, w, h, margen, f"Lámina {self.numero} · {nombre}")
        return s

    def circulo(self, x, y, d, texto, *, relleno=INDIGO, color=BLANCO, size=16, nombre="Número"):
        s = self.caja(x, y, d, d, relleno=relleno, borde=None, forma=MSO_SHAPE.OVAL, nombre=nombre)
        llenar(s.text_frame, texto, size=size, color=color, bold=True, align="c", anchor="m", margen=0, after=0)
        return s

    def flecha(self, x1, y1, x2, y2, *, color=INDIGO, grosor=2.25, doble=False, nombre="Flecha"):
        c = self.slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
        c.name = nombre
        c.line.color.rgb = rgb(color)
        c.line.width = Pt(grosor)
        ln = c.line._get_or_add_ln()
        for extremo in (["headEnd", "tailEnd"] if doble else ["tailEnd"]):
            e = etree.SubElement(ln, qn(f"a:{extremo}"))
            e.set("type", "triangle")
            e.set("w", "med")
            e.set("len", "med")
        _sin_estilo(c)
        return c

    def imagen(self, ruta: Path, x, y, w, h, alt: str):
        pic = self.slide.shapes.add_picture(str(ruta), Inches(x), Inches(y), Inches(w), Inches(h))
        pic._element.nvPicPr.cNvPr.set("descr", alt)
        pic.name = "Logo"
        return pic

    # -- pie y notas --------------------------------------------------------------------
    def pie(self, *, oscuro=False):
        color = PALIDO if oscuro else APAGADO
        self.texto(0.6, 7.08, 11.0, 0.3, f"Rankings de Crédito · Hackathon SBP 2026 · {AVISO}", size=10, color=color,
                   nombre="Pie")
        caja = self.slide.shapes.add_textbox(Inches(12.0), Inches(7.08), Inches(0.75), Inches(0.3))
        caja.name = "Número de lámina"
        tf = caja.text_frame
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.RIGHT
        campo = parse_xml(
            f'<a:fld {nsdecls("a")} id="{{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}}" type="slidenum">'
            f'<a:rPr lang="es-PA" sz="1000"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
            f'<a:latin typeface="{FUENTE}"/></a:rPr><a:t>{self.numero}</a:t></a:fld>'
        )
        p._p.append(campo)

    def notas(self, texto: str):
        self.slide.notes_slide.notes_text_frame.text = texto.strip()


# ---------------------------------------------------------------------------------------------
# Láminas
# ---------------------------------------------------------------------------------------------
def lamina_portada(prs, d):
    L = Lamina(prs, d["portada"], 1, "Rankings de Crédito", "portada")
    L.slide.placeholders[1].text = "Plataforma interactiva de rankings y análisis bancario con datos sintéticos AT03"
    L.slide.placeholders[1].name = "Subtítulo"
    L.imagen(ASSETS / "logo-1024.png", 0.8, 0.75, 1.1, 1.1, "Logo de la app: una escalera dorada en un ícono índigo")
    L.texto(0.8, 2.05, 7.6, 0.4, "HACKATHON SBP 2026", size=18, color=ORO, bold=True, nombre="Evento")
    L.texto(0.8, 5.35, 7.4, 0.45, "Jesús  ·  Juan  ·  Agustín", size=22, color=BLANCO, bold=True, nombre="Equipo")
    L.texto(0.8, 6.65, 7.6, 0.35, AVISO, size=12, color=PALIDO, nombre="Aviso")
    L.notas("""
[Juan · 30 s]
Buenas. Somos Jesús, Agustín y yo, y les presentamos Rankings de Crédito: una app web que toma los archivos sintéticos AT03 de julio, agosto y septiembre de 2026 y arma los rankings de crédito por banco y actividad económica.

Tres cosas para ubicarnos: todo lo que van a ver sale de los archivos, con un motor determinista; la IA solo consulta y explica, nunca calcula; y todos los datos son ficticios, la app lo dice en cada pantalla.

Orden de la presentación: problema y propuesta, arquitectura, demo en vivo de unos 9 minutos, y después las reglas, la automatización, la IA y las decisiones técnicas.
""")
    return L


def lamina_problema(prs, d):
    L = Lamina(prs, d["contenido"], 2, "El problema: consultar el crédito es lento y manual", "problema")
    L.caja_texto(0.6, 1.2, 5.9, 2.85, [
        P("Hoy, para el usuario", size=22, bold=True, color=INDIGO, after=12),
        P("Estadísticas en archivos Excel y PDF", bullet=True),
        P("Exploración interactiva limitada", bullet=True),
        P("Comparar entidades y períodos toma tiempo", bullet=True),
    ], size=18, after=12, margen=0.3, nombre="Situación actual")
    L.caja_texto(6.85, 1.2, 5.9, 2.85, [
        P("En los datos, a propósito", size=22, bold=True, color=INDIGO, after=12),
        P("Duplicados de Numero_Prestamo", bullet=True),
        P("Operaciones extranjeras", bullet=True),
        P("Saldos en cero o negativos", bullet=True),
        P("Actividades fuera del catálogo CINU", bullet=True),
    ], size=18, after=8, margen=0.3, nombre="Casos de calidad")
    # Cifras del documento del reto.
    mosaicos = [
        ("3", "períodos de 2026", 0.6, 2.7),
        ("25,000 · 27,500 · 30,000", "filas por período", 3.5, 4.55),
        ("61", "campos AT03", 8.2, 2.1),
        ("12", "bancos ficticios", 10.5, 2.25),
    ]
    for numero, etiqueta, x, w in mosaicos:
        L.caja(x, 4.4, w, 1.5, relleno=BLANCO, borde=BORDE, nombre="Cifra")
        L.texto(x + 0.1, 4.55, w - 0.2, 0.7, numero, size=30 if len(numero) < 10 else 26, bold=True, color=INDIGO,
                align="c", anchor="m", nombre="Cifra grande")
        L.texto(x + 0.1, 5.3, w - 0.2, 0.5, etiqueta, size=14, color=APAGADO, align="c", anchor="t", nombre="Cifra etiqueta")
    L.texto(0.6, 6.2, 12.15, 0.55,
            "Hace falta calcular con reglas explícitas, comparar entre períodos y explicar cada resultado.",
            size=19, bold=True, color=INDIGO, anchor="m", nombre="Mensaje")
    L.pie()
    L.notas("""
[Juan · 40 s]
Hoy la información se consulta sobre todo en archivos Excel y PDF: se puede leer, pero explorar y comparar entre bancos y entre meses es lento.

Y los datos no son limpios a propósito. Cada período trae duplicados, operaciones extranjeras, saldos en cero o negativos y códigos de actividad que no están en el catálogo. Los archivos tienen 25,000, 27,500 y 30,000 filas, 61 campos, y 12 bancos ficticios.

Si cada quien limpia y suma a su manera, el ranking cambia. Por eso lo que necesitamos son reglas explícitas, auditables y repetibles, y poder comparar y explicar los cambios.

(Las cifras de esta lámina son las del documento del reto, sección 2.)
""")
    return L


def lamina_propuesta(prs, d):
    L = Lamina(prs, d["contenido"], 3, "La propuesta: calcular, comparar, explicar y verificar", "propuesta")
    columnas = [
        ("1", "Calcular", "Un motor determinista arma los rankings desde los archivos, sin cifras escritas a mano."),
        ("2", "Comparar", "Movimientos de posición entre períodos, con una regla configurable."),
        ("3", "Explicar", "La IA consulta y redacta, con un verificador de números. Nunca calcula."),
        ("4", "Verificar", "Un modo del jurado muestra los 6 puntos de la sección 11.1 con un clic."),
    ]
    ancho, hueco = 2.85, 0.25
    for i, (n, titulo, texto) in enumerate(columnas):
        x = 0.6 + i * (ancho + hueco)
        L.caja(x, 1.2, ancho, 2.95, nombre=f"Tarjeta {titulo}")
        L.circulo(x + 0.25, 1.4, 0.55, n, size=20, nombre=f"Número {n}")
        L.texto(x + 0.25, 2.1, ancho - 0.5, 0.45, titulo, size=22, bold=True, color=INDIGO, nombre=f"Título {titulo}")
        L.texto(x + 0.25, 2.65, ancho - 0.5, 1.45, texto, size=16, nombre=f"Texto {titulo}")
    cifras = [("12", "bancos"), ("6", "rankings"), ("22", "subactividades"), ("3", "perfiles")]
    ancho_c = 2.85
    for i, (n, etiqueta) in enumerate(cifras):
        x = 0.6 + i * (ancho_c + hueco)
        L.caja(x, 4.45, ancho_c, 1.4, relleno=INDIGO, borde=None, nombre="Cifra")
        L.texto(x, 4.55, ancho_c, 0.75, n, size=40, bold=True, color=ORO, align="c", anchor="m", nombre="Cifra grande")
        L.texto(x, 5.3, ancho_c, 0.4, etiqueta, size=17, color=BLANCO, align="c", nombre="Cifra etiqueta")
    L.texto(0.6, 6.15, 12.15, 0.7, [
        P(f"App web que corre en local (React + Node.js) y también está publicada en **{URL_PUBLICA}**"),
    ], size=17, color=TEXTO, anchor="m", nombre="Mensaje")
    L.pie()
    L.notas(f"""
[Juan · 40 s]
La propuesta se resume en cuatro verbos.

Calcular: el motor lee los archivos y arma los 6 rankings de los 12 bancos. No hay saldos ni posiciones escritos en el código (R2).
Comparar: entre períodos consecutivos, con una regla de movimiento significativo que se configura.
Explicar: la IA consulta y redacta, pero un verificador comprueba que cada número exista en la respuesta del motor.
Verificar: un Modo verificación pensado para el jurado, con los seis puntos de la sección 11.1.

Las cifras de abajo son las del reto: 12 bancos, 6 rankings, 22 subactividades; y 3 perfiles. Corre en local, como pide la lámina 7 del reto, y además la publicamos en {URL_PUBLICA}.
""")
    return L


def lamina_criterios(prs, d):
    L = Lamina(prs, d["contenido"], 4, "Cómo cumplimos cada criterio de la sección 11", "criterios")
    filas = [
        ("1. Exactitud de datos y rankings", "25", "Calidad E1–E4, rankings, regla SB21 y reconciliaciones; Modo verificación"),
        ("2. Funcionalidad de la plataforma", "15", "Panel, Rankings, Comparar, Reportes y 3 perfiles con menú propio"),
        ("3. Automatización y comparación", "15", "Cargar un período y recalcular, regla configurable, explicación y correo con Zapier"),
        ("4. Usabilidad y experiencia", "15", "Fuente, período y aviso de datos ficticios siempre visibles; errores claros"),
        ("5. Calidad técnica", "10", "React + Node.js, login y 403 por perfil, pruebas con node:test, CI y README"),
        ("6. Innovación", "10", "Morosidad, concentración y vencimientos; cursor guía; MCP remoto; PWA"),
        ("7. Presentación y demostración", "10", "Demo en vivo, guion de la demo y todos explican el código"),
    ]
    y, alto, hueco = 1.15, 0.6, 0.07
    L.texto(0.75, y, 4.3, 0.3, "Criterio", size=13, bold=True, color=APAGADO, nombre="Cabecera criterio")
    L.texto(5.15, y, 0.8, 0.3, "Puntos", size=13, bold=True, color=APAGADO, align="c", nombre="Cabecera puntos")
    L.texto(6.3, y, 6.3, 0.3, "Dónde se ve", size=13, bold=True, color=APAGADO, nombre="Cabecera evidencia")
    y += 0.36
    for criterio, puntos, evidencia in filas:
        L.caja(0.6, y, 12.15, alto, nombre="Fila")
        L.texto(0.75, y, 4.35, alto, criterio, size=15, bold=True, color=INDIGO, anchor="m", nombre="Criterio")
        L.texto(5.15, y, 0.8, alto, puntos, size=20, bold=True, color=ORO_TEXTO, align="c", anchor="m", nombre="Puntos")
        L.texto(6.3, y, 6.3, alto, evidencia, size=14, anchor="m", nombre="Evidencia")
        y += alto + hueco
    L.texto(0.6, y + 0.02, 12.15, 0.5,
            "Total: 100 puntos. Requisitos mínimos R1 a R6 cubiertos: ejecución local, cálculo desde archivos, "
            "catálogos, README, sin credenciales y todos explican el código.",
            size=14, color=APAGADO, anchor="t", nombre="Requisitos")
    L.pie()
    L.notas("""
[Juan · 40 s]
Esta lámina es nuestro mapa contra la planilla del jurado: los mismos siete criterios y sus puntos, y dónde se ve cada uno.

Lo más pesado es la exactitud, 25 puntos: por eso hicimos una página de Calidad con E1 a E4 y las reconciliaciones, y un Modo verificación que muestra un dato de cada uno de los seis puntos de la sección 11.1.

En funcionalidad están los módulos de la lámina 5 del reto y los tres perfiles. En automatización, la carga de un período nuevo y la comparación. En calidad técnica, pruebas, CI, el login del sitio interno y el control de acceso por perfil en el servidor.

Abajo, los requisitos mínimos R1 a R6: se ejecuta local, los rankings salen de los archivos, la clasificación usa solo los catálogos, el README está, no hay credenciales en el repositorio, y los tres explicamos el código.
""")
    return L


def lamina_arquitectura(prs, d):
    L = Lamina(prs, d["contenido"], 5, "Arquitectura: dos sitios, un server y un motor puro", "arquitectura")
    # Docker Compose / Dokploy envuelve los dos sitios (nginx) y el server.
    L.caja(2.15, 1.2, 8.5, 4.45, relleno=None, borde=ORO_TEXTO, radio=0.18, discontinua=True, grosor=1.5,
           nombre="Docker Compose en Dokploy")
    L.texto(2.35, 1.27, 3.2, 0.3, "Docker Compose en Dokploy", size=13, bold=True, color=ORO_TEXTO, nombre="Etiqueta Docker")
    L.texto(5.2, 1.27, 5.25, 0.3, "El mismo código React 19 + Vite genera los dos sitios", size=12, color=APAGADO,
            align="r", nombre="Etiqueta código")
    # Navegador
    L.caja_texto(0.6, 2.2, 1.45, 2.55, [P("Navegador", bold=True, size=15, align="c", after=2),
                                         P("PWA instalable", size=13, align="c")],
                 relleno=INDIGO2, borde=None, color=BLANCO, anchor="m", margen=0.1, nombre="Navegador")
    L.flecha(2.05, 2.5, 2.4, 2.5, nombre="Navegador a sitio público")
    L.flecha(2.05, 4.45, 2.4, 4.45, nombre="Navegador a sitio interno")
    # Sitio público e interno (cada uno con su nginx)
    L.caja_texto(2.4, 1.65, 2.55, 1.7, [
        P("Sitio público", size=17, bold=True, color=INDIGO, after=3),
        P("sbp.juank.tech", size=13, bold=True, after=3),
        P("Sin login: siempre Público", size=12, after=2),
        P("nginx: solo rutas públicas", size=12),
    ], relleno=LAVANDA, borde=INDIGO2, grosor=1.5, anchor="m", margen=0.14, nombre="Sitio público")
    L.caja_texto(2.4, 3.6, 2.55, 1.7, [
        P("Sitio interno", size=17, bold=True, color=INDIGO, after=3),
        P("interno.sbp.juank.tech", size=12.5, bold=True, after=3),
        P("Login: Analista y Admin", size=12, after=2),
        P("nginx: todo el API", size=12),
    ], relleno=LAVANDA, borde=INDIGO2, grosor=1.5, anchor="m", margen=0.14, nombre="Sitio interno")
    L.texto(4.95, 2.1, 1.5, 0.3, "/api", size=13, bold=True, color=INDIGO, align="c", nombre="Etiqueta api público")
    L.flecha(4.95, 2.5, 6.45, 2.5, doble=True, nombre="sitio público a server")
    L.texto(4.95, 2.58, 1.5, 0.3, "X-Sitio: publico", size=11, color=APAGADO, align="c", nombre="Etiqueta sitio público")
    L.texto(4.95, 4.05, 1.5, 0.3, "/api", size=13, bold=True, color=INDIGO, align="c", nombre="Etiqueta api interno")
    L.flecha(4.95, 4.45, 6.45, 4.45, doble=True, nombre="sitio interno a server")
    L.texto(4.95, 4.53, 1.5, 0.5, ["X-Sitio: interno", "y cookie de sesión"], size=11, color=APAGADO, align="c",
            nombre="Etiqueta sitio interno")
    # server
    L.caja(6.45, 1.65, 4.0, 3.85, relleno=LAVANDA, borde=INDIGO2, grosor=1.5, nombre="server")
    L.texto(6.65, 1.75, 3.6, 0.4, "server · Node.js + Express", size=17, bold=True, color=INDIGO, nombre="Título server")
    L.caja_texto(6.65, 2.25, 3.6, 0.85, "API: consulta, sesión, perfiles (403), bitácora y carga de períodos",
                 relleno=BLANCO, size=13, anchor="m", margen=0.12, nombre="API")
    L.caja_texto(6.65, 3.2, 3.6, 1.05, [P("Motor determinista", bold=True, size=15, color=BLANCO, after=2),
                                         P("E1–E4, CINU, SB21, rankings, reconciliaciones", size=13, color=BLANCO)],
                 relleno=INDIGO, borde=None, anchor="m", margen=0.14, nombre="Motor")
    L.caja_texto(6.65, 4.4, 1.7, 0.95, [P("data/", bold=True, size=14, after=1), P("CSV AT03 y catálogos", size=12)],
                 relleno=BLANCO, anchor="m", margen=0.1, nombre="data")
    L.caja_texto(8.45, 4.4, 1.8, 0.95, [P("storage/", bold=True, size=14, after=1), P("períodos, bitácora", size=12)],
                 relleno=BLANCO, anchor="m", margen=0.1, nombre="storage")
    # Servicios externos: (y de la caja, título, subtítulo, sentido de la flecha)
    externos = [
        (1.55, "IA · Claude", "consulta y explica", "sale"),
        (2.6, "Zapier", "alertas por correo", "sale"),
        (3.65, "Cliente MCP", "Claude, de solo lectura", "entra"),
        (4.7, "Supabase", "usuarios del interno", "ambos"),
    ]
    for y, titulo, sub, sentido in externos:
        L.caja_texto(11.2, y, 1.55, 0.9, [P(titulo, bold=True, size=14, align="c", after=1), P(sub, size=11, align="c")],
                     relleno=BLANCO, borde=ORO_TEXTO, anchor="m", margen=0.06, nombre=titulo)
        ymid = y + 0.45
        if sentido == "entra":
            L.flecha(11.2, ymid, 10.45, ymid, color=ORO_TEXTO, nombre=f"{titulo} a server")
        elif sentido == "ambos":
            L.flecha(10.45, ymid, 11.2, ymid, color=ORO_TEXTO, doble=True, nombre=f"server y {titulo}")
        else:
            L.flecha(10.45, ymid, 11.2, ymid, color=ORO_TEXTO, nombre=f"server a {titulo}")
    # Cinta inferior
    chips = [
        ("Local (R1)", "npm run dev: API y los dos sitios"),
        ("Docker Compose", "3 servicios y el volumen sbp-storage"),
        ("Dokploy", "se redespliega con cada push a main"),
    ]
    for i, (t, s) in enumerate(chips):
        x = 0.6 + i * 4.1
        L.caja_texto(x, 5.95, 3.95, 0.9, [P(t, bold=True, size=15, color=INDIGO, after=1), P(s, size=14)],
                     relleno=BLANCO, anchor="m", margen=0.16, nombre=f"Chip {t}")
    L.pie()
    L.notas(f"""
[Juan: sitios, Docker y Dokploy · 40 s. Jesús: server y motor · 25 s]
Juan: el navegador habla con dos sitios que salen del mismo código React con Vite, shadcn/ui, Tailwind y Recharts. El sitio público, {URL_PUBLICA}, no pide login y siempre es perfil Público. El sitio interno, {URL_INTERNA}, es para Analista y Administrador y pide iniciar sesión. Cada sitio tiene su nginx, que pasa /api al server y le avisa de qué sitio viene con el header X-Sitio: el público solo deja pasar las rutas públicas y descarta cookies; el interno pasa todo el API.

Jesús: el server es Node.js con Express. Adentro está el motor, que es JavaScript puro: recibe los textos de los CSV y devuelve objetos, sin Express ni disco. Eso lo hace determinista y fácil de probar. Los datos del reto siguen siendo archivos: los CSV viven en data/ y lo que se carga, la bitácora y los parámetros, en storage/. El perfil lo decide el server con X-Sitio: en el público siempre es Público; en el interno sale de la sesión, una cookie HttpOnly firmada, o de un token Bearer si es un cliente MCP. Solo los usuarios del interno están en Postgres, en Supabase, con respaldo en la variable USUARIOS del .env para una demo sin internet.

Juan: la lámina 7 del reto pide que funcione en local, y así es: npm run dev levanta todo, la API y los dos sitios (R1). Además hay un docker-compose con tres servicios, el server y los dos sitios, y un volumen, que se despliega en Dokploy con cada push a main. A los lados, los servicios externos: la IA con Claude, Zapier para los correos, un cliente MCP para consultar desde Claude y Supabase para los usuarios. Si la IA o Zapier no están, la app sigue funcionando; sin Supabase entra el respaldo local.
""")
    return L


def lamina_demo(prs, d):
    L = Lamina(prs, d["seccion"], 6, "Demo en vivo", "demo")
    L.slide.placeholders[1].text = "Local (R1), con julio y agosto cargados. Septiembre se carga en vivo."
    L.slide.placeholders[1].name = "Subtítulo"
    pasos = [
        ("Perfiles y login", "Sitio público y sitio interno"),
        ("Cargar septiembre", "De julio y agosto a tres períodos"),
        ("Panel", "Líderes, movimientos e indicadores"),
        ("Rankings", "Filtros, gráfico y regla SB21"),
        ("Calidad", "E1–E4 y reconciliaciones"),
        ("Comparar", "Posiciones, descomposición y 2 bancos"),
        ("Modo verificación", "Los 6 puntos de la sección 11.1"),
        ("Asistente IA", "Una pregunta y el cursor guía"),
        ("Reportes", "Descargas de los entregables"),
    ]
    ancho, alto, hx, hy = 3.85, 1.15, 0.3, 0.15
    for i, (titulo, sub) in enumerate(pasos):
        fila, col = divmod(i, 3)
        x = 0.8 + col * (ancho + hx)
        y = 2.4 + fila * (alto + hy)
        L.caja(x, y, ancho, alto, relleno=BLANCO, borde=BORDE, nombre=f"Paso {i + 1}")
        L.circulo(x + 0.18, y + (alto - 0.56) / 2, 0.56, str(i + 1), size=18, nombre=f"Número {i + 1}")
        L.texto(x + 0.9, y + 0.1, ancho - 1.05, 0.38, titulo, size=17, bold=True, color=INDIGO, nombre="Paso título")
        L.texto(x + 0.9, y + 0.5, ancho - 1.05, 0.6, sub, size=14, color=APAGADO, nombre="Paso detalle")
    L.notas("""
[Todos · 9 a 10 min. El guion con los clics exactos está en presentacion/guion.md]
Aquí pasamos al navegador. Antes de esta lámina, la app ya está corriendo en local con solo julio y agosto cargados (R1).

Orden: perfiles, con el sitio público y el sitio interno con login; cargar septiembre en el interno y ver cómo cambian los rankings; Panel; Rankings con filtros y gráfico; Calidad; Comparar; Modo verificación; Asistente IA con el cursor guía; y Reportes con las descargas.

Plan B si falla la red o la IA: seguimos en local y usamos las exportaciones CSV (guion, sección Plan B).
""")
    return L


def lamina_reglas1(prs, d):
    L = Lamina(prs, d["contenido"], 7, "Motor: cascada de exclusiones E1 a E4", "reglas 1")
    etapas = [
        ("Filas", "leídas", "Todas las del período, según el campo Fecha", INDIGO, BLANCO),
        ("E1", "Duplicados", "Se conserva la primera ocurrencia", LAVANDA, TEXTO),
        ("E2", "Extranjero", "Se excluye Destino distinto de L", LAVANDA, TEXTO),
        ("E3", "Saldo", "Se excluye Saldo menor o igual a 0", LAVANDA, TEXTO),
        ("E4", "Actividad", "Se excluye lo que no está en el CINU", LAVANDA, TEXTO),
        ("Universo", "local válido", "La base de los rankings", INDIGO, BLANCO),
    ]
    ancho, hueco = 1.83, 0.234
    for i, (marca, titulo, texto, relleno, color) in enumerate(etapas):
        x = 0.6 + i * (ancho + hueco)
        oscuro = relleno == INDIGO
        L.caja_texto(x, 1.25, ancho, 2.45, [P(marca, bold=True, size=24, color=ORO if oscuro else INDIGO, after=1),
                                             P(titulo, bold=True, size=15, color=color, after=8),
                                             P(texto, size=14, color=color)],
                     relleno=relleno, borde=None if oscuro else BORDE, margen=0.15, nombre=f"Etapa {i + 1}")
        if i < len(etapas) - 1:
            L.flecha(x + ancho + 0.02, 2.45, x + ancho + hueco - 0.02, 2.45, nombre="Flecha etapa")
    L.caja_texto(0.6, 3.95, 12.15, 1.2, [
        P("filas leídas = E1 + E2 + E3 + E4 + universo local válido", size=24, bold=True, color=INDIGO, align="c", after=4),
        P("Cada fila cuenta una sola vez, en el primer filtro que incumple.", size=16, align="c", color=APAGADO),
    ], relleno=BLANCO, borde=ORO_TEXTO, grosor=1.5, anchor="m", margen=0.15, nombre="Ecuación")
    puntos = [
        ("Por período", "La deduplicación y los rankings se calculan por Fecha, no por nombre de archivo."),
        ("Auditable", "Lista de filas excluidas con su motivo, y conteos independientes rotulados aparte."),
        ("Comprobado", "La cuadratura se verifica en cada carga y en la autoverificación de la sección 12."),
    ]
    for i, (t, s) in enumerate(puntos):
        x = 0.6 + i * 4.1
        L.texto(x, 5.5, 3.95, 1.4, [P(t, bold=True, size=19, color=INDIGO, after=4), P(s, size=15)], nombre=f"Punto {t}")
    L.pie()
    L.notas("""
[Jesús · 40 s]
Esta es la cascada de la sección 4 del reto, aplicada a cada período por separado.

Primero E1, duplicados: si un Numero_Prestamo se repite dentro del mismo período, nos quedamos con la primera ocurrencia según el orden del archivo. Después E2, solo operaciones locales, Destino igual a L. Luego E3, saldo positivo. Y E4, que la actividad exista en el catálogo CINU. Lo que queda es el universo local válido.

Cada filtro actúa solo sobre lo que pasó el anterior, así que una fila cuenta una sola vez, en el primer filtro que incumple. Por eso se cumple siempre: filas leídas igual a E1 más E2 más E3 más E4 más universo válido. El motor lo comprueba en cada carga y hay pruebas que lo verifican.

Un préstamo que aparece en julio y en agosto no es un duplicado: se calcula por Fecha. Y cada fila excluida queda en una lista con su motivo, que se descarga desde Reportes.

Dónde está en el código: server/src/engine/cascada.js.
""")
    return L


def lamina_reglas2(prs, d):
    L = Lamina(prs, d["contenido"], 8, "Motor: clasificación, SB21, ponderación y control", "reglas 2")
    tarjetas = [
        ("Clasificación CINU", "Tipo_Actividad se cruza con Codigo_CINU: 22 subactividades en 6 rankings. "
                               "Nunca se usa el nombre ni datos del cliente (R3)."),
        ("Regla SB21 de CONSUMO", "El crédito personal con facilidad 07 pasa a Tarjeta. El total de CONSUMO "
                                   "no cambia: solo el reparto entre subactividades."),
        ("Ponderación", "Saldo de la actividad ÷ toda la cartera local válida del banco × 100, a 4 decimales. "
                        "El mismo denominador en los 6 rankings."),
        ("Reconciliaciones", "R1: subactividades = actividad. R2: actividades = total del banco. "
                             "R3: bancos = universo. Todas al centavo."),
    ]
    ancho, alto = 5.95, 2.1
    for i, (titulo, texto) in enumerate(tarjetas):
        fila, col = divmod(i, 2)
        x = 0.6 + col * (ancho + 0.25)
        y = 1.2 + fila * (alto + 0.25)
        L.caja(x, y, ancho, alto, nombre=f"Tarjeta {titulo}")
        L.circulo(x + 0.25, y + 0.25, 0.5, str(i + 1), size=18, nombre=f"Número {i + 1}")
        L.texto(x + 0.95, y + 0.27, ancho - 1.2, 0.45, titulo, size=20, bold=True, color=INDIGO, anchor="m", nombre=f"Título {titulo}")
        L.texto(x + 0.25, y + 0.9, ancho - 0.5, alto - 1.0, texto, size=16, nombre=f"Texto {titulo}")
    L.caja_texto(0.6, 5.85, 12.15, 1.05, [
        P("Montos en centavos enteros y ponderación con BigInt: sin errores de punto flotante.", size=17, bold=True,
          color=BLANCO, after=2),
        P("Posición 1 al mayor saldo; en un empate, por Codigo_Banco. Cada ranking siempre trae los 12 bancos.",
          size=14, color=PALIDO),
    ], relleno=INDIGO, borde=None, anchor="m", margen=0.2, nombre="Precisión")
    L.pie()
    L.notas("""
[Jesús · 50 s]
Cuatro reglas del motor.

Clasificación: la actividad sale solo del catálogo CINU, cruzando Tipo_Actividad con Codigo_CINU. Nunca por nombres ni datos del cliente, eso es el requisito R3. Son 22 subactividades agrupadas en 6 rankings.

Regla SB21: dentro de CONSUMO, un crédito personal con facilidad 07 es en realidad una tarjeta, así que se reclasifica a Tarjeta y se resta de Crédito personal. Esto solo mueve saldo entre subactividades: el total de CONSUMO del banco no cambia. Si una Tarjeta no trae facilidad 07 o un Automóvil no trae la 03, se avisa como alerta pero no se excluye.

Ponderación: el denominador es toda la cartera local válida del banco, las seis macroactividades, calculado antes de filtrar por ranking. Se redondea a 4 decimales.

Reconciliaciones 1, 2 y 3, todas al centavo. Todo con centavos enteros y BigInt: con punto flotante una suma de miles de saldos puede diferir en un centavo.

Dónde está en el código: server/src/engine/clasificacion.js, rankings.js, reconciliaciones.js y montos.js.
""")
    return L


def lamina_automatizacion(prs, d):
    L = Lamina(prs, d["contenido"], 9, "Automatización: un período nuevo, sin tocar código", "automatización")
    pasos = [
        ("Cargar", "El Administrador sube el AT03. El período sale del campo Fecha."),
        ("Recalcular", "Cascada, rankings y reconciliaciones, al momento."),
        ("Comparar", "Contra el período anterior: Cambio_Posicion y Var_Saldo."),
        ("Señalar", "Movimientos significativos según una regla configurable."),
        ("Explicar", "Una frase por movimiento: reglas, o IA con verificador."),
        ("Avisar", "Correo a los suscriptores con Zapier."),
    ]
    ancho, alto = 3.95, 1.75
    for i, (titulo, texto) in enumerate(pasos):
        fila, col = divmod(i, 3)
        x = 0.6 + col * (ancho + 0.15)
        y = 1.2 + fila * (alto + 0.2)
        L.caja(x, y, ancho, alto, nombre=f"Paso {titulo}")
        L.circulo(x + 0.2, y + 0.22, 0.5, str(i + 1), size=18, nombre=f"Número {i + 1}")
        L.texto(x + 0.85, y + 0.22, ancho - 1.0, 0.5, titulo, size=20, bold=True, color=INDIGO, anchor="m", nombre=f"Título {titulo}")
        L.texto(x + 0.2, y + 0.9, ancho - 0.4, 0.8, texto, size=16, nombre=f"Texto {titulo}")
    L.caja_texto(0.6, 5.2, 7.35, 1.7, [
        P("Regla de movimiento significativo (configurable)", size=16, bold=True, color=INDIGO, after=4),
        P("|Cambio_Posicion| ≥ 2, un cambio de líder o |Var_Saldo_Pct| ≥ 10 %. Son los valores por defecto: "
          "el Administrador los cambia en la app y se aplican sin reiniciar.", size=14),
    ], relleno=BLANCO, borde=ORO_TEXTO, grosor=1.5, anchor="m", margen=0.2, nombre="Regla configurable")
    L.caja_texto(8.15, 5.2, 4.6, 1.7, [
        P("Entregable 7, con prueba", size=16, bold=True, color=BLANCO, after=4),
        P("La app arranca con julio y agosto y el Administrador carga septiembre. Lo cubre entregable7.test.js.",
          size=14, color=PALIDO),
    ], relleno=INDIGO, borde=None, anchor="m", margen=0.2, nombre="Entregable 7")
    L.pie()
    L.notas("""
[Jesús: pasos 1 a 4 · 35 s. Agustín: pasos 5 y 6 · 25 s]
Jesús: esta es la automatización de la lámina 8 del reto, de punta a punta. El Administrador sube un AT03 desde la app, en el sitio interno; el período se toma del campo Fecha, no del nombre del archivo. El motor recalcula cascada, rankings y reconciliaciones en el momento, compara contra el período anterior y marca los movimientos significativos.

La regla no está fija en el código: vive en un archivo de parámetros y el Administrador la cambia desde Administración. Por defecto es significativo un cambio de dos o más posiciones, un cambio de líder, o una variación de saldo de 10 por ciento o más.

Esto es el entregable 7, y hay una prueba que arranca con julio y agosto, carga septiembre como Administrador y comprueba los cambios de ranking.

Agustín: cada movimiento significativo tiene su explicación, por plantillas o redactada por la IA y verificada. Al publicar un período la app avisa a Zapier, que manda el correo a los suscriptores; Zapier solo reparte y, si falla, la carga termina igual.

(Alertas por correo: issue #7, contrato en contracts/eventos-zapier.md.)
""")
    return L


def lamina_perfiles(prs, d):
    L = Lamina(prs, d["contenido"], 10, "Tres perfiles con opciones distintas", "perfiles")
    perfiles = [
        ("01", "Público", "Consulta · sin login", ["Rankings, filtros, gráficos y tablas", "Descarga de los entregables 2 a 4",
                                       "No ve Comparar ni Administración"]),
        ("02", "Analista", "Análisis · con login", ["Todo lo de Público", "Compara períodos y entidades",
                                         "Reportes personalizados y entregable 5"]),
        ("03", "Administrador", "Control · con login", ["Todo lo de Analista", "Carga o actualiza un período",
                                             "Parámetros, catálogos y registro de operaciones"]),
    ]
    ancho = 3.95
    for i, (n, nombre, rol, items) in enumerate(perfiles):
        x = 0.6 + i * (ancho + 0.15)
        L.caja(x, 1.2, ancho, 4.0, nombre=f"Tarjeta {nombre}")
        L.circulo(x + 0.25, 1.4, 0.6, n, size=16, nombre=f"Número {n}")
        L.texto(x + 1.05, 1.38, ancho - 1.2, 0.4, nombre, size=22, bold=True, color=INDIGO, nombre=f"Nombre {nombre}")
        L.texto(x + 1.05, 1.82, ancho - 1.2, 0.3, rol.upper(), size=13, bold=True, color=ORO_TEXTO, nombre=f"Rol {nombre}")
        L.texto(x + 0.25, 2.35, ancho - 0.5, 2.7, [P(t, bullet=True) for t in items], size=17, after=12, nombre=f"Opciones {nombre}")
    L.caja_texto(0.6, 5.4, 12.15, 1.5, [
        P("Dos sitios: el público no pide login; el interno sí, y el perfil sale de la cuenta.",
          size=17, bold=True, color=BLANCO, after=4),
        P("Sin contraseñas en el repo (R5). La UI oculta lo que no corresponde y el servidor responde "
          "403 PERFIL_NO_AUTORIZADO aunque se llame al API directo.", size=15, color=PALIDO),
    ], relleno=INDIGO, borde=None, anchor="m", margen=0.3, nombre="Control de acceso")
    L.pie()
    L.notas("""
[Agustín: lo que ve cada perfil en la UI · 30 s. Jesús: el control de acceso del servidor · 20 s]
Agustín: son los tres perfiles de la lámina 6 del reto y cada uno ve opciones distintas. Público consulta, filtra, ve gráficos y tablas y descarga los entregables 2 a 4; no ve Comparar ni Administración, y su sitio no pide login. Analista, además, compara períodos y entidades y genera reportes personalizados. Administrador, además, carga o actualiza un período, administra parámetros y catálogos y consulta el registro de operaciones.

Jesús: son dos sitios. El público no pide login y siempre es Público. El interno sí: usuario y contraseña en /entrar, y el perfil sale de la cuenta, no de lo que elija el navegador. Va en una cookie HttpOnly firmada, y los cambios llevan además un header X-Sbp contra CSRF. Las cuentas están en Supabase, con respaldo en la variable USUARIOS del .env; ninguna contraseña está en el repositorio (R5). La UI esconde lo que no corresponde, pero lo importante es que el servidor responde 403 PERFIL_NO_AUTORIZADO aunque alguien llame al API directo, sin pasar por la pantalla. La tabla de opciones por perfil está en un solo lugar: server/src/middleware/perfiles.js, y el login en server/src/auth/. Los intentos rechazados quedan en la bitácora.

Esto lo vimos en la demo: en el sitio público no se puede cargar un período; en el interno, como Administrador, sí.
""")
    return L


def lamina_ia(prs, d):
    L = Lamina(prs, d["contenido"], 11, "IA: consulta, explica y guía; nunca calcula", "IA")
    cadena = [
        ("Pregunta", "en lenguaje natural", LAVANDA, INDIGO),
        ("Agente", "7 herramientas de solo lectura", LAVANDA, INDIGO),
        ("API del motor", "la única fuente de cifras", INDIGO, BLANCO),
        ("Verificador", "cada número debe existir", LAVANDA, INDIGO),
        ("Respuesta", "con las consultas que usó", LAVANDA, INDIGO),
    ]
    ancho, hueco = 2.1, 0.4125
    for i, (titulo, sub, relleno, color) in enumerate(cadena):
        x = 0.6 + i * (ancho + hueco)
        oscuro = relleno == INDIGO
        L.caja_texto(x, 1.25, ancho, 1.2, [P(titulo, bold=True, size=16, align="c", color=ORO if oscuro else INDIGO, after=2),
                                            P(sub, size=13, align="c", color=BLANCO if oscuro else TEXTO)],
                     relleno=relleno, borde=None if oscuro else BORDE, anchor="m", margen=0.1, nombre=f"Cadena {titulo}")
        if i < len(cadena) - 1:
            L.flecha(x + ancho + 0.03, 1.85, x + ancho + hueco - 0.03, 1.85, nombre="Flecha cadena")
    tarjetas = [
        ("Consulta", "Pregunta por rankings, calidad o movimientos. El agente consulta los endpoints del motor "
                     "como herramientas y muestra qué consultó."),
        ("Explicación", "Cada movimiento significativo tiene su frase por reglas. Claude la redacta mejor; "
                        "si un número no existe en el motor, se usa la frase por reglas."),
        ("Cursor guía", "Si preguntas cómo o dónde, un cursor recorre la app y señala cada elemento. "
                        "Solo puede señalar lo que tu perfil ve."),
    ]
    ancho_t = 3.95
    for i, (titulo, texto) in enumerate(tarjetas):
        x = 0.6 + i * (ancho_t + 0.15)
        L.caja(x, 2.85, ancho_t, 2.85, nombre=f"Tarjeta {titulo}")
        L.texto(x + 0.25, 3.0, ancho_t - 0.5, 0.45, titulo, size=22, bold=True, color=INDIGO, nombre=f"Título {titulo}")
        L.texto(x + 0.25, 3.55, ancho_t - 0.5, 2.05, texto, size=16, nombre=f"Texto {titulo}")
    L.caja_texto(0.6, 6.0, 12.15, 0.85,
                 "Sin llave de IA la app funciona igual: explicaciones por reglas y el aviso «IA no disponible».",
                 relleno=INDIGO, borde=None, size=17, bold=True, color=BLANCO, anchor="m", margen=0.2, nombre="Sin IA")
    L.pie()
    L.notas("""
[Agustín · 50 s]
La sección 9 del reto dice que la IA puede apoyar la consulta, la explicación o la exploración, pero no sustituye el cálculo. Así la usamos.

Consulta: el usuario pregunta en lenguaje natural y el agente responde llamando a siete herramientas, que son simples GET a la API del motor. Muestra qué consultó, como fuentes.

Explicación: cada movimiento significativo tiene una frase armada por plantillas, siempre disponible. Si hay llave, Claude la redacta mejor, pero un verificador comprueba que cada número del texto exista en la respuesta del motor; si no existe, esa frase se reemplaza por la de reglas.

Cursor guía: si el usuario pregunta cómo o dónde hacer algo, el agente devuelve pasos y el front mueve un cursor por la pantalla señalando cada elemento. Solo puede señalar identificadores del perfil, y el backend los valida; la ruta la pone el catálogo, no la IA.

Y si no hay llave de IA o falla, la app sigue: explicaciones por reglas y un aviso. Hay un límite de pedidos para no gastar la llave y una evaluación del agente con casos del jurado (siguiente lámina).

Dónde está: server/src/ai/README.md.
""")
    return L


def lamina_calidad(prs, d):
    L = Lamina(prs, d["contenido"], 12, "Calidad técnica: pruebas, CI y contratos", "calidad técnica")
    # Cifras verificadas (ver bloque CIFRAS).
    L.caja(0.6, 1.2, 3.6, 2.0, relleno=INDIGO, borde=None, nombre="Cifra server")
    L.texto(0.6, 1.3, 3.6, 0.9, CIFRAS["pruebas_server"], size=48, bold=True, color=ORO, align="c", anchor="m", nombre="Pruebas server")
    L.texto(0.6, 2.25, 3.6, 0.8, "pruebas del server con node:test", size=15, color=BLANCO, align="c", nombre="Etiqueta server")
    L.caja(0.6, 3.4, 3.6, 1.35, relleno=LAVANDA, nombre="Cifra client")
    L.texto(0.6, 3.5, 3.6, 0.65, CIFRAS["pruebas_client"], size=34, bold=True, color=INDIGO, align="c", anchor="m", nombre="Pruebas client")
    L.texto(0.6, 4.15, 3.6, 0.5, "pruebas del client (lógica de la UI)", size=14, color=APAGADO, align="c", nombre="Etiqueta client")
    L.caja(0.6, 4.95, 3.6, 1.9, relleno=LAVANDA, nombre="Cobertura")
    L.texto(0.75, 5.0, 3.3, 0.4, "Cobertura del server", size=14, bold=True, color=INDIGO, align="c", nombre="Cobertura título")
    L.texto(0.75, 5.45, 3.3, 0.7, f"{CIFRAS['cobertura_lineas']} · {CIFRAS['cobertura_ramas']} · {CIFRAS['cobertura_funciones']}",
            size=24, bold=True, color=INDIGO, align="c", anchor="m", nombre="Cobertura cifras")
    L.texto(0.75, 6.2, 3.3, 0.6, "líneas · ramas · funciones. Falla si baja de 90 / 85 / 90.", size=13, color=APAGADO,
            align="c", nombre="Cobertura umbral")
    filas = [
        ("Sin red ni base de datos", "Procesan los CSV reales. Las cifras de control solo viven en las pruebas."),
        ("Contratos", "Cada ejemplo JSON de contracts/ se compara con la respuesta real de la API."),
        ("CI en GitHub Actions", "En cada PR y en main: pruebas del server, pruebas del client y build."),
        ("Evaluación del agente", f"{CIFRAS['casos_eval_agente']} casos del jurado: calidad, rankings, perfiles y límites."),
        ("Prueba de humo", "npm run humo revisa la app desplegada, incluido el 403 de Público."),
    ]
    y, alto = 1.2, 1.0
    for i, (titulo, texto) in enumerate(filas):
        L.caja(4.5, y, 8.25, alto, nombre=f"Fila {titulo}")
        L.circulo(4.7, y + 0.25, 0.5, str(i + 1), size=16, nombre=f"Número {i + 1}")
        L.texto(5.4, y + 0.1, 7.2, 0.35, titulo, size=17, bold=True, color=INDIGO, nombre=f"Título {titulo}")
        L.texto(5.4, y + 0.47, 7.2, 0.5, texto, size=14, nombre=f"Texto {titulo}")
        y += alto + 0.17
    L.pie()
    L.notas(f"""
[Jesús: pruebas, cobertura y contratos · 30 s. Juan: CI y prueba de humo · 15 s]
Jesús: tenemos {CIFRAS['pruebas_server']} pruebas del server con node:test y {CIFRAS['pruebas_client']} del client, todas pasando (las medimos el 27 de noviembre con npm test). Corren sin red ni base de datos, con los CSV reales. Las cifras de control viven solo en las pruebas, nunca en el código de la app: eso es R2.

La cobertura del server es {CIFRAS['cobertura_lineas']} de líneas, {CIFRAS['cobertura_ramas']} de ramas y {CIFRAS['cobertura_funciones']} de funciones, y el script falla si baja de 90, 85 y 90. Además, cada ejemplo JSON de la carpeta contracts se compara con la respuesta real de la API.

Juan: en GitHub Actions corren las pruebas del server y del client y el build, en cada pull request y en main. Y una prueba de humo revisa la app desplegada.

La evaluación del agente tiene {CIFRAS['casos_eval_agente']} casos con preguntas típicas del jurado; solo corre con --confirmar porque gasta llamadas a la IA.

(Si cambian las pruebas, hay que actualizar el bloque CIFRAS de presentacion/generar_deck.py.)
""")
    return L


def lamina_innovacion(prs, d):
    L = Lamina(prs, d["contenido"], 13, "Innovación: más allá de los 6 rankings", "innovación")
    tarjetas = [
        ("Indicadores extra", "Morosidad, concentración (HHI y top 3) y vencimientos. Rotulados como análisis adicional."),
        ("Descomposición", "De dónde sale cada variación de saldo: préstamos nuevos, los que salen y la amortización."),
        ("Cursor guía y gráficos", "El chat flota sobre la pantalla. Un cursor señala cada paso y el chat dibuja los gráficos de lo preguntado."),
        ("MCP remoto", "Conecta Claude por URL, de solo lectura. Público sin clave; interno con token Bearer."),
        ("App instalable (PWA)", "Manifest y service worker: se instala en el celular."),
        ("API documentada", "Swagger UI en /api/docs y el documento OpenAPI en /api/openapi.json."),
    ]
    ancho, alto = 3.95, 2.55
    for i, (titulo, texto) in enumerate(tarjetas):
        fila, col = divmod(i, 3)
        x = 0.6 + col * (ancho + 0.15)
        y = 1.2 + fila * (alto + 0.25)
        L.caja(x, y, ancho, alto, nombre=f"Tarjeta {titulo}")
        L.circulo(x + 0.25, y + 0.25, 0.5, str(i + 1), size=18, nombre=f"Número {i + 1}")
        L.texto(x + 0.95, y + 0.25, ancho - 1.15, 0.5, titulo, size=18, bold=True, color=INDIGO, anchor="m", nombre=f"Título {titulo}")
        L.texto(x + 0.25, y + 1.0, ancho - 0.5, alto - 1.1, texto, size=17, nombre=f"Texto {titulo}")
    L.pie()
    L.notas(f"""
[Agustín · 50 s]
Además de los 6 rankings oficiales agregamos cosas útiles, siempre rotuladas como análisis adicional para no mezclarlas con la clave.

Indicadores: morosidad, concentración con el índice HHI y la participación de los tres mayores, y vencimientos. Salen del universo válido, con los tramos que trae el diccionario del AT03.

Descomposición: para cada variación de saldo entre períodos, de dónde viene: préstamos nuevos, préstamos que salen y amortización. Suma exacta.

Cursor guía y chat flotante: el asistente es un botón abajo a la derecha que abre el chat encima de la pantalla, sin cambiar de página, y el cursor guía y los gráficos salen de ahí.

MCP remoto: se pega la URL {URL_PUBLICA}/api/mcp en Claude, como conector, y se hacen las mismas consultas de solo lectura; el sitio público siempre responde como Público, por URL, sin clave. El del sitio interno, {URL_INTERNA}/api/mcp, exige un token Bearer y responde como Analista. No hace falta instalar nada.

PWA: la app se puede instalar en el celular. Y la API está documentada con Swagger en /api/docs.

(Solo si preguntan: el server ya valida acciones de pantalla para el agente, #131, con ir, elegir, ordenar, resaltar y señalar, cada una contra el catálogo y el perfil. El front todavía no las ejecuta, así que no se muestran en la demo.)
""")
    return L


def lamina_decisiones(prs, d):
    L = Lamina(prs, d["contenido"], 14, "Decisiones técnicas y por qué", "decisiones")
    filas = [
        ("Motor puro, sin Express ni disco", "Es determinista y se prueba solo con textos de CSV."),
        ("Centavos enteros y BigInt", "Sumas exactas al centavo y ponderación sin errores de flotante."),
        ("Datos en archivos; usuarios en Supabase", "Todo resultado sale de archivos (R1, R2). Solo las cuentas del interno van en Supabase, con respaldo local."),
        ("Login y dos sitios", "El perfil sale de la cuenta (cookie firmada), sin contraseñas en el repo (R5); el 403 vive en el servidor."),
        ("IA de solo lectura con verificador", "La sección 9 prohíbe que calcule; cada número debe existir en el motor."),
        ("Contratos JSON en contracts/", "Front, IA y motor avanzan en paralelo y las pruebas detectan los cambios."),
        ("Docker y Dokploy sobre lo local", "Hay demo pública sin perder la ejecución local."),
    ]
    L.texto(0.75, 1.15, 5.0, 0.3, "Decisión", size=13, bold=True, color=APAGADO, nombre="Cabecera decisión")
    L.texto(6.0, 1.15, 6.5, 0.3, "Por qué", size=13, bold=True, color=APAGADO, nombre="Cabecera motivo")
    y, alto = 1.5, 0.68
    for i, (decision, motivo) in enumerate(filas):
        L.caja(0.6, y, 12.15, alto, nombre="Fila")
        L.circulo(0.72, y + 0.13, 0.42, str(i + 1), size=14, nombre=f"Número {i + 1}")
        L.texto(1.3, y, 4.55, alto, decision, size=15, bold=True, color=INDIGO, anchor="m", nombre="Decisión")
        L.texto(6.0, y, 6.6, alto, motivo, size=14, anchor="m", nombre="Motivo")
        y += alto + 0.09
    L.pie()
    L.notas("""
[Los tres, un turno cada uno · 60 s. Jesús: 1, 2 y 4. Juan: 3 y 7. Agustín: 5 y 6]
Esta lámina es para la parte de justificar decisiones y para R6: cada uno explica las suyas.

Jesús: el motor es puro, sin Express ni disco: es determinista y se prueba solo con textos de CSV. Usamos centavos enteros y BigInt para sumar exacto al centavo. El perfil sale de la cuenta: el sitio público no pide login y el interno sí, con una cookie firmada, y el 403 está en el servidor. No hay contraseñas en el repositorio.

Juan: los datos del reto siguen siendo archivos CSV y una carpeta storage local, porque la lámina 7 del reto pide que corra en local y el resultado debe salir de los archivos. Lo único que va en base de datos son los usuarios del sitio interno, en Supabase, con un respaldo en el .env para una demo sin internet. Encima, Docker y Dokploy dan una demo pública sin perder la ejecución local.

Agustín: la IA es de solo lectura y tiene verificador porque la sección 9 no deja que calcule. Los contratos JSON nos dejaron avanzar front, IA y motor en paralelo, con pruebas que avisan si cambia un formato.

Si preguntan por base de datos o TypeScript: la lámina 7 del reto pide JavaScript, React y Node.js, y los datos son archivos; la base solo guarda los usuarios del sitio interno.
""")
    return L


def lamina_cierre(prs, d):
    L = Lamina(prs, d["portada"], 15, "Rankings confiables para decisiones mejor informadas", "cierre")
    t = L.slide.shapes.title
    t.left, t.top, t.width, t.height = Inches(0.8), Inches(2.15), Inches(7.9), Inches(2.0)
    for run in t.text_frame.paragraphs[0].runs:
        run.font.size = Pt(40)
    L.slide.placeholders[1].text = "Pruébalo ahora, con datos ficticios"
    sub = L.slide.placeholders[1]
    sub.left, sub.top, sub.width, sub.height = Inches(0.8), Inches(4.3), Inches(7.2), Inches(0.5)
    L.slide.placeholders[1].name = "Subtítulo"
    L.imagen(ASSETS / "logo-1024.png", 0.8, 0.65, 1.0, 1.0, "Logo de la app: una escalera dorada en un ícono índigo")
    L.texto(0.8, 1.72, 7.6, 0.4, "HACKATHON SBP 2026", size=18, color=ORO, bold=True, nombre="Evento")
    L.texto(0.8, 4.8, 7.7, 0.7, URL_PUBLICA, size=34, color=ORO, bold=True, nombre="URL pública")
    L.texto(0.8, 5.5, 7.7, 0.4, f"Interno, con login: {URL_INTERNA.removeprefix('https://')}", size=18, color=ORO,
            bold=True, nombre="URL interna")
    L.texto(0.8, 6.0, 7.7, 0.6, [
        P(f"Código: {URL_REPO}", after=3),
        P("Swagger: /api/docs  ·  MCP: /api/mcp (el interno, con token Bearer)", after=3),
    ], size=15, color=BLANCO, nombre="Enlaces")
    L.texto(0.8, 6.65, 7.6, 0.35, AVISO, size=12, color=PALIDO, nombre="Aviso")
    L.notas(f"""
[Juan · 20 s, y después preguntas de los tres]
Para cerrar: la app está publicada en {URL_PUBLICA}, que es el sitio público y no pide login, y en {URL_INTERNA}, el sitio interno para Analista y Administrador, que pide iniciar sesión. El código está en {URL_REPO}, con el README de instalación y de reglas. Corre en local con npm run dev o con docker compose.

Recordatorio de lo que vieron: rankings calculados desde los archivos con un motor determinista, comparación entre períodos con una regla configurable, tres perfiles con login en el sitio interno y control de acceso en el servidor, una IA que explica y consulta pero nunca calcula, y un modo para que el jurado verifique los seis puntos.

Todos los datos son ficticios y el uso es informativo, no una opinión formal de la SBP. Gracias, y quedamos atentos a las preguntas.

(Respuestas a las preguntas probables: presentacion/guion.md, sección Preguntas del jurado.)
""")
    return L


def main() -> int:
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 16:9 exacto
    aplicar_tema(prs)
    diseños = preparar_diseños(prs)

    laminas = [
        lamina_portada, lamina_problema, lamina_propuesta, lamina_criterios, lamina_arquitectura,
        lamina_demo, lamina_reglas1, lamina_reglas2, lamina_automatizacion, lamina_perfiles,
        lamina_ia, lamina_calidad, lamina_innovacion, lamina_decisiones, lamina_cierre,
    ]
    for construir in laminas:
        L = construir(prs, diseños)
        # La portada, la sección y el cierre no llevan pie de página propio.
        _ = L

    prs.core_properties.title = "Rankings de Crédito · Hackathon SBP 2026"
    prs.core_properties.subject = "Presentación y demo del equipo"
    prs.core_properties.author = "Equipo Rankings de Crédito"
    prs.core_properties.language = "es-PA"
    prs.save(SALIDA)
    print(f"Escrito {SALIDA} con {len(prs.slides)} láminas")
    if AVISOS:
        print("\nAvisos de texto (revisa estas cajas en la imagen):")
        for a in AVISOS:
            print(f"  - {a}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
