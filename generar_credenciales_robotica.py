import unicodedata
import re
import json
import csv
from collections import defaultdict

# Lista oficial extraída del PDF (Páginas 5 a 11: 5 Años a 6to Primaria)
students_raw = [
    # 5 AÑOS A
    ('5 Años', '5° A', 'sala5', 'Agustín Moreira'),
    ('5 Años', '5° A', 'sala5', 'Agustina Inzaurralde'),
    ('5 Años', '5° A', 'sala5', 'Bautista Viera'),
    ('5 Años', '5° A', 'sala5', 'Celina Rodríguez'),
    ('5 Años', '5° A', 'sala5', 'Emiliano Turchich'),
    ('5 Años', '5° A', 'sala5', 'Facundo Pérez'),
    ('5 Años', '5° A', 'sala5', 'Isabella Prieto'),
    ('5 Años', '5° A', 'sala5', 'Luciano Bautista'),
    ('5 Años', '5° A', 'sala5', 'Maite Amado'),
    ('5 Años', '5° A', 'sala5', 'Martina Pérez'),
    ('5 Años', '5° A', 'sala5', 'Máximo Roade'),
    ('5 Años', '5° A', 'sala5', 'Miranda Muniz'),
    # 5 AÑOS B
    ('5 Años', '5° B', 'sala5', 'Agustín Suárez'),
    ('5 Años', '5° B', 'sala5', 'Facundo Peña'),
    ('5 Años', '5° B', 'sala5', 'Faustina Castelar'),
    ('5 Años', '5° B', 'sala5', 'Faustina Tangredi'),
    ('5 Años', '5° B', 'sala5', 'Isabella Romano'),
    ('5 Años', '5° B', 'sala5', 'Liam Abad'),
    ('5 Años', '5° B', 'sala5', 'Lola Machado'),
    ('5 Años', '5° B', 'sala5', 'Maite Garcilazo'),
    ('5 Años', '5° B', 'sala5', 'Paulina Picos'),
    ('5 Años', '5° B', 'sala5', 'Santino López'),
    ('5 Años', '5° B', 'sala5', 'Tomás Nogués'),
    ('5 Años', '5° B', 'sala5', 'Valentino López'),
    # PRIMERO A
    ('1° Primaria', '1° A', 'grado1', 'Amanda Padilla'),
    ('1° Primaria', '1° A', 'grado1', 'Antonia Liucci'),
    ('1° Primaria', '1° A', 'grado1', 'Bruno Peraza'),
    ('1° Primaria', '1° A', 'grado1', 'Enzo Rosano'),
    ('1° Primaria', '1° A', 'grado1', 'Facundo Bartel'),
    ('1° Primaria', '1° A', 'grado1', 'Federico Rodríguez'),
    ('1° Primaria', '1° A', 'grado1', 'Felipe Vodanovich'),
    ('1° Primaria', '1° A', 'grado1', 'Pilar Paletta'),
    ('1° Primaria', '1° A', 'grado1', 'Juan Martín Vega'),
    ('1° Primaria', '1° A', 'grado1', 'Julia Fontán'),
    ('1° Primaria', '1° A', 'grado1', 'Julieta Feller'),
    ('1° Primaria', '1° A', 'grado1', 'Lua Colla'),
    ('1° Primaria', '1° A', 'grado1', 'Nicolás Ricca'),
    # PRIMERO B
    ('1° Primaria', '1° B', 'grado1', 'Alfonso Orihuela'),
    ('1° Primaria', '1° B', 'grado1', 'Belén Rodríguez'),
    ('1° Primaria', '1° B', 'grado1', 'Benjamín Fonseca'),
    ('1° Primaria', '1° B', 'grado1', 'Benjamín Kardjian'),
    ('1° Primaria', '1° B', 'grado1', 'Emilia Denis'),
    ('1° Primaria', '1° B', 'grado1', 'Ezequiel Wolf'),
    ('1° Primaria', '1° B', 'grado1', 'Joaquín Cabrera'),
    ('1° Primaria', '1° B', 'grado1', 'Joaquín Silva'),
    ('1° Primaria', '1° B', 'grado1', 'Julieta Suárez'),
    ('1° Primaria', '1° B', 'grado1', 'Maite Altez'),
    ('1° Primaria', '1° B', 'grado1', 'Nahuel Devicenzi'),
    ('1° Primaria', '1° B', 'grado1', 'Pilar Ruiz'),
    ('1° Primaria', '1° B', 'grado1', 'Renata Marzán'),
    ('1° Primaria', '1° B', 'grado1', 'Santino Marcher'),
    # SEGUNDO A
    ('2° Primaria', '2° A', 'grado2', 'Lorenzo Bo'),
    ('2° Primaria', '2° A', 'grado2', 'Mora Bracesco'),
    ('2° Primaria', '2° A', 'grado2', 'Emma Duarte'),
    ('2° Primaria', '2° A', 'grado2', 'Mateo Franco'),
    ('2° Primaria', '2° A', 'grado2', 'Josefina Hernández'),
    ('2° Primaria', '2° A', 'grado2', 'Bruno Moreira'),
    ('2° Primaria', '2° A', 'grado2', 'Salvador Parodi'),
    ('2° Primaria', '2° A', 'grado2', 'Karly Pedraza'),
    ('2° Primaria', '2° A', 'grado2', 'Mariana Pérez'),
    ('2° Primaria', '2° A', 'grado2', 'Benjamín Rivas'),
    ('2° Primaria', '2° A', 'grado2', 'Ciro Rodríguez'),
    ('2° Primaria', '2° A', 'grado2', 'Federico Silveira'),
    ('2° Primaria', '2° A', 'grado2', 'Olivia Taglioretti'),
    ('2° Primaria', '2° A', 'grado2', 'Delfina Tolve'),
    ('2° Primaria', '2° A', 'grado2', 'Matías Traverso'),
    ('2° Primaria', '2° A', 'grado2', 'Guillermina Vidal'),
    ('2° Primaria', '2° A', 'grado2', 'Joaquín Viera'),
    # SEGUNDO B
    ('2° Primaria', '2° B', 'grado2', 'Manuel Arbiza'),
    ('2° Primaria', '2° B', 'grado2', 'Julieta Bailón'),
    ('2° Primaria', '2° B', 'grado2', 'Lia Cabrera'),
    ('2° Primaria', '2° B', 'grado2', 'Enzo Ferrari'),
    ('2° Primaria', '2° B', 'grado2', 'Piero Fernández'),
    ('2° Primaria', '2° B', 'grado2', 'Salvador Franco'),
    ('2° Primaria', '2° B', 'grado2', 'Tomás Fuica'),
    ('2° Primaria', '2° B', 'grado2', 'Joaquín Islas'),
    ('2° Primaria', '2° B', 'grado2', 'Alma Murillo'),
    ('2° Primaria', '2° B', 'grado2', 'Francesca Navone'),
    ('2° Primaria', '2° B', 'grado2', 'Francesca Pedemonte'),
    ('2° Primaria', '2° B', 'grado2', 'Ignacio Picos'),
    ('2° Primaria', '2° B', 'grado2', 'Julieta Rocha'),
    ('2° Primaria', '2° B', 'grado2', 'Lautaro Rosamén'),
    ('2° Primaria', '2° B', 'grado2', 'Federica Sarubbo'),
    ('2° Primaria', '2° B', 'grado2', 'Tomás Stolfi'),
    ('2° Primaria', '2° B', 'grado2', 'Antonella Taglioretti'),
    ('2° Primaria', '2° B', 'grado2', 'Belén Peralta'),
    # TERCERO A
    ('3° Primaria', '3° A', 'grado3', 'Amanda Castagnin'),
    ('3° Primaria', '3° A', 'grado3', 'Amelia Amado'),
    ('3° Primaria', '3° A', 'grado3', 'Benicio Ocaño'),
    ('3° Primaria', '3° A', 'grado3', 'Benjamín Wilkins'),
    ('3° Primaria', '3° A', 'grado3', 'Delfina Cabeza'),
    ('3° Primaria', '3° A', 'grado3', 'Facundo Di Corcia'),
    ('3° Primaria', '3° A', 'grado3', 'Francesca Miño'),
    ('3° Primaria', '3° A', 'grado3', 'Joaquín Delgado'),
    ('3° Primaria', '3° A', 'grado3', 'Joaquín González'),
    ('3° Primaria', '3° A', 'grado3', 'Joaquín Mascaró'),
    ('3° Primaria', '3° A', 'grado3', 'Juan Martín González'),
    ('3° Primaria', '3° A', 'grado3', 'Juan Martín Peraza'),
    ('3° Primaria', '3° A', 'grado3', 'Martina González'),
    ('3° Primaria', '3° A', 'grado3', 'Nahuel Bouissa'),
    ('3° Primaria', '3° A', 'grado3', 'Salvador Liucci'),
    ('3° Primaria', '3° A', 'grado3', 'Tiziano Castro'),
    ('3° Primaria', '3° A', 'grado3', 'Valentina Peña'),
    ('3° Primaria', '3° A', 'grado3', 'Zoe Lambach'),
    # TERCERO B
    ('3° Primaria', '3° B', 'grado3', 'Agustín Cobas'),
    ('3° Primaria', '3° B', 'grado3', 'Delfina Castelar'),
    ('3° Primaria', '3° B', 'grado3', 'Diego Méndez'),
    ('3° Primaria', '3° B', 'grado3', 'Emma Castro'),
    ('3° Primaria', '3° B', 'grado3', 'Eugenia Castagnin'),
    ('3° Primaria', '3° B', 'grado3', 'Felipe Marchesano'),
    ('3° Primaria', '3° B', 'grado3', 'Guillermo Villamil'),
    ('3° Primaria', '3° B', 'grado3', 'Joaquín Belora'),
    ('3° Primaria', '3° B', 'grado3', 'Joaquín Bengoa'),
    ('3° Primaria', '3° B', 'grado3', 'Juan Manuel Curbelo'),
    ('3° Primaria', '3° B', 'grado3', 'Lautaro Mariño'),
    ('3° Primaria', '3° B', 'grado3', 'Lucas Rodríguez'),
    ('3° Primaria', '3° B', 'grado3', 'Luna Llorach'),
    ('3° Primaria', '3° B', 'grado3', 'Mateo Gutiérrez'),
    ('3° Primaria', '3° B', 'grado3', 'Mía Mascaró'),
    ('3° Primaria', '3° B', 'grado3', 'Olivia Zayas'),
    ('3° Primaria', '3° B', 'grado3', 'Pía Inzaurralde'),
    ('3° Primaria', '3° B', 'grado3', 'Piero Canina'),
    # CUARTO A
    ('4° Primaria', '4° A', 'grado4', 'Abel Rodríguez'),
    ('4° Primaria', '4° A', 'grado4', 'Antonella Calcelia'),
    ('4° Primaria', '4° A', 'grado4', 'Benjamín Dos Santos'),
    ('4° Primaria', '4° A', 'grado4', 'Bruna Fernández'),
    ('4° Primaria', '4° A', 'grado4', 'Catalina Barreiro'),
    ('4° Primaria', '4° A', 'grado4', 'Delfina Ripoll'),
    ('4° Primaria', '4° A', 'grado4', 'Fausto Villasante'),
    ('4° Primaria', '4° A', 'grado4', 'Francisco Bustamante'),
    ('4° Primaria', '4° A', 'grado4', 'Franco Schiavone'),
    ('4° Primaria', '4° A', 'grado4', 'Germán Berger'),
    ('4° Primaria', '4° A', 'grado4', 'Gerónimo Rocha'),
    ('4° Primaria', '4° A', 'grado4', 'Josefina Fittipaldi'),
    ('4° Primaria', '4° A', 'grado4', 'Juan Modernell'),
    ('4° Primaria', '4° A', 'grado4', 'Julia Ruiz'),
    ('4° Primaria', '4° A', 'grado4', 'Lautaro Bresciani'),
    ('4° Primaria', '4° A', 'grado4', 'Lautaro Guasque'),
    ('4° Primaria', '4° A', 'grado4', 'Manuel Gigirey'),
    ('4° Primaria', '4° A', 'grado4', 'Renzo Silva'),
    ('4° Primaria', '4° A', 'grado4', 'Tomás Tangredi'),
    ('4° Primaria', '4° A', 'grado4', 'Valentino Morena'),
    # CUARTO B
    ('4° Primaria', '4° B', 'grado4', 'Agustín Clavijo'),
    ('4° Primaria', '4° B', 'grado4', 'Bastian Corbo'),
    ('4° Primaria', '4° B', 'grado4', 'Candela Sagaría'),
    ('4° Primaria', '4° B', 'grado4', 'Celeste Guanco'),
    ('4° Primaria', '4° B', 'grado4', 'Franco Ayala'),
    ('4° Primaria', '4° B', 'grado4', 'Franco Díaz'),
    ('4° Primaria', '4° B', 'grado4', 'Germán Barbela'),
    ('4° Primaria', '4° B', 'grado4', 'Helena Ramos'),
    ('4° Primaria', '4° B', 'grado4', 'Juan Manuel Martínez'),
    ('4° Primaria', '4° B', 'grado4', 'Juan Martín Silva'),
    ('4° Primaria', '4° B', 'grado4', 'Julia Rodríguez'),
    ('4° Primaria', '4° B', 'grado4', 'Mateo Charlo'),
    ('4° Primaria', '4° B', 'grado4', 'Mateo Flocken'),
    ('4° Primaria', '4° B', 'grado4', 'Mateo Huvatt'),
    ('4° Primaria', '4° B', 'grado4', 'Máximo Ifrán'),
    ('4° Primaria', '4° B', 'grado4', 'Nicolás Rodríguez'),
    ('4° Primaria', '4° B', 'grado4', 'Oriana Laguna'),
    ('4° Primaria', '4° B', 'grado4', 'Paulina Scotti'),
    ('4° Primaria', '4° B', 'grado4', 'Rodrigo Gutiérrez'),
    ('4° Primaria', '4° B', 'grado4', 'Valentino Sirianni'),
    ('4° Primaria', '4° B', 'grado4', 'Vicente Santana'),
    # QUINTO A
    ('5° Primaria', '5° A', 'grado5', 'Bautista Olid'),
    ('5° Primaria', '5° A', 'grado5', 'Camilo Trabaglia'),
    ('5° Primaria', '5° A', 'grado5', 'Clara Aldabe'),
    ('5° Primaria', '5° A', 'grado5', 'Emilia González'),
    ('5° Primaria', '5° A', 'grado5', 'Emiliano Gil'),
    ('5° Primaria', '5° A', 'grado5', 'Eva Souza'),
    ('5° Primaria', '5° A', 'grado5', 'Federica Barrios'),
    ('5° Primaria', '5° A', 'grado5', 'Francesca Parietti'),
    ('5° Primaria', '5° A', 'grado5', 'Guillermina Ferraro'),
    ('5° Primaria', '5° A', 'grado5', 'Josefina Valdez'),
    ('5° Primaria', '5° A', 'grado5', 'Julieta Gómez'),
    ('5° Primaria', '5° A', 'grado5', 'Lara Da Silva'),
    ('5° Primaria', '5° A', 'grado5', 'Lucio Silva'),
    ('5° Primaria', '5° A', 'grado5', 'Mauro Bailón'),
    ('5° Primaria', '5° A', 'grado5', 'Paloma Da Silveira'),
    ('5° Primaria', '5° A', 'grado5', 'Pía Sáenz'),
    ('5° Primaria', '5° A', 'grado5', 'Santino Bandera'),
    ('5° Primaria', '5° A', 'grado5', 'Sofía Perini'),
    ('5° Primaria', '5° A', 'grado5', 'Valentina Vera'),
    ('5° Primaria', '5° A', 'grado5', 'Valentina Vilizio'),
    # QUINTO B
    ('5° Primaria', '5° B', 'grado5', 'Adrián Gerstenbluth'),
    ('5° Primaria', '5° B', 'grado5', 'Agustín Bengoa'),
    ('5° Primaria', '5° B', 'grado5', 'Alfonsina Barrios'),
    ('5° Primaria', '5° B', 'grado5', 'Bautista Greco'),
    ('5° Primaria', '5° B', 'grado5', 'Benjamín Suárez'),
    ('5° Primaria', '5° B', 'grado5', 'Guillermo Curbelo'),
    ('5° Primaria', '5° B', 'grado5', 'Guillermo Silveira'),
    ('5° Primaria', '5° B', 'grado5', 'Joaquina Fontán'),
    ('5° Primaria', '5° B', 'grado5', 'Juan Bautista Burgos'),
    ('5° Primaria', '5° B', 'grado5', 'Juan Martín Nogués'),
    ('5° Primaria', '5° B', 'grado5', 'Magalí Sodano'),
    ('5° Primaria', '5° B', 'grado5', 'Manuela García'),
    ('5° Primaria', '5° B', 'grado5', 'Martina Sagaría'),
    ('5° Primaria', '5° B', 'grado5', 'Milagros Neira'),
    ('5° Primaria', '5° B', 'grado5', 'Morena Blois'),
    ('5° Primaria', '5° B', 'grado5', 'Morena Scarone'),
    ('5° Primaria', '5° B', 'grado5', 'Olivia Monza'),
    ('5° Primaria', '5° B', 'grado5', 'Renzo Sanguinetti'),
    ('5° Primaria', '5° B', 'grado5', 'Santino Wolf'),
    ('5° Primaria', '5° B', 'grado5', 'Tomás Recalde'),
    ('5° Primaria', '5° B', 'grado5', 'Valentina Rodríguez'),
    ('5° Primaria', '5° B', 'grado5', 'Dereck Hampala'),
    # SEXTO A
    ('6° Primaria', '6° A', 'grado6', 'Augusto Ocaño'),
    ('6° Primaria', '6° A', 'grado6', 'Emilia Silva'),
    ('6° Primaria', '6° A', 'grado6', 'Emma Machado'),
    ('6° Primaria', '6° A', 'grado6', 'Federica Estiben'),
    ('6° Primaria', '6° A', 'grado6', 'Felipe Viera'),
    ('6° Primaria', '6° A', 'grado6', 'Florencia Erosa'),
    ('6° Primaria', '6° A', 'grado6', 'Joaquín Barboza'),
    ('6° Primaria', '6° A', 'grado6', 'Juan Manuel Linkimer'),
    ('6° Primaria', '6° A', 'grado6', 'Julieta Belora'),
    ('6° Primaria', '6° A', 'grado6', 'Julieta Sagaría'),
    ('6° Primaria', '6° A', 'grado6', 'Nahiara Bouissa'),
    ('6° Primaria', '6° A', 'grado6', 'Thiago Rodríguez'),
    ('6° Primaria', '6° A', 'grado6', 'Vicente Ceriliano'),
    ('6° Primaria', '6° A', 'grado6', 'Tomás Mato'),
    # SEXTO B
    ('6° Primaria', '6° B', 'grado6', 'Agustina Correa'),
    ('6° Primaria', '6° B', 'grado6', 'Agustina Umpierre'),
    ('6° Primaria', '6° B', 'grado6', 'Anahí Mora'),
    ('6° Primaria', '6° B', 'grado6', 'Bautista Clavería'),
    ('6° Primaria', '6° B', 'grado6', 'Delfina Araújo'),
    ('6° Primaria', '6° B', 'grado6', 'Isabel Moura'),
    ('6° Primaria', '6° B', 'grado6', 'María Belén Celentano'),
    ('6° Primaria', '6° B', 'grado6', 'Mateo González'),
    ('6° Primaria', '6° B', 'grado6', 'Rocío Castillo'),
    ('6° Primaria', '6° B', 'grado6', 'Santiago Moreira'),
    ('6° Primaria', '6° B', 'grado6', 'Teo Raggio'),
    ('6° Primaria', '6° B', 'grado6', 'Tomás Genta'),
    ('6° Primaria', '6° B', 'grado6', 'Luana Zayas')
]

def clean(text):
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return re.sub(r'[^a-zA-Z]', '', text).lower()

compound_surnames = ['da silveira', 'da silva', 'dos santos', 'di corcia']

def split_name(name):
    name_clean = name.strip()
    nl = name_clean.lower()
    for cs in compound_surnames:
        if nl.endswith(cs):
            fn = name_clean[:-len(cs)].strip()
            ln = cs
            return fn, ln
    parts = name_clean.split()
    if len(parts) == 2:
        return parts[0], parts[1]
    elif len(parts) == 3:
        if parts[0].lower() in ['juan', 'maria']:
            return f'{parts[0]} {parts[1]}', parts[2]
        else:
            return parts[0], f'{parts[1]} {parts[2]}'
    return parts[0], ' '.join(parts[1:])

# Cargar datos existentes de alumnos_clean.json para preservar carpetas drive si existen
existing_db = {}
try:
    with open('alumnos_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for s in data:
            existing_db[clean(s['name'])] = s
except Exception as e:
    print('Error loading alumnos_clean.json:', e)

# Generación de usuarios:
# Regla:
# 1. 3 letras de primer nombre + 3 letras de apellido (si es apellido compuesto, palabra principal ej. Silva, Corcia, Santos, Silveira)
# 2. Si se repite (colisión): se desempata usando la 4ta letra del nombre para diferenciar con claridad y elegancia (ej: martper vs mariper, nahubou vs nahibou).
# 3. Contraseña: "RoboFreire2026" (referencia al Taller de Robótica del Colegio Paulo Freire)

# Primero pasamos y recolectamos
processed_list = []
base_counts = defaultdict(int)

for grade, group, grade_id, name in students_raw:
    fn, ln = split_name(name)
    first_word = fn.split()[0]
    fn_clean = clean(first_word)
    
    # Para el apellido, si es compuesto 'da silva' usamos la parte significativa 'silva'
    ln_clean = clean(ln)
    for cs in ['dasilveira', 'dasilva', 'dossantos', 'dicorcia']:
        if ln_clean == cs:
            ln_clean = cs.replace('da', '').replace('dos', '').replace('di', '')
            break
            
    base_user = fn_clean[:3] + ln_clean[:3]
    base_counts[base_user] += 1
    
    processed_list.append({
        'name': name,
        'grade': grade,
        'group': group,
        'gradeId': grade_id,
        'firstName': fn,
        'lastName': ln,
        'fn_clean': fn_clean,
        'ln_clean': ln_clean,
        'base_user': base_user
    })

# Asignar usuario final resolviendo colisiones
seen_final = {}
import random

# Generador de PINs secretos individuales de 4 dígitos únicos para cada alumno
# Imposibles de adivinar entre compañeros y súper fáciles de escribir y recordar
random.seed(2026) # Semilla fija para mantener consistencia
generated_pins = set()
def generar_pin_unico():
    while True:
        p = str(random.randint(1000, 9999))
        if len(set(p)) > 1 and p not in ['1234', '4321', '0000', '1111'] and p not in generated_pins:
            generated_pins.add(p)
            return p

final_students = []

for item in processed_list:
    base = item['base_user']
    if base_counts[base] == 1:
        username = base
    else:
        # Colisión: desempate elegante con la 4ta letra del primer nombre
        # Si la 4ta letra existe, la usamos: ej. Martina -> mart + per = martper, Mariana -> mari + per = mariper
        if len(item['fn_clean']) >= 4:
            username = item['fn_clean'][:4] + item['ln_clean'][:3]
        else:
            # Fallback si no tiene 4 letras: agregar 4ta del apellido o número correlativo
            username = item['fn_clean'][:3] + item['ln_clean'][:4]
            
        # Si por alguna razón extrema aún colisionara:
        if username in seen_final:
            idx = 2
            while f"{username}{idx}" in seen_final:
                idx += 1
            username = f"{username}{idx}"

    seen_final[username] = item['name']
    
    # Cruzar con datos existentes
    key_clean = clean(item['name'])
    old_data = existing_db.get(key_clean, {})
    
    # Contraseña individual y secreta de 4 dígitos
    pwd = generar_pin_unico()
    
    student_obj = {
        "id": clean(item['name']),
        "name": item['name'],
        "username": username,
        "password": pwd,
        "grade": item['grade'],
        "group": item['group'],
        "gradeId": item['gradeId'],
        "gradeName": f"{item['grade']} ({item['group']})",
        "avatar": old_data.get('avatar', '🤖'),
        "driveFolderId": old_data.get('driveFolderId', ''),
        "driveUrl": old_data.get('driveUrl', ''),
        "webhookUrl": old_data.get('webhookUrl', '')
    }
    final_students.append(student_obj)

# Guardar en JSON
with open('alumnos_robotica_2026.json', 'w', encoding='utf-8') as f:
    json.dump(final_students, f, ensure_ascii=False, indent=2)

# Guardar en CSV para fácil lectura o apertura en Excel
with open('alumnos_robotica_2026.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f, delimiter=';')
    writer.writerow(['Nivel/Grado', 'Grupo', 'Nombre Completo', 'Usuario', 'Contraseña Robótica'])
    for s in final_students:
        writer.writerow([s['grade'], s['group'], s['name'], s['username'], s['password']])

print("Generación completada:")
print(f"- Total alumnos procesados: {len(final_students)}")
print(f"- Total usuarios únicos: {len(set(s['username'] for s in final_students))}")
print("- Archivos creados: alumnos_robotica_2026.json y alumnos_robotica_2026.csv")
