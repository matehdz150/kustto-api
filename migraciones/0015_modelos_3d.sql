CREATE TABLE "modelos_3d" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"mapeo" text NOT NULL,
	"glb_url" text,
	"miniatura_url" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plantillas_de_prenda" ADD COLUMN "modelo3d_id" text;--> statement-breakpoint
ALTER TABLE "plantillas_de_prenda" ADD CONSTRAINT "plantillas_de_prenda_modelo3d_id_modelos_3d_id_fk" FOREIGN KEY ("modelo3d_id") REFERENCES "public"."modelos_3d"("id") ON DELETE set null ON UPDATE no action;