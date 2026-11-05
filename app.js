// app.js — la página del Secretario.
import * as N from './nucleo.js?v=6';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
  json(k, d = null) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
};
const REPO_DEF = 'julietapeveroni-sp/Secretario-datos';

// ───────────────────────── íconos ─────────────────────────
const I = {
  sol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  luna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  refrescar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  puntos: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 5v5h5"/></svg>',
  saltar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5.5v13l9-6.5z"/><rect x="16" y="5" width="2.5" height="14" rx="1"/></svg>',
  ola: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></svg>',
  lapiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  asa: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  basura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

// ───────────────────────── GitHub ─────────────────────────
const b64enc = (s) => {
  const b = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64dec = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

// ?local en localhost: lee ../datos/ del disco y no escribe nada (para probar).
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('local');

const GH = {
  get repo() { return ls.get('sec.repo', REPO_DEF); },
  get token() { return LOCAL ? 'local' : ls.get('sec.token'); },
  async req(path, opts = {}) {
    if (LOCAL) {
      if (opts.method === 'PUT') return new Response(JSON.stringify({ content: { sha: `local${Date.now()}` } }), { status: 200 });
      const r = await fetch(`../${path.split('?')[0]}?t=${Date.now()}`);
      if (!r.ok) return new Response('', { status: 404 });
      const txt = await r.text();
      return new Response(JSON.stringify({ content: b64enc(txt), sha: 'local' }), { status: 200 });
    }
    return fetch(`https://api.github.com/repos/${this.repo}/contents/${path}`, {
      ...opts,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
    });
  },
  async leer(path) {
    const r = await this.req(`${path}?t=${Date.now()}`);
    if (r.status === 404) return { data: null, sha: null };
    if (r.status === 401 || r.status === 403) { const e = new Error('La llave no sirve o no tiene permiso'); e.auth = true; throw e; }
    if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
    const j = await r.json();
    return { data: JSON.parse(b64dec(j.content)), sha: j.sha };
  },
  async escribir(path, data, sha, msg) {
    const r = await this.req(path, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64enc(JSON.stringify(data, null, 2) + '\n'), ...(sha ? { sha } : {}) }) });
    if (r.status === 409 || r.status === 422) { const e = new Error('conflicto'); e.conflicto = true; throw e; }
    if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
    return (await r.json()).content.sha;
  },
};

// ───────────────────────── estado de la app ─────────────────────────
const S = {
  estado: null, sha: null, cal: null, briefing: null, corrida: null,
  sucio: false, guardando: false, otraVez: false, error: null, sinConexion: false,
  tab: ls.get('sec.tab', 'hoy'), fechas: ls.json('sec.fechas', {}), A: null,
};

function cachear() {
  ls.set('sec.cache', JSON.stringify({ estado: S.estado, sha: S.sha, cal: S.cal, briefing: S.briefing, corrida: S.corrida, sucio: S.sucio }));
}

async function cargar(primera = false) {
  try {
    const [e, c, b, k] = await Promise.all([
      GH.leer('datos/estado.json'), GH.leer('datos/calendario.json').catch(() => ({})),
      GH.leer('datos/briefing.json').catch(() => ({})), GH.leer('datos/corrida.json').catch(() => ({})),
    ]);
    if (!e.data) throw new Error('No encontré datos/estado.json en el repo');
    if (S.sucio && S.estado) { S.estado = N.fusionar(S.estado, e.data); S.sha = e.sha; programarGuardado(0); }
    else { S.estado = N.asegurarEstado(e.data); S.sha = e.sha; }
    if (!S.calVivo) S.cal = c.data || S.cal;
    S.briefing = b.data || null;
    S.corrida = k.data || null;
    S.error = null; S.sinConexion = false;
    cachear();
    render();
    if (primera) { calendarioEnVivo(); fechasClientes(); cargarClima(); }
  } catch (err) {
    if (err.auth) { ls.del('sec.token'); return vistaLogin(err.message); }
    S.sinConexion = true; S.error = err.message;
    if (S.estado) render(); else vistaLogin(`No pude cargar: ${err.message}`);
  }
}

let tGuardar = null;
function programarGuardado(ms = 700) {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(guardar, ms);
}
async function guardar(intento = 0) {
  if (!S.sucio) return;
  if (S.guardando) { S.otraVez = true; return; }
  S.guardando = true; pintarSync();
  const enviado = JSON.stringify(S.estado);
  try {
    S.sha = await GH.escribir('datos/estado.json', S.estado, S.sha, 'Página: actualización');
    if (JSON.stringify(S.estado) === enviado) S.sucio = false;
    S.sinConexion = false; S.error = null;
  } catch (err) {
    if (err.conflicto && intento < 3) {
      try {
        const r = await GH.leer('datos/estado.json');
        S.estado = N.fusionar(S.estado, r.data); S.sha = r.sha;
        S.guardando = false;
        return guardar(intento + 1);
      } catch {}
    }
    S.sinConexion = true; S.error = err.message;
    setTimeout(() => guardar(), 30000);
  } finally {
    S.guardando = false; cachear(); pintarSync();
    if (S.otraVez) { S.otraVez = false; programarGuardado(200); }
  }
}

const ahoraMs = () => Date.now();
function mutar(fn, aviso) {
  fn(S.estado);
  S.sucio = true;
  cachear(); render(); programarGuardado();
  if (aviso) toast(aviso);
}

// ───────────────────────── calendario en vivo (Apps Script) ─────────────────────────
async function calendarioEnVivo() {
  const cfg = S.estado?.config?.calendario;
  if (!cfg?.url || !cfg?.clave) return;
  try {
    const hoy = new Date();
    const u = new URL(cfg.url);
    u.searchParams.set('clave', cfg.clave);
    u.searchParams.set('accion', 'eventos');
    u.searchParams.set('desde', N.diaStr(N.sumarDias(hoy, -14)));
    u.searchParams.set('hasta', N.diaStr(N.sumarDias(hoy, 120)));
    const r = await fetch(u);
    const j = await r.json();
    if (j.eventos) { S.cal = { actualizado: new Date().toISOString(), fuente: 'en vivo', eventos: j.eventos }; S.calVivo = true; cachear(); render(); }
  } catch (e) { console.warn('calendario en vivo', e); }
}
async function postCalendario(body) {
  const cfg = S.estado?.config?.calendario;
  if (!cfg?.url || !cfg?.clave) return null;
  const u = new URL(cfg.url);
  u.searchParams.set('clave', cfg.clave);
  u.searchParams.set('accion', 'sync');
  const r = await fetch(u, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  return r.json();
}

async function fechasClientes() {
  for (const a of S.estado.areas.filter((a) => a.fechasUrl)) {
    try {
      const r = await fetch(`${a.fechasUrl}?t=${Date.now()}`);
      const lista = await r.json();
      S.fechas[a.id] = (Array.isArray(lista) ? lista : []).filter((f) => f.visible !== false);
    } catch {}
  }
  ls.set('sec.fechas', JSON.stringify(S.fechas));
  render();
}

// ───────────────────────── formato ─────────────────────────
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
const fechaCorta = (s) => { const d = N.parseDia(s); return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`; };
function vence(s) {
  const n = N.diasEntre(new Date(), N.parseDia(s));
  if (n < -1) return { txt: `venció hace ${-n} días`, cls: 'rojo' };
  if (n === -1) return { txt: 'venció ayer', cls: 'rojo' };
  if (n === 0) return { txt: 'vence hoy', cls: 'hoy' };
  if (n === 1) return { txt: 'mañana', cls: '' };
  if (n < 7) return { txt: fechaCorta(s), cls: '' };
  return { txt: fechaCorta(s), cls: '' };
}
const area = (id) => S.estado.areas.find((a) => a.id === id) || { id, nombre: 'Otro', corto: 'Otro', color: 'var(--acento)' };
const areaShows = () => (S.estado.areas.find((a) => a.shows) || S.estado.areas[0] || { id: '' }).id;
const nivelHtml = (n, chico = false) => `<span class="nivel n-${n} ${chico ? 'chico' : ''}">${N.NIVELES[n].nombre}</span>`;
const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
const nombrePieza = (p) => `${p.cuota.nombre}${N.cantidadEn(p.cuota, p.lunes) > 1 ? ` ${p.n}` : ''}${p.titulo ? ` · ${p.titulo}` : ''}`;
const semNum = (id) => id.split('-W')[1];

function saludo(d) {
  const h = d.getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}
const FRASES = {
  adelantado: ['Vas con viento a favor.', 'Estás adelantado. Disfrutá el margen.', 'Ritmo bárbaro, seguí así.'],
  al_dia: ['Vas bien. Un paso a la vez.', 'Todo en orden. Tranqui.', 'Al día y sin apuro.'],
  en_riesgo: ['Se puede. Priorizá lo que vence primero.', 'Un empujoncito hoy y llegás.', 'Foco en lo importante, el resto espera.'],
  atrasado: ['Respirá. Ordenemos y vamos de a una.', 'Hoy no es para todo, es para lo urgente.', 'Hablar con un cliente a tiempo también es trabajar.'],
  libre: ['Semana despejada. Buen momento para avanzar en lo que más te gusta.', 'Nada urgente. Elegí algo que te guste.'],
};
const frase = (n) => { const l = FRASES[n] || FRASES.al_dia; return l[new Date().getDate() % l.length]; };
const CELEBRA = ['¡Bien ahí!', 'Una menos.', 'Así se hace.', 'Vas bárbaro.', 'Excelente.', 'Eso.'];

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 2800);
}

// ───────────────────────── render ─────────────────────────
function render() {
  if (!S.estado) return;
  S.A = N.analizar(S.estado, S.cal, new Date());
  const A = S.A;
  const app = $('#app');
  const scroll = window.scrollY;
  app.innerHTML = `
    ${renderTop(A)}
    ${renderHero(A)}
    ${renderTabs(A)}
    <main id="vista">${renderVista(A)}</main>
    ${renderPie()}
  `;
  window.scrollTo(0, scroll);
  pintarReloj();
}

function renderTop(A) {
  const tema = ls.get('sec.tema', 'auto');
  const icTema = tema === 'claro' ? I.sol : tema === 'oscuro' ? I.luna : I.auto;
  const show = A.showHoy[0];
  let sub = `Hoy es <b>${fechaLarga(A.ahora)}</b>.`;
  if (A.vidaHoy.length) sub += ` ${esc(A.vidaHoy[0].titulo)}.`;
  else if (show) sub += ` Esta noche tenés <b>show</b>${show.hora ? ` a las ${show.hora}` : ''}.`;
  else sub += ` ${frase(A.semana.nivel)}`;
  return `<header class="top">
    <div><h1>${saludo(A.ahora)}, Julieta</h1><p class="sub">${sub}</p></div>
    <div class="acciones">
      <button class="icono" data-a="actualizar" title="Actualizar ahora">${I.refrescar}</button>
      <button class="icono" data-a="tema" title="Tema: ${tema}">${icTema}</button>
      <button class="icono" data-a="ajustes" title="Ajustes">${I.ajustes}</button>
    </div>
  </header>`;
}

function anillo(valor, color, tam = 168, grosor = 12) {
  const r = (tam - grosor) / 2, c = 2 * Math.PI * r;
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
    <defs><linearGradient id="g-${tam}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--acento)"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>
    <circle class="pista" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke-width="${grosor}"/>
    <circle class="prog" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="url(#g-${tam})" stroke-width="${grosor}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0.001, valor))}"/>
  </svg>`;
}

function renderHero(A) {
  const s = A.semana;
  const color = `var(--n-${s.nivel})`;
  return `<section class="hero">
    <div class="card reloj" id="reloj">${htmlReloj()}</div>
    <div class="card medidor">
      <div class="anillo" id="anillo-semana">
        ${anillo(s.pct, color)}
        <div class="centro"><div class="pct">${pct(s.pct)}<small>%</small></div><div class="lbl">DE LA SEMANA</div></div>
      </div>
      <div class="info">
        ${nivelHtml(s.nivel)}
        <p class="mensaje">${esc(s.mensaje)}</p>
        <div class="minis">
          <div class="mini-stat"><b>${pct(A.pctHoy)}%</b><span>de hoy</span></div>
          <div class="mini-stat"><b>${N.fh(s.necesarias)}</b><span>de trabajo pendiente</span></div>
          <div class="mini-stat"><b>${N.fh(s.cap8)}</b><span>disponibles</span></div>
        </div>
        ${A.adelantoNecesario > 0.05
          ? `<span class="chip ${s.ventaja >= A.adelantoNecesario ? 'verde' : 'naranja'}" style="width:fit-content">Adelanto por días libres: ${N.fh(Math.min(s.ventaja, A.adelantoNecesario))} de ${N.fh(A.adelantoNecesario)}</span>`
          : s.ventaja >= 0.05 ? `<span class="chip verde" style="width:fit-content">+${N.fh(s.ventaja)} adelantadas de la semana que viene${s.adelantadas ? ` · ${s.adelantadas} pieza${s.adelantadas > 1 ? 's' : ''} lista${s.adelantadas > 1 ? 's' : ''}` : ''}</span>` : ''}
        ${A.bloqueadas.length ? `<span class="tenue">${A.bloqueadas.length} esperando material (no cuentan en contra).</span>` : ''}
      </div>
    </div>
  </section>`;
}

const TABS_FIJAS = [
  { id: 'hoy', nombre: 'Hoy' },
  { id: '*areas' },
  { id: 'calendario', nombre: 'Calendario' },
  { id: 'metas', nombre: 'Metas' },
  { id: 'vida', nombre: 'Vida' },
];
function renderTabs(A) {
  const out = [];
  for (const t of TABS_FIJAS) {
    if (t.id === '*areas') {
      for (const a of A.areas) {
        const pa = A.porArea[a.id];
        const n = pa?.pendientes || 0;
        out.push(`<button class="tab ${S.tab === a.id ? 'on' : ''}" style="--c:${a.color}" data-a="tab" data-id="${a.id}"><span class="dot"></span>${esc(a.nombre)}${n ? `<span class="num">${n}</span>` : ''}</button>`);
      }
      out.push(`<button class="tab mas" data-a="nueva-area" title="Nueva área" aria-label="Nueva área">${I.mas}</button>`);
    } else out.push(`<button class="tab ${S.tab === t.id ? 'on' : ''}" data-a="tab" data-id="${t.id}">${t.nombre}</button>`);
  }
  out.push(`<button class="tab plata ${S.tab === 'plata' ? 'on' : ''}" data-a="tab" data-id="plata">Plata</button>`);
  return `<nav class="tabs" aria-label="Secciones">${out.join('')}</nav>`;
}

function renderVista(A) {
  if (S.tab === 'hoy') return vistaHoy(A);
  if (S.tab === 'metas') return vistaMetas(A);
  if (S.tab === 'vida') return vistaVida(A);
  if (S.tab === 'calendario') return vistaCalendario(A);
  if (S.tab === 'plata') return vistaPlata(A);
  const a = A.areas.find((x) => x.id === S.tab);
  if (a) return vistaArea(A, a);
  S.tab = 'hoy';
  return vistaHoy(A);
}

function renderPie() {
  const k = S.corrida;
  let txt = 'La actualización automática todavía no corrió.';
  if (k?.fecha) {
    const hoy = N.diaStr(new Date());
    txt = `Última actualización automática: ${k.fecha === hoy ? 'hoy' : fechaCorta(k.fecha)} a las ${k.hora}${k.ok ? '' : ' (con errores)'}.`;
  }
  const estado = S.sinConexion ? `<span class="sync error"></span>Sin conexión, guardo cuando vuelva` : S.sucio || S.guardando ? `<span class="sync guardando"></span>Guardando…` : `<span class="sync"></span>Todo guardado`;
  return `<footer class="pie-pag"><div id="sync-txt">${estado}</div><div>${txt}</div></footer>`;
}
function pintarSync() {
  const el = $('#sync-txt');
  if (!el) return;
  el.innerHTML = S.sinConexion ? `<span class="sync error"></span>Sin conexión, guardo cuando vuelva` : S.sucio || S.guardando ? `<span class="sync guardando"></span>Guardando…` : `<span class="sync"></span>Todo guardado`;
}

// ───────────────────────── filas reutilizables ─────────────────────────
function filaPieza(p, opts = {}) {
  const sig = N.siguienteEtapa(p);
  const etq = p.etapa === 'material' && p.cuota.material ? p.cuota.material : N.NOMBRE_ETAPA[p.etapa];
  const sigEtq = sig === 'material' && p.cuota.material ? p.cuota.material : N.NOMBRE_ETAPA[sig];
  const chips = [];
  chips.push(`<span>${esc(etq)}</span>`);
  if (opts.horas != null && opts.horas > 0.01) chips.push(`<span>${N.fh(opts.horas)}</span>`);
  if (p.atrasada && p.etapa !== 'entregado') chips.push(`<span class="chip rojo">de la semana ${semNum(p.semana)}</span>`);
  if (p.bloqueado) chips.push(`<span class="chip ambar">esperando material</span>`);
  if (p.futura) chips.push(`<span class="chip verde">adelanto · semana ${semNum(p.semana)}</span>`);
  else if (!p.atrasada && p.etapa !== 'entregado' && !p.bloqueado && S.A && S.A.hoyS === N.diaStr(S.A.dom)) chips.push('<span class="chip hoy">vence hoy</span>');
  const hecha = p.etapa === 'entregado';
  return `<div class="fila ${hecha ? 'hecha' : ''} ${opts.extra ? 'extra' : ''}" data-ctx="pieza" data-id="${esc(p.id)}">
    <button class="chk ${hecha ? 'on' : ''}" data-a="entregar" data-id="${esc(p.id)}" title="${hecha ? 'Entregado' : 'Marcar entregado'}">${hecha ? I.check : ''}</button>
    <div class="txt"><b>${esc(nombrePieza(p))}</b><div class="meta">${chips.join('')}</div></div>
    ${!hecha && !p.bloqueado ? `<button class="etapa-btn" data-a="avanzar" data-id="${esc(p.id)}">→ ${esc(sigEtq)}</button>` : ''}
    <button class="mini" data-a="pieza" data-id="${esc(p.id)}" title="Más">${I.puntos}</button>
  </div>`;
}

function filaTarea(t, opts = {}) {
  const chips = [];
  if (t.repetida) chips.push(`<span class="chip">↻ ${N.diasRepetir(t)}</span>`);
  else if (t.fecha) { const v = vence(t.fecha); chips.push(`<span class="chip ${t.hecha ? '' : v.cls}">${v.txt}</span>`); }
  const h = N.horasTarea(S.estado, t);
  if (!t.hecha && !opts.aparte) chips.push(`<span>${N.fh(opts.horas ?? h * (1 - N.progresoTarea(t)))}</span>`);
  if (opts.metaHoy) chips.push(`<span class="chip verde">hoy: ${opts.metaHoy}</span>`);
  if (t.notas) chips.push(`<span>${esc(t.notas.slice(0, 60))}</span>`);
  let contador = '';
  if (t.total && !t.hecha) {
    contador = `<div class="contador"><div class="barra"><i style="width:${pct((t.actual || 0) / t.total)}%"></i></div>
      <span class="tenue">${t.actual || 0}/${t.total}</span>
      <button data-a="sumar" data-id="${esc(t.id)}" data-n="1">+1</button>
      <button data-a="sumar" data-id="${esc(t.id)}" data-n="10">+10</button>
      <button data-a="sumar" data-id="${esc(t.id)}" data-n="?">…</button></div>`;
  }
  return `<div class="fila ${t.hecha ? 'hecha' : ''} ${opts.extra ? 'extra' : ''}" data-ctx="tarea" data-id="${esc(t.id)}">
    <button class="chk ${t.hecha ? 'on' : ''}" data-a="hecha" data-id="${esc(t.id)}">${t.hecha ? I.check : ''}</button>
    <div class="txt"><b>${esc(t.titulo)}</b><div class="meta">${chips.join('')}</div>${contador}</div>
    <button class="mini" data-a="menu-tarea" data-id="${esc(t.id)}" title="Opciones">${I.puntos}</button>
  </div>`;
}

function filaPlan(it) {
  return it.tipo === 'pieza' ? filaPieza(it.ref, { horas: it.horas, extra: it.extra }) : filaTarea(it.ref, { horas: it.horas, extra: it.extra, metaHoy: it.metaHoy, aparte: it.aparte });
}

function agruparPorArea(items) {
  const m = new Map();
  for (const it of items) {
    if (!m.has(it.area)) m.set(it.area, []);
    m.get(it.area).push(it);
  }
  return [...m.entries()].map(([id, l]) => `<div class="grupo" style="--c:${area(id).color}">
    <div class="grupo-tit"><b>${esc(area(id).nombre)}</b><span class="tenue">${l.some((x) => x.aparte) ? 'no suma a las métricas' : N.fh(l.reduce((s, x) => s + x.horas, 0))}</span></div>
    ${l.map(filaPlan).join('')}</div>`).join('');
}

function agenda(dias) {
  const filas = [];
  for (const [tit, evs] of dias) {
    if (!evs.length) continue;
    filas.push(`<div class="dia-tit">${tit}</div>`);
    for (const e of evs) {
      const h = e.todoElDia ? 'todo el día' : `${N.pad(e.ini.getHours())}:${N.pad(e.ini.getMinutes())}`;
      const a = e.area ? area(e.area) : null;
      const tipo = { show: '🎤 ', grabacion: '🎥 ', feriado: '🏖️ ', cumple: '🎂 ' }[e.tipo] || '';
      filas.push(`<div class="ev"><span class="h">${h}</span><span class="t">${tipo}${esc(e.titulo)}${a ? ` <span class="chip" style="color:${a.color}">${esc(a.corto)}</span>` : ''}</span></div>`);
    }
  }
  return filas.length ? `<div class="agenda">${filas.join('')}</div>` : '<div class="vacio">Nada en el calendario.</div>';
}

// ───────────────────────── vista: Hoy ─────────────────────────
function vistaHoy(A) {
  const partes = [];
  for (const v of A.vidaHoy) partes.push(`<div class="banner" style="--c:var(--n-al_dia)"><span class="emoji">${emojiVida(v.tipo)}</span><div><b>${esc(v.titulo)}</b><span>${v.capacidad ? `Hoy trabajás al ${pct(v.capacidad)}%.` : 'Hoy no se trabaja. Disfrutá.'}</span></div></div>`);
  for (const s of A.showHoy) {
    const items = prepItems(s);
    const hechos = items.filter((i) => i.hecho).length;
    partes.push(`<div class="banner" style="--c:${area(areaShows()).color}"><span class="emoji">📅</span><div style="flex:1"><b>Esta noche: ${esc(s.titulo)}</b><span>${[s.hora, s.lugar].filter(Boolean).map(esc).join(' · ') || 'Revisá horario y lugar'} · prep ${hechos}/${items.length}</span></div><button class="btn chico" data-a="tab" data-id="${areaShows()}">Ver</button></div>`);
  }

  const plan = A.plan.filter((p) => !p.extra);
  const extras = A.plan.filter((p) => p.extra);
  const b = S.briefing && S.briefing.fecha === A.hoyS ? S.briefing : null;

  const alertas = [];
  if (A.atrasadas.length) alertas.push(`<div class="fila"><span class="chip rojo">${A.atrasadas.length}</span><div class="txt">piezas arrastradas de semanas anteriores</div></div>`);
  if (A.vencidas.length) alertas.push(`<div class="fila"><span class="chip rojo">${A.vencidas.length}</span><div class="txt">tareas vencidas</div></div>`);
  for (const p of A.bloqueadas) alertas.push(`<div class="fila"><span class="chip ambar">espera</span><div class="txt">${esc(area(p.area).corto)} · ${esc(nombrePieza(p))} <span class="tenue">sin material</span></div></div>`);
  for (const v of A.vidaProxima) alertas.push(`<div class="fila"><span class="chip">${N.diasEntre(A.ahora, N.parseDia(v.desde))} días</span><div class="txt">${emojiVida(v.tipo)} ${esc(v.titulo)} <span class="tenue">desde el ${fechaCorta(v.desde)}</span></div></div>`);
  if (A.adelantoFalta > 0.05) alertas.push(`<div class="fila"><span class="chip naranja">adelantar</span><div class="txt">Esta semana tenés que dejar hechas <b>${N.fh(A.adelantoFalta)}</b> de la que viene, por días libres o vacaciones. Ya están en el plan.</div></div>`);
  for (const w of A.pronostico.filter((w) => w.carga > w.cap + 0.05).slice(0, 3)) {
    const motivo = w.libres.length ? `${w.libres.length} día${w.libres.length > 1 ? 's' : ''} libre${w.libres.length > 1 ? 's' : ''}` : w.vida.length ? esc(w.vida.join(', ')) : 'poco tiempo';
    alertas.push(`<div class="fila"><span class="chip ${w.carga > w.capMax ? 'rojo' : 'ambar'}">sem ${semNum(w.semana)}</span><div class="txt">Semana del ${fechaCorta(N.diaStr(w.lunes))} (${motivo}): ${N.fh(w.carga)} de trabajo y ${N.fh(w.cap)} disponibles. Hay que llegar con ${N.fh(w.carga - w.cap)} adelantadas.</div></div>`);
  }

  return `${partes.join('')}
  <div class="grid2">
    <div class="col">
      <div class="card briefing"><div class="cab"><span class="etiqueta">Tu resumen de hoy</span>
          <span class="der">${S.regenerando ? '<span class="tenue"><span class="sync guardando"></span>regenerando…</span>' : b ? `<span class="tenue">${esc(b.modelo || '')}${b.generado ? ` · ${horaDe(b.generado)}` : ''}</span>` : ''}
          <button class="mini regen" data-a="regenerar" title="Regenerar el resumen">${I.refrescar}</button></span></div>
        ${b ? `${b.resumen ? `<p>${esc(b.resumen)}</p>` : ''}
        ${b.foco?.length ? `<ul>${b.foco.map((f) => `<li>${f.area ? `<b style="color:${area(f.area).color}">${esc(area(f.area).corto)}:</b> ` : ''}${esc(f.texto)}</li>`).join('')}</ul>` : ''}
        ${b.avisos?.length ? `<ul>${b.avisos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${b.frase ? `<div class="frase">${esc(b.frase)}</div>` : ''}` : '<div class="vacio">Todavía no hay resumen de hoy. Se genera a las 7:00, o tocá ↻.</div>'}</div>
      <div class="card">
        <div class="cab"><h2>Qué hacer hoy</h2><span class="tenue">${plan.some((p) => !p.aparte) ? `${N.fh(plan.filter((p) => !p.aparte).reduce((s, p) => s + p.horas, 0))} planificadas` : ''}</span></div>
        ${plan.length ? agruparPorArea(plan) : `<div class="vacio">${N.esLaboral(S.estado, A.ahora) ? 'No queda nada planificado para hoy. ¡Bien!' : 'Hoy es día libre. Nada urgente.'}</div>`}
        ${extras.length ? `<details class="plegable"><summary>Si te da el tiempo (${extras.length})</summary>${agruparPorArea(extras)}</details>` : ''}
      </div>
    </div>
    <div class="col">
      ${alertas.length ? `<div class="card"><div class="cab"><h2>Ojo con esto</h2></div>${alertas.join('')}</div>` : ''}
      <div class="card"><div class="cab"><h2>Agenda</h2><span class="tenue">${S.calVivo ? 'en vivo' : S.cal?.actualizado ? `al ${fechaCorta(S.cal.actualizado.slice(0, 10))}` : ''}</span></div>
        ${agenda([['Hoy', A.hoyEventos], ['Mañana', A.mananaEventos]])}</div>
      <div class="card"><div class="cab"><h2>La semana por área</h2></div>
        <div class="areas-res">${A.areas.map((a) => {
          const pa = A.porArea[a.id];
          return `<div class="area-res" style="--c:${a.color}" data-a="tab" data-id="${a.id}" data-orden="${a.id}" role="button" tabindex="0"><span class="asa" title="Arrastrá para ordenar">${I.asa}</span><span class="nom">${esc(a.nombre)}</span>${nivelHtml(pa.nivel, true)}<div class="barra"><i style="width:${pct(pa.progreso)}%"></i></div></div>`;
        }).join('')}</div></div>
    </div>
  </div>`;
}

const emojiVida = (t) => ({ vacaciones: '🌴', mudanza: '📦', viaje: '✈️', salud: '🩺' }[t] || '📌');

// ───────────────────────── vista: Área ─────────────────────────
function vistaArea(A, a) {
  const pa = A.porArea[a.id];
  const piezas = A.piezas.filter((p) => p.area === a.id);
  const cuotas = S.estado.cuotas.filter((c) => c.area === a.id && !c.borrado && c.activa !== false);
  const tareas = A.tareas.filter((t) => t.area === a.id);
  const conFecha = tareas.filter((t) => !t.hecha && t.fecha).sort((x, y) => x.fecha.localeCompare(y.fecha));
  const sinFecha = tareas.filter((t) => !t.hecha && !t.fecha).sort((x, y) => (y.prioridad || 0) - (x.prioridad || 0) || (x.creada || 0) - (y.creada || 0));
  const hace7 = Date.now() - 7 * 864e5;
  const hechas = tareas.filter((t) => t.hecha && (t.hechaEn || 0) > hace7);
  const metas = S.estado.metas.filter((m) => m.area === a.id && !m.borrado);
  const rutinas = A.rutinas.filter((t) => t.area === a.id);
  const rutinaHtml = rutinas.map((t) => {
    const oc = A.ocHoy.find((o) => o.base === t.id);
    const sem = N.ocurrencias(S.estado, A.lun, A.dom).filter((o) => o.base === t.id);
    const hechas = sem.filter((o) => o.hecha).length;
    return `<div class="fila ${oc?.hecha ? 'hecha' : ''}" data-ctx="tarea" data-id="${esc(oc ? oc.id : t.id)}">
      ${oc ? `<button class="chk ${oc.hecha ? 'on' : ''}" data-a="hecha" data-id="${esc(oc.id)}" title="${oc.hecha ? 'Hecho hoy' : 'Marcar hecho hoy'}">${oc.hecha ? I.check : ''}</button>` : '<span class="chk libre" title="Hoy no toca"></span>'}
      <div class="txt"><b>${esc(t.titulo)}</b><div class="meta"><span class="chip ${oc && !oc.hecha ? 'hoy' : ''}">${oc ? 'hoy toca' : 'hoy no toca'}</span><span>↻ ${N.diasRepetir(t)}</span><span>${hechas} de ${sem.length} esta semana</span></div></div>
      <button class="mini" data-a="menu-tarea" data-id="${esc(t.id)}" title="Opciones">${I.puntos}</button></div>`;
  }).join('');

  const cuotaHtml = cuotas.map((c) => {
    const ps = piezas.filter((p) => p.cuota.id === c.id);
    const actuales = ps.filter((p) => !p.atrasada);
    const ok = actuales.filter((p) => p.etapa === 'entregado').length;
    const fut = A.futuras.filter((p) => p.cuota.id === c.id);
    const futOk = fut.filter((p) => p.etapa !== 'pendiente').length;
    return `<div class="cuota"><div class="cuota-tit"><b>${esc(c.nombre)}</b><span class="tenue">${ok} de ${actuales.length} esta semana · ${N.fh(c.horas)} c/u</span></div>
      <div class="piezas">${ps.map((p) => chipPieza(p, a)).join('') || '<span class="vacio">Pausada esta semana.</span>'}</div>
      ${fut.length ? `<details class="plegable adelantar" ${futOk ? 'open' : ''}><summary>Adelantar semana ${semNum(fut[0].semana)}${futOk ? ` · ${futOk} empezada${futOk > 1 ? 's' : ''}` : ''}</summary><div class="piezas">${fut.map((p) => chipPieza(p, a)).join('')}</div></details>` : ''}</div>`;
  }).join('');

  const extra = [];
  if (a.shows) extra.push(cardShows(A));
  if (a.fechasUrl) extra.push(cardFechasCliente(A, a));
  const evs = A.eventos.filter((e) => e.area === a.id && e.tipo !== 'show' && e.fin >= A.ahora).slice(0, 8);
  if (evs.length) extra.push(`<div class="card"><div class="cab"><h2>En el calendario</h2></div>${agenda(groupByDay(evs))}</div>`);

  return `<div class="card" style="margin-bottom:14px">
      <div class="cab"><div><h2 style="font-family:var(--fuente-display);font-weight:400;font-size:26px;display:flex;align-items:center;gap:6px">${esc(a.nombre)}<button class="mini" data-a="editar-area" data-id="${a.id}" title="Editar área">${I.lapiz}</button></h2>${a.nota ? `<div class="tenue">${esc(a.nota)}</div>` : ''}${a.excluirMetricas || a.excluirResumen ? `<div class="meta" style="margin-top:6px">${a.excluirMetricas ? '<span class="chip">no suma a las métricas</span>' : ''}${a.excluirResumen ? '<span class="chip">fuera del resumen del día</span>' : ''}</div>` : ''}</div>${nivelHtml(pa.nivel)}</div>
      <div class="barra" style="--c:${a.color}"><i style="width:${pct(pa.progreso)}%"></i></div>
      <div class="tenue" style="margin-top:8px">${pa.total ? `${pct(pa.progreso)}% de lo de esta semana · ${N.fh(pa.total - pa.hecho)} pendientes` : 'Nada con fecha para esta semana.'}${pa.bloqueadas ? ` · ${pa.bloqueadas} esperando material` : ''}</div>
    </div>
    <div class="grid2">
      <div class="col">
        ${cuotas.length ? `<div class="card"><div class="cab"><h2>Cuotas de la semana</h2><span class="tenue">vencen el domingo</span></div>${cuotaHtml}</div>` : ''}
        ${rutinas.length || a.excluirMetricas ? `<div class="card"><div class="cab"><h2>Rutina</h2><button class="btn chico" data-a="nueva-rutina" data-area="${a.id}">${I.mas} Hábito</button></div>
          ${rutinaHtml || '<div class="vacio">Cosas que se repiten ciertos días: ejercicio, lectura… Te aparecen en <i>Hoy</i> el día que tocan.</div>'}</div>` : ''}
        ${a.shows && !cuotas.length ?`<div class="card"><div class="cab"><h2>Metas semanales</h2></div><div class="vacio">Opcional. Por ejemplo: escribir material nuevo una vez por semana.</div><button class="btn chico" data-a="nueva-cuota" data-area="${a.id}">${I.mas} Activar una meta semanal</button></div>` : ''}
        <div class="card"><div class="cab"><h2>Tareas</h2>${rutinas.length || a.excluirMetricas ? '' : `<button class="btn chico" data-a="nueva-rutina" data-area="${a.id}" title="Algo que se repite ciertos días">↻ Que se repite</button>`}</div>
          ${conFecha.map((t) => filaTarea(t)).join('')}
          ${sinFecha.length ? `<div class="etiqueta" style="margin-top:${conFecha.length ? 14 : 0}px">Sin apuro</div>${sinFecha.map((t) => filaTarea(t)).join('')}` : ''}
          ${!conFecha.length && !sinFecha.length ? '<div class="vacio">Sin tareas. Agregá una abajo.</div>' : ''}
          ${hechas.length ? `<details class="plegable"><summary>Hechas esta semana (${hechas.length})</summary>${hechas.map((t) => filaTarea(t)).join('')}</details>` : ''}
          ${formTarea(a.id)}
        </div>
      </div>
      <div class="col">
        ${extra.join('')}
        <div class="card"><div class="cab"><h2>Metas a largo plazo</h2><button class="btn chico" data-a="nueva-meta" data-area="${a.id}">${I.mas} Meta</button></div>
          ${metas.length ? metas.map(metaHtml).join('') : '<div class="vacio">Sin metas todavía.</div>'}</div>
      </div>
    </div>`;
}

function groupByDay(evs) {
  const m = new Map();
  for (const e of evs) { const k = N.diaStr(e.ini); if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
  return [...m.entries()].map(([k, l]) => [fechaLarga(N.parseDia(k)), l]);
}

function chipPieza(p, a) {
  const etq = p.bloqueado ? 'esperando material' : p.etapa === 'material' && p.cuota.material ? p.cuota.material : N.NOMBRE_ETAPA[p.etapa];
  const nom = N.cantidadEn(p.cuota, p.lunes) > 1 ? `#${p.n}` : p.cuota.nombre.split(' ')[0];
  return `<button class="pieza ${p.etapa} ${p.bloqueado ? 'bloq' : ''} ${p.atrasada && p.etapa !== 'entregado' ? 'vieja' : ''} ${p.futura ? 'futura' : ''}" style="--c:${a.color};--p:${N.PESO[p.etapa]}" data-a="pieza" data-ctx="pieza" data-id="${esc(p.id)}">
    <b>${esc(p.titulo || nom)}</b><small>${esc(etq)}${p.atrasada && p.etapa !== 'entregado' ? ` · sem ${semNum(p.semana)}` : ''}</small><span class="nivelpz"></span></button>`;
}

function formTarea(areaId) {
  return `<form class="agregar" data-form="tarea" data-area="${areaId}">
    <input type="text" name="titulo" placeholder="Nueva tarea…" required>
    <input type="date" name="fecha" title="Fecha límite (opcional)">
    <input type="number" name="horas" step="0.25" min="0" placeholder="horas" title="Horas estimadas (opcional)">
    <button class="btn primario" type="submit">${I.mas}</button>
  </form>`;
}

function metaHtml(m) {
  const pasos = m.pasos || [];
  const hechos = pasos.filter((p) => p.hecho).length;
  const prox = pasos.find((p) => !p.hecho);
  return `<div class="meta-card">
    <div class="cab"><div><b>${m.hecha ? '✓ ' : ''}${esc(m.titulo)}</b>${m.objetivo ? ` <span class="chip">${esc(m.objetivo)}</span>` : ''}</div>
      <button class="mini" data-a="editar-meta" data-id="${esc(m.id)}">${I.puntos}</button></div>
    ${pasos.length ? `<div class="barra"><i style="width:${pct(hechos / pasos.length)}%"></i></div><div class="proximo">${prox ? `Próximo paso: <b>${esc(prox.t)}</b>` : 'Todos los pasos hechos.'} · ${hechos}/${pasos.length}</div>` : '<div class="proximo">Todavía sin pasos. Partila en pasos chicos.</div>'}
    <details class="plegable"><summary>Pasos</summary><div class="pasos">
      ${pasos.map((p) => `<div class="fila ${p.hecho ? 'hecha' : ''}"><button class="chk ${p.hecho ? 'on' : ''}" data-a="paso" data-meta="${esc(m.id)}" data-id="${esc(p.id)}">${p.hecho ? I.check : ''}</button><div class="txt"><b>${esc(p.t)}</b></div><button class="mini" data-a="borrar-paso" data-meta="${esc(m.id)}" data-id="${esc(p.id)}">${I.basura}</button></div>`).join('')}
      <form class="agregar" data-form="paso" data-meta="${esc(m.id)}"><input type="text" name="t" placeholder="Agregar paso…" required><button class="btn chico" type="submit">${I.mas}</button></form>
    </div></details>
  </div>`;
}

function prepItems(s) {
  const base = s.prep.items || N.PREP_BASE.map((t, i) => ({ id: `b${i}`, t, hecho: false }));
  return base;
}

function cardShows(A) {
  const hoyS = A.hoyS;
  const prox = A.shows.filter((s) => s.dia >= hoyS);
  const pasados = A.shows.filter((s) => s.dia < hoyS).reverse().slice(0, 5);
  const fila = (s) => {
    const d = N.parseDia(s.dia);
    const items = prepItems(s);
    return `<div class="fila"><div class="fecha" style="min-width:54px;text-align:center;line-height:1.1"><b style="font-family:var(--fuente-display);font-size:22px;font-weight:400;display:block">${d.getDate()}</b><small class="tenue">${MESES[d.getMonth()].slice(0, 3)}</small></div>
      <div class="txt"><b>${esc(s.titulo)}</b><div class="meta">${s.dia === hoyS ? '<span class="chip ambar">hoy</span>' : `<span>${DIAS[d.getDay()]}</span>`}${s.hora ? `<span>${s.hora}</span>` : ''}${s.lugar ? `<span>${esc(s.lugar)}</span>` : ''}${s.sinSync ? '<span class="chip">sin sincronizar</span>' : ''}<span>prep ${items.filter((i) => i.hecho).length}/${items.length}</span></div></div>
      <button class="mini" data-a="show" data-clave="${esc(s.clave)}">${I.puntos}</button></div>`;
  };
  return `<div class="card"><div class="cab"><h2>Shows</h2><button class="btn chico" data-a="nuevo-show">${I.mas} Show</button></div>
    ${prox.length ? prox.map(fila).join('') : '<div class="vacio">No hay shows próximos en el calendario.</div>'}
    ${pasados.length ? `<details class="plegable"><summary>Recientes</summary>${pasados.map(fila).join('')}</details>` : ''}</div>`;
}

function cardFechasCliente(A, a) {
  const lista = (S.fechas[a.id] || []).filter((f) => f.fecha >= A.hoyS).sort((x, y) => x.fecha.localeCompare(y.fecha)).slice(0, 8);
  const filas = lista.map((f) => {
    const d = N.parseDia(f.fecha);
    const ref = `flyer:${a.id}:${f.id}`;
    const ya = S.estado.tareas.some((t) => t.ref === ref && !t.borrado);
    return `<div class="fila"><div class="fecha"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></div>
      <div class="txt"><b>${esc(f.titulo || f.show)}</b><div class="meta"><span>${esc([f.lugar, f.ciudad].filter(Boolean).join(', '))}</span>${f.hora ? `<span>${f.hora}</span>` : ''}${f.agotado ? '<span class="chip verde">agotado</span>' : ''}</div></div>
      ${ya ? '<span class="chip verde">tarea creada</span>' : `<button class="btn chico" data-a="flyer" data-area="${a.id}" data-id="${esc(f.id)}">Flyer</button>`}</div>`;
  });
  return `<div class="card lista-fechas"><div class="cab"><h2>Próximas fechas de ${esc(a.corto)}</h2><a class="tenue" href="${esc(a.web)}" target="_blank" rel="noopener">web ↗</a></div>
    ${filas.length ? filas.join('') : '<div class="vacio">No encontré fechas próximas en su web.</div>'}</div>`;
}

// ───────────────────────── vista: Metas ─────────────────────────
function vistaMetas(A) {
  return `<div class="grid2"><div class="col">${A.areas.map((a) => {
    const ms = S.estado.metas.filter((m) => m.area === a.id && !m.borrado);
    return `<div class="card" style="border-top:3px solid ${a.color}"><div class="cab"><h2>${esc(a.nombre)}</h2><button class="btn chico" data-a="nueva-meta" data-area="${a.id}">${I.mas} Meta</button></div>
      ${ms.length ? ms.map(metaHtml).join('') : '<div class="vacio">Sin metas.</div>'}</div>`;
  }).join('')}</div>
  <div class="col"><div class="card"><h2>Cómo usar las metas</h2><p class="suave" style="margin:8px 0 0">Son las cosas grandes que no tienen fecha de la semana: terminar un curso, lanzar un proyecto, ordenar la casa… Partilas en pasos chicos. El próximo paso aparece en el plan de hoy cuando te sobra tiempo, si lo pasás a tarea.</p></div></div></div>`;
}

// ───────────────────────── vista: Vida ─────────────────────────
// ───────────────────────── vista: Calendario (días libres + vencimientos) ─────────────────────────
function vistaCalendario(A) {
  const hoy = new Date();
  const ref = S.mesCal ? N.parseDia(S.mesCal) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const y = ref.getFullYear(), m = ref.getMonth();
  const ini = N.lunes(new Date(y, m, 1));
  const fin = N.sumarDias(N.lunes(new Date(y, m + 1, 0)), 6);
  const tareas = S.estado.tareas.filter((t) => !t.borrado && t.fecha);
  const pron = new Map(A.pronostico.map((w) => [w.semana, w]));
  const filas = [];
  for (let w = new Date(ini); w <= fin; w = N.sumarDias(w, 7)) {
    const celdas = [];
    for (let i = 0; i < 7; i++) {
      const d = N.sumarDias(w, i), s = N.diaStr(d);
      const libre = N.esLibre(S.estado, s);
      const laboral = N.esLaboral(S.estado, d);
      const vida = N.eventosVidaDelDia(S.estado, d);
      const evs = N.eventosDelDia(A.eventos, d);
      const vencen = tareas.filter((t) => t.fecha === s);
      const marcas = [];
      for (const t of vencen.slice(0, 3)) marcas.push(`<span class="cm vence ${t.hecha ? 'hecha' : ''}" title="${esc(t.titulo)}">${esc(t.titulo)}</span>`);
      if (vencen.length > 3) marcas.push(`<span class="cm vence">+${vencen.length - 3}</span>`);
      for (const e of evs.filter((e) => ['show', 'grabacion', 'feriado'].includes(e.tipo)).slice(0, 2))
        marcas.push(`<span class="cm ${e.tipo}" title="${esc(e.titulo)}">${{ show: '🎤', grabacion: '🎥', feriado: '🏖️' }[e.tipo]} ${esc(e.titulo)}</span>`);
      const cls = ['dia', d.getMonth() !== m ? 'fuera' : '', s === A.hoyS ? 'hoy' : '', !laboral ? 'finde' : '', libre ? 'libre' : '', vida.length && !libre ? 'vida' : '', s < A.hoyS ? 'pasado' : ''].filter(Boolean).join(' ');
      celdas.push(`<button class="${cls}" data-a="dia" data-dia="${s}" title="${libre ? 'Día libre' : vida.length ? esc(vida.map((v) => v.titulo).join(', ')) : ''}"><span class="num">${d.getDate()}</span>${libre ? '<span class="tag-libre">libre</span>' : ''}<span class="marcas">${marcas.join('')}</span></button>`);
    }
    const pw = pron.get(N.semanaId(w));
    const falta = pw && pw.carga > pw.cap + 0.05 ? `<span class="sem-aviso" title="Esa semana no te da: tenés que llegar con trabajo adelantado">adelantar ${N.fh(pw.carga - pw.cap)}</span>` : '';
    filas.push(`<div class="cal-sem">${celdas.join('')}${falta ? `<div class="cal-aviso">${falta}</div>` : ''}</div>`);
  }
  const prevMes = N.diaStr(new Date(y, m - 1, 1)), sigMes = N.diaStr(new Date(y, m + 1, 1));
  const nLibres = Object.values(S.estado.libres || {}).filter((x) => x.off).length;
  return `<div class="card calendario">
      <div class="cab"><h2 style="font-family:var(--fuente-display);font-weight:400;font-size:24px;text-transform:capitalize">${MESES[m]} ${y}</h2>
        <div class="der"><button class="mini" data-a="mes" data-mes="${prevMes}" title="Mes anterior">‹</button><button class="btn chico" data-a="mes" data-mes="">Hoy</button><button class="mini" data-a="mes" data-mes="${sigMes}" title="Mes siguiente">›</button></div></div>
      <div class="cal-cab">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => `<span>${d}</span>`).join('')}</div>
      ${filas.join('')}
      <div class="cal-leyenda"><span><i class="lg libre"></i>día libre</span><span><i class="lg vence"></i>vencimiento</span><span><i class="lg vida"></i>vacaciones / mudanza</span><span>🎤 show</span><span>🎥 grabación</span></div>
    </div>
    <div class="grid2" style="margin-top:14px"><div class="col"><div class="card"><h2>Cómo funciona</h2><p class="suave" style="margin:8px 0 0">Tocá un día para marcarlo como <b>libre</b> (no trabajás). Esos días cuentan como 0 horas, y si una semana no te da para sus cuotas, el Secretario calcula cuánto tenés que <b>adelantar</b> antes y lo pone en tu plan. Recién cuando hiciste más que eso, figurás <b>Adelantado</b>.</p>
      <p class="tenue" style="margin:10px 0 0">${nLibres ? `Tenés ${nLibres} día${nLibres > 1 ? 's' : ''} libre${nLibres > 1 ? 's' : ''} marcado${nLibres > 1 ? 's' : ''}.` : 'Todavía no marcaste días libres.'} Para rangos largos (vacaciones, la mudanza) usá la pestaña <i>Vida</i>.</p></div></div><div class="col">
      ${A.adelantoFalta > 0.05 ? `<div class="card"><div class="cab"><h2>Para adelantar esta semana</h2><span class="chip naranja">${N.fh(A.adelantoFalta)}</span></div><p class="suave" style="margin:0">Ya está sumado a tu plan de hoy y a las horas pendientes de la semana.</p></div>` : ''}
    </div></div>`;
}

function menuDia(s, ancla) {
  const d = N.parseDia(s);
  const libre = N.esLibre(S.estado, s);
  const vencen = S.estado.tareas.filter((t) => !t.borrado && t.fecha === s);
  abrirMenu(ancla, [
    { titulo: fechaLarga(d) },
    { txt: libre ? 'Quitar día libre' : 'Marcar día libre (no trabajo)', on: libre, fn: () => mutar((e) => { e.libres[s] = { off: !libre, u: ahoraMs() }; }, libre ? 'Vuelve a ser día de trabajo' : 'Día libre marcado') },
    { txt: 'Agregar vencimiento este día…', icono: I.mas, fn: () => hojaTarea(null, S.tab !== 'calendario' ? S.tab : S.A.areas[0]?.id, s) },
    ...(vencen.length ? ['-', { titulo: 'Vence este día' }, ...vencen.map((t) => ({ txt: `${t.hecha ? '✓ ' : ''}${t.titulo}`, icono: `<i class="pe" style="--p:${t.hecha ? 1 : 0};border-color:${area(t.area).color}"></i>`, fn: () => menuTarea(t.id, ancla) }))] : []),
  ]);
}

function vistaVida(A) {
  const evs = S.estado.eventosVida.filter((e) => !e.borrado).sort((a, b) => a.desde.localeCompare(b.desde));
  const max = Math.max(1, ...A.pronostico.map((w) => Math.max(w.carga, w.cap)));
  const barras = A.pronostico.map((w) => `<div class="sem" title="${esc(`Semana ${semNum(w.semana)}: ${N.fh(w.carga)} de trabajo, ${N.fh(w.cap)} disponibles${w.vida.length ? ` · ${w.vida.join(', ')}` : ''}`)}">
      <div class="col-b" style="--c:var(--n-${w.nivel})"><i style="height:${(w.carga / max) * 100}%"></i>${w.vida.length ? '<span class="vida">🌴</span>' : ''}<span style="position:absolute;left:0;right:0;bottom:${(w.cap / max) * 100}%;border-top:2px dashed var(--tinta-3)"></span></div>
      <small>${fechaCorta(N.diaStr(w.lunes)).split(' ')[1]}</small></div>`).join('');
  return `<div class="grid2"><div class="col">
    <div class="card"><div class="cab"><h2>Lo que viene</h2><span class="tenue">barra = trabajo · línea = horas disponibles</span></div>
      <div class="semanas">${barras}</div>
      <p class="tenue" style="margin:10px 0 0">Si una barra pasa la línea, esa semana no te da con jornadas de ${S.estado.config.horasMin} h. Vacaciones, mudanzas y grabaciones bajan la línea.</p></div>
    <div class="card"><div class="cab"><h2>Vacaciones, mudanza y cosas grandes</h2><button class="btn chico" data-a="nuevo-vida">${I.mas} Agregar</button></div>
      ${evs.length ? evs.map((e) => `<div class="fila"><span style="font-size:22px">${emojiVida(e.tipo)}</span><div class="txt"><b>${esc(e.titulo)}</b><div class="meta"><span>${fechaCorta(e.desde)}${e.hasta && e.hasta !== e.desde ? ` → ${fechaCorta(e.hasta)}` : ''}</span><span>${e.capacidad ? `trabajás al ${pct(e.capacidad)}%` : 'sin trabajo'}</span>${e.pausarCuotas ? '<span class="chip">cuotas en pausa</span>' : ''}</div></div><button class="mini" data-a="editar-vida" data-id="${esc(e.id)}">${I.puntos}</button></div>`).join('') : '<div class="vacio">Nada cargado. Cuando sepas la fecha de la mudanza o de unas vacaciones, cargala acá y el Secretario te avisa con tiempo qué adelantar.</div>'}</div>
  </div><div class="col"><div class="card"><h2>Cómo funciona</h2><p class="suave" style="margin:8px 0 0">Cada evento baja tus horas disponibles esos días (vacaciones = 0%). Si marcás <b>cuotas en pausa</b>, las semanas completas que caigan dentro no generan reels ni videos (para cuando lo arreglás con los clientes). Si no, el Secretario te avisa en <i>Hoy</i> qué semanas no te dan para que adelantes.</p></div></div></div>`;
}

// ───────────────────────── vista: Plata ─────────────────────────
function vistaPlata() {
  const d = S.estado.dinero;
  const mon = d.moneda || '$';
  const fmt = (n) => `${mon} ${Math.round(n).toLocaleString('es-UY')}`;
  const meses = N.resumenDinero(S.estado);
  const claves = Object.keys(meses).sort().reverse().slice(0, 6);
  const tablas = claves.map((m) => {
    const filas = Object.entries(meses[m]);
    const tg = filas.reduce((s, [, f]) => s + f.ganado, 0), tc = filas.reduce((s, [, f]) => s + f.cobrado, 0);
    const [y, mm] = m.split('-');
    return `<div class="card"><div class="cab"><h2>${MESES[Number(mm) - 1]} ${y}</h2><span class="tenue">ganado ${fmt(tg)} · cobrado ${fmt(tc)}</span></div><div class="scroll-x"><table class="tabla">
      <tr><th>Área</th><th class="num">Piezas</th><th class="num">Ganado</th><th class="num">Cobrado</th><th class="num">Te deben</th></tr>
      ${filas.map(([a, f]) => `<tr><td>${esc(area(a).nombre)}</td><td class="num">${f.piezas}</td><td class="num">${fmt(f.ganado)}</td><td class="num">${fmt(f.cobrado)}</td><td class="num">${fmt(Math.max(0, f.ganado - f.cobrado))}</td></tr>`).join('')}
    </table></div></div>`;
  }).join('');
  const movs = d.movimientos.filter((m) => !m.borrado).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
  return `<div class="grid2"><div class="col">
    ${tablas || '<div class="card"><div class="vacio">Todavía no hay entregas con tarifa ni movimientos. Cargá tus tarifas a la derecha.</div></div>'}
    <div class="card"><div class="cab"><h2>Movimientos</h2><button class="btn chico" data-a="nuevo-mov">${I.mas} Agregar</button></div>
      ${movs.length ? movs.map((m) => `<div class="fila"><div class="txt"><b>${esc(m.concepto || (m.tipo === 'cobro' ? 'Cobro' : 'Trabajo extra'))}</b><div class="meta"><span>${fechaCorta(m.fecha)}</span><span>${esc(area(m.area).nombre)}</span><span class="chip ${m.tipo === 'cobro' ? 'verde' : ''}">${m.tipo === 'cobro' ? 'cobro' : 'trabajo'}</span></div></div><b>${fmt(m.monto)}</b><button class="mini" data-a="borrar-mov" data-id="${esc(m.id)}">${I.basura}</button></div>`).join('') : '<div class="vacio">Cobros y trabajos extra (flyers, webs…) van acá.</div>'}</div>
  </div><div class="col"><div class="card"><div class="cab"><h2>Tarifas por pieza</h2></div>
    <form data-form="tarifas" class="campos">
      <label class="campo"><span>Moneda</span><input type="text" name="moneda" value="${esc(mon)}" style="width:90px"></label>
      ${S.estado.cuotas.filter((c) => !c.borrado).map((c) => `<label class="campo"><span>${esc(area(c.area).nombre)} · ${esc(c.nombre)}</span><input type="number" name="t:${esc(c.id)}" value="${esc(d.tarifas[c.id] ?? '')}" min="0" step="1" style="width:140px"></label>`).join('')}
      <button class="btn primario" type="submit">Guardar tarifas</button>
    </form></div></div></div>`;
}

// ───────────────────────── hojas (modales) ─────────────────────────
function abrirHoja(html, ancho = false) {
  const h = $('#hoja');
  h.innerHTML = `<div class="panel ${ancho ? 'ancho' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  h.hidden = false;
  setTimeout(() => h.querySelector('input:not([type=hidden]),textarea,select')?.focus?.(), 50);
}
function cerrarHoja() { $('#hoja').hidden = true; $('#hoja').innerHTML = ''; }

const buscarPieza = (id) => S.A.todas.find((p) => p.id === id);
function setEtapa(id, etapa) {
  mutar((e) => {
    const st = e.piezas[id] || {};
    st.etapa = etapa;
    st.hist = [...(st.hist || []), { e: etapa, t: ahoraMs() }];
    if (etapa === 'material' || etapa === 'entregado') st.bloqueado = false;
    st.u = ahoraMs();
    e.piezas[id] = st;
  }, etapa === 'entregado' ? CELEBRA[Math.floor(Math.random() * CELEBRA.length)] : null);
  if (etapa === 'entregado') $('#anillo-semana')?.classList.add('pulso');
}
function setPieza(id, cambios) {
  mutar((e) => { e.piezas[id] = { ...(e.piezas[id] || {}), ...cambios, u: ahoraMs() }; });
}

function hojaPieza(id) {
  const p = buscarPieza(id);
  if (!p) return;
  const a = area(p.area);
  const etapas = p.cuota.simple ? ['pendiente', 'entregado'] : N.ETAPAS.filter((x) => x !== 'revision' || p.cuota.revision !== false);
  abrirHoja(`<div class="etiqueta" style="color:${a.color}">${esc(a.nombre)} · semana ${semNum(p.semana)}</div>
    <h2>${esc(nombrePieza(p))}</h2>
    <div class="etapas">${etapas.map((x) => `<button class="${p.etapa === x ? 'on' : ''}" data-a="set-etapa" data-id="${esc(id)}" data-etapa="${x}"><span class="p"><i style="width:${N.PESO[x] * 100}%"></i></span>${esc(x === 'material' && p.cuota.material ? p.cuota.material : N.NOMBRE_ETAPA[x])}</button>`).join('')}</div>
    <section class="campos">
      <label class="check"><input type="checkbox" data-a="bloquear" data-id="${esc(id)}" ${p.bloqueado ? 'checked' : ''}> Esperando material del cliente (no cuenta en contra)</label>
      <label class="campo"><span>Título (opcional)</span><input type="text" id="pz-titulo" value="${esc(p.titulo)}" placeholder="Ej: reel del show en Movie"></label>
      <label class="campo"><span>Nota</span><input type="text" id="pz-nota" value="${esc(p.nota)}"></label>
      <label class="campo"><span>Monto (si es distinto de la tarifa)</span><input type="number" id="pz-monto" value="${esc(p.monto ?? '')}"></label>
    </section>
    <div class="pie"><button class="btn peligro" data-a="descartar" data-id="${esc(id)}">${p.descartada ? 'Recuperar' : 'Descartar esta pieza'}</button>
      <div class="der"><button class="btn" data-a="cerrar">Cerrar</button><button class="btn primario" data-a="guardar-pieza" data-id="${esc(id)}">Guardar</button></div></div>`);
}

function hojaTarea(t, areaId, fecha, rutina = false) {
  const nueva = !t;
  t = t || { id: N.nuevoId('t'), area: S.A.areas.some((a) => a.id === areaId) ? areaId : S.A.areas[0]?.id, titulo: '', fecha: fecha || null, hecha: false };
  const rep = N.esRepetida(t) || rutina;
  const dias = t.repetir?.dias || [];
  abrirHoja(`<h2>${nueva ? (rutina ? 'Nuevo hábito' : 'Nueva tarea') : 'Editar tarea'}</h2>
    <form data-form="editar-tarea" data-id="${esc(t.id)}" data-nueva="${nueva ? 1 : ''}" class="campos" style="margin-top:14px">
      <label class="campo"><span>Qué hay que hacer</span><input type="text" name="titulo" value="${esc(t.titulo)}" placeholder="${rutina ? 'Ej: Ejercicio, Leer 30 min' : ''}" required></label>
      <div class="campo"><span>Se repite (opcional)</span><div class="dias-sem">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="rep" value="${d}" ${dias.includes(d) ? 'checked' : ''}><span>${N.DIA_CORTO[d]}</span></label>`).join('')}</div>
        <small class="tenue">${rep ? 'Marcá los días que toca. Te aparece en Hoy esos días; si un día no lo hacés, no se arrastra.' : 'Si marcás días, se vuelve un hábito (sin fecha límite).'}</small></div>
      <div class="campos-2">
        <label class="campo"><span>Área</span><select name="area">${S.A.areas.map((a) => `<option value="${a.id}" ${a.id === t.area ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
        ${rep ? '' : `<label class="campo"><span>Fecha límite</span><input type="date" name="fecha" value="${esc(t.fecha || '')}"></label>`}
        <label class="campo"><span>Horas estimadas</span><input type="number" name="horas" step="0.25" min="0" value="${esc(t.horas ?? '')}" placeholder="${S.estado.config.horasTarea}"></label>
        ${rep ? '' : `<label class="campo"><span>Cantidad (contador)</span><input type="number" name="total" min="0" value="${esc(t.total ?? '')}" placeholder="ej: 200"></label>`}
      </div>
      ${rep ? '' : `<label class="campo"><span>Prioridad (para las sin fecha)</span><select name="prioridad">${[[0, 'Normal'], [1, 'Alta'], [2, 'Muy alta']].map(([v, n]) => `<option value="${v}" ${(t.prioridad || 0) == v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`}
      <label class="campo"><span>Notas</span><textarea name="notas">${esc(t.notas || '')}</textarea></label>
      <div class="pie">${nueva ? '<span></span>' : `<button class="btn peligro" type="button" data-a="borrar-tarea" data-id="${esc(t.id)}">${I.basura} Borrar</button>`}
        <div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Guardar</button></div></div>
    </form>`);
}

function hojaMeta(m, areaId) {
  const nueva = !m;
  m = m || { id: N.nuevoId('m'), area: areaId, titulo: '', objetivo: '', pasos: [] };
  abrirHoja(`<h2>${nueva ? 'Nueva meta' : 'Editar meta'}</h2>
    <form data-form="editar-meta" data-id="${esc(m.id)}" data-nueva="${nueva ? 1 : ''}" class="campos" style="margin-top:14px">
      <label class="campo"><span>Meta</span><input type="text" name="titulo" value="${esc(m.titulo)}" required></label>
      <div class="campos-2">
        <label class="campo"><span>Área</span><select name="area">${S.A.areas.map((a) => `<option value="${a.id}" ${a.id === m.area ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
        <label class="campo"><span>Para cuándo (texto libre)</span><input type="text" name="objetivo" value="${esc(m.objetivo || '')}" placeholder="ej: marzo 2027"></label>
      </div>
      ${nueva ? '<label class="campo"><span>Pasos (uno por línea, opcional)</span><textarea name="pasos"></textarea></label>' : `<label class="check"><input type="checkbox" name="hecha" ${m.hecha ? 'checked' : ''}> Meta cumplida</label>`}
      <div class="pie">${nueva ? '<span></span>' : `<button class="btn peligro" type="button" data-a="borrar-meta" data-id="${esc(m.id)}">${I.basura} Borrar</button>`}
        <div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Guardar</button></div></div>
    </form>`);
}

function hojaVida(v) {
  const nueva = !v;
  v = v || { id: N.nuevoId('v'), titulo: '', tipo: 'vacaciones', desde: N.diaStr(new Date()), hasta: '', capacidad: 0, pausarCuotas: false };
  abrirHoja(`<h2>${nueva ? 'Algo grande en el calendario' : 'Editar'}</h2>
    <form data-form="editar-vida" data-id="${esc(v.id)}" data-nueva="${nueva ? 1 : ''}" class="campos" style="margin-top:14px">
      <label class="campo"><span>Qué es</span><input type="text" name="titulo" value="${esc(v.titulo)}" placeholder="Ej: Vacaciones en Rocha, Mudanza a…" required></label>
      <div class="campos-2">
        <label class="campo"><span>Tipo</span><select name="tipo">${['vacaciones', 'mudanza', 'viaje', 'salud', 'otro'].map((t) => `<option ${t === v.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="campo"><span>Desde</span><input type="date" name="desde" value="${esc(v.desde)}" required></label>
        <label class="campo"><span>Hasta</span><input type="date" name="hasta" value="${esc(v.hasta || '')}"></label>
        <label class="campo"><span>Cuánto trabajás esos días</span><select name="capacidad">${[[0, 'Nada (0%)'], [0.25, 'Poco (25%)'], [0.5, 'La mitad (50%)'], [0.75, 'Casi normal (75%)']].map(([x, n]) => `<option value="${x}" ${Number(v.capacidad) === x ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <label class="check"><input type="checkbox" name="pausarCuotas" ${v.pausarCuotas ? 'checked' : ''}> Pausar las cuotas semanales esas semanas (ya lo hablé con los clientes)</label>
      <label class="campo"><span>Notas</span><textarea name="notas">${esc(v.notas || '')}</textarea></label>
      <div class="pie">${nueva ? '<span></span>' : `<button class="btn peligro" type="button" data-a="borrar-vida" data-id="${esc(v.id)}">${I.basura} Borrar</button>`}
        <div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Guardar</button></div></div>
    </form>`);
}

function hojaShow(clave) {
  const s = clave ? S.A.shows.find((x) => x.clave === clave) : null;
  if (clave && !s) return;
  if (!s) {
    abrirHoja(`<h2>Nuevo show</h2>
      <form data-form="nuevo-show" class="campos" style="margin-top:14px">
        <label class="campo"><span>Nombre</span><input type="text" name="titulo" placeholder="Ej: Open mic en…" required></label>
        <div class="campos-2">
          <label class="campo"><span>Fecha</span><input type="date" name="fecha" required value="${N.diaStr(new Date())}"></label>
          <label class="campo"><span>Hora</span><input type="time" name="hora" value="21:00"></label>
        </div>
        <label class="campo"><span>Lugar</span><input type="text" name="lugar"></label>
        <label class="campo"><span>Notas</span><textarea name="notas"></textarea></label>
        <p class="tenue" style="margin:0">${S.estado.config.calendario.url ? 'Se agrega también a tu calendario "Shows".' : 'Se va a pasar a tu calendario "Shows" en la próxima actualización automática.'}</p>
        <div class="pie"><span></span><div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Agregar</button></div></div>
      </form>`);
    return;
  }
  const items = prepItems(s);
  abrirHoja(`<div class="etiqueta" style="color:${area(areaShows()).color}">Show · ${fechaLarga(N.parseDia(s.dia))}${s.hora ? ` · ${s.hora}` : ''}</div>
    <h2>${esc(s.titulo)}</h2>${s.lugar ? `<div class="suave">${esc(s.lugar)}</div>` : ''}${s.notas ? `<p class="suave">${esc(s.notas)}</p>` : ''}
    <section><h3>Preparación</h3>
      ${items.map((i) => `<div class="fila ${i.hecho ? 'hecha' : ''}"><button class="chk ${i.hecho ? 'on' : ''}" data-a="prep" data-clave="${esc(clave)}" data-id="${esc(i.id)}">${i.hecho ? I.check : ''}</button><div class="txt"><b>${esc(i.t)}</b></div><button class="mini" data-a="borrar-prep" data-clave="${esc(clave)}" data-id="${esc(i.id)}">${I.basura}</button></div>`).join('')}
      <form class="agregar" data-form="prep" data-clave="${esc(clave)}"><input type="text" name="t" placeholder="Agregar a la preparación…" required><button class="btn chico" type="submit">${I.mas}</button></form>
    </section>
    <section><h3>Notas del show</h3><textarea id="show-notas" placeholder="Qué funcionó, qué probar la próxima…">${esc(s.prep.notas || '')}</textarea></section>
    <div class="pie"><button class="btn peligro" data-a="borrar-show" data-clave="${esc(clave)}">${I.basura} Sacar show</button>
      <div class="der"><button class="btn primario" data-a="guardar-show-notas" data-clave="${esc(clave)}">Listo</button></div></div>`);
}

function hojaCuotaNueva(areaId) {
  abrirHoja(`<h2>Meta semanal</h2>
    <form data-form="nueva-cuota" data-area="${areaId}" class="campos" style="margin-top:14px">
      <label class="campo"><span>Qué</span><input type="text" name="nombre" placeholder="Ej: Escribir material nuevo" required></label>
      <div class="campos-2">
        <label class="campo"><span>Veces por semana</span><input type="number" name="cantidad" value="1" min="1"></label>
        <label class="campo"><span>Horas cada vez</span><input type="number" name="horas" value="1" min="0" step="0.25"></label>
      </div>
      <div class="pie"><span></span><div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Activar</button></div></div>
    </form>`);
}

function hojaMov() {
  abrirHoja(`<h2>Movimiento</h2>
    <form data-form="nuevo-mov" class="campos" style="margin-top:14px">
      <div class="campos-2">
        <label class="campo"><span>Tipo</span><select name="tipo"><option value="cobro">Cobro (me pagaron)</option><option value="extra">Trabajo extra (flyer, web…)</option></select></label>
        <label class="campo"><span>Área</span><select name="area">${S.A.areas.map((a) => `<option value="${a.id}">${esc(a.nombre)}</option>`).join('')}</select></label>
        <label class="campo"><span>Monto</span><input type="number" name="monto" min="0" required></label>
        <label class="campo"><span>Fecha</span><input type="date" name="fecha" value="${N.diaStr(new Date())}" required></label>
      </div>
      <label class="campo"><span>Concepto</span><input type="text" name="concepto" placeholder="Ej: Flyer PATOTERA 25/11"></label>
      <div class="pie"><span></span><div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Guardar</button></div></div>
    </form>`);
}

function hojaAjustes() {
  const c = S.estado.config;
  const tok = GH.token || '';
  abrirHoja(`<h2>Ajustes</h2>
    <form data-form="ajustes" class="campos">
      <section><h3>Tu jornada</h3><div class="campos-2">
        <label class="campo"><span>Horas por día (mínimo)</span><input type="number" name="horasMin" value="${c.horasMin}" min="1" max="16" step="0.5"></label>
        <label class="campo"><span>Horas por día (máximo)</span><input type="number" name="horasMax" value="${c.horasMax}" min="1" max="16" step="0.5"></label>
        <label class="campo"><span>Empezás a las</span><input type="number" name="inicioJornada" value="${c.inicioJornada}" min="0" max="23"></label>
        <label class="campo"><span>Horas de emergencia por día de finde</span><input type="number" name="horasFinde" value="${c.horasFinde}" min="0" max="12"></label>
        <label class="campo"><span>Horas por tarea sin estimar</span><input type="number" name="horasTarea" value="${c.horasTarea}" min="0" step="0.25"></label>
        <label class="campo"><span>Horas mínimas por grabación</span><input type="number" name="horasGrabacionMin" value="${c.horasGrabacionMin}" min="0" step="0.5"></label>
      </div></section>
      <section><h3>Cuotas semanales</h3>
        ${S.estado.cuotas.filter((q) => !q.borrado).map((q) => `<div class="campos-2" style="align-items:end;margin-bottom:8px">
          <label class="campo"><span>${esc(area(q.area).corto)} · nombre</span><input type="text" name="q:${q.id}:nombre" value="${esc(q.nombre)}"></label>
          <label class="campo"><span>Por semana</span><input type="number" name="q:${q.id}:cantidad" value="${N.cantidadEn(q, N.lunes(new Date()))}" min="0"></label>
          <label class="campo"><span>Horas c/u</span><input type="number" name="q:${q.id}:horas" value="${q.horas}" min="0" step="0.25"></label>
          <label class="check"><input type="checkbox" name="q:${q.id}:activa" ${q.activa !== false ? 'checked' : ''}> activa</label></div>`).join('')}
        <p class="tenue" style="margin:4px 0 0">Si cambiás la cantidad, aplica desde esta semana; las anteriores quedan como estaban.</p>
      </section>
      <section><h3>Clima</h3><div class="campos-2">
        <label class="campo"><span>Ciudad</span><input type="text" name="climaLugar" value="${esc(c.clima?.lugar || 'Montevideo')}"></label>
        <label class="campo"><span>Latitud</span><input type="number" step="0.01" name="climaLat" value="${esc(c.clima?.lat ?? -34.9)}" style="width:110px"></label>
        <label class="campo"><span>Longitud</span><input type="number" step="0.01" name="climaLon" value="${esc(c.clima?.lon ?? -56.16)}" style="width:110px"></label>
      </div><p class="tenue" style="margin:6px 0 0">Cuando te mudes, poné la ciudad nueva (latitud y longitud de Google Maps).</p></section>
      <section><h3>Pomodoro</h3><div class="campos-2">
        <label class="campo"><span>Foco (min)</span><input type="number" name="pFoco" value="${c.pomodoro.foco}" min="5" max="120"></label>
        <label class="campo"><span>Descanso (min)</span><input type="number" name="pDescanso" value="${c.pomodoro.descanso}" min="1" max="60"></label>
        <label class="campo"><span>Descanso largo (min)</span><input type="number" name="pLargo" value="${c.pomodoro.largo}" min="1" max="60"></label>
        <label class="campo"><span>Largo cada (ciclos)</span><input type="number" name="pCada" value="${c.pomodoro.cada}" min="2" max="10"></label>
      </div></section>
      <section><h3>Google Calendar (Apps Script)</h3><div class="campos">
        <label class="campo"><span>URL del Apps Script</span><input type="url" name="calUrl" value="${esc(c.calendario.url)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label class="campo"><span>Clave</span><input type="password" name="calClave" value="${esc(c.calendario.clave)}"></label>
      </div></section>
      <section><h3>Cómo leo tu calendario</h3>
        <label class="campo"><span>Reglas (JSON): la primera que coincide gana. tipo: show · grabacion · evento · feriado · cumple · ignorar</span><textarea class="json" name="reglas" style="min-height:160px">${esc(JSON.stringify(c.reglas, null, 2))}</textarea></label>
      </section>
      <section><h3>Conexión</h3><div class="tenue">Repo: ${esc(GH.repo)} · llave …${esc(tok.slice(-4))}</div></section>
      <div class="pie"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn peligro" type="button" data-a="salir">Cerrar sesión</button><button class="btn" type="button" data-a="json">Editar JSON</button></div>
        <div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">Guardar</button></div></div>
    </form>`, true);
}

function hojaJson() {
  abrirHoja(`<h2>Editar datos (JSON)</h2><p class="tenue">Para cambios que no tienen botón. Cuidado: si rompés el formato no se guarda.</p>
    <textarea class="json" id="json-edit">${esc(JSON.stringify(S.estado, null, 2))}</textarea>
    <div class="pie"><span class="error" id="json-err"></span><div class="der"><button class="btn" data-a="cerrar">Cancelar</button><button class="btn primario" data-a="guardar-json">Guardar</button></div></div>`, true);
}

// ───────────────────────── menú rápido (tipo clic derecho) ─────────────────────────
let MENU = null;
function cerrarMenu() { MENU?.remove(); MENU = null; }
function abrirMenu(ancla, items) {
  cerrarMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  const acciones = [];
  m.innerHTML = items.map((it) => {
    if (it === '-') return '<div class="menu-sep"></div>';
    if (it.titulo) return `<div class="menu-tit">${esc(it.titulo)}</div>`;
    acciones.push(it);
    return `<button role="menuitem" class="${it.on ? 'on' : ''} ${it.peligro ? 'peligro' : ''}" data-m="${acciones.length - 1}">
      <span class="ic">${it.icono || ''}</span><span class="tx">${esc(it.txt)}</span>${it.on ? `<span class="ok">${I.check}</span>` : ''}</button>`;
  }).join('');
  document.body.append(m);
  let x, y;
  if (ancla.clientX != null) { x = ancla.clientX; y = ancla.clientY; }
  else { const r = ancla.getBoundingClientRect(); x = r.left; y = r.bottom + 4; }
  const r = m.getBoundingClientRect();
  if (x + r.width > innerWidth - 8) x = innerWidth - r.width - 8;
  if (y + r.height > innerHeight - 8) y = Math.max(8, (ancla.clientY ?? ancla.getBoundingClientRect().top) - r.height - 4);
  m.style.left = `${Math.max(8, x)}px`;
  m.style.top = `${Math.max(8, y)}px`;
  m.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-m]');
    if (!b) return;
    ev.stopPropagation();
    const it = acciones[Number(b.dataset.m)];
    cerrarMenu();
    it.fn();
  });
  MENU = m;
  MENU_Y = scrollY;
}
let MENU_Y = 0;
addEventListener('scroll', () => { if (MENU && Math.abs(scrollY - MENU_Y) > 40) cerrarMenu(); }, { passive: true });
addEventListener('resize', cerrarMenu);

const puntoEtapa = (e) => `<i class="pe" style="--p:${N.PESO[e]}"></i>`;
function menuPieza(id, ancla) {
  const p = buscarPieza(id);
  if (!p) return;
  const etapas = p.cuota.simple ? ['pendiente', 'entregado'] : N.ETAPAS.filter((x) => x !== 'revision' || p.cuota.revision !== false);
  abrirMenu(ancla, [
    { titulo: `${area(p.area).corto} · ${nombrePieza(p)}${p.futura ? ' (adelanto)' : ''}` },
    ...etapas.map((e) => ({ txt: e === 'material' && p.cuota.material ? p.cuota.material : N.NOMBRE_ETAPA[e], icono: puntoEtapa(e), on: p.etapa === e, fn: () => setEtapa(id, e) })),
    '-',
    { txt: 'Esperando material', on: p.bloqueado, fn: () => setPieza(id, { bloqueado: !p.bloqueado }) },
    { txt: 'Título, nota, monto…', icono: I.lapiz, fn: () => hojaPieza(id) },
    { txt: p.descartada ? 'Recuperar' : 'Descartar', icono: I.basura, peligro: !p.descartada, fn: () => { setPieza(id, { descartada: !p.descartada }); toast(p.descartada ? 'Pieza recuperada' : 'Pieza descartada'); } },
  ]);
}

function moverTarea(id, fecha, aviso) {
  mutar((e) => { const x = e.tareas.find((y) => y.id === id); x.fecha = fecha; x.u = ahoraMs(); }, aviso);
}
function menuTarea(id, ancla) {
  const [baseId, fechaOc] = id.split('@');
  const t = S.estado.tareas.find((x) => x.id === baseId);
  if (!t) return;
  if (N.esRepetida(t)) {
    const hoyS = N.diaStr(new Date());
    const oc = fechaOc || (t.repetir.dias.includes(new Date().getDay()) ? hoyS : null);
    return abrirMenu(ancla, [
      { titulo: `${t.titulo} · ↻ ${N.diasRepetir(t)}` },
      ...(oc ? [{ txt: t.hechos?.[oc] ? 'Desmarcar hoy' : 'Hecho hoy', icono: I.check, fn: () => ACC.hecha({ dataset: { id: `${t.id}@${oc}` } }) }, '-'] : []),
      { txt: 'Editar…', icono: I.lapiz, fn: () => hojaTarea(t) },
      { txt: 'Borrar hábito', icono: I.basura, peligro: true, fn: () => mutar((e) => { const x = e.tareas.find((y) => y.id === t.id); x.borrado = true; x.u = ahoraMs(); }, 'Hábito borrado') },
    ]);
  }
  const hoy = new Date();
  const viernes = N.sumarDias(N.lunes(hoy), 4);
  abrirMenu(ancla, [
    { titulo: t.titulo.length > 42 ? `${t.titulo.slice(0, 40)}…` : t.titulo },
    { txt: t.hecha ? 'Desmarcar' : 'Marcar hecha', icono: I.check, fn: () => ACC.hecha({ dataset: { id } }) },
    '-',
    { txt: 'Para hoy', fn: () => moverTarea(id, N.diaStr(hoy), 'Para hoy') },
    { txt: 'Para mañana', fn: () => moverTarea(id, N.diaStr(N.sumarDias(hoy, 1)), 'Para mañana') },
    ...(viernes > hoy ? [{ txt: 'Para el viernes', fn: () => moverTarea(id, N.diaStr(viernes), 'Para el viernes') }] : []),
    { txt: 'Sin fecha', on: !t.fecha, fn: () => moverTarea(id, null, 'Sin fecha') },
    '-',
    { txt: 'Editar…', icono: I.lapiz, fn: () => hojaTarea(t) },
    { txt: 'Borrar', icono: I.basura, peligro: true, fn: () => mutar((e) => { const x = e.tareas.find((y) => y.id === id); x.borrado = true; x.u = ahoraMs(); }, 'Tarea borrada') },
  ]);
}

const COLORES_AREA = ['#6aa86f', '#d97a8c', '#5fa3c9', '#c9925a', '#9a8fd1', '#b5a642', '#5bb3a8', '#cf7a5c'];
function hojaArea(id) {
  const nueva = !id;
  const usados = new Set(S.estado.areas.filter((x) => !x.borrado).map((x) => x.color));
  const a = nueva ? { nombre: '', corto: '', color: COLORES_AREA.find((c) => !usados.has(c)) || '#6aa86f', nota: '' } : S.estado.areas.find((x) => x.id === id);
  abrirHoja(`<h2>${nueva ? 'Nueva área' : 'Editar área'}</h2>
    <form data-form="editar-area" data-id="${esc(id || '')}" class="campos" style="margin-top:14px">
      <label class="campo"><span>Nombre</span><input type="text" name="nombre" value="${esc(a.nombre)}" placeholder="${nueva ? 'Ej: Personal' : ''}" required></label>
      <div class="campos-2">
        <label class="campo"><span>Nombre corto (para etiquetas)</span><input type="text" name="corto" value="${esc(a.corto || '')}"></label>
        <label class="campo"><span>Color</span><input type="color" name="color" value="${esc(a.color)}" style="height:42px;width:80px;padding:4px"></label>
      </div>
      <label class="campo"><span>Nota</span><input type="text" name="nota" value="${esc(a.nota || '')}" placeholder="${nueva ? 'Ej: ejercicio, lectura, rutina' : ''}"></label>
      <div class="campo"><span>Excluir</span>
        <label class="check opcion"><input type="checkbox" name="excluirMetricas" ${a.excluirMetricas ? 'checked' : ''}><span>De las métricas de trabajo<small class="tenue">No suma ni resta al % de la semana, a las horas ni al estado. Igual te avisa en Hoy.</small></span></label>
        <label class="check opcion"><input type="checkbox" name="excluirResumen" ${a.excluirResumen ? 'checked' : ''}><span>Del resumen del día<small class="tenue">No aparece en el resumen ni en «Qué hacer hoy», solo en su pestaña.</small></span></label>
      </div>
      <div class="pie">${nueva ? '<span></span>' : `<button class="btn peligro" type="button" data-a="borrar-area" data-id="${esc(id)}">${I.basura} Borrar área</button>`}
        <div class="der"><button class="btn" type="button" data-a="cerrar">Cancelar</button><button class="btn primario" type="submit">${nueva ? 'Crear' : 'Guardar'}</button></div></div>
    </form>`);
}
function idArea(nombre) {
  let base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'area';
  if (['hoy', 'calendario', 'metas', 'vida', 'plata'].includes(base)) base += '-area';
  let id = base, n = 2;
  while (S.estado.areas.some((x) => x.id === id)) id = `${base}-${n++}`;
  return id;
}

const horaDe = (iso) => { const d = new Date(iso); return `${N.pad(d.getHours())}:${N.pad(d.getMinutes())}`; };

async function pedirActualizacion() {
  const r = await GH.leer('datos/pedido.json');
  await GH.escribir('datos/pedido.json', { pedido: new Date().toISOString(), por: 'página' }, r.sha, 'Página: pedir actualización');
}
let tRegen = null;
async function regenerar() {
  if (S.regenerando) return toast('Ya está regenerando…');
  try { await pedirActualizacion(); } catch (e) { return toast(`No pude pedirlo: ${e.message}`); }
  S.regenerando = Date.now();
  const antes = S.briefing?.generado;
  render();
  toast('Pedido. Tu PC lo genera en unos minutos (si está prendida).');
  clearInterval(tRegen);
  tRegen = setInterval(async () => {
    await cargar();
    if (S.briefing?.generado !== antes) { clearInterval(tRegen); S.regenerando = null; render(); toast('Resumen nuevo listo'); }
    else if (Date.now() - S.regenerando > 20 * 60000) { clearInterval(tRegen); S.regenerando = null; render(); toast('No llegó el resumen: ¿la PC está prendida?'); }
  }, 30000);
}

// ───────────────────────── arrastrar para ordenar áreas ─────────────────────────
let ARR = null, sinClick = false;
document.addEventListener('pointerdown', (ev) => {
  const asa = ev.target.closest('.asa');
  if (!asa) return;
  const item = asa.closest('[data-orden]');
  ev.preventDefault();
  ARR = { item, lista: item.parentElement, y0: ev.clientY, movio: false };
  item.classList.add('arrastrando');
  try { asa.setPointerCapture(ev.pointerId); } catch {}
});
document.addEventListener('pointermove', (ev) => {
  if (!ARR) return;
  const { item, lista } = ARR;
  if (Math.abs(ev.clientY - ARR.y0) > 3) ARR.movio = true;
  const otros = [...lista.children].filter((x) => x !== item);
  let ref = null;
  for (const o of otros) { const r = o.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { ref = o; break; } }
  if ((ref ? ref.previousElementSibling : lista.lastElementChild) !== item) {
    const antes = item.offsetTop;
    lista.insertBefore(item, ref);
    ARR.y0 += item.offsetTop - antes;
  }
  item.style.transform = `translateY(${ev.clientY - ARR.y0}px)`;
});
const soltar = () => {
  if (!ARR) return;
  const { item, lista, movio } = ARR;
  ARR = null;
  item.style.transform = '';
  item.classList.remove('arrastrando');
  if (!movio) return;
  sinClick = true;
  setTimeout(() => (sinClick = false), 50);
  const orden = [...lista.querySelectorAll('[data-orden]')].map((x) => x.dataset.orden);
  mutar((e) => { for (const a of e.areas) { const i = orden.indexOf(a.id); if (i >= 0 && a.orden !== i) { a.orden = i; a.u = ahoraMs(); } } });
};
document.addEventListener('pointerup', soltar);
document.addEventListener('pointercancel', soltar);

// ───────────────────────── fondo del día + clima ─────────────────────────
const PALETAS = [[150, 30, 250], [190, 20, 300], [120, 45, 330], [170, 260, 35], [205, 340, 60], [95, 200, 15], [230, 160, 40], [140, 280, 20], [180, 50, 270], [265, 140, 25], [10, 170, 220], [60, 190, 300]];
function fondoDelDia() {
  const d = new Date();
  const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const [h1, h2, h3] = PALETAS[n % PALETAS.length];
  const st = document.documentElement.style;
  st.setProperty('--h1', h1); st.setProperty('--h2', h2); st.setProperty('--h3', h3);
}

const CLIMA_COD = {
  0: ['☀️', 'Despejado'], 1: ['🌤️', 'Casi despejado'], 2: ['⛅', 'Parcialmente nublado'], 3: ['☁️', 'Nublado'],
  45: ['🌫️', 'Niebla'], 48: ['🌫️', 'Niebla'], 51: ['🌦️', 'Llovizna'], 53: ['🌦️', 'Llovizna'], 55: ['🌧️', 'Llovizna fuerte'],
  61: ['🌧️', 'Lluvia débil'], 63: ['🌧️', 'Lluvia'], 65: ['🌧️', 'Lluvia fuerte'], 66: ['🌧️', 'Lluvia helada'], 67: ['🌧️', 'Lluvia helada'],
  71: ['🌨️', 'Nieve'], 73: ['🌨️', 'Nieve'], 75: ['❄️', 'Nevada'], 80: ['🌦️', 'Chaparrones'], 81: ['🌧️', 'Chaparrones'], 82: ['⛈️', 'Chaparrones fuertes'],
  95: ['⛈️', 'Tormenta'], 96: ['⛈️', 'Tormenta con granizo'], 99: ['⛈️', 'Tormenta con granizo'],
};
let CLIMA = ls.json('sec.clima');
async function cargarClima() {
  const cfg = S.estado?.config?.clima || { lat: -34.9, lon: -56.16, lugar: 'Montevideo' };
  if (CLIMA && CLIMA.lugar === cfg.lugar && Date.now() - CLIMA.t < 30 * 60000) return;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`;
    const j = await (await fetch(u)).json();
    CLIMA = {
      t: Date.now(), lugar: cfg.lugar, temp: Math.round(j.current.temperature_2m), cod: j.current.weather_code, dia: j.current.is_day,
      max: Math.round(j.daily.temperature_2m_max[0]), min: Math.round(j.daily.temperature_2m_min[0]), lluvia: j.daily.precipitation_probability_max[0],
    };
    ls.set('sec.clima', JSON.stringify(CLIMA));
    pintarClima();
  } catch {}
}
function htmlClima() {
  if (!CLIMA) return '';
  let [ico, txt] = CLIMA_COD[CLIMA.cod] || ['🌡️', ''];
  if (!CLIMA.dia && CLIMA.cod <= 1) ico = '🌙';
  return `<span class="clima-ico">${ico}</span><b>${CLIMA.temp}°</b><span>${esc(txt)} · ${CLIMA.max}°/${CLIMA.min}°${CLIMA.lluvia >= 20 ? ` · 💧${CLIMA.lluvia}%` : ''} · ${esc(CLIMA.lugar)}</span>`;
}
function pintarClima() { const el = $('#clima'); if (el) el.innerHTML = htmlClima(); }

// ───────────────────────── acciones ─────────────────────────
const ACC = {
  tab(el) { S.tab = el.dataset.id; ls.set('sec.tab', S.tab); render(); window.scrollTo({ top: Math.min(window.scrollY, $('.tabs').offsetTop - 6), behavior: 'smooth' }); },
  tema() {
    const orden = ['auto', 'claro', 'oscuro'];
    const t = orden[(orden.indexOf(ls.get('sec.tema', 'auto')) + 1) % 3];
    ls.set('sec.tema', t);
    document.documentElement.dataset.tema = t;
    toast(t === 'auto' ? 'Tema automático' : t === 'claro' ? 'Modo día' : 'Modo noche');
    render();
  },
  ajustes: hojaAjustes,
  cerrar: cerrarHoja,
  json: hojaJson,
  'guardar-json'() {
    try {
      const nuevo = N.asegurarEstado(JSON.parse($('#json-edit').value));
      const t = ahoraMs();
      for (const k of ['areas', 'cuotas', 'tareas', 'metas', 'eventosVida', 'shows']) for (const x of nuevo[k]) x.u = t;
      for (const k of ['piezas', 'showsPrep']) for (const v of Object.values(nuevo[k])) v.u = t;
      nuevo.config.u = t; nuevo.dinero.u = t;
      for (const m of nuevo.dinero.movimientos) m.u = t;
      mutar((e) => Object.assign(e, nuevo), 'Datos guardados');
      cerrarHoja();
    } catch (err) { $('#json-err').textContent = `JSON inválido: ${err.message}`; }
  },
  salir() { if (confirm('¿Cerrar sesión en este dispositivo?')) { ls.del('sec.token'); ls.del('sec.cache'); location.reload(); } },
  async actualizar() {
    await cargar();
    calendarioEnVivo();
    fechasClientes();
    cargarClima();
    regenerar();
  },
  regenerar,
  dia(el) { menuDia(el.dataset.dia, el); },
  mes(el) { S.mesCal = el.dataset.mes || null; render(); },
  'editar-area'(el) { hojaArea(el.dataset.id); },
  'nueva-area'() { hojaArea(null); },
  'borrar-area'(el) {
    const id = el.dataset.id;
    const a = S.estado.areas.find((x) => x.id === id);
    if (!confirm(`¿Borrar el área "${a.nombre}"? También se ocultan sus tareas, hábitos, cuotas y metas.`)) return;
    mutar((e) => {
      const t = ahoraMs();
      for (const k of ['areas', 'tareas', 'cuotas', 'metas']) for (const x of e[k]) if ((k === 'areas' ? x.id : x.area) === id) { x.borrado = true; x.u = t; }
    }, 'Área borrada');
    if (S.tab === id) { S.tab = 'hoy'; ls.set('sec.tab', 'hoy'); render(); }
    cerrarHoja();
  },
  'nueva-rutina'(el) { hojaTarea(null, el.dataset.area, null, true); },
  'menu-tarea'(el) { menuTarea(el.dataset.id, el); },
  avanzar(el) { const p = buscarPieza(el.dataset.id); if (p) setEtapa(p.id, N.siguienteEtapa(p)); },
  entregar(el) { const p = buscarPieza(el.dataset.id); if (p) setEtapa(p.id, p.etapa === 'entregado' ? (p.cuota.simple ? 'pendiente' : 'editado') : 'entregado'); },
  pieza(el) { menuPieza(el.dataset.id, el); },
  'set-etapa'(el) {
    setEtapa(el.dataset.id, el.dataset.etapa);
    for (const b of document.querySelectorAll('.etapas button')) b.classList.toggle('on', b === el);
  },
  bloquear(el) { setPieza(el.dataset.id, { bloqueado: el.checked }); },
  descartar(el) {
    const p = buscarPieza(el.dataset.id);
    if (!p.descartada && !confirm('¿Descartar esta pieza? No se va a arrastrar a la semana siguiente.')) return;
    setPieza(p.id, { descartada: !p.descartada });
    cerrarHoja();
    toast(p.descartada ? 'Pieza recuperada' : 'Pieza descartada');
  },
  'guardar-pieza'(el) {
    const m = $('#pz-monto').value;
    setPieza(el.dataset.id, { titulo: $('#pz-titulo').value.trim(), nota: $('#pz-nota').value.trim(), monto: m === '' ? undefined : Number(m) });
    cerrarHoja();
  },
  hecha(el) {
    const [baseId, fecha] = el.dataset.id.split('@'); // `id@AAAA-MM-DD` = un día de un hábito
    const t = S.estado.tareas.find((x) => x.id === baseId);
    if (!t) return;
    const ya = fecha ? !!t.hechos?.[fecha] : t.hecha;
    mutar((e) => {
      const x = e.tareas.find((y) => y.id === t.id);
      if (fecha) {
        x.hechos = { ...(x.hechos || {}) };
        if (ya) delete x.hechos[fecha]; else x.hechos[fecha] = ahoraMs();
      } else { x.hecha = !ya; x.hechaEn = !ya ? ahoraMs() : null; }
      x.u = ahoraMs();
    }, !ya ? CELEBRA[Math.floor(Math.random() * CELEBRA.length)] : null);
    if (!ya) $('#anillo-semana')?.classList.add('pulso');
  },
  sumar(el) {
    let n = el.dataset.n;
    const t = S.estado.tareas.find((x) => x.id === el.dataset.id);
    let nuevo;
    if (n === '?') {
      const v = prompt(`¿Cuántos llevás de ${t.total}?`, t.actual || 0);
      if (v === null || isNaN(Number(v))) return;
      nuevo = Number(v);
    } else nuevo = (t.actual || 0) + Number(n);
    nuevo = Math.max(0, Math.min(t.total, nuevo));
    mutar((e) => {
      const x = e.tareas.find((y) => y.id === t.id);
      x.actual = nuevo; x.hist = [...(x.hist || []), { v: nuevo, t: ahoraMs() }].slice(-200); x.u = ahoraMs();
      if (nuevo >= x.total) { x.hecha = true; x.hechaEn = ahoraMs(); }
    }, nuevo >= t.total ? '¡Terminaste! 🎉' : null);
  },
  'editar-tarea'(el) { hojaTarea(S.estado.tareas.find((x) => x.id === el.dataset.id)); },
  'borrar-tarea'(el) { if (!confirm('¿Borrar la tarea?')) return; mutar((e) => { const x = e.tareas.find((y) => y.id === el.dataset.id); x.borrado = true; x.u = ahoraMs(); }, 'Tarea borrada'); cerrarHoja(); },
  'nueva-meta'(el) { hojaMeta(null, el.dataset.area); },
  'editar-meta'(el) { hojaMeta(S.estado.metas.find((x) => x.id === el.dataset.id)); },
  'borrar-meta'(el) { if (!confirm('¿Borrar la meta?')) return; mutar((e) => { const x = e.metas.find((y) => y.id === el.dataset.id); x.borrado = true; x.u = ahoraMs(); }); cerrarHoja(); },
  paso(el) { mutar((e) => { const m = e.metas.find((y) => y.id === el.dataset.meta); const p = m.pasos.find((y) => y.id === el.dataset.id); p.hecho = !p.hecho; m.u = ahoraMs(); }, null); },
  'borrar-paso'(el) { mutar((e) => { const m = e.metas.find((y) => y.id === el.dataset.meta); m.pasos = m.pasos.filter((y) => y.id !== el.dataset.id); m.u = ahoraMs(); }); },
  'nuevo-vida'() { hojaVida(); },
  'editar-vida'(el) { hojaVida(S.estado.eventosVida.find((x) => x.id === el.dataset.id)); },
  'borrar-vida'(el) { if (!confirm('¿Borrar?')) return; mutar((e) => { const x = e.eventosVida.find((y) => y.id === el.dataset.id); x.borrado = true; x.u = ahoraMs(); }); cerrarHoja(); },
  'nuevo-show'() { hojaShow(null); },
  show(el) { hojaShow(el.dataset.clave); },
  prep(el) {
    const clave = el.dataset.clave;
    const s = S.A.shows.find((x) => x.clave === clave);
    mutar((e) => {
      const p = e.showsPrep[clave] || {};
      p.items = (p.items || prepItems(s)).map((i) => (i.id === el.dataset.id ? { ...i, hecho: !i.hecho } : i));
      p.u = ahoraMs(); e.showsPrep[clave] = p;
    });
    const on = !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.innerHTML = on ? I.check : '';
    el.closest('.fila')?.classList.toggle('hecha', on);
  },
  'borrar-prep'(el) {
    const clave = el.dataset.clave;
    const s = S.A.shows.find((x) => x.clave === clave);
    mutar((e) => { const p = e.showsPrep[clave] || {}; p.items = (p.items || prepItems(s)).filter((i) => i.id !== el.dataset.id); p.u = ahoraMs(); e.showsPrep[clave] = p; });
    hojaShow(clave);
  },
  'guardar-show-notas'(el) {
    const clave = el.dataset.clave;
    const notas = $('#show-notas').value;
    mutar((e) => { const p = e.showsPrep[clave] || {}; p.notas = notas; p.u = ahoraMs(); e.showsPrep[clave] = p; });
    cerrarHoja();
  },
  async 'borrar-show'(el) {
    const clave = el.dataset.clave;
    const s = S.A.shows.find((x) => x.clave === clave);
    if (!confirm(`¿Sacar "${s.titulo}"? También se borra de tu Google Calendar.`)) return;
    mutar((e) => {
      if (clave.startsWith('m:')) { const x = e.shows.find((y) => y.id === clave.slice(2)); if (x) { x.borrado = true; x.u = ahoraMs(); } }
      const p = e.showsPrep[clave] || {}; p.borrar = true; if (s.evento) { p.eventoId = s.evento.id; p.cal = s.evento.cal; } p.u = ahoraMs(); e.showsPrep[clave] = p;
    }, 'Show sacado');
    cerrarHoja();
    try {
      await postCalendario({ shows: { borrar: clave.startsWith('m:') ? [{ sid: clave.slice(2), fecha: s.dia }] : [], borrarIds: s.evento && !s.evento.sid ? [{ id: s.evento.id, cal: s.evento.cal }] : [] } });
    } catch {}
  },
  'nueva-cuota'(el) { hojaCuotaNueva(el.dataset.area); },
  flyer(el) {
    const f = (S.fechas[el.dataset.area] || []).find((x) => x.id === el.dataset.id);
    if (!f) return;
    const hoy = N.diaStr(new Date());
    let fecha = N.diaStr(N.sumarDias(N.parseDia(f.fecha), -7));
    if (fecha < hoy) fecha = hoy;
    mutar((e) => e.tareas.push({ id: N.nuevoId('t'), area: el.dataset.area, titulo: `Flyer · ${f.titulo || f.show} (${fechaCorta(f.fecha)})`, fecha, horas: 1, ref: `flyer:${el.dataset.area}:${f.id}`, hecha: false, creada: ahoraMs(), u: ahoraMs() }), `Tarea creada para el ${fechaCorta(fecha)}`);
  },
  'nuevo-mov': hojaMov,
  'borrar-mov'(el) { if (!confirm('¿Borrar el movimiento?')) return; mutar((e) => { const x = e.dinero.movimientos.find((y) => y.id === el.dataset.id); x.borrado = true; x.u = ahoraMs(); }); },
  pomo() { P.modo = P.modo === 'pomo' ? 'reloj' : 'pomo'; guardarP(); pintarReloj(true); },
  reloj() { P.modo = 'reloj'; guardarP(); pintarReloj(true); },
  'pomo-play'() {
    if (P.corriendo) { P.restante = P.fin - Date.now(); P.corriendo = false; }
    else { P.fin = Date.now() + (P.restante ?? durFase() * 60000); P.corriendo = true; pedirNotif(); }
    guardarP(); pintarReloj(true);
  },
  'pomo-reset'() { P.corriendo = false; P.restante = null; P.fin = null; guardarP(); pintarReloj(true); },
  'pomo-saltar'() { terminarFase(false); },
  ruido: toggleRuido,
};

// formularios
const FORM = {
  tarea(f, fd) {
    const titulo = fd.get('titulo').trim();
    if (!titulo) return;
    const horas = fd.get('horas');
    mutar((e) => e.tareas.push({ id: N.nuevoId('t'), area: f.dataset.area, titulo, fecha: fd.get('fecha') || null, horas: horas ? Number(horas) : undefined, hecha: false, creada: ahoraMs(), u: ahoraMs() }), 'Tarea agregada');
  },
  'editar-tarea'(f, fd) {
    const id = f.dataset.id;
    const rep = fd.getAll('rep').map(Number).sort();
    const datos = {
      titulo: fd.get('titulo').trim(), area: fd.get('area'), fecha: rep.length ? null : fd.get('fecha') || null,
      horas: fd.get('horas') ? Number(fd.get('horas')) : undefined, total: !rep.length && fd.get('total') ? Number(fd.get('total')) : undefined,
      prioridad: Number(fd.get('prioridad')) || 0, notas: fd.get('notas').trim(), repetir: rep.length ? { dias: rep } : undefined, u: ahoraMs(),
    };
    mutar((e) => {
      const x = e.tareas.find((y) => y.id === id);
      if (rep.length && !x?.desde) datos.desde = N.diaStr(new Date());
      if (x) Object.assign(x, datos);
      else e.tareas.push({ id, ...datos, hecha: false, creada: ahoraMs(), actual: datos.total ? 0 : undefined });
    });
    cerrarHoja();
  },
  'editar-meta'(f, fd) {
    const id = f.dataset.id;
    mutar((e) => {
      const x = e.metas.find((y) => y.id === id);
      const datos = { titulo: fd.get('titulo').trim(), area: fd.get('area'), objetivo: fd.get('objetivo').trim(), u: ahoraMs() };
      if (x) Object.assign(x, datos, { hecha: !!fd.get('hecha') });
      else e.metas.push({ id, ...datos, hecha: false, pasos: (fd.get('pasos') || '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ id: N.nuevoId('p'), t, hecho: false })) });
    });
    cerrarHoja();
  },
  paso(f, fd) {
    const t = fd.get('t').trim();
    if (!t) return;
    mutar((e) => { const m = e.metas.find((y) => y.id === f.dataset.meta); m.pasos = [...(m.pasos || []), { id: N.nuevoId('p'), t, hecho: false }]; m.u = ahoraMs(); });
    setTimeout(() => { const d = document.querySelector(`form[data-meta="${CSS.escape(f.dataset.meta)}"]`); d?.closest('details')?.setAttribute('open', ''); d?.querySelector('input')?.focus(); }, 0);
  },
  'editar-vida'(f, fd) {
    const id = f.dataset.id;
    const datos = { titulo: fd.get('titulo').trim(), tipo: fd.get('tipo'), desde: fd.get('desde'), hasta: fd.get('hasta') || fd.get('desde'), capacidad: Number(fd.get('capacidad')), pausarCuotas: !!fd.get('pausarCuotas'), notas: fd.get('notas').trim(), u: ahoraMs() };
    mutar((e) => { const x = e.eventosVida.find((y) => y.id === id); if (x) Object.assign(x, datos); else e.eventosVida.push({ id, ...datos }); }, 'Guardado');
    cerrarHoja();
  },
  async 'nuevo-show'(f, fd) {
    const s = { id: N.nuevoId('s'), titulo: fd.get('titulo').trim(), fecha: fd.get('fecha'), hora: fd.get('hora'), lugar: fd.get('lugar').trim(), notas: fd.get('notas').trim(), u: ahoraMs() };
    mutar((e) => e.shows.push(s), 'Show agregado');
    cerrarHoja();
    try {
      const r = await postCalendario({ shows: { crear: [s] } });
      if (r?.ok) { toast('También está en tu Google Calendar'); calendarioEnVivo(); }
    } catch {}
  },
  prep(f, fd) {
    const clave = f.dataset.clave;
    const t = fd.get('t').trim();
    const s = S.A.shows.find((x) => x.clave === clave);
    mutar((e) => { const p = e.showsPrep[clave] || {}; p.items = [...(p.items || prepItems(s)), { id: N.nuevoId('i'), t, hecho: false }]; p.u = ahoraMs(); e.showsPrep[clave] = p; });
    hojaShow(clave);
  },
  'editar-area'(f, fd) {
    const nombre = fd.get('nombre').trim();
    if (!nombre && !f.dataset.id) return;
    const id = f.dataset.id || idArea(nombre);
    mutar((e) => {
      let a = e.areas.find((x) => x.id === id);
      if (!a) {
        a = { id, orden: Math.max(-1, ...e.areas.filter((x) => !x.borrado).map((x) => x.orden ?? 0)) + 1 };
        e.areas.push(a);
      }
      a.nombre = nombre || a.nombre;
      a.corto = fd.get('corto').trim() || a.nombre;
      a.color = fd.get('color');
      a.nota = fd.get('nota').trim();
      a.excluirMetricas = !!fd.get('excluirMetricas');
      a.excluirResumen = !!fd.get('excluirResumen');
      a.u = ahoraMs();
    }, f.dataset.id ? 'Guardado' : 'Área creada');
    if (!f.dataset.id) { S.tab = id; ls.set('sec.tab', id); render(); }
    cerrarHoja();
  },
  'nueva-cuota'(f, fd) {
    mutar((e) => e.cuotas.push({ id: N.nuevoId('q'), area: f.dataset.area, nombre: fd.get('nombre').trim(), cantidad: Number(fd.get('cantidad')) || 1, horas: Number(fd.get('horas')) || 0, simple: true, desde: N.diaStr(N.lunes(new Date())), u: ahoraMs() }), 'Meta semanal activada');
    cerrarHoja();
  },
  'nuevo-mov'(f, fd) {
    mutar((e) => e.dinero.movimientos.push({ id: N.nuevoId('d'), tipo: fd.get('tipo'), area: fd.get('area'), monto: Number(fd.get('monto')), fecha: fd.get('fecha'), concepto: fd.get('concepto').trim(), u: ahoraMs() }), 'Guardado');
    cerrarHoja();
  },
  tarifas(f, fd) {
    mutar((e) => {
      e.dinero.moneda = fd.get('moneda').trim() || '$';
      for (const [k, v] of fd.entries()) if (k.startsWith('t:')) { if (v === '') delete e.dinero.tarifas[k.slice(2)]; else e.dinero.tarifas[k.slice(2)] = Number(v); }
      e.dinero.u = ahoraMs();
    }, 'Tarifas guardadas');
  },
  ajustes(f, fd) {
    let reglas;
    try { reglas = JSON.parse(fd.get('reglas')); } catch { return toast('Las reglas no son JSON válido'); }
    const lun = N.diaStr(N.lunes(new Date()));
    mutar((e) => {
      const c = e.config;
      for (const k of ['horasMin', 'horasMax', 'inicioJornada', 'horasFinde', 'horasTarea', 'horasGrabacionMin']) c[k] = Number(fd.get(k));
      c.pomodoro = { foco: Number(fd.get('pFoco')), descanso: Number(fd.get('pDescanso')), largo: Number(fd.get('pLargo')), cada: Number(fd.get('pCada')) };
      c.clima = { lugar: fd.get('climaLugar').trim() || 'Montevideo', lat: Number(fd.get('climaLat')), lon: Number(fd.get('climaLon')) };
      c.calendario = { url: fd.get('calUrl').trim(), clave: fd.get('calClave').trim() };
      c.reglas = reglas;
      c.u = ahoraMs();
      for (const q of e.cuotas) {
        if (q.borrado || !fd.has(`q:${q.id}:nombre`)) continue;
        const cant = Number(fd.get(`q:${q.id}:cantidad`));
        if (cant !== N.cantidadEn(q, N.lunes(new Date()))) q.cambios = [...(q.cambios || []).filter((x) => x.desde !== lun), { desde: lun, cantidad: cant }];
        q.nombre = fd.get(`q:${q.id}:nombre`).trim() || q.nombre;
        q.horas = Number(fd.get(`q:${q.id}:horas`));
        q.activa = !!fd.get(`q:${q.id}:activa`);
        q.u = ahoraMs();
      }
    }, 'Ajustes guardados');
    cerrarHoja();
    calendarioEnVivo();
  },
};

document.addEventListener('click', (ev) => {
  if (MENU && !MENU.contains(ev.target)) { cerrarMenu(); if (!ev.target.closest('[data-a]')) return; }
  if (sinClick) { ev.preventDefault(); return; }
  if (ev.target.id === 'hoja') return cerrarHoja();
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') { ACC[el.dataset.a]?.(el, ev); return; }
  ev.preventDefault();
  ACC[el.dataset.a]?.(el, ev);
});
document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  FORM[f.dataset.form]?.(f, new FormData(f));
});
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (MENU) cerrarMenu();
  else if (!$('#hoja').hidden) cerrarHoja();
});
// clic derecho (o mantener apretado en el celu) sobre una pieza o tarea → menú rápido
document.addEventListener('contextmenu', (ev) => {
  const el = ev.target.closest('[data-ctx]');
  if (!el || ev.target.closest('input,textarea')) return;
  ev.preventDefault();
  if (el.dataset.ctx === 'pieza') menuPieza(el.dataset.id, ev);
  else if (el.dataset.ctx === 'tarea') menuTarea(el.dataset.id, ev);
});

// ───────────────────────── reloj + pomodoro ─────────────────────────
const P = Object.assign({ modo: 'reloj', fase: 'foco', corriendo: false, fin: null, restante: null, ciclos: 0 }, ls.json('sec.pomo', {}));
const guardarP = () => ls.set('sec.pomo', JSON.stringify(P));
const cfgP = () => S.estado?.config?.pomodoro || { foco: 25, descanso: 5, largo: 15, cada: 4 };
const durFase = () => ({ foco: cfgP().foco, descanso: cfgP().descanso, largo: cfgP().largo }[P.fase]);
const NOMBRE_FASE = { foco: 'Foco', descanso: 'Descanso', largo: 'Descanso largo' };

function htmlReloj() {
  const pomo = P.modo === 'pomo';
  return `<div class="modos"><button class="${!pomo ? 'on' : ''}" data-a="reloj">Reloj</button><button class="${pomo ? 'on' : ''}" data-a="pomo">Pomodoro</button></div>
    <button class="icono ruido ${ruido ? 'on' : ''}" data-a="ruido" title="Ruido suave para concentrarte">${I.ola}</button>
    <div class="anillo-reloj ${P.fase !== 'foco' ? 'descanso' : ''}">
      <svg width="220" height="220" viewBox="0 0 220 220"><circle class="pista" cx="110" cy="110" r="104" fill="none" stroke-width="5"/>
        <circle class="prog" id="pomo-prog" cx="110" cy="110" r="104" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="653.5" stroke-dashoffset="${pomo ? 653.5 : 653.5}"/></svg>
      <div><div class="hora" id="hora"></div><div class="hora-sub" id="hora-sub"></div></div>
    </div>
    <div class="pomo-ctrl ${pomo ? '' : 'oculto'}" ${pomo ? '' : 'aria-hidden="true"'}>
      <button class="icono" data-a="pomo-reset" title="Reiniciar" ${pomo ? '' : 'tabindex="-1"'}>${I.reset}</button>
      <button class="icono principal" data-a="pomo-play" title="${P.corriendo ? 'Pausar' : 'Empezar'}" ${pomo ? '' : 'tabindex="-1"'}>${P.corriendo ? I.pausa : I.play}</button>
      <button class="icono" data-a="pomo-saltar" title="Saltar fase" ${pomo ? '' : 'tabindex="-1"'}>${I.saltar}</button></div>
    <div class="clima" id="clima">${htmlClima()}</div>`;
}

function pintarReloj(rehacer = false) {
  const cont = $('#reloj');
  if (!cont) return;
  if (rehacer || !cont.querySelector('#hora')) cont.innerHTML = htmlReloj();
  const ahora = new Date();
  const hora = $('#hora'), sub = $('#hora-sub'), prog = $('#pomo-prog');
  const C = 653.5;
  if (P.modo === 'pomo') {
    const total = durFase() * 60000;
    const resta = P.corriendo ? Math.max(0, P.fin - Date.now()) : P.restante ?? total;
    if (P.corriendo && resta <= 0) return terminarFase(true);
    const m = Math.floor(resta / 60000), s = Math.floor((resta % 60000) / 1000);
    hora.innerHTML = `${N.pad(m)}:${N.pad(s)}`;
    sub.textContent = `${NOMBRE_FASE[P.fase]} · ciclo ${(P.ciclos % cfgP().cada) + 1}/${cfgP().cada} · ${N.pad(ahora.getHours())}:${N.pad(ahora.getMinutes())}`;
    prog.style.strokeDashoffset = C * (resta / total);
    document.title = P.corriendo ? `${N.pad(m)}:${N.pad(s)} · ${NOMBRE_FASE[P.fase]}` : 'Secretario';
  } else {
    hora.innerHTML = `${N.pad(ahora.getHours())}:${N.pad(ahora.getMinutes())}<small>${N.pad(ahora.getSeconds())}</small>`;
    sub.textContent = fechaLarga(ahora);
    const seg = ahora.getSeconds() + ahora.getMilliseconds() / 1000;
    prog.style.transition = seg < 1 ? 'none' : '';
    prog.style.strokeDashoffset = C * (1 - seg / 60);
    document.title = 'Secretario';
  }
}

function terminarFase(sonar) {
  if (sonar) campana();
  if (P.fase === 'foco') {
    P.ciclos++;
    P.fase = P.ciclos % cfgP().cada === 0 ? 'largo' : 'descanso';
    if (sonar) { toast('¡Tiempo! Tomate un descanso.'); notificar('Terminó el foco', 'Tomate un descanso 🌿'); }
  } else {
    P.fase = 'foco';
    if (sonar) { toast('Volvemos al foco.'); notificar('Terminó el descanso', 'Volvemos al foco'); }
  }
  P.corriendo = false; P.restante = null; P.fin = null;
  guardarP(); pintarReloj(true);
}

function campana() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[660, 0], [880, 0.35], [990, 0.7]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + t);
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 1.7);
    });
    setTimeout(() => ctx.close(), 3000);
  } catch {}
}
function pedirNotif() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch {} }
function notificar(t, b) { try { if (document.hidden && Notification.permission === 'granted') new Notification(t, { body: b }); } catch {} }

let ruido = null;
function toggleRuido() {
  if (ruido) {
    const r = ruido; ruido = null;
    r.g.gain.linearRampToValueAtTime(0, r.ctx.currentTime + 0.8);
    setTimeout(() => r.ctx.close(), 900);
  } else {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 6, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2.5);
    src.connect(f).connect(g).connect(ctx.destination); src.start();
    ruido = { ctx, g };
  }
  pintarReloj(true);
}

// ───────────────────────── login ─────────────────────────
function vistaLogin(error = '') {
  $('#app').innerHTML = `<div class="login"><div class="card">
    <h1>Secretario</h1>
    <p class="suave">Esta página es privada. Para entrar, pegá tu llave de GitHub (solo la primera vez en cada dispositivo).</p>
    <form id="login" class="campos" style="margin-top:16px">
      <label class="campo"><span>Llave (token de GitHub)</span><input type="password" name="token" required autocomplete="current-password" placeholder="github_pat_…"></label>
      <label class="campo"><span>Repo de datos</span><input type="text" name="repo" value="${esc(GH.repo)}"></label>
      ${error ? `<div class="error">${esc(error)}</div>` : ''}
      <button class="btn primario" type="submit">Entrar</button>
    </form>
    <details><summary>¿Cómo saco la llave?</summary><ol>
      <li>Entrá a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</li>
      <li>Nombre: <i>Secretario</i>. Vencimiento: el más largo que te deje.</li>
      <li>Repository access → <b>Only select repositories</b> → <b>Secretario-datos</b>.</li>
      <li>Permissions → Repository → <b>Contents: Read and write</b>.</li>
      <li>Generá el token, copialo y pegalo acá. Queda guardado solo en este navegador.</li>
    </ol></details>
  </div></div>`;
  $('#login').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    ls.set('sec.token', fd.get('token').trim());
    ls.set('sec.repo', fd.get('repo').trim() || REPO_DEF);
    $('#app').innerHTML = '<div class="cargando"><div class="punto"></div></div>';
    cargar(true);
  });
}

// ───────────────────────── arranque ─────────────────────────
function iniciar() {
  fondoDelDia();
  if (!GH.token) return vistaLogin();
  const cache = ls.json('sec.cache');
  if (cache?.estado) {
    S.estado = N.asegurarEstado(cache.estado); S.sha = cache.sha; S.cal = cache.cal; S.briefing = cache.briefing; S.corrida = cache.corrida; S.sucio = !!cache.sucio;
    render();
  }
  cargar(true);
  setInterval(() => pintarReloj(), 1000);
  setInterval(() => { if (!document.hidden) cargar(); }, 5 * 60000);
  let ultimoDia = N.diaStr(new Date());
  setInterval(() => { const d = N.diaStr(new Date()); if (d !== ultimoDia) { ultimoDia = d; fondoDelDia(); render(); } }, 60000);
  setInterval(cargarClima, 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
}
iniciar();
