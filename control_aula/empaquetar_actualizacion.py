# -*- coding: utf-8 -*-
"""
Empaquetador de actualización del cliente alumno para Google Drive.
Genera 'version.json' (v4.0) y 'actualizacion_alumno.zip' listos para subir a la carpeta compartida:
https://drive.google.com/drive/folders/1ybismthjfGh4g6wnBaeo8blQX5lENuKL
"""
import os
import json
import zipfile
import time

DIR_BASE = os.path.dirname(os.path.abspath(__file__))
RUTA_VERSION = os.path.join(DIR_BASE, "version.json")
RUTA_ZIP = os.path.join(DIR_BASE, "actualizacion_alumno.zip")

INFO_VERSION = {
    "version": 4.0,
    "fecha": time.strftime("%Y-%m-%d"),
    "descripcion": "Versión 4.0: Repartir y Recolectar Trabajos de Alumnos (PDF, Scratch, Arduino), Galería de Evidencias, Modo Foco y Fail-Safe Wi-Fi"
}

ARCHIVOS_INCLUIR = [
    "cliente_alumno.py",
    "actualizador.py",
    "prohibido_busqueda.jpg",
    "palabras_prohibidas.txt",
    "version.json",
    "iniciar_alumno.bat",
    "asignar_numero.bat"
]

def main():
    print("=" * 60)
    print("  CREANDO PAQUETE DE ACTUALIZACIÓN v4.0 PARA GOOGLE DRIVE")
    print("=" * 60)

    # 1. Guardar version.json
    with open(RUTA_VERSION, "w", encoding="utf-8") as f:
        json.dump(INFO_VERSION, f, indent=2, ensure_ascii=False)
    print(f"  [+] 'version.json' generado (v{INFO_VERSION['version']})")

    # 2. Crear actualizacion_alumno.zip
    with zipfile.ZipFile(RUTA_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for fname in ARCHIVOS_INCLUIR:
            fpath = os.path.join(DIR_BASE, fname)
            if os.path.exists(fpath):
                zf.write(fpath, fname)
                print(f"      -> Agregado: {fname}")
            else:
                print(f"      [!] No encontrado: {fname}")

    tam_kb = os.path.getsize(RUTA_ZIP) // 1024
    print(f"\n  [✔] ¡Listo! Archivo creado:")
    print(f"      Ruta: {RUTA_ZIP} ({tam_kb} KB)")
    print(f"      Ruta: {RUTA_VERSION}")
    print("=" * 60)

if __name__ == "__main__":
    main()
