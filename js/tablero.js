/* Tablero: solo pinta el estado que llega del panel y dispara animaciones/sonidos. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var bus = Bus.crear({ rol: 'tablero' });
  var estado = null;
  var ultimoEvento = null;
  var puntosPrevios = [0, 0];

  /* ---------- Construccion de casillas ---------- */
  function pintarCasillas(e) {
    var cont = $('tablero');
    var n = e.pregunta ? e.pregunta.respuestas.length : 5;

    /* Una o dos columnas: manual desde el panel, o automatico segun cuantas respuestas hay. */
    var cols = (e.columnas === 1 || e.columnas === 2) ? e.columnas : (n > 5 ? 2 : 1);
    cont.classList.toggle('dos', cols === 2);
    cont.style.setProperty('--filas', cols === 2 ? Math.ceil(n / 2) : n);

    if (cont.childElementCount !== n) {
      cont.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var c = document.createElement('div');
        c.className = 'casilla';
        c.dataset.i = i;
        c.innerHTML =
          '<div class="cara oculta"><div class="num">' + (i + 1) + '</div></div>' +
          '<div class="cara revelada"><div class="idx"></div><div class="txt"></div><div class="pts"></div></div>';
        cont.appendChild(c);
      }
    }

    for (var k = 0; k < n; k++) {
      var casilla = cont.children[k];
      var r = e.pregunta ? e.pregunta.respuestas[k] : null;
      var visible = !!(e.reveladas[k] || e.mostrarTodo);
      casilla.querySelector('.idx').textContent = (k + 1);
      casilla.querySelector('.txt').textContent = r ? r.t : '';
      casilla.querySelector('.pts').textContent = r ? r.p : '';
      casilla.classList.toggle('abierta', visible && !!r);
      casilla.classList.toggle('fantasma', !!(e.mostrarTodo && !e.reveladas[k]));
    }
  }

  function listaJugadores(eq) {
    return eq.jugadores && eq.jugadores.length ? eq.jugadores.join(' · ') : '';
  }

  function pintarStrikes(cont, cuantos) {
    for (var i = 0; i < 3; i++) cont.children[i].classList.toggle('on', i < cuantos);
  }

  function pintar(e) {
    $('nombreA').textContent = e.equipos[0].nombre;
    $('nombreB').textContent = e.equipos[1].nombre;
    $('jugA').textContent = listaJugadores(e.equipos[0]);
    $('jugB').textContent = listaJugadores(e.equipos[1]);

    [0, 1].forEach(function (i) {
      var el = $(i === 0 ? 'ptsA' : 'ptsB');
      el.textContent = e.equipos[i].puntos;
      if (e.equipos[i].puntos !== puntosPrevios[i]) {
        el.classList.remove('sube');
        void el.offsetWidth;
        el.classList.add('sube');
        puntosPrevios[i] = e.equipos[i].puntos;
      }
    });

    pintarStrikes($('strA'), e.errores[0]);
    pintarStrikes($('strB'), e.errores[1]);

    $('mA').classList.toggle('turno', e.fase !== 'robo' && e.turno === 0 && e.fase !== 'lobby');
    $('mB').classList.toggle('turno', e.fase !== 'robo' && e.turno === 1 && e.fase !== 'lobby');
    $('mA').classList.toggle('robando', e.fase === 'robo' && e.robador === 0);
    $('mB').classList.toggle('robando', e.fase === 'robo' && e.robador === 1);

    $('bote').textContent = Motor.bote(e);
    $('mult').textContent = e.multiplicador > 1 ? '×' + e.multiplicador : '';

    $('cat').textContent = e.pregunta
      ? 'RONDA ' + e.ronda + ' · ' + e.pregunta.cat + (e.multiplicador > 1 ? ' · VALE ×' + e.multiplicador : '')
      : 'ESPERANDO';
    $('textoPregunta').textContent = e.pregunta ? e.pregunta.texto : 'Abre el panel de control e inicia la ronda';

    var aviso = '';
    if (e.fase === 'inicio') aviso = 'Tiene la palabra ' + e.equipos[e.turno].nombre + ' · un intento';
    else if (e.fase === 'robo') aviso = '¡ROBO! ' + e.equipos[e.robador].nombre + ' tiene un intento';
    else if (e.fase === 'resuelta') aviso = 'Ronda terminada';
    $('aviso').textContent = aviso;

    pintarCasillas(e);

    var enPremio = !!(e.premio && e.premio.activo);
    var fin = e.fase === 'fin';
    $('velo').hidden = !fin || enPremio;
    if (fin) {
      $('veloSub').textContent = e.equipos[e.ganador].nombre;
      $('veloPie').textContent = e.equipos[0].nombre + ' ' + e.equipos[0].puntos +
        '  —  ' + e.equipos[1].nombre + ' ' + e.equipos[1].puntos;
    }

    $('premio').hidden = !enPremio;
    if (enPremio) pintarPremio(e);
  }

  /* ---------- Premio Rápido ---------- */
  function pintarPremio(e) {
    var pr = e.premio;

    $('pNombre1').textContent = pr.nombres[0] || 'Jugador 1';
    $('pNombre2').textContent = pr.nombres[1] || 'Jugador 2';
    $('pNombre1').classList.toggle('activo', pr.jugador === 0 && pr.etapa !== 'fin');
    $('pNombre2').classList.toggle('activo', pr.jugador === 1 && pr.etapa !== 'fin');

    var total = Motor.premioTotal(e);
    $('pTotal').textContent = total;
    $('pMeta').textContent = 'meta ' + pr.meta;

    var rel = $('pReloj');
    rel.textContent = pr.reloj.restante;
    rel.classList.toggle('urgente', pr.reloj.corriendo && pr.reloj.restante <= 5);
    rel.classList.toggle('fuera', !pr.reloj.corriendo);

    var tabla = $('pTabla');
    if (tabla.childElementCount !== 5) {
      tabla.innerHTML = '';
      for (var k = 0; k < 5; k++) {
        var f = document.createElement('div');
        f.className = 'pfila';
        f.innerHTML = '<div class="pq"></div>' +
          '<div class="pr j1"><span class="marca"></span><span class="t"></span><span class="p"></span></div>' +
          '<div class="pr j2"><span class="marca"></span><span class="t"></span><span class="p"></span></div>';
        tabla.appendChild(f);
      }
    }

    for (var i = 0; i < 5; i++) {
      var fila = tabla.children[i];
      var preg = pr.preguntas[i];
      fila.querySelector('.pq').textContent = preg ? preg.texto : '';
      fila.classList.toggle('actual', pr.etapa === 'captura' && pr.actual === i);

      [0, 1].forEach(function (j) {
        var celda = fila.children[j + 1];
        var r = pr.respuestas[j][i];

        /* Lo del jugador 1 se vuelve a tapar mientras el jugador 2 se prepara y
           contesta, para que no lo vea. En cuanto empieza la revelación del
           jugador 2 reaparece completo, y solo entonces se descubren las del 2.
           Nivel 1 muestra la respuesta; nivel 2 agrega el puntaje. */
        var reservada = j === 0 && pr.jugador === 1 && (pr.etapa === 'prep' || pr.etapa === 'captura');
        var n = reservada ? 0 : Motor.premioNivel(pr.revelado[j][i]);
        var oculta = !!r && n === 0;
        var verTexto = !!r && n >= 1;
        var verPuntos = !!r && n >= 2;

        celda.classList.toggle('oculta-cell', oculta);
        celda.classList.toggle('llena', verTexto);
        celda.classList.toggle('dup', verPuntos && !!r.dup);
        celda.classList.toggle('cero', verPuntos && !r.dup && r.p === 0);
        celda.querySelector('.marca').textContent = oculta ? '✓' : '';
        celda.querySelector('.t').textContent = verTexto ? r.t : '';
        celda.querySelector('.p').textContent = verPuntos ? (r.dup ? 0 : r.p) : '';
      });
    }

    var quien = pr.nombres[pr.jugador] || 'el jugador';
    var pie = {
      prep: 'Se prepara ' + quien + ' · ' + pr.reloj.limite + ' segundos',
      captura: 'Responde ' + quien + ' · pregunta ' + (pr.actual + 1) +
        ' de 5 · las respuestas se revelan al terminar',
      revela: pr.jugador === 1
        ? 'Respuestas de ' + (pr.nombres[0] || 'Jugador 1') + ' a la vista · revelando las de ' + quien
        : 'Revelando las respuestas de ' + quien,
      fin: 'Resultado final'
    };
    $('pPie').textContent = pie[pr.etapa] || '';

    var final = $('pFinal');
    final.hidden = pr.etapa !== 'fin';
    final.classList.toggle('pierde', pr.resultado === 'pierde');
    if (pr.etapa === 'fin') {
      $('pFinalTitulo').textContent = pr.resultado === 'gana' ? '¡GANARON EL PREMIO!' : 'NO ALCANZÓ';
      $('pFinalTotal').textContent = total;
      $('pFinalPie').textContent = pr.resultado === 'gana'
        ? (pr.nombres[0] || 'Jugador 1') + ' y ' + (pr.nombres[1] || 'Jugador 2') + ' llegaron a ' + pr.meta
        : 'Faltaron ' + Math.max(0, pr.meta - total) + ' puntos para los ' + pr.meta;
    }
  }

  /* ---------- Animaciones puntuales ---------- */
  function animarEvento(e) {
    var ev = e.evento;
    if (!ev || (ultimoEvento && ev.ts === ultimoEvento)) return;
    ultimoEvento = ev.ts;

    Sonidos.reproducir(ev.tipo);

    if (ev.tipo === 'error' || ev.tipo === 'traspaso') {
      var cuantas = Math.max(1, ev.i || 1);
      var cont = $('strikeGrande');
      var marcas = '';
      for (var m = 0; m < cuantas; m++) marcas += '<span>✕</span>';
      $('strikeX').innerHTML = marcas;
      cont.classList.remove('on');
      void cont.offsetWidth;
      cont.classList.add('on');
    }
    if ((ev.tipo === 'acierto' || ev.tipo === 'robo') && ev.i != null) {
      var c = $('tablero').children[ev.i];
      if (c) { c.classList.remove('destello'); void c.offsetWidth; c.classList.add('destello'); }
    }
    if (ev.tipo === 'victoria' || ev.tipo === 'premio-gana') lanzarConfeti();
  }

  /* Tic-tac de los últimos segundos del Premio Rápido. */
  var ultimoTic = null;
  function tictac(e) {
    var pr = e.premio;
    if (!pr || !pr.activo || !pr.reloj.corriendo) { ultimoTic = null; return; }
    var s = pr.reloj.restante;
    if (s > 0 && s <= 5 && s !== ultimoTic) Sonidos.reproducir('premio-tic');
    ultimoTic = s;
  }

  function lanzarConfeti() {
    var cont = $('confeti');
    cont.innerHTML = '';
    var colores = ['#f4b52a', '#d92d20', '#1f6feb', '#38d39f', '#ffffff'];
    for (var i = 0; i < 120; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colores[i % colores.length];
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      p.style.animationDelay = (Math.random() * 1.2) + 's';
      cont.appendChild(p);
    }
    setTimeout(function () { cont.innerHTML = ''; }, 7000);
  }

  /* ---------- Conexion ---------- */
  function recibir(e) {
    estado = e;
    pintar(e);
    animarEvento(e);
    tictac(e);
  }

  var etiquetaSala = Bus.sala !== 'principal' ? ' · sala ' + Bus.sala : '';
  bus.onEstado(recibir);
  var TEXTO_MODO = {
    servidor: 'Conectado por red local · el panel puede estar en el celular',
    nube: 'Conectado por internet · el panel puede estar en cualquier dispositivo',
    local: 'Modo local · solo se sincroniza con otra ventana de esta misma computadora'
  };
  bus.alCambiarModo = function (m) {
    $('estadoConexion').textContent = (TEXTO_MODO[m] || TEXTO_MODO.local) + etiquetaSala;
  };
  if (etiquetaSala) $('estadoConexion').textContent += etiquetaSala;

  var inicial = bus.pedirEstado();
  if (inicial) recibir(inicial);
  else pintar(Motor.estadoInicial({}));

  /* ---------- Controles del tablero ---------- */
  $('btnPantalla').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });

  $('btnSonido').addEventListener('click', function () {
    var nuevo = !Sonidos.activo();
    Sonidos.activar(nuevo);
    this.textContent = nuevo ? '🔊 Sonido' : '🔇 Silencio';
  });

  /* Sonidos: busca sonidos/*.mp3 al arrancar y permite elegir otra carpeta. */
  Sonidos.autodetectar();
  $('carpetaSonidos').addEventListener('change', function (ev) {
    var hallados = Sonidos.usarCarpeta(ev.target.files);
    var etq = document.querySelector('.btn-archivo');
    etq.firstChild.nodeValue = hallados.length ? '📁 ' + hallados.length + ' sonidos ' : '📁 Sonidos ';
    etq.title = hallados.length
      ? 'Detectados: ' + hallados.join(', ')
      : 'Ningún archivo coincidió. Nombres válidos: ' + Sonidos.CLAVES.join('.mp3, ') + '.mp3';
    if (!hallados.length) alert('Ningún archivo coincidió con los nombres esperados:\n\n' +
      Sonidos.CLAVES.join('.mp3\n') + '.mp3');
  });

  /* Los navegadores exigen un gesto del usuario para habilitar audio. */
  ['click', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      Sonidos.despertar();
      document.removeEventListener(ev, once);
    });
  });

  /* Atajos por si alguien opera desde la misma computadora del tablero. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'f' || ev.key === 'F') $('btnPantalla').click();
  });
})();
