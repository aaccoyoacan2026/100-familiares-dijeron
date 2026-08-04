/* Servidor sin dependencias: sirve el juego y sincroniza tablero <-> panel por SSE.
   Local:  node servidor.js  [puerto]
   Nube :  usa process.env.PORT (Render, Railway, Fly, Glitch, etc.)
   Salas:  cada partida vive en ?sala=xxxx, asi varias no se pisan en la misma URL. */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var url = require('url');

var PUERTO = Number(process.env.PORT) || Number(process.argv[2]) || 8080;
var RAIZ = __dirname;
var MAX_SALAS = 200;

var TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/* salas[nombre] = { estado, clientes: [res], visto: timestamp } */
var salas = Object.create(null);

function limpiarNombre(s) {
  return (s || 'principal').toString().replace(/[^\w-]/g, '').slice(0, 24) || 'principal';
}

function sala(nombre) {
  nombre = limpiarNombre(nombre);
  if (!salas[nombre]) {
    var vivas = Object.keys(salas);
    if (vivas.length >= MAX_SALAS) {           // recicla la mas vieja sin clientes
      vivas.sort(function (a, b) { return salas[a].visto - salas[b].visto; });
      for (var i = 0; i < vivas.length; i++) {
        if (!salas[vivas[i]].clientes.length) { delete salas[vivas[i]]; break; }
      }
    }
    salas[nombre] = { estado: null, clientes: [], visto: Date.now() };
  }
  salas[nombre].visto = Date.now();
  return salas[nombre];
}

function difundir(s) {
  var carga = 'data: ' + JSON.stringify({ estado: s.estado }) + '\n\n';
  s.clientes = s.clientes.filter(function (res) {
    try { res.write(carga); return true; } catch (e) { return false; }
  });
}

var servidor = http.createServer(function (req, res) {
  var partes = url.parse(req.url, true);
  var ruta = partes.pathname;
  var s = sala(partes.query.sala);

  if (ruta === '/eventos') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 2000\n\n');
    res.write('data: ' + JSON.stringify({ estado: s.estado }) + '\n\n');
    s.clientes.push(res);
    var latido = setInterval(function () { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
    req.on('close', function () {
      clearInterval(latido);
      s.clientes = s.clientes.filter(function (c) { return c !== res; });
    });
    return;
  }

  if (ruta === '/estado' && req.method === 'POST') {
    var cuerpo = '';
    req.on('data', function (c) {
      cuerpo += c;
      if (cuerpo.length > 5e6) req.destroy();
    });
    req.on('end', function () {
      try { s.estado = JSON.parse(cuerpo); difundir(s); } catch (e) {}
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      res.end();
    });
    return;
  }

  if (ruta === '/estado') {
    res.writeHead(200, { 'Content-Type': TIPOS['.json'] });
    res.end(JSON.stringify(s.estado));
    return;
  }

  if (ruta === '/salud') {                      // para los health checks de la nube
    res.writeHead(200, { 'Content-Type': TIPOS['.json'] });
    res.end(JSON.stringify({ ok: true, salas: Object.keys(salas).length }));
    return;
  }

  /* Archivos estaticos */
  var rel = decodeURIComponent(ruta === '/' ? '/index.html' : ruta);
  var destino = path.normalize(path.join(RAIZ, rel));
  if (destino.indexOf(RAIZ) !== 0) { res.writeHead(403); res.end('403'); return; }

  fs.readFile(destino, function (err, datos) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(datos);
  });
});

function ips() {
  var lista = [];
  var redes = os.networkInterfaces();
  Object.keys(redes).forEach(function (n) {
    redes[n].forEach(function (d) {
      if (d.family === 'IPv4' && !d.internal) lista.push(d.address);
    });
  });
  return lista;
}

servidor.listen(PUERTO, '0.0.0.0', function () {
  console.log('\n  100 Personas Dijeron — servidor listo en el puerto ' + PUERTO + '\n');
  if (process.env.PORT) {
    console.log('  Modo nube: usa la URL publica de tu servicio.');
    console.log('  Tablero: <URL>/            Panel: <URL>/panel.html');
    console.log('  Para separar partidas agrega ?sala=loquesea a las dos direcciones.\n');
  } else {
    console.log('  Tablero (TV) :  http://localhost:' + PUERTO + '/');
    ips().forEach(function (ip) {
      console.log('  Panel (celular): http://' + ip + ':' + PUERTO + '/panel.html');
    });
    console.log('\n  El celular debe estar en la misma red WiFi. Ctrl+C para detener.\n');
  }
});
