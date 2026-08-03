/* Bus de sincronia entre el TABLERO (TV) y el PANEL (celular/tablet).
   Modo servidor : si la pagina se sirve por http y existe /eventos (SSE) -> sincroniza por red.
   Modo local    : BroadcastChannel + localStorage -> dos ventanas del mismo navegador. */
(function (w) {
  'use strict';

  /* Sala: permite que varias partidas convivan en una misma URL publica.
     Se toma de ?sala=xxxx; si no viene, se usa "principal". */
  function salaActual() {
    var m = /[?&]sala=([\w-]{1,24})/.exec(w.location.search);
    return m ? m[1] : 'principal';
  }

  var SALA = salaActual();
  var CANAL = 'juego100:' + SALA;
  var LLAVE = 'juego100:estado:' + SALA;

  function crear(opciones) {
    opciones = opciones || {};
    var alRecibir = function () {};
    var bus = { modo: 'local', enviar: enviarLocal, onEstado: onEstado, ultimo: null, sala: SALA };

    function onEstado(cb) { alRecibir = cb; }

    /* ---------- Local (BroadcastChannel) ---------- */
    var bc = null;
    try { bc = new BroadcastChannel(CANAL); } catch (e) { bc = null; }

    function enviarLocal(estado) {
      bus.ultimo = estado;
      try { localStorage.setItem(LLAVE, JSON.stringify(estado)); } catch (e) {}
      if (bc) bc.postMessage({ tipo: 'estado', estado: estado });
    }

    if (bc) {
      bc.onmessage = function (ev) {
        var m = ev.data || {};
        if (m.tipo === 'estado') { bus.ultimo = m.estado; alRecibir(m.estado); }
        if (m.tipo === 'hola' && opciones.rol === 'panel' && bus.ultimo) {
          bc.postMessage({ tipo: 'estado', estado: bus.ultimo });
        }
      };
    }
    w.addEventListener('storage', function (ev) {
      if (ev.key === LLAVE && ev.newValue) {
        try { var e = JSON.parse(ev.newValue); bus.ultimo = e; alRecibir(e); } catch (x) {}
      }
    });

    /* ---------- Servidor (SSE) ---------- */
    function intentarServidor() {
      if (!/^https?:/.test(w.location.protocol)) return;
      var es;
      try { es = new EventSource('eventos?sala=' + encodeURIComponent(SALA)); } catch (e) { return; }
      var vivo = false;

      es.onmessage = function (ev) {
        vivo = true;
        bus.modo = 'servidor';
        try {
          var msg = JSON.parse(ev.data);
          if (msg && msg.estado) { bus.ultimo = msg.estado; alRecibir(msg.estado); }
        } catch (x) {}
        if (typeof bus.alCambiarModo === 'function') bus.alCambiarModo('servidor');
      };
      es.onerror = function () {
        if (!vivo) { es.close(); }   // servidor estatico sin SSE: nos quedamos en modo local
      };

      bus.enviar = function (estado) {
        bus.ultimo = estado;
        enviarLocal(estado);         // espejo local por si hay otra ventana en la misma PC
        if (!vivo) return;
        fetch('estado?sala=' + encodeURIComponent(SALA), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estado)
        }).catch(function () {});
      };
    }
    intentarServidor();

    /* Al abrir, pide el estado actual a quien lo tenga. */
    bus.pedirEstado = function () {
      if (bc) bc.postMessage({ tipo: 'hola' });
      try {
        var crudo = localStorage.getItem(LLAVE);
        if (crudo) return JSON.parse(crudo);
      } catch (e) {}
      return null;
    };

    return bus;
  }

  w.Bus = { crear: crear, sala: SALA };
})(window);
