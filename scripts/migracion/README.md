# De la base local a producción

Ejecuta desde `kustto-api`:

```bash
pnpm migrar:local-a-produccion
```

El origen es `DATABASE_URL` de `.env` local (PostgreSQL en `localhost:5434`). El destino es el RDS configurado en `/opt/kustto/.env` del EC2 de la cuenta `kustto`. El comando inicia PostgreSQL local si hace falta, crea una copia temporal, prepara el SQL, prueba su restauración, comprueba las rutas de S3, configura el permiso S3 del rol de EC2, respalda RDS, importa los datos, reinicia API y workers y recarga Nginx. La base local original no se altera.

Se copian todos los datos actuales de la base local, incluidas cuentas, proveedores, productos, plantillas, paquetes, eventos y bordados. Se excluyen pedidos y compras conforme a lo solicitado, junto con sus partidas, envíos y cotizaciones. Se descartan sesiones y tokens temporales porque no son datos de cuenta reutilizables en producción. Se conservan los usuarios y sus contraseñas hash; deben iniciar sesión de nuevo.

La API usa rutas relativas como `/medios/...` y `/mockups/...`. El comando vuelve a verificar/copiar los objetos vigentes del S3 anterior a los buckets nuevos, sin sobrescribir archivos distintos. Revisa todas las rutas presentes en los datos que se importarán. Dos rutas locales de prueba que no existen (`/medios/categorias/x.png` y `/medios/productos/x.png`) se limpian sólo en la copia temporal. Para una ruta distinta que falte en S3, la migración se detiene antes de tocar RDS.

Los datos de DynamoDB y Cognito del sistema anterior **no son el origen de este comando**. El comando conserva los 15 usuarios y 30 productos que ya estaban en PostgreSQL local al realizar esta migración. La cuenta vieja `kustto-admin` se usa únicamente para recuperar archivos de S3 que aún falten en la cuenta nueva `kustto`.

Para ensayar el proceso y comprobar el contenido sin importarlo en RDS:

```bash
pnpm migrar:local-a-produccion --solo-verificar
```

Necesitas AWS CLI con los perfiles `kustto-admin` y `kustto`, Python con boto3, Node/pnpm, los clientes de PostgreSQL (`pg_dump`, `pg_restore`, `psql`, `createdb`, `dropdb`), Docker si la base local está apagada y la llave SSH en `../kustto-infra/Mac-Book-mateo-kustto.pem`. La cuenta nueva debe poder entrar por SSH al EC2. El script obtiene su IP actual de AWS.

Cada ejecución guarda un respaldo local, uno de RDS previo a la importación, el SQL y reportes en `../kustto-infra/migracion/local-a-produccion-<fecha>/`. Esa carpeta contiene datos personales y tiene permisos privados. El importador comprueba el esquema y que producción siga vacía antes de insertar; el SQL se ejecuta en una sola transacción. Si el comando se interrumpe, revisa el estado de API y workers en EC2 antes de repetirlo. Una vez importado, volver a ejecutarlo no duplica filas: se detiene al encontrar datos en destino.
