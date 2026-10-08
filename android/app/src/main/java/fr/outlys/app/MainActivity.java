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
    public static final String CALL_CHANNEL_ID = "outlys_calls";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();

        // Récupération de la préférence enregistrée ou du mode sombre système
        boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isSystemDark);
        applySystemBars(isDark);
        setupSystemBarsInterface();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupSystemBarsInterface();
        boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isSystemDark);
        applySystemBars(isDark);
    }

    @Override
    public void onResume() {
        super.onResume();
        setupSystemBarsInterface();
        boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isSystemDark);
        applySystemBars(isDark);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        boolean isNight = (newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isNight);
        applySystemBars(isDark);
    }

    /**
     * Création des canaux de notification Android (Général et Appels de groupe)
     * avec haute importance, sonnerie, vibration et bannières déroulantes.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                // 1. Canal général (Messages, sondages, dépenses)
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

                AudioAttributes notifAudioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();
                channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), notifAudioAttributes);
                notificationManager.createNotificationChannel(channel);

                // 2. Canal d'appels entrants (Sonnerie de téléphone par défaut, vibration rythmée)
                NotificationChannel callChannel = new NotificationChannel(
                    CALL_CHANNEL_ID,
                    "Appels Outlys",
                    NotificationManager.IMPORTANCE_HIGH
                );
                callChannel.setDescription("Alertes sonores et sonneries des appels audio et vidéo de groupe");
                callChannel.enableLights(true);
                callChannel.setLightColor(Color.parseColor("#5D0D18"));
                callChannel.enableVibration(true);
                callChannel.setVibrationPattern(new long[]{0, 800, 500, 800, 500, 800});
                callChannel.setShowBadge(true);
                callChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

                AudioAttributes callAudioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
                callChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), callAudioAttributes);
                notificationManager.createNotificationChannel(callChannel);
            }
        }
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setupSystemBarsInterface();
        boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isSystemDark);
        applySystemBars(isDark);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            setupSystemBarsInterface();
            boolean isSystemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
            boolean isDark = getSharedPreferences("outlys_prefs", MODE_PRIVATE).getBoolean("is_dark_mode", isSystemDark);
            applySystemBars(isDark);
        }
    }

    /**
     * Enregistre l'interface JavaScript native "AndroidSystemBars"
     * pour permettre à l'application web de piloter instantanément les couleurs des barres.
     */
    private void setupSystemBarsInterface() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new SystemBarsBridge(), "AndroidSystemBars");
            }
        } catch (Exception ignored) {}
    }

    public class SystemBarsBridge {
        @JavascriptInterface
        public void setTheme(final boolean isDark) {
            getSharedPreferences("outlys_prefs", MODE_PRIVATE).edit().putBoolean("is_dark_mode", isDark).apply();
            runOnUiThread(() -> applySystemBars(isDark));
        }

        @JavascriptInterface
        public void setDarkMode(final boolean isDark) {
            getSharedPreferences("outlys_prefs", MODE_PRIVATE).edit().putBoolean("is_dark_mode", isDark).apply();
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
            if (decorView != null) {
                decorView.setBackgroundColor(backgroundColor);
                WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
                if (insetsController != null) {
                    // true pour des icônes sombres (fond clair), false pour des icônes claires/blanches (fond sombre)
                    insetsController.setAppearanceLightStatusBars(!isDark);
                    insetsController.setAppearanceLightNavigationBars(!isDark);
                }
            }
        });
    }
}

