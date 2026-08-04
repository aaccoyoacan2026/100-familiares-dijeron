/* Motor del juego: estado + transiciones puras.
   Se usa igual en el navegador (window.Motor) y en Node (module.exports). */
(function (raiz) {
  'use strict';

  var MAX_ERRORES = 3;

  function clonar(e) { return JSON.parse(JSON.stringify(e)); }

  function estadoInicial(cfg) {
    cfg = cfg || {};
    return {
      v: 2,
      // lobby | inicio (cara a cara) | ronda | robo | resuelta | fin
      fase: 'lobby',
      equipos: [
        { nombre: cfg.nombreA || 'Equipo Rojo', puntos: 0, jugadores: [] },
        { nombre: cfg.nombreB || 'Equipo Azul', puntos: 0, jugadores: [] }
      ],
      meta: cfg.meta || 350,
      turno: 0,
      pregunta: null,
      reveladas: [],
      errores: [0, 0],
      multiplicador: 1,
      robador: null,
      ganador: null,
      usadas: [],
      ronda: 0,
      mostrarTodo: false,
      columnas: 0,                // 0 = automatico (1 col hasta 5 respuestas, 2 col de 6 en adelante)
      premio: null,               // segundo juego: Premio Rapido
      evento: null                // {tipo, i, ts} -> dispara sonido/animacion en el tablero
    };
  }

  /* Puntos acumulados en el tablero durante la ronda (el "bote"). */
  function bote(e) {
    if (!e.pregunta) return 0;
    var s = 0;
    for (var i = 0; i < e.pregunta.respuestas.length; i++) {
      if (e.reveladas[i]) s += e.pregunta.respuestas[i].p;
    }
    return s * e.multiplicador;
  }

  function marcar(e, tipo, i) {
    e.evento = { tipo: tipo, i: (i === undefined ? null : i), ts: Date.now() + Math.random() };
  }

  /* --- Transiciones --- */

  /* equipoInicial: quien gano la palabra. Arranca en fase 'inicio' (cara a cara):
     tiene un solo intento; si falla, el turno pasa automaticamente al otro equipo. */
  function nuevaRonda(est, pregunta, multiplicador, equipoInicial) {
    var e = clonar(est);
    if (e.fase === 'fin') return e;
    e.pregunta = pregunta;
    e.reveladas = pregunta.respuestas.map(function () { return false; });
    e.errores = [0, 0];
    e.multiplicador = multiplicador || 1;
    e.robador = null;
    e.mostrarTodo = false;
    if (equipoInicial === 0 || equipoInicial === 1) e.turno = equipoInicial;
    e.fase = 'inicio';
    e.ronda += 1;
    if (e.usadas.indexOf(pregunta.id) === -1) e.usadas.push(pregunta.id);
    marcar(e, 'nueva-ronda');
    return e;
  }

  function resolver(e, equipo) {
    e.equipos[equipo].puntos += bote(e);
    e.mostrarTodo = true;
    e.fase = 'resuelta';
    if (e.equipos[equipo].puntos >= e.meta) {
      e.fase = 'fin';
      e.ganador = equipo;
      marcar(e, 'victoria', equipo);
    }
    return e;
  }

  function acertar(est, i) {
    var e = clonar(est);
    if (e.reveladas[i] === undefined || e.reveladas[i]) return est;

    /* Acierta en el cara a cara: se queda con el control de la pregunta. */
    if (e.fase === 'inicio' || e.fase === 'ronda') {
      e.reveladas[i] = true;
      e.fase = 'ronda';
      marcar(e, 'acierto', i);
      var faltan = e.reveladas.some(function (r) { return !r; });
      if (!faltan) resolver(e, e.turno);
      return e;
    }
    if (e.fase === 'robo') {
      e.reveladas[i] = true;
      marcar(e, 'robo', i);
      return resolver(e, e.robador);
    }
    return est;
  }

  function fallar(est) {
    var e = clonar(est);

    /* Error en el cara a cara: el turno pasa de inmediato al otro equipo,
       que arranca con su propio contador de errores en cero. */
    if (e.fase === 'inicio') {
      e.errores[e.turno] = 1;
      e.turno = 1 - e.turno;
      e.errores[e.turno] = 0;
      e.fase = 'ronda';
      marcar(e, 'traspaso', 1);
      return e;
    }

    if (e.fase === 'ronda') {
      e.errores[e.turno] = Math.min(MAX_ERRORES, e.errores[e.turno] + 1);
      marcar(e, 'error', e.errores[e.turno]);
      if (e.errores[e.turno] >= MAX_ERRORES) {
        e.fase = 'robo';
        e.robador = 1 - e.turno;
      }
      return e;
    }
    if (e.fase === 'robo') {
      marcar(e, 'robo-fallido');
      return resolver(e, e.turno);   // el bote se queda con el equipo original
    }
    return est;
  }

  function cambiarTurno(est) {
    var e = clonar(est);
    e.turno = 1 - e.turno;
    if (e.fase === 'robo') e.robador = 1 - e.turno;
    marcar(e, 'turno');
    return e;
  }

  /* Asigna manualmente el equipo que tiene la palabra (antes de responder). */
  function elegirInicial(est, equipo) {
    var e = clonar(est);
    e.turno = equipo;
    if (e.fase === 'robo') e.robador = 1 - equipo;
    marcar(e, 'turno');
    return e;
  }

  /* El operador entrega el bote acumulado al equipo que decida. */
  function asignarBote(est, equipo) {
    var e = clonar(est);
    if (!e.pregunta || e.fase === 'fin') return est;
    marcar(e, 'robo', equipo);
    return resolver(e, equipo);
  }

  function setColumnas(est, n) {
    var e = clonar(est);
    e.columnas = n;      // 0 auto, 1 o 2
    return e;
  }

  function setMultiplicador(est, m) {
    var e = clonar(est);
    e.multiplicador = m;
    marcar(e, 'multiplicador', m);
    return e;
  }

  function ajustarPuntos(est, equipo, delta) {
    var e = clonar(est);
    e.equipos[equipo].puntos = Math.max(0, e.equipos[equipo].puntos + delta);
    if (e.equipos[equipo].puntos >= e.meta && e.fase !== 'lobby') {
      e.fase = 'fin'; e.ganador = equipo; marcar(e, 'victoria', equipo);
    }
    return e;
  }

  function revelarTodo(est) {
    var e = clonar(est);
    e.mostrarTodo = true;
    marcar(e, 'revelar-todo');
    return e;
  }

  function configurar(est, cfg) {
    var e = clonar(est);
    if (cfg.nombres) {
      e.equipos[0].nombre = cfg.nombres[0] || e.equipos[0].nombre;
      e.equipos[1].nombre = cfg.nombres[1] || e.equipos[1].nombre;
    }
    if (cfg.jugadores) {
      e.equipos[0].jugadores = cfg.jugadores[0].slice(0, 5);
      e.equipos[1].jugadores = cfg.jugadores[1].slice(0, 5);
    }
    if (cfg.meta) e.meta = cfg.meta;
    return e;
  }

  function reiniciar(est) {
    var base = estadoInicial({ meta: est.meta });
    base.columnas = est.columnas;
    base.equipos[0].nombre = est.equipos[0].nombre;
    base.equipos[1].nombre = est.equipos[1].nombre;
    base.equipos[0].jugadores = est.equipos[0].jugadores;
    base.equipos[1].jugadores = est.equipos[1].jugadores;
    marcar(base, 'reinicio');
    return base;
  }

  /* =========================================================================
     SEGUNDO JUEGO: PREMIO RAPIDO
     Dos jugadores del equipo ganador contestan las mismas 5 preguntas.
     Cada uno tiene 25 segundos. El jugador 2 no puede repetir una respuesta
     que ya dio el jugador 1: el sistema la bloquea. Juntos deben sumar la
     meta (200 por defecto).

     REVELACION EN DOS TIEMPOS
     revelado[jugador][i] es un nivel, no un si/no:
       0 = tapado
       1 = se ve la respuesta que dio
       2 = se ve tambien el puntaje (y hasta entonces suma al total)
     Al pasar al jugador 2, todo lo del jugador 1 queda en nivel 2, y las del
     jugador 2 se van descubriendo una por una.
     ========================================================================= */

  var TIEMPOS = [25, 25];
  var vacio5 = function (v) { return [v, v, v, v, v]; };

  /* Tolera partidas guardadas con el formato viejo (true/false). */
  function nivel(v) { return v === true ? 2 : (v === false || v == null ? 0 : (v | 0)); }

  function iniciarPremio(est, preguntas, nombres, meta) {
    var e = clonar(est);
    e.premio = {
      activo: true,
      etapa: 'prep',              // prep | captura | revela | fin
      jugador: 0,
      equipo: e.ganador != null ? e.ganador : e.turno,
      nombres: nombres && nombres.length === 2 ? nombres.slice() : ['Jugador 1', 'Jugador 2'],
      meta: meta || 200,
      preguntas: preguntas.slice(0, 5),
      respuestas: [vacio5(null), vacio5(null)],
      revelado: [vacio5(0), vacio5(0)],
      actual: 0,
      reloj: { restante: TIEMPOS[0], limite: TIEMPOS[0], corriendo: false },
      resultado: null
    };
    marcar(e, 'premio-inicio');
    return e;
  }

  function premioTotal(est) {
    var pr = est.premio;
    if (!pr) return 0;
    var s = 0;
    [0, 1].forEach(function (j) {
      pr.respuestas[j].forEach(function (r, i) {
        if (r && nivel(pr.revelado[j][i]) >= 2 && !r.dup) s += r.p;
      });
    });
    return s;
  }

  /* Registra lo que contesto el jugador en turno. sel = indice de respuesta, o -1 si no esta. */
  function premioResponder(est, sel) {
    var e = clonar(est), pr = e.premio;
    if (!pr || pr.etapa !== 'captura') return est;
    var i = pr.actual;
    var preg = pr.preguntas[i];
    if (!preg) return est;

    if (sel < 0) {
      pr.respuestas[pr.jugador][i] = { sel: -1, t: 'No está en el tablero', p: 0, dup: false };
      marcar(e, 'error', 1);
    } else {
      /* El jugador 2 no puede repetir lo que ya dijo el jugador 1: se bloquea.
         No se registra nada y no se avanza de pregunta; solo suena el aviso. */
      var otra = pr.respuestas[1 - pr.jugador][i];
      if (pr.jugador === 1 && otra && otra.sel === sel) {
        marcar(e, 'premio-duplicada', i);
        return e;
      }
      var r = preg.respuestas[sel];
      pr.respuestas[pr.jugador][i] = { sel: sel, t: r.t, p: r.p, dup: false };
      marcar(e, 'premio-captura', i);
    }
    if (pr.actual < 4) pr.actual += 1;
    return e;
  }

  function premioSaltar(est) {
    var e = clonar(est);
    if (!e.premio) return est;
    e.premio.actual = Math.min(4, e.premio.actual + 1);
    return e;
  }

  function premioIrA(est, i) {
    var e = clonar(est);
    if (!e.premio) return est;
    e.premio.actual = Math.max(0, Math.min(4, i));
    return e;
  }

  function premioComenzar(est) {
    var e = clonar(est), pr = e.premio;
    if (!pr) return est;
    pr.etapa = 'captura';
    pr.actual = 0;
    pr.reloj = { restante: TIEMPOS[pr.jugador], limite: TIEMPOS[pr.jugador], corriendo: true };
    marcar(e, 'premio-arranque');
    return e;
  }

  function premioReloj(est, restante, corriendo) {
    var e = clonar(est);
    if (!e.premio) return est;
    e.premio.reloj.restante = Math.max(0, restante);
    e.premio.reloj.corriendo = !!corriendo;
    if (restante <= 0) {
      e.premio.reloj.corriendo = false;
      marcar(e, 'premio-tiempo');
    }
    return e;
  }

  /* Cierra la captura y pasa a la revelacion, sin descubrir nada todavia. */
  function premioCerrarCaptura(est) {
    var e = clonar(est);
    if (!e.premio) return est;
    e.premio.etapa = 'revela';
    e.premio.reloj.corriendo = false;
    marcar(e, 'turno');
    return e;
  }

  /* Un toque sube UN nivel: primero aparece la respuesta, luego su puntaje. */
  function premioRevelar(est, i) {
    var e = clonar(est), pr = e.premio;
    if (!pr) return est;
    pr.etapa = 'revela';
    pr.reloj.corriendo = false;
    var j = pr.jugador;

    if (i == null) {                       // la siguiente que quede pendiente
      i = -1;
      for (var k = 0; k < 5; k++) {
        if (nivel(pr.revelado[j][k]) < 2) { i = k; break; }
      }
      if (i === -1) return est;
    }

    var n = nivel(pr.revelado[j][i]);
    if (n >= 2) return est;
    pr.revelado[j][i] = n + 1;

    var r = pr.respuestas[j][i];
    if (n === 0) marcar(e, 'premio-captura', i);                          // sale la respuesta
    else marcar(e, !r || r.dup || r.p === 0 ? 'error' : 'acierto', i);    // sale el puntaje
    return e;
  }

  function premioSiguienteJugador(est) {
    var e = clonar(est), pr = e.premio;
    if (!pr || pr.jugador === 1) return est;
    pr.revelado[0] = vacio5(2);            // el jugador 1 queda descubierto por completo
    pr.jugador = 1;
    pr.etapa = 'prep';
    pr.actual = 0;
    pr.reloj = { restante: TIEMPOS[1], limite: TIEMPOS[1], corriendo: false };
    marcar(e, 'turno');
    return e;
  }

  function premioFinal(est) {
    var e = clonar(est), pr = e.premio;
    if (!pr) return est;
    pr.revelado = [vacio5(2), vacio5(2)];
    pr.etapa = 'fin';
    pr.reloj.corriendo = false;
    pr.resultado = premioTotal(e) >= pr.meta ? 'gana' : 'pierde';
    marcar(e, pr.resultado === 'gana' ? 'premio-gana' : 'premio-pierde');
    return e;
  }

  function premioCerrar(est) {
    var e = clonar(est);
    if (e.premio) e.premio.activo = false;
    marcar(e, 'turno');
    return e;
  }

  /* Elige una pregunta al azar que no se haya usado. Si ya se usaron todas, recicla. */
  function preguntaAleatoria(banco, usadas, categoria) {
    var pool = banco.filter(function (p) {
      return (!categoria || p.cat === categoria) && usadas.indexOf(p.id) === -1;
    });
    if (!pool.length) {
      pool = banco.filter(function (p) { return !categoria || p.cat === categoria; });
    }
    if (!pool.length) pool = banco;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* n preguntas distintas al azar, para el Premio Rapido. */
  function preguntasAleatorias(banco, usadas, n) {
    var pool = banco.filter(function (p) { return usadas.indexOf(p.id) === -1; });
    if (pool.length < n) pool = banco.slice();
    pool = pool.slice();
    var salida = [];
    while (salida.length < n && pool.length) {
      salida.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return salida;
  }

  var API = {
    MAX_ERRORES: MAX_ERRORES,
    estadoInicial: estadoInicial,
    bote: bote,
    nuevaRonda: nuevaRonda,
    acertar: acertar,
    fallar: fallar,
    cambiarTurno: cambiarTurno,
    elegirInicial: elegirInicial,
    asignarBote: asignarBote,
    setColumnas: setColumnas,
    setMultiplicador: setMultiplicador,
    ajustarPuntos: ajustarPuntos,
    revelarTodo: revelarTodo,
    configurar: configurar,
    reiniciar: reiniciar,
    preguntaAleatoria: preguntaAleatoria,
    preguntasAleatorias: preguntasAleatorias,

    TIEMPOS_PREMIO: TIEMPOS,
    premioNivel: nivel,
    iniciarPremio: iniciarPremio,
    premioTotal: premioTotal,
    premioResponder: premioResponder,
    premioSaltar: premioSaltar,
    premioIrA: premioIrA,
    premioComenzar: premioComenzar,
    premioReloj: premioReloj,
    premioCerrarCaptura: premioCerrarCaptura,
    premioRevelar: premioRevelar,
    premioSiguienteJugador: premioSiguienteJugador,
    premioFinal: premioFinal,
    premioCerrar: premioCerrar
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Motor = API;
})(typeof window !== 'undefined' ? window : this);
