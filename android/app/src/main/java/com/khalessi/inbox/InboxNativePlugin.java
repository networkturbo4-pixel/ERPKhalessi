package com.khalessi.inbox;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "InboxNative")
public class InboxNativePlugin extends Plugin {
    public static String pendingConversationId = null;

    @PluginMethod
    public void startRealtimeService(PluginCall call) {
        String serverUrl = call.getString("serverUrl", "");
        String authToken = call.getString("authToken", "");
        String clientId = call.getString("clientId", "android-inbox");

        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(InboxRealtimeService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(InboxRealtimeService.KEY_SERVER_URL, serverUrl != null ? serverUrl : "")
                .putString(InboxRealtimeService.KEY_AUTH_TOKEN, authToken != null ? authToken : "")
                .putString(InboxRealtimeService.KEY_CLIENT_ID, clientId != null ? clientId : "android-inbox")
                .apply();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getActivity() != null) {
            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        4101
                );
            }
        }

        if (authToken != null && !authToken.isEmpty() && serverUrl != null && !serverUrl.isEmpty()) {
            Intent serviceIntent = new Intent(ctx, InboxRealtimeService.class);
            ContextCompat.startForegroundService(ctx, serviceIntent);
        }

        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopRealtimeService(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(InboxRealtimeService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(InboxRealtimeService.KEY_AUTH_TOKEN).apply();
        ctx.stopService(new Intent(ctx, InboxRealtimeService.class));

        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingConversationId(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("conversationId", pendingConversationId);
        pendingConversationId = null;
        call.resolve(ret);
    }

    @PluginMethod
    public void startDriverLocationService(PluginCall call) {
        String serverUrl = call.getString("serverUrl", "");
        String authToken = call.getString("authToken", "");
        String driverId = call.getString("driverId", "");
        String driverName = call.getString("driverName", "Motorizado");
        String tenantId = call.getString("tenantId", "tenant-1");
        String status = call.getString("status", "disponible");
        String activeOrderId = call.getString("activeOrderId", "");

        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(DriverLocationService.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(DriverLocationService.KEY_SERVER_URL, serverUrl != null ? serverUrl : "")
                .putString(DriverLocationService.KEY_AUTH_TOKEN, authToken != null ? authToken : "")
                .putString(DriverLocationService.KEY_DRIVER_ID, driverId != null ? driverId : "")
                .putString(DriverLocationService.KEY_DRIVER_NAME, driverName != null ? driverName : "Motorizado")
                .putString(DriverLocationService.KEY_TENANT_ID, tenantId != null ? tenantId : "tenant-1")
                .putString(DriverLocationService.KEY_STATUS, status != null ? status : "disponible")
                .putString(DriverLocationService.KEY_ORDER_ID, activeOrderId != null ? activeOrderId : "")
                .apply();

        if (getActivity() != null) {
            boolean needsFine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED;
            boolean needsCoarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED;
            if (needsFine || needsCoarse) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        4201
                );
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                            != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                        4202
                );
            }
        }

        if (driverId != null && !driverId.isEmpty()) {
            Intent serviceIntent = new Intent(ctx, DriverLocationService.class);
            ContextCompat.startForegroundService(ctx, serviceIntent);
        }

        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopDriverLocationService(PluginCall call) {
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, DriverLocationService.class));
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }
}
