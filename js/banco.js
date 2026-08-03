/* Carga del banco de preguntas.
   1) data/preguntas.json (via fetch, cuando se abre con servidor)
   2) banco guardado por el usuario en localStorage (archivo subido desde el panel)
   3) banco minimo de emergencia, para que el juego nunca quede vacio. */
(function (w) {
  'use strict';

  var LLAVE = 'juego100:banco';

  var EMERGENCIA = [
    { id: 9001, cat: 'Bebes', texto: '¿Qué alimento le darías a un bebé?', respuestas: [
      { t: 'Papilla de verduras', p: 34 }, { t: 'Leche / fórmula', p: 26 },
      { t: 'Plátano machacado', p: 15 }, { t: 'Manzana rallada', p: 11 }, { t: 'Papilla de arroz', p: 8 } ] },
    { id: 9002, cat: 'Casa', texto: 'Menciona algo que siempre se pierde en la casa', respuestas: [
      { t: 'Las llaves', p: 35 }, { t: 'El control de la tele', p: 27 },
      { t: 'El celular', p: 14 }, { t: 'Los calcetines', p: 11 }, { t: 'Las tijeras', p: 8 } ] },
    { id: 9003, cat: 'Comida', texto: 'Menciona un antojito mexicano que se come en la calle', respuestas: [
      { t: 'Tacos', p: 41 }, { t: 'Quesadillas', p: 19 }, { t: 'Elotes / esquites', p: 15 },
      { t: 'Tamales', p: 12 }, { t: 'Tortas', p: 8 } ] },
    { id: 9004, cat: 'Trabajo', texto: 'Menciona una excusa para llegar tarde al trabajo', respuestas: [
      { t: 'Había mucho tráfico', p: 38 }, { t: 'No sonó el despertador', p: 24 },
      { t: 'Se descompuso el carro', p: 14 }, { t: 'Me enfermé', p: 10 }, { t: 'Se enfermó un familiar', p: 8 } ] }
  ];

  function normalizar(datos) {
    var lista = Array.isArray(datos) ? datos : (datos && datos.preguntas) || [];
    return lista.filter(function (p) {
      return p && p.texto && Array.isArray(p.respuestas) && p.respuestas.length >= 3;
    }).map(function (p, i) {
      var respuestas = p.respuestas.slice(0, 8).map(function (r) {
        return { t: r.t || r.texto, p: Number(r.p != null ? r.p : r.personas) || 0 };
      }).sort(function (a, b) { return b.p - a.p; });
      return {
        id: p.id != null ? p.id : 100000 + i,
        cat: p.cat || p.categoria || 'General',
        texto: p.texto,
        set: respuestas.length >= 6 ? 'extendido' : 'clasico',
        respuestas: respuestas
      };
    });
  }

  function guardar(lista) {
    try { localStorage.setItem(LLAVE, JSON.stringify(lista)); } catch (e) {}
  }

  function leerGuardado() {
    try {
      var c = localStorage.getItem(LLAVE);
      return c ? JSON.parse(c) : null;
    } catch (e) { return null; }
  }

  var ARCHIVOS = ['data/preguntas.json', 'data/preguntas-6a8.json'];

  function traer(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(normalizar)
      .catch(function () { return []; });
  }

  function cargar() {
    return Promise.all(ARCHIVOS.map(traer)).then(function (partes) {
      var vistos = {}, lista = [];
      partes.forEach(function (parte) {
        parte.forEach(function (p) {
          if (vistos[p.id]) return;
          vistos[p.id] = 1;
          lista.push(p);
        });
      });
      if (lista.length) {
        guardar(lista);
        return { lista: lista, origen: 'archivo' };
      }
      var g = leerGuardado();
      if (g && g.length) return { lista: g, origen: 'guardado' };
      return { lista: normalizar(EMERGENCIA), origen: 'emergencia' };
    });
  }

  w.Banco = {
    cargar: cargar,
    normalizar: normalizar,
    guardar: guardar,
    categorias: function (lista) {
      var s = {};
      lista.forEach(function (p) { s[p.cat] = (s[p.cat] || 0) + 1; });
      return Object.keys(s).sort();
    }
  };
})(window);
