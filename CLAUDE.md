# Notas para Claude

Lee `README.md` primero. Esto son las reglas que no se deducen del código.

## Idioma

**Todo en español**: comentarios, mensajes de error, nombres de variables y
funciones, mensajes de commit.

**Menos lo que el front ya lee.** Las respuestas de la API mantienen sus
nombres en inglés (`basePrice`, `printSides`, `sideKey`, `displayName`).
Traducirlos obligaría a tocar el front en el mismo cambio que toca la base de
datos, y entonces un fallo no dice de cuál de los dos lados viene.

## Comentarios

Explican **por qué**, nunca qué. Los que valen la pena son los que evitan que
alguien "arregle" algo a propósito:

- por qué son tres pools de Cognito y no uno con grupos,
- por qué las fotos de prenda llevan `esquinas` O `banda` y no siempre lo mismo,
- por qué un recargo de lado en `null` no es lo mismo que uno en cero.

## Portar una Lambda

La lógica de `P-P-Custom/services/*` es la verdad del negocio y está muy
comentada: **léela entera antes de reescribirla**, y trae los comentarios que
expliquen un porqué. Lo que se tira es el andamiaje (el router, `http.ts`,
`dynamo.ts`), no las decisiones.

Y cuando termines un módulo, **compara la respuesta con la de AWS**, que sigue
en pie. Eso ya encontró cinco fallos que ninguna prueba habría visto: el
`perSidePrice` que se perdía entero, los días de producción que vivían en
`production.meta.diasProduccion`, el `enabled` de los lados, las fotos de
cilindro sin geometría y un índice único que se comía doce de dieciocho fotos.

## Lo que no hay que hacer

- **No aceptes del navegador nada que decida cuánto se cobra.** Ni el precio,
  ni el peso, ni el costo del envío. El checkout manda qué se pide y a dónde;
  los números salen de la base o del proveedor externo. Está comprobado que se
  puede falsificar el cuerpo: se probó y se ignoró.
- **No pongas a una petición a esperar a un tercero.** Cotizar tarda ~5 s y una
  guía puede tardar minutos. Eso va a la cola, se devuelve un id y se consulta
  después. Tener servidor no lo cambia.
- **No dispares una petición a un proveedor externo por cada tecla o clic.**
  Skydropx admite 2 por segundo. Siete clics en "+1" tumbaron el checkout.
- **No sirvas los buckets en abierto**, ni los mockups. El editor hace
  `getImageData()` sobre ellos y desde otro origen el canvas queda contaminado
  y el teñido de prenda se apaga sin decir nada.
- **No devuelvas el token de seguimiento.** Lo que se guarda es su huella; el
  token vive sólo en el enlace que se le manda al comprador.
- **No inventes columnas "por si acaso".** `escalas` para precios por cantidad
  llegó a estar declarada y no existe tal cosa en el negocio: el precio es el
  base más lo que suman los lados.
