# Crystal Dash

Endless runner táctico basado en física de estado sólido y ciencia de materiales, construido únicamente con HTML5 Canvas, CSS y JavaScript vanilla (sin dependencias externas ni paso de compilación).

## Ejecutar localmente

Abre [index.html](index.html) directamente en cualquier navegador moderno (doble clic), o sirve la carpeta `Juego/` con un servidor estático:

```bash
python -m http.server 8000
```

## Despliegue en GitHub Pages

Todo el juego es 100 % estático dentro de `Juego/` (rutas relativas, sin backend):

- Publica el contenido de la carpeta `Juego/` en tu rama `gh-pages` o carpeta `docs/` de GitHub Pages.
- El progreso del jugador (récord, puntos de síntesis, materiales desbloqueados y carrusel) se guarda automáticamente en `localStorage`.

## Controles

- **Espacio / W / ↑ / Clic izquierdo:** Saltar (mantener para planear con materiales ligeros; pulsar en el aire con material denso para caer en picada).
- **Shift / E / → / Clic derecho / Rueda del ratón:** Rotar material en el carrusel (`Q` / `←` hacia atrás, `1`–`4` selección directa).
- **Táctil:** Mitad izquierda = saltar/planear · Mitad derecha = rotar material · Toque directo en el carrusel inferior.
- **P / Esc:** Pausa · **M:** Silenciar audio.

## Pipeline de datos

Los datos en `data/materials_db.json` y `data/materials_db.js` se generan con `../Extracción/build_materials_db.py` a partir del CSV local de JARVIS-DFT (`dft_2d_completo.csv`) y una semilla curada de materiales bulk (opcionalmente actualizable con `--jarvis3d`).
