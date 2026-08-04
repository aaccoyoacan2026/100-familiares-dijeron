/* Sonidos del juego.
   1) Si existe un MP3 con el nombre del evento en la carpeta sonidos/, se usa ese.
   2) Si no, se usa un efecto sintetizado con WebAudio (no hace falta ningun archivo).
   Los nombres de archivo validos estan en Sonidos.CLAVES. */
(function (w) {
  'use strict';

  var CLAVES = [
    'introduccion', 'transicion',
    'acierto', 'error', 'traspaso', 'robo', 'robo-fallido', 'nueva-ronda', 'turno',
    'multiplicador', 'revelar-todo', 'victoria', 'reinicio',
    'premio-inicio', 'premio-arranque', 'premio-captura', 'premio-duplicada',
    'premio-puntos', 'premio-tic', 'premio-tiempo', 'premio-gana', 'premio-pierde'
  ];

  /* Pistas que se reproducen en bucle como música de ambiente, no como efecto. */
  var DE_BUCLE = ['introduccion', 'transicion'];
  /* Se aceptan varias extensiones. "mp3.mpeg" y "mpeg" estan incluidas porque algunos
     navegadores y gestores de descargas guardan los MP3 con ese nombre. */
  var EXTENSIONES = ['mp3', 'mp3.mpeg', 'mpeg', 'wav', 'ogg', 'm4a', 'mp4'];
  var CARPETA = 'sonidos/';

  var ctx = null, activo = true, usarMp3 = true;
  var pistas = {};        // clave -> url del archivo detectado
  var precargadas = {};   // clave -> <audio> ya cargado, para que suene sin retraso
  var sonando = {};       // clave -> <audio> que se esta reproduciendo ahora mismo

  /* ---------------- WebAudio (respaldo sintetizado) ---------------- */
  function ac() {
    if (!ctx) {
      var C = w.AudioContext || w.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tono(freq, inicio, dur, tipo, vol, freqFinal) {
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + inicio;
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (freqFinal) osc.frequency.exponentialRampToValueAtTime(freqFinal, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function ruido(inicio, dur, vol) {
    var a = ac(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, n, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = a.createBufferSource(); src.buffer = buf;
    var g = a.createGain(); g.gain.value = vol || 0.2;
    src.connect(g); g.connect(a.destination);
    src.start(a.currentTime + inicio);
  }

  var sintetizado = {
    acierto: function () {
      tono(880, 0, 0.12, 'square', 0.22);
      tono(1320, 0.09, 0.25, 'square', 0.20);
    },
    error: function () {
      tono(180, 0, 0.45, 'sawtooth', 0.28, 90);
      ruido(0, 0.25, 0.10);
    },
    traspaso: function () {
      tono(200, 0, 0.35, 'sawtooth', 0.26, 110);
      ruido(0, 0.2, 0.09);
      tono(480, 0.32, 0.10, 'triangle', 0.18);
      tono(760, 0.42, 0.22, 'triangle', 0.20);
    },
    robo: function () {
      tono(520, 0, 0.10, 'triangle', 0.22);
      tono(700, 0.10, 0.10, 'triangle', 0.22);
      tono(1050, 0.20, 0.35, 'triangle', 0.24);
    },
    'robo-fallido': function () { tono(300, 0, 0.30, 'sawtooth', 0.22, 140); },
    'nueva-ronda': function () {
      tono(440, 0, 0.10, 'sine', 0.18);
      tono(660, 0.10, 0.18, 'sine', 0.18);
    },
    turno: function () { tono(600, 0, 0.12, 'sine', 0.15); },
    multiplicador: function () {
      tono(700, 0, 0.08, 'square', 0.18);
      tono(900, 0.08, 0.08, 'square', 0.18);
      tono(1200, 0.16, 0.20, 'square', 0.20);
    },
    'revelar-todo': function () { tono(500, 0, 0.20, 'triangle', 0.16); },
    victoria: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tono(f, i * 0.13, 0.30, 'square', 0.22); });
      tono(1046, 0.55, 0.7, 'sine', 0.22);
    },
    reinicio: function () { tono(400, 0, 0.10, 'sine', 0.14); },

    'premio-inicio': function () {
      [392, 523, 659, 784].forEach(function (f, i) { tono(f, i * 0.11, 0.26, 'triangle', 0.20); });
    },
    'premio-arranque': function () {
      tono(880, 0, 0.10, 'square', 0.20);
      tono(880, 0.16, 0.10, 'square', 0.20);
      tono(1320, 0.32, 0.30, 'square', 0.22);
    },
    'premio-captura': function () { tono(1000, 0, 0.09, 'sine', 0.16); },
    /* Bep bep de rechazo: dos pitidos secos e iguales, como los del programa. */
    'premio-duplicada': function () {
      tono(320, 0, 0.16, 'square', 0.30);
      tono(320, 0.22, 0.16, 'square', 0.30);
    },
    /* Golpe de puntaje: sube y remata, distinto del acierto. */
    'premio-puntos': function () {
      tono(600, 0, 0.07, 'triangle', 0.20);
      tono(900, 0.07, 0.07, 'triangle', 0.22);
      tono(1350, 0.14, 0.28, 'triangle', 0.24);
    },
    /* Sin archivo no se inventa música de ambiente: los bucles quedan en silencio. */
    introduccion: function () {},
    transicion: function () {},
    'premio-tic': function () { tono(1400, 0, 0.05, 'square', 0.12); },
    'premio-tiempo': function () {
      tono(220, 0, 0.9, 'sawtooth', 0.3, 110);
      ruido(0, 0.5, 0.14);
    },
    'premio-gana': function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { tono(f, i * 0.12, 0.35, 'square', 0.22); });
      tono(1568, 0.7, 0.9, 'sine', 0.24);
    },
    'premio-pierde': function () {
      [440, 392, 349, 294].forEach(function (f, i) { tono(f, i * 0.18, 0.4, 'triangle', 0.22); });
    }
  };

  /* ---------------- Archivos de audio ---------------- */

  /* Deja el archivo cargado en memoria para que suene sin retraso la primera vez. */
  function registrar(clave, url) {
    if (pistas[clave]) return;
    pistas[clave] = url;
    try { var a = new Audio(); a.preload = 'auto'; a.src = url; a.load(); precargadas[clave] = a; } catch (e) {}
  }

  /* Prueba una lista de URLs en orden y se queda con la primera que exista.
     Por http/https basta una peticion HEAD; con doble clic (file://) hay que
     recurrir al elemento <audio>, que si puede leer archivos locales. */
  function probar(clave, urls) {
    var i = 0;
    var porRed = /^https?:/.test(location.protocol);

    (function siguiente() {
      if (i >= urls.length) return;
      var url = urls[i++];

      if (porRed) {
        fetch(url, { method: 'HEAD' })
          .then(function (r) {
            if (r.ok) registrar(clave, url);
            else siguiente();
          })
          .catch(siguiente);
        return;
      }

      var a = new Audio();
      a.preload = 'metadata';
      var listo = false;
      a.addEventListener('loadedmetadata', function () { listo = true; registrar(clave, url); }, { once: true });
      a.addEventListener('error', function () { if (!listo) siguiente(); }, { once: true });
      a.src = url;
      a.load();
    })();
  }

  /* Busca sonidos/<clave>.<ext> al arrancar. Los que no existan no se registran. */
  function autodetectar() {
    if (!usarMp3) return;
    CLAVES.forEach(function (k) {
      probar(k, EXTENSIONES.map(function (ext) { return CARPETA + k + '.' + ext; }));
    });
  }

  /* De "premio-tic.mp3.mpeg" saca "premio-tic". Devuelve null si no es un nombre valido. */
  function claveDe(nombre) {
    var n = String(nombre).toLowerCase().split(/[\\/]/).pop();
    for (var i = 0; i < CLAVES.length; i++) {
      var k = CLAVES[i];
      if (n === k) return k;
      if (n.indexOf(k + '.') === 0 && EXTENSIONES.indexOf(n.slice(k.length + 1)) !== -1) return k;
    }
    return null;
  }

  /* Carga manual: el usuario elige una carpeta y se emparejan los archivos por nombre. */
  function usarCarpeta(archivos) {
    var encontrados = [];
    Array.prototype.forEach.call(archivos, function (f) {
      var k = claveDe(f.name);
      if (!k) return;
      delete pistas[k];                       // lo elegido a mano gana sobre lo autodetectado
      registrar(k, URL.createObjectURL(f));
      if (encontrados.indexOf(k) === -1) encontrados.push(k);
    });
    return encontrados;
  }

  /* ---------------- Reproduccion ---------------- */
  function reproducir(nombre) {
    if (!activo || !nombre) return;
    if (usarMp3 && pistas[nombre]) {
      try {
        /* Reusa el archivo ya precargado si no esta sonando; si no, abre otra copia. */
        var a = precargadas[nombre];
        if (a && a.paused) a.currentTime = 0;
        else a = new Audio(pistas[nombre]);
        a.volume = 1;
        a.play().catch(function () { caerASintetizado(nombre); });
        sonando[nombre] = a;
        return;
      } catch (e) { /* sigue al respaldo */ }
    }
    caerASintetizado(nombre);
  }

  /* Control de las pistas largas, como la musica de los 25 segundos del Premio
     Rapido: debe seguir al reloj en vez de sonar sola hasta el final. */
  function pausar(nombre) {
    var a = sonando[nombre];
    if (a && !a.paused) try { a.pause(); } catch (e) {}
  }

  function reanudar(nombre) {
    var a = sonando[nombre];
    if (a && a.paused && !a.ended) {
      try { a.play().catch(function () {}); } catch (e) {}
    }
  }

  function detener(nombre) {
    var a = sonando[nombre];
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
    delete sonando[nombre];
  }

  /* ---------------- Música de ambiente en bucle ----------------
     Solo suena si existe el archivo: un bucle sintetizado sería insoportable.
     Se le puede pasar una lista y usa la primera pista que encuentre. */
  var bucleActual = null;
  var bucleEspera = null;

  function primeraDisponible(nombres) {
    var lista = [].concat(nombres);
    for (var i = 0; i < lista.length; i++) if (pistas[lista[i]]) return lista[i];
    return null;
  }

  function bucle(nombres) {
    var k = primeraDisponible(nombres);
    if (!activo || !usarMp3 || !k) { if (!k) pararBucle(); return; }
    if (bucleActual === k) return;
    pararBucle();
    try {
      var a = new Audio(pistas[k]);
      a.loop = true;
      a.volume = 1;
      a.play().catch(function () {});
      sonando[k] = a;
      bucleActual = k;
    } catch (e) {}
  }

  function pararBucle() {
    if (bucleEspera) { clearTimeout(bucleEspera); bucleEspera = null; }
    if (!bucleActual) return;
    var a = sonando[bucleActual];
    if (a) { try { a.pause(); a.loop = false; a.currentTime = 0; } catch (e) {} }
    delete sonando[bucleActual];
    bucleActual = null;
  }

  /* Arranca el bucle cuando termine la pista que está sonando (por ejemplo, la
     música de cierre después del sonido de victoria). */
  function bucleTras(nombres, previo) {
    var k = primeraDisponible(nombres);
    if (!k || bucleActual === k || bucleEspera) return;
    var a = sonando[previo];
    if (!a || a.paused) { bucle(nombres); return; }
    var faltan = Math.max(0, (a.duration || 2.5) - (a.currentTime || 0));
    bucleEspera = setTimeout(function () { bucleEspera = null; bucle(nombres); }, faltan * 1000 + 150);
  }

  function caerASintetizado(nombre) {
    var f = sintetizado[nombre];
    if (f) try { f(); } catch (e) {}
  }

  w.Sonidos = {
    CLAVES: CLAVES,
    CARPETA: CARPETA,
    reproducir: reproducir,
    pausar: pausar,
    reanudar: reanudar,
    detener: detener,
    bucle: bucle,
    bucleTras: bucleTras,
    pararBucle: pararBucle,
    enBucle: function () { return bucleActual; },
    autodetectar: autodetectar,
    usarCarpeta: usarCarpeta,
    detectados: function () { return Object.keys(pistas).sort(); },
    usarMp3: function (v) { if (v !== undefined) usarMp3 = !!v; return usarMp3; },
    activar: function (v) { activo = !!v; if (v) ac(); else pararBucle(); },
    activo: function () { return activo; },
    despertar: function () { ac(); }
  };
})(window);
