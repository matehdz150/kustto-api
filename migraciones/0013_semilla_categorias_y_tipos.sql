-- LAS DIEZ CATEGORÍAS DE LA TIENDA Y LOS TIPOS DE PRODUCTO.
--
-- Salen de la propuesta de landing (`app/landing-prueba/datos*.ts` en kustto-web)
-- y son las definitivas. Idempotente: si ya hay una categoría con ese slug NO
-- se le toca el nombre ni la imagen —alguien pudo haberlos cambiado—, sólo se le
-- pone el color y el orden, que son lo que la tienda nueva necesita.
--
-- Los tipos NO son categorías: un producto tiene un tipo y varias categorías
-- (ver `tiposDeProducto` en el esquema).

INSERT INTO "categorias" ("nombre", "slug", "color", "orden") VALUES
	('Eventos', 'eventos', '#a8505f', 1),
	('Ropa', 'ropa', '#a0a5ae', 2),
	('Hogar', 'hogar', '#2c4a8c', 3),
	('Accesorios', 'accesorios', '#bd6a2d', 4),
	('Bodas', 'bodas', '#a3b59b', 5),
	('Equipos y empresas', 'equipos', '#97a59d', 6),
	('Invierno', 'invierno', '#5f5499', 7),
	('Papelería', 'papeleria', '#a33a3a', 8),
	('Regalos', 'regalos', '#2f6a3f', 9),
	('Bolsas y viaje', 'bolsas', '#a07a73', 10)
ON CONFLICT ("slug") DO UPDATE SET "color" = EXCLUDED."color", "orden" = EXCLUDED."orden";--> statement-breakpoint
INSERT INTO "tipos_de_producto" ("nombre", "slug", "titulo", "orden") VALUES
	('Termos', 'termos', NULL, 1),
	('Playeras', 'playeras', NULL, 2),
	('Sudaderas', 'sudaderas', NULL, 3),
	('Totes', 'totes', NULL, 4),
	('Tazas', 'tazas', NULL, 5),
	('Botellas', 'botellas', NULL, 6),
	('Gorras', 'gorras', NULL, 7),
	('Lisas', 'lisas', 'Playeras lisas', 8),
	('Gorros', 'gorros', NULL, 9),
	('Mandiles', 'mandiles', NULL, 10),
	('Uniformes', 'uniformes', NULL, 11),
	('Peltre', 'peltre', 'Tazas de peltre', 12),
	('Cojines', 'cojines', NULL, 13),
	('Velas', 'velas', NULL, 14),
	('Decorativas', 'decorativas', 'Velas decorativas', 15),
	('Vasos', 'vasos', 'Vasos térmicos', 16),
	('Fundas', 'fundas', NULL, 17),
	('Mochilas', 'mochilas', NULL, 18),
	('Cajitas', 'cajitas', 'Cajitas de recuerdo', 19),
	('Lavanda', 'lavanda', 'Velas de lavanda', 20),
	('Libretas', 'libretas', NULL, 21),
	('Generación', 'generacion', 'Sudaderas de generación', 22),
	('Cuadernos', 'cuadernos', NULL, 23),
	('De manta', 'de-manta', 'Totes de manta', 24)
ON CONFLICT ("slug") DO NOTHING;
