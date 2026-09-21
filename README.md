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

## Antes de abrir un PR

```bash
pnpm lint                    # Biome: formato y lint (pnpm exec biome check --write . arregla lo seguro)
pnpm exec tsc --noEmit -p tsconfig.json && pnpm exec tsc --noEmit -p tsconfig.scripts.json
pnpm build
pnpm db:generar              # si tocaste src/db/esquema: no debe quedar nada sin subir
pnpm probar:eventos          # y los probar:* de lo que hayas tocado
```

El CI (`.github/workflows/ci.yml`) corre lo mismo en cada PR hacia `main`,
más dos cosas que en local se olvidan: que **el esquema y las migraciones
cuadren** y que las migraciones **se apliquen sobre una base vacía**, dos veces.
También construye la imagen, y al llegar a `main` la publica en GHCR.

**Los `probar:*` no corren en CI**: hablan con S3 y Cognito de verdad, y eso
serían credenciales de producción en un runner. Se corren a mano.

**`useImportType` está apagada en Biome a propósito** (ver `biome.jsonc`): su
arreglo automático convierte en `import type` las clases que Nest inyecta, y la
API deja de arrancar.

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

## Envíos

**El paquete lo arma el servidor, siempre.** De fuera sólo se acepta qué se
pide y a dónde va; el peso, las medidas y el origen salen de la base. Si el
navegador pudiera mandar el peso, mandaría el precio del envío.

El peso es exacto —la suma de lo que pesa cada talla— y **la caja es una
aproximación**: se apilan las piezas a lo alto y se conserva el largo y el
ancho mayores. Por eso el taller confirma las medidas de verdad al terminar, y
sobre ésas se **recotiza** antes de comprar la guía: sobre la vieja, la
paquetería repesa y factura la diferencia semanas después.

**El límite de Skydropx son 2 peticiones por segundo**, y ahora se cuenta de
verdad: una ventana deslizante en Redis, común a todas las instancias y a los
workers. En las Lambdas no se podía —cada invocación vivía en su contenedor— y
lo único que quedaba era espaciar a mano 600 ms entre cotizaciones.

**Las cotizaciones se guardan.** Antes el checkout volvía a preguntarle a
Skydropx en mitad del cobro; ahora queda en `cotizaciones_de_envio` y el
checkout la lee de ahí. Caducada es lo mismo que inexistente.

**El webhook de rastreo verifica la firma HMAC del cuerpo crudo** (por eso
`rawBody: true` en `main.ts`) y **un estado sólo avanza**: los avisos de la
paquetería no llegan en orden y un `delivered` puede adelantar a un
`in_transit`.

## Correos

Van por SMTP y **a la cola**, no se mandan dentro de la petición: la compra ya
está cobrada y quien acaba de pagar no puede quedarse mirando una rueda porque
el servidor de correo tarde.

Las plantillas están **en un solo sitio**. En las Lambdas vivían duplicadas con
una nota de "copia el archivo entero al cambiarlo", y dos de ellas —"va en
camino" y "llegó"— salen por dos caminos: el taller a mano, o la paquetería por
webhook. Si divergían, el mismo cliente recibía un texto u otro según quién
movió el pedido.

## El backoffice

Todo cuelga de `/admin/` y detrás del pool de **admins**, que es un tercer pool
de Cognito distinto al de compradores y al de talleres. Antes iba detrás de una
llave compartida guardada por un route handler de Next; se quitó al publicar el
backoffice, porque una página estática no puede guardar un secreto.

- **Plantillas de prenda** — lo que el editor necesita para montar el lienzo.
  La validación vive en el modelo y no sólo en el asistente: un lado sin mockup
  o sin área imprimible rompe el lienzo en silencio, y **un cilindro tiene un
  solo lado** porque la envoltura ES el objeto.
- **Categorías**, **revisión de productos** (la única transición que el admin
  puede hacer y el taller no es publicar), **alta de talleres** y **paquetes**.
- **Subidas a S3**: el archivo nunca pasa por la API, va del navegador a una
  URL firmada. Lo que se guarda es una **ruta relativa**, nunca la de S3.

**Los archivos se sirven desde nuestro origen** (`/publico/mockups/*`,
`/publico/medios/*`, `/publico/archivos-eventos/*`) con el bucket cerrado. No
es una preferencia: el teñido de prenda hace `getImageData()` sobre el mockup,
y desde otro origen el canvas queda contaminado y el teñido se apaga sin decir
nada. Ahora se transmite en vez de cargarlo en memoria — la Lambda tenía que
devolverlo en base64 dentro de la respuesta de API Gateway.

### Credenciales de AWS

S3 y Cognito se quedan, así que la API necesita credenciales de verdad. En
local, el compose monta `~/.aws` de sólo lectura dentro del contenedor y
`AWS_PROFILE` dice cuál usar. **En un servidor eso se borra** y las da el rol
de la máquina.

## El panel del taller

**El taller escribe sus productos; el admin los revisa.** Sólo el admin puede
poner un producto en `activo`, y **tocar uno activo lo devuelve a revisión** —
es la regla que impide publicar algo inocuo, esperar el visto bueno y luego
cambiarlo por otra cosa.

**Las existencias van por su propia ruta**, y por dos razones: contar la bodega
no es contenido que nadie tenga que aprobar (si pasara por el PATCH del
producto, el taller se despublicaría al corregir su conteo), y **el delta lo
aplica la base**, no el navegador — si el cliente leyera, sumara y
reescribiera, un pedido que descuente en ese hueco se perdería.

**Quitar un producto son dos cosas.** Un borrador se borra de verdad: nunca
estuvo en el catálogo, así que nada puede apuntarle. Todo lo demás se
**archiva** — sale del catálogo y de la lista del taller, pero la fila se queda
porque "volver a pedir" la lee para poder decir cuál de las líneas se cayó.

**La carpeta de las fotos sale del token, nunca del cuerpo.** Las credenciales
de la API pueden escribir en todo `medios/productos/*` —IAM no sabe de
talleres—, así que esa línea es lo único que impide que un taller escriba sobre
las fotos de otro.

## El canal en vivo

Un WebSocket en `/eventos`, enganchado al **mismo servidor HTTP** que la API.
El token viaja en la URL porque `new WebSocket(url)` no admite cabeceras, y se
verifica contra el pool de talleres como cualquier otra ruta.

**No se sirve ningún dato por ahí**: se manda un aviso corto —"entró un
pedido"— y el navegador recarga su lista por la API de siempre. Mandar los
datos convertiría el socket en una segunda API con las mismas reglas de qué ve
cada taller.

En AWS esto eran **cuatro piezas**: una API Gateway WebSocket, una Lambda
autorizadora, una Lambda de conexión y una tabla de conexiones con TTL — porque
nada en Lambda puede sostener un socket, así que había que apuntar en DynamoDB
quién estaba conectado. Con un servidor, la conexión **es** el estado. Lo que
sí hace falta es Redis: con varias instancias, la que atiende el checkout casi
nunca es la que tiene abierta la conexión del taller.

## Plantillas de compra

La receta de un pedido que se repite: *"este kit de bienvenida, estos
productos, estas cantidades"*. **No es lo mismo que repetir un pedido** —aquél
clona uno pasado tal cual; una plantilla guarda su propia receta de tallas, que
es justo lo que se ajusta entre una vez y otra.

**De dónde sale el arte** es la decisión de fondo, y hay dos caminos:

- `arte_id` — el arte propio de la plantilla, en
  `medios/plantillas/<comprador>/`, que **no caduca**. Manda sobre el otro: es
  el que se hizo para esta receta.
- `origen_pedido_id` + `origen_partida_id` — la línea de pedido de donde salió.

**No apunta a un diseño guardado**, aunque lo parezca: un diseño guardado copia
el lienzo editable y una miniatura, **no el arte de producción**. Por eso un
diseño guardado abre el editor en vez de ir al carrito. Y tampoco puede apuntar
al carrito: `carritos/` caduca a los 30 días.

Los dos en nulo es válido: *"esta playera, estas tallas"*, sin arte todavía —
al cargarla, ese producto pasa por el editor.

Cargar una plantilla devuelve **tres listas**, porque hay tres desenlaces:
`articulos` (listos), `porDisenar` (el producto vive pero no hay arte que
copiar) y `perdidos` (ya no se publica). El último es el único que **obliga a
decidir**: meterlo al carrito sólo movería el fallo al final del checkout.

## El bordado

**Está apagado** (`BORDADO_ACTIVO=false`). Los parámetros del perfil salieron
de un spike y no tienen validación física: nadie ha cosido todavía un diseño
preparado con esto. Hasta que haya test-sew no se conecta al checkout ni al
taller, y con la variable en falso las rutas contestan **404** — para quien no
la tiene activada, esta función no existe.

**El motor es Python** —Ink/Stitch y pyembroidery— y no se reescribe: no hay
equivalente en TypeScript de lo que hace. Lo que cambió es quién habla con el
mundo. Antes el Python leía de SQS, tomaba el trabajo en DynamoDB, bajaba el
diseño de S3, subía los artefactos y escribía el resultado; ahora es una
**función**:

```bash
python3 motor.py <design.json> <carpeta>   # imprime el resultado en JSON
```

La cola, la base y S3 los lleva el proceso de TypeScript que lo invoca. El
Python no conoce ninguna credencial.

**Vive en su propia imagen** (`servicios/bordado/Dockerfile`), porque
Ink/Stitch, GTK y xvfb son cientos de megas por algo que hoy está apagado:

```bash
docker compose --profile bordado up bordado
```

Es el único sitio donde `BORDADO_ACTIVO` va en true: encenderlo en la imagen de
la API haría que los trabajos se tomaran —y se marcaran como `PROCESSING`—
para morir enseguida sin motor que los atienda.

**El binario de Ink/Stitch se elige por arquitectura.** Se distribuye
compilado, así que el de x86_64 dentro de un contenedor arm64 —un Mac con
Apple Silicon, un servidor Graviton— arranca y muere con `rosetta error`, que
desde fuera se ve como un DST de cero bytes sin ninguna pista. Lo resuelve
`TARGETARCH`, y la suma de comprobación se verifica siempre.

**Los trabajos son idempotentes por construcción**: el id sale de quién pide
más el hash del diseño, así que el mismo dibujo del mismo comprador da el mismo
trabajo. Preparar cuesta hasta 75 segundos de CPU y un doble clic no los puede
pagar dos veces.

`READY` y `REVIEW` son **ambos** un éxito. La diferencia es lo único que separa
hoy un bordado revisado de uno que nadie miró.

## Probarlo

```bash
pnpm probar:pedidos    # el ciclo del pedido: transiciones, cancelación, carreras
pnpm probar:envios     # limitador, cotización guardada, webhook, carrito, cuenta
pnpm probar:admin      # plantillas, categorías, revisión, paquetes y subidas
pnpm probar:taller     # productos, existencias, perfil y el canal en vivo
pnpm probar:plantillas # la receta, el arte propio y la vuelta al carrito
pnpm probar:bordado    # el interruptor, el contrato, la idempotencia y la toma
```

`probar:plantillas` **toca S3 de verdad**: firma una subida, sube un PNG
diminuto, comprueba que la copia al carrito llegó y borra lo que subió. Es la
única forma de verificar la copia de servidor a servidor.

Corren contra la base de `docker compose` y por el código real, no por HTTP:
así se prueba la lógica sin tener que conseguir un token de Cognito.

## Lo que todavía no está

Portado: **el catálogo público** y **pedidos y compras** (el checkout, el
seguimiento, el panel del taller y el historial del comprador con "repetir").

Portado también: **envíos completos** (cotizar, cotizar por taller, guías con
recotización y el webhook de rastreo), los **correos** del pedido, el
**carrito**, el **perfil**, los **favoritos**, los **diseños guardados** y la
**biblioteca de imágenes**.

Portado también: **el backoffice entero**, **el panel del taller** —sus
productos, sus existencias y su perfil— y **el canal en vivo**.

Portado también: las **plantillas de compra** y el **bordado**.

Pendiente: los **eventos**.
