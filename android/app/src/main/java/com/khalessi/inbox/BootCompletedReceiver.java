package com.khalessi.inbox;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.content.ContextCompat;

public class BootCompletedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }
        SharedPreferences prefs = context.getSharedPreferences(InboxRealtimeService.PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString(InboxRealtimeService.KEY_AUTH_TOKEN, "");
        String serverUrl = prefs.getString(InboxRealtimeService.KEY_SERVER_URL, "");
        if (token != null && !token.isEmpty() && serverUrl != null && !serverUrl.isEmpty()) {
            Intent serviceIntent = new Intent(context, InboxRealtimeService.class);
            ContextCompat.startForegroundService(context, serviceIntent);
        }
    }
}
