CREATE TYPE "public"."estado_evento" AS ENUM('borrador', 'publicado', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('nuevo', 'produccion', 'listo', 'enviado', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_producto" AS ENUM('borrador', 'en_revision', 'activo', 'rechazado', 'archivado');--> statement-breakpoint
CREATE TYPE "public"."metodo_entrega" AS ENUM('envio', 'recoger');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"descripcion" text,
	"imagen_url" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantillas_de_prenda" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_categorias" (
	"producto_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	CONSTRAINT "producto_categorias_producto_id_categoria_id_pk" PRIMARY KEY("producto_id","categoria_id")
);
--> statement-breakpoint
CREATE TABLE "producto_colores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"hex" text
);
--> statement-breakpoint
CREATE TABLE "producto_existencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"color" text,
	"talla" text NOT NULL,
	"cantidad" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_fotos_reales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"lado" text NOT NULL,
	"color" text,
	"url" text NOT NULL,
	"esquinas" jsonb,
	"banda" jsonb,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_imagenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"url" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_lados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"ancho_cm" real NOT NULL,
	"alto_cm" real NOT NULL,
	"dpi" integer DEFAULT 300 NOT NULL,
	"sangrado_cm" real DEFAULT 0 NOT NULL,
	"tecnica" text,
	"recargo" numeric(10, 2),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_precios" (
	"producto_id" uuid PRIMARY KEY NOT NULL,
	"precio_base" numeric(10, 2) DEFAULT '0' NOT NULL,
	"precio_por_lado" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "producto_produccion" (
	"producto_id" uuid PRIMARY KEY NOT NULL,
	"dias" integer,
	"minimo_piezas" integer
);
--> statement-breakpoint
CREATE TABLE "producto_tallas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"talla" text NOT NULL,
	"ancho_in" real,
	"largo_in" real,
	"peso_g" integer,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taller_id" text NOT NULL,
	"nombre" text NOT NULL,
	"nombre_interno" text,
	"sku" text,
	"descripcion" text,
	"slug" text NOT NULL,
	"estado" "estado_producto" DEFAULT 'borrador' NOT NULL,
	"plantilla_id" text,
	"personalizable" boolean DEFAULT true NOT NULL,
	"minimo_alerta" integer,
	"dias_extra_sin_stock" integer,
	"caja" jsonb,
	"reglas_personalizacion" jsonb,
	"lados_de_plantilla" jsonb,
	"nota_revision" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrito_partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprador_id" text NOT NULL,
	"producto_id" uuid NOT NULL,
	"color" text,
	"talla" text,
	"piezas" integer DEFAULT 1 NOT NULL,
	"arte" jsonb,
	"diseno" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compradores" (
	"id" text PRIMARY KEY NOT NULL,
	"correo" text,
	"nombre" text,
	"whatsapp" text,
	"direccion" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disenos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprador_id" text NOT NULL,
	"producto_id" uuid,
	"nombre" text NOT NULL,
	"lienzo" jsonb,
	"vista_previa_url" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento_disenos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" text NOT NULL,
	"participacion_id" uuid,
	"evento_producto_id" uuid,
	"ruta" text,
	"expira_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento_participaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" text NOT NULL,
	"participante" jsonb,
	"lineas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(12, 2),
	"estado_pago" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento_productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" text NOT NULL,
	"producto_id" uuid NOT NULL,
	"reglas" jsonb
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"comprador_id" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"codigo" text NOT NULL,
	"estado" "estado_evento" DEFAULT 'borrador' NOT NULL,
	"portada_url" text,
	"direccion" jsonb,
	"abre_en" timestamp with time zone,
	"cierra_en" timestamp with time zone,
	"publicado_en" timestamp with time zone,
	"cerrado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favoritos" (
	"comprador_id" text NOT NULL,
	"producto_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favoritos_comprador_id_producto_id_pk" PRIMARY KEY("comprador_id","producto_id")
);
--> statement-breakpoint
CREATE TABLE "imagenes_de_comprador" (
	"id" text PRIMARY KEY NOT NULL,
	"comprador_id" text NOT NULL,
	"nombre" text,
	"url" text NOT NULL,
	"ancho" integer,
	"alto" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantilla_de_compra_partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plantilla_id" text NOT NULL,
	"producto_id" uuid NOT NULL,
	"diseno_id" uuid,
	"color" text,
	"talla" text,
	"piezas" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantillas_de_compra" (
	"id" text PRIMARY KEY NOT NULL,
	"comprador_id" text NOT NULL,
	"nombre" text NOT NULL,
	"veces_pedida" integer DEFAULT 0 NOT NULL,
	"ultima_vez" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folio" text NOT NULL,
	"correo" text NOT NULL,
	"nombre" text,
	"whatsapp" text,
	"piezas" integer DEFAULT 0 NOT NULL,
	"productos_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"huella_de_token" text,
	"metodo_entrega" "metodo_entrega",
	"direccion" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cotizaciones_de_envio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"peticion" jsonb NOT NULL,
	"respuesta" jsonb,
	"error" text,
	"expira_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envios_de_paqueteria" (
	"envio_id" text PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"proveedor" text DEFAULT 'skydropx' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_bitacora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"estado" "estado_pedido" NOT NULL,
	"nota" text,
	"autor" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_partida_tallas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"talla" text NOT NULL,
	"piezas" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"producto_id" uuid,
	"nombre" text NOT NULL,
	"sku" text,
	"imagen_url" text,
	"plantilla_id" text,
	"color" text,
	"color_hex" text,
	"lados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"piezas" integer NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"importe" numeric(12, 2) NOT NULL,
	"arte" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diseno_ruta" text,
	"bordados" jsonb,
	"dias_prometidos" integer,
	"faltantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"taller_id" text NOT NULL,
	"folio" text NOT NULL,
	"estado" "estado_pedido" DEFAULT 'nuevo' NOT NULL,
	"correo" text NOT NULL,
	"nombre" text,
	"whatsapp" text,
	"piezas" integer DEFAULT 0 NOT NULL,
	"metodo_entrega" "metodo_entrega" DEFAULT 'envio' NOT NULL,
	"direccion" jsonb,
	"envio" jsonb,
	"guia" jsonb,
	"productos_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"huella_de_token" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talleres" (
	"id" text PRIMARY KEY NOT NULL,
	"correo" text NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"nombre_publico" text,
	"bio" text,
	"avatar_url" text,
	"banner_url" text,
	"whatsapp" text,
	"saldo_envios" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cargos_envio" jsonb,
	"recoleccion" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "producto_categorias" ADD CONSTRAINT "producto_categorias_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_categorias" ADD CONSTRAINT "producto_categorias_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_colores" ADD CONSTRAINT "producto_colores_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_existencias" ADD CONSTRAINT "producto_existencias_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_fotos_reales" ADD CONSTRAINT "producto_fotos_reales_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_lados" ADD CONSTRAINT "producto_lados_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_precios" ADD CONSTRAINT "producto_precios_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_produccion" ADD CONSTRAINT "producto_produccion_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_tallas" ADD CONSTRAINT "producto_tallas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_plantilla_id_plantillas_de_prenda_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_de_prenda"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito_partidas" ADD CONSTRAINT "carrito_partidas_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito_partidas" ADD CONSTRAINT "carrito_partidas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disenos" ADD CONSTRAINT "disenos_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disenos" ADD CONSTRAINT "disenos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_disenos" ADD CONSTRAINT "evento_disenos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_disenos" ADD CONSTRAINT "evento_disenos_participacion_id_evento_participaciones_id_fk" FOREIGN KEY ("participacion_id") REFERENCES "public"."evento_participaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_disenos" ADD CONSTRAINT "evento_disenos_evento_producto_id_evento_productos_id_fk" FOREIGN KEY ("evento_producto_id") REFERENCES "public"."evento_productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_participaciones" ADD CONSTRAINT "evento_participaciones_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD CONSTRAINT "evento_productos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_productos" ADD CONSTRAINT "evento_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagenes_de_comprador" ADD CONSTRAINT "imagenes_de_comprador_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_de_compra_partidas" ADD CONSTRAINT "plantilla_de_compra_partidas_plantilla_id_plantillas_de_compra_id_fk" FOREIGN KEY ("plantilla_id") REFERENCES "public"."plantillas_de_compra"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_de_compra_partidas" ADD CONSTRAINT "plantilla_de_compra_partidas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_de_compra_partidas" ADD CONSTRAINT "plantilla_de_compra_partidas_diseno_id_disenos_id_fk" FOREIGN KEY ("diseno_id") REFERENCES "public"."disenos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas_de_compra" ADD CONSTRAINT "plantillas_de_compra_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envios_de_paqueteria" ADD CONSTRAINT "envios_de_paqueteria_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_bitacora" ADD CONSTRAINT "pedido_bitacora_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_partida_tallas" ADD CONSTRAINT "pedido_partida_tallas_partida_id_pedido_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."pedido_partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_partidas" ADD CONSTRAINT "pedido_partidas_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_partidas" ADD CONSTRAINT "pedido_partidas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_taller_id_talleres_id_fk" FOREIGN KEY ("taller_id") REFERENCES "public"."talleres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_slug_unico" ON "categorias" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "producto_categorias_categoria" ON "producto_categorias" USING btree ("categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "producto_colores_unico" ON "producto_colores" USING btree ("producto_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "producto_existencias_unico" ON "producto_existencias" USING btree ("producto_id",coalesce("color", ''),"talla");--> statement-breakpoint
CREATE INDEX "producto_fotos_reales_producto" ON "producto_fotos_reales" USING btree ("producto_id","orden");--> statement-breakpoint
CREATE INDEX "producto_imagenes_producto" ON "producto_imagenes" USING btree ("producto_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "producto_lados_unico" ON "producto_lados" USING btree ("producto_id","clave");--> statement-breakpoint
CREATE UNIQUE INDEX "producto_tallas_unico" ON "producto_tallas" USING btree ("producto_id","talla");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_slug_unico" ON "productos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "productos_taller_creado" ON "productos" USING btree ("taller_id","creado_en");--> statement-breakpoint
CREATE INDEX "productos_estado_actualizado" ON "productos" USING btree ("estado","actualizado_en");--> statement-breakpoint
CREATE INDEX "carrito_partidas_comprador" ON "carrito_partidas" USING btree ("comprador_id");--> statement-breakpoint
CREATE UNIQUE INDEX "compradores_correo_unico" ON "compradores" USING btree ("correo");--> statement-breakpoint
CREATE INDEX "disenos_comprador" ON "disenos" USING btree ("comprador_id","creado_en");--> statement-breakpoint
CREATE INDEX "evento_disenos_evento" ON "evento_disenos" USING btree ("evento_id");--> statement-breakpoint
CREATE INDEX "evento_participaciones_evento" ON "evento_participaciones" USING btree ("evento_id","creado_en");--> statement-breakpoint
CREATE INDEX "evento_productos_evento" ON "evento_productos" USING btree ("evento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eventos_codigo_unico" ON "eventos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "eventos_comprador" ON "eventos" USING btree ("comprador_id","creado_en");--> statement-breakpoint
CREATE INDEX "imagenes_de_comprador_comprador" ON "imagenes_de_comprador" USING btree ("comprador_id","creado_en");--> statement-breakpoint
CREATE INDEX "plantilla_de_compra_partidas_plantilla" ON "plantilla_de_compra_partidas" USING btree ("plantilla_id");--> statement-breakpoint
CREATE INDEX "plantillas_de_compra_comprador" ON "plantillas_de_compra" USING btree ("comprador_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "compras_folio_unico" ON "compras" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "compras_correo_creado" ON "compras" USING btree ("correo","creado_en");--> statement-breakpoint
CREATE INDEX "cotizaciones_de_envio_expira" ON "cotizaciones_de_envio" USING btree ("expira_en");--> statement-breakpoint
CREATE INDEX "envios_de_paqueteria_pedido" ON "envios_de_paqueteria" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_bitacora_pedido" ON "pedido_bitacora" USING btree ("pedido_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "pedido_partida_tallas_unico" ON "pedido_partida_tallas" USING btree ("partida_id","talla");--> statement-breakpoint
CREATE INDEX "pedido_partidas_pedido" ON "pedido_partidas" USING btree ("pedido_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_folio_unico" ON "pedidos" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "pedidos_taller_creado" ON "pedidos" USING btree ("taller_id","creado_en");--> statement-breakpoint
CREATE INDEX "pedidos_estado_actualizado" ON "pedidos" USING btree ("estado","actualizado_en");--> statement-breakpoint
CREATE INDEX "pedidos_correo_creado" ON "pedidos" USING btree ("correo","creado_en");--> statement-breakpoint
CREATE INDEX "pedidos_compra" ON "pedidos" USING btree ("compra_id");--> statement-breakpoint
CREATE UNIQUE INDEX "talleres_correo_unico" ON "talleres" USING btree ("correo");--> statement-breakpoint
CREATE UNIQUE INDEX "talleres_slug_unico" ON "talleres" USING btree ("slug");