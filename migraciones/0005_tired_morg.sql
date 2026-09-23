DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "paquete_categorias")
     OR EXISTS (SELECT 1 FROM "paquete_precios")
     OR EXISTS (SELECT 1 FROM "paquete_productos")
     OR EXISTS (SELECT 1 FROM "paquetes") THEN
    RAISE EXCEPTION 'Hay paquetes de Kustto en esta base. Respáldalos y decide su destino antes de aplicar esta migración.';
  END IF;
END
$$;--> statement-breakpoint
DROP TABLE "paquete_categorias";--> statement-breakpoint
DROP TABLE "paquete_precios";--> statement-breakpoint
DROP TABLE "paquete_productos";--> statement-breakpoint
DROP TABLE "paquetes";--> statement-breakpoint
DROP TYPE "public"."estado_paquete";
