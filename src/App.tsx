import React, { useState, useEffect, Suspense, lazy } from 'react';
import { RBACProvider, useRBAC } from './context/RBACContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { OrderCatalogProvider } from './context/OrderCatalogContext';
import { StoreBuilderProvider } from './context/StoreBuilderContext';
import { StoreCustomerProvider } from './context/StoreCustomerContext';
import { BenefitsProvider } from './context/BenefitsContext';
import { InventoryProvider } from './context/InventoryContext';
import { MediaGalleryProvider } from './context/MediaGalleryContext';
import { BrandBootSplash } from './components/common/AppSurfaceSkeleton';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { clearLocalCacheKey } from './utils/diskPersistence';
import { isInboxAppMode } from './utils/serverUrl';

const loadMainLayout = () =>
  import('./components/MainLayout').then(m => ({ default: m.MainLayout }));
const loadLoginScreen = () =>
  import('./components/auth/LoginScreen').then(m => ({ default: m.LoginScreen }));
const loadStorefrontView = () =>
  import('./components/store/StorefrontView').then(m => ({ default: m.StorefrontView }));
const loadCustomPagePublicView = () =>
  import('./components/store/CustomPagePublicView').then(m => ({ default: m.CustomPagePublicView }));
const loadOrderPaymentPage = () =>
  import('./components/store/OrderPaymentPage').then(m => ({ default: m.OrderPaymentPage }));
const loadKioskSelfServiceView = () =>
  import('./components/kiosk/KioskSelfServiceView').then(m => ({ default: m.KioskSelfServiceView }));
const loadJobsLandingView = () =>
  import('./components/hr/JobsLandingView').then(m => ({ default: m.JobsLandingView }));
const loadReservationsLandingView = () =>
  import('./components/reservations/ReservationsLandingView').then(m => ({
    default: m.ReservationsLandingView,
  }));
const loadInstallerWizardView = () =>
  import('./components/install/InstallerWizardView').then(m => ({
    default: m.InstallerWizardView,
  }));
const loadHRProvider = () =>
  import('./context/HRContext').then(m => ({ default: m.HRProvider }));
const loadInboxAppView = () =>
  import('./components/inbox/InboxAppView').then(m => ({ default: m.InboxAppView }));

const MainLayout = lazy(loadMainLayout);
const LoginScreen = lazy(loadLoginScreen);
const StorefrontView = lazy(loadStorefrontView);
const CustomPagePublicView = lazy(loadCustomPagePublicView);
const OrderPaymentPage = lazy(loadOrderPaymentPage);
const KioskSelfServiceView = lazy(loadKioskSelfServiceView);
const JobsLandingView = lazy(loadJobsLandingView);
const ReservationsLandingView = lazy(loadReservationsLandingView);
const InstallerWizardView = lazy(loadInstallerWizardView);
const LazyHRProvider = lazy(loadHRProvider);
const InboxAppView = lazy(loadInboxAppView);

/**
 * Dispara en paralelo la descarga del chunk JS correspondiente a la ruta inicial
 * para eliminar la cascada secuencial (main.js -> hidratación API -> chunk de ruta).
 */
export function preloadInitialRouteChunk(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  const hash = window.location.hash || '';

  if (isInboxAppMode()) {
    void loadHRProvider();
    void loadInboxAppView();
    return;
  }

  if (path.startsWith('/install') || hash.startsWith('#install')) {
    void loadInstallerWizardView();
    return;
  }

  if (path.startsWith('/kiosco') || hash.startsWith('#kiosco')) {
    void loadKioskSelfServiceView();
    return;
  }

  if (path.startsWith('/pagar/') || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payOrder'))) {
    void loadOrderPaymentPage();
    return;
  }

  if (path.startsWith('/p/')) {
    void loadCustomPagePublicView();
    return;
  }

  if (path.startsWith('/trabaja')) {
    void loadHRProvider();
    void loadJobsLandingView();
    return;
  }

  if (path.startsWith('/admin') || hash.startsWith('#admin')) {
    void loadHRProvider();
    const isAuth = localStorage.getItem('gastro_erp_auth_v1') === 'authenticated';
    if (isAuth) {
      void loadMainLayout();
    } else {
      void loadLoginScreen();
    }
    return;
  }

  void loadStorefrontView();
}

interface AppGateProps {
  onNavigateToStore: () => void;
  onNavigateToKiosk: () => void;
}

const AppGate: React.FC<AppGateProps> = ({ onNavigateToStore, onNavigateToKiosk }) => {
  const { isAuthenticated } = useSettings();
  return (
    <LazyHRProvider>
      {isAuthenticated ? (
        <MainLayout
          onNavigateToStore={onNavigateToStore}
          onNavigateToKiosk={onNavigateToKiosk}
        />
      ) : (
        <LoginScreen onNavigateToStore={onNavigateToStore} />
      )}
    </LazyHRProvider>
  );
};

/**
 * Puerta de entrada unificada para la APK nativa / ruta /inbox-app:
 * - Si no hay sesión, muestra InboxAppView (que incluye conexión de servidor y login).
 * - Si el usuario autenticado tiene defaultModule === 'inbox', abre InboxAppView.
 * - Para cualquier otro rol (Motorizado -> delivery, Caja -> pos, Cocina -> kds, Admin -> dashboard),
 *   abre MainLayout directamente en su apartado asignado.
 */
const NativeAppGate: React.FC<AppGateProps> = ({ onNavigateToStore, onNavigateToKiosk }) => {
  const { isAuthenticated } = useSettings();
  const { resolvedDefaultModule } = useRBAC();
  const openInboxOnly = !isAuthenticated || resolvedDefaultModule === 'inbox';

  return (
    <LazyHRProvider>
      {openInboxOnly ? (
        <InboxAppView />
      ) : (
        <MainLayout
          onNavigateToStore={onNavigateToStore}
          onNavigateToKiosk={onNavigateToKiosk}
        />
      )}
    </LazyHRProvider>
  );
};

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isInboxRoute =
    isInboxAppMode() ||
    currentPath.startsWith('/inbox-app') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#inbox-app'));

  const isInstallRoute =
    currentPath.startsWith('/install') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#install'));

  const isAdminRoute =
    currentPath.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#admin'));

  const isKioskRoute =
    currentPath.startsWith('/kiosco') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#kiosco'));

  useEffect(() => {
    if (isInstallRoute || typeof window === 'undefined') return;
    let cancelled = false;
    fetch('/api/install.php?action=status', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data?.success && data.hasConfig === false && data.locked === false) {
          window.history.replaceState({}, '', '/install');
          setCurrentPath('/install');
        }
      })
      .catch(() => {
        // Silencioso en desarrollo local sin PHP
      });
    return () => {
      cancelled = true;
    };
  }, [isInstallRoute]);

  const payOrderMatch = currentPath.match(/^\/pagar\/([^/]+)\/?$/);
  const payOrderId =
    (payOrderMatch ? decodeURIComponent(payOrderMatch[1]) : null) ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('payOrder') : null);

  const customPageSlugMatch = currentPath.match(/^\/p\/([^/]+)\/?$/);
  const customPageSlug = customPageSlugMatch ? decodeURIComponent(customPageSlugMatch[1]) : null;

  const jobsRouteMatch = currentPath.match(/^\/trabaja(?:\/([^/]+))?\/?$/);
  const isJobsRoute = Boolean(jobsRouteMatch);
  const jobsSlugOrId = jobsRouteMatch?.[1] ? decodeURIComponent(jobsRouteMatch[1]) : null;

  const reservationsRouteMatch = currentPath.match(/^\/reservas(?:\/([^/]+))?\/?$/);
  const isReservationsRoute = Boolean(reservationsRouteMatch);
  const reservationTenantSlug = reservationsRouteMatch?.[1]
    ? decodeURIComponent(reservationsRouteMatch[1])
    : null;

  if (isInstallRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<BrandBootSplash pathname={currentPath} />}>
          <InstallerWizardView
            onNavigateToStore={() => {
              clearLocalCacheKey('gastro_erp_settings_v3');
              clearLocalCacheKey('gastro_erp_checkpoint_v3');
              clearLocalCacheKey('kh_store_builder_v2');
              window.location.assign('/');
            }}
            onNavigateToAdmin={() => {
              clearLocalCacheKey('gastro_erp_settings_v3');
              clearLocalCacheKey('gastro_erp_checkpoint_v3');
              clearLocalCacheKey('kh_store_builder_v2');
              window.location.assign('/admin');
            }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <RBACProvider>
        <SettingsProvider>
          <OrderCatalogProvider>
            <InventoryProvider>
              <MediaGalleryProvider>
                <StoreCustomerProvider>
                  <BenefitsProvider>
                    <StoreBuilderProvider>
                      <Suspense fallback={<BrandBootSplash pathname={currentPath} />}>
                        {isInboxRoute ? (
                          <NativeAppGate
                            onNavigateToStore={() => navigate('/')}
                            onNavigateToKiosk={() => navigate('/kiosco')}
                          />
                        ) : isKioskRoute ? (
                          <KioskSelfServiceView
                            embeddedInAdmin={false}
                            onExitToAdmin={() => navigate('/admin')}
                          />
                        ) : isAdminRoute ? (
                          <AppGate
                            onNavigateToStore={() => navigate('/')}
                            onNavigateToKiosk={() => navigate('/kiosco')}
                          />
                        ) : isReservationsRoute ? (
                          <ReservationsLandingView
                            tenantSlugOrId={reservationTenantSlug}
                            onNavigateHome={() => navigate('/')}
                          />
                        ) : isJobsRoute ? (
                          <LazyHRProvider>
                            <JobsLandingView
                              jobSlugOrId={jobsSlugOrId}
                              onNavigate={navigate}
                              onNavigateHome={() => navigate('/')}
                              onNavigateToAdmin={() => navigate('/admin')}
                            />
                          </LazyHRProvider>
                        ) : payOrderId ? (
                          <OrderPaymentPage
                            orderId={payOrderId}
                            onNavigateHome={() => navigate('/')}
                          />
                        ) : customPageSlug ? (
                          <CustomPagePublicView
                            slug={customPageSlug}
                            onNavigateHome={() => navigate('/')}
                            onNavigateToAdmin={() => navigate('/admin')}
                          />
                        ) : (
                          <StorefrontView onNavigateToAdmin={() => navigate('/admin')} />
                        )}
                      </Suspense>
                    </StoreBuilderProvider>
                  </BenefitsProvider>
                </StoreCustomerProvider>
              </MediaGalleryProvider>
            </InventoryProvider>
          </OrderCatalogProvider>
        </SettingsProvider>
      </RBACProvider>
    </ErrorBoundary>
  );
}

export default App;
