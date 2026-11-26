/*
  ==========================================================
  AXOBIOT - Tamagotchi de ajolote (KAPLAY v4000)  · Versión 3
  ==========================================================
  QUÉ HACE:
    Cuidas a un ajolote virtual que vive en una pecera.
    Si no lo alimentas, no limpias su agua o no lo saludas,
    se pone triste y se puede enfermar.

  CÓMO SE JUEGA (todo pasa en la pecera):
    · "Alimentar" (tecla 1): le sueltas un bocado.
    · Click sobre el ajolote o "Saludar" (tecla 2): se pone feliz.
    · Click sobre las manchas de suciedad: limpias el agua
      (solo funciona dentro de la pecera).
    · MONEDAS: cae una moneda en la pecera cada 15 minutos.
      Si saludas al ajolote 3 veces, la siguiente cae a los 5 minutos.
      Haz click en la moneda para recogerla.
    · "Tienda" (tecla 3): compras sombreros y decoraciones.

  QUÉ APRENDEMOS:
    Escenas, componentes, tags, colisiones, clicks, temporizadores,
    tweens (animaciones), partículas, contadores y
    sprites hechos con código.
*/

// ===== 1. CONFIGURACIÓN DEL JUEGO =====
// kaplay() enciende el motor del juego.
const k = kaplay({
  // ⚡ OPTIMIZACIÓN: global: false evita llenar el navegador de variables sueltas.
  global: false,
  width: 480,          // tamaño "interno" del juego
  height: 360,
  letterbox: true,     // se adapta a cualquier pantalla sin deformarse
  crisp: true,         // pixel art nítido, sin verse borroso
  background: [24, 32, 48],

  // Una COLISIÓN es cuando dos objetos se tocan, como dos carritos chocones.
  // ⚡ OPTIMIZACIÓN: "sap" revisa los objetos de izquierda a derecha.
  // Sirve porque el ajolote nada de lado a lado y choca con las paredes laterales.
  broadPhaseCollisionAlgorithm: "sap",
  // ⚡ OPTIMIZACIÓN: "box" es el más rápido, y sirve porque
  // todas nuestras áreas son rectángulos (no hay círculos).
  narrowPhaseCollisionAlgorithm: "box",
});

// ===== 1b. DESPERTAR EL AUDIO =====
// Los navegadores no dejan sonar nada hasta que el jugador toca la pantalla,
// da click o presiona una tecla: el audio empieza "dormido" (suspended).
// KAPLAY solo lo despierta para la música en streaming (loadMusic),
// NO para los sonidos normales (loadSound), así que lo despertamos nosotros.
// ⚠️ Sin esto, en una compu o celular normal NO se escucha ningún sonido.
function despertarAudio() {
  if (k.audioCtx.state !== "running") {
    k.audioCtx.resume().catch(() => {});
  }
}
// "true" = escuchamos el evento antes que nadie. Se queda siempre activo
// por si el celular vuelve a dormir el audio (por ejemplo, al recibir una llamada).
for (const evento of ["pointerdown", "pointerup", "touchend", "keydown", "click"]) {
  window.addEventListener(evento, despertarAudio, true);
}

// ===== 2. DATOS DEL JUEGO =====
// Las necesidades del ajolote viven en un objeto simple, como una libreta.
// Así no se borran al cambiar de escena.
// ⚡ OPTIMIZACIÓN: un objeto simple es más ligero que un objeto del juego.
const necesidadesIniciales = {
  alimentado: 80,  // 100 = panza llena, 0 = muy hambriento
  animo: 80,       // 100 = muy contento, 0 = muy aburrido
  manchas: 2,      // cuántas manchas de suciedad hay en el agua
  salud: 100,
};
const datosJuego = {
  ...necesidadesIniciales,
  monedas: 0,
  comprados: [],              // ids de lo que ya compraste
  sombreroPuesto: null,       // id del sombrero que trae puesto (o null)
  decoracionesPuestas: [],    // ids de las decoraciones en la pecera
  // --- Monedas que caen en la pecera ---
  segundosMoneda: 0,          // segundos que llevamos esperando la siguiente moneda
  saludosParaMoneda: 0,       // saludos dados durante esta espera (máximo 3)
  monedasEnPecera: 0,         // monedas que cayeron y aún no recoges
  // --- Reloj ---
  segundosMancha: 0,          // segundos desde la última mancha
  ultimaVez: Date.now(),      // fecha y hora de la última vez que pusimos todo al día
  // --- Días y logros ---
  segundosVivo: 0,            // cuánto tiempo lleva vivo este ajolote
  recordDias: 1,              // el ajolote que más días ha vivido
  logros: [],                 // ids de los logros que ya ganaste
  comidasDadas: 0,            // cuántas veces ha comido (en total)
  comidasProbadas: [],        // qué tipos de comida ha probado
  saludosTotales: 0,
  monedasRecogidas: 0,
  mejorMinijuego: 0,          // récord de bocados en "Atrapa la comida"
  mejorLimpia: 0,             // récord de basura sacada en "Limpia el canal"
  mejorMemorama: 0,           // récord de "Memorama" (menos movimientos = mejor; 0 = sin récord)
  minijuegoPerfecto: false,   // ¿terminó el minijuego sin tocar basura?
  // --- Tu ajolote ---
  nombre: null,               // null = todavía no tiene nombre (se elige al empezar)
  color: "rosa",              // id de COLORES_AJOLOTE
  segundosBuenCuidado: 0,     // tiempo bien cuidado: con esto CRECE
  etapaVista: "larva",        // la última etapa que le mostramos al jugador
};

// Si el ajolote se enferma, reiniciamos sus necesidades,
// pero NO las monedas ni lo comprado (¡eso ya te lo ganaste!).
function reiniciarNecesidades() {
  Object.assign(datosJuego, necesidadesIniciales);
  datosJuego.segundosMancha = 0;
  datosJuego.segundosVivo = 0; // un ajolote nuevo empieza en el día 1
  datosJuego.segundosBuenCuidado = 0; // y empieza como larva
  datosJuego.etapaVista = "larva";
  datosJuego.nombre = null;    // al nuevo ajolote le pondrás nombre y color otra vez
  datosJuego.ultimaVez = Date.now();
  guardarPartida();
}

// ===== 2b. EL TIEMPO PASA AUNQUE NO ESTÉS =====
// Como un tamagotchi de verdad: usamos el RELOJ REAL del dispositivo.
// Las reglas están en horas reales (cámbialas para hacerlo más fácil o difícil).
const HORAS_PARA_TENER_HAMBRE = 6;     // la comida baja de 100 a 0 en 6 horas
const HORAS_PARA_ABURRIRSE = 8;        // el ánimo baja de 100 a 0 en 8 horas
const MINUTOS_ENTRE_MANCHAS = 45;      // cada 45 minutos el agua se ensucia
const MAXIMO_MANCHAS = 7;
const HORAS_PARA_ENFERMARSE = 12;      // mal cuidado, pierde toda la salud en 12 horas
const HORAS_PARA_CURARSE = 4;          // bien cuidado, recupera toda la salud en 4 horas
const MAXIMO_MONEDAS_EN_PECERA = 5;    // no se juntan más monedas sin recoger

// Tiempos de las monedas.
const MINUTOS_MONEDA_NORMAL = 15;
const MINUTOS_MONEDA_RAPIDA = 5;
const SALUDOS_PARA_ACELERAR = 3;

// Minijuego "Atrapa la comida"
const SEGUNDOS_MINIJUEGO = 30;
const VIDAS_MINIJUEGO = 3;
const PUNTOS_POR_MONEDA = 10;     // cada 10 bocados atrapados = 1 moneda
const COMIDA_PARA_JUGAR = 20;     // necesita al menos esta comida para jugar
const COMIDA_QUE_GASTA_JUGAR = 10; // jugar da hambre
const ANIMO_POR_JUGAR = 25;       // jugar lo pone contento

// Minijuego "Limpia el canal"
const SEGUNDOS_LIMPIA = 30;
const VIDAS_LIMPIA = 3;
const BASURAS_POR_MONEDA = 8;     // cada 8 basuras = 1 moneda

// Minijuego "Memorama": monedas según cuántos movimientos usaste
const PAREJAS_MEMORAMA = 6;
function monedasMemorama(movimientos) {
  if (movimientos <= 10) return 3;
  if (movimientos <= 14) return 2;
  return 1;
}

// 💡 Para PROBAR rápido, cambia VELOCIDAD_DEL_TIEMPO a 60:
// así 1 minuto real = 1 hora del juego. Antes de entregar, regrésalo a 1.
const VELOCIDAD_DEL_TIEMPO = 1;

// ¿Cuántos segundos hay que esperar para la siguiente moneda?
function segundosDeEspera() {
  const minutos = datosJuego.saludosParaMoneda >= SALUDOS_PARA_ACELERAR
    ? MINUTOS_MONEDA_RAPIDA
    : MINUTOS_MONEDA_NORMAL;
  return minutos * 60;
}

// Avanza el mundo del ajolote "segundos" hacia adelante.
// Es la MISMA regla si estás mirando o si el dispositivo estuvo apagado.
function simular(segundos) {
  const horas = segundos / 3600;
  datosJuego.segundosVivo += segundos;
  datosJuego.alimentado = Math.max(0, datosJuego.alimentado - horas * 100 / HORAS_PARA_TENER_HAMBRE);
  datosJuego.animo = Math.max(0, datosJuego.animo - horas * 100 / HORAS_PARA_ABURRIRSE);

  // El agua se ensucia poco a poco
  datosJuego.segundosMancha += segundos;
  while (datosJuego.segundosMancha >= MINUTOS_ENTRE_MANCHAS * 60) {
    datosJuego.segundosMancha -= MINUTOS_ENTRE_MANCHAS * 60;
    datosJuego.manchas = Math.min(MAXIMO_MANCHAS, datosJuego.manchas + 1);
  }

  // Caen monedas
  datosJuego.segundosMoneda += segundos;
  while (datosJuego.segundosMoneda >= segundosDeEspera()) {
    datosJuego.segundosMoneda -= segundosDeEspera();
    datosJuego.saludosParaMoneda = 0;
    datosJuego.monedasEnPecera = Math.min(MAXIMO_MONEDAS_EN_PECERA, datosJuego.monedasEnPecera + 1);
  }

  // Si está mal cuidado pierde salud; si está bien, se recupera
  const limpieza = calcularLimpieza();
  if (datosJuego.alimentado <= 0 || limpieza < 30) {
    datosJuego.salud -= horas * 100 / HORAS_PARA_ENFERMARSE;
  } else if (datosJuego.alimentado > 50 && limpieza > 60) {
    datosJuego.salud += horas * 100 / HORAS_PARA_CURARSE;
  }
  datosJuego.salud = Math.max(0, Math.min(100, datosJuego.salud));

  // CRECER: solo cuenta el tiempo en que está bien cuidado
  if (datosJuego.alimentado >= 30 && limpieza >= 55 && datosJuego.animo >= 30) {
    datosJuego.segundosBuenCuidado += segundos;
  }
}

// ===== 2c. CRECIMIENTO =====
// Los ajolotes nacen como larvas chiquitas (casi sin patas)
// y van creciendo. Aquí crece con los DÍAS BIEN CUIDADO.
const DIAS_PARA_JOVEN = 1;
const DIAS_PARA_ADULTO = 3;
// forma = qué dibujo usa; escala = qué tan grande se ve;
// sombrero y boca = dónde quedan (en píxeles del dibujo).
const ETAPAS = {
  larva:  { nombre: "Larva",  forma: "larva",  escala: 3, sombrero: [2, -2], boca: [5.5, 0.7] },
  joven:  { nombre: "Joven",  forma: "adulto", escala: 2.3, sombrero: [4, -3], boca: [7.3, 1.3] },
  adulto: { nombre: "Adulto", forma: "adulto", escala: 3,   sombrero: [4, -3], boca: [7.3, 1.3] },
};

function etapaActual() {
  const dias = datosJuego.segundosBuenCuidado / 86400;
  if (dias >= DIAS_PARA_ADULTO) return "adulto";
  if (dias >= DIAS_PARA_JOVEN) return "joven";
  return "larva";
}

// ¿Cuántas horas de buen cuidado le faltan para crecer? (null si ya es adulto)
function horasParaCrecer() {
  const etapa = etapaActual();
  if (etapa === "adulto") return null;
  const meta = (etapa === "larva" ? DIAS_PARA_JOVEN : DIAS_PARA_ADULTO) * 86400;
  return Math.ceil((meta - datosJuego.segundosBuenCuidado) / 3600);
}

// El nombre del sprite según su color y su etapa. Ej: "ajolote-dorado-larva"
function spriteAjolote(color = datosJuego.color, etapa = etapaActual()) {
  return "ajolote-" + color + "-" + ETAPAS[etapa].forma;
}

// El nombre de tu ajolote (o "Tu ajolote" si todavía no tiene)
function nombreAjolote() {
  return datosJuego.nombre || "Tu ajolote";
}

// Mira el reloj real y aplica todo el tiempo que pasó desde la última vez.
// Si el dispositivo estuvo apagado 5 horas, aquí pasan esas 5 horas de golpe.
// Devuelve cuántos segundos pasaron.
function ponerAlDia() {
  const ahora = Date.now();
  let pendientes = (ahora - datosJuego.ultimaVez) / 1000 * VELOCIDAD_DEL_TIEMPO;
  datosJuego.ultimaVez = ahora;
  if (pendientes <= 0 || datosJuego.salud <= 0) return 0; // reloj atrasado o ya enfermo
  const total = pendientes;
  // Lo hacemos en pasitos de 1 minuto, para que el orden de las cosas sea correcto
  // (por ejemplo: primero se acaba la comida, DESPUÉS empieza a perder salud).
  while (pendientes > 0 && datosJuego.salud > 0) {
    const paso = Math.min(60, pendientes);
    simular(paso);
    pendientes -= paso;
  }
  return total;
}

// --- Guardar y cargar la partida ---
// localStorage es una "cajita" del navegador que NO se borra al cerrar el juego
// ni al apagar el dispositivo. Guardamos datosJuego como texto (JSON).
const CLAVE_GUARDADO = "axobiot-partida";

function guardarPartida() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datosJuego));
  } catch (error) {
    // Si el navegador no deja guardar, el juego sigue funcionando igual
  }
}

function cargarPartida() {
  try {
    const texto = localStorage.getItem(CLAVE_GUARDADO);
    if (!texto) return;
    const guardado = JSON.parse(texto);
    // Partidas de antes de que existiera el crecimiento:
    // contamos todo su tiempo de vida para que no vuelva a ser larva.
    if (!("segundosBuenCuidado" in guardado)) {
      guardado.segundosBuenCuidado = guardado.segundosVivo || 0;
      guardado.etapaVista = null; // se calcula abajo
    }
    Object.assign(datosJuego, guardado);
    if (!datosJuego.etapaVista) datosJuego.etapaVista = etapaActual();
  } catch (error) {
    // Partida dañada o sin permiso: empezamos de nuevo
  }
}

// ¿En qué día de vida va el ajolote? (empieza en el día 1)
function diasVivo() {
  return Math.floor(datosJuego.segundosVivo / 86400) + 1;
}

// Convierte segundos en texto: 12000 → "3 h 20 min"
function formatoAusencia(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return (horas > 0 ? horas + " h " : "") + minutos + " min";
}

// Al abrir el juego: cargamos y aplicamos el tiempo que estuvimos fuera
cargarPartida();
const segundosFuera = ponerAlDia();
guardarPartida();

// Cada segundo ponemos todo al día y guardamos, en cualquier escena.
// setInterval es un reloj del navegador, independiente de KAPLAY.
setInterval(() => {
  ponerAlDia();
  revisarLogros();
  guardarPartida();
}, 1000);
// Si apagan la pantalla o cierran el juego, guardamos justo antes
document.addEventListener("visibilitychange", guardarPartida);
window.addEventListener("pagehide", guardarPartida);

// Convierte segundos en texto de reloj: 125 → "2:05"
function formatoReloj(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return minutos + ":" + (resto < 10 ? "0" : "") + resto;
}

// La limpieza depende de cuántas manchas hay
function calcularLimpieza() {
  return Math.max(0, 100 - datosJuego.manchas * 15);
}

// Medidas de la pecera
const PECERA = { izq: 20, der: 460, arriba: 64, abajo: 300 };
const ARENA_Y = 280;

// Revisa si un punto (como el mouse) está dentro de la pecera
function estaEnPecera(punto) {
  return punto.x > PECERA.izq && punto.x < PECERA.der &&
         punto.y > PECERA.arriba && punto.y < PECERA.abajo;
}

// ===== 3. CATÁLOGO DE LA TIENDA =====
// Cada artículo es una "ficha" con sus datos.
// Para agregar uno nuevo: dibuja su sprite (sección 4) y agrega su ficha aquí.
const ARTICULOS = [
  { id: "fiesta",   nombre: "Gorro fiesta", tipo: "sombrero",   precio: 2 },
  { id: "copa",     nombre: "Sombrero copa", tipo: "sombrero",  precio: 3 },
  { id: "corona",   nombre: "Corona",       tipo: "sombrero",   precio: 5 },
  { id: "tronco",   nombre: "Tronco",       tipo: "decoracion", precio: 2, x: 300 },
  { id: "cofre",    nombre: "Cofre",        tipo: "decoracion", precio: 3, x: 400 },
  { id: "castillo", nombre: "Castillo",     tipo: "decoracion", precio: 5, x: 105 },
];

// ===== 4. SPRITES HECHOS CON CÓDIGO =====
// Cada letra es un píxel de color, como un dibujo en papel cuadriculado.
// El punto "." es transparente. Puedes editar las letras para cambiar el dibujo.
const PALETA = {
  P: "#ffadc6", // rosa (cuerpo)
  L: "#ffd6e2", // rosa clarito (panza)
  R: "#e0507f", // rosa fuerte (branquias y mejillas)
  K: "#2b1d2b", // negro (ojos, boca, puerta)
  W: "#ffffff", // blanco (brillos)
  A: "#7fd4ff", // azul claro (lágrima, gema)
  Z: "#e5383b", // rojo (gusano de sangre, gema, bandera)
  Y: "#ffe66d", // amarillo
  G: "#52b788", // verde (hojas)
  M: "#7f4f24", // café oscuro
  C: "#d4a373", // café claro
  I: "#e9c46a", // madera clarita
  D: "#5a6b3a", // verde sucio (mancha)
  E: "#8a9a5b", // verde sucio claro
  H: "#ff5c8a", // corazón
  O: "#ffd23f", // oro
  Q: "#e09f1f", // oro oscuro
  S: "#b8c0c8", // gris metal
  T: "#d62828", // rojo (banda del sombrero)
  B: "#4cc9f0", // azul gorro
  N: "#222222", // negro sombrero
  X: "#8d99ae", // piedra
  J: "#5c677d", // piedra oscura
  F: "#d98b8b", // lombriz
  U: "#a0525a", // anillos de la lombriz
  V: "#ff9a5c", // artemia (camarón pequeñito)
};

// Convierte el dibujo de letras en una imagen.
// "cuadros" es una lista de dibujos; se ponen uno junto a otro
// para hacer una animación (como las hojas de un folioscopio).
// "paleta" permite pintar el MISMO dibujo con otros colores
// (así hacemos los ajolotes de colores sin dibujarlos otra vez).
function crearImagenPixel(cuadros, paleta = PALETA) {
  const alto = cuadros[0].length;
  const ancho = Math.max(...cuadros[0].map((fila) => fila.length));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * cuadros.length;
  lienzo.height = alto;
  const pincel = lienzo.getContext("2d");

  cuadros.forEach((cuadro, numero) => {
    cuadro.forEach((fila, y) => {
      for (let x = 0; x < fila.length; x++) {
        const color = paleta[fila[x]];
        if (color) {
          pincel.fillStyle = color;
          pincel.fillRect(numero * ancho + x, y, 1, 1);
        }
      }
    });
  });
  return lienzo.toDataURL();
}

// --- Ajolote: 4 cuadros (nadar 1, nadar 2, feliz, triste) ---
const ajoloteNadar1 = [
  "...........R.R.R....",
  "............RRR.....",
  "..........PPPPPPPP..",
  ".........PPPPPPPPPP.",
  ".........PPPPPPKWPP.",
  "PP.......PPPPPPKKPPP",
  "PPP.PPPPPPPPPPPPPPPP",
  ".PPPPPPPPPPPPPPPPKKP",
  "..PPLLLLLLLLPPPPPPP.",
  "...PPPPPPPPPPPPPPPP.",
  "....PP..PP..RRR.....",
  "....P...P..R.R.R....",
];
const ajoloteNadar2 = [
  "...........R.R.R....",
  "............RRR.....",
  "..........PPPPPPPP..",
  ".........PPPPPPPPPP.",
  ".........PPPPPPKWPP.",
  ".........PPPPPPKKPPP",
  ".PP.PPPPPPPPPPPPPPPP",
  "PPPPPPPPPPPPPPPPPKKP",
  "PP.PLLLLLLLLPPPPPPP.",
  "...PPPPPPPPPPPPPPPP.",
  ".....PP..PP.RRR.....",
  ".....P...P.R.R.R....",
];
const ajoloteFeliz = [
  "...........R.R.R....",
  "............RRR.....",
  "..........PPPPPPPP..",
  ".........PPPPPPPPPP.",
  ".........PPPPPPKPPP.",
  "PP.......PPPPPKPKPPP",
  "PPP.PPPPPPPPPRRPPPPP",
  ".PPPPPPPPPPPPPPPKKKP",
  "..PPLLLLLLLLPPPPPPP.",
  "...PPPPPPPPPPPPPPPP.",
  "....PP..PP..RRR.....",
  "....P...P..R.R.R....",
];
const ajoloteTriste = [
  "...........R.R.R....",
  "............RRR.....",
  "..........PPPPPPPP..",
  ".........PPPPPPPPPP.",
  ".........PPPPPPKWPP.",
  "PP.......PPPPPPKKPPP",
  "PPP.PPPPPPPPPPPAPPPP",
  ".PPPPPPPPPPPPPPPPPKP",
  "..PPLLLLLLLLPPPPPKP.",
  "...PPPPPPPPPPPPPPPP.",
  "....PP..PP..RRR.....",
  "....P...P..R.R.R....",
];

// --- Comida ---
// Los ajolotes son CARNÍVOROS: no comen fruta.
// Se tragan entera su comida porque sus dientes no sirven para masticar.
// Lombriz de tierra: la mejor comida para un ajolote.
const dibujoLombriz = [
  "..FFUF.......",
  ".FFFFFF......",
  "FF....FF...FF",
  "F......FUFFFF",
  "........FFF..",
];
// Gusano de sangre: una larva roja de mosquito.
const dibujoGusanoSangre = [
  "ZZ...........",
  ".TZZ.....ZZ..",
  "...ZZT.TZZ.ZZ",
  ".....ZZZ.....",
];
// Artemia: un camarón chiquitito de agua salada.
const dibujoArtemia = [
  "....VV...",
  "K.VVVVV..",
  ".VVVWVVVV",
  "..VVVVV.V",
  "...V.V.V.",
];

// --- Suciedad ---
const dibujoMancha = [
  "..DDD...",
  ".DEEDD..",
  "DDEDDDD.",
  "DDDDDEDD",
  ".DDEDDDD",
  "..DDDDD.",
  "...DD...",
];

// --- Corazón y moneda ---
const dibujoCorazon = [
  ".HH.HH.",
  "HHHHHHH",
  "HHHHHHH",
  ".HHHHH.",
  "..HHH..",
  "...H...",
];
const dibujoMoneda = [
  "..QQQQ..",
  ".QOOOOQ.",
  "QOWOOOOQ",
  "QOWOQOOQ",
  "QOOOQOOQ",
  "QOOOOOOQ",
  ".QOOOOQ.",
  "..QQQQ..",
];

// --- Sombreros ---
const dibujoFiesta = [
  "...H...",
  "..HHH..",
  "...B...",
  "..BYB..",
  "..BBB..",
  ".BYBBB.",
  ".BBBYB.",
  "BYBBBBB",
  "BBBBBYB",
];
const dibujoCopa = [
  "..NNNNNN..",
  "..NNNNNN..",
  "..NNNNNN..",
  "..NNNNNN..",
  "..TTTTTT..",
  "NNNNNNNNNN",
];
const dibujoCorona = [
  "O...O...O",
  "OO.OOO.OO",
  "OOOOOOOOO",
  "OZOOAOOZO",
  "OOOOOOOOO",
  "QQQQQQQQQ",
];

// --- Basura (para el minijuego) ---
// En Xochimilco, donde viven los ajolotes, la basura en el agua
// es uno de sus peores enemigos.
const dibujoBasura = [
  ".S...S.",
  ".S...S.",
  "SSSSSSS",
  "SWSSSSS",
  "SWSSSJS",
  "SSSSJSS",
  "SSSSSSS",
  ".SSSSS.",
];

// --- Migajas (partículas al comer) ---
// Es blanca para poder pintarla del color de cada comida.
const dibujoMiga = [
  "WW",
  "WW",
];

// --- Trofeo (logros) ---
const dibujoTrofeo = [
  "OOOOOOOOO",
  "QOOWOOOOQ",
  "Q.OWOOO.Q",
  ".QOOOOOQ.",
  "...OOO...",
  "....O....",
  "...OOO...",
  "..QQQQQ..",
];

// --- Decoraciones de la pecera ---
const dibujoTronco = [
  "......G.........",
  ".MMMMMMMMMMMMMM.",
  "MIIMCCCCCCCCCCCM",
  "MIMICCMCCCCMCCCM",
  "MIIMCCCCCCCCCCCM",
  ".MMMMMMMMMMMMMM.",
];
const dibujoCofre = [
  ".MMMMMMMM.",
  "MCCCCCCCCM",
  "MCCCCCCCCM",
  "MMMMOOMMMM",
  "MCCCOOCCCM",
  "MCCCCCCCCM",
  "MMMMMMMMMM",
];
const dibujoCastillo = [
  "X.X...Z...X.X",
  "XXX...J...XXX",
  "XJX.X.X.X.XJX",
  "XXXXXXXXXXXXX",
  "XJXXXXXXXXXJX",
  "XXXXXKKKXXXXX",
  "XXXXKKKKKXXXX",
  "XJXXKKKKKXXJX",
  "XXXXKKKKKXXXX",
];

// --- Larva: 4 cuadros (nadar 1, nadar 2, feliz, triste) ---
// Las larvas de ajolote son chiquitas, de cabeza grande
// y al principio solo tienen las patas de adelante.
const larvaNadar1 = [
  "........R.R...",
  "......PPPPPP..",
  ".....PPPPPKWP.",
  "PP..PPPPPPKKPP",
  ".PPPPPPPPPPPKP",
  "..PPLLLLLPPPP.",
  "........P.....",
  "........P.....",
];
const larvaNadar2 = [
  "........R.R...",
  "......PPPPPP..",
  ".....PPPPPKWP.",
  "....PPPPPPKKPP",
  "PPPPPPPPPPPPKP",
  "P.PPLLLLLPPPP.",
  ".........P....",
  ".........P....",
];
const larvaFeliz = [
  "........R.R...",
  "......PPPPPP..",
  ".....PPPPPKPP.",
  "PP..PPPPPKPKPP",
  ".PPPPPPPPRPPPP",
  "..PPLLLLLPPKK.",
  "........P.....",
  "........P.....",
];
const larvaTriste = [
  "........R.R...",
  "......PPPPPP..",
  ".....PPPPPKWP.",
  "PP..PPPPPPKKPP",
  ".PPPPPPPPPAPPP",
  "..PPLLLLLPPPK.",
  "........P.....",
  "........P.....",
];

// --- Colores de ajolote (¡existen de verdad!) ---
// Cada color solo cambia algunas letras de la PALETA.
const COLORES_AJOLOTE = [
  { id: "rosa", nombre: "Leucístico", dato: "Rosado con ojos oscuros", paleta: {} },
  { id: "salvaje", nombre: "Salvaje", dato: "Café verdoso, como en Xochimilco",
    paleta: { P: "#6b7a45", L: "#8d9a62", R: "#4b5a30", W: "#e6d36a" } },
  { id: "dorado", nombre: "Dorado", dato: "Albino dorado: amarillo y ojos claros",
    paleta: { P: "#f2c14e", L: "#fbe3a0", R: "#f08a5d", K: "#c0605a", W: "#ffffff" } },
  { id: "melanoide", nombre: "Melanoide", dato: "Casi negro y sin brillos",
    paleta: { P: "#3a3440", L: "#4f4858", R: "#5a4a66", K: "#111014", W: "#3a3440" } },
];

// ===== 5. CARGAR LOS SPRITES =====
// sliceX: 4 = la imagen tiene 4 cuadros, uno junto a otro.
k.loadSprite("ajolote",
  crearImagenPixel([ajoloteNadar1, ajoloteNadar2, ajoloteFeliz, ajoloteTriste]),
  {
    sliceX: 4,
    anims: {
      nadar: { from: 0, to: 1, loop: true, speed: 3 },
      feliz: 2,
      triste: 3,
    },
  },
);
// Un sprite por cada color y forma: "ajolote-rosa-larva", "ajolote-dorado-adulto", ...
const FORMAS_AJOLOTE = {
  larva: [larvaNadar1, larvaNadar2, larvaFeliz, larvaTriste],
  adulto: [ajoloteNadar1, ajoloteNadar2, ajoloteFeliz, ajoloteTriste],
};
for (const color of COLORES_AJOLOTE) {
  for (const forma in FORMAS_AJOLOTE) {
    k.loadSprite("ajolote-" + color.id + "-" + forma,
      crearImagenPixel(FORMAS_AJOLOTE[forma], { ...PALETA, ...color.paleta }),
      {
        sliceX: 4,
        anims: {
          nadar: { from: 0, to: 1, loop: true, speed: 3 },
          feliz: 2,
          triste: 3,
        },
      },
    );
  }
}
const dibujosSimples = {
  lombriz: dibujoLombriz, gusanoSangre: dibujoGusanoSangre, artemia: dibujoArtemia,
  mancha: dibujoMancha, basura: dibujoBasura, miga: dibujoMiga, trofeo: dibujoTrofeo,
  corazon: dibujoCorazon, moneda: dibujoMoneda,
  fiesta: dibujoFiesta, copa: dibujoCopa, corona: dibujoCorona,
  tronco: dibujoTronco, cofre: dibujoCofre, castillo: dibujoCastillo,
};
for (const nombre in dibujosSimples) {
  k.loadSprite(nombre, crearImagenPixel([dibujosSimples[nombre]]));
}

// ===== 5b. SONIDOS =====
// Los audios van DENTRO de este archivo (al final, en sonidoComerDatos()
// y sonidoClickDatos()), así funcionan igual en KAPLAYGROUND, en la compu
// y en el celular, sin tener que subir archivos aparte.
//
// Los decodificamos nosotros con try/catch: si el navegador no puede
// leer un audio, el juego sigue funcionando, solo que sin ese sonido.
// (Si se lo diéramos directo a loadSound y fallara, se detendría TODO el juego.)
//
// 💡 Para agregar un sonido nuevo:
//    1. Pon su audio al final, en una función como sonidoClickDatos().
//    2. Cárgalo aquí abajo:  cargarSonido("nombre", tuFuncionDatos());
//    3. Tócalo donde quieras: sonar("nombre");
const sonidosListos = {};
let avisoAusenciaMostrado = false; // el "Estuviste fuera..." sale solo una vez

// "datos" puede ser el audio incrustado (data:...) o la ruta de un archivo.
// Con recortar: true se quitan los silencios de las orillas
// (el mp3 los agrega, y en un loop se oiría un huequito).
async function cargarSonido(nombre, datos, { recortar = false } = {}) {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    const contexto = new Contexto();
    const respuesta = await fetch(datos);
    const bytes = await respuesta.arrayBuffer();
    let audio = await contexto.decodeAudioData(bytes);
    if (recortar) audio = quitarSilencioOrillas(audio);
    contexto.close();
    k.loadSound(nombre, audio); // ya decodificado: no puede fallar
    sonidosListos[nombre] = true;
  } catch (error) {
    console.warn("No se pudo cargar el sonido '" + nombre + "'. El juego sigue sin él.", error);
  }
}

// Toca un sonido SOLO si se pudo cargar (si no, no pasa nada)
function sonar(nombre, opciones) {
  if (sonidosListos[nombre]) k.play(nombre, opciones);
}

// El click: cada vez suena un poquito más agudo o más grave (detune),
// así no se siente repetitivo.
function sonarClick() {
  sonar("click", { volume: 0.6, detune: k.rand(-150, 150) });
}

cargarSonido("comer", sonidoComerDatos()); // 1.5 s, 7 mordidas
cargarSonido("click", sonidoClickDatos()); // "pop" de burbuja para botones

// Quita el silencio del principio y del final de un audio ya decodificado
function quitarSilencioOrillas(audio) {
  const muestras = audio.getChannelData(0);
  const casiNada = 0.0005;
  let inicio = 0;
  let fin = muestras.length - 1;
  while (inicio < fin && Math.abs(muestras[inicio]) < casiNada) inicio++;
  while (fin > inicio && Math.abs(muestras[fin]) < casiNada) fin--;
  const largo = fin - inicio + 1;
  const nuevo = new AudioBuffer({ length: largo, numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate });
  for (let canal = 0; canal < audio.numberOfChannels; canal++) {
    nuevo.copyToChannel(audio.getChannelData(canal).subarray(inicio, fin + 1), canal);
  }
  return nuevo;
}

// ===== 5c. MÚSICA DE LOS MINIJUEGOS =====
// Empieza al entrar al menú de minijuegos, sigue sonando (en loop) mientras
// juegas y cambias de minijuego, y se detiene al volver a la pecera.
//
// La canción pesa mucho para ir dentro de este archivo, así que se busca:
//   1. En la función temaMinijuegosDatos() del archivo musica.js
//      (para KAPLAYGROUND: pégalo en un archivo aparte, es opcional).
//   2. Si no está, en el archivo sonidos/tema-minijuegos.mp3 (versión del celular).
// Si no encuentra ninguna, el juego funciona igual, sin música.
const VOLUMEN_MUSICA = 0.45;
let musicaMinijuegos = null;   // la canción sonando (o null)
let quiereMusica = false;      // ¿estamos en los minijuegos?
let musicaCargando = false;

async function cargarMusicaMinijuegos() {
  if (musicaCargando) return; // solo se carga una vez
  musicaCargando = true;
  // globalThis = "lo que es visible desde todos los archivos"
  const datos = typeof globalThis.temaMinijuegosDatos === "function"
    ? globalThis.temaMinijuegosDatos()
    : "sonidos/tema-minijuegos.mp3";
  await cargarSonido("temaMinijuegos", datos, { recortar: true });
  // Si ya entraste a los minijuegos mientras cargaba, que empiece
  if (quiereMusica) empezarMusicaMinijuegos();
}

function empezarMusicaMinijuegos() {
  quiereMusica = true;
  if (!sonidosListos.temaMinijuegos) {
    cargarMusicaMinijuegos();
    return;
  }
  if (musicaMinijuegos) return; // ya está sonando: que siga, no la reiniciamos
  musicaMinijuegos = k.play("temaMinijuegos", { loop: true, volume: VOLUMEN_MUSICA });
}

function detenerMusicaMinijuegos() {
  quiereMusica = false;
  if (musicaMinijuegos) {
    musicaMinijuegos.stop();
    musicaMinijuegos = null;
  }
}
// En qué segundo suena cada mordida y qué tan fuerte (0 a 1).
// Los medimos del audio: así la animación va al RITMO del sonido.
const MORDIDAS = [
  { tiempo: 0.13, fuerza: 0.75 },
  { tiempo: 0.33, fuerza: 0.77 },
  { tiempo: 0.50, fuerza: 0.52 },
  { tiempo: 0.73, fuerza: 0.38 },
  { tiempo: 0.93, fuerza: 0.37 },
  { tiempo: 1.12, fuerza: 0.53 },
  { tiempo: 1.34, fuerza: 0.80 },
];
const DURACION_COMER = 1.5; // lo mismo que dura el audio

// Colores y tamaños que usamos seguido (se crean una sola vez)
// ⚡ OPTIMIZACIÓN: crear colores y vectores una vez y reutilizarlos
// evita trabajo extra en cada fotograma.
const COLOR_TEXTO = k.rgb(255, 255, 255);
const COLOR_TEXTO_OSCURO = k.rgb(60, 40, 20);
const COLOR_DORADO = k.rgb(255, 210, 63);
const ESCALA_2 = k.vec2(2, 2);
const ESCALA_3 = k.vec2(3, 3);

// ===== 6. FUNCIONES FÁBRICA =====
// Una función fábrica es como un molde de galletas:
// cada vez que la usas, te da las piezas para un objeto nuevo.

// Un componente es como una pieza de LEGO: le da una habilidad al objeto.
// Un tag (como "mancha") es una etiqueta con nombre, como la de una mochila.
const crearMancha = (x, y) => [
  k.sprite("mancha"),
  k.pos(x, y),
  k.anchor("center"),
  k.scale(3),
  k.area(),         // área = la "zona que se puede tocar" (para el click)
  k.opacity(0.85),
  "mancha",
];

// Las comidas que le podemos dar (la que cae se elige al azar)
// "colores" son los colores de sus migajas (los mismos del dibujo).
const COMIDAS = [
  { sprite: "lombriz", nombre: "una lombriz", colores: [PALETA.F, PALETA.U] },
  { sprite: "gusanoSangre", nombre: "un gusano de sangre", colores: [PALETA.Z, PALETA.T] },
  { sprite: "artemia", nombre: "una artemia", colores: [PALETA.V, PALETA.V] },
];

const crearBocado = (x, comida) => [
  k.sprite(comida.sprite),
  k.pos(x, PECERA.arriba + 10),
  k.anchor("center"),
  k.scale(2.5),
  // isSensor: true = "avísame cuando toque algo".
  // En v4000, sin esto (o sin body()) NO se detectan colisiones.
  k.area({ isSensor: true }),
  k.z(5),           // enfrente del ajolote: se ve cómo se la mete a la boca
  "bocado",
  {
    nombre: comida.nombre,   // para decir qué se comió
    tipo: comida.sprite,     // para el logro "Dieta variada"
    colores: comida.colores.map((hex) => k.rgb(hex)), // para las migajas
    comiendo: false,         // ¿ya se la está comiendo?
  },
];

// Pared invisible: el ajolote "rebota" al tocarla
const crearPared = (x, lado) => [
  k.rect(10, PECERA.abajo - PECERA.arriba),
  k.pos(x, PECERA.arriba),
  k.area({ isSensor: true }),
  k.opacity(0),     // invisible
  "pared",
  { lado },         // guardamos si es la pared "izquierda" o "derecha"
];

// Moneda que cae en la pecera. Se recoge con un click.
const crearMoneda = (x, y) => [
  k.sprite("moneda"),
  k.pos(x, y),
  k.anchor("center"),
  k.scale(2.5),
  k.area(),         // para poder darle click
  k.z(10),
  "moneda",
];

// Texto que sube y se desvanece (por ejemplo "+1 moneda")
const crearTextoFlotante = (texto, x, y, color) => [
  k.text(texto, { size: 16 }),
  k.pos(x, y),
  k.anchor("center"),
  k.color(color),
  k.opacity(1),
  k.move(k.UP, 40),             // sube solito
  k.lifespan(0.8, { fade: 0.4 }), // vive 0.8 s y luego se desvanece
  k.z(100),
];

// Botón con texto. Funciona con click o con el dedo en pantalla táctil.
function crearBoton(texto, x, y, ancho, accion) {
  const boton = k.add([
    k.rect(ancho, 32, { radius: 8 }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(255, 200, 80),
    k.outline(3, k.rgb(120, 70, 20)),
    k.area(),
  ]);
  // El texto es "hijo" del botón: se mueve junto con él.
  boton.add([
    k.text(texto, { size: 14 }),
    k.anchor("center"),
    k.color(COLOR_TEXTO_OSCURO),
  ]);
  boton.onClick(() => {
    sonarClick();
    accion();
  });
  return boton;
}

// ===== 6b. LOGROS =====
// Cada logro es una "ficha" con una pregunta: cumple() dice si ya lo ganaste.
// Para agregar uno nuevo, solo agrega otra ficha a la lista.
// Cada logro te regala 1 moneda.
const LOGROS = [
  { id: "primeraComida", nombre: "¡Ñam!", descripcion: "Dale de comer por primera vez",
    cumple: () => datosJuego.comidasDadas >= 1 },
  { id: "dietaVariada", nombre: "Dieta variada", descripcion: "Que pruebe las 3 comidas",
    cumple: () => datosJuego.comidasProbadas.length >= COMIDAS.length },
  { id: "buenDiente", nombre: "Buen diente", descripcion: "Dale de comer 25 veces",
    cumple: () => datosJuego.comidasDadas >= 25 },
  { id: "aguaCristalina", nombre: "Agua cristalina", descripcion: "Deja la pecera sin manchas",
    cumple: () => datosJuego.manchas === 0 },
  { id: "amigos", nombre: "Mejores amigos", descripcion: "Salúdalo 20 veces",
    cumple: () => datosJuego.saludosTotales >= 20 },
  { id: "primeraMoneda", nombre: "Ahorrador", descripcion: "Recoge una moneda de la pecera",
    cumple: () => datosJuego.monedasRecogidas >= 1 },
  { id: "elegante", nombre: "¡Qué elegante!", descripcion: "Ponle un sombrero",
    cumple: () => datosJuego.sombreroPuesto !== null },
  { id: "decorador", nombre: "Decorador", descripcion: "Pon 3 decoraciones",
    cumple: () => datosJuego.decoracionesPuestas.length >= 3 },
  { id: "cazador", nombre: "Cazador", descripcion: "20 bocados en Atrapa la comida",
    cumple: () => datosJuego.mejorMinijuego >= 20 },
  { id: "ceroBasura", nombre: "Cero basura", descripcion: "Minijuego sin tocar basura",
    cumple: () => datosJuego.minijuegoPerfecto },
  { id: "guardian", nombre: "Guardián del canal", descripcion: "Saca 25 basuras en Limpia el canal",
    cumple: () => datosJuego.mejorLimpia >= 25 },
  { id: "memoria", nombre: "Buena memoria", descripcion: "Memorama en 10 movimientos o menos",
    cumple: () => datosJuego.mejorMemorama > 0 && datosJuego.mejorMemorama <= 10 },
  { id: "joven", nombre: "¡Está creciendo!", descripcion: "Que llegue a joven",
    cumple: () => etapaActual() !== "larva" },
  { id: "adulto", nombre: "¡Ya es adulto!", descripcion: "Que llegue a adulto",
    cumple: () => etapaActual() === "adulto" },
  { id: "dia3", nombre: "3 días juntos", descripcion: "Cuídalo hasta el día 3",
    cumple: () => diasVivo() >= 3 },
  { id: "dia7", nombre: "Una semana", descripcion: "Cuídalo hasta el día 7",
    cumple: () => diasVivo() >= 7 },
  { id: "dia30", nombre: "Un mes", descripcion: "Cuídalo hasta el día 30",
    cumple: () => diasVivo() >= 30 },
];

// Revisa todos los logros y gana los que ya se cumplieron
function revisarLogros() {
  datosJuego.recordDias = Math.max(datosJuego.recordDias, diasVivo());
  if (datosJuego.salud <= 0) return; // no se ganan logros con el ajolote enfermo
  for (const logro of LOGROS) {
    if (!datosJuego.logros.includes(logro.id) && logro.cumple()) {
      datosJuego.logros.push(logro.id);
      datosJuego.monedas++;
      guardarPartida();
      mostrarAvisoLogro(logro);
    }
  }
}

// Letrero que baja desde arriba: "🏆 ¡Logro! ..."
// Si salen varios juntos, se acomodan uno debajo del otro.
function mostrarAvisoLogro(logro) {
  const lugar = k.get("avisoLogro").length;
  const aviso = k.add([
    k.rect(300, 42, { radius: 8 }),
    k.pos(240, -30),
    k.anchor("center"),
    k.color(60, 45, 20),
    k.outline(3, COLOR_DORADO),
    k.opacity(1),
    k.lifespan(3, { fade: 0.5 }),
    k.timer(),
    "avisoLogro",
  ]);
  aviso.add([k.sprite("trofeo"), k.pos(-128, 0), k.anchor("center"), k.scale(3), k.opacity(1)]);
  aviso.add([k.text("¡Logro! " + logro.nombre, { size: 14 }), k.pos(-105, -9), k.anchor("left"), k.color(COLOR_DORADO), k.opacity(1)]);
  aviso.add([k.text(logro.descripcion + "  +1 moneda", { size: 10 }), k.pos(-105, 9), k.anchor("left"), k.opacity(1)]);
  // Los hijos no se desvanecen solos: copian la transparencia del letrero
  aviso.onUpdate(() => {
    for (const hijo of aviso.children) hijo.opacity = aviso.opacity;
  });
  // Baja con un rebote
  aviso.tween(-30, 95 + lugar * 48, 0.5, (y) => { aviso.pos = k.vec2(240, y); }, k.easings.easeOutBack);
}

// ===== 7. ESCENA DE INICIO =====
// Una escena es como un cuarto de una casa:
// cada cuarto tiene sus propias cosas.
k.scene("inicio", () => {
  detenerMusicaMinijuegos();
  k.add([k.text("AXOBIOT", { size: 48 }), k.pos(240, 80), k.anchor("center"), k.color(255, 173, 198)]);
  // Si ya tienes ajolote, sale TU ajolote; si no, uno rosa
  const tieneAjolote = datosJuego.nombre && datosJuego.salud > 0;
  const etapa = ETAPAS[etapaActual()];
  k.add([
    k.sprite(tieneAjolote ? spriteAjolote() : "ajolote", { anim: "nadar" }),
    k.pos(240, 180),
    k.anchor("center"),
    k.scale(tieneAjolote ? etapa.escala * 1.7 : 5),
  ]);
  if (tieneAjolote) {
    k.add([k.text(datosJuego.nombre + " te está esperando", { size: 16 }), k.pos(240, 245), k.anchor("center"), k.color(COLOR_DORADO)]);
  }
  k.add([k.text("Toca o presiona ESPACIO para empezar", { size: 18 }), k.pos(240, 290), k.anchor("center")]);

  function empezar() {
    // Si se enfermó mientras no estabas, vamos directo a la despedida
    if (datosJuego.salud <= 0) k.go("despedida");
    // Si todavía no tiene nombre, primero lo conoces
    else if (!datosJuego.nombre) k.go("nuevoAjolote");
    else k.go("acuario");
  }
  k.onKeyPress("space", empezar);
  k.onMousePress(empezar);
});

// ===== 7b. ESCENA: TU NUEVO AJOLOTE (nombre y color) =====
// Ponerle nombre y elegir su color hace que se sienta TUYO.
// Para escribir usamos una caja de texto del navegador (<input>) escondida:
// así en el celular sale el teclado de la pantalla.
// Convierte un toque del navegador a coordenadas del juego (480 x 360).
// Con letterbox el juego se agranda y se centra dentro del canvas.
function puntoDelJuego(evento) {
  const cuadro = k.canvas.getBoundingClientRect();
  const escala = Math.min(cuadro.width / k.width(), cuadro.height / k.height());
  const sobraX = (cuadro.width - k.width() * escala) / 2;
  const sobraY = (cuadro.height - k.height() * escala) / 2;
  return k.vec2(
    (evento.clientX - cuadro.left - sobraX) / escala,
    (evento.clientY - cuadro.top - sobraY) / escala,
  );
}

const NOMBRES_AL_AZAR = ["Atl", "Xochi", "Axo", "Tlali", "Mochi", "Nube", "Kiki", "Lolo", "Chimal", "Rosita", "Pancho", "Meztli"];

k.scene("nuevoAjolote", () => {
  let colorElegido = datosJuego.color;
  let nombre = "";

  k.add([k.text("¡Conoce a tu ajolote!", { size: 24 }), k.pos(240, 22), k.anchor("center"), k.color(COLOR_DORADO)]);

  // Vista previa: una larva (todos empiezan así) del color elegido
  const vista = k.add([
    k.sprite(spriteAjolote(colorElegido, "larva"), { anim: "nadar" }),
    k.pos(240, 72),
    k.anchor("center"),
    k.scale(4.5),
  ]);

  // --- Colores ---
  const textoDato = k.add([k.text("", { size: 12 }), k.pos(240, 196), k.anchor("center"), k.color(190, 205, 225)]);
  const muestras = COLORES_AJOLOTE.map((color, i) => {
    const muestra = k.add([
      k.rect(104, 66, { radius: 10 }),
      k.pos(66 + i * 116, 150),
      k.anchor("center"),
      k.color(40, 60, 90),
      k.outline(3, k.rgb(70, 90, 120)),
      k.area(),
    ]);
    muestra.add([k.sprite(spriteAjolote(color.id, "larva"), { frame: 0 }), k.pos(0, -8), k.anchor("center"), k.scale(2.5)]);
    muestra.add([k.text(color.nombre, { size: 11 }), k.pos(0, 20), k.anchor("center")]);
    muestra.onClick(() => {
      sonarClick();
      elegirColor(color.id);
    });
    return { muestra, color };
  });
  function elegirColor(id) {
    colorElegido = id;
    vista.use(k.sprite(spriteAjolote(colorElegido, "larva"), { anim: "nadar" }));
    for (const { muestra, color } of muestras) {
      muestra.outline.color = color.id === id ? COLOR_DORADO : k.rgb(70, 90, 120);
      if (color.id === id) textoDato.text = color.dato;
    }
  }
  elegirColor(colorElegido);
  // Con el teclado: flechas para cambiar de color
  k.onKeyPress("left", () => {
    const i = COLORES_AJOLOTE.findIndex((c) => c.id === colorElegido);
    elegirColor(COLORES_AJOLOTE[(i + COLORES_AJOLOTE.length - 1) % COLORES_AJOLOTE.length].id);
  });
  k.onKeyPress("right", () => {
    const i = COLORES_AJOLOTE.findIndex((c) => c.id === colorElegido);
    elegirColor(COLORES_AJOLOTE[(i + 1) % COLORES_AJOLOTE.length].id);
  });

  // --- Nombre ---
  const textoAviso = k.add([k.text("", { size: 13 }), k.pos(240, 288), k.anchor("center"), k.color(255, 150, 150)]);
  const caja = k.add([
    k.rect(230, 36, { radius: 8 }),
    k.pos(205, 246),
    k.anchor("center"),
    k.color(230, 240, 250),
    k.outline(3, k.rgb(120, 160, 210)),
    k.area(),
  ]);
  const textoNombre = caja.add([k.text("", { size: 18 }), k.anchor("center"), k.color(COLOR_TEXTO_OSCURO)]);
  crearBoton("Al azar", 385, 246, 100, () => ponerNombre(k.choose(NOMBRES_AL_AZAR)));

  // La caja de texto real del navegador (invisible)
  const entrada = document.createElement("input");
  entrada.maxLength = 12;
  entrada.autocomplete = "off";
  entrada.setAttribute("aria-label", "Nombre de tu ajolote");
  // font-size 16px: así el iPhone no hace zoom al escribir
  entrada.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;";
  document.body.appendChild(entrada);
  entrada.addEventListener("input", () => {
    nombre = entrada.value;
    textoAviso.text = "";
  });
  entrada.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") listo();
  });
  // El celular solo abre el teclado si el foco se pide DURANTE el toque,
  // por eso escuchamos el toque directo en el canvas del juego.
  // (No sirve caja.isHovering(): KAPLAY lo calcula una vez por cuadro,
  // y en el instante del toque todavía no se entera.)
  function alTocar(evento) {
    if (caja.hasPoint(puntoDelJuego(evento))) entrada.focus();
  }
  k.canvas.addEventListener("pointerup", alTocar);
  // En la compu, puedes escribir de una vez
  if (!window.matchMedia("(pointer: coarse)").matches) entrada.focus();

  function ponerNombre(texto) {
    entrada.value = texto;
    nombre = texto;
    textoAviso.text = "";
  }

  // Al salir de esta escena, quitamos la caja de texto
  k.onSceneLeave(() => {
    entrada.remove();
    k.canvas.removeEventListener("pointerup", alTocar);
    // Le regresamos el teclado al juego (si no, las teclas dejan de funcionar)
    k.canvas.focus();
  });

  // El nombre con un cursor que parpadea
  k.onUpdate(() => {
    const cursor = document.activeElement === entrada && Math.floor(k.time() * 2) % 2 === 0 ? "|" : "";
    textoNombre.text = nombre ? nombre + cursor : (cursor || "Toca para escribir");
    textoNombre.color = nombre ? COLOR_TEXTO_OSCURO : k.rgb(140, 150, 165);
  });

  function listo() {
    const limpio = nombre.trim();
    if (!limpio) {
      textoAviso.text = "¡Ponle un nombre! (o toca \"Al azar\")";
      return;
    }
    datosJuego.nombre = limpio;
    datosJuego.color = colorElegido;
    guardarPartida();
    k.go("acuario");
  }
  crearBoton("¡Listo!", 240, 330, 160, listo);
});

// ===== 8. ESCENA DEL ACUARIO (juego principal) =====
k.scene("acuario", () => {
  detenerMusicaMinijuegos(); // al volver a la pecera, se apaga
  cargarMusicaMinijuegos();  // la vamos cargando para que esté lista al jugar

  // --- Fondo de la pecera ---
  // ⚡ OPTIMIZACIÓN: en vez de crear muchos objetos (agua, arena,
  // plantas, burbujas, decoraciones), UN solo objeto los dibuja a todos.
  // z(-1) lo pone hasta atrás, como el fondo de un escenario.
  const posAgua = k.vec2(PECERA.izq, PECERA.arriba);
  const posArena = k.vec2(PECERA.izq, ARENA_Y);
  const posBurbuja = k.vec2(0, 0); // se reutiliza para todas las burbujas
  const plantas = [60, 160, 350, 440].map((x, i) => ({ pos: k.vec2(x, ARENA_Y - 50 - i * 8), alto: 50 + i * 8 }));
  const colorAgua = k.rgb(60, 140, 190);
  const colorArena = k.rgb(222, 196, 140);
  const colorPlanta = k.rgb(70, 160, 90);
  const colorBurbuja = k.rgb(200, 240, 255);
  const colorVidrio = k.rgb(190, 230, 255);

  // Solo las decoraciones que el jugador puso en la pecera
  const decoraciones = ARTICULOS
    .filter((articulo) => datosJuego.decoracionesPuestas.includes(articulo.id))
    .map((articulo) => ({ sprite: articulo.id, pos: k.vec2(articulo.x, ARENA_Y + 6) }));

  k.add([
    k.z(-1),
    {
      draw() {
        k.drawRect({ pos: posAgua, width: PECERA.der - PECERA.izq, height: PECERA.abajo - PECERA.arriba, color: colorAgua });
        k.drawRect({ pos: posArena, width: PECERA.der - PECERA.izq, height: PECERA.abajo - ARENA_Y, color: colorArena });
        for (const planta of plantas) {
          k.drawRect({ pos: planta.pos, width: 10, height: planta.alto, color: colorPlanta, radius: 4 });
        }
        for (const deco of decoraciones) {
          k.drawSprite({ sprite: deco.sprite, pos: deco.pos, anchor: "bot", scale: ESCALA_3 });
        }
        // Burbujas que suben sin parar
        for (let i = 0; i < 5; i++) {
          posBurbuja.x = PECERA.izq + 50 + i * 85;
          posBurbuja.y = ARENA_Y - ((k.time() * 35 + i * 53) % (ARENA_Y - PECERA.arriba));
          k.drawCircle({ pos: posBurbuja, radius: 4, color: colorBurbuja, opacity: 0.6 });
        }
        // Vidrio de la pecera
        k.drawRect({
          pos: posAgua, width: PECERA.der - PECERA.izq, height: PECERA.abajo - PECERA.arriba,
          fill: false, outline: { width: 4, color: colorVidrio },
        });
      },
    },
  ]);

  // --- Paredes invisibles a los lados de la pecera ---
  k.add(crearPared(PECERA.izq, "izquierda"));
  k.add(crearPared(PECERA.der - 10, "derecha"));

  // --- El ajolote (con SU color y SU etapa) ---
  const etapa = ETAPAS[etapaActual()];
  const escalaBase = k.vec2(etapa.escala); // su tamaño normal (se apachurra y regresa a este)
  const ajolote = k.add([
    k.sprite(spriteAjolote(), { anim: "nadar" }),
    k.pos(240, 180),
    k.anchor("center"),
    k.scale(escalaBase),
    k.area({ isSensor: true }),
    k.health(datosJuego.salud, 100), // vida: empieza con la salud guardada
    k.timer(),                       // su propio reloj para wait() y tween()
    "ajolote",
  ]);

  // --- Sombrero (si trae uno puesto) ---
  // El sombrero es "hijo" del ajolote: lo sigue a todos lados
  // y crece con él (hereda su escala).
  // Posiciones del sombrero sobre la cabeza (en píxeles del dibujo),
  // mirando a la derecha y a la izquierda.
  // (Cambian según la etapa: la cabeza de la larva está en otro lugar)
  const SOMBRERO_DERECHA = k.vec2(etapa.sombrero[0], etapa.sombrero[1]);
  const SOMBRERO_IZQUIERDA = k.vec2(-etapa.sombrero[0], etapa.sombrero[1]);
  let sombrero = null;
  if (datosJuego.sombreroPuesto) {
    sombrero = ajolote.add([
      k.sprite(datosJuego.sombreroPuesto),
      k.pos(SOMBRERO_DERECHA),
      k.anchor("bot"),
    ]);
  }

  let direccion = 1;          // 1 = derecha, -1 = izquierda
  let bocadoActual = null;    // el bocado que está persiguiendo
  let estadoAnimo = "nadar";
  let tiempoFeliz = 0;        // segundos que dura feliz después de saludarlo
  const VELOCIDAD_NADO = 50;
  const VELOCIDAD_PERSEGUIR = 90;
  const ALTURA_NADO = 180;

  // onUpdate se ejecuta en cada fotograma (unas 60 veces por segundo).
  let destino = null;         // lugar del agua que tocaste (o null)

  let comiendo = false;       // ¿se está comiendo algo ahorita?

  ajolote.onUpdate(() => {
    if (comiendo) {
      // Mientras come se queda quieto, masticando
    } else if (bocadoActual) {
      // Si hay comida, nada directo hacia ella
      ajolote.moveTo(bocadoActual.pos, VELOCIDAD_PERSEGUIR);
      ajolote.flipX = bocadoActual.pos.x < ajolote.pos.x;
    } else if (destino) {
      // Si tocaste el agua, va a ver qué hay ahí
      ajolote.moveTo(destino, VELOCIDAD_PERSEGUIR);
      ajolote.flipX = destino.x < ajolote.pos.x;
      // dist() mide la distancia entre dos puntos
      if (ajolote.pos.dist(destino) < 3) {
        direccion = ajolote.flipX ? -1 : 1; // sigue nadando hacia el mismo lado
        destino = null;
      }
    } else {
      // Si no, nada de lado a lado subiendo y bajando suave.
      // La velocidad vertical es mayor mientras más lejos está de la altura deseada.
      const alturaDeseada = ALTURA_NADO + Math.sin(k.time() * 2) * 12;
      // move() ya multiplica por dt (el "tic" del reloj entre fotogramas),
      // así la velocidad es igual en cualquier computadora.
      ajolote.move(direccion * VELOCIDAD_NADO, (alturaDeseada - ajolote.pos.y) * 3);
      ajolote.flipX = direccion < 0; // voltea el dibujo según hacia dónde nada
    }
    // El sombrero se voltea junto con el ajolote (solo cuando cambia de lado)
    if (sombrero && sombrero.flipX !== ajolote.flipX) {
      sombrero.flipX = ajolote.flipX;
      // ⚠️ En v4000 la posición se cambia ASIGNANDO "pos" completa.
      // Si solo cambias pos.x, el motor no se entera y no lo redibuja.
      sombrero.pos = ajolote.flipX ? SOMBRERO_IZQUIERDA : SOMBRERO_DERECHA;
    }
  });

  // COLISIÓN 1: el ajolote toca una pared → cambia de dirección
  ajolote.onCollide("pared", (pared) => {
    direccion = pared.lado === "izquierda" ? 1 : -1;
  });

  // COLISIÓN 2: el ajolote toca el bocado → se lo come poco a poco
  ajolote.onCollide("bocado", (bocado) => {
    if (comiendo || bocado.comiendo) return;
    empezarAComer(bocado);
  });

  // --- ANIMACIÓN DE COMER ---
  // Dura lo mismo que el sonido (1.5 s). En cada mordida del audio:
  // la comida se hace más chica, el ajolote se apachurra y salen migajas.
  const cuadroMiga = k.getSprite("miga").data.frames[0];

  function empezarAComer(bocado) {
    comiendo = true;
    destino = null;
    bocado.comiendo = true; // deja de hundirse

    // La comida se queda pegada a la boca del ajolote.
    // Con anchor "left" (o "right") se hace chica HACIA la boca,
    // como si se la fuera metiendo.
    const lado = ajolote.flipX ? -1 : 1;
    const boca = ajolote.pos.add(lado * etapa.boca[0] * etapa.escala, etapa.boca[1] * etapa.escala);
    bocado.anchor = lado > 0 ? "left" : "right";
    bocado.pos = boca;
    const tamanoInicial = bocado.scale.x;

    // Las migajas: SOLO son de adorno (no hacen nada en el juego).
    // Viven 1.5 s, se van haciendo transparentes y se hunden despacito.
    const migajas = k.add([
      k.pos(boca),
      k.particles({
        max: 60,
        lifeTime: [1.5, 1.5],
        speed: [25, 70],
        acceleration: [k.vec2(0, 15), k.vec2(0, 35)], // se hunden
        damping: [1.5, 3],                            // el agua las frena
        scales: [1.5, 1],
        colors: bocado.colores,                       // del color de la comida
        opacities: [1, 0],                            // se disuelven
        texture: cuadroMiga.tex,
        quads: [cuadroMiga.q],
      }, {
        direction: lado > 0 ? 0 : 180, // salen hacia donde mira
        spread: 110,
      }),
      k.z(6),
    ]);

    sonar("comer"); // sin sonido, la animación funciona igual

    // Programamos cada mordida en el segundo exacto en que suena
    MORDIDAS.forEach((mordida, numero) => {
      ajolote.wait(mordida.tiempo, () => {
        // Cuánto queda de comida: después de la última mordida, nada
        const queda = 1 - (numero + 1) / MORDIDAS.length;
        ajolote.tween(bocado.scale, k.vec2(tamanoInicial * queda), 0.08, (escala) => {
          if (bocado.exists()) bocado.scale = escala;
        });
        // Más migajas y más apachurrón en las mordidas fuertes
        migajas.emit(Math.round(3 + mordida.fuerza * 7));
        const apachurron = 0.3 * mordida.fuerza;
        ajolote.tween(k.vec2(etapa.escala * (1 + apachurron / 3), etapa.escala * (1 - apachurron / 3)), escalaBase, 0.16, (escala) => {
          ajolote.scale = escala;
        }, k.easings.easeOutQuad);
        // Abre y cierra la boca
        ajolote.play("feliz");
        ajolote.wait(0.09, () => { if (comiendo) ajolote.play("nadar"); });
      });
    });

    ajolote.wait(DURACION_COMER, () => terminarDeComer(bocado));
    // Borramos el emisor cuando ya se disolvieron las últimas migajas
    ajolote.wait(DURACION_COMER + 1.6, () => migajas.destroy());
  }

  function terminarDeComer(bocado) {
    bocado.destroy();
    bocadoActual = null;
    comiendo = false;
    estadoAnimo = ""; // para que vuelva a elegir su cara
    datosJuego.alimentado = Math.min(100, datosJuego.alimentado + 25);
    datosJuego.salud = Math.min(100, datosJuego.salud + 5);
    datosJuego.comidasDadas++;
    if (!datosJuego.comidasProbadas.includes(bocado.tipo)) datosJuego.comidasProbadas.push(bocado.tipo);
    mostrarMensaje("¡Ñam! " + nombreAjolote() + " se comió " + bocado.nombre);
    revisarLogros();
  }

  // Si la vida llega a 0, termina el juego
  ajolote.onDeath(() => {
    k.go("despedida");
  });

  // --- Interactuar con el ajolote ---
  // Las partículas son como confeti: muchas piezas pequeñas
  // que el motor maneja de golpe.
  // ⚡ OPTIMIZACIÓN: particles() es mucho más rápido que crear
  // y destruir un objeto por cada corazón.
  // En v4000 cada cuadro del sprite guarda su textura (tex) y su recorte (q).
  const cuadroCorazon = k.getSprite("corazon").data.frames[0];
  const corazones = k.add([
    k.pos(0, 0),
    k.particles({
      max: 30,
      lifeTime: [0.8, 1.3],            // cuánto vive cada corazón (segundos)
      speed: [60, 120],
      acceleration: [k.vec2(0, -30), k.vec2(0, -60)], // flotan hacia arriba
      scales: [2, 3],
      opacities: [1, 0],                // se desvanecen
      texture: cuadroCorazon.tex,
      quads: [cuadroCorazon.q],
    }, {
      direction: -90,                   // -90 = hacia arriba
      spread: 80,
    }),
    k.z(50),
  ]);

  // OJO: en la vida real a los ajolotes NO se les toca,
  // porque su piel es muy delicada. Aquí solo lo "saludamos".
  function saludarAjolote() {
    if (tiempoFeliz > 1) return; // pequeña espera para no repetir sin parar
    tiempoFeliz = 1.8;
    datosJuego.saludosTotales++;
    datosJuego.animo = Math.min(100, datosJuego.animo + 12);

    // Cada saludo cuenta para que la moneda llegue antes
    if (datosJuego.saludosParaMoneda < SALUDOS_PARA_ACELERAR) {
      datosJuego.saludosParaMoneda++;
      if (datosJuego.saludosParaMoneda === SALUDOS_PARA_ACELERAR) {
        mostrarMensaje("¡Moneda acelerada: llega a los 5 min!");
      }
    }
    ajolote.play("feliz");
    estadoAnimo = "feliz";

    // Corazones salen desde el ajolote
    corazones.pos = ajolote.pos.add(0, -20);
    corazones.emit(6);

    // Un tween es una animación de un valor a otro,
    // como una liga que se estira y regresa.
    // Aquí el ajolote se "aplasta" y rebota.
    ajolote.tween(k.vec2(etapa.escala * 1.27, etapa.escala * 0.8), escalaBase, 0.5, (escala) => {
      ajolote.scale = escala;
    }, k.easings.easeOutElastic);
  }
  ajolote.onClick(saludarAjolote);

  // --- Mensajes cortos ---
  const textoMensaje = k.add([k.text("", { size: 18 }), k.pos(240, 262), k.anchor("center"), k.z(100)]);
  function mostrarMensaje(texto) {
    textoMensaje.text = texto;
    // Usamos el reloj del ajolote: si él desaparece, el temporizador también.
    ajolote.wait(2, () => { textoMensaje.text = ""; });
  }

  // --- Manchas de suciedad ---
  function agregarMancha() {
    const x = k.rand(PECERA.izq + 30, PECERA.der - 30);
    const y = k.rand(PECERA.arriba + 25, ARENA_Y - 20);
    k.add(crearMancha(x, y));
  }
  // Volvemos a poner las manchas que había antes de salir de la escena
  // (o las que aparecieron mientras no estabas)
  for (let i = 0; i < datosJuego.manchas; i++) agregarMancha();
  // Las manchas nuevas las agrega ponerAlDia() en los datos;
  // en "El paso del tiempo" (abajo) dibujamos las que falten.

  // LIMPIAR: click sobre una mancha, SOLO si el click fue dentro de la pecera
  k.onClick("mancha", (mancha) => {
    if (!estaEnPecera(k.mousePos())) return;
    mancha.destroy();
    datosJuego.manchas = Math.max(0, datosJuego.manchas - 1);
    revisarLogros();
  });

  // --- Alimentar ---
  function soltarBocado() {
    if (bocadoActual) return; // ya hay uno en el agua
    // Darle de más ensucia el agua (¡como en la vida real!)
    if (datosJuego.alimentado > 90) {
      mostrarMensaje("¡Ya está lleno!");
      return;
    }
    // k.choose() escoge un elemento al azar de una lista
    const bocado = k.add(crearBocado(k.rand(PECERA.izq + 40, PECERA.der - 40), k.choose(COMIDAS)));
    // El bocado se hunde despacio hasta la arena
    bocado.onUpdate(() => {
      if (bocado.comiendo) return; // ya está en la boca del ajolote
      if (bocado.pos.y < ARENA_Y - 8) bocado.move(0, 40);
    });
    bocadoActual = bocado;
  }

  // --- Monedas que caen en la pecera ---
  function soltarMoneda(x, y) {
    const moneda = k.add(crearMoneda(x, y));
    // La moneda se hunde despacio hasta la arena
    moneda.onUpdate(() => {
      if (moneda.pos.y < ARENA_Y - 6) moneda.move(0, 50);
    });
  }
  // Volvemos a poner las monedas que no recogiste (ya en la arena)
  for (let i = 0; i < datosJuego.monedasEnPecera; i++) {
    soltarMoneda(k.rand(PECERA.izq + 30, PECERA.der - 30), ARENA_Y - 6);
  }

  // RECOGER: click sobre una moneda dentro de la pecera
  k.onClick("moneda", (moneda) => {
    if (!estaEnPecera(k.mousePos())) return;
    k.add(crearTextoFlotante("+1", moneda.pos.x, moneda.pos.y - 15, COLOR_DORADO));
    moneda.destroy();
    datosJuego.monedas++;
    datosJuego.monedasEnPecera--;
    datosJuego.monedasRecogidas++;
    revisarLogros();
  });

  // ¿Cayó una moneda nueva? ponerAlDia() la cuenta en los datos;
  // aquí solo la dibujamos cayendo desde arriba.
  function revisarMoneda() {
    if (k.get("moneda").length < datosJuego.monedasEnPecera) {
      soltarMoneda(k.rand(PECERA.izq + 30, PECERA.der - 30), PECERA.arriba + 10);
      mostrarMensaje("¡Cayó una moneda! Dale click.");
    }
  }

  // Mismo truco para las manchas: si hay más en los datos que en la pecera, las dibujamos
  function revisarManchas() {
    if (k.get("mancha").length < datosJuego.manchas) agregarMancha();
  }

  // Si estuviste fuera un buen rato, te contamos cuánto (solo la primera vez)
  if (segundosFuera > 10 * 60 && !avisoAusenciaMostrado) {
    mostrarMensaje("Estuviste fuera " + formatoAusencia(segundosFuera));
  }
  avisoAusenciaMostrado = true;

  // ¡CRECIÓ! (puede pasar jugando o mientras no estabas)
  if (datosJuego.etapaVista !== etapaActual()) {
    datosJuego.etapaVista = etapaActual();
    guardarPartida();
    celebrarCrecimiento();
  }
  function celebrarCrecimiento() {
    const letrero = k.add([
      k.text(nombreAjolote() + " creció:\n¡ahora es " + etapa.nombre.toLowerCase() + "!", { size: 22, align: "center" }),
      k.pos(240, 120),
      k.anchor("center"),
      k.color(COLOR_DORADO),
      k.opacity(1),
      k.scale(0),
      k.timer(),
      k.lifespan(3.5, { fade: 0.6 }),
      k.z(120),
    ]);
    letrero.tween(0, 1, 0.5, (t) => { letrero.scale = k.vec2(t); }, k.easings.easeOutBack);
    // Lluvia de corazones (se ven una vez que el ajolote está listo)
    k.wait(0.1, () => {
      corazones.pos = ajolote.pos.add(0, -20);
      corazones.emit(20);
    });
    tiempoFeliz = 3;
  }

  // --- TOCAR EL AGUA: el ajolote nada hacia ahí ---
  k.onMousePress(() => {
    const punto = k.mousePos();
    if (!estaEnPecera(punto)) return;
    // Si tocaste una mancha, una moneda o al ajolote, eso tiene su propia acción
    const tocoAlgo = ["mancha", "moneda", "ajolote", "botonLogros"]
      .some((tag) => k.get(tag).some((cosa) => cosa.isHovering()));
    if (tocoAlgo) return;
    // k.clamp() mantiene un número dentro de un rango (para que no se salga del agua)
    destino = k.vec2(
      k.clamp(punto.x, PECERA.izq + 35, PECERA.der - 35),
      k.clamp(punto.y, PECERA.arriba + 25, ARENA_Y - 20),
    );
    // Un anillo de ondas donde tocaste
    k.add([
      k.circle(6, { fill: false }),
      k.outline(2, colorBurbuja),
      k.pos(punto),
      k.opacity(1),
      k.lifespan(0.4, { fade: 0.4 }),
      k.scale(1),
      k.z(40),
      {
        update() { this.scale = this.scale.add(4 * k.dt(), 4 * k.dt()); },
      },
    ]);
  });

  // --- BURBUJA DE PENSAMIENTO: el ajolote te dice qué necesita ---
  // Devuelve el sprite de lo que más necesita (o null si está bien)
  function queNecesita() {
    if (datosJuego.alimentado < 40) return "lombriz";
    if (calcularLimpieza() < 55) return "mancha";
    if (datosJuego.animo < 40) return "corazon";
    return null;
  }
  const posBurbujaPensamiento = k.vec2(0, 0);
  const posPuntito = k.vec2(0, 0);
  const colorBlanco = k.rgb(255, 255, 255);
  k.add([
    k.z(60),
    {
      draw() {
        const necesidad = queNecesita();
        if (!necesidad || tiempoFeliz > 0) return;
        // La burbuja flota arriba del ajolote y sube y baja un poquito
        const lado = ajolote.flipX ? -1 : 1;
        posBurbujaPensamiento.x = ajolote.pos.x + lado * 24;
        posBurbujaPensamiento.y = ajolote.pos.y - 44 + Math.sin(k.time() * 3) * 2;
        posPuntito.x = ajolote.pos.x + lado * 14;
        posPuntito.y = ajolote.pos.y - 22;
        k.drawCircle({ pos: posPuntito, radius: 3, color: colorBlanco });
        k.drawCircle({ pos: posBurbujaPensamiento, radius: 15, color: colorBlanco });
        k.drawSprite({ sprite: necesidad, pos: posBurbujaPensamiento, anchor: "center", scale: ESCALA_2 });
      },
    },
  ]);

  // --- Botones (click/dedo) y teclas (para botones físicos) ---
  crearBoton("Comer (1)", 63, 330, 108, soltarBocado);
  crearBoton("Saludar (2)", 181, 330, 108, saludarAjolote);
  crearBoton("Tienda (3)", 299, 330, 108, () => k.go("tienda"));
  crearBoton("Jugar (4)", 417, 330, 108, irAJugar);
  k.onKeyPress("1", soltarBocado);
  k.onKeyPress("2", saludarAjolote);
  k.onKeyPress("3", () => k.go("tienda"));
  k.onKeyPress("4", irAJugar);

  // Botón de logros: un trofeo en la esquina de la pecera (o tecla 5)
  const botonLogros = k.add([
    k.sprite("trofeo"),
    k.pos(PECERA.der - 22, PECERA.arriba + 20),
    k.anchor("center"),
    k.scale(2.5),
    k.area(),
    k.z(70),
    "botonLogros",
  ]);
  botonLogros.onClick(() => {
    sonarClick();
    k.go("logros");
  });
  k.onKeyPress("5", () => k.go("logros"));

  // Abre el menú de minijuegos (ahí se revisa si tiene hambre)
  function irAJugar() {
    k.go("minijuegos");
  }

  // --- Barras de necesidades (arriba) ---
  const ANCHO_BARRA = 100;
  const barras = [
    { nombre: "Comida", x: 14, color: k.rgb(255, 170, 60), valor: () => datosJuego.alimentado },
    { nombre: "Agua", x: 132, color: k.rgb(90, 190, 255), valor: calcularLimpieza },
    { nombre: "Ánimo", x: 250, color: k.rgb(255, 120, 180), valor: () => datosJuego.animo },
    { nombre: "Salud", x: 368, color: k.rgb(110, 220, 120), valor: () => ajolote.hp },
  ].map((barra) => ({ ...barra, posTexto: k.vec2(barra.x, 4), posBarra: k.vec2(barra.x, 21) }));
  const colorFondoBarra = k.rgb(50, 50, 70);
  const posIconoMoneda = k.vec2(14, 38);
  const posTextoMonedas = k.vec2(34, 41);
  const posTextoReloj = k.vec2(100, 41);
  const posTextoSaludos = k.vec2(290, 41);
  const posTextoDia = k.vec2(405, 41);
  const posEtiqueta = k.vec2(PECERA.izq + 6, PECERA.arriba + 6);
  const posTextoEtiqueta = k.vec2(PECERA.izq + 12, PECERA.arriba + 9);
  const colorEtiqueta = k.rgb(20, 40, 60);

  k.add([
    k.z(100), // z alto = se dibuja encima de todo
    {
      draw() {
        for (const barra of barras) {
          k.drawText({ text: barra.nombre, pos: barra.posTexto, size: 13, color: COLOR_TEXTO });
          k.drawRect({ pos: barra.posBarra, width: ANCHO_BARRA, height: 10, color: colorFondoBarra, radius: 3 });
          k.drawRect({ pos: barra.posBarra, width: Math.max(0, ANCHO_BARRA * barra.valor() / 100), height: 10, color: barra.color, radius: 3 });
        }
        k.drawSprite({ sprite: "moneda", pos: posIconoMoneda, scale: ESCALA_2 });
        k.drawText({ text: "x " + datosJuego.monedas, pos: posTextoMonedas, size: 13, color: COLOR_DORADO });
        // Cuenta regresiva para la siguiente moneda
        const faltan = (segundosDeEspera() - datosJuego.segundosMoneda) / VELOCIDAD_DEL_TIEMPO;
        k.drawText({ text: "Próxima moneda: " + formatoReloj(faltan), pos: posTextoReloj, size: 13, color: COLOR_TEXTO });
        k.drawText({
          text: "Saludos: " + datosJuego.saludosParaMoneda + "/" + SALUDOS_PARA_ACELERAR,
          pos: posTextoSaludos, size: 13,
          color: datosJuego.saludosParaMoneda >= SALUDOS_PARA_ACELERAR ? COLOR_DORADO : COLOR_TEXTO,
        });
        // Contador de días
        k.drawText({ text: "Día " + diasVivo(), pos: posTextoDia, size: 13, color: COLOR_DORADO });
        // Nombre y etapa (esquina de la pecera). Te dice cuánto le falta para crecer.
        const horas = horasParaCrecer();
        const etiqueta = nombreAjolote() + " · " + etapa.nombre + (horas === null ? "" : "  (crece en " + horas + " h bien cuidado)");
        k.drawRect({ pos: posEtiqueta, width: etiqueta.length * 6.6 + 12, height: 18, color: colorEtiqueta, opacity: 0.55, radius: 5 });
        k.drawText({ text: etiqueta, pos: posTextoEtiqueta, size: 11, color: COLOR_TEXTO });
      },
    },
  ]);

  // --- El paso del tiempo ---
  k.onUpdate(() => {
    // El reloj real manda: ponerAlDia() baja la comida, el ánimo, etc.
    ponerAlDia();
    // Si creció mientras mirabas, volvemos a entrar a la pecera
    // (así se carga su dibujo nuevo y se hace la celebración)
    if (!comiendo && datosJuego.etapaVista !== etapaActual()) {
      k.go("acuario");
      return;
    }
    tiempoFeliz = Math.max(0, tiempoFeliz - k.dt());
    revisarMoneda();
    revisarManchas();
    const limpieza = calcularLimpieza();

    // La vida del ajolote sigue a la salud guardada.
    // Si llega a 0, el componente health() dispara onDeath().
    ajolote.hp = datosJuego.salud;

    // Mientras come, la animación de comer controla la cara
    if (comiendo) return;
    // Cambiamos la cara SOLO cuando cambia el ánimo (no en cada fotograma)
    let nuevoAnimo = "nadar";
    if (tiempoFeliz > 0) nuevoAnimo = "feliz";
    else if (datosJuego.alimentado < 30 || limpieza < 40 || datosJuego.animo < 25) nuevoAnimo = "triste";
    else if (datosJuego.alimentado > 70 && limpieza > 80 && datosJuego.animo > 60) nuevoAnimo = "feliz";
    if (nuevoAnimo !== estadoAnimo) {
      estadoAnimo = nuevoAnimo;
      ajolote.play(nuevoAnimo);
    }
  });
});

// ===== 8a. PREMIO DE LOS MINIJUEGOS =====
// Todos los minijuegos terminan igual: dan monedas, suben el ánimo,
// bajan la comida y muestran un panel. Por eso es UNA sola función.
function premiarMinijuego({ titulo, resultado, monedas, nuevoRecord }) {
  datosJuego.monedas += monedas;
  datosJuego.animo = Math.min(100, datosJuego.animo + ANIMO_POR_JUGAR);
  datosJuego.alimentado = Math.max(0, datosJuego.alimentado - COMIDA_QUE_GASTA_JUGAR);
  guardarPartida();
  revisarLogros();

  const panel = k.add([
    k.rect(340, 210, { radius: 12 }),
    k.pos(240, 175),
    k.anchor("center"),
    k.color(40, 60, 90),
    k.outline(3, k.rgb(120, 160, 210)),
    // Sin z(): como se agrega al final, ya se dibuja encima.
    // (En v4000, si le pones z al papá, sus hijos de texto quedan atrás)
  ]);
  panel.add([k.text(titulo, { size: 20 }), k.pos(0, -78), k.anchor("center"), k.color(COLOR_DORADO)]);
  panel.add([k.text(resultado, { size: 16 }), k.pos(0, -46), k.anchor("center")]);
  if (nuevoRecord) {
    panel.add([k.text("¡Nuevo récord!", { size: 14 }), k.pos(0, -24), k.anchor("center"), k.color(255, 150, 190)]);
  }
  panel.add([k.text("Monedas: +" + monedas, { size: 16 }), k.pos(0, 0), k.anchor("center"), k.color(COLOR_DORADO)]);
  panel.add([k.text("Ánimo: +" + ANIMO_POR_JUGAR + "   Comida: -" + COMIDA_QUE_GASTA_JUGAR, { size: 14 }), k.pos(0, 24), k.anchor("center")]);
  crearBoton("Volver (0)", 240, 245, 160, () => k.go("minijuegos"));
}

// ===== 8b. MINIJUEGO: ATRAPA LA COMIDA =====
// Mueve al ajolote para atrapar lombrices, gusanos y artemias.
// ¡Esquiva la basura! Cada 10 bocados ganas 1 moneda.
k.scene("jugar", () => {
  empezarMusicaMinijuegos(); // si ya suena, sigue sonando
  let puntos = 0;
  let vidas = VIDAS_MINIJUEGO;
  let tiempo = SEGUNDOS_MINIJUEGO;
  let terminado = false;
  let tiempoCaraFeliz = 0;

  // --- Fondo: agua y arena ---
  k.add([k.rect(480, 262), k.pos(0, 40), k.color(60, 140, 190), k.z(-1)]);
  k.add([k.rect(480, 58), k.pos(0, 302), k.color(222, 196, 140), k.z(-1)]);

  // --- El ajolote (nada solo de lado a lado, abajo) ---
  const etapa = ETAPAS[etapaActual()];
  const jugador = k.add([
    k.sprite(spriteAjolote(), { anim: "nadar" }),
    k.pos(240, 288),
    k.anchor("center"),
    k.scale(etapa.escala),
    // scale en area() hace la zona de choque un poco más chica que el dibujo,
    // así se siente más justo cuando algo "casi" lo toca.
    k.area({ isSensor: true, scale: k.vec2(0.8, 0.6) }),
  ]);
  // Si trae sombrero, también juega con él puesto
  let sombrero = null;
  if (datosJuego.sombreroPuesto) {
    sombrero = jugador.add([k.sprite(datosJuego.sombreroPuesto), k.pos(etapa.sombrero[0], etapa.sombrero[1]), k.anchor("bot")]);
  }

  // --- Controles: flechas, teclas 1/2 o tocar la pantalla ---
  const VELOCIDAD_JUGADOR = 260;
  jugador.onUpdate(() => {
    if (terminado) return;
    let mover = 0;
    if (k.isKeyDown("left") || k.isKeyDown("a") || k.isKeyDown("1")) mover = -1;
    if (k.isKeyDown("right") || k.isKeyDown("d") || k.isKeyDown("2")) mover = 1;
    // Con el dedo o el mouse: nada hacia donde estás tocando
    if (k.isMouseDown()) {
      const distancia = k.mousePos().x - jugador.pos.x;
      if (Math.abs(distancia) > 4) mover = Math.sign(distancia);
    }
    jugador.move(mover * VELOCIDAD_JUGADOR, 0);
    jugador.pos = k.vec2(k.clamp(jugador.pos.x, 35, 445), jugador.pos.y);
    if (mover !== 0) jugador.flipX = mover < 0;
    if (sombrero) {
      sombrero.flipX = jugador.flipX;
      sombrero.pos = k.vec2(jugador.flipX ? -etapa.sombrero[0] : etapa.sombrero[0], etapa.sombrero[1]);
    }
    // Cara feliz un ratito después de comer
    tiempoCaraFeliz = Math.max(0, tiempoCaraFeliz - k.dt());
    const cara = tiempoCaraFeliz > 0 ? "feliz" : "nadar";
    if (jugador.getCurAnim()?.name !== cara) jugador.play(cara);
  });

  // --- Cosas que caen ---
  function soltarCosa() {
    if (terminado) return;
    const esBasura = k.rand() < 0.25; // 1 de cada 4 es basura
    // Mientras más avanza el juego, más rápido caen
    const rapidez = 90 + (SEGUNDOS_MINIJUEGO - tiempo) * 5;
    k.add([
      k.sprite(esBasura ? "basura" : k.choose(COMIDAS).sprite),
      k.pos(k.rand(30, 450), 40),
      k.anchor("center"),
      k.scale(2.5),
      k.area({ isSensor: true }),
      k.move(k.DOWN, rapidez),
      k.offscreen({ destroy: true }), // si se sale de la pantalla, se borra solo
      esBasura ? "basura" : "comidaQueCae",
    ]);
  }
  const relojCaida = k.loop(0.6, soltarCosa);

  // --- Atrapar ---
  jugador.onCollide("comidaQueCae", (comida) => {
    comida.destroy();
    puntos++;
    tiempoCaraFeliz = 0.4;
    k.add(crearTextoFlotante("+1", comida.pos.x, comida.pos.y - 10, COLOR_DORADO));
  });
  jugador.onCollide("basura", (basura) => {
    basura.destroy();
    vidas--;
    k.shake(6); // la pantalla tiembla
    k.add(crearTextoFlotante("¡Basura no!", jugador.pos.x, jugador.pos.y - 40, k.rgb(255, 120, 120)));
    if (vidas <= 0) terminar();
  });

  // --- Reloj del minijuego ---
  k.onUpdate(() => {
    if (terminado) return;
    tiempo -= k.dt();
    if (tiempo <= 0) terminar();
  });

  // --- Marcador (arriba) ---
  const posCorazon = k.vec2(0, 12);
  const posPuntos = k.vec2(14, 12);
  const posTiempo = k.vec2(190, 12);
  k.add([
    k.z(100),
    {
      draw() {
        k.drawText({ text: "Bocados: " + puntos, pos: posPuntos, size: 16, color: COLOR_TEXTO });
        k.drawText({ text: "Tiempo: " + Math.max(0, Math.ceil(tiempo)), pos: posTiempo, size: 16, color: COLOR_TEXTO });
        for (let i = 0; i < vidas; i++) {
          posCorazon.x = 400 + i * 24;
          k.drawSprite({ sprite: "corazon", pos: posCorazon, scale: ESCALA_3 });
        }
      },
    },
  ]);

  // Instrucciones al empezar (se borran solas)
  k.add([
    k.text("Toca o usa ← → para moverte\n¡Atrapa la comida y esquiva la basura!", { size: 15, align: "center" }),
    k.pos(240, 170),
    k.anchor("center"),
    k.opacity(1),
    k.lifespan(2.5, { fade: 0.5 }),
    k.z(100),
  ]);

  // --- Fin del juego: premios ---
  function terminar() {
    if (terminado) return;
    terminado = true;
    relojCaida.cancel();
    for (const cosa of [...k.get("comidaQueCae"), ...k.get("basura")]) cosa.destroy();

    const nuevoRecord = puntos > datosJuego.mejorMinijuego;
    datosJuego.mejorMinijuego = Math.max(datosJuego.mejorMinijuego, puntos);
    // Perfecto = se acabó el tiempo sin tocar nada de basura
    if (vidas === VIDAS_MINIJUEGO) datosJuego.minijuegoPerfecto = true;
    premiarMinijuego({
      titulo: vidas <= 0 ? "¡Mucha basura!" : "¡Se acabó el tiempo!",
      resultado: "Atrapaste " + puntos + " bocados",
      monedas: Math.floor(puntos / PUNTOS_POR_MONEDA),
      nuevoRecord,
    });
  }

  // Salir: si sales antes de terminar, no hay premio
  k.onKeyPress("0", () => k.go("minijuegos"));
  k.onKeyPress("escape", () => k.go("minijuegos"));
});

// ===== 8c. MINIJUEGO: LIMPIA EL CANAL =====
// En Xochimilco, donde viven los ajolotes salvajes, la basura en los canales
// es uno de sus peores problemas. Saca la basura que sale en 9 lugares del agua
// (tocándola o con las teclas 1 a 9, acomodadas como en el teclado numérico).
// ¡Cuidado! A veces sale un ajolotito: a ese NO lo toques.
k.scene("limpiar", () => {
  empezarMusicaMinijuegos(); // si ya suena, sigue sonando
  let puntos = 0;
  let vidas = VIDAS_LIMPIA;
  let tiempo = SEGUNDOS_LIMPIA;
  let terminado = false;

  // --- Fondo: canal ---
  k.add([k.rect(480, 262), k.pos(0, 40), k.color(70, 120, 110), k.z(-1)]);
  k.add([k.rect(480, 58), k.pos(0, 302), k.color(120, 100, 70), k.z(-1)]);

  // --- Los 9 lugares, acomodados como el teclado numérico ---
  //   7 8 9
  //   4 5 6
  //   1 2 3
  const TECLAS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  const lugares = TECLAS.map((tecla, i) => ({
    tecla,
    pos: k.vec2(120 + (i % 3) * 120, 100 + Math.floor(i / 3) * 80),
    cosa: null, // lo que está saliendo ahí (o null si está vacío)
  }));

  // Dibujamos los 9 lugares como círculos de agua con su número
  const colorLugar = k.rgb(90, 150, 140);
  const colorNumero = k.rgb(150, 200, 190);
  const posNumero = k.vec2(0, 0);
  k.add([
    k.z(0),
    {
      draw() {
        for (const lugar of lugares) {
          k.drawCircle({ pos: lugar.pos, radius: 34, color: colorLugar, opacity: 0.6 });
          posNumero.x = lugar.pos.x + 26;
          posNumero.y = lugar.pos.y + 18;
          k.drawText({ text: lugar.tecla, pos: posNumero, size: 12, color: colorNumero, anchor: "center" });
        }
      },
    },
  ]);

  // --- Que salga algo en un lugar vacío ---
  function sacarAlgo() {
    if (terminado) return;
    const vacios = lugares.filter((lugar) => !lugar.cosa);
    if (vacios.length === 0) return;
    const lugar = k.choose(vacios);
    const esAjolotito = k.rand() < 0.2; // 1 de cada 5 es un ajolotito
    // Mientras más avanza el juego, menos tiempo se queda afuera
    const segundosAfuera = 1.5 - (SEGUNDOS_LIMPIA - tiempo) * 0.025;
    const cosa = k.add([
      esAjolotito ? k.sprite("ajolote-rosa-larva", { anim: "nadar" }) : k.sprite("basura"),
      k.pos(lugar.pos),
      k.anchor("center"),
      k.scale(0),
      k.timer(),
      k.z(10),
      { esAjolotito },
    ]);
    lugar.cosa = cosa;
    // Sale con un "pop"
    const tamano = esAjolotito ? 2.8 : 3.5;
    cosa.tween(0, tamano, 0.15, (t) => { cosa.scale = k.vec2(t); }, k.easings.easeOutBack);
    // Si nadie la toca, se vuelve a hundir
    cosa.wait(segundosAfuera, () => {
      if (lugar.cosa === cosa) lugar.cosa = null;
      cosa.tween(tamano, 0, 0.12, (t) => { cosa.scale = k.vec2(t); }).onEnd(() => cosa.destroy());
    });
  }
  // Cada vez sale más seguido
  function programarSiguiente() {
    if (terminado) return;
    sacarAlgo();
    k.wait(Math.max(0.4, 0.85 - (SEGUNDOS_LIMPIA - tiempo) * 0.015), programarSiguiente);
  }
  k.wait(1.5, programarSiguiente); // tiempo para leer las instrucciones

  // --- Tocar un lugar (con el dedo/mouse o con su tecla) ---
  function tocarLugar(lugar) {
    if (terminado || !lugar.cosa) return;
    const cosa = lugar.cosa;
    lugar.cosa = null;
    cosa.destroy();
    if (cosa.esAjolotito) {
      vidas--;
      k.shake(6);
      k.add(crearTextoFlotante("¡Es un ajolotito!", lugar.pos.x, lugar.pos.y - 30, k.rgb(255, 150, 180)));
      if (vidas <= 0) terminar();
    } else {
      puntos++;
      k.add(crearTextoFlotante("+1", lugar.pos.x, lugar.pos.y - 30, COLOR_DORADO));
    }
  }
  k.onMousePress(() => {
    const punto = k.mousePos();
    const lugar = lugares.find((l) => l.pos.dist(punto) < 38);
    if (lugar) tocarLugar(lugar);
  });
  for (const lugar of lugares) {
    k.onKeyPress(lugar.tecla, () => tocarLugar(lugar));
  }

  // --- Reloj ---
  k.onUpdate(() => {
    if (terminado) return;
    tiempo -= k.dt();
    if (tiempo <= 0) terminar();
  });

  // --- Marcador ---
  const posCorazon = k.vec2(0, 12);
  const posPuntos = k.vec2(14, 12);
  const posTiempo = k.vec2(190, 12);
  k.add([
    k.z(100),
    {
      draw() {
        k.drawText({ text: "Basura: " + puntos, pos: posPuntos, size: 16, color: COLOR_TEXTO });
        k.drawText({ text: "Tiempo: " + Math.max(0, Math.ceil(tiempo)), pos: posTiempo, size: 16, color: COLOR_TEXTO });
        for (let i = 0; i < vidas; i++) {
          posCorazon.x = 400 + i * 24;
          k.drawSprite({ sprite: "corazon", pos: posCorazon, scale: ESCALA_3 });
        }
      },
    },
  ]);
  k.add([
    k.text("Toca la basura (o su número)\n¡No toques a los ajolotitos!", { size: 15, align: "center" }),
    k.pos(240, 330),
    k.anchor("center"),
    k.opacity(1),
    k.lifespan(3, { fade: 0.5 }),
    k.z(100),
  ]);

  function terminar() {
    if (terminado) return;
    terminado = true;
    for (const lugar of lugares) {
      if (lugar.cosa) lugar.cosa.destroy();
      lugar.cosa = null;
    }
    const nuevoRecord = puntos > datosJuego.mejorLimpia;
    datosJuego.mejorLimpia = Math.max(datosJuego.mejorLimpia, puntos);
    premiarMinijuego({
      titulo: vidas <= 0 ? "¡Cuidado con los ajolotitos!" : "¡Canal más limpio!",
      resultado: "Sacaste " + puntos + " basuras",
      monedas: Math.floor(puntos / BASURAS_POR_MONEDA),
      nuevoRecord,
    });
  }

  k.onKeyPress("0", () => k.go("minijuegos"));
  k.onKeyPress("escape", () => k.go("minijuegos"));
});

// ===== 8d. MINIJUEGO: MEMORAMA =====
// Voltea las tarjetas de dos en dos y encuentra las parejas.
// Se juega tocando, o con las flechas + ESPACIO.
k.scene("memorama", () => {
  empezarMusicaMinijuegos(); // si ya suena, sigue sonando
  // Los dibujos del memorama (cada uno sale 2 veces)
  const DIBUJOS = ["lombriz", "gusanoSangre", "artemia", "moneda", "corazon", "corona"].slice(0, PAREJAS_MEMORAMA);

  // Revolver las tarjetas (algoritmo de Fisher-Yates):
  // de atrás para adelante, cambiamos cada tarjeta con una al azar.
  const mazo = [...DIBUJOS, ...DIBUJOS];
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(k.rand(0, i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }

  let movimientos = 0;
  let parejas = 0;
  let primera = null;      // primera tarjeta volteada del turno
  let esperando = false;   // mientras se voltean de regreso, no se puede tocar
  let seleccion = 0;       // tarjeta elegida con el teclado
  let usaTeclado = false;  // el marco solo aparece si usas las flechas

  const COLUMNAS = 4;
  const colorTapa = k.rgb(40, 60, 90);
  const colorCara = k.rgb(230, 240, 250);
  const colorPareja = k.rgb(170, 225, 190);

  const tarjetas = mazo.map((dibujo, i) => {
    const tarjeta = k.add([
      k.rect(72, 80, { radius: 8 }),
      k.pos(111 + (i % COLUMNAS) * 86, 100 + Math.floor(i / COLUMNAS) * 92),
      k.anchor("center"),
      k.color(colorTapa),
      k.outline(3, k.rgb(120, 160, 210)),
      k.scale(1),
      k.area(),
      k.timer(),
      { dibujo, volteada: false, encontrada: false },
    ]);
    // Hijos: el dibujo (escondido) y el signo de pregunta
    tarjeta.icono = tarjeta.add([k.sprite(dibujo), k.anchor("center"), k.scale(3), k.opacity(0)]);
    tarjeta.signo = tarjeta.add([k.text("?", { size: 32 }), k.anchor("center"), k.color(120, 160, 210), k.opacity(1)]);
    tarjeta.onClick(() => {
      usaTeclado = false;
      voltear(tarjeta);
    });
    return tarjeta;
  });

  // Animación de voltear: se "aplasta" de lado, cambia de cara y se abre
  function animarVolteo(tarjeta, mostrarCara) {
    tarjeta.tween(1, 0, 0.1, (x) => { tarjeta.scale = k.vec2(x, 1); }).onEnd(() => {
      tarjeta.volteada = mostrarCara;
      tarjeta.icono.opacity = mostrarCara ? 1 : 0;
      tarjeta.signo.opacity = mostrarCara ? 0 : 1;
      tarjeta.color = mostrarCara ? colorCara : colorTapa;
      tarjeta.tween(0, 1, 0.1, (x) => { tarjeta.scale = k.vec2(x, 1); });
    });
  }

  function voltear(tarjeta) {
    if (esperando || tarjeta.volteada || tarjeta.encontrada || tarjeta === primera) return;
    sonarClick();
    animarVolteo(tarjeta, true);
    if (!primera) {
      primera = tarjeta;
      return;
    }
    // Es la segunda tarjeta del turno
    movimientos++;
    const segunda = tarjeta;
    if (primera.dibujo === segunda.dibujo) {
      // ¡Pareja!
      primera.encontrada = true;
      segunda.encontrada = true;
      const par = [primera, segunda];
      primera = null;
      parejas++;
      k.wait(0.25, () => {
        for (const t of par) t.color = colorPareja;
        k.add(crearTextoFlotante("¡Pareja!", segunda.pos.x, segunda.pos.y - 50, COLOR_DORADO));
      });
      if (parejas === PAREJAS_MEMORAMA) k.wait(0.8, terminar);
    } else {
      // No son iguales: se voltean de regreso después de un momento
      esperando = true;
      const par = [primera, segunda];
      primera = null;
      k.wait(0.8, () => {
        for (const t of par) animarVolteo(t, false);
        esperando = false;
      });
    }
  }

  // --- Teclado: flechas para moverte, ESPACIO o ENTER para voltear ---
  function mover(columnas, filas) {
    usaTeclado = true;
    const columna = (seleccion % COLUMNAS + columnas + COLUMNAS) % COLUMNAS;
    const totalFilas = tarjetas.length / COLUMNAS;
    const fila = (Math.floor(seleccion / COLUMNAS) + filas + totalFilas) % totalFilas;
    seleccion = fila * COLUMNAS + columna;
  }
  k.onKeyPress("left", () => mover(-1, 0));
  k.onKeyPress("right", () => mover(1, 0));
  k.onKeyPress("up", () => mover(0, -1));
  k.onKeyPress("down", () => mover(0, 1));
  k.onKeyPress(["space", "enter"], () => {
    usaTeclado = true;
    voltear(tarjetas[seleccion]);
  });

  // --- Marcador y marco de selección ---
  const posMovs = k.vec2(14, 12);
  const posParejas = k.vec2(250, 12);
  const colorMarco = COLOR_DORADO;
  k.add([
    k.z(100),
    {
      draw() {
        k.drawText({ text: "Movimientos: " + movimientos, pos: posMovs, size: 16, color: COLOR_TEXTO });
        k.drawText({ text: "Parejas: " + parejas + "/" + PAREJAS_MEMORAMA, pos: posParejas, size: 16, color: COLOR_TEXTO });
        if (usaTeclado && tarjetas[seleccion].exists()) {
          const t = tarjetas[seleccion];
          k.drawRect({
            pos: t.pos, width: 82, height: 90, anchor: "center", radius: 10,
            fill: false, outline: { width: 3, color: colorMarco },
          });
        }
      },
    },
  ]);
  crearBoton("Salir (0)", 430, 336, 90, () => k.go("minijuegos"));

  function terminar() {
    // Quitamos las tarjetas y el marco para que el panel se vea limpio
    usaTeclado = false;
    for (const t of tarjetas) t.destroy();
    const nuevoRecord = datosJuego.mejorMemorama === 0 || movimientos < datosJuego.mejorMemorama;
    if (nuevoRecord) datosJuego.mejorMemorama = movimientos;
    premiarMinijuego({
      titulo: "¡Encontraste todas!",
      resultado: "Lo lograste en " + movimientos + " movimientos",
      monedas: monedasMemorama(movimientos),
      nuevoRecord,
    });
  }

  k.onKeyPress("0", () => k.go("minijuegos"));
  k.onKeyPress("escape", () => k.go("minijuegos"));
});

// ===== 8e. MENÚ DE MINIJUEGOS =====
// Cada minijuego es una "ficha". Para agregar uno nuevo: haz su escena
// y agrega su ficha aquí (aparece solito en el menú).
const MINIJUEGOS = [
  {
    escena: "jugar", nombre: "Atrapa la comida", icono: "lombriz",
    descripcion: "Atrapa gusanos y esquiva la basura",
    record: () => "Récord: " + datosJuego.mejorMinijuego + " bocados",
  },
  {
    escena: "limpiar", nombre: "Limpia el canal", icono: "basura",
    descripcion: "Saca la basura, ¡no toques al ajolotito!",
    record: () => "Récord: " + datosJuego.mejorLimpia + " basuras",
  },
  {
    escena: "memorama", nombre: "Memorama", icono: "corazon",
    descripcion: "Encuentra las parejas con pocos movimientos",
    record: () => datosJuego.mejorMemorama ? "Récord: " + datosJuego.mejorMemorama + " movs." : "Sin récord",
  },
];

k.scene("minijuegos", () => {
  empezarMusicaMinijuegos(); // si ya suena, sigue sonando
  k.add([k.text("MINIJUEGOS", { size: 30 }), k.pos(240, 26), k.anchor("center"), k.color(COLOR_DORADO)]);
  k.add([
    k.text("Jugar sube el ánimo (+" + ANIMO_POR_JUGAR + ") pero da hambre (-" + COMIDA_QUE_GASTA_JUGAR + ")", { size: 12 }),
    k.pos(240, 54),
    k.anchor("center"),
  ]);
  const textoMensaje = k.add([k.text("", { size: 14 }), k.pos(240, 300), k.anchor("center"), k.color(255, 150, 150), k.timer()]);

  function elegir(minijuego) {
    // Jugar da hambre: si tiene mucha hambre, primero que coma
    if (datosJuego.alimentado < COMIDA_PARA_JUGAR) {
      textoMensaje.text = "Tu ajolote tiene hambre. ¡Primero dale de comer!";
      textoMensaje.wait(2.5, () => { textoMensaje.text = ""; });
      return;
    }
    k.go(minijuego.escena);
  }

  MINIJUEGOS.forEach((minijuego, i) => {
    const tarjeta = k.add([
      k.rect(146, 200, { radius: 12 }),
      k.pos(85 + i * 155, 175),
      k.anchor("center"),
      k.color(40, 60, 90),
      k.outline(3, k.rgb(120, 160, 210)),
      k.area(),
    ]);
    tarjeta.add([k.text(String(i + 1), { size: 14 }), k.pos(-56, -84), k.anchor("center"), k.color(120, 160, 210)]);
    tarjeta.add([k.sprite(minijuego.icono), k.pos(0, -52), k.anchor("center"), k.scale(4)]);
    tarjeta.add([k.text(minijuego.nombre, { size: 15, width: 132, align: "center" }), k.pos(0, -6), k.anchor("center")]);
    tarjeta.add([k.text(minijuego.descripcion, { size: 11, width: 128, align: "center" }), k.pos(0, 34), k.anchor("center"), k.color(190, 205, 225)]);
    tarjeta.add([k.text(minijuego.record(), { size: 11 }), k.pos(0, 78), k.anchor("center"), k.color(COLOR_DORADO)]);
    tarjeta.onClick(() => {
      sonarClick();
      elegir(minijuego);
    });
    tarjeta.onHover(() => { tarjeta.color = k.rgb(55, 85, 125); });
    tarjeta.onHoverEnd(() => { tarjeta.color = k.rgb(40, 60, 90); });
    k.onKeyPress(String(i + 1), () => elegir(minijuego));
  });

  crearBoton("Volver (0)", 240, 336, 160, () => k.go("acuario"));
  k.onKeyPress("0", () => k.go("acuario"));
  k.onKeyPress("escape", () => k.go("acuario"));
});

// ===== 8f. ESCENA DE LOGROS =====
k.scene("logros", () => {
  const ganados = datosJuego.logros.length;
  k.add([k.text("LOGROS", { size: 26 }), k.pos(240, 20), k.anchor("center"), k.color(COLOR_DORADO)]);
  k.add([
    k.text(ganados + " de " + LOGROS.length + "   ·   Día " + diasVivo() + "   ·   Récord: " + datosJuego.recordDias + " días", { size: 13 }),
    k.pos(240, 44),
    k.anchor("center"),
  ]);

  // Tarjetas en 2 columnas. Los que no has ganado se ven grises.
  LOGROS.forEach((logro, numero) => {
    const ganado = datosJuego.logros.includes(logro.id);
    const columna = numero % 2;
    const fila = Math.floor(numero / 2);
    const tarjeta = k.add([
      k.rect(226, 27, { radius: 6 }),
      k.pos(10 + columna * 234, 54 + fila * 29),
      k.color(ganado ? k.rgb(60, 45, 20) : k.rgb(40, 48, 66)),
      k.outline(2, ganado ? COLOR_DORADO : k.rgb(70, 80, 100)),
    ]);
    tarjeta.add([
      k.sprite("trofeo"),
      k.pos(16, 13),
      k.anchor("center"),
      k.scale(2),
      // color() multiplica el dibujo: gris oscuro = trofeo "apagado"
      k.color(ganado ? k.rgb(255, 255, 255) : k.rgb(70, 70, 80)),
    ]);
    tarjeta.add([k.text(logro.nombre, { size: 11 }), k.pos(34, 2), k.color(ganado ? COLOR_DORADO : k.rgb(150, 160, 180))]);
    tarjeta.add([k.text(logro.descripcion, { size: 9 }), k.pos(34, 15), k.color(ganado ? COLOR_TEXTO : k.rgb(120, 130, 150))]);
  });

  crearBoton("Volver (0)", 240, 336, 160, () => k.go("acuario"));
  k.onKeyPress("0", () => k.go("acuario"));
  k.onKeyPress("escape", () => k.go("acuario"));
});

// ===== 9. ESCENA DE LA TIENDA =====
k.scene("tienda", () => {
  k.add([k.text("TIENDA", { size: 30 }), k.pos(240, 22), k.anchor("center"), k.color(COLOR_DORADO)]);
  const textoMonedas = k.add([k.text("", { size: 16 }), k.pos(240, 50), k.anchor("center")]);
  const textoMensaje = k.add([k.text("", { size: 14 }), k.pos(240, 308), k.anchor("center"), k.timer()]);

  function mostrarMensaje(texto) {
    textoMensaje.text = texto;
    textoMensaje.wait(2, () => { textoMensaje.text = ""; });
  }

  // ¿Qué dice la etiqueta de cada artículo?
  function textoEstado(articulo) {
    if (!datosJuego.comprados.includes(articulo.id)) return articulo.precio + " monedas";
    const puesto = articulo.tipo === "sombrero"
      ? datosJuego.sombreroPuesto === articulo.id
      : datosJuego.decoracionesPuestas.includes(articulo.id);
    return puesto ? "Quitar" : "Poner";
  }

  // Al hacer click en un artículo: comprar, poner o quitar
  function usarArticulo(articulo) {
    // 1) Si no lo tiene, intentamos comprarlo
    if (!datosJuego.comprados.includes(articulo.id)) {
      if (datosJuego.monedas < articulo.precio) {
        mostrarMensaje("Te faltan monedas. ¡Cuida y saluda a tu ajolote!");
        return;
      }
      datosJuego.monedas -= articulo.precio;
      datosJuego.comprados.push(articulo.id);
      mostrarMensaje("¡Compraste: " + articulo.nombre + "!");
    }
    // 2) Ponerlo o quitarlo
    if (articulo.tipo === "sombrero") {
      // Solo un sombrero a la vez
      datosJuego.sombreroPuesto = datosJuego.sombreroPuesto === articulo.id ? null : articulo.id;
    } else {
      const lista = datosJuego.decoracionesPuestas;
      const lugar = lista.indexOf(articulo.id);
      if (lugar >= 0) lista.splice(lugar, 1); // ya estaba: lo quitamos
      else lista.push(articulo.id);           // no estaba: lo ponemos
    }
    actualizarTarjetas();
    revisarLogros();
  }

  // --- Tarjetas de los artículos (2 filas de 3) ---
  const tarjetas = ARTICULOS.map((articulo, numero) => {
    const columna = numero % 3;
    const fila = Math.floor(numero / 3);
    const tarjeta = k.add([
      k.rect(140, 105, { radius: 10 }),
      k.pos(90 + columna * 150, 125 + fila * 118),
      k.anchor("center"),
      k.color(40, 60, 90),
      k.outline(3, k.rgb(120, 160, 210)),
      k.area(),
    ]);
    // Hijos de la tarjeta: dibujo, nombre y estado
    tarjeta.add([k.sprite(articulo.id), k.pos(0, -18), k.anchor("center"), k.scale(3)]);
    tarjeta.add([k.text(articulo.nombre, { size: 13 }), k.pos(0, 22), k.anchor("center")]);
    const etiqueta = tarjeta.add([k.text("", { size: 13 }), k.pos(0, 40), k.anchor("center"), k.color(COLOR_DORADO)]);
    tarjeta.onClick(() => {
      sonarClick();
      usarArticulo(articulo);
    });
    return { tarjeta, etiqueta, articulo };
  });

  // Actualizamos los textos SOLO cuando algo cambia (no en cada fotograma)
  function actualizarTarjetas() {
    textoMonedas.text = "Tus monedas: " + datosJuego.monedas;
    for (const { tarjeta, etiqueta, articulo } of tarjetas) {
      etiqueta.text = textoEstado(articulo);
      const puesto = etiqueta.text === "Quitar";
      tarjeta.color = puesto ? k.rgb(50, 110, 70) : k.rgb(40, 60, 90);
    }
  }
  actualizarTarjetas();

  crearBoton("Volver (0)", 240, 340, 160, () => k.go("acuario"));
  k.onKeyPress("0", () => k.go("acuario"));
  k.onKeyPress("escape", () => k.go("acuario"));
});

// ===== 10. ESCENA DE DESPEDIDA =====
k.scene("despedida", () => {
  detenerMusicaMinijuegos();
  k.add([k.sprite(spriteAjolote(), { anim: "triste" }), k.pos(240, 110), k.anchor("center"), k.scale(ETAPAS[etapaActual()].escala * 1.4)]);
  k.add([k.text(nombreAjolote() + " se enfermó...", { size: 26 }), k.pos(240, 190), k.anchor("center")]);
  k.add([
    k.text("En la vida real necesitan agua limpia y fría.", { size: 14, width: 440, align: "center" }),
    k.pos(240, 230),
    k.anchor("center"),
  ]);
  k.add([
    k.text("Vivió " + diasVivo() + (diasVivo() === 1 ? " día" : " días") + "   ·   Récord: " + datosJuego.recordDias, { size: 16 }),
    k.pos(240, 262),
    k.anchor("center"),
    k.color(COLOR_DORADO),
  ]);
  k.add([k.text("Toca o presiona ESPACIO para intentarlo de nuevo", { size: 16 }), k.pos(240, 300), k.anchor("center")]);

  function reiniciar() {
    reiniciarNecesidades();
    k.go("inicio");
  }
  k.onKeyPress("space", reiniciar);
  k.onMousePress(reiniciar);
});

// ===== 11. ARRANCAR EL JUEGO =====
// k.go() nos lleva a una escena, como abrir la puerta de un cuarto.
k.go("inicio");

// ===== 12. AUDIO DE COMER (incrustado) =====
// Este es el archivo sonidos/comer.mp3 convertido a texto (base64).
// Va hasta el final porque es muy largo. Una "function" se puede usar
// aunque esté escrita más abajo (JavaScript la "sube" al inicio).
function sonidoComerDatos() {
  return "data:audio/mpeg;base64,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0InM//4lu21MQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7csS0g9HVHw4tGHiAAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
}

// ===== 13. AUDIO DEL CLICK (incrustado) =====
// sonidos/click.wav convertido a texto. Lo hicimos con código (sin licencias):
// un tono que baja rápido de 1500 Hz a 650 Hz, como una burbuja que revienta.
// Es .wav y no .mp3 porque el mp3 trae un pedacito de silencio al inicio,
// y un click tiene que sonar AL INSTANTE.
function sonidoClickDatos() {
  return "data:audio/wav;base64,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";
}
