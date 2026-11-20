# Axobiot

Tamagotchi de ajolote hecho con [KAPLAY](https://kaplayjs.com) v4000.

## Cómo jugar

Abre `index.html` en el navegador (o sírvelo con `npx serve .`).

- **1 / Alimentar**: suelta comida de ajolote: lombriz, gusano de sangre o artemia.
- **2 / Saludar** o click en el ajolote: se pone feliz.
- **Click en las manchas**: limpias el agua.
- **Monedas**: cae una cada 15 min (5 min si saludas 3 veces). Click para recogerla.
- **3 / Tienda**: sombreros y decoraciones.

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
