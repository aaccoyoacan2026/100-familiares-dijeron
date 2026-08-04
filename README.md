# 100 Personas Dijeron

Juego de encuestas por equipos para proyectar en una TV, con **panel de control independiente** para celular o tablet y un segundo juego de **Premio Rápido**. Todo es HTML, CSS y JavaScript sin dependencias ni compilación: se abre con doble clic o se sirve con un solo archivo de Node.

- 160 preguntas incluidas (120 de 5 respuestas y 40 de 6 a 8)
- Tablero de una o dos columnas dentro de un marco de foquitos
- Reglas completas: cara a cara, traspaso automático de turno, 3 errores, robo y rondas dobles o triples
- Premio Rápido con dos jugadores, reloj de 25 segundos cada uno, revelación en dos tiempos y bloqueo de respuestas repetidas
- Efectos de sonido sintetizados, sustituibles por tus propios MP3
- Sin base de datos, sin cuentas, sin analítica

📖 **[Manual completo de operación → LEEME.md](LEEME.md)**

---

## Probarlo en 30 segundos

```bash
git clone https://github.com/USUARIO/REPO.git
cd REPO
npm start          # equivale a: node servidor.js
```

Abre `http://localhost:8080/` en la TV y `http://localhost:8080/panel.html` en tu celular (misma red WiFi; la terminal imprime la dirección exacta).

Sin Node también funciona: doble clic en `index.html` y en `panel.html`, en dos ventanas de la misma computadora.

---

## Publicarlo en internet

Hay dos formas y sirven para cosas distintas. Puedes usar las dos a la vez.

### A) GitHub Pages + Firebase — gratis, siempre encendido y con control desde el celular

1. Sube el proyecto a un repositorio de GitHub.
2. Ve a **Settings → Pages** y en *Source* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`. **No elijas *GitHub Actions***: si lo seleccionas sin agregar tú un workflow, Pages deja de publicar y el sitio se queda congelado sin avisarte.
3. Listo: cada commit a `main` republica el sitio solo, en menos de un minuto. Si subiste un cambio y no lo ves, recarga con `Ctrl+F5`: los archivos se sirven con 10 minutos de caché.

Tu URL queda como `https://USUARIO.github.io/REPO/`.

**Para que el panel del celular controle una TV distinta**, hace falta un paso más: GitHub Pages solo entrega archivos, no puede pasar el estado de un dispositivo a otro. Abre **`js/config-nube.js`** y sigue las instrucciones que trae para crear una base gratuita de Firebase (5 minutos, una sola vez) y pegar ahí su URL.

Sin ese paso el juego funciona igual, pero el tablero y el panel solo se sincronizan **dentro del mismo navegador**. La etiqueta de arriba a la derecha te dice en cuál de los tres modos estás:

| Etiqueta | Qué significa |
|---|---|
| `conectado por internet` | Firebase configurado: panel y tablero en dispositivos distintos, en cualquier red |
| `conectado por red local` | Estás usando `servidor.js`: dispositivos distintos, misma WiFi |
| `modo local` | Solo se sincroniza con otra ventana de esa misma computadora |

### B) Un servidor Node gratuito — control desde el celular por internet

Sube el mismo repositorio a un servicio que ejecute Node. El proyecto no tiene dependencias, así que el despliegue es inmediato.

**Render** (ya incluye `render.yaml`):

1. Entra a [render.com](https://render.com) → **New → Blueprint**.
2. Conecta tu repositorio; Render lee `render.yaml` y crea el servicio solo.
3. Abre `https://TU-APP.onrender.com/` en la TV y `https://TU-APP.onrender.com/panel.html` en el celular.

**Railway / Fly / Glitch / Replit:** funcionan igual; solo necesitan `npm start`. El servidor respeta la variable `PORT`.

> En el plan gratuito de Render el servicio se duerme si nadie lo usa; la primera visita puede tardar unos segundos en despertar.

### Salas

Cuando el juego está en una URL pública, cualquiera que la abra ve la misma partida. Para separarlas, agrega `?sala=` a las dos direcciones:

```
https://tu-app.onrender.com/?sala=fiesta7
https://tu-app.onrender.com/panel.html?sala=fiesta7
```

El panel trae un botón **Crear sala nueva** que genera el código y te da el enlace listo para copiar al tablero.

---

## Estructura

```
index.html                Tablero para la TV
panel.html                Panel del conductor
prueba.html               Pruebas automáticas de reglas y bancos
servidor.js               Servidor local/nube (Node, sin dependencias)
INICIAR.bat               Arranque rápido en Windows
css/tablero.css           Estilo del tablero
css/panel.css             Estilo del panel
js/motor.js               Reglas del juego (estado y transiciones puras)
js/bus.js                 Sincronía tablero ↔ panel (BroadcastChannel o SSE)
js/banco.js               Carga del banco de preguntas
js/sonidos.js             MP3 con respaldo sintetizado
js/tablero.js             Render y animaciones del tablero
js/panel.js               Lógica del panel
data/preguntas.json       120 preguntas de 5 respuestas
data/preguntas-6a8.json   40 preguntas de 6 a 8 respuestas
sonidos/                  Tus MP3 (ver sonidos/LEEME-SONIDOS.txt)
```

Para agregar preguntas solo se editan los JSON de `data/`; no hay que tocar el código. El formato está documentado en [LEEME.md](LEEME.md).

## Pruebas

Abre `prueba.html` con el servidor (`npm start` y luego `http://localhost:8080/prueba.html`). Corre las reglas del juego, el flujo completo del Premio Rápido y valida los dos bancos de preguntas.

## Antes de publicar

- **No subas MP3 de los que no tengas derechos.** La carpeta `sonidos/` se sube al repositorio tal cual; si vas a hacerlo público, usa audio propio o con licencia libre.
- Este proyecto es original y no está afiliado a ningún programa de televisión. Evita usar nombres, logotipos o música de programas reales si lo vas a difundir.
- Cambia el nombre en `LICENSE` si el autor no eres tú.

## Licencia

[MIT](LICENSE) — puedes usarlo, modificarlo y compartirlo libremente.


