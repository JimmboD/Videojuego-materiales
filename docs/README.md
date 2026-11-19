# Crystal Dash

Endless runner tactico basado en fisica del estado solido y ciencia de materiales.

Crystal Dash traslada conceptos reales de cristalografia, termodinamica, elasticidad, electromagnetismo y superconductividad a la mecanica de juego de un corredor continuo (endless runner). A diferencia de los titulos convencionales de esquiva y salto donde la habilidad radica exclusivamente en el tiempo de reaccion, en Crystal Dash la supervivencia depende de la conmutacion de fase y material en tiempo real, explotando propiedades fisicas autenticas calculadas mediante Teoria del Funcional de la Densidad (DFT) y provenientes de repositorios cientificos como JARVIS-DFT y Materials Project.

---

## 1. Concepto Central y Vision del Videojuego

El jugador pilota una muestra de material o celda unitaria cristalina sometida a condiciones limite dentro de un acelerador de particulas y tunel de pruebas extremas. Cada obstaculo, zona de choque o campo ambiental somete la muestra a fenomenos cuantificables:
* Esfuerzos hidrostaticos y cizalladuras mecanicas.
* Flujos termicos transitorios conducidos por diferencias de temperatura.
* Descargas voltaicas de alta tension gobernadas por la estructura de bandas electronicas.
* Campos magneticos inhomogeneos capaces de invertir la aceleracion local segun el ordenamiento ferromagnetico.
* Transiciones de fase cuantica hacia estados superconductores con expulsion de flujo magnetico (Efecto Meissner).

El nucleo del juego exige memorizar o intuir que combinacion de dureza, densidad, conductividad, respuesta electronica y momento magnetico es idonea para superar cada seccion del laboratorio.

---

## 2. Arquitectura de Datos: De DFT al Motor Fisico

Cada material en el juego se modela mediante parametros normalizados provenientes de calculos de primeros principios (DFT-OptB88vdW, mBJ, tensores dielectricos y tensores elasticos de JARVIS):

```json
{
  "jid": "JVASP-867",
  "formula": "C (Diamante)",
  "spg_symbol": "Fd-3m",
  "density": 3.51,
  "bulk_modulus": 442.0,
  "shear_modulus": 535.0,
  "bandgap": 5.47,
  "thermal_conductivity": 2000.0,
  "magmom": 0.0,
  "tc_supercon": 0.0,
  "ehull": 0.13,
  "melting_point": 3823,
  "curie_T": 0
}
```

### Parametros extraidos y equivalencias en el motor:
* **formula y spg_symbol:** Formula quimica y simbolo del grupo espacial cristalografico. Determina la geometria de la celda unitaria proyectada en alambre 3D (red cubica simple, centrada en las caras, centrada en el cuerpo, diamante, zincblenda, hexagonal compacta o tetragonal).
* **density (rho):** Densidad volumetrica en g/cm3. Rige la gravedad efectiva y la inercia vertical.
* **bulk_modulus (B):** Modulo volumetrico en GPa. Determina el umbral de ruptura por impacto frontal frente a bloques compresibles.
* **shear_modulus (G):** Modulo de corte en GPa. Determina la resistencia contra sierras circulares y cizalladura tangencial.
* **bandgap (Eg):** Brecha de banda prohibida en eV. Clasifica el comportamiento frente a descargas voltaicas (metal si Eg = 0, semiconductor si 0 < Eg < 3, aislante si Eg >= 3).
* **thermal_conductivity (kappa) y melting_point (Tm):** Conductividad termica en W/(m*K) y punto de fusion en Kelvin. Rigen la velocidad de transferencia calorica y el limite de degradacion estructural.
* **magmom (mu_B) y curie_T (TC):** Momento magnetico por atomo en magnetones de Bohr y temperatura de Curie en Kelvin. Definen la susceptibilidad a electroimanes elevados.
* **tc_supercon (Tc):** Temperatura critica superconductora en Kelvin. Activa la levitacion diamagnetica cuando la temperatura desciende por debajo de este umbral.
* **ehull:** Energia por encima de la envolvente convexa (eV/atomo) o energia de exfoliacion en materiales 2D. Cuantifica la metaestabilidad y define el tiempo util antes de la transicion espontanea de fase.

---

## 3. Mecanicas Fisicas y Formulacion Matematica

### A. Cinematica Vertical y Gravedad Efectiva

La gravedad que experimenta el cuerpo se ajusta mediante una ley potencial para conservar la jugabilidad en materiales ultradensos sin anular el contraste tactil:

$$g_{\text{eff}} = g_0 \cdot \left(\frac{\rho}{\rho_{\text{ref}}}\right)^\alpha$$

Donde g_0 = 2600 px/s^2, rho_ref = 5.0 g/cm^3 y alpha = 0.45.
* **Baja densidad (rho < 2.5 g/cm^3, ej. Grafeno, Litio, Silicio):** Genera una aceleracion baja que permite saltos amplios y la mecanica de **planeo** sostenido al mantener pulsada la tecla de salto.
* **Alta densidad (rho > 10.0 g/cm^3, ej. Plomo, Oro, Tungsteno, Osmio):** Incrementa g_eff produciendo caidas vertiginosas. Pulsar salto en el aire o conmutar hacia un elemento denso en el punto maximo de la trayectoria ejecuta una **caida rapida (fast-fall / air-cancel)** instantanea, indispensable para descender antes de impactar contra un haz laser superior.

### B. Destruccion Mecanica y Fragilidad (Cociente de Pugh)

Cada obstaculo destructible posee una dureza o resistencia B_obs o G_obs:
* **Impacto frontal:** Si B_jugador > B_obs, el cristal pulveriza el obstaculo sin reduccion de velocidad, activando multiplicadores de combo. Si B_jugador <= B_obs, el impacto provoca fractura catastrofica y fin de la partida.
* **Cizalladura:** Los discos rotativos de corte quedan destruidos si G_jugador > G_obs.
* **Fragilidad vs Ductilidad:** Los solidos ceramicos y covalentes con altisimo modulo volumetrico pero bajo cociente de Pugh (B/G < 1.75, tales como el diamante o carburo de silicio) fracturan bloques frontales con facilidad, pero sufren dano por astillamiento si caen desde gran altura. Para amortiguar aterrizajes violentos es necesario alternar hacia un metal ductil (B/G > 1.75, como cobre, aluminio u oro) antes de tocar el suelo.

### C. Termodinamica Transitoria en Tiempo Real

La temperatura interna de la muestra T(t) evoluciona segun la ecuacion diferencial de enfriamiento y calentamiento conductivo:

$$\frac{dT}{dt} = k_{\text{env}} \cdot \kappa_{\text{eff}} \cdot (T_{\text{zona}} - T(t))$$

Donde kappa_eff = sqrt(kappa / 400.0) y k_env representa el coeficiente de acoplamiento del entorno (1.2 en hornos/plasma, 3.0 en criogenia, 0.5 a temperatura ambiente).
* **Zonas calientes (Hornos de induccion y plasma, T_zona >> 300 K):** Un aislante termico de bajisima conductividad (como oxido de zirconio ZrO2, kappa = 2.0 W/m*K) cruza la seccion con un incremento de temperatura minimo. Un conductor (cobre o diamante) alcanzaria su limite de fusion Tm en fracciones de segundo.
* **Zonas criogenicas (Nitrogeno liquido 77 K, Helio liquido 4.2 K):** Si el cristal proviene sobrecalentado de una seccion de plasma, entrar con un buen conductor termico (cobre, plata) disipa el calor acumulado en milisegundos produciendo un **choque termico controlado (Thermal Flush)** que otorga bonificaciones sustanciales. No obstante, las ceramicas fragiles que sufren un gradiente termico violento pueden resquebrajarse si no poseen ductilidad.

### D. Regla Fundamental de Generacion de Obstaculos y Margen de Absorcion Termica

Todos los desafios generados por el algoritmo procedural deben ser matematicamente superables con los materiales que el usuario tiene equipados en su carrusel activo. Ninguna carrera presentara un obstaculo imposible.

Para las zonas termicas rige una restriccion estricta: **el juego nunca genera una temperatura ni una longitud de zona que supere la capacidad de absorcion del material mas resistente del carrusel del jugador**.

El margen de seguridad de absorcion M(d) decrece de forma exponencial negativa a medida que aumenta la dificultad normalizada d (donde d varia entre 0 en el origen y 1 tras recorrer 3200 metros):

$$M(d) = 0.15 \cdot e^{-1.5 \cdot d}$$

* A dificultad cero (inicio de la carrera): M(0) = 0.15 (15% de margen de seguridad).
* A dificultad media (d = 0.5): M(0.5) = 0.071 (7.1% de margen).
* A dificultad maxima (d = 1.0): M(1.0) = 0.033 (3.3% de margen).

La temperatura interna absorbida por el material m tras recorrer una zona de longitud L a velocidad v partiendo de temperatura inicial T0 cumple rigurosamente:

$$T_{\text{final}} = T_{\text{zona}} + (T_0 - T_{\text{zona}}) \cdot e^{-k \cdot \kappa_{\text{eff}} \cdot \frac{L}{v}} \le T_m \cdot (1 - M(d))$$

Si el carrusel del jugador esta compuesto exclusivamente por elementos de bajo punto de fusion (como plomo con Tm = 600 K o litio con Tm = 454 K), la temperatura maxima admisible para las zonas calientes se recalcula y acota automaticamente para no exceder dicho umbral termico.

Analogamente, para el resto de obstaculos:
* **Muros reforzados (que no admiten salto superior):** La resistencia B del obstaculo se restringe a B_muro <= max(B_loadout) * (1 - M(d)). Si ningun compuesto del jugador puede romperlo, la seccion se reemplaza por bloques bajos franqueables por salto o se suministra un cristal dopante.
* **Fosos de acido:** La distancia entre plataformas se acota a L_foso <= 0.65 * v * t_vuelo(min(rho)) * (1 - M(d)), garantizando que el material mas liviano equipado siempre pueda cruzar flotando.
* **Arcos voltaicos:** Si el carrusel carece de metales o aislantes y no tiene capacidad de conduccion termica, se genera previamente un cristal dopante adecuado.
* **Electroimanes superiores:** Si ningun elemento posee momento magnetico suficiente para superar su peso, se deposita un cristal dopante ferromagnetico antes de la zona.

### E. Electromagnetismo y Respuesta de Banda

* **Arcos Electricos:**
  * Metales (Eg = 0 eV): Conducen la corriente y recargan el condensador de energia (empleado como escudo defensivo). Si el condensador ya se encuentra al 100%, la corriente induce sobrecalentamiento subito por efecto Joule.
  * Aislantes (Eg > 3.0 eV): Atraviesan las descargas con inmunidad total al ser dielectricos no polarizables.
  * Semiconductores (0 < Eg < 3.0 eV): Solo conducen corriente cuando su temperatura T(t) supera el umbral de excitacion termica de portadores (300 + 300 * Eg). Por debajo de esa temperatura, el cristal sufre choque por ruptura dielectrica.
* **Campos Magneticos y Fuerza de Kelvin:**
  Bajo bobinas electromagneticas elevadas, los materiales ferromagneticos con alto momento magnetico (Fe, Co, Nd2Fe14B) experimentan una atraccion vertical proporcional a mu_B que supera la gravedad, adhiriendo el cristal al techo para sortear abismos y puas del suelo. Conmutar a un material diamagnetico o no ferromagnetico desconecta la atraccion al instante. Dicha respuesta desaparece si la temperatura del material rebasa su temperatura de Curie TC.

### F. Estado Especial: Superconductividad y Efecto Meissner

Cuando la temperatura ambiente o interna cae por debajo de la temperatura critica superconductora Tc del compuesto (ejemplo: MgB2 con Tc = 39 K, o cuprato YBCO con Tc = 92 K en nitrogeno liquido):
1. **Levitacion Diamagnetica:** El cristal levita a altura fija sobre los rieles, ignorando completamente puas, deformaciones de terreno y fosos de acido.
2. **Resistencia Cero:** La energia electrica se mantiene al maximo de forma infinita mientras permanezca el estado superconductor.
3. **Expulsion de Flujo:** Visualizacion en tiempo real de lineas de campo magnetico repelidas en la periferia del cristal (representacion de campo interno B = 0).

### G. Metaestabilidad y Transicion Espontanea (ehull)

Los materiales metaestables (con energia por encima de la envolvente convexa ehull > 0.05 eV/atomo, como el diamante sintetico o sulfuro de hidrogeno a presion ambiente H3S) otorgan propiedades sobresalientes, pero acumulan tension estructural con el uso continuado. Si se mantienen activos durante mas tiempo que su vida media t_decay = 14 / sqrt(ehull / 0.05) segundos, sufren una transicion espontanea hacia su fase termodinamicamente estable (por ejemplo, Diamante muta a Grafito desordenado, y H3S a Azufre elemental), reduciendo drasticamente sus modulos elasticos hasta que se recristalicen en el inventario.

---

## 4. Controles y Esquema de Entrada

El juego adopta un diseno minimalista accesible con teclado, raton o pantalla tactil:

* **Espacio / Flecha Arriba / W / Clic Izquierdo:** Saltar. Mantener pulsado en el aire con materiales ligeros para activar planeo aerodinamico. Pulsar en el aire con materiales pesados para forzar caida vertical en picada.
* **Shift / Flecha Derecha / E / Clic Derecho / Rueda del Raton:** Conmutar secuencialmente entre las ranuras del carrusel de 4 materiales equipados.
* **Teclas 1, 2, 3, 4:** Seleccion directa del material correspondiente.
* **P / Escape:** Pausa y reanudacion.
* **M:** Silenciar o activar el motor de audio sintetizado.
* **Pantalla Tactil:** Mitad izquierda de la pantalla para salto y planeo; mitad derecha para conmutacion de material. Clic directo sobre cualquiera de las 4 casillas del carrusel inferior.

---

## 5. El Laboratorio y el Arbol Periodico

Con los puntos de sintesis acumulados en cada carrera, el jugador puede acceder al panel del Laboratorio para desbloquear compuestos y minerales reales clasificados por niveles de energia:
* **Fase inicial:** Elementos de referencia como Cobre (Cu), Hierro (Fe), Plomo (Pb) y Diamante (C).
* **Fases intermedias:** Silicio (Si), Cuarzo (SiO2), Aluminio (Al), Titanio (Ti), Arseniuro de Galio (GaAs), Zafiro (Al2O3), Zirconia (ZrO2), Magnetos de Neodimio (Nd2Fe14B) y Diboruro de Magnesio (MgB2).
* **Fases avanzadas:** Compuestos bidimensionales (Grafeno, Fosforeno, Disulfuro de Molibdeno MoS2, Diseleniuro de Niobio NbSe2, Nitruro de Boro hexagonal 2D), superaleaciones tipo Inconel 718, Osmio metalico (Os) y superconductores de alta temperatura (YBCO, H3S).

La interfaz del laboratorio incluye previsualizacion interactiva tridimensional de la celda unitaria de cada compuesto, calculada dinamicamente a partir de su grupo espacial cristalografico.

---

## 6. Arquitectura Tecnica y Ejecucion

El proyecto esta construido exclusivamente con tecnologias estandar de la plataforma web:
* **Renderizado:** HTML5 Canvas 2D acelerado por hardware para el entorno, particulas y HUD.
* **Motor Grafico Cristalografico:** Renderizador vectorial matricial en JavaScript puro para la proyeccion tridimensional rotatoria de atomos y enlaces de celda unitaria.
* **Motor de Sonido:** Sintetizador procedural basado en Web Audio API (osciladores, filtros paso alto y generadores de ruido blanco), eliminando la dependencia de archivos de audio externos.
* **Persistencia:** Almacenamiento local mediante `localStorage` para puntuaciones, inventario y carrusel.
* **Pipeline de Datos:** Script en Python (`Extracción/build_materials_db.py`) que procesa datos cristalograficos locales de JARVIS-DFT (`dft_2d_completo.csv`) y exporta la base de datos tanto en formato JSON como en un archivo JS ejecutable sin restricciones de CORS.

### Estructura de Carpetas

* `docs/`: Directorio principal de la aplicacion web para su distribucion (contiene `index.html`, `css/`, `js/` y `data/`).
* `Extracción/`: Scripts de extraccion, analisis y transformacion de datos DFT.
* `index.html`: Enlace raiz con redireccion automatica hacia `docs/`.

### Publicacion en GitHub Pages

Para publicar el juego en GitHub Pages:
1. En el repositorio de GitHub, acceder a **Settings** > **Pages**.
2. En **Build and deployment**, seleccionar como origen `Deploy from a branch`.
3. Escoger la rama principal (`main`) y seleccionar la carpeta `/docs`.
4. Guardar los cambios. El sitio estara operativo sin pasos adicionales de compilacion.
