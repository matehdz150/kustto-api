CREATE TYPE "public"."personalizacion_evento" AS ENUM('libre', 'bloqueada', 'sin_personalizacion');--> statement-breakpoint
DROP INDEX "evento_productos_evento";--> statement-breakpoint
ALTER TABLE "evento_participaciones" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD COLUMN "orden" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD COLUMN "personalizacion" "personalizacion_evento" DEFAULT 'libre' NOT NULL;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD COLUMN "diseno_base" jsonb;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD COLUMN "instantanea" jsonb;--> statement-breakpoint
-- Los renglones que ya existen se quedaron sin instantánea: se arma con el
-- producto de hoy. Lo exacto sale de volver a correr `db:desde-dynamo`, que
-- reescribe los productos de cada evento con lo que guardaba DynamoDB.
UPDATE "evento_productos" ep SET "instantanea" = jsonb_build_object(
	'nombre', p."nombre",
	'imagen', (SELECT i."url" FROM "producto_imagenes" i WHERE i."producto_id" = p."id" ORDER BY i."orden" LIMIT 1),
	'proveedorId', p."taller_id",
	'precioDesde', COALESCE((SELECT pr."precio_base" FROM "producto_precios" pr WHERE pr."producto_id" = p."id"), 0)::float8,
	'colores', COALESCE((SELECT jsonb_agg(jsonb_build_object('nombre', c."nombre", 'hex', c."hex")) FROM "producto_colores" c WHERE c."producto_id" = p."id"), '[]'::jsonb),
	'tallas', COALESCE((SELECT jsonb_agg(t."talla" ORDER BY t."orden") FROM "producto_tallas" t WHERE t."producto_id" = p."id"), '["Única"]'::jsonb)
) FROM "productos" p WHERE p."id" = ep."producto_id";--> statement-breakpoint
ALTER TABLE "evento_productos" ALTER COLUMN "instantanea" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evento_productos" DROP COLUMN "reglas";--> statement-breakpoint
CREATE INDEX "evento_productos_evento" ON "evento_productos" USING btree ("evento_id","orden");
