package fr.outlys.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "outlys_notifications";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();

        // Harmonisation initiale des barres système au démarrage selon le mode système
        boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applySystemBars(isSystemDark);
        setupSystemBarsInterface();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupSystemBarsInterface();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupSystemBarsInterface();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        boolean isNight = (newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applySystemBars(isNight);
    }

    /**
     * Création du canal de notification Android avec haute importance,
     * son, vibration, et bannières déroulantes pour les alertes en temps réel.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "Notifications Outlys",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Alertes en temps réel, messages et activités des groupes Outlys");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#5D0D18"));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();
                channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audioAttributes);

                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Enregistre l'interface JavaScript native "AndroidSystemBars"
     * pour permettre à l'application web de piloter instantanément les couleurs des barres.
     */
    private void setupSystemBarsInterface() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new SystemBarsBridge(), "AndroidSystemBars");
        }
    }

    public class SystemBarsBridge {
        @JavascriptInterface
        public void setTheme(final boolean isDark) {
            runOnUiThread(() -> applySystemBars(isDark));
        }
    }

    /**
     * Applique les couleurs d'arrière-plan et le style des icônes
     * sur la barre d'état supérieure et la barre de navigation inférieure.
     */
    public void applySystemBars(final boolean isDark) {
        runOnUiThread(() -> {
            Window window = getWindow();
            if (window == null) return;

            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            int backgroundColor = isDark ? Color.parseColor("#18181B") : Color.parseColor("#FFF9EB");
            window.setStatusBarColor(backgroundColor);
            window.setNavigationBarColor(backgroundColor);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }

            View decorView = window.getDecorView();
            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
            if (insetsController != null) {
                // true pour des icônes sombres (fond clair), false pour des icônes claires (fond sombre)
                insetsController.setAppearanceLightStatusBars(!isDark);
                insetsController.setAppearanceLightNavigationBars(!isDark);
            }
        });
    }
}

