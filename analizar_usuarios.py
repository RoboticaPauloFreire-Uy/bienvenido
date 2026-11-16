import unicodedata
import re
from collections import defaultdict

students = [
    # 5 AÑOS A
    ('5 Años', '5° A', 'Agustín Moreira'),
    ('5 Años', '5° A', 'Agustina Inzaurralde'),
    ('5 Años', '5° A', 'Bautista Viera'),
    ('5 Años', '5° A', 'Celina Rodríguez'),
    ('5 Años', '5° A', 'Emiliano Turchich'),
    ('5 Años', '5° A', 'Facundo Pérez'),
    ('5 Años', '5° A', 'Isabella Prieto'),
    ('5 Años', '5° A', 'Luciano Bautista'),
    ('5 Años', '5° A', 'Maite Amado'),
    ('5 Años', '5° A', 'Martina Pérez'),
    ('5 Años', '5° A', 'Máximo Roade'),
    ('5 Años', '5° A', 'Miranda Muniz'),
    # 5 AÑOS B
    ('5 Años', '5° B', 'Agustín Suárez'),
    ('5 Años', '5° B', 'Facundo Peña'),
    ('5 Años', '5° B', 'Faustina Castelar'),
    ('5 Años', '5° B', 'Faustina Tangredi'),
    ('5 Años', '5° B', 'Isabella Romano'),
    ('5 Años', '5° B', 'Liam Abad'),
    ('5 Años', '5° B', 'Lola Machado'),
    ('5 Años', '5° B', 'Maite Garcilazo'),
    ('5 Años', '5° B', 'Paulina Picos'),
    ('5 Años', '5° B', 'Santino López'),
    ('5 Años', '5° B', 'Tomás Nogués'),
    ('5 Años', '5° B', 'Valentino López'),
    # PRIMERO A
    ('1° Primaria', '1° A', 'Amanda Padilla'),
    ('1° Primaria', '1° A', 'Antonia Liucci'),
    ('1° Primaria', '1° A', 'Bruno Peraza'),
    ('1° Primaria', '1° A', 'Enzo Rosano'),
    ('1° Primaria', '1° A', 'Facundo Bartel'),
    ('1° Primaria', '1° A', 'Federico Rodríguez'),
    ('1° Primaria', '1° A', 'Felipe Vodanovich'),
    ('1° Primaria', '1° A', 'Pilar Paletta'),
    ('1° Primaria', '1° A', 'Juan Martín Vega'),
    ('1° Primaria', '1° A', 'Julia Fontán'),
    ('1° Primaria', '1° A', 'Julieta Feller'),
    ('1° Primaria', '1° A', 'Lua Colla'),
    ('1° Primaria', '1° A', 'Nicolás Ricca'),
    # PRIMERO B
    ('1° Primaria', '1° B', 'Alfonso Orihuela'),
    ('1° Primaria', '1° B', 'Belén Rodríguez'),
    ('1° Primaria', '1° B', 'Benjamín Fonseca'),
    ('1° Primaria', '1° B', 'Benjamín Kardjian'),
    ('1° Primaria', '1° B', 'Emilia Denis'),
    ('1° Primaria', '1° B', 'Ezequiel Wolf'),
    ('1° Primaria', '1° B', 'Joaquín Cabrera'),
    ('1° Primaria', '1° B', 'Joaquín Silva'),
    ('1° Primaria', '1° B', 'Julieta Suárez'),
    ('1° Primaria', '1° B', 'Maite Altez'),
    ('1° Primaria', '1° B', 'Nahuel Devicenzi'),
    ('1° Primaria', '1° B', 'Pilar Ruiz'),
    ('1° Primaria', '1° B', 'Renata Marzán'),
    ('1° Primaria', '1° B', 'Santino Marcher'),
    # SEGUNDO A
    ('2° Primaria', '2° A', 'Lorenzo Bo'),
    ('2° Primaria', '2° A', 'Mora Bracesco'),
    ('2° Primaria', '2° A', 'Emma Duarte'),
    ('2° Primaria', '2° A', 'Mateo Franco'),
    ('2° Primaria', '2° A', 'Josefina Hernández'),
    ('2° Primaria', '2° A', 'Bruno Moreira'),
    ('2° Primaria', '2° A', 'Salvador Parodi'),
    ('2° Primaria', '2° A', 'Karly Pedraza'),
    ('2° Primaria', '2° A', 'Mariana Pérez'),
    ('2° Primaria', '2° A', 'Benjamín Rivas'),
    ('2° Primaria', '2° A', 'Ciro Rodríguez'),
    ('2° Primaria', '2° A', 'Federico Silveira'),
    ('2° Primaria', '2° A', 'Olivia Taglioretti'),
    ('2° Primaria', '2° A', 'Delfina Tolve'),
    ('2° Primaria', '2° A', 'Matías Traverso'),
    ('2° Primaria', '2° A', 'Guillermina Vidal'),
    ('2° Primaria', '2° A', 'Joaquín Viera'),
    # SEGUNDO B
    ('2° Primaria', '2° B', 'Manuel Arbiza'),
    ('2° Primaria', '2° B', 'Julieta Bailón'),
    ('2° Primaria', '2° B', 'Lia Cabrera'),
    ('2° Primaria', '2° B', 'Enzo Ferrari'),
    ('2° Primaria', '2° B', 'Piero Fernández'),
    ('2° Primaria', '2° B', 'Salvador Franco'),
    ('2° Primaria', '2° B', 'Tomás Fuica'),
    ('2° Primaria', '2° B', 'Joaquín Islas'),
    ('2° Primaria', '2° B', 'Alma Murillo'),
    ('2° Primaria', '2° B', 'Francesca Navone'),
    ('2° Primaria', '2° B', 'Francesca Pedemonte'),
    ('2° Primaria', '2° B', 'Ignacio Picos'),
    ('2° Primaria', '2° B', 'Julieta Rocha'),
    ('2° Primaria', '2° B', 'Lautaro Rosamén'),
    ('2° Primaria', '2° B', 'Federica Sarubbo'),
    ('2° Primaria', '2° B', 'Tomás Stolfi'),
    ('2° Primaria', '2° B', 'Antonella Taglioretti'),
    ('2° Primaria', '2° B', 'Belén Peralta'),
    # TERCERO A
    ('3° Primaria', '3° A', 'Amanda Castagnin'),
    ('3° Primaria', '3° A', 'Amelia Amado'),
    ('3° Primaria', '3° A', 'Benicio Ocaño'),
    ('3° Primaria', '3° A', 'Benjamín Wilkins'),
    ('3° Primaria', '3° A', 'Delfina Cabeza'),
    ('3° Primaria', '3° A', 'Facundo Di Corcia'),
    ('3° Primaria', '3° A', 'Francesca Miño'),
    ('3° Primaria', '3° A', 'Joaquín Delgado'),
    ('3° Primaria', '3° A', 'Joaquín González'),
    ('3° Primaria', '3° A', 'Joaquín Mascaró'),
    ('3° Primaria', '3° A', 'Juan Martín González'),
    ('3° Primaria', '3° A', 'Juan Martín Peraza'),
    ('3° Primaria', '3° A', 'Martina González'),
    ('3° Primaria', '3° A', 'Nahuel Bouissa'),
    ('3° Primaria', '3° A', 'Salvador Liucci'),
    ('3° Primaria', '3° A', 'Tiziano Castro'),
    ('3° Primaria', '3° A', 'Valentina Peña'),
    ('3° Primaria', '3° A', 'Zoe Lambach'),
    # TERCERO B
    ('3° Primaria', '3° B', 'Agustín Cobas'),
    ('3° Primaria', '3° B', 'Delfina Castelar'),
    ('3° Primaria', '3° B', 'Diego Méndez'),
    ('3° Primaria', '3° B', 'Emma Castro'),
    ('3° Primaria', '3° B', 'Eugenia Castagnin'),
    ('3° Primaria', '3° B', 'Felipe Marchesano'),
    ('3° Primaria', '3° B', 'Guillermo Villamil'),
    ('3° Primaria', '3° B', 'Joaquín Belora'),
    ('3° Primaria', '3° B', 'Joaquín Bengoa'),
    ('3° Primaria', '3° B', 'Juan Manuel Curbelo'),
    ('3° Primaria', '3° B', 'Lautaro Mariño'),
    ('3° Primaria', '3° B', 'Lucas Rodríguez'),
    ('3° Primaria', '3° B', 'Luna Llorach'),
    ('3° Primaria', '3° B', 'Mateo Gutiérrez'),
    ('3° Primaria', '3° B', 'Mía Mascaró'),
    ('3° Primaria', '3° B', 'Olivia Zayas'),
    ('3° Primaria', '3° B', 'Pía Inzaurralde'),
    ('3° Primaria', '3° B', 'Piero Canina'),
    # CUARTO A
    ('4° Primaria', '4° A', 'Abel Rodríguez'),
    ('4° Primaria', '4° A', 'Antonella Calcelia'),
    ('4° Primaria', '4° A', 'Benjamín Dos Santos'),
    ('4° Primaria', '4° A', 'Bruna Fernández'),
    ('4° Primaria', '4° A', 'Catalina Barreiro'),
    ('4° Primaria', '4° A', 'Delfina Ripoll'),
    ('4° Primaria', '4° A', 'Fausto Villasante'),
    ('4° Primaria', '4° A', 'Francisco Bustamante'),
    ('4° Primaria', '4° A', 'Franco Schiavone'),
    ('4° Primaria', '4° A', 'Germán Berger'),
    ('4° Primaria', '4° A', 'Gerónimo Rocha'),
    ('4° Primaria', '4° A', 'Josefina Fittipaldi'),
    ('4° Primaria', '4° A', 'Juan Modernell'),
    ('4° Primaria', '4° A', 'Julia Ruiz'),
    ('4° Primaria', '4° A', 'Lautaro Bresciani'),
    ('4° Primaria', '4° A', 'Lautaro Guasque'),
    ('4° Primaria', '4° A', 'Manuel Gigirey'),
    ('4° Primaria', '4° A', 'Renzo Silva'),
    ('4° Primaria', '4° A', 'Tomás Tangredi'),
    ('4° Primaria', '4° A', 'Valentino Morena'),
    # CUARTO B
    ('4° Primaria', '4° B', 'Agustín Clavijo'),
    ('4° Primaria', '4° B', 'Bastian Corbo'),
    ('4° Primaria', '4° B', 'Candela Sagaría'),
    ('4° Primaria', '4° B', 'Celeste Guanco'),
    ('4° Primaria', '4° B', 'Franco Ayala'),
    ('4° Primaria', '4° B', 'Franco Díaz'),
    ('4° Primaria', '4° B', 'Germán Barbela'),
    ('4° Primaria', '4° B', 'Helena Ramos'),
    ('4° Primaria', '4° B', 'Juan Manuel Martínez'),
    ('4° Primaria', '4° B', 'Juan Martín Silva'),
    ('4° Primaria', '4° B', 'Julia Rodríguez'),
    ('4° Primaria', '4° B', 'Mateo Charlo'),
    ('4° Primaria', '4° B', 'Mateo Flocken'),
    ('4° Primaria', '4° B', 'Mateo Huvatt'),
    ('4° Primaria', '4° B', 'Máximo Ifrán'),
    ('4° Primaria', '4° B', 'Nicolás Rodríguez'),
    ('4° Primaria', '4° B', 'Oriana Laguna'),
    ('4° Primaria', '4° B', 'Paulina Scotti'),
    ('4° Primaria', '4° B', 'Rodrigo Gutiérrez'),
    ('4° Primaria', '4° B', 'Valentino Sirianni'),
    ('4° Primaria', '4° B', 'Vicente Santana'),
    # QUINTO A
    ('5° Primaria', '5° A', 'Bautista Olid'),
    ('5° Primaria', '5° A', 'Camilo Trabaglia'),
    ('5° Primaria', '5° A', 'Clara Aldabe'),
    ('5° Primaria', '5° A', 'Emilia González'),
    ('5° Primaria', '5° A', 'Emiliano Gil'),
    ('5° Primaria', '5° A', 'Eva Souza'),
    ('5° Primaria', '5° A', 'Federica Barrios'),
    ('5° Primaria', '5° A', 'Francesca Parietti'),
    ('5° Primaria', '5° A', 'Guillermina Ferraro'),
    ('5° Primaria', '5° A', 'Josefina Valdez'),
    ('5° Primaria', '5° A', 'Julieta Gómez'),
    ('5° Primaria', '5° A', 'Lara Da Silva'),
    ('5° Primaria', '5° A', 'Lucio Silva'),
    ('5° Primaria', '5° A', 'Mauro Bailón'),
    ('5° Primaria', '5° A', 'Paloma Da Silveira'),
    ('5° Primaria', '5° A', 'Pía Sáenz'),
    ('5° Primaria', '5° A', 'Santino Bandera'),
    ('5° Primaria', '5° A', 'Sofía Perini'),
    ('5° Primaria', '5° A', 'Valentina Vera'),
    ('5° Primaria', '5° A', 'Valentina Vilizio'),
    # QUINTO B
    ('5° Primaria', '5° B', 'Adrián Gerstenbluth'),
    ('5° Primaria', '5° B', 'Agustín Bengoa'),
    ('5° Primaria', '5° B', 'Alfonsina Barrios'),
    ('5° Primaria', '5° B', 'Bautista Greco'),
    ('5° Primaria', '5° B', 'Benjamín Suárez'),
    ('5° Primaria', '5° B', 'Guillermo Curbelo'),
    ('5° Primaria', '5° B', 'Guillermo Silveira'),
    ('5° Primaria', '5° B', 'Joaquina Fontán'),
    ('5° Primaria', '5° B', 'Juan Bautista Burgos'),
    ('5° Primaria', '5° B', 'Juan Martín Nogués'),
    ('5° Primaria', '5° B', 'Magalí Sodano'),
    ('5° Primaria', '5° B', 'Manuela García'),
    ('5° Primaria', '5° B', 'Martina Sagaría'),
    ('5° Primaria', '5° B', 'Milagros Neira'),
    ('5° Primaria', '5° B', 'Morena Blois'),
    ('5° Primaria', '5° B', 'Morena Scarone'),
    ('5° Primaria', '5° B', 'Olivia Monza'),
    ('5° Primaria', '5° B', 'Renzo Sanguinetti'),
    ('5° Primaria', '5° B', 'Santino Wolf'),
    ('5° Primaria', '5° B', 'Tomás Recalde'),
    ('5° Primaria', '5° B', 'Valentina Rodríguez'),
    ('5° Primaria', '5° B', 'Dereck Hampala'),
    # SEXTO A
    ('6° Primaria', '6° A', 'Augusto Ocaño'),
    ('6° Primaria', '6° A', 'Emilia Silva'),
    ('6° Primaria', '6° A', 'Emma Machado'),
    ('6° Primaria', '6° A', 'Federica Estiben'),
    ('6° Primaria', '6° A', 'Felipe Viera'),
    ('6° Primaria', '6° A', 'Florencia Erosa'),
    ('6° Primaria', '6° A', 'Joaquín Barboza'),
    ('6° Primaria', '6° A', 'Juan Manuel Linkimer'),
    ('6° Primaria', '6° A', 'Julieta Belora'),
    ('6° Primaria', '6° A', 'Julieta Sagaría'),
    ('6° Primaria', '6° A', 'Nahiara Bouissa'),
    ('6° Primaria', '6° A', 'Thiago Rodríguez'),
    ('6° Primaria', '6° A', 'Vicente Ceriliano'),
    ('6° Primaria', '6° A', 'Tomás Mato'),
    # SEXTO B
    ('6° Primaria', '6° B', 'Agustina Correa'),
    ('6° Primaria', '6° B', 'Agustina Umpierre'),
    ('6° Primaria', '6° B', 'Anahí Mora'),
    ('6° Primaria', '6° B', 'Bautista Clavería'),
    ('6° Primaria', '6° B', 'Delfina Araújo'),
    ('6° Primaria', '6° B', 'Isabel Moura'),
    ('6° Primaria', '6° B', 'María Belén Celentano'),
    ('6° Primaria', '6° B', 'Mateo González'),
    ('6° Primaria', '6° B', 'Rocío Castillo'),
    ('6° Primaria', '6° B', 'Santiago Moreira'),
    ('6° Primaria', '6° B', 'Teo Raggio'),
    ('6° Primaria', '6° B', 'Tomás Genta'),
    ('6° Primaria', '6° B', 'Luana Zayas')
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

raw_users = defaultdict(list)
for grade, group, name in students:
    fn, ln = split_name(name)
    fn_first_word = fn.split()[0]
    fn_c = clean(fn_first_word)
    fn_3 = fn_c[:3]
    
    ln_c = clean(ln)
    ln_3 = ln_c[:3]
    
    u = fn_3 + ln_3
    raw_users[u].append((name, grade, group, fn, ln))

print(f"Total alumnos: {len(students)}")
print(f"Total usuarios unicos generados inicialmente: {len(raw_users)}")
print("\n=== COLISIONES DETECTADAS CON 3 NOMBRE + 3 APELLIDO ===")
for u, list_s in sorted(raw_users.items()):
    if len(list_s) > 1:
        print(f"\nUsuario base '{u}' ({len(list_s)} alumnos):")
        for s in list_s:
            print(f"  * {s[0]} ({s[1]} - {s[2]}) [Nombre: {s[3]} | Apellido: {s[4]}]")
