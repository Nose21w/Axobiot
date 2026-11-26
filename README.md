# Axobiot

Tamagotchi de ajolote hecho con [KAPLAY](https://kaplayjs.com) v4000.

## Cómo jugar

Abre `index.html` en el navegador (o sírvelo con `npx serve .`).

## En el celular

El juego funciona con el dedo, se juega en horizontal y se puede instalar como app.

1. Súbelo a internet con **GitHub Pages**: en el repositorio ve a
   *Settings → Pages → Build and deployment*, elige *Deploy from a branch*,
   selecciona la rama y la carpeta `/ (root)` y guarda. En unos minutos te da un link.
2. Abre el link en el celular, o escanea el código QR de la carpeta `qr/`:
   - `qr/qr-axobiot.png`: solo el código.
   - `qr/cartel-axobiot.png`: cartel tamaño carta para imprimir, con instrucciones.

   El QR apunta a https://nose21w.github.io/Axobiot/ y solo funciona
   después de activar GitHub Pages.
3. Instálalo:
   - **Android (Chrome):** menú ⋮ → *Instalar app* o *Agregar a pantalla principal*.
   - **iPhone (Safari):** botón compartir → *Agregar a inicio*.

Una vez abierto, funciona sin internet. Si cambias el juego, sube el número de
`VERSION` en `sw.js` para que los celulares descarguen la versión nueva.

En Android se bloquea en horizontal; en iPhone (que no lo permite) sale un aviso
para girar el celular.

- **Tu ajolote**: al empezar le pones **nombre** y eliges su **color** (leucístico, salvaje, dorado o melanoide, como los ajolotes de verdad).
- **Crece**: nace como **larva**, a las 24 h bien cuidado pasa a **joven** y a los 3 días bien cuidado es **adulto**
  (bien cuidado = con comida, agua limpia y ánimo). En la esquina de la pecera dice cuánto le falta.
- **Toca el agua**: el ajolote nada hacia ahí.
- **Burbuja**: el ajolote te muestra lo que necesita (comida, limpieza o cariño).
- **1 / Comer**: suelta comida de ajolote: lombriz, gusano de sangre o artemia.
- **2 / Saludar** o click en el ajolote: se pone feliz.
- **Click en las manchas**: limpias el agua.
- **Monedas**: cae una cada 15 min (5 min si saludas 3 veces). Click para recogerla.
- **3 / Tienda**: sombreros y decoraciones.
- **5 / Trofeo** (esquina de la pecera): tus logros. Cada logro da 1 moneda.
- **Día N** (arriba a la derecha): cuántos días lleva vivo tu ajolote.
- **4 / Jugar**: abre el menú de **minijuegos** (elige con el dedo o con 1, 2, 3).
  Todos dan monedas, suben el ánimo y dan hambre; si tiene mucha hambre, primero hay que alimentarlo.
  1. **Atrapa la comida**: muévete con ← →, las teclas 1/2 o tocando. Atrapa gusanos y esquiva la basura (10 bocados = 1 moneda).
  2. **Limpia el canal**: toca la basura (o su número del 1 al 9) antes de que se hunda. ¡No toques a los ajolotitos! (8 basuras = 1 moneda).
  3. **Memorama**: encuentra las 6 parejas tocando o con flechas + ESPACIO. Menos movimientos = más monedas (hasta 3).

## Comer

Al comer suena un audio de 1.5 s y la comida se va achicando en
7 mordidas, al ritmo del sonido. Los tiempos de cada mordida están en
`MORDIDAS` en `main.js`: si cambias el audio, cámbialos también.

El audio va **dentro de `main.js`** (función `sonidoComerDatos()`, al final),
así que basta copiar `main.js` para que suene, también en KAPLAYGROUND.
El archivo original está en `sonidos/comer.mp3`. Si el navegador no puede
leer el audio, el juego sigue funcionando sin sonido.

## El tiempo pasa aunque no juegues

Como un tamagotchi, el juego usa el reloj real del dispositivo y guarda la partida
(`localStorage`). Al volver a abrirlo, aplica todo el tiempo que estuvo cerrado:

- La comida se acaba en 6 h y el ánimo en 8 h.
- Aparece una mancha cada 45 min (máximo 7).
- Cae una moneda cada 15 min (máximo 5 sin recoger).
- Mal cuidado, pierde toda la salud en 12 h; bien cuidado, se cura en 4 h.

Para probar rápido, cambia `VELOCIDAD_DEL_TIEMPO` a `60` en `main.js`
(1 minuto real = 1 hora de juego). Antes de entregar, regrésalo a `1`.

El dispositivo necesita tener la hora correcta (con internet o con batería de reloj).
