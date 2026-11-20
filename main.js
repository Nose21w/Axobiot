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
  inicioEsperaMoneda: 0,      // en qué segundo del juego empezó la espera
  saludosParaMoneda: 0,       // saludos dados durante esta espera (máximo 3)
  monedasEnPecera: 0,         // monedas que cayeron y aún no recoges
};

// Si el ajolote se enferma, reiniciamos sus necesidades,
// pero NO las monedas ni lo comprado (¡eso ya te lo ganaste!).
function reiniciarNecesidades() {
  Object.assign(datosJuego, necesidadesIniciales);
}

// Reglas del juego (cámbialas para hacerlo más fácil o difícil)
const BAJA_ALIMENTO_POR_SEGUNDO = 1.2;
const BAJA_ANIMO_POR_SEGUNDO = 0.8;
const SEGUNDOS_ENTRE_MANCHAS = 6;
const MAXIMO_MANCHAS = 7;

// Tiempos de las monedas.
// 💡 Para PROBAR rápido, cambia SEGUNDOS_POR_MINUTO a 1:
// así "15 minutos" duran 15 segundos. Antes de entregar, regrésalo a 60.
const SEGUNDOS_POR_MINUTO = 60;
const MINUTOS_MONEDA_NORMAL = 15;
const MINUTOS_MONEDA_RAPIDA = 5;
const SALUDOS_PARA_ACELERAR = 3;

// ¿Cuántos segundos hay que esperar para la siguiente moneda?
function segundosDeEspera() {
  const minutos = datosJuego.saludosParaMoneda >= SALUDOS_PARA_ACELERAR
    ? MINUTOS_MONEDA_RAPIDA
    : MINUTOS_MONEDA_NORMAL;
  return minutos * SEGUNDOS_POR_MINUTO;
}

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
  mancha: dibujoMancha,
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
    // El reloj de la primera moneda empieza a contar ahora
    datosJuego.inicioEsperaMoneda = k.time();
    datosJuego.saludosParaMoneda = 0;
    k.go("acuario");
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
  ajolote.onUpdate(() => {
    if (bocadoActual) {
      // Si hay comida, nada directo hacia ella
      ajolote.moveTo(bocadoActual.pos, VELOCIDAD_PERSEGUIR);
      ajolote.flipX = bocadoActual.pos.x < ajolote.pos.x;
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
    ajolote.hp += 5; // en v4000 la vida se cambia así (no con heal())
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
  for (let i = 0; i < datosJuego.manchas; i++) agregarMancha();

  // Cada cierto tiempo el agua se ensucia un poco más
  k.loop(SEGUNDOS_ENTRE_MANCHAS, () => {
    if (datosJuego.manchas < MAXIMO_MANCHAS) {
      datosJuego.manchas++;
      agregarMancha();
    }
  });

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

  // ¿Ya es hora de que caiga una moneda?
  // k.time() es el reloj del juego: cuenta los segundos desde que empezó,
  // aunque cambies de escena (por ejemplo, si vas a la tienda).
  function revisarMoneda() {
    const transcurrido = k.time() - datosJuego.inicioEsperaMoneda;
    if (transcurrido >= segundosDeEspera()) {
      datosJuego.monedasEnPecera++;
      soltarMoneda(k.rand(PECERA.izq + 30, PECERA.der - 30), PECERA.arriba + 10);
      mostrarMensaje("¡Cayó una moneda! Dale click.");
      // Empieza una nueva espera desde cero
      datosJuego.inicioEsperaMoneda = k.time();
      datosJuego.saludosParaMoneda = 0;
    }
  }

  // --- Botones (click/dedo) y teclas (para botones físicos) ---
  crearBoton("Alimentar (1)", 88, 330, 145, soltarBocado);
  crearBoton("Saludar (2)", 240, 330, 145, saludarAjolote);
  crearBoton("Tienda (3)", 392, 330, 145, () => k.go("tienda"));
  k.onKeyPress("1", soltarBocado);
  k.onKeyPress("2", saludarAjolote);
  k.onKeyPress("3", () => k.go("tienda"));

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
        const faltan = segundosDeEspera() - (k.time() - datosJuego.inicioEsperaMoneda);
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
    datosJuego.alimentado = Math.max(0, datosJuego.alimentado - BAJA_ALIMENTO_POR_SEGUNDO * k.dt());
    datosJuego.animo = Math.max(0, datosJuego.animo - BAJA_ANIMO_POR_SEGUNDO * k.dt());
    tiempoFeliz = Math.max(0, tiempoFeliz - k.dt());
    revisarMoneda();
    const limpieza = calcularLimpieza();

    // Si está mal cuidado pierde salud; si está bien, se recupera
    if (datosJuego.alimentado <= 0 || limpieza < 30) {
      ajolote.hp -= 4 * k.dt();
    } else if (datosJuego.alimentado > 50 && limpieza > 60) {
      ajolote.hp += 1 * k.dt();
    }
    datosJuego.salud = ajolote.hp;

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
