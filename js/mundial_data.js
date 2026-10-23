/**
 * =============================================================
 * MUNDIAL_DATA.JS — BASE DE DATOS Y GESTIÓN DE FIGURITAS CPF 2026
 * Colegio Paulo Freire · Taller de Robótica & Programación
 * -------------------------------------------------------------
 * Vincula a los alumnos con sus cromos oficiales del Álbum Mundial:
 * https://roboticapaulofreire-uy.github.io/mundial/
 * =============================================================
 */

(function () {
  'use strict';

  var MUNDIAL_BASE_URL = 'https://roboticapaulofreire-uy.github.io/mundial/';

  // ── 232 ALUMNOS OFICIALES DEL ÁLBUM CPF ROBÓTICA MUNDIAL 2026 ──
  var MUNDIAL_ALUMNOS = [{"id":"5A-01","n":"Agustín Moreira","g":"5 años A","i":"img/5A/5A-01.png","d":"1z6VUx7Emu_I9cYku9ZReoAFevZrWTHS4"},{"id":"5A-02","n":"Agustina Inzaurralde","g":"5 años A","i":"img/5A/5A-02.png","d":"1_7D2nnlap4atN0vzuasVvCEcftIlgWmW"},{"id":"5A-03","n":"Bautista Viera","g":"5 años A","i":"img/5A/5A-03.png","d":"1wSFWSMy9H1slEKs8hIaaR5JY3xKv4KXL"},{"id":"5A-04","n":"Celina Rodríguez","g":"5 años A","i":"img/5A/5A-04.jpeg","d":"1SKiaGss6G1Yd0Lc7SjrVDqTCexEIg2Nc"},{"id":"5A-05","n":"Emiliano Turchich","g":"5 años A","i":"img/5A/5A-05.png","d":"1G3CzlBAyRZz1C6FqSTRrp2guwNZs2fq0"},{"id":"5A-06","n":"Facundo Pérez","g":"5 años A","i":"img/5A/5A-06.png","d":"1FsvfjEh05ju7AYkmmHvgYsRJ9U1pmRTH"},{"id":"5A-07","n":"Isabella Prieto","g":"5 años A","i":"img/5A/5A-07.png","d":"1Fj_r-_R6sWMpqmBTORORN1Gz0nyRQysA"},{"id":"5A-08","n":"Luciano Bautista","g":"5 años A","i":"img/5A/5A-08.png","d":"1emrNIhi89m_gyAd9RNAI-3rqmGQPltJB"},{"id":"5A-09","n":"Maite Amado","g":"5 años A","i":"img/5A/5A-09.png","d":"1WbTJ0ZkmXfi0NfaKDY31zpB_iKAFnqvs"},{"id":"5A-10","n":"Martina Pérez","g":"5 años A","i":"img/5A/5A-10.png","d":"1ibqhOORHuwho_R_7MSVvcAEOPjtsYMuC"},{"id":"5A-11","n":"Máximo Roade","g":"5 años A","i":"img/5A/5A-11.jpeg","d":"12I-BUyiG__dBXv90g2zQZeg695U1Y_Dx"},{"id":"5A-12","n":"Miranda Muniz","g":"5 años A","i":"img/5A/5A-12.png","d":"1UgbcCvTMMKJ3caiXUKFeuqR5G9HZqJoC"},{"id":"5B-01","n":"Agustín Suárez","g":"5 años B","i":"img/5B/5B-01.png","d":"1jYOu31fPyTZgNugp-4G-noympKzhx6W9"},{"id":"5B-02","n":"Facundo Peña","g":"5 años B","i":"img/5B/5B-02.png","d":"1CZcs-nKP4nWgTmrwv6u4YdPQ33QPBr7m"},{"id":"5B-03","n":"Faustina Castelar","g":"5 años B","i":"img/5B/5B-03.png","d":"1GZlHwCskKikWwCxIWrtuCCiM2JE2trhj"},{"id":"5B-04","n":"Faustina Tangredi","g":"5 años B","i":"img/5B/5B-04.jpeg","d":"1foxnUJugQ-I7mTDVqrT8XJEJz9e3Uhcs"},{"id":"5B-05","n":"Isabella Romano","g":"5 años B","i":"img/5B/5B-05.png","d":"1fijnMUZj_mdGnbbXJ5vWeBm0ibzgMcUA"},{"id":"5B-06","n":"Liam Abad","g":"5 años B","i":"img/5B/5B-06.jpeg","d":"1neaPF6mgnK3qyc9I5cT59aFWeI5p_r0a"},{"id":"5B-07","n":"Lola Machado","g":"5 años B","i":"img/5B/5B-07.png","d":"1K-BerAVImGU0V0rmY20Vpg9RxvtsKiej"},{"id":"5B-08","n":"Maite Garcilazo","g":"5 años B","i":"img/5B/5B-08.png","d":"1WpX6wVOHcKXThuZQfhTopIo_ETxJKqzR"},{"id":"5B-09","n":"Paulina Picos","g":"5 años B","i":"img/5B/5B-09.jpeg","d":"1i96sEUgEyDmgc80cUpuoQYQk8zmed_NI"},{"id":"5B-10","n":"Santino López","g":"5 años B","i":"img/5B/5B-10.png","d":"1igWu8Y7BPFVTYWfMeKiOdDEY0NjSZ0gi"},{"id":"5B-11","n":"Tomás Nogués","g":"5 años B","i":"img/5B/5B-11.png","d":"1NfsKLoHu9JSfy_WF_is01bq-q1EPZRx-"},{"id":"5B-12","n":"Valentino López","g":"5 años B","i":"img/5B/5B-12.png","d":"1CQDDQIzOCl-WCiaamP7-GfEMu2Jeh4JW"},{"id":"1A-01","n":"Amanda Padilla","g":"1ero A","i":"img/1A/1A-01.png","d":"1iNXg4C3sbvRkMXuolFPlIqUnpkYGeFtc"},{"id":"1A-02","n":"Antonia Liucci","g":"1ero A","i":"img/1A/1A-02.png","d":"1SPMes52ds5pDio7JgzE14WsFD900iL65"},{"id":"1A-03","n":"Bruno Peraza","g":"1ero A","i":"img/1A/1A-03.png","d":"1m6vEf9xXDDPdVbV0QHMWV1UDgfynmBK8"},{"id":"1A-04","n":"Enzo Rosano","g":"1ero A","i":"img/1A/1A-04.png","d":"1rAsfx-sQ9N0WKI_ICbISOQFp-EPIw86e"},{"id":"1A-05","n":"Facundo Bartel","g":"1ero A","i":"img/1A/1A-05.png","d":"149nF09EtDPqZ73FjxRYa9fidMYpbthKk"},{"id":"1A-06","n":"Federico Rodríguez","g":"1ero A","i":"img/1A/1A-06.png","d":"1U9J-Q2kJ8sxosQ20c0QmE4AKwFZTlvf2"},{"id":"1A-07","n":"Felipe Vodanovich","g":"1ero A","i":"img/1A/1A-07.png","d":"16NWLqAlEykzo7J0PFKaBXEbQim0hokd2"},{"id":"1A-08","n":"Pilar Paletta","g":"1ero A","i":"img/1A/1A-08.jpeg","d":"16ZY0TQ_ivkKCucowoUMSKZ8ysC3_wdOn"},{"id":"1A-09","n":"Juan Martín Vega","g":"1ero A","i":"img/1A/1A-09.png","d":"16P1W9YRAIc-gsOnkJ3H51nzNG2j7ouAP"},{"id":"1A-10","n":"Julia Fontán","g":"1ero A","i":"img/1A/1A-10.png","d":"1kCIDia1QlUc3mi5Ng0WlMF16V_-2G2ms"},{"id":"1A-11","n":"Julieta Feller","g":"1ero A","i":"img/1A/1A-11.png","d":"1S2oUHIoQqHEeP7F98jwgbOPd7Vu-86kB"},{"id":"1A-12","n":"Lua Colla","g":"1ero A","i":"img/1A/1A-12.png","d":"1wkokLOTiWwe0iRNd4iKS-QXFyDlF30t9"},{"id":"1A-13","n":"Nicolás Ricca","g":"1ero A","i":"img/1A/1A-13.png","d":"1VzqpTQWdEbPkvHFgDrSd-MqYaSduwE8E"},{"id":"1B-01","n":"Alfonso Orihuela","g":"1ero B","i":"img/1B/1B-01.jpeg","d":"1q9dj0NJ6C_8c0OCNa_JW06a2aFmYlDWs"},{"id":"1B-02","n":"Belén Rodríguez","g":"1ero B","i":"img/1B/1B-02.png","d":"1J-zF4nzipsDpLimdqjFopF8l3IoycjsH"},{"id":"1B-03","n":"Benjamín Fonseca","g":"1ero B","i":"img/1B/1B-03.jpeg","d":"1Ke0NnbJTmv01W9DgMA9DqwYKJxOSTb5T"},{"id":"1B-04","n":"Benjamín Kardjian","g":"1ero B","i":"img/1B/1B-04.jpeg","d":"12EnuZc3kzmPWketaW4hr6PAKjVk1ToRy"},{"id":"1B-05","n":"Emilia Denis","g":"1ero B","i":"img/1B/1B-05.png","d":"1SU2TmEIXl1Rlsn19rzdNsm8cDfpaFXyz"},{"id":"1B-06","n":"Ezequiel Wolf","g":"1ero B","i":"img/1B/1B-06.png","d":"1t5J5LCAXvkbdJsh232l56xKQ8NGrfD5g"},{"id":"1B-07","n":"Joaquín Cabrera","g":"1ero B","i":"img/1B/1B-07.png","d":"1S7t0Q94rHHhCPQjEU09JJzL2zTsaBk1g"},{"id":"1B-08","n":"Joaquín Silva","g":"1ero B","i":"img/1B/1B-08.png","d":"1qDdTZrjNwzMgar0iTlKVQlZvIhTvuAF9"},{"id":"1B-09","n":"Julieta Suárez","g":"1ero B","i":"img/1B/1B-09.jpeg","d":"1yT_J2BV5_1VIyT2OSaOMlhV8qTc-herB"},{"id":"1B-10","n":"Maite Altez","g":"1ero B","i":"img/1B/1B-10.png","d":"1rFlcltfATgnnVtKGJ1fC5YYGyFbLnrWU"},{"id":"1B-11","n":"Nahuel Devicenzi","g":"1ero B","i":"img/1B/1B-11.png","d":"1Iu-utYl5SX1sd5SCPu_wTkUbe9UL80OU"},{"id":"1B-12","n":"Pilar Ruiz","g":"1ero B","i":"img/1B/1B-12.png","d":"1VkNnF_VhnlChOPb8DhLmgjHFvJgOsowz"},{"id":"1B-13","n":"Renata Marzán","g":"1ero B","i":"img/1B/1B-13.png","d":"13IJTQNrzPW21B6J8OEwjY1hpv4IOiWSj"},{"id":"1B-14","n":"Santino Marcher","g":"1ero B","i":"img/1B/1B-14.png","d":"1XvPytgcjKUmH9b8xmAUIZkDi3KGx8wzZ"},{"id":"2A-01","n":"Lorenzo Bo","g":"2do A","i":"img/2A/2A-01.png","d":"1NdOE7Z3MJzWMV2MdgcWm2vaG7TZ3UK5F"},{"id":"2A-02","n":"Mora Bracesco","g":"2do A","i":"img/2A/2A-02.png","d":"1xeSSBZ_fO3BqCQXBJe061jg4nBeAMUbA"},{"id":"2A-03","n":"Emma Duarte","g":"2do A","i":"img/2A/2A-03.png","d":"1Hr6Rtnl42LmLfmEmRCWxe34yncqzF7js"},{"id":"2A-04","n":"Mateo Franco","g":"2do A","i":"img/2A/2A-04.png","d":"1vbsFuEuRAoh_8RWG9AAWpQ7iGwHT-GBQ"},{"id":"2A-05","n":"Josefina Hernández","g":"2do A","i":"img/2A/2A-05.png","d":"1n2TgXU6h3VpWPnnEjtssb0jxouzzfyXb"},{"id":"2A-06","n":"Bruno Moreira","g":"2do A","i":"img/2A/2A-06.png","d":"1hlOpVUwxAPAzHlcV5ELluRR97qPdHUJh"},{"id":"2A-07","n":"Salvador Parodi","g":"2do A","i":"img/2A/2A-07.png","d":"1xmBjf5J0U7ka6XUejH2dUuMUvUoVs0gL"},{"id":"2A-08","n":"Karly Pedraza","g":"2do A","i":"img/2A/2A-08.png","d":"1Cl77YPCFbs6wWlVTYP_TQ1HTeu_ilLsm"},{"id":"2A-09","n":"Mariana Pérez","g":"2do A","i":"img/2A/2A-09.png","d":"1efbTYYEmX_rofWd6lzODCOrtQcV0wRSH"},{"id":"2A-10","n":"Benjamín Rivas","g":"2do A","i":"img/2A/2A-10.png","d":"16LP8GTs9DS1mJQKQJaZU4tR2Pkg3n0--"},{"id":"2A-11","n":"Ciro Rodríguez","g":"2do A","i":"img/2A/2A-11.png","d":"1eDYKUVQIr0oghQdwEx-_0xrKjF5clnE0"},{"id":"2A-12","n":"Federico Silveira","g":"2do A","i":"img/2A/2A-12.png","d":"1UsiiipdtXAMQBHOqwZcZBbgW6gxLD1NK"},{"id":"2A-13","n":"Olivia Taglioretti","g":"2do A","i":"img/2A/2A-13.png","d":"1FaFr2E8Fyd0BzwMHGlZQ9iDU5k0Upb4u"},{"id":"2A-14","n":"Delfina Tolve","g":"2do A","i":"img/2A/2A-14.png","d":"1i7yNLpXEQ66_L2zq7soTic1yiFK6F4Zv"},{"id":"2A-15","n":"Matías Traverso","g":"2do A","i":"img/2A/2A-15.png","d":"1Gs-kvQXqKWqttfEe3cmVaPULvlhGrdft"},{"id":"2A-16","n":"Guillermina Vidal","g":"2do A","i":"img/2A/2A-16.png","d":"1I3MXLiYuTQPk7kM1V4wCPX6Ejuo2XJmF"},{"id":"2A-17","n":"Joaquín Viera","g":"2do A","i":"img/2A/2A-17.png","d":"1mxUH_hJmILI8yscYnW3e8-Dv_-bILewn"},{"id":"2B-01","n":"Manuel Arbiza","g":"2do B","i":"img/2B/2B-01.png","d":"15CFnwjHVXYA3ZI5VQNlTxU3Z_Zs3eyb5"},{"id":"2B-02","n":"Julieta Bailón","g":"2do B","i":"img/2B/2B-02.png","d":"1AQLYl5R1M5Mk4JohYrs5O0L1TPTS0KgB"},{"id":"2B-03","n":"Lia Cabrera","g":"2do B","i":"img/2B/2B-03.png","d":"1l9bWt_bgLUTKetQ41qi-uX-tv0rPTm5R"},{"id":"2B-04","n":"Enzo Ferrari","g":"2do B","i":"img/2B/2B-04.png","d":"18hfj-cd3HwvTjIg4iy__5CSEwcslvgiD"},{"id":"2B-05","n":"Piero Fernández","g":"2do B","i":"img/2B/2B-05.png","d":"171Yfqn_MdHwbpds1d5BgA2ourGFicLBG"},{"id":"2B-06","n":"Salvador Franco","g":"2do B","i":"img/2B/2B-06.png","d":"19eP82hbiAVXNXawvfqgtXEWvYbvN21fl"},{"id":"2B-07","n":"Tomás Fuica","g":"2do B","i":"img/2B/2B-07.png","d":"1ktSKN98C9EJm3Uaqye5-c98GAjkhm57z"},{"id":"2B-08","n":"Joaquín Islas","g":"2do B","i":"img/2B/2B-08.png","d":"17Cz-8wyGOIxGScnhEcpQNzcZT2bXVBYv"},{"id":"2B-09","n":"Alma Murillo","g":"2do B","i":"img/2B/2B-09.png","d":"1knAw9JunLmKBSv8DmaFL3fSeI__qgpfs"},{"id":"2B-10","n":"Francesca Navone","g":"2do B","i":"img/2B/2B-10.png","d":"1dtLnknZr73KbzJyS7PNId_euGieuETNI"},{"id":"2B-11","n":"Francesca Pedemonte","g":"2do B","i":"img/2B/2B-11.png","d":"1U32Hlu6Bf6nmzCsoA2uzs5y0FgGLzO4F"},{"id":"2B-12","n":"Ignacio Picos","g":"2do B","i":"img/2B/2B-12.png","d":"1tRcSjxBZfYhYbCyaR6gYTm6I2b_gGYg1"},{"id":"2B-13","n":"Julieta Rocha","g":"2do B","i":"img/2B/2B-13.png","d":"1Jfb65b8s-Ss6c13helORvlKVmI5dYkPF"},{"id":"2B-14","n":"Lautaro Rosamén","g":"2do B","i":"img/2B/2B-14.png","d":"1mEgVjigMSBqkcgeRxMlH39Ig1VkdR79g"},{"id":"2B-15","n":"Federica Sarubbo","g":"2do B","i":"img/2B/2B-15.png","d":"1mR-vX7m4d6wSbEqeWgglQMVoVZaLalsr"},{"id":"2B-16","n":"Tomás Stolfi","g":"2do B","i":"img/2B/2B-16.png","d":"1FOqSm1G0PAoFMqwitWhTzaK1E_V1lpTg"},{"id":"2B-17","n":"Antonella Taglioretti","g":"2do B","i":"img/2B/2B-17.png","d":"1br-BXkpj2zLGKk9-J-JrQ7gniiWcFuRO"},{"id":"2B-18","n":"Belén Peralta","g":"2do B","i":"img/2B/2B-18.png","d":"1600PtlZYTyFCO3jIdj6YiH1l29NV2wj4"},{"id":"3A-01","n":"Amanda Castagnin","g":"3ero A","i":"img/3A/3A-01.png","d":"1rHbzAJryyDHkEsyamI5fhb2ITvTG-aTL"},{"id":"3A-02","n":"Amelia Amado","g":"3ero A","i":"img/3A/3A-02.png","d":"1XMeLj0BMBL7WVO3rniFa61z19i3TuU6t"},{"id":"3A-03","n":"Benicio Ocaño","g":"3ero A","i":"img/3A/3A-03.png","d":"1sq0fgBW3QoE5T6cTPbJ4qincITsQ5Pjy"},{"id":"3A-04","n":"Benjamín Wilkins","g":"3ero A","i":"img/3A/3A-04.png","d":"1X_eePsVQzUlRSnfOcyN7oOW6nNLM1Tj1"},{"id":"3A-05","n":"Delfina Cabeza","g":"3ero A","i":"img/3A/3A-05.png","d":"10vAOyYYIfe284xJaGIpR4wCCmTyat5vb"},{"id":"3A-06","n":"Facundo Di Corcia","g":"3ero A","i":"img/3A/3A-06.jpeg","d":"1Tq10HSRfOvG7resDvNAREhm5144OGNkV"},{"id":"3A-07","n":"Francesca Miño","g":"3ero A","i":"img/3A/3A-07.jpeg","d":"1Daym7AXyQeZe0_HTqpDTKTslMwJAKwxb"},{"id":"3A-08","n":"Joaquín Delgado","g":"3ero A","i":"img/3A/3A-08.png","d":"1-BfBGEjAVrATZ12J35g96ZGx6e4vjdYV"},{"id":"3A-09","n":"Joaquín González","g":"3ero A","i":"img/3A/3A-09.png","d":"1LZbE4h3NXNBSDw6PFD_QIUxg9h05SvpT"},{"id":"3A-10","n":"Joaquín Mascaró","g":"3ero A","i":"img/3A/3A-10.png","d":"1Sf0bFjHBUSy6HLVtfsUDqDUtNlNuvme8"},{"id":"3A-11","n":"Juan Martín González","g":"3ero A","i":"img/3A/3A-11.png","d":"1MWgsUrRHOVAtC1ax9KQpFwvMZeSnFfUD"},{"id":"3A-12","n":"Juan Martín Peraza","g":"3ero A","i":"img/3A/3A-12.png","d":"1UjSliJeoJe9IltxQGqzVEVL8q8BUUEG_"},{"id":"3A-13","n":"Martina González","g":"3ero A","i":"img/3A/3A-13.png","d":"1FboZ9y2uaJEJPC6gmXajTPc5G1ZD4AaQ"},{"id":"3A-14","n":"Nahuel Bouissa","g":"3ero A","i":"img/3A/3A-14.png","d":"1wa44OpeJlw7WuOwXQluaNJa3ppboMAQ8"},{"id":"3A-15","n":"Salvador Liucci","g":"3ero A","i":"img/3A/3A-15.png","d":"1ScrH4kErSsqeeAn6Y3zmBBVdKNiHc34t"},{"id":"3A-16","n":"Tiziano Castro","g":"3ero A","i":"img/3A/3A-16.png","d":"1F2bQsR8uxxGvQBo7EfmSmUKRGQUGV5K7"},{"id":"3A-17","n":"Valentina Peña","g":"3ero A","i":"img/3A/3A-17.png","d":"1L5nSVb15twGJl2YZt36HNUkN1Lf5UVQQ"},{"id":"3A-18","n":"Zoe Lambach","g":"3ero A","i":"img/3A/3A-18.png","d":"1FeyDYrjBqdniaMK5gt609sEJ76cvZ7y5"},{"id":"3B-01","n":"Agustín Cobas","g":"3ero B","i":"img/3B/3B-01.png","d":"1s_wawI4OQM281-dwWQYyO1XcLvTjYIhC"},{"id":"3B-02","n":"Delfina Castelar","g":"3ero B","i":"img/3B/3B-02.png","d":"1T-sS7Dp5aKW_5B1_6KB5oZsCd7R-fWW-"},{"id":"3B-03","n":"Diego Méndez","g":"3ero B","i":"img/3B/3B-03.png","d":"17uUqJi4HIBr2l5iVAoqVpHsNFxD6N3Eh"},{"id":"3B-04","n":"Emma Castro","g":"3ero B","i":"img/3B/3B-04.png","d":"1JcXqYJWB5sLd7vkWxSya9Db5PvnkKB_P"},{"id":"3B-05","n":"Eugenia Castagnin","g":"3ero B","i":"img/3B/3B-05.png","d":"1rKWMvmtcI2IJ05CobeKstRl-liLtWYEl"},{"id":"3B-06","n":"Felipe Marchesano","g":"3ero B","i":"img/3B/3B-06.jpeg","d":"1JPioNwYeR2rSg-SepNqifs3k946ONAuS"},{"id":"3B-07","n":"Guillermo Villamil","g":"3ero B","i":"img/3B/3B-07.png","d":"15O5lZwzerDKlnBz7SnJa1qzelL6zsW4k"},{"id":"3B-08","n":"Joaquín Belora","g":"3ero B","i":"img/3B/3B-08.png","d":"126oBt6KRJA-0tjN7reJnqinHRWAhZMFq"},{"id":"3B-09","n":"Joaquín Bengoa","g":"3ero B","i":"img/3B/3B-09.png","d":"1KDbft1E-yuN8S98nrLk_lw_zetpBahKJ"},{"id":"3B-10","n":"Juan Manuel Curbelo","g":"3ero B","i":"img/3B/3B-10.jpeg","d":"1C60qD2d_S6mw1YiEhH17tt1SDC5SGAAx"},{"id":"3B-11","n":"Lautaro Mariño","g":"3ero B","i":"img/3B/3B-11.jpeg","d":"1_WqZ8Gtqv8tVckXNw32P_02MjJA8ab3J"},{"id":"3B-12","n":"Lucas Rodríguez","g":"3ero B","i":"img/3B/3B-12.png","d":"1-4tzuedA77FyZk_b82S2FHaPj2YFRsNa"},{"id":"3B-13","n":"Luna Llorach","g":"3ero B","i":"img/3B/3B-13.png","d":"1Ai4Llt9XQOAy-LAhlBNTrjFJvQ-dTw6y"},{"id":"3B-14","n":"Mateo Gutiérrez","g":"3ero B","i":"img/3B/3B-14.png","d":"1Kcd5BnGuoubefBuX1UeUSq_mClYWb-gK"},{"id":"3B-15","n":"Mía Mascaró","g":"3ero B","i":"img/3B/3B-15.png","d":"1isvLAjV059V3RjPCQ48JYYBXloWcM682"},{"id":"3B-16","n":"Olivia Zayas","g":"3ero B","i":"img/3B/3B-16.png","d":"11R7XSAHV711sLE1HRua0avy_NWxOoud6"},{"id":"3B-17","n":"Pía Inzaurralde","g":"3ero B","i":"img/3B/3B-17.jpeg","d":"1CN2YEuRflYwfssjVs1rZgXB8_QGruVaZ"},{"id":"3B-18","n":"Piero Canina","g":"3ero B","i":"img/3B/3B-18.png","d":"1FwJOoYsK39OYGX9bV9NhTTEkdKkZwYcr"},{"id":"4A-01","n":"Abel Rodríguez","g":"4to A","i":"img/4A/4A-01.jpeg","d":"1z9Ac6i-eHhCtaotMdUfzvO9ND24ZSUc1"},{"id":"4A-02","n":"Antonella Calcelia","g":"4to A","i":"img/4A/4A-02.png","d":"1eDdY1xRZkw6OD5UHOK_tGompP1Kx8AV_"},{"id":"4A-03","n":"Benjamín Dos Santos","g":"4to A","i":"img/4A/4A-03.png","d":"1MSyCZ0Odhu1s10O8D8facY4Vy5294xRs"},{"id":"4A-04","n":"Bruna Fernández","g":"4to A","i":"img/4A/4A-04.jpeg","d":"14l1BAO12KdHA6kkCRIc1RyhxKcAadQ7D"},{"id":"4A-05","n":"Catalina Barreiro","g":"4to A","i":"img/4A/4A-05.png","d":"1K3hgUFnWRhbx-NRq-jv4fXP0uVImEdM_"},{"id":"4A-06","n":"Delfina Ripoll","g":"4to A","i":"img/4A/4A-06.png","d":"1KSwMpKi8NWoUNoOxpHYmu8Ti5XwXolwj"},{"id":"4A-07","n":"Fausto Villasante","g":"4to A","i":"img/4A/4A-07.png","d":"153lxRY6Z_i2f60shzprKOwk0btJg6kHz"},{"id":"4A-08","n":"Francisco Bustamante","g":"4to A","i":"img/4A/4A-08.png","d":"1udEJFbNvg6j7SZ6gnn3lBL2uRH5ORZnO"},{"id":"4A-09","n":"Franco Schiavone","g":"4to A","i":"img/4A/4A-09.jpeg","d":"1dLw9fp6o83J1It9f2lcncCT3_DnH3qvW"},{"id":"4A-10","n":"Germán Berger","g":"4to A","i":"img/4A/4A-10.png","d":"1f1O22emIaGSGEbfy_1Hvs2j0sZ_Yqrro"},{"id":"4A-11","n":"Gerónimo Rocha","g":"4to A","i":"img/4A/4A-11.png","d":"1xPY5g_whtCorI5uWYKrcycHi4-AGgTqC"},{"id":"4A-12","n":"Josefina Fittipaldi","g":"4to A","i":"img/4A/4A-12.png","d":"1CAwQJNNWcPoVVAjVIn8GlGqE4pnEnT71"},{"id":"4A-13","n":"Juan Modernell","g":"4to A","i":"img/4A/4A-13.png","d":"1nXv0YnM9XRfABrlh0miKhKfWzJQpGG88"},{"id":"4A-14","n":"Julia Ruiz","g":"4to A","i":"img/4A/4A-14.png","d":"1aLGsar7qZke0bsgTFCGnpvF2FAlSrKF9"},{"id":"4A-15","n":"Lautaro Bresciani","g":"4to A","i":"img/4A/4A-15.png","d":"1EwV53Ph5cEOvkRzvRrvdNWXIjOyTCs2y"},{"id":"4A-16","n":"Lautaro Guasque","g":"4to A","i":"img/4A/4A-16.png","d":"1n6fD3PDUwes0jp4erXbCSdslbnk13X4D"},{"id":"4A-17","n":"Manuel Gigirey","g":"4to A","i":"img/4A/4A-17.png","d":"1Zcl0NK_lo3uziGmsunYWAFzfl0kcaQZJ"},{"id":"4A-18","n":"Renzo Silva","g":"4to A","i":"img/4A/4A-18.png","d":"1gX67v4cgDTsRlo8W6SnqG3i5w4WFcbSL"},{"id":"4A-19","n":"Tomás Tangredi","g":"4to A","i":"img/4A/4A-19.png","d":"15jlLtuIBBZLg0GH0ijQSnshF9TnCSUlz"},{"id":"4A-20","n":"Valentino Morena","g":"4to A","i":"img/4A/4A-20.png","d":"1PYDndXsA7Hkg-jjLmdU9-B_1PghLLy89"},{"id":"4B-01","n":"Agustín Clavijo","g":"4to B","i":"img/4B/4B-01.jpeg","d":"15g0OfXQoYKZNfKSF8oMTB1_7-acbUreh"},{"id":"4B-02","n":"Bastian Corbo","g":"4to B","i":"img/4B/4B-02.png","d":"1K5sm1_G7DFZU4wvcYVsVrpNnsaeVThls"},{"id":"4B-03","n":"Candela Sagaría","g":"4to B","i":"img/4B/4B-03.png","d":"1vqjvQWDOtjo5i4nFX3BgSm6StAcoLRD3"},{"id":"4B-04","n":"Celeste Guanco","g":"4to B","i":"img/4B/4B-04.png","d":"1ie4yKIQIMMVTakeyYc0FIkSKb57MnoDs"},{"id":"4B-05","n":"Franco Ayala","g":"4to B","i":"img/4B/4B-05.png","d":"1K81h7zG4ezlhTbbWKopxnoGwdTq6OSEn"},{"id":"4B-06","n":"Franco Díaz","g":"4to B","i":"img/4B/4B-06.png","d":"1Ay4OeQBmptmjwqDU34nQluARilQOGll6"},{"id":"4B-07","n":"Germán Barbela","g":"4to B","i":"img/4B/4B-07.png","d":"1qydjf1AL8u8r11xh4eUFbmQY0iUCMmaf"},{"id":"4B-08","n":"Helena Ramos","g":"4to B","i":"img/4B/4B-08.png","d":"1P_G3mxDr2S7UQDVhd0V3CrbODqi431qG"},{"id":"4B-09","n":"Juan Manuel Martínez","g":"4to B","i":"img/4B/4B-09.png","d":"1Pe8vxvMiHVuKYCg0kcvJqrxi22Jwd36A"},{"id":"4B-10","n":"Juan Martín Silva","g":"4to B","i":"img/4B/4B-10.png","d":"1kFPNrDkz86M1XOlb8GG3_Vq95Rx7yCiI"},{"id":"4B-11","n":"Julia Rodríguez","g":"4to B","i":"img/4B/4B-11.png","d":"1GQ6cW5WLvKay88S7wEExYoDuwfGZHst1"},{"id":"4B-12","n":"Mateo Charlo","g":"4to B","i":"img/4B/4B-12.png","d":"16TcHlKum9kA8nFRTVzaSncdxpSklsGSC"},{"id":"4B-13","n":"Mateo Flocken","g":"4to B","i":"img/4B/4B-13.png","d":"1QzNxm45SZZCwn-QfbdZy0tvrcXz8-QbE"},{"id":"4B-14","n":"Mateo Huvatt","g":"4to B","i":"img/4B/4B-14.png","d":"1EwG2931wR0VxlHbknvDOzKOXBS-iFIYu"},{"id":"4B-15","n":"Máximo Ifrán","g":"4to B","i":"img/4B/4B-15.png","d":"1pCyCvIyM_oHyiwGaWydySmWk1n-t3PbY"},{"id":"4B-16","n":"Nicolás Rodríguez","g":"4to B","i":"img/4B/4B-16.png","d":"1olHhw4ICanwesvY-YpjznvSdik0UESdm"},{"id":"4B-17","n":"Oriana Laguna","g":"4to B","i":"img/4B/4B-17.png","d":"1ZTR80-dbzFOk5Vr0x9ye8YVMcneAB38X"},{"id":"4B-18","n":"Paulina Scotti","g":"4to B","i":"img/4B/4B-18.png","d":"1qzVK1r7ualydtLv804UgIS3gaRo_baib"},{"id":"4B-19","n":"Rodrigo Gutiérrez","g":"4to B","i":"img/4B/4B-19.png","d":"1mxiOGISOcFv03XPkt0mR5bvt0aVF2j-u"},{"id":"4B-20","n":"Valentino Sirianni","g":"4to B","i":"img/4B/4B-20.png","d":"1Fr-jwhmg7wictUSGmritmnuL1ho4JeNO"},{"id":"4B-21","n":"Vicente Santana","g":"4to B","i":"img/4B/4B-21.png","d":"1sAzB0nXuwLgrzo5vEBvtlwS6-_F4yHrx"},{"id":"5PA-01","n":"Bautista Olid","g":"5to A","i":"img/5PA/5PA-01.png","d":"1JNNWHwuawZM7_lqM3an5iYw0H4b3VXOz"},{"id":"5PA-02","n":"Camilo Trabaglia","g":"5to A","i":"img/5PA/5PA-02.png","d":"151HxLbczarR21pOAqEq7I6idAOH8aao7"},{"id":"5PA-03","n":"Clara Aldabe","g":"5to A","i":"img/5PA/5PA-03.jpeg","d":"1soXrmgc-XT825Hop3dGXNuXVgDudncF9"},{"id":"5PA-04","n":"Emilia González","g":"5to A","i":"img/5PA/5PA-04.png","d":"1mxJW6MUqzqTHTno-22wCdFrfdVSiUcBa"},{"id":"5PA-05","n":"Emiliano Gil","g":"5to A","i":"img/5PA/5PA-05.png","d":"1lKP5hsEEyNbusTnrhLK8JHjntxnEjprz"},{"id":"5PA-06","n":"Eva Souza","g":"5to A","i":"img/5PA/5PA-06.png","d":"1I8YeZQ2nWRbokZRBEB5HTlap7wAnrb3N"},{"id":"5PA-07","n":"Federica Barrios","g":"5to A","i":"img/5PA/5PA-07.png","d":"1-N8GdVgsIoll2-ElwL2WyEO5dvoTvARo"},{"id":"5PA-08","n":"Francesca Parietti","g":"5to A","i":"img/5PA/5PA-08.jpeg","d":"15_lraap5kBfdVUPDBrXgJRssvb1RZPQE"},{"id":"5PA-09","n":"Guillermina Ferraro","g":"5to A","i":"img/5PA/5PA-09.png","d":"1U2sIIiPGI_3addw_Y7nA7Uk1hp0tw9Gd"},{"id":"5PA-10","n":"Josefina Valdez","g":"5to A","i":"img/5PA/5PA-10.png","d":"17QpDPpZI5ZPATimllCDMk18XyZdm6x1K"},{"id":"5PA-11","n":"Julieta Gómez","g":"5to A","i":"img/5PA/5PA-11.png","d":"1tfB-fVa0rz9mk8KU39cT1HjJi6hV6XU0"},{"id":"5PA-12","n":"Lara Da Silva","g":"5to A","i":"img/5PA/5PA-12.png","d":"1JP0fUJD_dFXi4ByT8EKU3aZdi2jEmHqE"},{"id":"5PA-13","n":"Lucio Silva","g":"5to A","i":"img/5PA/5PA-13.png","d":"1-5EWFhuyadU5D4Q8msnTlKg9up1tNRaI"},{"id":"5PA-14","n":"Mauro Bailón","g":"5to A","i":"img/5PA/5PA-14.png","d":"13q4UTbYRx0Hwd77WhAUBJGHm6x-a8y4B"},{"id":"5PA-15","n":"Paloma Da Silveira","g":"5to A","i":"img/5PA/5PA-15.jpeg","d":"1KHv9MShiiTiGr29s3MUN4sjSaMITwgZX"},{"id":"5PA-16","n":"Pía Sáenz","g":"5to A","i":"img/5PA/5PA-16.png","d":"1Z1xyH2b9ZtEqjkHNFYvokn0vY6gaIYs5"},{"id":"5PA-17","n":"Santino Bandera","g":"5to A","i":"img/5PA/5PA-17.png","d":"1YS3Mi3wd4f7urkooRuawe7UdjlxM9WDA"},{"id":"5PA-18","n":"Sofía Perini","g":"5to A","i":"img/5PA/5PA-18.png","d":"1BZEeh5yeBQ9N15ECnwVMhU9yqeNYZdwm"},{"id":"5PA-19","n":"Valentina Vera","g":"5to A","i":"img/5PA/5PA-19.png","d":"1nuInZS7J0xpCYxqHFVK9xCspX0T3qRcp"},{"id":"5PA-20","n":"Valentina Vilizio","g":"5to A","i":"img/5PA/5PA-20.png","d":"1nX9OyVIqLTSrXqNWSCYu-Yesyh-cvczB"},{"id":"5PB-01","n":"Adrián Gerstenbluth","g":"5to B","i":"img/5PB/5PB-01.png","d":"1gUpiCIYz_zy60IzEzSNjMKng7PDE3EB7"},{"id":"5PB-02","n":"Agustín Bengoa","g":"5to B","i":"img/5PB/5PB-02.jpeg","d":"1IPNi5E3zabvOeuelgGrbi6_kvFOb8J2r"},{"id":"5PB-03","n":"Alfonsina Barrios","g":"5to B","i":"img/5PB/5PB-03.jpeg","d":"1bHWH4nTM3v_5KQA78O8e9LCIzRgBfVSL"},{"id":"5PB-04","n":"Bautista Greco","g":"5to B","i":"img/5PB/5PB-04.jpeg","d":"1QmIl3AWSRW4ocnIBSlL0rPuo9Amb7XKw"},{"id":"5PB-05","n":"Benjamín Suárez","g":"5to B","i":"img/5PB/5PB-05.png","d":"1otPOx3j9V3eCiWo2b014tvPE_LH3s_Wb"},{"id":"5PB-06","n":"Guillermo Curbelo","g":"5to B","i":"img/5PB/5PB-06.png","d":"1lg6RMzXCbFb5e7cn-nMotVY3cDqwva5l"},{"id":"5PB-07","n":"Guillermo Silveira","g":"5to B","i":"img/5PB/5PB-07.jpeg","d":"14A5xVCWfBxV-_Vi06QimJhOciqHVIPD4"},{"id":"5PB-08","n":"Joaquina Fontán","g":"5to B","i":"img/5PB/5PB-08.jpeg","d":"1C0TeDFvGAMtDm61Nt-s425itt3T7Cg-X"},{"id":"5PB-09","n":"Juan Bautista Burgos","g":"5to B","i":"img/5PB/5PB-09.png","d":"1-utdms0dEaWOMTPXdG9nYGFW_aaeydsg"},{"id":"5PB-10","n":"Juan Martín Nogués","g":"5to B","i":"img/5PB/5PB-10.png","d":"1KPVR8KVACWlIiu-38osFq4Ol3kxVf2Sw"},{"id":"5PB-11","n":"Magalí Sodano","g":"5to B","i":"img/5PB/5PB-11.jpeg","d":"1jUeFSKpft9bT00R04J5irHZskeA8ZVMr"},{"id":"5PB-12","n":"Manuela García","g":"5to B","i":"img/5PB/5PB-12.jpeg","d":"18N1oPRtX_LFKZ8CQglWMqX6-nYSrElgi"},{"id":"5PB-13","n":"Martina Sagaría","g":"5to B","i":"img/5PB/5PB-13.jpeg","d":"1Id4Mn6piib1_1OJQ13YbhJp_K1S5iA8K"},{"id":"5PB-14","n":"Milagros Neira","g":"5to B","i":"img/5PB/5PB-14.png","d":"1P7SlHUl8WuXd4pThP9DF2AfynARxpOLb"},{"id":"5PB-15","n":"Morena Blois","g":"5to B","i":"img/5PB/5PB-15.jpeg","d":"1aDOD9E8YDTI79PXS9DJbZyXUGjw-77EA"},{"id":"5PB-16","n":"Morena Scarone","g":"5to B","i":"img/5PB/5PB-16.png","d":"1WexngtxsEGuQCzMr2a3ArxMsabQ-VhvE"},{"id":"5PB-17","n":"Olivia Monza","g":"5to B","i":"img/5PB/5PB-17.jpeg","d":"1VXBJcT-B_CnWqx2hdwq3VfB3c4XiOImW"},{"id":"5PB-18","n":"Renzo Sanguinetti","g":"5to B","i":"img/5PB/5PB-18.jpeg","d":"1Trege5_Hvfyz75IE6xol_p4YY9HsG1k2"},{"id":"5PB-19","n":"Santino Wolf","g":"5to B","i":"img/5PB/5PB-19.jpeg","d":"1FqWX-fCHiFZkiGVzLZ0A0p5XCZdTM1eD"},{"id":"5PB-20","n":"Tomás Recalde","g":"5to B","i":"img/5PB/5PB-20.jpeg","d":"1mmLlxGBnjqe9Yq1rfqZaKrJIvHF0-OY1"},{"id":"5PB-21","n":"Valentina Rodríguez","g":"5to B","i":"img/5PB/5PB-21.png","d":"1L2dxY7mFw5XTQU4Dtc6CtJWb7nsS7AkG"},{"id":"5PB-22","n":"Dereck Hampala","g":"5to B","i":"img/5PB/5PB-22.jpeg","d":"1EcbhzOfef1Yo1sBjYfDIOOzC6Now4f3o"},{"id":"6A-01","n":"Augusto Ocaño","g":"6to A","i":"img/6A/6A-01.png","d":"1oMMeIO-eUyaiClupk_X_0bs2GZInSf69"},{"id":"6A-02","n":"Emilia Silva","g":"6to A","i":"img/6A/6A-02.png","d":"1PpF7LwRJ67KHJydfI2Od5CC8a1m05MEn"},{"id":"6A-03","n":"Emma Machado","g":"6to A","i":"img/6A/6A-03.png","d":"1eS7BfELQrHMuWZT_7fH7b2yrlXQvdtiX"},{"id":"6A-04","n":"Federica Estiben","g":"6to A","i":"img/6A/6A-04.png","d":"198X0JmkPyFjGznRxcaLr6XK_VLUZI-5n"},{"id":"6A-05","n":"Felipe Viera","g":"6to A","i":"img/6A/6A-05.png","d":"1GiE4_lvi60XejcsWokClGWlJiyQSNuo6"},{"id":"6A-06","n":"Florencia Erosa","g":"6to A","i":"img/6A/6A-06.png","d":"1iJblxPQa6hotPEVXBf9af7--mgz-Nn-J"},{"id":"6A-07","n":"Joaquín Barboza","g":"6to A","i":"img/6A/6A-07.png","d":"1pEuwbw6Q6Z7Usg3Ssxu6cKmheHFgkNyl"},{"id":"6A-08","n":"Juan Manuel Linkimer","g":"6to A","i":"img/6A/6A-08.png","d":"1ceFja8ensGVTEyPAtwaQ4s0xhVMhPCII"},{"id":"6A-09","n":"Julieta Belora","g":"6to A","i":"img/6A/6A-09.png","d":"1P1KFdpRsTDGdnhyTr7KnERPG-W-a144d"},{"id":"6A-10","n":"Julieta Sagaría","g":"6to A","i":"img/6A/6A-10.png","d":"1noM6HKCduBN4CXYWXz86ApOOEBo8ZyEp"},{"id":"6A-11","n":"Nahiara Bouissa","g":"6to A","i":"img/6A/6A-11.png","d":"1PtOqvYHiA9eIzj-RzpbAuZgYqFNes5cr"},{"id":"6A-12","n":"Thiago Rodríguez","g":"6to A","i":"img/6A/6A-12.png","d":"1mHdNbIRltdwCq5g2TJ1ozD6j3Sjcaywr"},{"id":"6A-13","n":"Vicente Ceriliano","g":"6to A","i":"img/6A/6A-13.png","d":"1ZigWpmow5-pm3ekmmt6s5MX9FMzVaG1-"},{"id":"6A-14","n":"Tomás Mato","g":"6to A","i":"img/6A/6A-14.png","d":"1TrtTdpjVYwUTE-d6eFw3YUoyLuFVcXQm"},{"id":"6B-01","n":"Agustina Correa","g":"6to B","i":"img/6B/6B-01.png","d":"1K7MfwXAXieTHGCCorcjmZnZ_NZ-kfME8"},{"id":"6B-02","n":"Agustina Umpierre","g":"6to B","i":"img/6B/6B-02.png","d":"1XPNBCVby2pfzbzanNBQqw0-UP1ZR6PJN"},{"id":"6B-03","n":"Anahí Mora","g":"6to B","i":"img/6B/6B-03.png","d":"19hAb0W2ZONrL9fMmIIrupkUXY3zoOMw-"},{"id":"6B-04","n":"Bautista Clavería","g":"6to B","i":"img/6B/6B-04.png","d":"1Tg0ngEFEplKJZ6u3a7So_pYTMn0__m22"},{"id":"6B-05","n":"Delfina Araújo","g":"6to B","i":"img/6B/6B-05.png","d":"165pvvHcClDwj-RH0sQtjXY3ajQT4EyCi"},{"id":"6B-06","n":"Isabel Moura","g":"6to B","i":"img/6B/6B-06.png","d":"1o6Qo4lH6gGiuETJvG0pxim3RJW2b7mJC"},{"id":"6B-07","n":"María Belén Celentano","g":"6to B","i":"img/6B/6B-07.jpeg","d":"1_9EyjYM2WJ9z5khBR51bTJyJwWBNA_yb"},{"id":"6B-08","n":"Mateo González","g":"6to B","i":"img/6B/6B-08.png","d":"1mdNJWsCJTVG9wIemBufC525ptDz5AJfF"},{"id":"6B-09","n":"Rocío Castillo","g":"6to B","i":"img/6B/6B-09.png","d":"1HAMB2WgTUA-_tR2p4KF9MgyAbJLfRNMX"},{"id":"6B-10","n":"Santiago Moreira","g":"6to B","i":"img/6B/6B-10.jpeg","d":"1GmgK-tOEhUVkanpCxX74D4TattKkEIrj"},{"id":"6B-11","n":"Teo Raggio","g":"6to B","i":"img/6B/6B-11.png","d":"1JDuyF1pZBG6XJdxjgc2CVAaT_wwkkbmQ"},{"id":"6B-12","n":"Tomás Genta","g":"6to B","i":"img/6B/6B-12.jpeg","d":"10JxU0HWkMaaAI_m6TlgRcYpyQHfeGe4L"},{"id":"6B-13","n":"Luana Zayas","g":"6to B","i":"img/6B/6B-13.png","d":"1HWxHsF4m-RX2fSWfw4BSMno6ItGUgnMt"}];

  function normalizeName(str) {
    if (!str) return '';
    return String(str).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractDriveId(url) {
    if (!url) return '';
    var m = String(url).match(/folders\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    var m2 = String(url).match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return String(url).trim();
  }

  // Índices para búsqueda instantánea O(1)
  var driveMap = {};
  var nameMap = {};

  MUNDIAL_ALUMNOS.forEach(function (a) {
    var fullUrl = MUNDIAL_BASE_URL + a.i;
    var item = {
      id: a.id,
      name: a.n,
      group: a.g,
      imgPath: a.i,
      fullUrl: fullUrl,
      driveId: a.d
    };
    if (a.d) driveMap[a.d] = item;
    var norm = normalizeName(a.n);
    if (norm) nameMap[norm] = item;
  });

  /**
   * Obtiene la figurita oficial de un alumno según su Google Drive ID o Nombre
   */
  function getStudentFigurita(student) {
    if (!student) return null;
    if (typeof student === 'string') {
      var byName = nameMap[normalizeName(student)];
      if (byName) return byName;
      var byDrive = driveMap[extractDriveId(student)];
      if (byDrive) return byDrive;
      return null;
    }

    // 1. Por ID de Google Drive (100% exacto)
    var dId = extractDriveId(student.driveFolderUrl || student.drive_url || student.driveUrl);
    if (dId && driveMap[dId]) return driveMap[dId];

    // 2. Por nombre completo normalizado
    var nName = normalizeName(student.name || student.nombre);
    if (nName && nameMap[nName]) return nameMap[nName];

    // 3. Por username
    if (student.username) {
      var nUser = normalizeName(student.username.replace(/[._-]/g, ' '));
      if (nUser && nameMap[nUser]) return nameMap[nUser];
    }

    return null;
  }

  /**
   * Genera el HTML del Avatar del Alumno con su rostro recortado de la figurita
   */
  function renderStudentAvatarHtml(student, customClass, clickable) {
    var fig = getStudentFigurita(student);
    var fallback = (student && student.avatar) ? student.avatar : '👦';
    var clickAttr = clickable ? ' onclick="event.stopPropagation(); window.abrirModalFiguritaAlumno && window.abrirModalFiguritaAlumno();" role="button" tabindex="0"' : '';

    if (!fig) {
      return '<span class="sp-avatar ' + (customClass || '') + '"' + clickAttr + '>' + fallback + '</span>';
    }

    var stName = (student && (student.name || student.nombre)) || fig.name || 'Alumno';

    return '<div class="cpf-avatar-figurita-wrap ' + (customClass || '') + '"' + clickAttr + ' title="¡Ver mi figurita oficial CPF Robótica Mundial 2026!">' +
      '<img src="' + fig.fullUrl + '" class="cpf-avatar-figurita-crop" alt="' + stName.replace(/"/g, '&quot;') + '" loading="lazy" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'' + fallback + '\';">' +
      (clickable ? '<span class="cpf-avatar-star-badge" title="Figurita Oficial CPF 2026"><i class="fas fa-star"></i></span>' : '') +
    '</div>';
  }

  /**
   * Modal Interactivo para ver la Figurita Completa en HD
   */
  function abrirModalFiguritaAlumno(student) {
    if (!student) {
      try {
        var cached = localStorage.getItem('pf_active_student_data');
        if (cached) student = JSON.parse(cached);
      } catch (e) {}
    }
    if (!student && window.getActiveStudent) {
      student = window.getActiveStudent();
    }
    if (!student) return;

    var fig = getStudentFigurita(student);
    if (!fig) return;

    if (window.sounds && window.sounds.playSuccess) window.sounds.playSuccess();
    else if (window.sounds && window.sounds.playClick) window.sounds.playClick();

    var existingModal = document.getElementById('cpf-figurita-modal');
    if (existingModal) existingModal.remove();

    var modalHtml =
      '<div id="cpf-figurita-modal" class="cpf-fig-modal-overlay active" onclick="window.cerrarModalFiguritaAlumno(event);">' +
        '<div class="cpf-fig-modal-card" onclick="event.stopPropagation();">' +
          '<button type="button" class="cpf-fig-modal-close" onclick="window.cerrarModalFiguritaAlumno();" title="Cerrar">&times;</button>' +
          '<div class="cpf-fig-card-header">' +
            '<span class="cpf-fig-header-tag"><i class="fas fa-trophy"></i> CPF ROBÓTICA MUNDIAL 2026</span>' +
            '<h3 class="cpf-fig-header-title">¡Tu Figurita Oficial Coleccionable!</h3>' +
            '<span class="cpf-fig-header-sub">' + fig.name + ' · #' + fig.id + ' (' + fig.group + ')</span>' +
          '</div>' +
          '<div class="cpf-fig-card-preview-wrap">' +
            '<div class="cpf-fig-shine"></div>' +
            '<img src="' + fig.fullUrl + '" alt="' + fig.name + '" class="cpf-fig-card-img">' +
          '</div>' +
          '<div class="cpf-fig-actions">' +
            '<a href="' + MUNDIAL_BASE_URL + '" target="_blank" rel="noopener noreferrer" class="cpf-fig-btn-album">' +
              '<i class="fas fa-book-open"></i> <span>Abrir mi Álbum Digital</span>' +
            '</a>' +
            (student.driveFolderUrl ?
              '<a href="' + student.driveFolderUrl + '" target="_blank" rel="noopener noreferrer" class="cpf-fig-btn-drive">' +
                '<i class="fab fa-google-drive"></i> <span>Mi Carpeta Drive</span>' +
              '</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function cerrarModalFiguritaAlumno(e) {
    if (e && e.target && e.target.closest('.cpf-fig-modal-card') && !e.target.closest('.cpf-fig-modal-close')) {
      return;
    }
    var modal = document.getElementById('cpf-figurita-modal');
    if (modal) {
      if (window.sounds && window.sounds.playClick) window.sounds.playClick();
      modal.classList.remove('active');
      setTimeout(function () { modal.remove(); }, 250);
    }
  }

  window.MUNDIAL_ALUMNOS = MUNDIAL_ALUMNOS;
  window.getStudentFigurita = getStudentFigurita;
  window.renderStudentAvatarHtml = renderStudentAvatarHtml;
  window.abrirModalFiguritaAlumno = abrirModalFiguritaAlumno;
  window.cerrarModalFiguritaAlumno = cerrarModalFiguritaAlumno;
})();
