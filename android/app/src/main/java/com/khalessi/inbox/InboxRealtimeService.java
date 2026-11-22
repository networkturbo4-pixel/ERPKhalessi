package com.khalessi.inbox;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

public class InboxRealtimeService extends Service {
    public static final String PREFS_NAME = "kh_inbox_native";
    public static final String KEY_SERVER_URL = "server_url";
    public static final String KEY_AUTH_TOKEN = "auth_token";
    public static final String KEY_CLIENT_ID = "client_id";
    public static final String KEY_LAST_TS = "last_notified_ts";

    private static final String CHANNEL_SYNC = "kh_inbox_sync";
    private static final String CHANNEL_MESSAGES = "kh_inbox_messages";
    private static final int FOREGROUND_ID = 41001;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Set<String> notifiedMessageIds = new HashSet<>();
    private Thread workerThread;
    private Thread pollThread;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification fgNotification = buildForegroundNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(FOREGROUND_ID, fgNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(FOREGROUND_ID, fgNotification);
        }

        if (running.compareAndSet(false, true)) {
            startLoops();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running.set(false);
        if (workerThread != null) workerThread.interrupt();
        if (pollThread != null) pollThread.interrupt();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel syncChannel = new NotificationChannel(
                CHANNEL_SYNC,
                "Conexión en segundo plano",
                NotificationManager.IMPORTANCE_MIN
        );
        syncChannel.setDescription("Mantiene la bandeja conectada para recibir mensajes en tiempo real.");
        syncChannel.setShowBadge(false);
        nm.createNotificationChannel(syncChannel);

        NotificationChannel msgChannel = new NotificationChannel(
                CHANNEL_MESSAGES,
                "Mensajes de clientes",
                NotificationManager.IMPORTANCE_HIGH
        );
        msgChannel.setDescription("Notificaciones en tiempo real de nuevos mensajes en la bandeja.");
        msgChannel.enableVibration(true);
        msgChannel.enableLights(true);
        nm.createNotificationChannel(msgChannel);
    }

    private Notification buildForegroundNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_SYNC)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Khalessi Bandeja")
                .setContentText("Escuchando mensajes en tiempo real")
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setContentIntent(pendingIntent)
                .build();
    }

    private void startLoops() {
        // Hilo 1: SSE en tiempo real contra /api/storage/stream
        workerThread = new Thread(() -> {
            int backoffMs = 3000;
            while (running.get()) {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String serverUrl = prefs.getString(KEY_SERVER_URL, "");
                String token = prefs.getString(KEY_AUTH_TOKEN, "");
                String clientId = prefs.getString(KEY_CLIENT_ID, "android-inbox");

                if (serverUrl == null || serverUrl.isEmpty() || token == null || token.isEmpty()) {
                    sleepQuietly(5000);
                    continue;
                }

                HttpURLConnection conn = null;
                try {
                    URL url = new URL(serverUrl + "/api/storage/stream?clientId=" + clientId);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(65000);
                    conn.setRequestProperty("Accept", "text/event-stream");
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("X-ERP-Token", token);
                    conn.setRequestProperty("X-Client-Id", clientId);

                    int code = conn.getResponseCode();
                    if (code >= 200 && code < 300) {
                        backoffMs = 3000;
                        BufferedReader reader = new BufferedReader(
                                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
                        );
                        String line;
                        while (running.get() && (line = reader.readLine()) != null) {
                            if (line.startsWith("data:")) {
                                String json = line.substring(5).trim();
                                if (json.contains("khalessi_whatsapp_conversations_v1")) {
                                    fetchAndCheckConversations(serverUrl, token, clientId);
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {
                } finally {
                    if (conn != null) conn.disconnect();
                }

                sleepQuietly(backoffMs);
                backoffMs = Math.min(backoffMs * 2, 20000);
            }
        }, "InboxSseThread");
        workerThread.start();

        // Hilo 2: Respaldo periódico cada 15s por si el proxy cPanel/CDN almacena en búfer el SSE
        pollThread = new Thread(() -> {
            while (running.get()) {
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String serverUrl = prefs.getString(KEY_SERVER_URL, "");
                String token = prefs.getString(KEY_AUTH_TOKEN, "");
                String clientId = prefs.getString(KEY_CLIENT_ID, "android-inbox");
                if (serverUrl != null && !serverUrl.isEmpty() && token != null && !token.isEmpty()) {
                    fetchAndCheckConversations(serverUrl, token, clientId);
                }
                sleepQuietly(15000);
            }
        }, "InboxPollThread");
        pollThread.start();
    }

    private synchronized void fetchAndCheckConversations(String serverUrl, String token, String clientId) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(serverUrl + "/api/storage/khalessi_whatsapp_conversations_v1?t=" + System.currentTimeMillis());
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(12000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("X-ERP-Token", token);
            conn.setRequestProperty("X-Client-Id", clientId);

            if (conn.getResponseCode() != 200) return;

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
            );
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);

            JSONObject wrapper = new JSONObject(sb.toString());
            Object rawVal = wrapper.opt("value");
            JSONArray conversations;
            if (rawVal instanceof String) {
                conversations = new JSONArray((String) rawVal);
            } else if (rawVal instanceof JSONArray) {
                conversations = (JSONArray) rawVal;
            } else {
                return;
            }

            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            long lastNotifiedTs = prefs.getLong(KEY_LAST_TS, 0L);
            long maxSeenTs = lastNotifiedTs;
            boolean isInitialBaseline = (lastNotifiedTs == 0L);

            for (int i = 0; i < conversations.length(); i++) {
                JSONObject conv = conversations.optJSONObject(i);
                if (conv == null) continue;
                String convId = conv.optString("id", "");
                String customerName = conv.optString("customerName", "Cliente");
                String channel = conv.optString("channel", "whatsapp");
                JSONArray msgs = conv.optJSONArray("messages");
                if (msgs == null || msgs.length() == 0) continue;

                for (int j = Math.max(0, msgs.length() - 5); j < msgs.length(); j++) {
                    JSONObject msg = msgs.optJSONObject(j);
                    if (msg == null) continue;
                    String sender = msg.optString("sender", "");
                    if (!"customer".equals(sender)) continue;

                    String msgId = msg.optString("id", "");
                    String tsStr = msg.optString("timestamp", "");
                    long msgTs = parseIsoMillis(tsStr);
                    if (msgTs > maxSeenTs) maxSeenTs = msgTs;

                    if (!isInitialBaseline && msgTs > lastNotifiedTs && !notifiedMessageIds.contains(msgId)) {
                        notifiedMessageIds.add(msgId);
                        if (notifiedMessageIds.size() > 200) notifiedMessageIds.clear();
                        String text = msg.optString("text", "Nuevo mensaje recibido");
                        if (text.isEmpty()) text = "Archivo adjunto o audio";
                        showMessageNotification(convId, customerName, channel, text);
                    }
                }
            }

            if (isInitialBaseline && maxSeenTs == 0L) {
                maxSeenTs = System.currentTimeMillis();
            }
            if (maxSeenTs > lastNotifiedTs) {
                prefs.edit().putLong(KEY_LAST_TS, maxSeenTs).apply();
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void showMessageNotification(String convId, String customerName, String channel, String body) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        String channelLabel = "whatsapp".equals(channel) ? "WhatsApp"
                : "facebook".equals(channel) ? "Messenger"
                : "instagram".equals(channel) ? "Instagram" : "Bandeja";

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("openConversationId", convId);

        int notifId = (convId.hashCode() & 0x0FFFFFFF) + 1000;
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notifId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_MESSAGES)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(customerName + " · " + channelLabel)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .build();

        nm.notify(notifId, notif);
    }

    private long parseIsoMillis(String iso) {
        if (iso == null || iso.isEmpty()) return 0L;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return java.time.Instant.parse(iso).toEpochMilli();
            }
        } catch (Exception ignored) {
        }
        return System.currentTimeMillis();
    }

    private void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
        }
    }
}
