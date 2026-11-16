import json

with open('alumnos_robotica_2026.json', 'r', encoding='utf-8') as f:
    alumnos_data = json.load(f)
alumnos_json_str = json.dumps(alumnos_data, ensure_ascii=False)

with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = 'let listaAlumnos = [];'
replacement = f'const ALUMNOS_INICIALES = {alumnos_json_str};\n    let listaAlumnos = JSON.parse(JSON.stringify(ALUMNOS_INICIALES));'

if target in html:
    html = html.replace(target, replacement, 1)

old_load_block = """      try {
        const resp = await fetch('alumnos_robotica_2026.json');
        listaAlumnos = await resp.json();
      } catch (e) {
        console.warn("No se pudo cargar alumnos_robotica_2026.json, buscando en alumnos_clean.json...", e);
        try {
          const respClean = await fetch('alumnos_clean.json');
          listaAlumnos = await respClean.json();
        } catch (e2) {
          listaAlumnos = [];
        }
      }"""

new_load_block = """      // Carga inmediata de respaldo (funciona con doble clic local file:/// y con servidor web)
      if (!listaAlumnos || listaAlumnos.length === 0) {
        listaAlumnos = (typeof ALUMNOS_INICIALES !== 'undefined') ? JSON.parse(JSON.stringify(ALUMNOS_INICIALES)) : [];
      }
      try {
        const resp = await fetch('alumnos_robotica_2026.json');
        if (resp.ok) listaAlumnos = await resp.json();
      } catch (e) {
        // En entorno local de archivos (file:///) utiliza los datos embebidos sin restricciones CORS
      }"""

if old_load_block in html:
    html = html.replace(old_load_block, new_load_block, 1)

with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("admin.html actualizado con datos embebidos exitosamente.")
