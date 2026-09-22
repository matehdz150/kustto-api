CREATE TYPE "public"."estado_paquete" AS ENUM('borrador', 'en_revision', 'activo', 'rechazado', 'archivado');--> statement-breakpoint
CREATE TABLE "categorias_paquete" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paquete_categorias" (
	"paquete_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	CONSTRAINT "paquete_categorias_paquete_id_categoria_id_pk" PRIMARY KEY("paquete_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "paquete_productos" (
	"paquete_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "paquete_productos_paquete_id_producto_id_pk" PRIMARY KEY("paquete_id","producto_id")
);
--> statement-breakpoint
CREATE TABLE "paquetes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"estado" "estado_paquete" DEFAULT 'borrador' NOT NULL,
	"nota_revision" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "paquete_categorias" ADD CONSTRAINT "paquete_categorias_paquete_id_paquetes_id_fk" FOREIGN KEY ("paquete_id") REFERENCES "public"."paquetes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paquete_categorias" ADD CONSTRAINT "paquete_categorias_categoria_id_categorias_paquete_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_paquete"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paquete_productos" ADD CONSTRAINT "paquete_productos_paquete_id_paquetes_id_fk" FOREIGN KEY ("paquete_id") REFERENCES "public"."paquetes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paquete_productos" ADD CONSTRAINT "paquete_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paquetes" ADD CONSTRAINT "paquetes_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_paquete_slug_unico" ON "categorias_paquete" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "paquete_categorias_categoria" ON "paquete_categorias" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "paquete_productos_producto" ON "paquete_productos" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "paquetes_taller_estado" ON "paquetes" USING btree ("taller_id","estado");--> statement-breakpoint
CREATE INDEX "paquetes_estado_actualizado" ON "paquetes" USING btree ("estado","actualizado_en");--> statement-breakpoint
INSERT INTO "categorias_paquete" ("nombre", "slug", "descripcion", "orden") VALUES
  ('Bodas', 'bodas', 'Detalles y recuerdos para celebrar juntos', 10),
  ('Graduaciones', 'graduaciones', 'Para celebrar el cierre de una etapa', 20),
  ('Empresas', 'empresas', 'Bienvenida, regalos y eventos de empresa', 30),
  ('Equipos', 'equipos', 'Para grupos, clubes y equipos', 40);
