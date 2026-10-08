CREATE TYPE "public"."tipo_imagen_producto" AS ENUM('foto', 'recorte', 'detalle', 'ambiente');--> statement-breakpoint
CREATE TABLE "tipos_de_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"titulo" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "producto_imagenes" ADD COLUMN "tipo" "tipo_imagen_producto" DEFAULT 'foto' NOT NULL;--> statement-breakpoint
ALTER TABLE "producto_precios" ADD COLUMN "precio_antes" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "tipo_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_de_producto_slug_unico" ON "tipos_de_producto" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_id_tipos_de_producto_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_de_producto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "productos_tipo" ON "productos" USING btree ("tipo_id");