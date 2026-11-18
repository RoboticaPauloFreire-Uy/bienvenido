# -*- coding: utf-8 -*-
"""
ACTUALIZADOR AUTOMÁTICO DE CLIENTE ALUMNO - COLEGIO PAULO FREIRE
----------------------------------------------------------------
Se ejecuta al encender la computadora (desde iniciar_alumno.bat).
Verifica si hay una nueva versión en la carpeta compartida de Google Drive:
https://drive.google.com/drive/folders/1ybismthjfGh4g6wnBaeo8blQX5lENuKL

Si detecta una versión más reciente:
  1. Descarga el paquete de actualización.
  2. Reemplaza los archivos en la carpeta del control de aula.
  3. Preserva las configuraciones locales del equipo (número de PC, etc.).
  4. Si no hay conexión o no hay actualización, continúa inmediatamente.
"""

import os
import sys
import json
import time
import shutil
import zipfile
import urllib.request
import urllib.error
import re
import ssl

# ============================================================================
# CONFIGURACIÓN SSL RESILIENTE PARA NETBOOKS Y COMPUTADORAS ESCOLARES
# Evita el error [SSL: CERTIFICATE_VERIFY_FAILED] en equipos con certificados
# raíz antiguos, desincronización de fecha por pila agotada o proxies de red.
# ============================================================================
SSL_CTX = None
try:
    SSL_CTX = ssl.create_default_context()
    SSL_CTX.check_hostname = False
    SSL_CTX.verify_mode = ssl.CERT_NONE
except Exception:
    try:
        SSL_CTX = ssl._create_unverified_context()
    except Exception:
        SSL_CTX = None

try:
    if hasattr(ssl, "_create_unverified_context"):
        ssl._create_default_https_context = ssl._create_unverified_context
    elif SSL_CTX is not None:
        ssl._create_default_https_context = lambda: SSL_CTX
except Exception:
    pass

def abrir_url_segura(req, timeout=15):
    """Abre peticiones HTTP/HTTPS ignorando fallos de certificado SSL."""
    kw = {"timeout": timeout}
    if SSL_CTX is not None:
        kw["context"] = SSL_CTX
    return urllib.request.urlopen(req, **kw)

DIR_BASE = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_VERSION_LOCAL = os.path.join(DIR_BASE, "version.json")
ARCHIVO_LOG = os.path.join(DIR_BASE, "actualizador.log")

def rotar_log_si_excede(ruta_log, max_bytes=2 * 1024 * 1024, conservar_bytes=256 * 1024):
    """Recorta automáticamente actualizador.log si supera max_bytes conservando las líneas recientes."""
    try:
        if os.path.exists(ruta_log) and os.path.getsize(ruta_log) > max_bytes:
            with open(ruta_log, "rb") as f:
                f.seek(-conservar_bytes, os.SEEK_END)
                cola = f.read()
            salto = cola.find(b"\n")
            if salto != -1 and salto + 1 < len(cola):
                cola = cola[salto + 1:]
            with open(ruta_log, "wb") as f:
                f.write(b"[... log rotado automaticamente ...]\n")
                f.write(cola)
    except Exception:
        pass

rotar_log_si_excede(ARCHIVO_LOG)

# Enlaces directos a Google Drive (actualizados in-place en la carpeta compartida)
DRIVE_FOLDER_ID = "1ybismthjfGh4g6wnBaeo8blQX5lENuKL"
DRIVE_VERSION_ID = "1fM0OYeNC2gfEABsF65-RECsVGv71OzuU"
DRIVE_ZIP_ID = "1PC3ZlVEBx-akyitFXJw9TedND6T0tVaJ"

VERSION_LOCAL_DEFECTO = {
    "version": 1.0,
    "fecha": "2026-11-12",
    "descripcion": "Versión inicial con bloqueo de pizarrón, fin de clase y reglas de aula"
}

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    linea = f"[{timestamp}] {msg}"
    print(linea, flush=True)
    try:
        with open(ARCHIVO_LOG, "a", encoding="utf-8") as f:
            f.write(linea + "\n")
    except Exception:
        pass

def obtener_version_local():
    if os.path.exists(ARCHIVO_VERSION_LOCAL):
        try:
            with open(ARCHIVO_VERSION_LOCAL, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log(f"Aviso leyendo version local: {e}")
    return VERSION_LOCAL_DEFECTO

def guardar_version_local(info_version):
    try:
        with open(ARCHIVO_VERSION_LOCAL, "w", encoding="utf-8") as f:
            json.dump(info_version, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log(f"Error guardando version local: {e}")

def descargar_archivo_drive(file_id, destino, timeout=20):
    """Descarga directa de un archivo de Google Drive por su ID sin fallas por SSL."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with abrir_url_segura(req, timeout=timeout) as resp:
        contenido = resp.read()
        
        # Si Google Drive muestra pantalla de confirmación por tamaño:
        if b"confirm=" in contenido or b"download_warning" in contenido:
            m = re.search(r'confirm=([0-9A-Za-z_-]+)', contenido.decode("utf-8", errors="ignore"))
            if m:
                token = m.group(1)
                url_confirm = f"https://drive.google.com/uc?export=download&confirm={token}&id={file_id}"
                req2 = urllib.request.Request(url_confirm, headers={"User-Agent": "Mozilla/5.0"})
                with abrir_url_segura(req2, timeout=timeout) as resp2:
                    contenido = resp2.read()

        with open(destino, "wb") as f:
            f.write(contenido)
    return True

def buscar_archivos_en_carpeta_drive(folder_id, timeout=8):
    """Inspecciona la página pública de la carpeta de Drive para encontrar IDs de archivos."""
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with abrir_url_segura(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        log(f"Sin acceso a Google Drive o sin conexión ({e}). Continuando con la versión local.")
        return {}

    encontrados = {}
    
    # Patrón común en SSR de carpetas públicas de Google Drive
    # Estructura: [["FILE_ID", ["NOMBRE_ARCHIVO", ...
    matches = re.findall(r'\["([a-zA-Z0-9_-]{25,})",\["([^"]+)"', html)
    for fid, nombre in matches:
        if "." in nombre and not nombre.startswith("http"):
            encontrados[nombre.strip()] = fid.strip()

    # Patrón alternativo de JSON embebido
    matches_alt = re.findall(r'https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{25,})', html)
    for fid in matches_alt:
        if fid not in encontrados.values():
            encontrados[f"archivo_{fid}"] = fid

    return encontrados

def verificar_y_actualizar():
    log("Verificando actualizaciones en Google Drive...")
    v_local = obtener_version_local()
    ver_num_local = float(v_local.get("version", 1.0))
    log(f"Versión local actual: v{ver_num_local}")

    v_remota = None
    id_paquete = DRIVE_ZIP_ID

    # 1. Intentar consulta directa y rápida de version.json por su ID fijo
    if DRIVE_VERSION_ID:
        temp_v = os.path.join(DIR_BASE, "_temp_version.json")
        try:
            descargar_archivo_drive(DRIVE_VERSION_ID, temp_v, timeout=6)
            with open(temp_v, "r", encoding="utf-8") as f:
                v_remota = json.load(f)
            os.remove(temp_v)
        except Exception as e:
            log(f"Aviso en consulta directa de version.json: {e}")

    # 2. Respaldo: Si la consulta directa falló, explorar la carpeta de Drive
    if not v_remota:
        archivos_drive = buscar_archivos_en_carpeta_drive(DRIVE_FOLDER_ID)
        if archivos_drive:
            id_version = archivos_drive.get("version.json", DRIVE_VERSION_ID)
            id_paquete = archivos_drive.get("actualizacion_alumno.zip", DRIVE_ZIP_ID)
            if id_version:
                temp_v = os.path.join(DIR_BASE, "_temp_version.json")
                try:
                    descargar_archivo_drive(id_version, temp_v, timeout=8)
                    with open(temp_v, "r", encoding="utf-8") as f:
                        v_remota = json.load(f)
                    os.remove(temp_v)
                except Exception as e:
                    log(f"No se pudo leer version.json remota desde carpeta: {e}")

    if not v_remota:
        log("No se pudo obtener información de versión remota. Continuando con la versión local.")
        return False

    ver_num_remota = float(v_remota.get("version", 0.0))
    log(f"Versión remota en Drive: v{ver_num_remota}")

    if ver_num_remota <= ver_num_local:
        log(f"El software ya está en la última versión (v{ver_num_local}).")
        return False

    log(f"¡NUEVA VERSIÓN DETECTADA! (v{ver_num_local} -> v{ver_num_remota}). Descargando paquete...")

    # Si hay zip, descargar y descomprimir
    if id_paquete:
        zip_destino = os.path.join(DIR_BASE, "_update_pkg.zip")
        try:
            descargar_archivo_drive(id_paquete, zip_destino, timeout=60)
            log("Paquete descargado. Aplicando archivos...")
            
            dir_raiz_alumno = os.path.dirname(DIR_BASE)
            with zipfile.ZipFile(zip_destino, "r") as zf:
                for miembro in zf.namelist():
                    # Evitar sobreescribir archivos de configuración, estado o número de máquina si existen
                    nombre_base = os.path.basename(miembro)
                    if nombre_base in (
                        "numero_maquina.txt",
                        "agente_alumno.pid",
                        "actualizador.log",
                        "servidor_ip.txt",
                        "estado_bloqueo.json",
                        "agente_alumno.log",
                    ):
                        continue
                    if miembro.startswith("sistema/") or miembro.endswith(".bat"):
                        zf.extract(miembro, dir_raiz_alumno)
                    else:
                        zf.extract(miembro, DIR_BASE)

            try:
                os.remove(zip_destino)
            except Exception:
                pass

            guardar_version_local(v_remota)
            log(f"¡ACTUALIZACIÓN APLICADA CON ÉXITO! Ahora está en la v{ver_num_remota}.")
            return True
        except Exception as e:
            log(f"Error aplicando paquete zip de actualización: {e}")
            if os.path.exists(zip_destino):
                try: os.remove(zip_destino)
                except Exception: pass
            return False

    return False

if __name__ == "__main__":
    try:
        verificar_y_actualizar()
    except Exception as e:
        log(f"Aviso en actualizador: {e}")
    sys.exit(0)
