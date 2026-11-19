# Crystal Dash 💎⚡

*Endless Runner* táctico basado en física de estado sólido y ciencia de materiales, alimentado con propiedades reales extraídas de bases de datos cristalográficas (**JARVIS-DFT** / **Materials Project**).

Desarrollado exclusivamente con tecnologías web nativas (**HTML5 Canvas, CSS y JavaScript Vanilla**, sin dependencias ni compiladores).

---

## 🚀 Despliegue en GitHub Pages (2 Pasos)

El proyecto está preparado para funcionar directamente en GitHub Pages con cualquiera de estas dos opciones:

### Opción A (Recomendada: carpeta `/docs`):
1. En tu repositorio de GitHub, ve a **Settings** > **Pages** (en el menú lateral izquierdo).
2. En la sección **Build and deployment**:
   - **Source:** Selecciona `Deploy from a branch`.
   - **Branch:** Selecciona `main` (o `master`) y en la carpeta elige **/docs**.
3. Haz clic en **Save**. ¡En pocos segundos el juego estará publicado en `https://<tu-usuario>.github.io/<nombre-del-repo>/`!

### Opción B (Directo desde la raíz `/`):
- Si dejas la configuración por defecto (`Branch: main`, carpeta `/ (root)`), la raíz incluye un redireccionamiento automático hacia `docs/`, por lo que funcionará sin necesidad de configurar nada más.

---

## 🎮 Controles

- **Espacio / W / ↑ / Clic izquierdo:** Saltar (mantener pulsado con materiales ligeros para **planear**; pulsar en el aire con materiales densos para **caída rápida en picada**).
- **Shift / E / → / Clic derecho / Rueda del ratón:** Rotar material en el carrusel (`Q` / `←` para rotar al revés, o teclas `1`, `2`, `3`, `4` para selección directa).
- **Controles táctiles:**
  - Mitad izquierda de la pantalla: saltar / planear.
  - Mitad derecha de la pantalla: rotar material.
  - Toque directo sobre cualquiera de las 4 ranuras del carrusel inferior.
- **P / Esc:** Pausar partida.
- **M:** Activar / silenciar audio.

---

## 🔬 Estructura del Proyecto

```text
├── docs/                      # Directorio de la aplicación web (GitHub Pages)
│   ├── index.html             # Punto de entrada del juego
│   ├── css/
│   │   └── style.css          # Estilos de interfaz y HUD
│   ├── js/
│   │   ├── main.js            # Bucle de juego, eventos y controles
│   │   ├── game.js            # Motor físico (gravedad, colisiones, termodinámica)
│   │   ├── render.js          # Renderizado Canvas 2D (escenario, jugador, HUD)
│   │   ├── crystal.js         # Visualizador 3D wireframe de celda unitaria
│   │   ├── level.js           # Generador procedural adaptativo
│   │   ├── data.js            # Gestor de base de datos y localStorage
│   │   └── audio.js           # Efectos sintetizados en tiempo real (Web Audio API)
│   └── data/
│       ├── materials_db.js    # Base de datos embebida (compatible offline sin CORS)
│       └── materials_db.json  # Base de datos en JSON puro
├── Extracción/                # Pipeline de datos y scripts de análisis
│   ├── build_materials_db.py  # Generador de la base de datos de materiales
│   ├── dft_2d_completo.csv    # Dataset crudo JARVIS-DFT 2D
│   └── ...
├── index.html                 # Redirección automática en raíz para GitHub Pages
└── README.md
```

---

## 🛠️ Ejecución Local

Para probarlo en tu computadora local:
- Simplemente haz **doble clic** en [docs/index.html](docs/index.html) (funciona directamente sin necesidad de servidor local).
- O si prefieres un servidor local:
  ```bash
  python -m http.server 8000
  ```
  y abre en tu navegador `http://localhost:8000/docs/`.
