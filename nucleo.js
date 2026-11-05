// nucleo.js — la lógica del Secretario, compartida entre la página y el motor (Node).
// Sin DOM: solo funciones puras sobre `estado` (datos/estado.json) y `cal` (datos/calendario.json).

export const ETAPAS = ['pendiente', 'material', 'editado', 'revision', 'entregado'];
export const PESO = { pendiente: 0, material: 0.15, editado: 0.85, revision: 0.95, entregado: 1 };
export const NOMBRE_ETAPA = {
  pendiente: 'Por empezar',
  material: 'Material listo',
  editado: 'Editado',
  revision: 'En revisión',
  entregado: 'Entregado',
};

export const NIVELES = {
  libre: { nombre: 'Sin pendientes', orden: -1 },
  adelantado: { nombre: 'Adelantado', orden: 0 },
  al_dia: { nombre: 'Al día', orden: 1 },
  vence_hoy: { nombre: 'Vence hoy', orden: 2 },
  en_riesgo: { nombre: 'En riesgo', orden: 2 },
  atrasado: { nombre: 'Atrasado', orden: 3 },
};
const peor = (a, b) => (NIVELES[a].orden >= NIVELES[b].orden ? a : b);

// ───────────────────────── fechas ─────────────────────────
export const pad = (n) => String(n).padStart(2, '0');
export const diaStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseDia(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export function sumarDias(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
export function lunes(d) {
  const r = inicioDia(d);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}
export function semanaId(d) {
  const t = inicioDia(d);
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7) + 3); // jueves de esa semana
  const f = new Date(t.getFullYear(), 0, 4);
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7) + 3);
  return `${t.getFullYear()}-W${pad(1 + Math.round((t - f) / (7 * 864e5)))}`;
}
export const mismoDia = (a, b) => diaStr(a) === diaStr(b);
export function diasEntre(a, b) {
  return Math.round((inicioDia(b) - inicioDia(a)) / 864e5);
}
export function fechaEvento(v) {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseDia(v) : new Date(v);
}

const vivos = (arr) => (arr || []).filter((x) => x && !x.borrado);

// ───────────────────────── estado por defecto ─────────────────────────
export function configBase() {
  return {
    u: 0,
    inicio: '2026-11-02',
    dias: [1, 2, 3, 4, 5],
    horasMin: 8,
    horasMax: 10,
    inicioJornada: 9,
    horasFinde: 5,
    horasTarea: 1,
    horasGrabacionMin: 3,
    pomodoro: { foco: 25, descanso: 5, largo: 15, cada: 4 },
    calendario: { url: '', clave: '' },
    reglas: [
      { calendario: 'Shows', area: 'area1', tipo: 'show' },
      { calendario: 'Festivos', tipo: 'feriado' },
      { calendario: 'Cumpleaños', tipo: 'cumple' },
    ],
  };
}

export function asegurarEstado(e) {
  e = e || {};
  e.version = 1;
  e.config = { ...configBase(), ...(e.config || {}) };
  for (const k of ['areas', 'cuotas', 'tareas', 'metas', 'eventosVida', 'shows']) e[k] = e[k] || [];
  e.piezas = e.piezas || {};
  e.showsPrep = e.showsPrep || {};
  e.libres = e.libres || {}; // { 'AAAA-MM-DD': { off: true, u } } días que no trabajás
  e.dinero = e.dinero || {};
  e.dinero.moneda = e.dinero.moneda || '$';
  e.dinero.tarifas = e.dinero.tarifas || {};
  e.dinero.movimientos = e.dinero.movimientos || [];
  return e;
}

// ───────────────────────── fusión (página ↔ repo) ─────────────────────────
// Cada entidad lleva `u` (ms de la última edición). Gana la más nueva.
const LISTAS = ['areas', 'cuotas', 'tareas', 'metas', 'eventosVida', 'shows'];
const MAPAS = ['piezas', 'showsPrep', 'libres'];
function fusionLista(a = [], b = []) {
  const m = new Map();
  for (const x of b) m.set(x.id, x);
  for (const x of a) {
    const y = m.get(x.id);
    if (!y || (x.u || 0) > (y.u || 0)) m.set(x.id, x);
  }
  return [...m.values()];
}
function fusionMapa(a = {}, b = {}) {
  const r = { ...b };
  for (const [k, v] of Object.entries(a)) if (!r[k] || (v.u || 0) > (r[k].u || 0)) r[k] = v;
  return r;
}
export function fusionar(local, remoto) {
  const a = asegurarEstado(structuredClone(local));
  const b = asegurarEstado(structuredClone(remoto));
  const r = b;
  for (const k of LISTAS) r[k] = fusionLista(a[k], b[k]);
  for (const k of MAPAS) r[k] = fusionMapa(a[k], b[k]);
  if ((a.config.u || 0) > (b.config.u || 0)) r.config = a.config;
  const da = a.dinero, db = b.dinero;
  r.dinero = {
    ...((da.u || 0) > (db.u || 0) ? da : db),
    movimientos: fusionLista(da.movimientos, db.movimientos),
  };
  return r;
}

// ───────────────────────── calendario ─────────────────────────
export function clasificar(ev, reglas) {
  for (const r of reglas || []) {
    if (r.calendario && r.calendario !== ev.cal) continue;
    if (r.patron) {
      try {
        if (!new RegExp(r.patron, 'i').test(`${ev.titulo} ${ev.lugar || ''}`.trim())) continue;
      } catch {
        continue;
      }
    }
    return { area: r.area || null, tipo: r.tipo || 'evento' };
  }
  return { area: null, tipo: 'evento' };
}

export function prepararEventos(estado, cal) {
  return (cal?.eventos || [])
    .map((e) => {
      const ini = fechaEvento(e.inicio);
      let fin = fechaEvento(e.fin) || ini;
      if (e.todoElDia && ini && fin <= ini) fin = sumarDias(ini, 1);
      return { ...e, ...clasificar(e, estado.config.reglas), ini, fin };
    })
    .filter((e) => e.ini && e.tipo !== 'ignorar')
    .sort((a, b) => a.ini - b.ini);
}

export function eventosDelDia(eventos, fecha) {
  const d0 = inicioDia(fecha), d1 = sumarDias(d0, 1);
  return eventos.filter((e) => (e.todoElDia ? e.ini <= d0 && e.fin > d0 : e.ini < d1 && e.fin > d0));
}

function horasGrabacion(estado, eventos, fecha, ahora) {
  let h = 0;
  for (const e of eventosDelDia(eventos, fecha)) {
    if (e.tipo !== 'grabacion') continue;
    if (ahora && e.fin < ahora) continue;
    const dur = e.todoElDia ? 0 : (e.fin - e.ini) / 36e5;
    h += Math.max(dur, estado.config.horasGrabacionMin);
  }
  return h;
}

// ───────────────────────── capacidad ─────────────────────────
export const esLibre = (estado, s) => !!estado.libres?.[s]?.off;
export function factorVida(estado, fecha) {
  const s = diaStr(fecha);
  if (esLibre(estado, s)) return 0;
  let f = 1;
  for (const ev of vivos(estado.eventosVida)) {
    if (ev.desde <= s && s <= (ev.hasta || ev.desde)) f = Math.min(f, ev.capacidad ?? 0);
  }
  return f;
}
export function eventosVidaDelDia(estado, fecha) {
  const s = diaStr(fecha);
  return vivos(estado.eventosVida).filter((ev) => ev.desde <= s && s <= (ev.hasta || ev.desde));
}
export const esLaboral = (estado, fecha) => estado.config.dias.includes(fecha.getDay());

function fraccionRestante(c, ahora) {
  const h = ahora.getHours() + ahora.getMinutes() / 60;
  const ini = c.inicioJornada, fin = c.inicioJornada + c.horasMax;
  return Math.min(1, Math.max(0, (fin - h) / (fin - ini)));
}

// modo: 'min' | 'max' | 'finde'. Con `ahora`, si `fecha` es hoy, cuenta solo lo que queda del día.
export function capacidadDia(estado, eventos, fecha, ahora, modo = 'min') {
  const c = estado.config;
  const laboral = esLaboral(estado, fecha);
  let base;
  if (modo === 'finde') base = laboral ? 0 : c.horasFinde;
  else base = laboral ? (modo === 'max' ? c.horasMax : c.horasMin) : 0;
  base *= factorVida(estado, fecha);
  if (ahora && mismoDia(fecha, ahora)) base *= fraccionRestante(c, ahora);
  if (base > 0) base -= horasGrabacion(estado, eventos, fecha, ahora);
  return Math.max(0, base);
}

// ───────────────────────── cuotas y piezas ─────────────────────────
export function cantidadEn(cuota, lunesSemana) {
  let n = cuota.cantidad;
  const s = diaStr(lunesSemana);
  for (const cb of cuota.cambios || []) if (cb.desde <= s) n = cb.cantidad;
  return n;
}

export function semanaPausada(estado, lunesSemana, area) {
  const lun = diaStr(lunesSemana), vie = diaStr(sumarDias(lunesSemana, 4));
  return vivos(estado.eventosVida).some(
    (ev) => ev.pausarCuotas && ev.desde <= lun && (ev.hasta || ev.desde) >= vie && (!ev.areas?.length || ev.areas.includes(area)),
  );
}

export function cambioEn(p, etapa) {
  for (let i = (p.hist || []).length - 1; i >= 0; i--) if (p.hist[i].e === etapa) return p.hist[i].t;
  return null;
}
function etapaAntesDe(p, t) {
  let e = 'pendiente';
  for (const h of p.hist || []) if (h.t < t) e = h.e;
  return e;
}
const ultimoCambio = (p) => (p.hist?.length ? p.hist[p.hist.length - 1].t : 0);

// Incluye la semana que viene (futura: true) para poder adelantar trabajo.
export function expandirPiezas(estado, ahora = new Date(), semanasAdelante = 1) {
  const actual = lunes(ahora);
  const proxima = sumarDias(actual, 7 * Math.max(1, semanasAdelante));
  const out = [];
  for (const cuota of vivos(estado.cuotas)) {
    if (cuota.activa === false && !cuota.hasta) continue;
    let w = lunes(parseDia(cuota.desde || estado.config.inicio));
    const fin = cuota.hasta ? lunes(parseDia(cuota.hasta)) : proxima;
    for (; w <= fin && w <= proxima; w = sumarDias(w, 7)) {
      if (semanaPausada(estado, w, cuota.area)) continue;
      const sem = semanaId(w);
      const n = cantidadEn(cuota, w);
      for (let i = 1; i <= n; i++) {
        const id = `${cuota.id}@${sem}#${i}`;
        const st = estado.piezas[id] || {};
        out.push({
          id,
          cuota,
          area: cuota.area,
          semana: sem,
          lunes: new Date(w),
          n: i,
          etapa: st.etapa || 'pendiente',
          bloqueado: !!st.bloqueado,
          descartada: !!st.descartada,
          titulo: st.titulo || '',
          nota: st.nota || '',
          monto: st.monto,
          hist: st.hist || [],
          atrasada: w < actual,
          futura: w > actual,
        });
      }
    }
  }
  return out;
}

export function siguienteEtapa(p) {
  const i = ETAPAS.indexOf(p.etapa);
  if (p.cuota.simple) return p.etapa === 'entregado' ? 'pendiente' : 'entregado';
  if (p.etapa === 'editado' && !p.cuota.revision) return 'entregado';
  return ETAPAS[Math.min(i + 1, ETAPAS.length - 1)];
}

// ───────────────────────── tareas ─────────────────────────
export const horasTarea = (estado, t) => t.horas ?? estado.config.horasTarea;
export function progresoTarea(t) {
  if (t.hecha) return 1;
  if (t.total) return Math.min(1, (t.actual || 0) / t.total);
  return 0;
}
function progresoTareaAntesDe(t, ms) {
  if (t.hecha && t.hechaEn && t.hechaEn < ms) return 1;
  if (!t.total) return 0;
  let v = 0;
  for (const h of t.hist || []) if (h.t < ms) v = h.v;
  return Math.min(1, v / t.total);
}

// ───────────────────────── áreas: exclusiones ─────────────────────────
// a.excluirMetricas: no suma a las métricas de trabajo (semana, % de hoy, horas, pronóstico). Igual aparece en el plan.
// a.excluirResumen: no aparece en el resumen del día ni en "Qué hacer hoy" (solo en su pestaña).
export const areaDe = (estado, id) => (estado.areas || []).find((a) => a.id === id);
export const cuentaEnMetricas = (estado, id) => !areaDe(estado, id)?.excluirMetricas;
export const vaAlResumen = (estado, id) => !areaDe(estado, id)?.excluirResumen;

// ───────────────────────── tareas que se repiten (rutinas) ─────────────────────────
// t.repetir = { dias: [0–6] } (0 = domingo) · t.desde = 'AAAA-MM-DD' · t.hechos = { 'AAAA-MM-DD': ms }.
// Cada día que toca es una "ocurrencia" (id `${t.id}@AAAA-MM-DD`). Las que pasaron sin hacerse no se arrastran.
export const DIA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const esRepetida = (t) => !!t?.repetir?.dias?.length;
export const diasRepetir = (t) => [1, 2, 3, 4, 5, 6, 0].filter((d) => t.repetir?.dias?.includes(d)).map((d) => DIA_CORTO[d]).join(' · ');
export function ocurrencia(t, s) {
  const ms = t.hechos?.[s];
  return { ...t, id: `${t.id}@${s}`, base: t.id, fecha: s, hecha: !!ms, hechaEn: ms || null, total: undefined, actual: undefined, hist: undefined, repetida: true };
}
export function ocurrencias(estado, desde, hasta) {
  const out = [];
  for (const t of vivos(estado.tareas)) {
    if (!esRepetida(t)) continue;
    const ini = t.desde || (t.creada ? diaStr(new Date(t.creada)) : '0000-00-00');
    for (let d = inicioDia(desde); d <= hasta; d = sumarDias(d, 1)) {
      const s = diaStr(d);
      if (s >= ini && t.repetir.dias.includes(d.getDay())) out.push(ocurrencia(t, s));
    }
  }
  return out;
}

// ───────────────────────── análisis completo ─────────────────────────
export function analizar(estadoIn, cal, ahora = new Date()) {
  const estado = asegurarEstado(estadoIn);
  const c = estado.config;
  const hoy = inicioDia(ahora), hoyS = diaStr(hoy), hoyMs = hoy.getTime();
  const lun = lunes(ahora), lunMs = lun.getTime();
  const dom = sumarDias(lun, 6), domS = diaStr(dom);
  const eventos = prepararEventos(estado, cal);
  const areas = vivos(estado.areas).sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));

  // piezas de esta semana + arrastradas (+ las de la semana que viene, aparte)
  const pron = pronostico(estado, eventos, ahora);
  // hasta qué semana hay que poder adelantar (la última que no te da por días libres / vacaciones)
  let horizonte = 1;
  pron.forEach((w, i) => { if (w.carga > w.cap + 0.05) horizonte = Math.max(horizonte, i + 1); });
  const todas = expandirPiezas(estado, ahora, horizonte);
  const futuras = todas.filter((p) => p.futura && !p.descartada);
  const piezas = todas.filter((p) => {
    if (p.descartada) return false;
    if (p.lunes.getTime() === lunMs) return true;
    if (p.lunes > lun) return false;
    return p.etapa !== 'entregado' || ultimoCambio(p) >= lunMs;
  });
  const tareas = vivos(estado.tareas).filter((t) => !esRepetida(t));
  const rutinas = vivos(estado.tareas).filter(esRepetida);
  // rutinas de esta semana: las de hoy en adelante, y las pasadas solo si se hicieron
  const ocSemana = ocurrencias(estado, lun, dom).filter((o) => o.fecha >= hoyS || o.hecha);
  const ocHoy = ocSemana.filter((o) => o.fecha === hoyS);
  const tareasSemana = [
    ...tareas.filter((t) => t.fecha && t.fecha <= domS && (!t.hecha || (t.hechaEn || 0) >= lunMs)),
    ...ocSemana,
  ];
  const cuenta = (x) => cuentaEnMetricas(estado, x.area);

  const items = [
    ...piezas.map((p) => {
      const h = p.cuota.horas || 1;
      return {
        tipo: 'pieza', ref: p, area: p.area, h,
        hecho: h * PESO[p.etapa], resta: h * (1 - PESO[p.etapa]),
        bloqueado: p.bloqueado && p.etapa !== 'entregado',
        atrasada: p.atrasada && p.etapa !== 'entregado',
        venceHoy: !p.atrasada && p.etapa !== 'entregado' && !p.bloqueado && hoyS === domS,
      };
    }),
    ...tareasSemana.map((t) => {
      const h = horasTarea(estado, t), pr = progresoTarea(t);
      return { tipo: 'tarea', ref: t, area: t.area, h, hecho: h * pr, resta: h * (1 - pr), vencida: !t.hecha && t.fecha < hoyS, venceHoy: !t.hecha && t.fecha === hoyS };
    }),
  ];

  // ventaja: trabajo ya hecho de cosas que vencen después de esta semana
  const ventajaItems = [
    ...futuras.filter((p) => PESO[p.etapa] > 0).map((p) => ({ area: p.area, h: (p.cuota.horas || 1) * PESO[p.etapa] })),
    ...tareas
      .filter((t) => t.fecha && t.fecha > domS && progresoTarea(t) > 0 && (!t.hecha || (t.hechaEn || 0) >= lunMs))
      .map((t) => ({ area: t.area, h: horasTarea(estado, t) * progresoTarea(t) })),
  ].filter(cuenta);
  const ventaja = ventajaItems.reduce((s, i) => s + i.h, 0);
  const adelantadas = futuras.filter((p) => p.etapa === 'entregado').length;

  // capacidad
  const sum = (f) => { let s = 0; for (let d = new Date(hoy); d <= dom; d = sumarDias(d, 1)) s += f(d); return s; };
  const cap8 = sum((d) => capacidadDia(estado, eventos, d, ahora, 'min'));
  const cap10 = sum((d) => capacidadDia(estado, eventos, d, ahora, 'max'));
  const capFinde = sum((d) => capacidadDia(estado, eventos, d, ahora, 'finde'));
  let capTotal = 0;
  for (let d = new Date(lun); d <= dom; d = sumarDias(d, 1)) capTotal += capacidadDia(estado, eventos, d, null, 'min');
  const transcurrido = capTotal > 0 ? Math.min(1, Math.max(0, 1 - cap8 / capTotal)) : 1;

  // las métricas de la semana solo miran las áreas que cuentan (las personales quedan afuera)
  const itemsM = items.filter(cuenta);
  const activos = itemsM.filter((i) => !i.bloqueado);
  const total = activos.reduce((s, i) => s + i.h, 0);
  const hecho = activos.reduce((s, i) => s + i.hecho, 0);
  const necesariasSemana = activos.reduce((s, i) => s + i.resta, 0);
  const bloqueadas = itemsM.filter((i) => i.bloqueado).map((i) => i.ref);
  const atrasadas = itemsM.filter((i) => i.atrasada && !i.bloqueado).map((i) => i.ref);
  const vencidas = itemsM.filter((i) => i.vencida).map((i) => i.ref);

  // lo que hay que dejar hecho antes del lunes que viene para cubrir días libres/vacaciones que vienen
  const adelantoNecesario = pron[0]?.antes || 0;
  const adelantoFalta = Math.max(0, adelantoNecesario - ventaja);
  const hayVentaja = ventaja - adelantoNecesario >= 0.05;
  const txtVentaja = hayVentaja ? ` Ya adelantaste ${fh(ventaja - adelantoNecesario)} de más para las semanas que vienen.` : '';
  const necesarias = necesariasSemana + adelantoFalta;
  const txtAdelanto = adelantoFalta > 0.05 ? ` Incluye ${fh(adelantoFalta)} para adelantar por días libres que vienen.` : '';
  const venceHoy = itemsM.filter((i) => i.venceHoy && i.resta > 0.01).map((i) => i.ref);
  let nivel, mensaje;
  if (necesarias < 0.05) {
    if (total === 0 && !hayVentaja) {
      nivel = 'libre';
      mensaje = 'No tenés nada pendiente para esta semana.';
    } else {
      nivel = hayVentaja ? 'adelantado' : 'al_dia';
      mensaje = `Terminaste todo lo de esta semana.${hayVentaja ? txtVentaja : ' Lo que hagas ahora ya es adelantar la que viene.'}`;
    }
  } else if (necesarias <= cap8) {
    nivel = hayVentaja ? 'adelantado' : 'al_dia';
    mensaje = `Te quedan ${fh(necesarias)} de trabajo para ${fh(cap8)} disponibles. Vas bien.${txtAdelanto}${txtVentaja}`;
  } else if (necesarias <= cap10) {
    nivel = 'en_riesgo';
    mensaje = `Te quedan ${fh(necesarias)} y con jornadas de ${c.horasMin} h tenés ${fh(cap8)}. Para llegar necesitás jornadas largas.${txtAdelanto}`;
  } else if (necesarias <= cap10 + capFinde) {
    nivel = 'en_riesgo';
    mensaje = `Te quedan ${fh(necesarias)} y entre semana solo te dan ${fh(cap10)}. Si no apurás, vas a tener que trabajar el finde.${txtAdelanto}`;
  } else {
    nivel = 'atrasado';
    mensaje = `Te quedan ${fh(necesarias)} y aunque trabajes el finde tenés ${fh(cap10 + capFinde)}. Conviene hablar con algún cliente o descartar algo.`;
  }
  // Atrasado = algo ya venció (o es imposible llegar). Lo que vence hoy todavía no está atrasado.
  const nVencidas = atrasadas.length + vencidas.length;
  if (nVencidas) {
    nivel = 'atrasado';
    mensaje += nVencidas > 1 ? ` Tenés ${nVencidas} cosas que ya vencieron.` : ' Tenés 1 cosa que ya venció.';
  } else if (venceHoy.length && NIVELES[nivel].orden < 2) {
    nivel = 'vence_hoy';
    mensaje = `Hoy vence${venceHoy.length > 1 ? 'n' : ''} ${venceHoy.length} cosa${venceHoy.length > 1 ? 's' : ''}. ${mensaje}`;
  }

  // por área: atrasado solo si algo venció; el ritmo se mide con las cuotas.
  const porArea = {};
  for (const a of areas) {
    const its = items.filter((i) => i.area === a.id);
    const act = its.filter((i) => !i.bloqueado);
    const t = act.reduce((s, i) => s + i.h, 0), h = act.reduce((s, i) => s + i.hecho, 0);
    const prog = t ? h / t : 1;
    const vent = ventajaItems.filter((i) => i.area === a.id).reduce((s, i) => s + i.h, 0);
    let n;
    if (its.some((i) => (i.atrasada && !i.bloqueado) || i.vencida)) n = 'atrasado';
    else if (!its.length) n = vent >= 0.05 ? 'adelantado' : 'libre';
    else if (t - h < 0.05) n = vent >= 0.05 ? 'adelantado' : 'al_dia';
    else {
      const pz = act.filter((i) => i.tipo === 'pieza');
      const tp = pz.reduce((s, i) => s + i.h, 0), hp = pz.reduce((s, i) => s + i.hecho, 0);
      const d = tp ? hp / tp - transcurrido : 0;
      n = d >= -0.1 ? (vent >= 0.05 ? 'adelantado' : 'al_dia') : 'en_riesgo';
      if (its.some((i) => i.venceHoy && i.resta > 0.01)) n = 'vence_hoy';
    }
    porArea[a.id] = {
      nivel: n, progreso: prog, total: t, hecho: h, ventaja: vent,
      bloqueadas: its.filter((i) => i.bloqueado).length,
      pendientes: act.filter((i) => i.resta > 0.01).length,
    };
  }

  const plan = planDeHoy(estado, eventos, ahora, piezas, [...tareas, ...ocHoy], futuras, adelantoFalta);
  const hechoHoy = calcularHechoHoy(estado, todas.filter(cuenta), [...tareas, ...ocHoy].filter(cuenta), hoyMs);
  const restaPlan = plan.filter((p) => !p.extra && !p.aparte).reduce((s, p) => s + p.horas, 0);
  const pctHoy = hechoHoy + restaPlan > 0 ? hechoHoy / (hechoHoy + restaPlan) : 1;

  const shows = listaShows(estado, eventos, ahora);

  return {
    ahora, hoyS, lun, dom, eventos, areas, todas, piezas, futuras, tareas, rutinas, ocSemana, ocHoy, items,
    semana: { nivel, mensaje, total, hecho, necesarias, necesariasSemana, adelantoFalta, cap8, cap10, capFinde, transcurrido, ventaja, adelantadas, pct: total ? hecho / total : 1 },
    porArea, bloqueadas, atrasadas, vencidas, venceHoy,
    plan, hechoHoy, pctHoy,
    shows,
    showHoy: shows.filter((s) => s.dia === hoyS),
    hoyEventos: eventosDelDia(eventos, hoy),
    mananaEventos: eventosDelDia(eventos, sumarDias(hoy, 1)),
    vidaHoy: eventosVidaDelDia(estado, hoy),
    vidaProxima: vivos(estado.eventosVida)
      .filter((ev) => ev.desde > hoyS && diasEntre(hoy, parseDia(ev.desde)) <= 60)
      .sort((a, b) => a.desde.localeCompare(b.desde)),
    pronostico: pron, adelantoNecesario, adelantoFalta,
  };
}

export function fh(h) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const r = Math.round(h * 2) / 2;
  return `${String(r).replace('.', ',')} h`;
}

// ───────────────────────── plan de hoy ─────────────────────────
function diasHabilesRestantes(estado, desde, hasta) {
  let n = 0;
  for (let d = inicioDia(desde); d <= hasta; d = sumarDias(d, 1)) if (esLaboral(estado, d) && factorVida(estado, d) > 0) n++;
  return n;
}

export function planDeHoy(estado, eventos, ahora, piezas, tareas, futuras = [], adelantoFalta = 0) {
  const c = estado.config;
  const hoy = inicioDia(ahora), hoyS = diaStr(hoy), hoyMs = hoy.getTime();
  const dom = sumarDias(lunes(ahora), 6), domS = diaStr(dom);
  const laboralHoy = esLaboral(estado, hoy) && factorVida(estado, hoy) > 0;
  let budget = laboralHoy
    ? capacidadDia(estado, eventos, hoy, ahora, 'min')
    : capacidadDia(estado, eventos, hoy, ahora, 'finde');
  let diasRest = diasHabilesRestantes(estado, hoy, dom);
  if (!laboralHoy) diasRest = Math.max(1, diasEntre(hoy, dom) + 1);
  diasRest = Math.max(1, diasRest);

  const plan = [];
  const usados = new Set();
  const add = (it) => {
    if (usados.has(it.ref.id)) return;
    if (!vaAlResumen(estado, it.area)) return; // área fuera del resumen: solo se ve en su pestaña
    usados.add(it.ref.id);
    if (!cuentaEnMetricas(estado, it.area)) {
      it.aparte = true; // aparece (ej. "hoy toca ejercicio") pero no usa horas de trabajo
      it.extra = !!it.extra;
    } else {
      it.extra = it.extra || (budget <= 0.01 && !it.urgente);
      if (!it.extra) budget -= it.horas;
    }
    plan.push(it);
  };
  const vivasT = tareas.filter((t) => !t.hecha);

  // 1. lo vencido o arrastrado
  for (const p of piezas.filter((p) => p.atrasada && p.etapa !== 'entregado' && !p.bloqueado).sort((a, b) => a.lunes - b.lunes))
    add({ tipo: 'pieza', ref: p, area: p.area, horas: (p.cuota.horas || 1) * (1 - PESO[p.etapa]), motivo: 'atrasada', urgente: true });
  for (const t of vivasT.filter((t) => t.fecha && t.fecha < hoyS).sort((a, b) => a.fecha.localeCompare(b.fecha)))
    add(itemTarea(estado, t, hoy, 'vencida', true));
  // 2. lo que vence hoy
  for (const t of vivasT.filter((t) => t.fecha === hoyS)) add(itemTarea(estado, t, hoy, 'hoy', true));
  // 3. contadores con fecha (cuota diaria) y tareas que vencen en 2 días
  for (const t of vivasT.filter((t) => t.fecha && t.fecha > hoyS && t.total).sort((a, b) => a.fecha.localeCompare(b.fecha)))
    add(itemTarea(estado, t, hoy, 'pronto'));
  for (const t of vivasT.filter((t) => t.fecha && t.fecha > hoyS && !t.total && diasEntre(hoy, parseDia(t.fecha)) <= 2).sort((a, b) => a.fecha.localeCompare(b.fecha)))
    add(itemTarea(estado, t, hoy, 'pronto'));
  // 4. piezas de la cuota semanal, repartidas en los días que quedan
  const porCuota = new Map();
  for (const p of piezas) {
    if (p.atrasada || p.bloqueado || p.etapa === 'entregado') continue;
    if (!porCuota.has(p.cuota.id)) porCuota.set(p.cuota.id, []);
    porCuota.get(p.cuota.id).push(p);
  }
  for (const lista of porCuota.values()) {
    lista.sort((a, b) => PESO[b.etapa] - PESO[a.etapa] || a.n - b.n);
    const enCurso = lista.filter((p) => PESO[p.etapa] >= PESO.editado);
    const hechasHoy = piezas.filter((p) => p.cuota.id === lista[0].cuota.id && p.etapa === 'entregado' && (cambioEn(p, 'entregado') || 0) >= hoyMs).length;
    const meta = Math.max(0, Math.ceil((lista.length + hechasHoy) / diasRest) - hechasHoy);
    const elegidas = new Set([...enCurso, ...lista.slice(0, meta)]);
    for (const p of lista) {
      const it = { tipo: 'pieza', ref: p, area: p.area, horas: (p.cuota.horas || 1) * (1 - PESO[p.etapa]), motivo: 'cuota' };
      if (!elegidas.has(p)) it.extra = true;
      add(it);
    }
  }
  // 5. tareas de la semana que quedan
  for (const t of vivasT.filter((t) => t.fecha && t.fecha > hoyS && t.fecha <= domS && !usados.has(t.id)).sort((a, b) => a.fecha.localeCompare(b.fecha)))
    add(itemTarea(estado, t, hoy, 'semana', false, budget <= 0.01));
  // 6. adelanto obligatorio (días libres que vienen): repartido en los días que quedan
  if (adelantoFalta > 0.05) {
    let cupo = adelantoFalta / diasRest;
    const orden = [...futuras].filter((p) => p.etapa !== 'entregado' && !p.bloqueado && cuentaEnMetricas(estado, p.area)).sort((a, b) => a.lunes - b.lunes || PESO[b.etapa] - PESO[a.etapa] || a.n - b.n);
    for (const p of orden) {
      if (cupo <= 0.05) break;
      const h = (p.cuota.horas || 1) * (1 - PESO[p.etapa]);
      add({ tipo: 'pieza', ref: p, area: p.area, horas: h, motivo: 'adelantar', urgente: false });
      cupo -= h;
    }
  }
  // 7. cuotas ya completas esta semana: sugerir adelantar una de la que viene
  for (const p of futuras) {
    if (p.etapa === 'entregado' || p.bloqueado) continue;
    const quedan = piezas.some((x) => x.cuota.id === p.cuota.id && x.etapa !== 'entregado' && !x.bloqueado);
    if (quedan || plan.some((it) => it.motivo === 'adelantar' && it.ref.cuota?.id === p.cuota.id)) continue;
    add({ tipo: 'pieza', ref: p, area: p.area, horas: (p.cuota.horas || 1) * (1 - PESO[p.etapa]), motivo: 'adelantar', extra: true });
  }
  // 8. sin fecha: sugerencias si sobra tiempo
  const sinFecha = vivasT.filter((t) => !t.fecha).sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0) || (a.creada || 0) - (b.creada || 0));
  for (const t of sinFecha.slice(0, 4)) add({ ...itemTarea(estado, t, hoy, 'libre'), extra: true });
  // ordenar: urgentes, luego por área para que no se mezcle
  return plan;
}

function itemTarea(estado, t, hoy, motivo, urgente = false, extra = false) {
  const h = horasTarea(estado, t);
  if (t.total && t.fecha) {
    const restan = Math.max(0, t.total - (t.actual || 0));
    const hoyMs = hoy.getTime();
    let ini = 0;
    for (const x of t.hist || []) if (x.t < hoyMs) ini = x.v;
    const hechosHoy = Math.max(0, (t.actual || 0) - ini);
    const dias = Math.max(1, diasHabilesRestantes(estado, hoy, parseDia(t.fecha)) || diasEntre(hoy, parseDia(t.fecha)) + 1);
    const metaHoy = Math.max(0, Math.ceil((restan + hechosHoy) / dias) - hechosHoy);
    return { tipo: 'tarea', ref: t, area: t.area, horas: (h * Math.min(metaHoy, restan)) / t.total, motivo, urgente, extra, metaHoy: Math.min(metaHoy, restan) };
  }
  return { tipo: 'tarea', ref: t, area: t.area, horas: h * (1 - progresoTarea(t)), motivo, urgente, extra };
}

function calcularHechoHoy(estado, todas, tareas, hoyMs) {
  let h = 0;
  for (const p of todas) {
    if (!p.hist.length || p.hist[p.hist.length - 1].t < hoyMs) continue;
    const d = PESO[p.etapa] - PESO[etapaAntesDe(p, hoyMs)];
    if (d > 0) h += (p.cuota.horas || 1) * d;
  }
  for (const t of tareas) {
    const d = progresoTarea(t) - progresoTareaAntesDe(t, hoyMs);
    if (d > 0 && ((t.hechaEn || 0) >= hoyMs || (t.hist || []).some((x) => x.t >= hoyMs))) h += horasTarea(estado, t) * d;
  }
  return h;
}

// ───────────────────────── shows ─────────────────────────
export function listaShows(estado, eventos, ahora) {
  const hoyS = diaStr(ahora);
  const sids = new Set(eventos.filter((e) => e.sid).map((e) => e.sid));
  const out = [];
  for (const e of eventos) {
    if (e.tipo !== 'show') continue;
    const clave = e.sid ? `m:${e.sid}` : `c:${e.id}`;
    const prep = estado.showsPrep[clave] || {};
    if (prep.borrar) continue;
    const manual = e.sid ? estado.shows.find((s) => s.id === e.sid) : null;
    if (manual?.borrado) continue;
    out.push({
      clave, origen: e.sid ? 'pagina' : 'calendario', evento: e,
      titulo: manual?.titulo || e.titulo, dia: diaStr(e.ini),
      hora: e.todoElDia ? (manual?.hora || '') : `${pad(e.ini.getHours())}:${pad(e.ini.getMinutes())}`,
      lugar: manual?.lugar || e.lugar || '', notas: manual?.notas || '', prep,
    });
  }
  for (const s of vivos(estado.shows)) {
    if (sids.has(s.id)) continue;
    const clave = `m:${s.id}`;
    out.push({ clave, origen: 'pagina', sinSync: true, titulo: s.titulo, dia: s.fecha, hora: s.hora || '', lugar: s.lugar || '', notas: s.notas || '', prep: estado.showsPrep[clave] || {} });
  }
  return out.filter((s) => s.dia >= diaStr(sumarDias(ahora, -30))).sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
}

export const PREP_BASE = ['Repasar el set', 'Promocionar el show', 'Confirmar horario y lugar'];

// ───────────────────────── pronóstico ─────────────────────────
// Semanas que vienen: carga "bruta" (todo lo que vence esa semana, hecho o no) contra horas disponibles.
// `antes` = horas que tienen que estar hechas ANTES de que empiece esa semana (por días libres, vacaciones…),
// calculado de atrás para adelante: si una semana no te da, el faltante pasa a la anterior.
export function pronostico(estado, eventos, ahora, semanas = 8) {
  const out = [];
  const base = lunes(ahora);
  const cuenta = (x) => cuentaEnMetricas(estado, x.area);
  const tareas = vivos(estado.tareas).filter((t) => t.fecha && !esRepetida(t) && cuenta(t));
  for (let k = 1; k <= semanas; k++) {
    const w = sumarDias(base, 7 * k), fin = sumarDias(w, 6);
    const ws = diaStr(w), fs = diaStr(fin);
    let carga = 0;
    for (const o of ocurrencias(estado, w, fin)) if (cuenta(o)) carga += horasTarea(estado, o);
    for (const cu of vivos(estado.cuotas)) {
      if (cu.activa === false || !cuenta(cu)) continue;
      if (cu.desde && cu.desde > fs) continue;
      if (cu.hasta && cu.hasta < ws) continue;
      if (semanaPausada(estado, w, cu.area)) continue;
      carga += cantidadEn(cu, w) * (cu.horas || 1);
    }
    for (const t of tareas) if (t.fecha >= ws && t.fecha <= fs) carga += horasTarea(estado, t);
    let cap = 0, capMax = 0;
    const vida = new Set(), libres = [];
    for (let d = new Date(w); d <= fin; d = sumarDias(d, 1)) {
      cap += capacidadDia(estado, eventos, d, null, 'min');
      capMax += capacidadDia(estado, eventos, d, null, 'max') + capacidadDia(estado, eventos, d, null, 'finde');
      for (const ev of eventosVidaDelDia(estado, d)) vida.add(ev.titulo);
      if (esLibre(estado, diaStr(d))) libres.push(diaStr(d));
    }
    out.push({ lunes: w, semana: semanaId(w), carga, cap, capMax, vida: [...vida], libres });
  }
  let antesSig = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    const w = out[i];
    w.exige = w.carga + antesSig; // lo suyo + lo que tiene que adelantar para la siguiente
    w.antes = Math.max(0, w.exige - w.cap);
    w.nivel = w.exige <= w.cap ? 'al_dia' : w.exige <= w.capMax ? 'en_riesgo' : 'atrasado';
    antesSig = w.antes;
  }
  return out;
}

// ───────────────────────── recordatorios (para Google Calendar) ─────────────────────────
export function recordatorios(estado, analisis) {
  const out = [];
  const hoy = inicioDia(analisis.ahora);
  const tope = diaStr(sumarDias(hoy, 14));
  const nombreArea = (id) => estado.areas.find((a) => a.id === id)?.nombre || '';
  for (const t of vivos(estado.tareas)) {
    if (t.hecha || !t.fecha || t.fecha < analisis.hoyS || t.fecha > tope) continue;
    out.push({ clave: `t:${t.id}`, titulo: `📌 ${t.titulo}`, fecha: t.fecha, hora: '09:00', minutos: 15, desc: `${nombreArea(t.area)} · vence hoy` });
  }
  const faltan = analisis.piezas.filter((p) => p.etapa !== 'entregado').length;
  if (faltan) {
    const dom = diaStr(analisis.dom);
    out.push({ clave: `cierre:${semanaId(analisis.lun)}`, titulo: `📦 Cierre de semana: faltan ${faltan} pieza${faltan > 1 ? 's' : ''}`, fecha: dom, hora: '10:00', minutos: 15, desc: 'Las cuotas semanales vencen hoy.' });
  }
  return out;
}

// ───────────────────────── plata ─────────────────────────
export function resumenDinero(estado, ahora = new Date()) {
  const piezas = expandirPiezas(estado, ahora);
  const meses = {};
  const mes = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const fila = (m, area) => {
    meses[m] = meses[m] || {};
    return (meses[m][area] = meses[m][area] || { ganado: 0, cobrado: 0, piezas: 0 });
  };
  for (const p of piezas) {
    if (p.etapa !== 'entregado' || p.descartada) continue;
    const t = cambioEn(p, 'entregado');
    if (!t) continue;
    const tarifa = p.monto ?? estado.dinero.tarifas[p.cuota.id];
    const f = fila(mes(t), p.area);
    f.piezas++;
    if (tarifa) f.ganado += Number(tarifa);
  }
  for (const mv of vivos(estado.dinero.movimientos)) {
    const f = fila(mv.fecha.slice(0, 7), mv.area || 'otro');
    if (mv.tipo === 'cobro') f.cobrado += Number(mv.monto) || 0;
    else f.ganado += Number(mv.monto) || 0;
  }
  return meses;
}

export function nuevoId(prefijo = 'x') {
  return `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
