package com.khalessi.inbox;

import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(InboxNativePlugin.class);
        super.onCreate(savedInstanceState);

        // Adaptar a la pantalla respetando barra de estado/notificaciones, muesca, barra de navegación y teclado
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        boolean isNight = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        int barBg = isNight ? Color.parseColor("#09090B") : Color.parseColor("#FFFFFF");
        getWindow().setStatusBarColor(barBg);
        getWindow().setNavigationBarColor(barBg);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(!isNight);
            controller.setAppearanceLightNavigationBars(!isNight);
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(barBg);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                // Solo systemBars + displayCutout; el teclado (IME) ya lo redimensiona adjustResize sin duplicar espacio
                Insets bars = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                                | WindowInsetsCompat.Type.displayCutout()
                );
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(contentView);
        }

        handleIntent(getIntent());

        // Gesto/botón Atrás de Android: primero retrocede dentro del chat -> lista; si ya está en lista, minimiza
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                            "(function(){var ev=new CustomEvent('kh-android-back',{cancelable:true});window.dispatchEvent(ev);return ev.defaultPrevented;})()",
                            value -> {
                                if (!"true".equals(value)) {
                                    moveTaskToBack(true);
                                }
                            }
                    );
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String convId = intent.getStringExtra("openConversationId");
        if (convId != null && !convId.isEmpty()) {
            InboxNativePlugin.pendingConversationId = convId;
            if (getBridge() != null && getBridge().getWebView() != null) {
                String safeId = convId.replace("'", "\\'");
                getBridge().getWebView().post(() ->
                        getBridge().getWebView().evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('kh-open-conversation',{detail:'" + safeId + "'}));",
                                null
                        )
                );
            }
        }
    }
}
