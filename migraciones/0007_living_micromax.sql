ALTER TABLE "paquetes" ADD COLUMN "precio_base" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "paquetes" ADD COLUMN "descuento_porcentaje" integer DEFAULT 0 NOT NULL;