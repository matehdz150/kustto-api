-- LOS SEIS MODELOS 3D QUE YA EXISTEN, y a qué plantilla le toca cada uno.
--
-- Hasta ahora el editor adivinaba el modelo con reglas dispersas: unas por el
-- NOMBRE del producto (`playera`, `gorra`, `taza`, `termo`) y otras por la
-- PLANTILLA (`hoodie-01`, `pencil-01`). Aquí queda escrito, y desde la galería
-- del backoffice se puede cambiar.
--
-- Idempotente: no pisa el nombre ni el archivo de un modelo que alguien ya
-- editó, y el enlace sólo se pone donde la plantilla todavía no tiene modelo.
-- Si una plantilla de la lista no existe en esta base (otro entorno), el
-- UPDATE no toca nada.

INSERT INTO "modelos_3d" ("id", "nombre", "mapeo", "glb_url") VALUES
	('playera',  'Playera',  'playera',  '/modelos/playera.glb'),
	('sudadera', 'Sudadera', 'sudadera', '/modelos/sudadera.glb'),
	('gorra',    'Gorra',    'gorra',    '/gorra/assets/gorra_web.glb'),
	('taza',     'Taza',     'taza',     NULL),
	('termo',    'Termo',    'termo',    '/termo/assets/termo_web.glb'),
	('pluma',    'Pluma',    'pluma',    '/modelos/pluma.glb')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "plantillas_de_prenda" SET "modelo3d_id" = v.modelo
FROM (VALUES
	('tshirt',    'playera'),
	('hoodie-01', 'sudadera'),
	('cap',       'gorra'),
	('taza-01',   'taza'),
	('termo-01',  'termo'),
	('termo-02',  'termo'),
	('pencil-01', 'pluma')
) AS v(plantilla, modelo)
WHERE "plantillas_de_prenda"."id" = v.plantilla
	AND "plantillas_de_prenda"."modelo3d_id" IS NULL;
