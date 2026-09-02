# Pulso Runner - ajustes estilo Chrome Dino

Cambios principales:
- El juego usa un tamaño lógico fijo de 960x360 y `FIT`, evitando que la escala dependa directamente de la altura de la pantalla.
- `pulse-runner.png` se fuerza a un tamaño visual de 58x58 px, independientemente de la resolución original del PNG.
- El jugador está anclado por los pies (`origin 0.5, 1`) para que permanezca sobre la línea del suelo.
- Se corrigió la gravedad: antes `main.ts` usaba 700 mientras el cálculo de GameConfig asumía 2000. Ahora ambos usan 2400.
- El salto es más rápido y corto: -900 de velocidad vertical con gravedad 2400.
- Los obstáculos aparecen por distancia, no por la posición de otro obstáculo, para un comportamiento más parecido a Chrome Dino.
- La velocidad empieza en 330 y aumenta gradualmente.
- El juego tiene fondo blanco y una línea de suelo simple.

## Asset

Coloca el archivo:

`public/assets/pulse-runner.png`

La carga usa una ruta relativa (`./assets/pulse-runner.png`) para funcionar mejor dentro de un WebView/app.

## Ejecutar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
