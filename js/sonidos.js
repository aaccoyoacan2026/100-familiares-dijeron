/* Sonidos del juego.
   1) Si existe un MP3 con el nombre del evento en la carpeta sonidos/, se usa ese.
   2) Si no, se usa un efecto sintetizado con WebAudio (no hace falta ningun archivo).
   Los nombres de archivo validos estan en Sonidos.CLAVES. */
(function (w) {
  'use strict';

  var CLAVES = [
    'acierto', 'error', 'traspaso', 'robo', 'robo-fallido', 'nueva-ronda', 'turno',
    'multiplicador', 'revelar-todo', 'victoria', 'reinicio',
    'premio-inicio', 'premio-arranque', 'premio-captura', 'premio-duplicada',
    'premio-tic', 'premio-tiempo', 'premio-gana', 'premio-pierde'
  ];
  var EXTENSIONES = ['mp3', 'wav', 'ogg', 'm4a'];
  var CARPETA = 'sonidos/';

  var ctx = null, activo = true, usarMp3 = true;
  var pistas = {};        // clave -> url del archivo detectado

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
    'premio-duplicada': function () {
      tono(160, 0, 0.5, 'square', 0.26, 80);
      ruido(0, 0.3, 0.12);
    },
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

  /* ---------------- Archivos MP3 ---------------- */
  function probar(clave, url) {
    var a = new Audio();
    a.preload = 'auto';
    a.addEventListener('canplaythrough', function () { pistas[clave] = url; }, { once: true });
    a.src = url;
    a.load();
  }

  /* Busca sonidos/<clave>.mp3 al arrancar. Los que no existan simplemente no se registran. */
  function autodetectar() {
    if (!usarMp3) return;
    CLAVES.forEach(function (k) { probar(k, CARPETA + k + '.mp3'); });
  }

  /* Carga manual: el usuario elige una carpeta y se emparejan los archivos por nombre. */
  function usarCarpeta(archivos) {
    var encontrados = [];
    Array.prototype.forEach.call(archivos, function (f) {
      var partes = f.name.toLowerCase().split('.');
      var ext = partes.pop();
      var base = partes.join('.');
      if (EXTENSIONES.indexOf(ext) === -1) return;
      if (CLAVES.indexOf(base) === -1) return;
      pistas[base] = URL.createObjectURL(f);
      encontrados.push(base);
    });
    return encontrados;
  }

  /* ---------------- Reproduccion ---------------- */
  function reproducir(nombre) {
    if (!activo || !nombre) return;
    if (usarMp3 && pistas[nombre]) {
      try {
        var a = new Audio(pistas[nombre]);
        a.volume = 1;
        a.play().catch(function () { caerASintetizado(nombre); });
        return;
      } catch (e) { /* sigue al respaldo */ }
    }
    caerASintetizado(nombre);
  }

  function caerASintetizado(nombre) {
    var f = sintetizado[nombre];
    if (f) try { f(); } catch (e) {}
  }

  w.Sonidos = {
    CLAVES: CLAVES,
    CARPETA: CARPETA,
    reproducir: reproducir,
    autodetectar: autodetectar,
    usarCarpeta: usarCarpeta,
    detectados: function () { return Object.keys(pistas).sort(); },
    usarMp3: function (v) { if (v !== undefined) usarMp3 = !!v; return usarMp3; },
    activar: function (v) { activo = !!v; if (v) ac(); },
    activo: function () { return activo; },
    despertar: function () { ac(); }
  };
})(window);
