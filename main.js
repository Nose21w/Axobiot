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
};

// Si el ajolote se enferma, reiniciamos sus necesidades,
// pero NO las monedas ni lo comprado (¡eso ya te lo ganaste!).
function reiniciarNecesidades() {
  Object.assign(datosJuego, necesidadesIniciales);
  datosJuego.segundosMancha = 0;
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
    if (texto) Object.assign(datosJuego, JSON.parse(texto));
  } catch (error) {
    // Partida dañada o sin permiso: empezamos de nuevo
  }
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
function crearImagenPixel(cuadros) {
  const alto = cuadros[0].length;
  const ancho = Math.max(...cuadros[0].map((fila) => fila.length));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * cuadros.length;
  lienzo.height = alto;
  const pincel = lienzo.getContext("2d");

  cuadros.forEach((cuadro, numero) => {
    cuadro.forEach((fila, y) => {
      for (let x = 0; x < fila.length; x++) {
        const color = PALETA[fila[x]];
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
const dibujosSimples = {
  lombriz: dibujoLombriz, gusanoSangre: dibujoGusanoSangre, artemia: dibujoArtemia,
  mancha: dibujoMancha, basura: dibujoBasura,
  corazon: dibujoCorazon, moneda: dibujoMoneda,
  fiesta: dibujoFiesta, copa: dibujoCopa, corona: dibujoCorona,
  tronco: dibujoTronco, cofre: dibujoCofre, castillo: dibujoCastillo,
};
for (const nombre in dibujosSimples) {
  k.loadSprite(nombre, crearImagenPixel([dibujosSimples[nombre]]));
}

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
const COMIDAS = [
  { sprite: "lombriz", nombre: "una lombriz" },
  { sprite: "gusanoSangre", nombre: "un gusano de sangre" },
  { sprite: "artemia", nombre: "una artemia" },
];

const crearBocado = (x, comida) => [
  k.sprite(comida.sprite),
  k.pos(x, PECERA.arriba + 10),
  k.anchor("center"),
  k.scale(2.5),
  // isSensor: true = "avísame cuando toque algo".
  // En v4000, sin esto (o sin body()) NO se detectan colisiones.
  k.area({ isSensor: true }),
  "bocado",
  { nombre: comida.nombre }, // para decir qué se comió
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
  boton.onClick(accion);
  return boton;
}

// ===== 7. ESCENA DE INICIO =====
// Una escena es como un cuarto de una casa:
// cada cuarto tiene sus propias cosas.
k.scene("inicio", () => {
  k.add([k.text("AXOBIOT", { size: 48 }), k.pos(240, 90), k.anchor("center"), k.color(255, 173, 198)]);
  k.add([k.sprite("ajolote", { anim: "nadar" }), k.pos(240, 190), k.anchor("center"), k.scale(5)]);
  k.add([k.text("Click o ESPACIO para empezar", { size: 18 }), k.pos(240, 290), k.anchor("center")]);

  function empezar() {
    // Si se enfermó mientras no estabas, vamos directo a la despedida
    k.go(datosJuego.salud <= 0 ? "despedida" : "acuario");
  }
  k.onKeyPress("space", empezar);
  k.onMousePress(empezar);
});

// ===== 8. ESCENA DEL ACUARIO (juego principal) =====
k.scene("acuario", () => {

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

  // --- El ajolote ---
  const ajolote = k.add([
    k.sprite("ajolote", { anim: "nadar" }),
    k.pos(240, 180),
    k.anchor("center"),
    k.scale(3),
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
  const SOMBRERO_DERECHA = k.vec2(4, -3);
  const SOMBRERO_IZQUIERDA = k.vec2(-4, -3);
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

  ajolote.onUpdate(() => {
    if (bocadoActual) {
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

  // COLISIÓN 2: el ajolote toca el bocado → se lo come
  ajolote.onCollide("bocado", (bocado) => {
    bocado.destroy();
    bocadoActual = null;
    datosJuego.alimentado = Math.min(100, datosJuego.alimentado + 25);
    datosJuego.salud = Math.min(100, datosJuego.salud + 5);
    mostrarMensaje("¡Ñam! Se comió " + bocado.nombre);
  });

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
    ajolote.tween(k.vec2(3.8, 2.4), ESCALA_3, 0.5, (escala) => {
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

  // Si estuviste fuera un buen rato, te contamos cuánto
  if (segundosFuera > 10 * 60) {
    mostrarMensaje("Estuviste fuera " + formatoAusencia(segundosFuera));
  }

  // --- TOCAR EL AGUA: el ajolote nada hacia ahí ---
  k.onMousePress(() => {
    const punto = k.mousePos();
    if (!estaEnPecera(punto)) return;
    // Si tocaste una mancha, una moneda o al ajolote, eso tiene su propia acción
    const tocoAlgo = ["mancha", "moneda", "ajolote"]
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

  // Jugar da hambre: si tiene mucha hambre, primero que coma
  function irAJugar() {
    if (datosJuego.alimentado < COMIDA_PARA_JUGAR) {
      mostrarMensaje("Tiene hambre. ¡Primero dale de comer!");
      return;
    }
    k.go("jugar");
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
  const posTextoSaludos = k.vec2(300, 41);

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
      },
    },
  ]);

  // --- El paso del tiempo ---
  k.onUpdate(() => {
    // El reloj real manda: ponerAlDia() baja la comida, el ánimo, etc.
    ponerAlDia();
    tiempoFeliz = Math.max(0, tiempoFeliz - k.dt());
    revisarMoneda();
    revisarManchas();
    const limpieza = calcularLimpieza();

    // La vida del ajolote sigue a la salud guardada.
    // Si llega a 0, el componente health() dispara onDeath().
    ajolote.hp = datosJuego.salud;

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

// ===== 8b. MINIJUEGO: ATRAPA LA COMIDA =====
// Mueve al ajolote para atrapar lombrices, gusanos y artemias.
// ¡Esquiva la basura! Cada 10 bocados ganas 1 moneda.
k.scene("jugar", () => {
  let puntos = 0;
  let vidas = VIDAS_MINIJUEGO;
  let tiempo = SEGUNDOS_MINIJUEGO;
  let terminado = false;
  let tiempoCaraFeliz = 0;

  // --- Fondo: agua y arena ---
  k.add([k.rect(480, 262), k.pos(0, 40), k.color(60, 140, 190), k.z(-1)]);
  k.add([k.rect(480, 58), k.pos(0, 302), k.color(222, 196, 140), k.z(-1)]);

  // --- El ajolote (nada solo de lado a lado, abajo) ---
  const jugador = k.add([
    k.sprite("ajolote", { anim: "nadar" }),
    k.pos(240, 288),
    k.anchor("center"),
    k.scale(3),
    // scale en area() hace la zona de choque un poco más chica que el dibujo,
    // así se siente más justo cuando algo "casi" lo toca.
    k.area({ isSensor: true, scale: k.vec2(0.8, 0.6) }),
  ]);
  // Si trae sombrero, también juega con él puesto
  let sombrero = null;
  if (datosJuego.sombreroPuesto) {
    sombrero = jugador.add([k.sprite(datosJuego.sombreroPuesto), k.pos(4, -3), k.anchor("bot")]);
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
      sombrero.pos = jugador.flipX ? k.vec2(-4, -3) : k.vec2(4, -3);
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

    const monedasGanadas = Math.floor(puntos / PUNTOS_POR_MONEDA);
    datosJuego.monedas += monedasGanadas;
    datosJuego.animo = Math.min(100, datosJuego.animo + ANIMO_POR_JUGAR);
    datosJuego.alimentado = Math.max(0, datosJuego.alimentado - COMIDA_QUE_GASTA_JUGAR);
    guardarPartida();

    const panel = k.add([
      k.rect(320, 190, { radius: 12 }),
      k.pos(240, 175),
      k.anchor("center"),
      k.color(40, 60, 90),
      k.outline(3, k.rgb(120, 160, 210)),
      // Sin z(): como se agrega al final, ya se dibuja encima.
      // (En v4000, si le pones z al papá, sus hijos de texto quedan atrás)
    ]);
    panel.add([k.text(vidas <= 0 ? "¡Mucha basura!" : "¡Se acabó el tiempo!", { size: 22 }), k.pos(0, -65), k.anchor("center"), k.color(COLOR_DORADO)]);
    panel.add([k.text("Atrapaste " + puntos + " bocados", { size: 16 }), k.pos(0, -30), k.anchor("center")]);
    panel.add([k.text("Monedas: +" + monedasGanadas, { size: 16 }), k.pos(0, -5), k.anchor("center"), k.color(COLOR_DORADO)]);
    panel.add([k.text("Ánimo: +" + ANIMO_POR_JUGAR + "   Comida: -" + COMIDA_QUE_GASTA_JUGAR, { size: 14 }), k.pos(0, 20), k.anchor("center")]);
    crearBoton("Volver (0)", 240, 235, 160, () => k.go("acuario"));
  }

  // Salir: si sales antes de terminar, no hay premio
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
    tarjeta.onClick(() => usarArticulo(articulo));
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
  k.add([k.sprite("ajolote", { anim: "triste" }), k.pos(240, 110), k.anchor("center"), k.scale(4)]);
  k.add([k.text("Tu ajolote se enfermó...", { size: 26 }), k.pos(240, 190), k.anchor("center")]);
  k.add([
    k.text("En la vida real necesitan agua limpia y fría.", { size: 14, width: 440, align: "center" }),
    k.pos(240, 230),
    k.anchor("center"),
  ]);
  k.add([k.text("Click o ESPACIO para intentarlo de nuevo", { size: 16 }), k.pos(240, 300), k.anchor("center")]);

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
