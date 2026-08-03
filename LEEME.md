# 100 Personas Dijeron — manual de operación

Juego de encuestas por equipos. El **tablero** va en la TV; el **panel de control** lo maneja el conductor desde su celular, tablet u otra ventana.

> Para publicarlo en internet, ve [README.md](README.md) y [SUBIR-A-GITHUB.md](SUBIR-A-GITHUB.md).

## Cómo jugar

**Opción A — dos ventanas en la misma computadora (sin instalar nada)**

1. Doble clic en `index.html` → es el tablero. Presiona **⛶ Pantalla completa** (o la tecla `F`) y mándalo a la TV.
2. Doble clic en `panel.html` → es el panel del conductor.
3. Ambas ventanas se sincronizan solas.

> En este modo el navegador no puede leer `data/preguntas.json` por seguridad. El panel te avisa y puedes subir el archivo a mano desde **Banco de preguntas → Cargar tu propio archivo JSON** (queda guardado para las siguientes partidas). Si usas la opción B esto no hace falta.

**Opción B — panel en el celular por WiFi (recomendado)**

1. Doble clic en `INICIAR.bat` (Windows) o corre `node servidor.js` en una terminal.
2. La TV abre `http://localhost:8080/`
3. El celular, en la **misma red WiFi**, abre la dirección `http://TU-IP:8080/panel.html` que aparece impresa en la terminal.

## Reglas implementadas

Dos equipos de 2 a 5 jugadores. Cada pregunta trae de 5 a 8 respuestas de una encuesta a 100 personas; el valor de cada una es cuánta gente la dijo. Los aciertos se acumulan en el **bote** de la ronda.

El flujo de cada pregunta:

1. **Cara a cara.** El operador marca qué equipo ganó la palabra. Ese equipo tiene **un intento**.
   - Si acierta, se queda con el control de la pregunta.
   - Si falla, el turno **pasa automáticamente** al otro equipo, que arranca con su contador de errores en cero.
2. **Control.** El equipo que tiene la palabra sigue respondiendo hasta destapar todo el tablero o acumular **3 errores**.
3. **Robo.** Al tercer error el turno pasa al equipo contrario, que tiene **un intento** sobre una respuesta oculta. Si acierta se lleva todo el bote; si falla, los puntos son del equipo que tenía el control.

> Ejemplo: azul gana la palabra y dice "cloro" → error, el turno pasa solo a rojo. Rojo dice "jabón" → correcto, y sigue jugando. Rojo acumula 3 errores → el turno pasa a azul, que acierta y se lleva todo lo acumulado.

Además: rondas de valor **×1, ×2 (doble) o ×3 (triple)**, y gana el primer equipo que llega a la meta (350 puntos por defecto).

## Segundo juego: Premio Rápido

Al llegar a la meta, **la TV cambia sola** a la pantalla del Premio Rápido y el panel se adapta al nuevo juego. Juegan dos integrantes del equipo ganador con las mismas 5 preguntas al azar:

1. **Jugador 1** contesta las 5 preguntas en **20 segundos**. El operador toca la respuesta que dio, o "No está en el tablero"; el panel avanza solo a la siguiente. **Nada se muestra todavía**: ni en la TV ni en el panel. Solo aparece una palomita en la casilla y un punto • en el paso, para saber que quedó registrada.
2. Al terminar las 5, se revelan sus respuestas una por una y el total va subiendo.
3. **Jugador 2** entra y la columna del jugador 1 **se vuelve a tapar** para que no la vea. Contesta las mismas 5 en **25 segundos**, también a ciegas. Si repite una respuesta del jugador 1, vale **0** y en la TV aparece tachada.
4. Se revelan sus respuestas y hasta el resultado final reaparecen las dos columnas completas: si entre los dos suman **200 puntos** (configurable), ganan el premio.

Si necesitas corregir algo durante la captura, el botón **👁** del panel descubre lo registrado y vuelve a ocultarlo. Se apaga solo al cambiar de jugador. El reloj se puede pausar, reanudar y reiniciar desde el panel.

Para volver al marcador, usa **Volver al marcador**; para empezar todo de cero, **↺ Reiniciar** (arriba a la derecha del panel, siempre visible).

## Efectos de sonido propios

El juego trae sonidos sintetizados que funcionan sin ningún archivo. Si quieres los tuyos, mete archivos MP3 en la carpeta **`sonidos/`** (junto a `index.html`) con estos nombres exactos:

| Juego principal | Premio Rápido |
|---|---|
| `acierto.mp3` | `premio-inicio.mp3` |
| `error.mp3` | `premio-arranque.mp3` |
| `traspaso.mp3` | `premio-captura.mp3` |
| `robo.mp3` | `premio-duplicada.mp3` |
| `robo-fallido.mp3` | `premio-tic.mp3` |
| `nueva-ronda.mp3` | `premio-tiempo.mp3` |
| `turno.mp3` | `premio-gana.mp3` |
| `multiplicador.mp3` | `premio-pierde.mp3` |
| `revelar-todo.mp3` | |
| `victoria.mp3` | |
| `reinicio.mp3` | |

Todo en minúsculas, sin acentos y con el guion tal cual. No hace falta ponerlos todos: cada archivo que falte usa el sonido sintetizado. La lista completa con la descripción de cada uno está en `sonidos/LEEME-SONIDOS.txt`, y también aparece en el panel.

El audio se escucha en la computadora del **tablero**. Si abres el juego con doble clic (sin servidor) o quieres usar una carpeta distinta, presiona **📁 Sonidos** abajo en el tablero y selecciónala; ahí también se aceptan `.wav`, `.ogg` y `.m4a`.

## Controles del panel

| Control | Qué hace |
|---|---|
| ↺ Reiniciar | Siempre visible arriba; deja la partida en cero conservando nombres |
| Nombre del equipo | Se edita directo sobre el marcador; se refleja en la TV |
| ¿Quién gana la palabra? | Asigna el equipo que arranca la siguiente pregunta (o cambia el turno en caliente) |
| Respuesta de la lista | La revela en el tablero y suma al bote |
| ✕ ERROR | Marca error. En cara a cara pasa el turno; en control suma strike; en robo cierra la ronda |
| Darle el bote | Asigna manualmente lo acumulado al equipo que elijas y cierra la ronda |
| Nueva pregunta | Cierra la ronda y saca una pregunta al azar sin repetir |
| Saltar pregunta | Descarta la pregunta actual sin usarla |
| Revelar todas | Muestra las respuestas que quedaron ocultas |
| ×1 / ×2 / ×3 | Multiplicador de la ronda |
| Turno / −5 / +5 | Corrección manual de turno y puntaje |
| Banco / Categoría | Elige entre el banco clásico (5 respuestas), el extendido (6 a 8) o ambos, y filtra por tema |
| Columnas | Auto, 1 o 2 columnas en el tablero de la TV |

En **Auto**, las preguntas de hasta 5 respuestas se muestran en una columna y las de 6 a 8 en dos, siempre dentro del marco de foquitos.

## Agregar preguntas

Hay dos archivos, ambos con el mismo formato:

- `data/preguntas.json` — 120 preguntas de 5 respuestas
- `data/preguntas-6a8.json` — 40 preguntas de 6 a 8 respuestas

No hay que tocar el código.

```json
{
  "id": 121,
  "cat": "Comida",
  "texto": "Menciona algo que se come en la feria",
  "respuestas": [
    { "t": "Churros", "p": 32 },
    { "t": "Algodón de azúcar", "p": 26 },
    { "t": "Elotes", "p": 18 },
    { "t": "Manzanas cubiertas", "p": 15 },
    { "t": "Hot dogs", "p": 9 }
  ]
}
```

- `id` debe ser único **entre los dos archivos**.
- `p` es cuántas de 100 personas dieron esa respuesta (no tiene que sumar exactamente 100).
- Puedes poner de 3 a 8 respuestas; el tablero se ajusta solo y las ordena de mayor a menor.
- `cat` alimenta el filtro de categorías del panel.
- Para verificar que todo quedó bien, abre `prueba.html` con el servidor: corre las reglas del juego y valida los dos bancos.

## Archivos

```
index.html        Tablero para la TV
panel.html        Panel del conductor
servidor.js       Servidor local opcional (Node, sin dependencias)
INICIAR.bat       Arranque rápido en Windows
css/tablero.css   Estilo del tablero
css/panel.css     Estilo del panel
js/motor.js       Reglas del juego (estado y transiciones)
js/bus.js         Sincronía tablero ↔ panel
js/banco.js       Carga del banco de preguntas
js/sonidos.js     Efectos de sonido: MP3 de sonidos/ con respaldo sintetizado
sonidos/          Tus MP3 (ver LEEME-SONIDOS.txt para los nombres)
js/tablero.js     Render y animaciones del tablero
js/panel.js       Lógica del panel
prueba.html       Pruebas automáticas de reglas y bancos
data/preguntas.json      120 preguntas de 5 respuestas
data/preguntas-6a8.json  40 preguntas de 6 a 8 respuestas
README.md         Presentación del repositorio y despliegue
SUBIR-A-GITHUB.md Guía paso a paso para publicarlo
```

## Salas

Si el juego está publicado en una dirección pública, agrega `?sala=loquesea` al tablero **y** al panel para que tu partida no se mezcle con la de otra persona:

```
https://tu-direccion/?sala=fiesta7
https://tu-direccion/panel.html?sala=fiesta7
```

En el panel, la sección **Sala y enlace del tablero** genera el código y te copia el enlace listo para abrir en la TV. Sin el parámetro, todos comparten la sala `principal`.
