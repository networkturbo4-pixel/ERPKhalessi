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

// Secreto para autenticar el webhook de combustible de motorizados (X-Webhook-Secret)
// define('DRIVER_WEBHOOK_SECRET', 'cambia_esto_por_secreto_webhook_aleatorio');

// Token del bot de Telegram (@BotFather) para respuestas automáticas directas sin n8n/Make
// define('TELEGRAM_BOT_TOKEN', '123456789:ABCdefGHIjklMNOpqrsTUVwxyz');

// Ruta al JSON de la Service Account de Google Cloud para Google Wallet API (Loyalty Passes)
// define('GOOGLE_WALLET_SERVICE_ACCOUNT_PATH', __DIR__ . '/storage/google-wallet-sa.json');
