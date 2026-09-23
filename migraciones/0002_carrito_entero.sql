-- Las filas que hay no se pueden rescatar: guardaban sólo producto, color,
-- talla y piezas, sin `carritoId` (dónde está el arte en S3) ni `tallas`, así
-- que un artículo armado con ellas ni se puede pedir ni se puede pintar —
-- tumba la cabecera del sitio—. El carrito verdadero se recupera volviendo a
-- correr `db:desde-dynamo`, que ahora trae el artículo entero.
DELETE FROM "carrito_partidas";--> statement-breakpoint
DROP INDEX "carrito_partidas_comprador";--> statement-breakpoint
ALTER TABLE "carrito_partidas" ADD COLUMN "orden" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "carrito_partidas" ADD COLUMN "articulo" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "carrito_partidas" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "carrito_partidas" DROP COLUMN "talla";--> statement-breakpoint
ALTER TABLE "carrito_partidas" DROP COLUMN "piezas";--> statement-breakpoint
ALTER TABLE "carrito_partidas" DROP COLUMN "arte";--> statement-breakpoint
ALTER TABLE "carrito_partidas" DROP COLUMN "diseno";--> statement-breakpoint
CREATE INDEX "carrito_partidas_comprador" ON "carrito_partidas" USING btree ("comprador_id","orden");
