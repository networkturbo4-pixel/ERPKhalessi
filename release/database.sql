-- ==============================================================================
-- KHALESSI PIZZA ERP - SCRIPT DE ESTRUCTURA Y DATOS INICIALES (MySQL / MariaDB)
-- Compatible con cPanel, phpMyAdmin y MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- Codificación: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "-05:00";

-- ------------------------------------------------------------------------------
-- 1. TABLA DE SUCURSALES (TENANTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(64) DEFAULT '',
  `is_active` TINYINT(1) DEFAULT 1,
  `is_main` TINYINT(1) DEFAULT 0,
  `settings_json` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenants_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABLA DE USUARIOS Y ROLES (STAFF DEL ERP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `tenant_id` VARCHAR(64) NOT NULL,
  `pin` VARCHAR(32) NOT NULL,
  `password_hash` VARCHAR(255) NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'cajero',
  `role_name` VARCHAR(100) DEFAULT 'Cajero',
  `email` VARCHAR(150) DEFAULT '',
  `phone` VARCHAR(64) DEFAULT '',
  `avatar_url` TEXT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `permissions_json` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_tenant` (`tenant_id`),
  KEY `idx_users_pin` (`pin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLA DE CATEGORÍAS DEL MENÚ
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `emoji` VARCHAR(16) DEFAULT '🍕',
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLA DE PRODUCTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `category_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `image_url` TEXT NULL,
  `badge` VARCHAR(50) DEFAULT NULL,
  `product_type` VARCHAR(50) DEFAULT 'simple',
  `is_available` TINYINT(1) DEFAULT 1,
  `has_sizes` TINYINT(1) DEFAULT 0,
  `sizes_json` LONGTEXT NULL,
  `ingredients_json` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLA DE MESAS DE SALÓN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tables` (
  `id` VARCHAR(64) NOT NULL,
  `tenant_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `capacity` INT DEFAULT 4,
  `status` VARCHAR(32) DEFAULT 'libre', -- libre, ocupada, reservada, atendiendo
  `current_order_id` VARCHAR(64) NULL,
  `pos_x` INT DEFAULT 0,
  `pos_y` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tables_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLA DE CLIENTES (CRM)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL,
  `document_type` VARCHAR(16) DEFAULT 'DNI',
  `document_number` VARCHAR(32) NOT NULL,
  `full_name` VARCHAR(180) NOT NULL,
  `email` VARCHAR(150) DEFAULT '',
  `phone` VARCHAR(64) DEFAULT '',
  `address` TEXT NULL,
  `reference` TEXT NULL,
  `points` INT DEFAULT 0,
  `total_orders_count` INT DEFAULT 0,
  `total_spent` DECIMAL(12,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_doc` (`document_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLA DE PEDIDOS Y COMANDAS (POS, KDS, DELIVERY, KIOSCO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `tenant_id` VARCHAR(64) NOT NULL,
  `order_number` VARCHAR(32) NOT NULL,
  `channel` VARCHAR(32) NOT NULL, -- salon, delivery, pickup, kiosco
  `status` VARCHAR(32) NOT NULL DEFAULT 'recibido', -- recibido, horno, listo, despachado, cancelado
  `table_id` VARCHAR(64) NULL,
  `customer_id` VARCHAR(64) NULL,
  `customer_name` VARCHAR(180) NOT NULL,
  `customer_phone` VARCHAR(64) DEFAULT '',
  `delivery_address` TEXT NULL,
  `payment_method` VARCHAR(32) DEFAULT 'efectivo', -- efectivo, tarjeta, yape, plin, culqi
  `payment_status` VARCHAR(32) DEFAULT 'pendiente', -- pendiente, pagado, reembolsado
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_by_user_id` VARCHAR(64) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_tenant` (`tenant_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_channel` (`channel`),
  KEY `idx_orders_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLA DE DETALLES DEL PEDIDO (PRODUCTOS POR PEDIDO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(180) NOT NULL,
  `size_label` VARCHAR(50) DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `options_json` LONGTEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLA DE CONFIGURACIÓN GLOBAL Y PERSONALIZACIÓN DE MARCA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. DATOS INICIALES POR DEFECTO (SEMILLA)
-- ------------------------------------------------------------------------------

-- Sucursal Principal
INSERT INTO `tenants` (`id`, `code`, `name`, `address`, `phone`, `is_active`, `is_main`) VALUES
('tenant-1', 'S1', 'Khalessi Pizza - Sede Central (La Molina)', 'Av. La Molina 1250, Lima', '987654321', 1, 1),
('tenant-2', 'S2', 'Khalessi Pizza - Sede Miraflores', 'Av. José Larco 450, Miraflores', '987654322', 1, 0),
('tenant-3', 'S3', 'Khalessi Pizza - Sede Surco', 'Av. Primavera 680, Santiago de Surco', '987654323', 1, 0)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Usuario Administrador Inicial
INSERT INTO `users` (`id`, `tenant_id`, `pin`, `name`, `role`, `role_name`, `email`) VALUES
('user-1', 'tenant-1', '12345678', 'Administrador General', 'superadmin', 'Super Administrador', 'admin@khalessipizza.com')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Categorías del Menú
INSERT INTO `categories` (`id`, `name`, `slug`, `emoji`, `sort_order`) VALUES
('cat-1', 'Pizzas Artesanales', 'pizzas', '🍕', 1),
('cat-2', 'Combos y Promos', 'combos', '🔥', 2),
('cat-3', 'Bebidas y Refrescos', 'bebidas', '🥤', 3),
('cat-4', 'Entradas y Piques', 'entradas', '🥖', 4),
('cat-5', 'Postres', 'postres', '🍰', 5)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Productos Muestra
INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `base_price`, `image_url`, `badge`, `has_sizes`) VALUES
('prod-1', 'cat-1', 'Pizza Americana Artesanal', 'Salsa pomodoro casera, abundante queso mozzarella y jamón inglés seleccionado.', 35.00, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', 'Clásica', 1),
('prod-2', 'cat-1', 'Pizza Pepperoni Supreme', 'Pepperoni americano premium, mozzarella hilado y orégano de la casa.', 39.00, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80', 'Favorita', 1),
('prod-3', 'cat-1', 'Pizza Cuatro Quesos', 'Mozzarella, parmesano reggiano, queso gouda y queso crema aromatizado con albahaca.', 44.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', 'Gourmet', 1),
('prod-4', 'cat-2', 'Combo Pareja (1 Pizza + 2 Bebidas)', '1 Pizza mediana a elección + 2 gaseosas 500ml.', 49.90, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80', 'Ahorro', 0),
('prod-5', 'cat-3', 'Gaseosa Inka Cola 1.5L', 'Bien helada para acompañar tu pizza.', 11.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80', NULL, 0)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
