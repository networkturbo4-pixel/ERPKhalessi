import React, { useState, useEffect, Suspense, lazy } from 'react';
import { RBACProvider } from './context/RBACContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { HRProvider } from './context/HRContext';
import { OrderCatalogProvider } from './context/OrderCatalogContext';
import { StoreBuilderProvider } from './context/StoreBuilderContext';
import { StoreCustomerProvider } from './context/StoreCustomerContext';
import { BenefitsProvider } from './context/BenefitsContext';
const MainLayout = lazy(() => import('./components/MainLayout').then(m => ({ default: m.MainLayout })));
const LoginScreen = lazy(() => import('./components/auth/LoginScreen').then(m => ({ default: m.LoginScreen })));
import { StorefrontView } from './components/store/StorefrontView';
const KioskSelfServiceView = lazy(() =>
  import('./components/kiosk/KioskSelfServiceView').then(m => ({ default: m.KioskSelfServiceView }))
);

interface AppGateProps {
  onNavigateToStore: () => void;
  onNavigateToKiosk: () => void;
}

const AppGate: React.FC<AppGateProps> = ({ onNavigateToStore, onNavigateToKiosk }) => {
  const { isAuthenticated } = useSettings();
  return isAuthenticated ? (
    <MainLayout
      onNavigateToStore={onNavigateToStore}
      onNavigateToKiosk={onNavigateToKiosk}
    />
  ) : (
    <LoginScreen onNavigateToStore={onNavigateToStore} />
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
    <RBACProvider>
      <SettingsProvider>
        <HRProvider>
          <OrderCatalogProvider>
            <StoreCustomerProvider>
              <BenefitsProvider>
                <StoreBuilderProvider>
                  <Suspense fallback={<div className="min-h-screen bg-neutral-950" />}>
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
          </OrderCatalogProvider>
        </HRProvider>
      </SettingsProvider>
    </RBACProvider>
  );
}

export default App;
