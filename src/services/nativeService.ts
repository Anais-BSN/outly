import { Capacitor } from '@capacitor/core';
import { App as CapApp, URLOpenListenerEvent } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { UserProfile } from '../types';
import { api } from './api';

/**
 * Service utilitaire unifié pour les fonctionnalités mobiles natives Capacitor
 */

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const getPlatform = (): string => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
};

/* =========================================================================
   1. RETOURS HAPTIQUES (Vibrations système subtiles)
   ========================================================================= */

export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    if (isNativePlatform()) {
      const impactStyle =
        style === 'heavy'
          ? ImpactStyle.Heavy
          : style === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
      await Haptics.impact({ style: impactStyle });
    }
  } catch (err) {
    // Ignorer silencieusement si non supporté
  }
};

export const triggerHapticNotification = async (
  type: 'success' | 'warning' | 'error' = 'success'
) => {
  try {
    if (isNativePlatform()) {
      const notifType =
        type === 'error'
          ? NotificationType.Error
          : type === 'warning'
          ? NotificationType.Warning
          : NotificationType.Success;
      await Haptics.notification({ type: notifType });
    }
  } catch (err) {
    // Ignorer silencieusement si non supporté
  }
};

/* =========================================================================
   2. PERSISTANCE DE SESSION PERMANENTE (Capacitor Preferences)
   ========================================================================= */

export const saveNativeSession = async (user: UserProfile, token?: string): Promise<void> => {
  try {
    if (!user || !user.id) return;
    await Preferences.set({ key: 'outly_user_id', value: user.id });
    if (token) {
      await Preferences.set({ key: 'outly_auth_token', value: token });
    }
    await Preferences.set({ key: 'outly_user_profile', value: JSON.stringify(user) });
  } catch (err) {
    console.warn('[NativeService] Erreur lors de la sauvegarde de session native:', err);
  }
};

export const getNativeSession = async (): Promise<{
  userId: string | null;
  token: string | null;
  user: UserProfile | null;
}> => {
  try {
    const { value: userId } = await Preferences.get({ key: 'outly_user_id' });
    const { value: token } = await Preferences.get({ key: 'outly_auth_token' });
    const { value: userStr } = await Preferences.get({ key: 'outly_user_profile' });

    let user: UserProfile | null = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (_) {}
    }

    return { userId, token, user };
  } catch (err) {
    console.warn('[NativeService] Erreur lors de la lecture de session native:', err);
    return { userId: null, token: null, user: null };
  }
};

export const clearNativeSession = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: 'outly_user_id' });
    await Preferences.remove({ key: 'outly_auth_token' });
    await Preferences.remove({ key: 'outly_user_profile' });
  } catch (err) {
    console.warn('[NativeService] Erreur lors de la suppression de session native:', err);
  }
};

/* =========================================================================
   3. PARTAGE DU SYSTÈME (Capacitor Share avec fallback Web Clipboard)
   ========================================================================= */

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
  dialogTitle?: string;
}

export const shareGroupInvite = async (options: ShareOptions): Promise<{ shared: boolean; method: 'native' | 'clipboard' }> => {
  triggerHaptic('light');

  // Si plateforme native ou Web Share API supportée
  if (isNativePlatform()) {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Inviter des amis sur Outlys',
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('canceled')) {
        return { shared: false, method: 'native' };
      }
    }
  }

  // Fallback presse-papier Web
  try {
    await navigator.clipboard.writeText(options.url);
    return { shared: true, method: 'clipboard' };
  } catch (err) {
    return { shared: false, method: 'clipboard' };
  }
};

/* =========================================================================
   4. NOTIFICATIONS PUSH NATIVES (Capacitor Push Notifications)
   ========================================================================= */

let pushListenersInitialized = false;

export const checkPushPermissions = async (): Promise<{ receive: string }> => {
  if (!isNativePlatform() || !PushNotifications || typeof PushNotifications.checkPermissions !== 'function') {
    return { receive: 'prompt' };
  }
  try {
    const status = await PushNotifications.checkPermissions();
    return { receive: status?.receive || 'prompt' };
  } catch (err) {
    console.warn('[Push] Impossible de vérifier les permissions push:', err);
    return { receive: 'prompt' };
  }
};

export const requestPushPermissions = async (): Promise<{ receive: string }> => {
  if (!isNativePlatform() || !PushNotifications || typeof PushNotifications.requestPermissions !== 'function') {
    return { receive: 'prompt' };
  }
  try {
    const status = await PushNotifications.requestPermissions();
    return { receive: status?.receive || 'prompt' };
  } catch (err) {
    console.warn('[Push] Impossible de demander les permissions push:', err);
    return { receive: 'prompt' };
  }
};

export const registerPushNotifications = async (): Promise<void> => {
  console.warn("Enregistrement push différé : configuration Firebase en attente");
};

export const initPushNotifications = async (
  userId: string,
  onNotificationReceived?: (notification: any) => void,
  onNotificationTapped?: (action: ActionPerformed) => void
): Promise<void> => {
  if (!isNativePlatform() || !userId) return;

  try {
    if (!PushNotifications || typeof PushNotifications.checkPermissions !== 'function') {
      console.warn('[Push] Le plugin PushNotifications n\'est pas disponible sur cette plateforme.');
      return;
    }

    // 1. Vérification / Demande sécurisée de permissions (ne doit pas enchaîner sur register())
    let permStatus: any = null;
    try {
      permStatus = await PushNotifications.checkPermissions();
      if (permStatus && (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale')) {
        permStatus = await PushNotifications.requestPermissions();
      }
    } catch (permErr) {
      console.warn('[Push] Impossible de vérifier ou demander les permissions push:', permErr);
      return;
    }

    if (!permStatus || permStatus.receive !== 'granted') {
      console.log('[Push] Permission de notifications non accordée ou refusée par l\'utilisateur');
      return;
    }

    // 2. Initialisation sécurisée des écouteurs d'événements
    if (!pushListenersInitialized) {
      try {
        // Écoute de l'attribution du jeton de l'appareil
        await PushNotifications.addListener('registration', async (token: Token) => {
          try {
            console.log('[Push] Device Token push reçu avec succès');
            if (token && token.value) {
              await api.registerPushToken(userId, token.value, getPlatform()).catch((e) => {
                console.warn('[Push] Enregistrement du token sur l\'API ignoré:', e?.message || e);
              });
            }
          } catch (tokErr) {
            console.warn('[Push] Erreur lors du traitement du token:', tokErr);
          }
        });

        // Erreur lors de l'enregistrement natif (ex. Firebase / Google Play Services non configurés)
        await PushNotifications.addListener('registrationError', (error: any) => {
          console.warn('[Push] Avertissement: Services push natifs (Firebase/APNS) non configurés ou indisponibles:', error?.error || error);
        });

        // Réception d'une notification en premier plan
        await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          try {
            console.log('[Push] Notification reçue en avant-plan:', notification);
            triggerHapticNotification('success');
            if (onNotificationReceived) {
              onNotificationReceived(notification);
            }
          } catch (notifErr) {
            console.warn('[Push] Erreur lors de la réception de notification:', notifErr);
          }
        });

        // Clic / Action sur une notification
        await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          try {
            console.log('[Push] Action effectuée sur notification:', action);
            triggerHaptic('medium');
            if (onNotificationTapped) {
              onNotificationTapped(action);
            }
          } catch (actionErr) {
            console.warn('[Push] Erreur lors du clic notification:', actionErr);
          }
        });

        pushListenersInitialized = true;
      } catch (listenerErr) {
        console.warn('[Push] Impossible d\'attacher les écouteurs de notifications:', listenerErr);
      }
    }

    // 3. Neutralisation de l'enregistrement natif pour éviter le crash Firebase Android
    console.warn("Enregistrement push différé : configuration Firebase en attente");
  } catch (err: any) {
    // Capture d'erreur absolue : l'application ne plantera jamais sur un échec push
    console.warn('[Push] Erreur non bloquante lors de l\'initialisation des notifications push:', err?.message || err);
  }
};

/* =========================================================================
   5. DEEP LINKING (Interception des URL / Liens d'invitation natifs)
   ========================================================================= */

export const setupAppUrlListener = (onUrlOpen: (url: string) => void): (() => void) => {
  let removeListener: (() => void) | null = null;
  try {
    if (isNativePlatform()) {
      const handleListener = CapApp.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
        if (data && data.url) {
          console.log('[DeepLink] Lien externe ouvert dans l\'application:', data.url);
          onUrlOpen(data.url);
        }
      });
      removeListener = () => {
        handleListener.then((handle) => handle.remove()).catch(() => {});
      };
    }
  } catch (err) {
    console.warn('[DeepLink] Erreur lors de l\'initialisation de appUrlOpen:', err);
  }

  return () => {
    if (removeListener) removeListener();
  };
};

/* =========================================================================
   6. HARMONISATION DES BARRES SYSTÈME ANDROID (Haut et Bas)
   ========================================================================= */

export const syncSystemBarsTheme = async (isDarkMode: boolean): Promise<void> => {
  const isDark = Boolean(isDarkMode);

  // 1. Interface native Android directe (pour un contrôle immédiat de la barre d'état et de la barre de navigation)
  const invokeNativeBridge = () => {
    try {
      const bridge = (window as any).AndroidSystemBars;
      if (bridge) {
        if (typeof bridge.setTheme === 'function') {
          bridge.setTheme(isDark);
          return true;
        }
        if (typeof bridge.setDarkMode === 'function') {
          bridge.setDarkMode(isDark);
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  if (!invokeNativeBridge()) {
    // Si l'interface native est en cours de liaison au démarrage de la WebView, réessaye après quelques ms
    setTimeout(invokeNativeBridge, 50);
    setTimeout(invokeNativeBridge, 150);
    setTimeout(invokeNativeBridge, 300);
    setTimeout(invokeNativeBridge, 800);
  }

  if (!isNativePlatform()) return;

  try {
    // 2. Configuration StatusBar via le plugin Capacitor
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (_) {}

    if (isDark) {
      // Mode sombre : fond sombre #18181B avec icônes claires (Style.Dark)
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#18181B' });
    } else {
      // Mode clair : fond crème/blanc #FFF9EB avec icônes foncées (Style.Light)
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#FFF9EB' });
    }
  } catch (err) {
    console.warn('[NativeService] Erreur lors de la synchronisation de la StatusBar:', err);
  }

  // 3. Barre de navigation inférieure Android (fallback plugin)
  try {
    const navBar = (Capacitor as any).Plugins?.NavigationBar || (window as any).NavigationBar;
    if (navBar) {
      if (typeof navBar.setColor === 'function') {
        await navBar.setColor({
          color: isDark ? '#18181B' : '#FFF9EB',
          darkButtons: !isDark,
        });
      } else if (typeof navBar.setNavigationBarColor === 'function') {
        await navBar.setNavigationBarColor(isDark ? '#18181B' : '#FFF9EB', !isDark);
      }
    }
  } catch (err) {
    // Non bloquant
  }
};

// Initialisation immédiate au chargement du script si exécuté dans la WebView native
if (typeof window !== 'undefined') {
  const initialIsDark = localStorage.getItem('outly_theme') === 'dark';
  syncSystemBarsTheme(initialIsDark);
}

/* =========================================================================
   7. NOTIFICATIONS LOCALES NATIVES (Sans dépendance Firebase)
   ========================================================================= */

let localNotificationsInitialized = false;

export const initLocalNotifications = async (
  onAction?: (notification: any) => void
): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    // 1. Vérification / Demande de permissions
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'prompt' || check.display === 'prompt-with-rationale') {
      await LocalNotifications.requestPermissions();
    }

    // 2. Création / Configuration du canal de notification Android avec haute priorité
    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'outlys_notifications',
          name: 'Notifications Outlys',
          description: 'Alertes en temps réel, messages et activités des groupes Outlys',
          importance: 5, // Haute importance -> déclenche la bannière déroulante (heads-up)
          visibility: 1, // Visible sur l'écran de verrouillage
          vibration: true,
          lights: true,
          lightColor: '#5D0D18',
          sound: 'default',
        });
      } catch (cErr) {
        console.warn('[LocalNotifications] Création canal (déjà existant ou non supporté):', cErr);
      }
    }

    // 3. Écouteur d'actions / clics sur notification
    if (!localNotificationsInitialized) {
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        try {
          console.log('[LocalNotifications] Clic utilisateur sur notification locale:', action);
          triggerHaptic('light');
          if (onAction) {
            onAction(action);
          }
        } catch (err) {
          console.warn('[LocalNotifications] Erreur lors du traitement du clic:', err);
        }
      });
      localNotificationsInitialized = true;
    }
  } catch (err) {
    console.warn('[LocalNotifications] Erreur lors de l\'initialisation des notifications locales:', err);
  }
};

export const sendNativeLocalNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  if (!isNativePlatform() || !title) return;

  try {
    // 1. Vérification sécurisée des permissions
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display !== 'granted') {
        console.log('[LocalNotifications] Permission non accordée, notification native ignorée');
        return;
      }
    }

    // 2. S'assurer que le canal de notification Android existe
    if (Capacitor.getPlatform() === 'android') {
      try {
        await LocalNotifications.createChannel({
          id: 'outlys_notifications',
          name: 'Notifications Outlys',
          description: 'Alertes en temps réel, messages et activités des groupes Outlys',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#5D0D18',
          sound: 'default',
        });
      } catch (_) {}
    }

    // 3. Génération d'un identifiant entier positif 32-bit pour Android
    const notifId = Math.floor(Math.random() * 2147483647);

    // 4. Émission immédiate de l'alerte système avec bannière déroulante et vibration
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: title,
          body: body || '',
          channelId: 'outlys_notifications',
          smallIcon: 'ic_stat_outlys',
          iconColor: '#5D0D18',
          extra: data || {},
          schedule: { at: new Date(Date.now() + 50), allowWhileIdle: true },
          autoCancel: true,
        },
      ],
    });

    triggerHapticNotification('success');
  } catch (err) {
    console.warn('[LocalNotifications] Impossible d\'émettre la notification locale native:', err);
  }
};
