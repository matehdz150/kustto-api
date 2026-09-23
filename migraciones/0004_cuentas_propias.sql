CREATE TYPE "public"."proposito_de_token" AS ENUM('verificar_correo', 'restablecer', 'invitacion');--> statement-breakpoint
CREATE TYPE "public"."tipo_de_usuario" AS ENUM('comprador', 'taller', 'admin');--> statement-breakpoint
CREATE TABLE "identidades_externas" (
	"proveedor" text NOT NULL,
	"sujeto" text NOT NULL,
	"usuario_id" text NOT NULL,
	"correo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identidades_externas_proveedor_sujeto_pk" PRIMARY KEY("proveedor","sujeto")
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" "tipo_de_usuario" NOT NULL,
	"expira_absoluta_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"motivo_revocacion" text,
	"ultimo_uso_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"agente" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens_de_renovacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sesion_id" uuid NOT NULL,
	"huella" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"reemplazado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens_de_un_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"proposito" "proposito_de_token" NOT NULL,
	"huella" text NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" "tipo_de_usuario" NOT NULL,
	"correo" text NOT NULL,
	"correo_verificado_en" timestamp with time zone,
	"contrasena_hash" text,
	"desactivado_en" timestamp with time zone,
	"ultimo_acceso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identidades_externas" ADD CONSTRAINT "identidades_externas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_de_renovacion" ADD CONSTRAINT "tokens_de_renovacion_sesion_id_sesiones_id_fk" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_de_un_uso" ADD CONSTRAINT "tokens_de_un_uso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identidades_externas_usuario" ON "identidades_externas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sesiones_usuario" ON "sesiones" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_de_renovacion_huella" ON "tokens_de_renovacion" USING btree ("huella");--> statement-breakpoint
CREATE INDEX "tokens_de_renovacion_sesion" ON "tokens_de_renovacion" USING btree ("sesion_id");--> statement-breakpoint
CREATE INDEX "tokens_de_un_uso_usuario" ON "tokens_de_un_uso" USING btree ("usuario_id","proposito");--> statement-breakpoint
CREATE INDEX "tokens_de_un_uso_huella" ON "tokens_de_un_uso" USING btree ("huella");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_tipo_correo_unico" ON "usuarios" USING btree ("tipo","correo");