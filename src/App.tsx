import React, { useState, useEffect, Suspense, lazy } from 'react';
import { RBACProvider } from './context/RBACContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { OrderCatalogProvider } from './context/OrderCatalogContext';
import { StoreBuilderProvider } from './context/StoreBuilderContext';
import { StoreCustomerProvider } from './context/StoreCustomerContext';
import { BenefitsProvider } from './context/BenefitsContext';
import { InventoryProvider } from './context/InventoryContext';
import { MediaGalleryProvider } from './context/MediaGalleryContext';
import { BrandBootSplash } from './components/common/AppSurfaceSkeleton';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const loadMainLayout = () =>
  import('./components/MainLayout').then(m => ({ default: m.MainLayout }));
const loadLoginScreen = () =>
  import('./components/auth/LoginScreen').then(m => ({ default: m.LoginScreen }));
const loadStorefrontView = () =>
  import('./components/store/StorefrontView').then(m => ({ default: m.StorefrontView }));
const loadKioskSelfServiceView = () =>
  import('./components/kiosk/KioskSelfServiceView').then(m => ({ default: m.KioskSelfServiceView }));
const loadHRProvider = () =>
  import('./context/HRContext').then(m => ({ default: m.HRProvider }));

const MainLayout = lazy(loadMainLayout);
const LoginScreen = lazy(loadLoginScreen);
const StorefrontView = lazy(loadStorefrontView);
const KioskSelfServiceView = lazy(loadKioskSelfServiceView);
const LazyHRProvider = lazy(loadHRProvider);

/**
 * Dispara en paralelo la descarga del chunk JS correspondiente a la ruta inicial
 * para eliminar la cascada secuencial (main.js -> hidratación API -> chunk de ruta).
 */
export function preloadInitialRouteChunk(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  const hash = window.location.hash || '';

  if (path.startsWith('/kiosco') || hash.startsWith('#kiosco')) {
    void loadKioskSelfServiceView();
    return;
  }

  if (path.startsWith('/admin') || hash.startsWith('#admin')) {
    void loadHRProvider();
    const isAuth = localStorage.getItem('khalessi_erp_auth_v1') === 'authenticated';
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

  const isAdminRoute =
    currentPath.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#admin'));

  const isKioskRoute =
    currentPath.startsWith('/kiosco') ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#kiosco'));

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
                        {isKioskRoute ? (
                          <KioskSelfServiceView
                            embeddedInAdmin={false}
                            onExitToAdmin={() => navigate('/admin')}
                          />
                        ) : isAdminRoute ? (
                          <AppGate
                            onNavigateToStore={() => navigate('/')}
                            onNavigateToKiosk={() => navigate('/kiosco')}
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
