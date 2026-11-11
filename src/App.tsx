import React, { useState, useEffect } from 'react';
import { RBACProvider } from './context/RBACContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { HRProvider } from './context/HRContext';
import { OrderCatalogProvider } from './context/OrderCatalogContext';
import { StoreBuilderProvider } from './context/StoreBuilderContext';
import { StoreCustomerProvider } from './context/StoreCustomerContext';
import { BenefitsProvider } from './context/BenefitsContext';
import { MainLayout } from './components/MainLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { StorefrontView } from './components/store/StorefrontView';
import { KioskSelfServiceView } from './components/kiosk/KioskSelfServiceView';

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
