/* =======================================================================
   SINCRONIA POR INTERNET  (panel en el celular + tablero en la tablet/TV)
   =======================================================================

   GitHub Pages solo entrega archivos: no puede pasarle el estado de un
   dispositivo a otro. Para lograrlo se usa una base gratuita de Firebase
   como "buzon" compartido. Se configura una sola vez, en 5 minutos.

   PASOS
   -----
   1. Entra a  https://console.firebase.google.com  con tu cuenta de Google.
   2. "Crear un proyecto" -> ponle el nombre que quieras (ej. juego-100).
      Puedes desactivar Google Analytics; no se necesita.
   3. En el menu de la izquierda: Compilacion -> Realtime Database
      -> "Crear base de datos" -> elige la ubicacion -> inicia en MODO DE PRUEBA.
   4. Copia la URL que aparece hasta arriba. Se ve asi:
         https://juego-100-default-rtdb.firebaseio.com
      (o  https://juego-100-default-rtdb.us-central1.firebasedatabase.app )
   5. Pegala abajo, entre las comillas de firebase, y sube el cambio a GitHub.
   6. En la pestana "Reglas" de la Realtime Database pega esto y publica:

        {
          "rules": {
            "salas": {
              "$sala": { ".read": true, ".write": true }
            }
          }
        }

      Con esto solo se puede leer y escribir dentro de "salas". El modo de
      prueba de Firebase caduca a los 30 dias; estas reglas no caducan.

   PRIVACIDAD
   ----------
   Cualquiera que adivine el nombre de tu sala podria ver la partida. Por eso,
   antes de jugar, usa el boton "Crear sala nueva" del panel: genera un codigo
   al azar. No guardes datos personales aqui.

   COMPROBAR QUE QUEDO
   -------------------
   Abre el panel y mira la etiqueta de arriba a la derecha: debe decir
   "conectado por internet". Si dice "modo local", revisa la URL y las reglas.
   ======================================================================= */
window.ConfigNube = {
  firebase: 'https://familiares-dijeron-default-rtdb.firebaseio.com'
};
