-- LAS SIETE CATEGORÍAS VIEJAS ERAN, EN REALIDAD, TIPOS DE PRODUCTO.
--
-- Playeras, Sudaderas, Tazas, Mochilas, Termos, Gorras y Plumas se crearon
-- cuando no había otra forma de decir "qué es" un producto. Ahora eso es
-- `tipo_id` (ver `tiposDeProducto` en el esquema) y las categorías son las diez
-- de la tienda. Esta migración mueve lo que había:
--
--   1. crea el tipo "Plumas", que el diseño no traía pero hay un producto;
--   2. cada producto toma como tipo el de su categoría vieja (mismo slug);
--   3. entra además en las categorías nuevas donde el diseño enseña ese tipo
--      (el mapa sale de las pastillas de `app/landing-prueba/datosCategoria.ts`;
--      "Plumas" no está ahí y va a Papelería y Equipos y empresas);
--   4. se le quita la categoría vieja;
--   5. se borran las categorías viejas que hayan quedado VACÍAS.
--
-- SOLO TOCA LO INEQUÍVOCO. Un producto en dos categorías viejas a la vez no se
-- convierte —no hay forma de saber cuál es su tipo—, conserva sus categorías y
-- por eso su categoría vieja no se borra: alguien lo decide a mano. Un producto
-- que YA tiene tipo no se pisa.
--
-- No toca `actualizado_en`: el catálogo ordena por él y esto no es una edición.
-- Idempotente: una segunda corrida no encuentra nada que mover.

INSERT INTO "tipos_de_producto" ("nombre", "slug", "titulo", "orden")
VALUES ('Plumas', 'plumas', NULL, 25)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint

UPDATE "productos" AS p
SET "tipo_id" = t."id"
FROM "producto_categorias" pc
JOIN "categorias" c ON c."id" = pc."categoria_id"
JOIN "tipos_de_producto" t ON t."slug" = c."slug"
WHERE pc."producto_id" = p."id"
	AND p."tipo_id" IS NULL
	AND c."slug" IN ('playeras', 'sudaderas', 'tazas', 'mochilas', 'termos', 'gorras', 'plumas')
	AND (
		SELECT count(*)
		FROM "producto_categorias" pc2
		JOIN "categorias" c2 ON c2."id" = pc2."categoria_id"
		WHERE pc2."producto_id" = p."id" AND c2."slug" IN ('playeras', 'sudaderas', 'tazas', 'mochilas', 'termos', 'gorras', 'plumas')
	) = 1;--> statement-breakpoint

INSERT INTO "producto_categorias" ("producto_id", "categoria_id")
SELECT p."id", c."id"
FROM "productos" p
JOIN "tipos_de_producto" t ON t."id" = p."tipo_id"
JOIN (VALUES
		('playeras', 'eventos'),
		('playeras', 'ropa'),
		('playeras', 'equipos'),
		('playeras', 'regalos'),
		('sudaderas', 'eventos'),
		('sudaderas', 'ropa'),
		('sudaderas', 'equipos'),
		('sudaderas', 'invierno'),
		('tazas', 'eventos'),
		('tazas', 'hogar'),
		('tazas', 'bodas'),
		('tazas', 'invierno'),
		('tazas', 'papeleria'),
		('tazas', 'regalos'),
		('mochilas', 'accesorios'),
		('mochilas', 'equipos'),
		('mochilas', 'bolsas'),
		('termos', 'eventos'),
		('termos', 'accesorios'),
		('termos', 'invierno'),
		('termos', 'bolsas'),
		('gorras', 'eventos'),
		('gorras', 'ropa'),
		('gorras', 'accesorios'),
		('gorras', 'equipos'),
		('gorras', 'bolsas'),
		('plumas', 'papeleria'),
		('plumas', 'equipos')
) AS m("tipo", "categoria") ON m."tipo" = t."slug"
JOIN "categorias" c ON c."slug" = m."categoria"
WHERE EXISTS (
	SELECT 1
	FROM "producto_categorias" pc
	JOIN "categorias" cv ON cv."id" = pc."categoria_id"
	WHERE pc."producto_id" = p."id" AND cv."slug" = t."slug"
)
ON CONFLICT DO NOTHING;--> statement-breakpoint

DELETE FROM "producto_categorias" pc
USING "categorias" c, "productos" p, "tipos_de_producto" t
WHERE c."id" = pc."categoria_id"
	AND p."id" = pc."producto_id"
	AND t."id" = p."tipo_id"
	AND c."slug" IN ('playeras', 'sudaderas', 'tazas', 'mochilas', 'termos', 'gorras', 'plumas')
	AND t."slug" = c."slug";--> statement-breakpoint

DELETE FROM "categorias" c
WHERE c."slug" IN ('playeras', 'sudaderas', 'tazas', 'mochilas', 'termos', 'gorras', 'plumas')
	AND NOT EXISTS (
		SELECT 1 FROM "producto_categorias" pc WHERE pc."categoria_id" = c."id"
	);
