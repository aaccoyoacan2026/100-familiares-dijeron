/* Bus de sincronia entre el TABLERO (TV) y el PANEL (celular/tablet).

   Tres vias; se usa la mejor que este disponible:
     local     BroadcastChannel + localStorage   dos ventanas del MISMO navegador
     servidor  SSE contra servidor.js            misma WiFi, corriendo "node servidor.js"
     nube      Firebase Realtime Database        cualquier red, y ADEMAS funciona
                                                 en GitHub Pages y demas sitios estaticos

   GitHub Pages solo entrega archivos: no puede sincronizar por si mismo. Por eso la via
   "nube" guarda el estado en Firebase y los demas dispositivos lo consultan. Se usa la
   API REST con fetch: no hace falta cargar el SDK ni depender de ningun CDN.

   Para activarla, llena js/config-nube.js con la URL de tu base. Sin esa URL el juego
   sigue funcionando en modo local y con servidor propio.

   La sala (?sala=xxxx) separa partidas distintas: dos dispositivos se ven entre si
   solo si abren la MISMA sala. */
(function (w) {
  'use strict';

  function salaActual() {
    var m = /[?&]sala=([\w-]{1,24})/.exec(w.location.search);
    return m ? m[1] : 'principal';
  }

  var SALA = salaActual();
  var CANAL = 'juego100:' + SALA;
  var LLAVE = 'juego100:estado:' + SALA;
  var YO = Math.random().toString(36).slice(2, 10);   // para no hacernos eco a nosotros mismos
  var SONDEO = 700;                                    // ms entre consultas a la nube

  /* URL de la base de Firebase, sin diagonal final. La define js/config-nube.js. */
  function baseNube() {
    var c = w.ConfigNube || {};
    var u = (c.firebase || '').trim().replace(/\/+$/, '');
    return /^https:\/\/[\w.-]+/.test(u) ? u : '';
  }

  function crear(opciones) {
    opciones = opciones || {};
    var alRecibir = function () {};
    var sseVivo = false;
    var nubeViva = false;
    var bus = { modo: 'local', enviar: enviar, onEstado: onEstado, ultimo: null, sala: SALA };

    function onEstado(cb) { alRecibir = cb; }

    function recalcularModo() {
      var m = sseVivo ? 'servidor' : (nubeViva ? 'nube' : 'local');
      if (m === bus.modo) return;
      bus.modo = m;
      if (typeof bus.alCambiarModo === 'function') bus.alCambiarModo(m);
    }

    function recibir(estado) {
      if (!estado) return;
      bus.ultimo = estado;
      alRecibir(estado);
    }

    /* ---------- Envio: se reparte por todas las vias vivas ---------- */
    function enviar(estado) {
      bus.ultimo = estado;
      var texto = JSON.stringify(estado);

      try { localStorage.setItem(LLAVE, texto); } catch (e) {}
      if (bc) try { bc.postMessage({ tipo: 'estado', de: YO, estado: estado }); } catch (e) {}

      if (sseVivo) {
        fetch('estado?sala=' + encodeURIComponent(SALA), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: texto
        }).catch(function () {});
      }

      publicarNube(estado);
    }

    /* ---------- Local (BroadcastChannel + localStorage) ---------- */
    var bc = null;
    try { bc = new BroadcastChannel(CANAL); } catch (e) { bc = null; }

    if (bc) {
      bc.onmessage = function (ev) {
        var m = ev.data || {};
        if (m.tipo === 'estado' && m.de !== YO) recibir(m.estado);
        if (m.tipo === 'hola' && opciones.rol === 'panel' && bus.ultimo) {
          bc.postMessage({ tipo: 'estado', de: YO, estado: bus.ultimo });
        }
      };
    }
    w.addEventListener('storage', function (ev) {
      if (ev.key === LLAVE && ev.newValue) {
        try { recibir(JSON.parse(ev.newValue)); } catch (x) {}
      }
    });

    /* ---------- Servidor propio (SSE) ---------- */
    function intentarServidor(alFallar) {
      if (!/^https?:/.test(w.location.protocol)) { alFallar(); return; }
      var es;
      try { es = new EventSource('eventos?sala=' + encodeURIComponent(SALA)); } catch (e) { alFallar(); return; }

      var decidido = false;
      function rendirse() {
        if (decidido) return;
        decidido = true;
        clearTimeout(plazo);
        try { es.close(); } catch (e) {}
        alFallar();
      }
      var plazo = setTimeout(function () { if (!sseVivo) rendirse(); }, 2500);

      es.onmessage = function (ev) {
        sseVivo = true;
        if (!decidido) { decidido = true; clearTimeout(plazo); }
        recalcularModo();
        try {
          var msg = JSON.parse(ev.data);
          if (msg && msg.estado) recibir(msg.estado);
        } catch (x) {}
      };
      es.onerror = function () { if (!sseVivo) rendirse(); };   // sitio estatico: a la nube
    }

    /* ---------- Nube (Firebase Realtime Database por REST) ----------
       En la base se guarda  salas/<sala> = { v: <marca de tiempo>, de: <emisor>, estado: {...} }
       Se sondea solo  salas/<sala>/v  (un numero, unos cuantos bytes) y el estado completo
       se baja unicamente cuando esa marca cambia. */
    var RAIZ = baseNube();
    var URL_TODO = RAIZ ? RAIZ + '/salas/' + encodeURIComponent(SALA) + '.json' : '';
    var URL_V = RAIZ ? RAIZ + '/salas/' + encodeURIComponent(SALA) + '/v.json' : '';
    var vVisto = 0;          // ultima marca que ya procesamos
    var vMia = 0;            // marca de nuestro propio ultimo envio
    var enVuelo = false;

    function publicarNube(estado) {
      if (!URL_TODO) return;
      vMia = Date.now();
      vVisto = Math.max(vVisto, vMia);
      fetch(URL_TODO + '?print=silent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: vMia, de: YO, estado: estado })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        if (!nubeViva) { nubeViva = true; recalcularModo(); }
      }).catch(function () {
        if (nubeViva) { nubeViva = false; recalcularModo(); }
      });
    }

    function sondearNube() {
      if (!URL_V || enVuelo) return;
      enVuelo = true;
      fetch(URL_V, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (v) {
          if (!nubeViva) { nubeViva = true; recalcularModo(); }
          if (typeof v !== 'number' || v <= vVisto) { enVuelo = false; return; }
          return fetch(URL_TODO, { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (paq) {
              enVuelo = false;
              if (!paq || typeof paq.v !== 'number' || paq.v <= vVisto) return;
              vVisto = paq.v;
              if (paq.de === YO) return;          // es nuestro propio eco
              recibir(paq.estado);
            });
        })
        .catch(function () {
          enVuelo = false;
          if (nubeViva) { nubeViva = false; recalcularModo(); }
        });
    }

    function arrancarNube() {
      if (!URL_TODO) return;
      sondearNube();
      setInterval(sondearNube, SONDEO);
    }

    intentarServidor(arrancarNube);

    /* Al abrir, pide el estado a quien lo tenga (y de paso lee el ultimo guardado). */
    bus.pedirEstado = function () {
      if (bc) try { bc.postMessage({ tipo: 'hola', de: YO }); } catch (e) {}
      try {
        var crudo = localStorage.getItem(LLAVE);
        if (crudo) return JSON.parse(crudo);
      } catch (e) {}
      return null;
    };

    bus.hayNube = !!URL_TODO;
    return bus;
  }

  w.Bus = { crear: crear, sala: SALA, hayNube: !!baseNube() };
})(window);
