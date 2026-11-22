package com.khalessi.inbox;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DriverLocationService extends Service implements LocationListener {
    public static final String PREFS_NAME = "khalessi_driver_location_prefs";
    public static final String KEY_SERVER_URL = "serverUrl";
    public static final String KEY_AUTH_TOKEN = "authToken";
    public static final String KEY_DRIVER_ID = "driverId";
    public static final String KEY_DRIVER_NAME = "driverName";
    public static final String KEY_TENANT_ID = "tenantId";
    public static final String KEY_STATUS = "status";
    public static final String KEY_ORDER_ID = "activeOrderId";

    private static final String CHANNEL_ID = "khalessi_driver_gps_channel";
    private static final int NOTIF_ID = 4202;

    private LocationManager locationManager;
    private ExecutorService networkExecutor;

    @Override
    public void onCreate() {
        super.onCreate();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        networkExecutor = Executors.newSingleThreadExecutor();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification();
        startForeground(NOTIF_ID, notification);
        requestUpdates();
        return START_STICKY;
    }

    private void requestUpdates() {
        if (locationManager == null) return;
        boolean hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (!hasFine && !hasCoarse) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String status = prefs.getString(KEY_STATUS, "disponible");
        long minTimeMs = "en_ruta".equals(status) ? 5000L : 15000L;
        float minDistM = "en_ruta".equals(status) ? 5f : 12f;

        try {
            locationManager.removeUpdates(this);
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        minTimeMs,
                        minDistM,
                        this,
                        Looper.getMainLooper()
                );
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        minTimeMs * 2,
                        minDistM * 2,
                        this,
                        Looper.getMainLooper()
                );
            }
        } catch (SecurityException ignored) {
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;
        final double lat = location.getLatitude();
        final double lng = location.getLongitude();
        final float bearing = location.hasBearing() ? location.getBearing() : 0f;
        final int speedKmh = location.hasSpeed() ? Math.round(location.getSpeed() * 3.6f) : 0;
        final int accuracyM = location.hasAccuracy() ? Math.round(location.getAccuracy()) : 0;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        final String serverUrl = prefs.getString(KEY_SERVER_URL, "");
        final String authToken = prefs.getString(KEY_AUTH_TOKEN, "");
        final String driverId = prefs.getString(KEY_DRIVER_ID, "");
        final String driverName = prefs.getString(KEY_DRIVER_NAME, "Motorizado");
        final String tenantId = prefs.getString(KEY_TENANT_ID, "tenant-1");
        final String status = prefs.getString(KEY_STATUS, "disponible");
        final String activeOrderId = prefs.getString(KEY_ORDER_ID, "");

        if (serverUrl == null || serverUrl.isEmpty() || driverId == null || driverId.isEmpty()) {
            return;
        }

        networkExecutor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String cleanBase = serverUrl.replaceAll("/+$", "");
                URL url = new URL(cleanBase + "/api/delivery/location");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(6000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                if (authToken != null && !authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                }

                SimpleDateFormat isoFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                isoFmt.setTimeZone(TimeZone.getTimeZone("UTC"));

                JSONObject body = new JSONObject();
                body.put("driverId", driverId);
                body.put("driverName", driverName);
                body.put("tenantId", tenantId);
                body.put("lat", lat);
                body.put("lng", lng);
                body.put("heading", bearing);
                body.put("speedKmh", speedKmh);
                body.put("accuracyM", accuracyM);
                body.put("status", status);
                if (activeOrderId != null && !activeOrderId.isEmpty()) {
                    body.put("activeOrderId", activeOrderId);
                }
                body.put("timestamp", isoFmt.format(new Date()));

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload);
                }
                conn.getResponseCode();
            } catch (Exception ignored) {
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {
            }
        }
        if (networkExecutor != null) {
            networkExecutor.shutdownNow();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Khalessi Delivery GPS",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Seguimiento en tiempo real para motorizados");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Khalessi Delivery activo")
                .setContentText("Compartiendo ubicación en tiempo real")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }
}
