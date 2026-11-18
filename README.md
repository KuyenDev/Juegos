# ARCADE INFINITO — Plataforma Web de Minijuegos Offline (PWA)

Colección de 17 videojuegos arcade clásicos y originales con dificultad progresiva infinita, banda sonora completa chiptune / 8-bits generada por Web Audio API, récords locales en IndexedDB, logros, recompensas cosméticas y funcionamiento **100% sin conexión a Internet (PWA)**.

## Ejecución Rápida

Puedes iniciar el servidor local incluido sin necesidad de instalar dependencias externas:

```bash
python3 serve.py 8080
```

O bien, si dispones de Node.js y Vite:

```bash
npm install
npm run dev
```

Después abre `http://localhost:8080` en cualquier navegador de escritorio o móvil.

## Catálogo de 17 Videojuegos Incluidos

1. **Neon Viper (`snake`)** — Snake clásico con cola de direcciones, alimentos especiales y barreras láser procedurales.
2. **Cyber Maze (`pacman`)** — Laberintos rotativos originales, cristales de datos, pulsos PEM y centinelas con IA.
3. **Hyper Pong (`pong`)** — Modos Duelo y Supervivencia contra IA adaptativa y obstáculos móviles en niveles avanzados.
4. **Prism Breaker (`breakout`)** — Rompe ladrillos con bloques blindados, explosivos y power-ups (Multibola, Láser, Paleta Ancha, Vida).
5. **Nova Defenders (`spaceinvaders`)** — Oleadas espaciales con búnkeres, OVNI bonus, disparo triple y Jefes Nodriza cada 5 niveles.
6. **Void Bastion (`asteroids`)** — Física vectorial con rotación, propulsores, fragmentación de asteroides e hiperespacio.
7. **Sky Pulse (`flappy`)** — Vuelo de precisión con 3 naves seleccionables, compuertas móviles, orbes bonus y biomas dinámicos.
8. **Tetro Flux (`tetris`)** — Bloques geométricos con generador justo (7-bag), pieza fantasma, reserva (Hold) y caída instantánea.
9. **Quantum Mines (`minesweeper`)** — Buscaminas con primer toque siempre seguro, campaña infinita, 3 dificultades y modo bandera táctil.
10. **Neural Match (`memory`)** — Memoria visual con tableros crecientes hasta 6×6, combos y modo contrarreloj opcional.
11. **Cyber Merge 2048 (`2048`)** — Rompecabezas numérico con tableros 3×3, 4×4 y 5×5, deshacer jugada y modo infinito.
12. **Synapse Reflex (`reaction`)** — Medidor de reflejos en milisegundos con señales verdes, señuelos ámbar y dianas de precisión.
13. **Blast Grid (`bomberman`)** — Laberinto destructible con bombas, reacciones en cadena, mejoras y portal de salida.
14. **Starlight Strikers (`shmup`)** — Shmup vertical con cañones de 4 niveles, bomba Nova, escuadrones y jefes de sector.
15. **Iron Commando (`metalslug`)** — Run & Gun lateral con plataformas, salto, agachado, granadas, multi-arma y Tanques Jefe.
16. **Dusty Trails (`sunsetriders`)** — Acción western en desplazamiento lateral con barrida esquiva, barriles y Forajidos Jefe.
17. **Steel Girder (`donkeykong`)** — Plataformas clásicas de vigas inclinadas, escaleras, barriles rodantes y martillos.
