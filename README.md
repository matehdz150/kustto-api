# kustto-api

La API de Kustto. NestJS + PostgreSQL (Drizzle) + Redis (BullMQ), en Docker.

Sustituye a la infraestructura serverless de AWS: seis Lambdas detrás de una
API Gateway, con DynamoDB de tabla única, SQS y SES. **Se quedan S3 y
Cognito**, y nada más.

## Puesta en marcha

```bash
cp .env.example .env    # y llénalo
docker compose up
```

Levanta Postgres, Redis, aplica las migraciones y arranca la API y los
workers. La API queda en `http://localhost:8001`.

**Los puertos del host no son los de dentro** (8001, 5434, 6381): en esta
máquina ya corre otro compose con 8000, 5432/5433 y 6379/6380 ocupados. Dentro
de la red de Docker los servicios se llaman por su nombre y esto no importa; se
cambia con `PUERTO_API`, `PUERTO_POSTGRES` y `PUERTO_REDIS`.

**S3 y Cognito no están en el compose, a propósito.** Emularlos en local
—localstack, un pool falso— da un sistema que funciona en una máquina y se rompe
en el primer despliegue por una diferencia de la emulación. Se habla con los de
verdad, con las credenciales del `.env`.

## Traer los datos de DynamoDB

```bash
AWS_PROFILE=kustto-admin pnpm db:desde-dynamo
```

Lee la tabla `kustto-prod` y la escribe en Postgres. **Es idempotente y no
borra nada del origen.** Se puede correr las veces que haga falta.

Lo que NO trae, a propósito: los ítems `LOCK` de slug, folio, correo de taller
y código de evento. Existían porque en DynamoDB no hay `UNIQUE`; aquí son
índices únicos y esos 38 ítems ya no representan nada.

## El mapa

```
src/
├── config/     el entorno, validado al arrancar (falla ahí, no en la 1ª petición)
├── db/         Drizzle: el esquema y el migrador
├── auth/       los guards de Cognito, uno por pool
├── almacen/    S3
├── colas/      BullMQ
├── correo/     SMTP
├── catalogo/   el catálogo público   ← portado
├── salud/      el healthcheck de Docker
└── workers/    el proceso de los workers (misma imagen, otro comando)
```

### Tres pools de Cognito, no uno

`GuardComprador`, `GuardTaller` y `GuardAdmin`. El guard valida **emisor y
audiencia**, no grupos: con un solo pool y grupos dentro, un token de taller
abriría `/cuenta/*` y la única defensa sería una comprobación que alguien puede
olvidar en una ruta nueva. Así, un token del pool equivocado ni pasa la firma.

### Dos imágenes, no una

`Dockerfile` construye la API **y** los workers de TypeScript: comparten
esquema, servicios y configuración, y separarlas las desincroniza. Lo que va
aparte es el worker de **bordado**, que necesita Ink/Stitch, Python, GTK y xvfb
—cientos de megas por algo que hoy está apagado—. Lo consume un proceso TS que
lee de BullMQ y llama al binario, para que haya **un solo protocolo de cola** en
todo el sistema.

## Lo que cambia respecto a las Lambdas

**Las respuestas no cambian.** Los caminos (`/publico/catalogo`, …) y la forma
del JSON son los mismos, nombres en inglés incluidos. La migración cambia de
dónde salen los datos, no cómo se pintan; si además cambiara la forma, un fallo
no diría de cuál de las dos cosas viene. Está comprobado campo por campo contra
la API de AWS en marcha.

**El modelo de datos sí.** El producto era UN ítem con todo dentro; ahora son
doce tablas. Las existencias se descuentan con un `UPDATE ... WHERE cantidad >=
piezas` en vez de una expresión condicional sobre el documento entero, y los
candados de unicidad son índices.

**El correo va por SMTP**, no por el SDK de SES. Hoy apunta al mismo SES; el día
que se cambie de proveedor cambia una variable. Sin `SMTP_URL` no manda y lo
dice en el log: un pedido cobrado no puede fallar porque el correo no salga.

## Pedidos y compras

**Una compra, y por dentro un pedido por taller.** No es un pedido con líneas
de varios: el taller produce, cobra y envía lo suyo, y su estado es suyo. Con
un pedido compartido, "en producción" dejaría de significar algo.

El folio corto (#481902) es de la COMPRA; cada parte es `#481902-1`,
`#481902-2`, así que el cliente dice un número y el taller reconoce el suyo
dentro.

**Del navegador no se acepta nada que decida cuánto se cobra.** El producto se
lee de la base y de ahí salen el taller, el precio y las medidas; el precio del
envío sale de la cotización guardada. Sólo se aceptan cantidades, lados
elegidos, color y dos ids de cotización.

**Todo lo que decide el precio se congela en la partida**, no se referencia. El
producto puede subir de precio o desaparecer del catálogo mañana; el pedido es
un documento de lo que se acordó.

**Las existencias no bloquean la venta.** Se puede comprar sin blancos
avisando de más días, porque el taller los compra; el stock puede quedar
negativo y eso es información — un -2 le dice al taller que compre 2.

**El token de seguimiento no se guarda, se guarda su huella**, y se compara en
tiempo constante. Pedir no exige cuenta, así que `/pedido?id=…&token=…` es la
única forma de que un invitado vea el suyo.

Probar el ciclo entero —transiciones, cancelación, carrera entre dos personas
del taller, aislamiento entre talleres— contra la base de `docker compose`:

```bash
pnpm probar:pedidos
```

## Lo que todavía no está

Portado: **el catálogo público** y **pedidos y compras** (el checkout, el
seguimiento, el panel del taller y el historial del comprador con "repetir").

Pendiente, por orden de lo que el front necesita: **envíos con Skydropx**
(cotizar, guías y el webhook de rastreo — hoy sólo se lee una cotización ya
guardada, ver `src/envios`), los **correos** del pedido, el **carrito** y el
resto de `/cuenta/*`, los **productos del taller**, el **backoffice**, los
**eventos**, el **canal en vivo** por WebSocket (hoy el aviso se publica en
Redis y falta el gateway que lo lea) y el **worker de bordado**.
