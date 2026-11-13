<?php
// Plantilla de configuración local. Copia este archivo como config.local.php y completa los valores reales.
// config.local.php NO debe subirse a Git.
define('DB_HOST', 'localhost');
define('DB_USER', 'tu_usuario_mysql');
define('DB_PASS', 'tu_password_mysql_seguro');
define('DB_NAME', 'tu_base_de_datos');

// Opcional: PIN de rescate inicial cuando aún no hay usuarios configurados en kv_storage
// define('ADMIN_BOOTSTRAP_PIN', '');

// Secreto aleatorio para firmar tokens HMAC-SHA256 (si se omite, se genera automáticamente en .token_secret.php)
// define('TOKEN_SECRET', 'cambia_esto_por_64_caracteres_hex_aleatorios');

// Secreto compartido con el servidor Node.js SSE (server/app.js -> ERP_REALTIME_SECRET)
// define('ERP_REALTIME_SECRET', 'cambia_esto_por_secreto_realtime_aleatorio');
