# Cómo subirlo a GitHub y publicarlo (paso a paso)

Guía para hacerlo una sola vez. Después, cada cambio se publica solo.

## 1. Crear el repositorio

1. Entra a [github.com/new](https://github.com/new).
2. Nombre sugerido: `cien-personas-dijeron`.
3. Elige **Public** (necesario para que GitHub Pages sea gratis).
4. **No** marques "Add a README", "Add .gitignore" ni "Choose a license": el proyecto ya los trae.
5. Presiona **Create repository**.

## 2. Subir los archivos

### Opción sencilla: arrastrar y soltar

En la página del repositorio recién creado, haz clic en **uploading an existing file** y arrastra **todo el contenido** de la carpeta del juego (no la carpeta, sino lo que está adentro).

> GitHub oculta los archivos que empiezan con punto al arrastrar. Si `.github/`, `.gitignore` o `.nojekyll` no aparecen, súbelos con la opción de línea de comandos de abajo, o créalos a mano con **Add file → Create new file** escribiendo la ruta completa (por ejemplo `.github/workflows/pages.yml`).

### Opción con Git instalado

Desde la carpeta del juego:

```bash
git init
git add .
git commit -m "Primera versión del juego"
git branch -M main
git remote add origin https://github.com/USUARIO/cien-personas-dijeron.git
git push -u origin main
```

Cambia `USUARIO` por tu nombre de usuario de GitHub.

## 3. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En *Source*, elige **GitHub Actions**.
3. Ve a la pestaña **Actions**; verás el workflow "Publicar en GitHub Pages" corriendo. Tarda un par de minutos.
4. Tu sitio queda en `https://USUARIO.github.io/cien-personas-dijeron/`.

Para jugar así: abre esa dirección en la computadora conectada a la TV y, en otra ventana **del mismo navegador**, `.../panel.html`. Se sincronizan solos.

## 4. (Opcional) Servidor para controlar desde el celular

Solo si quieres que el panel viva en tu teléfono y controle una TV que está en otra máquina.

1. Entra a [render.com](https://render.com) y crea una cuenta gratuita.
2. **New → Blueprint** y conecta tu repositorio de GitHub.
3. Render detecta `render.yaml` y crea el servicio; presiona **Apply**.
4. Cuando termine, tendrás una dirección tipo `https://cien-personas-dijeron.onrender.com`.
5. TV: `https://…onrender.com/` — Celular: `https://…onrender.com/panel.html`

Antes de jugar, abre el panel, entra a **Sala y enlace del tablero → Crear sala nueva** y usa ese enlace en la TV. Así nadie más que abra la dirección se mete en tu partida.

## 5. Actualizar el juego después

Cada vez que cambies algo (por ejemplo, agregar preguntas a `data/preguntas.json`):

- Desde la web: abre el archivo en GitHub, ✏️ **Edit**, guarda con **Commit changes**.
- Desde tu computadora: `git add . && git commit -m "más preguntas" && git push`

GitHub Pages y Render se actualizan solos en un par de minutos.

## Antes de hacerlo público

- Revisa que la carpeta `sonidos/` no lleve MP3 de los que no tengas derechos.
- El repositorio será visible para cualquiera: no dejes datos personales en las preguntas ni en los nombres de equipo guardados.
- Si el autor no eres tú, cambia el nombre en el archivo `LICENSE`.
