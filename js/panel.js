/* Panel de control: es el dueño del estado. Cada accion recalcula y publica al tablero. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var bus = Bus.crear({ rol: 'panel' });
  var banco = [];
  var multiplicadorElegido = 1;
  var estado = bus.pedirEstado() || Motor.estadoInicial({});
  var inicialElegido = estado.turno || 0;
  var espiando = false;   // ver a propósito lo capturado en el Premio Rápido

  function publicar(nuevo) {
    estado = talVezPremio(nuevo);
    bus.enviar(estado);
    pintar();
  }

  /* Al llegar a la meta, el segundo juego arranca solo (el tablero cambia de pantalla). */
  function talVezPremio(e) {
    if (e.fase !== 'fin' || e.premio || !banco.length) return e;
    var ganador = e.equipos[e.ganador];
    var nombres = [
      (ganador.jugadores && ganador.jugadores[0]) || 'Jugador 1',
      (ganador.jugadores && ganador.jugadores[1]) || 'Jugador 2'
    ];
    var meta = Number($('inMetaPremio').value) || 200;
    return Motor.iniciarPremio(e, Motor.preguntasAleatorias(banco, e.usadas, 5), nombres, meta);
  }

  function escapar(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function marcarGrupo(selector, activo) {
    document.querySelectorAll(selector).forEach(function (b) {
      b.classList.toggle('on', activo(b));
    });
  }

  /* ---------- Render ---------- */
  function pintar() {
    var e = estado;
    var enPremio = !!(e.premio && e.premio.activo);
    $('juego1').hidden = enPremio;
    $('juego2').hidden = !enPremio;
    if (enPremio) { pintarPremio(e); return; }

    var nomA = e.equipos[0].nombre, nomB = e.equipos[1].nombre;

    if (document.activeElement !== $('inNombreA')) $('inNombreA').value = nomA;
    if (document.activeElement !== $('inNombreB')) $('inNombreB').value = nomB;

    $('pA').textContent = e.equipos[0].puntos;
    $('pB').textContent = e.equipos[1].puntos;
    $('errA').textContent = new Array(e.errores[0] + 1).join('✕');
    $('errB').textContent = new Array(e.errores[1] + 1).join('✕');
    $('bote').textContent = Motor.bote(e);
    $('metaTxt').textContent = e.meta;
    $('numRonda').textContent = e.ronda;

    $('eqA').className = 'eq' + (e.fase === 'robo' ? (e.robador === 0 ? ' roba' : '') : (e.turno === 0 ? ' activo' : ''));
    $('eqB').className = 'eq' + (e.fase === 'robo' ? (e.robador === 1 ? ' roba' : '') : (e.turno === 1 ? ' activo' : ''));

    $('cat').textContent = e.pregunta ? (e.pregunta.cat + ' · ' + e.pregunta.respuestas.length + ' respuestas') : '';
    $('preg').textContent = e.pregunta ? e.pregunta.texto : 'Presiona “Nueva pregunta” para empezar.';

    /* Botones de "quien empieza" con el nombre real de cada equipo */
    var botonesInicio = document.querySelectorAll('[data-inicia]');
    botonesInicio[0].textContent = nomA;
    botonesInicio[1].textContent = nomB;
    var enJuego = e.fase === 'inicio' || e.fase === 'ronda' || e.fase === 'robo';
    marcarGrupo('[data-inicia]', function (b) {
      return Number(b.dataset.inicia) === (enJuego ? e.turno : inicialElegido);
    });

    marcarGrupo('[data-mult]', function (b) {
      return Number(b.dataset.mult) === (e.pregunta ? e.multiplicador : multiplicadorElegido);
    });
    marcarGrupo('[data-cols]', function (b) { return Number(b.dataset.cols) === (e.columnas || 0); });

    document.querySelectorAll('[data-bote]').forEach(function (b) {
      b.disabled = !e.pregunta || e.fase === 'resuelta' || e.fase === 'fin' || Motor.bote(e) === 0;
      b.textContent = 'Darle el bote (' + Motor.bote(e) + ')';
    });

    $('aviso').innerHTML = mensaje(e, nomA, nomB);
    pintarRespuestas(e);

    $('btnError').disabled = !enJuego;
    $('btnError').textContent = e.fase === 'robo' ? '✕ ROBO FALLIDO'
      : e.fase === 'inicio' ? '✕ ERROR (pasa el turno)'
      : '✕ ERROR ' + (e.errores[e.turno] + 1) + ' de 3';
  }

  function mensaje(e, nomA, nomB) {
    var nom = function (i) { return escapar(i === 0 ? nomA : nomB); };
    if (e.fase === 'inicio') {
      return '<div class="aviso">Tiene la palabra <b>' + nom(e.turno) + '</b>. Si falla, el turno pasa ' +
        'automáticamente a ' + nom(1 - e.turno) + '.</div>';
    }
    if (e.fase === 'ronda') {
      return '<div class="aviso">Juega <b>' + nom(e.turno) + '</b> · le quedan ' +
        (3 - e.errores[e.turno]) + ' errores antes de ceder el turno.</div>';
    }
    if (e.fase === 'robo') {
      return '<div class="aviso">🎯 <b>' + nom(e.robador) + '</b> puede ROBAR: si acierta una respuesta oculta se lleva ' +
        Motor.bote(e) + ' pts. Si falla, son para ' + nom(e.turno) + '.</div>';
    }
    if (e.fase === 'resuelta') return '<div class="aviso">Ronda cerrada. Presiona “Nueva pregunta”.</div>';
    if (e.fase === 'fin') return '<div class="aviso gana">🏆 Ganó <b>' + nom(e.ganador) + '</b>. Reinicia para jugar otra vez.</div>';
    return '';
  }

  function pintarRespuestas(e) {
    var cont = $('respuestas');
    cont.innerHTML = '';
    if (!e.pregunta) return;
    var activo = e.fase === 'inicio' || e.fase === 'ronda' || e.fase === 'robo';
    e.pregunta.respuestas.forEach(function (r, i) {
      var b = document.createElement('button');
      b.className = 'resp' + (e.reveladas[i] ? ' hecha' : '');
      b.innerHTML = '<span class="i">' + (i + 1) + '</span><span class="t">' + escapar(r.t) +
        '</span><span class="p">' + r.p + '</span>';
      b.disabled = e.reveladas[i] || !activo;
      b.addEventListener('click', function () { publicar(Motor.acertar(estado, i)); });
      cont.appendChild(b);
    });
  }

  /* ---------- Acciones de ronda ---------- */
  function poolFiltrado() {
    var set = $('inSet').value, cat = $('inCat').value;
    return banco.filter(function (p) {
      return (!set || p.set === set) && (!cat || p.cat === cat);
    });
  }

  function nuevaPregunta() {
    var pool = poolFiltrado();
    if (!pool.length) { alert('No hay preguntas con ese banco y esa categoría.'); return; }
    var p = Motor.preguntaAleatoria(pool, estado.usadas, '');
    publicar(Motor.nuevaRonda(estado, p, multiplicadorElegido, inicialElegido));
  }

  $('btnNueva').addEventListener('click', nuevaPregunta);
  $('btnSaltar').addEventListener('click', function () {
    if (estado.pregunta && estado.usadas.indexOf(estado.pregunta.id) === -1) estado.usadas.push(estado.pregunta.id);
    nuevaPregunta();
  });
  $('btnError').addEventListener('click', function () { publicar(Motor.fallar(estado)); });
  $('btnRevelarTodo').addEventListener('click', function () { publicar(Motor.revelarTodo(estado)); });
  $('btnReiniciar').addEventListener('click', function () {
    if (confirm('¿Reiniciar la partida? Se pierden los puntos.')) publicar(Motor.reiniciar(estado));
  });

  document.querySelectorAll('[data-inicia]').forEach(function (b) {
    b.addEventListener('click', function () {
      inicialElegido = Number(b.dataset.inicia);
      if (estado.fase === 'inicio' || estado.fase === 'ronda' || estado.fase === 'robo') {
        publicar(Motor.elegirInicial(estado, inicialElegido));
      } else pintar();
    });
  });

  document.querySelectorAll('[data-mult]').forEach(function (b) {
    b.addEventListener('click', function () {
      multiplicadorElegido = Number(b.dataset.mult);
      if (estado.pregunta && estado.fase !== 'resuelta' && estado.fase !== 'fin') {
        publicar(Motor.setMultiplicador(estado, multiplicadorElegido));
      } else pintar();
    });
  });

  document.querySelectorAll('[data-cols]').forEach(function (b) {
    b.addEventListener('click', function () { publicar(Motor.setColumnas(estado, Number(b.dataset.cols))); });
  });

  document.querySelectorAll('[data-pts]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.pts.split(',');
      publicar(Motor.ajustarPuntos(estado, Number(v[0]), Number(v[1])));
    });
  });

  document.querySelectorAll('[data-turno]').forEach(function (b) {
    b.addEventListener('click', function () {
      var q = Number(b.dataset.turno);
      if (estado.turno !== q) publicar(Motor.elegirInicial(estado, q));
    });
  });

  document.querySelectorAll('[data-bote]').forEach(function (b) {
    b.addEventListener('click', function () {
      publicar(Motor.asignarBote(estado, Number(b.dataset.bote)));
    });
  });

  /* ---------- Nombres, jugadores y meta ---------- */
  function aplicarNombres() {
    publicar(Motor.configurar(estado, {
      nombres: [$('inNombreA').value.trim() || 'Equipo 1', $('inNombreB').value.trim() || 'Equipo 2']
    }));
  }
  $('inNombreA').addEventListener('change', aplicarNombres);
  $('inNombreB').addEventListener('change', aplicarNombres);

  $('btnAplicar').addEventListener('click', function () {
    var lista = function (v) {
      return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
    };
    publicar(Motor.configurar(estado, {
      jugadores: [lista($('inJugA').value), lista($('inJugB').value)],
      meta: Number($('inMeta').value) || 350
    }));
  });

  /* ---------- Banco ---------- */
  function refrescarCategorias() {
    var set = $('inSet').value;
    var previa = $('inCat').value;
    var sub = banco.filter(function (p) { return !set || p.set === set; });
    var sel = $('inCat');
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    Banco.categorias(sub).forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    sel.value = previa;
    if (sel.selectedIndex < 0) sel.value = '';
    $('infoBanco').textContent = sub.length + ' preguntas disponibles con este filtro · ' +
      banco.length + ' en total.';
  }
  $('inSet').addEventListener('change', refrescarCategorias);

  function usarBanco(lista, origen) {
    banco = lista;
    refrescarCategorias();
    var extra = {
      guardado: ' Se usó el archivo que subiste antes (el navegador no pudo leer la carpeta data/: ábrelo con el servidor).',
      emergencia: ' No se pudieron leer los archivos de data/. Sube uno aquí abajo o inicia el servidor.'
    }[origen] || '';
    $('infoBanco').textContent += extra;
  }
  Banco.cargar().then(function (r) { usarBanco(r.lista, r.origen); });

  $('archivoJson').addEventListener('change', function (ev) {
    var f = ev.target.files[0];
    if (!f) return;
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var lista = Banco.normalizar(JSON.parse(lector.result));
        if (!lista.length) throw new Error('sin preguntas válidas');
        Banco.guardar(lista);
        usarBanco(lista, 'guardado');
        alert('Listo: ' + lista.length + ' preguntas cargadas.');
      } catch (e) {
        alert('El archivo no es válido: ' + e.message);
      }
    };
    lector.readAsText(f, 'utf-8');
  });

  /* =====================================================================
     PREMIO RAPIDO
     ===================================================================== */
  function pintarPremio(e) {
    var pr = e.premio;
    $('aviso').innerHTML = '';

    if (document.activeElement !== $('prNombre1')) $('prNombre1').value = pr.nombres[0] || '';
    if (document.activeElement !== $('prNombre2')) $('prNombre2').value = pr.nombres[1] || '';

    $('prTurno').textContent = pr.nombres[pr.jugador] || ('Jugador ' + (pr.jugador + 1));
    $('prTotal').textContent = Motor.premioTotal(e) + ' / ' + pr.meta;
    $('prReloj').textContent = pr.reloj.restante + ' s';
    $('prReloj').className = pr.reloj.corriendo && pr.reloj.restante <= 5 ? 'urgente' : '';

    var titulos = {
      prep: 'Preparación · ' + (pr.nombres[pr.jugador] || 'jugador'),
      captura: 'Capturando respuestas',
      revela: 'Revelación de ' + (pr.nombres[pr.jugador] || 'jugador'),
      fin: 'Resultado'
    };
    $('prEtapaTitulo').textContent = titulos[pr.etapa];

    $('prPrep').hidden = pr.etapa !== 'prep';
    $('prCaptura').hidden = pr.etapa !== 'captura';
    $('prRevela').hidden = pr.etapa !== 'revela';
    $('prFin').hidden = pr.etapa !== 'fin';

    $('prComenzar').textContent = '▶ Comenzar los ' + pr.reloj.limite + ' segundos';

    var textos = {
      prep: 'Aísla al otro jugador. Al presionar comenzar arranca el reloj de ' + pr.reloj.limite + ' segundos.',
      captura: 'Toca la respuesta que dio el jugador, o “No está en el tablero”. Se guarda sin mostrarse: ' +
        'el punto • indica que la pregunta ya quedó registrada. Usa 👁 solo si necesitas corregir.',
      revela: pr.jugador === 1
        ? 'Revela una por una. Las repetidas del jugador 1 valen 0.'
        : 'Revela una por una y luego pasa al jugador 2.',
      fin: pr.resultado === 'gana' ? '¡Ganaron el premio!' : 'No alcanzaron la meta.'
    };
    $('prAviso').textContent = textos[pr.etapa] || '';

    /* Durante la captura las respuestas quedan guardadas pero no se muestran,
       para que nadie las vea de reojo. El botón del ojo las descubre a propósito. */
    var aCiegas = pr.etapa === 'captura' && !espiando;
    $('prEspiar').classList.toggle('on', espiando);
    $('prEspiar').textContent = espiando ? '🙈' : '👁';

    /* Pasos 1..5 */
    var pasos = $('prPasos');
    pasos.innerHTML = '';
    for (var k = 0; k < 5; k++) {
      (function (i) {
        var b = document.createElement('button');
        var r = pr.respuestas[pr.jugador][i];
        var marca = !r ? '' : aCiegas ? ' •' : (r.p ? ' ✓' : ' ✕');
        b.textContent = (i + 1) + marca;
        b.className = pr.actual === i ? 'on' : (r ? 'lista' : '');
        b.addEventListener('click', function () { publicar(Motor.premioIrA(estado, i)); });
        pasos.appendChild(b);
      })(k);
    }

    var preg = pr.preguntas[pr.actual];
    $('prCat').textContent = preg ? ('Pregunta ' + (pr.actual + 1) + ' de 5 · ' + preg.cat) : '';
    $('prPregunta').textContent = preg ? preg.texto : '';

    var cont = $('prRespuestas');
    cont.innerHTML = '';
    if (preg) {
      preg.respuestas.forEach(function (r, i) {
        var dada = pr.respuestas[pr.jugador][pr.actual];
        var otra = pr.respuestas[1 - pr.jugador][pr.actual];
        var repetiria = pr.jugador === 1 && otra && otra.sel === i && !aCiegas;
        var b = document.createElement('button');
        b.className = 'resp' + (!aCiegas && dada && dada.sel === i ? ' hecha' : '') +
          (repetiria ? ' repetida' : '');
        b.innerHTML = '<span class="i">' + (i + 1) + '</span><span class="t">' + escapar(r.t) +
          (repetiria ? ' <em>(ya la dijo)</em>' : '') + '</span><span class="p">' + r.p + '</span>';
        b.addEventListener('click', function () { publicar(Motor.premioResponder(estado, i)); });
        cont.appendChild(b);
      });
    }

    /* Lista de revelacion */
    var lista = $('prLista');
    lista.innerHTML = '';
    pr.preguntas.forEach(function (p, i) {
      var r = pr.respuestas[pr.jugador][i];
      var visto = pr.revelado[pr.jugador][i];
      var b = document.createElement('button');
      b.className = 'resp' + (visto ? ' hecha' : '');
      b.innerHTML = '<span class="i">' + (i + 1) + '</span><span class="t">' +
        escapar(r ? r.t : '(sin respuesta)') + '</span><span class="p">' +
        (visto ? (r && r.dup ? 0 : (r ? r.p : 0)) : '?') + '</span>';
      b.disabled = visto;
      b.addEventListener('click', function () { publicar(Motor.premioRevelar(estado, i)); });
      lista.appendChild(b);
    });

    var faltan = pr.revelado[pr.jugador].indexOf(false) !== -1;
    $('prRevelarSig').disabled = !faltan;
    $('prSiguienteJugador').hidden = pr.jugador === 1;
    $('prVerResultado').hidden = pr.jugador === 0;
  }

  function nombresPremio() {
    var e = estado;
    if (!e.premio) return e;
    var n = [$('prNombre1').value.trim() || 'Jugador 1', $('prNombre2').value.trim() || 'Jugador 2'];
    var copia = JSON.parse(JSON.stringify(e));
    copia.premio.nombres = n;
    return copia;
  }
  $('prNombre1').addEventListener('change', function () { publicar(nombresPremio()); });
  $('prNombre2').addEventListener('change', function () { publicar(nombresPremio()); });

  $('prEspiar').addEventListener('click', function () { espiando = !espiando; pintar(); });

  $('prComenzar').addEventListener('click', function () {
    espiando = false;
    publicar(Motor.premioComenzar(estado));
  });
  $('prPausar').addEventListener('click', function () {
    publicar(Motor.premioReloj(estado, estado.premio.reloj.restante, false));
  });
  $('prReanudar').addEventListener('click', function () {
    publicar(Motor.premioReloj(estado, estado.premio.reloj.restante, true));
  });
  $('prResetReloj').addEventListener('click', function () {
    publicar(Motor.premioReloj(estado, estado.premio.reloj.limite, false));
  });
  $('prNoEsta').addEventListener('click', function () { publicar(Motor.premioResponder(estado, -1)); });
  $('prSaltar').addEventListener('click', function () { publicar(Motor.premioSaltar(estado)); });
  $('prTerminarCaptura').addEventListener('click', function () {
    publicar(Motor.premioRevelar(estado, 0));
  });
  $('prRevelarSig').addEventListener('click', function () { publicar(Motor.premioRevelar(estado, null)); });
  $('prSiguienteJugador').addEventListener('click', function () {
    espiando = false;
    publicar(Motor.premioSiguienteJugador(estado));
  });
  $('prVerResultado').addEventListener('click', function () { publicar(Motor.premioFinal(estado)); });
  $('prCerrar').addEventListener('click', function () { publicar(Motor.premioCerrar(estado)); });

  /* Reloj: el panel es quien cuenta y publica, asi todos ven lo mismo. */
  setInterval(function () {
    var pr = estado.premio;
    if (!pr || !pr.activo || !pr.reloj.corriendo) return;
    publicar(Motor.premioReloj(estado, pr.reloj.restante - 1, pr.reloj.restante - 1 > 0));
  }, 1000);

  /* ---------- Sala y enlaces ---------- */
  (function () {
    var base = location.href.split('#')[0].replace(/panel\.html.*$/, '').replace(/\?.*$/, '');
    var cola = Bus.sala !== 'principal' ? '?sala=' + encodeURIComponent(Bus.sala) : '';
    $('salaActual').textContent = Bus.sala;
    $('urlTablero').value = base + cola;

    $('btnCopiarTablero').addEventListener('click', function () {
      var campo = $('urlTablero');
      campo.select();
      if (navigator.clipboard) navigator.clipboard.writeText(campo.value).catch(function () {});
      else try { document.execCommand('copy'); } catch (e) {}
      this.textContent = '¡Copiado!';
      var b = this;
      setTimeout(function () { b.textContent = 'Copiar enlace'; }, 1500);
    });

    $('btnNuevaSala').addEventListener('click', function () {
      var codigo = Math.random().toString(36).slice(2, 7);
      if (confirm('Se abrirá el panel en la sala "' + codigo + '".\nRecuerda abrir el tablero en la misma sala.')) {
        location.href = base + 'panel.html?sala=' + codigo;
      }
    });
  })();

  /* ---------- Sonidos ---------- */
  (function () {
    var ul = $('listaSonidos');
    Sonidos.CLAVES.forEach(function (k) {
      var li = document.createElement('li');
      li.innerHTML = '<code>' + k + '.mp3</code>';
      ul.appendChild(li);
    });
    Sonidos.autodetectar();

    function refrescar(hallados) {
      $('infoSonidos').textContent = hallados.length
        ? 'Detectados en este dispositivo: ' + hallados.join(', ')
        : 'Todavía no se detecta ningún MP3; se están usando los sonidos sintetizados.';
    }
    setTimeout(function () { refrescar(Sonidos.detectados()); }, 1200);

    $('btnProbarSonidos').addEventListener('click', function () {
      var d = Sonidos.detectados();
      refrescar(d);
      Sonidos.despertar();
      (d.length ? d : ['acierto', 'error', 'victoria']).slice(0, 4).forEach(function (k, i) {
        setTimeout(function () { Sonidos.reproducir(k); }, i * 700);
      });
    });

    $('prCarpetaSonidos').addEventListener('change', function (ev) {
      refrescar(Sonidos.usarCarpeta(ev.target.files));
    });
  })();

  /* ---------- Sincronia ---------- */
  var recibioAlgo = false;
  bus.onEstado(function (e) {
    if (!e) return;
    recibioAlgo = true;
    if (estado && e.evento && estado.evento && e.evento.ts === estado.evento.ts) return;
    estado = e;
    sincronizarFormulario();
    pintar();
  });
  bus.alCambiarModo = function (m) {
    var el = $('estadoConexion');
    el.textContent = m === 'servidor' ? 'conectado por red' : 'modo local';
    el.classList.toggle('ok', m === 'servidor');
  };

  function sincronizarFormulario() {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    $('inJugA').value = estado.equipos[0].jugadores.join(', ');
    $('inJugB').value = estado.equipos[1].jugadores.join(', ');
    $('inMeta').value = estado.meta;
    if (estado.premio) $('inMetaPremio').value = estado.premio.meta;
  }
  sincronizarFormulario();

  /* Si nadie mas tiene el estado (nadie respondio), publicamos el nuestro. */
  setTimeout(function () { if (!recibioAlgo) bus.enviar(estado); }, 900);
  pintar();
})();
