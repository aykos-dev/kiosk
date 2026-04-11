import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import staticPizzaTemplate from './data/pizzaTemplate.json';
import { buildPizzaTemplateFromApiProduct } from './lib/apiPizzaTemplate.js';
import { buildPizzaUpsellFromCategories } from './lib/pizzaUpsellFromMenu.js';
import pizzaUpsellFallback from './data/pizzaUpsell.json';
import { menuQuery } from './api/menu.js';
import { AdminPanel } from './components/AdminPanel.jsx';
import { AppShell } from './components/AppShell.jsx';
import { BackWithCartModal } from './components/BackWithCartModal.jsx';
import { IdleSessionModal } from './components/IdleSessionModal.jsx';
import { CartScreen } from './screens/CartScreen.jsx';
import { KioskMenuScreen } from './screens/KioskMenuScreen.jsx';
import { LanguageScreen } from './screens/LanguageScreen.jsx';
import { OrderConfirm } from './components/OrderConfirm.jsx';
import { PaymentMethodScreen } from './screens/PaymentMethodScreen.jsx';
import { PaymentProcessingScreen } from './components/PaymentProcessingScreen.jsx';
import { PaymentQrScreen } from './components/PaymentQrScreen.jsx';
import { KioskPasswordModal } from './components/KioskPasswordModal.jsx';
import { KioskSettingsModal } from './components/KioskSettingsModal.jsx';
import { WelcomeScreen } from './screens/WelcomeScreen.jsx';
import { buildCartRecommendationsFromCategories } from './lib/cartRecommendationsFromMenu.js';
import { deriveCartState } from './lib/cartUtils.js';
import { tEntity } from './lib/tEntity.js';
import { useAppShellEffects } from './hooks/useAppShellEffects.js';
import { DEFAULT_IDLE_SESSION_MS, useIdleSessionWarning } from './hooks/useIdleSessionWarning.js';
import { useComboPizzaFlow } from './hooks/useComboPizzaFlow.js';
import { useI18n } from './hooks/useI18n.js';
import { useKioskPayment } from './hooks/useKioskPayment.js';
import { useMenuCatalog } from './hooks/useMenuCatalog.js';
import { useOrderStore } from './store/orderStore.js';

export default function App() {
  const {
    screen,
    categoryId,
    cart,
    orderNumber,
    lastError,
    adminOpen,
    setCategory,
    addItem,
    addComboItem,
    addPizzaItem,
    incItem,
    decItem,
    incItemByProductId,
    decItemByProductId,
    clearCart,
    setScreen,
    setOrderNumber,
    setLastError,
    resetFlow,
    registerCornerTap,
    closeAdmin,
    orderType,
    setLocale,
    setOrderType,
  } = useOrderStore();

  const { t, locale } = useI18n();

  const [backCartModalOpen, setBackCartModalOpen] = useState(false);
  const [kioskPasswordOpen, setKioskPasswordOpen] = useState(false);
  const [kioskSettingsOpen, setKioskSettingsOpen] = useState(false);
  const [idleMs, setIdleMs] = useState(DEFAULT_IDLE_SESSION_MS);

  useEffect(() => {
    const kiosk = typeof window !== 'undefined' ? window.kiosk : undefined;
    if (!kiosk?.getConfig) return undefined;
    let cancelled = false;
    kiosk.getConfig().then((cfg) => {
      if (cancelled) return;
      const ms = cfg?.kiosk?.inactivityTimeout;
      if (typeof ms === 'number' && ms > 0) setIdleMs(ms);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const idleSession = useIdleSessionWarning({
    idleMs,
    countdownSeconds: 15,
    onExpire: resetFlow,
    enabled:
      (screen === 'menu' || screen === 'cart') && !adminOpen && !backCartModalOpen,
  });

  const { categories, heroSlides, activeItems } = useMenuCatalog(screen, categoryId, setCategory);

  const { data: menuCategories = [] } = useQuery(menuQuery);

  const pizzaUpsellResolved = useMemo(() => {
    const fromMenu = buildPizzaUpsellFromCategories(menuCategories, locale);
    const hasSauces = fromMenu.sauces.length > 0;
    const hasDrinks = fromMenu.drinks.length > 0;
    if (!hasSauces && !hasDrinks) return pizzaUpsellFallback;
    return {
      sauces: hasSauces ? fromMenu.sauces : pizzaUpsellFallback.sauces,
      drinks: hasDrinks ? fromMenu.drinks : pizzaUpsellFallback.drinks,
    };
  }, [menuCategories, locale]);

  const { total, qtyById } = useMemo(() => deriveCartState(cart), [cart]);

  const cartRecommendations = useMemo(
    () => buildCartRecommendationsFromCategories(menuCategories, locale),
    [menuCategories, locale],
  );

  const comboPizza = useComboPizzaFlow({
    screen,
    locale,
    addItem,
    addPizzaItem,
    pizzaUpsellData: pizzaUpsellResolved,
  });

  const pizzaTemplateResolved = useMemo(() => {
    if (!comboPizza.pizzaProduct) return staticPizzaTemplate;
    const built = buildPizzaTemplateFromApiProduct(comboPizza.pizzaProduct, locale);
    if (built.crusts?.length) return built;
    return staticPizzaTemplate;
  }, [comboPizza.pizzaProduct, locale]);

  const payment = useKioskPayment({
    cart,
    total,
    clearCart,
    setLastError,
    setOrderNumber,
    setScreen,
    screen,
    t,
  });

  useAppShellEffects({ locale });

  const handleBack = useCallback(() => {
    if (screen === 'menu') {
      if (cart.length > 0) {
        setBackCartModalOpen(true);
        return;
      }
      setScreen('language');
      return;
    }
    if (screen === 'language') {
      setScreen('welcome');
      return;
    }
    resetFlow();
  }, [cart.length, resetFlow, screen, setScreen]);

  const handleConfirmBackWithCart = useCallback(() => {
    setBackCartModalOpen(false);
    resetFlow();
  }, [resetFlow]);

  const handleAddRecommendation = useCallback(
    (rec) => {
      addItem({
        id: rec.id,
        name: rec.name,
        price: rec.price,
        image: rec.image,
      });
    },
    [addItem],
  );

  return (
    <AppShell
      welcome={screen === 'welcome'}
      adminLabel={t('common.admin')}
      onAdminCornerTap={() => registerCornerTap()}
    >
      {screen === 'welcome' && (
        <WelcomeScreen
          onStart={() => setScreen('language')}
          onOpenSettings={() => setKioskPasswordOpen(true)}
        />
      )}

      {screen === 'language' && (
        <LanguageScreen
          locale={locale}
          orderType={orderType}
          onLocale={setLocale}
          onOrderType={setOrderType}
          onContinue={() => setScreen('menu')}
          onBack={() => setScreen('welcome')}
        />
      )}

      {screen === 'menu' && (
        <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden">
        <KioskMenuScreen
          lastError={lastError}
          heroSlides={heroSlides}
          categories={categories}
          categoryId={categoryId}
          onSelectCategory={setCategory}
          activeItems={activeItems}
          qtyById={qtyById}
          cart={cart}
          total={total}
          onBack={handleBack}
          onOpenCart={() => setScreen('cart')}
          onAdd={addItem}
          onDec={decItem}
          onInc={incItem}
          onIncByProductId={incItemByProductId}
          onDecByProductId={decItemByProductId}
          onComboOpen={comboPizza.openComboModal}
          onPizzaOpen={comboPizza.openPizzaModal}
          comboProduct={comboPizza.comboProduct}
          comboDetailsLoading={comboPizza.comboDetailsLoading}
          comboSelections={comboPizza.comboSelections}
          comboPizzaBySlot={comboPizza.comboPizzaBySlot}
          onChangeComboSlot={(slotId) => comboPizza.setChangeSlotId(slotId)}
          onCloseCombo={comboPizza.closeComboModal}
          onConfirmCombo={() => {
            addComboItem(
              { ...comboPizza.comboProduct, name: tEntity(comboPizza.comboProduct, locale, 'name') },
              comboPizza.comboSelections,
              comboPizza.comboPizzaBySlot,
            );
            comboPizza.closeComboModal();
          }}
          changeSlot={comboPizza.changeSlot}
          changeSlotId={comboPizza.changeSlotId}
          selectedComboOptionId={comboPizza.comboSelections[comboPizza.changeSlotId]}
          onCloseChangeSlot={() => comboPizza.setChangeSlotId(null)}
          onConfirmChangeSlot={(optionId, pizzaPayload) => {
            const sid = comboPizza.changeSlotId;
            comboPizza.setComboSelections((prev) => ({ ...prev, [sid]: optionId }));
            if (pizzaPayload) {
              comboPizza.setComboPizzaBySlot((prev) => ({ ...prev, [sid]: pizzaPayload }));
            } else {
              comboPizza.setComboPizzaBySlot((prev) => {
                const next = { ...prev };
                delete next[sid];
                return next;
              });
            }
            comboPizza.setChangeSlotId(null);
          }}
          pizzaProduct={comboPizza.pizzaProduct}
          showPizzaUpsell={comboPizza.showPizzaUpsell}
          pizzaTemplate={pizzaTemplateResolved}
          onClosePizza={comboPizza.closePizzaFlow}
          onPizzaContinue={(draft) => {
            comboPizza.setPizzaDraft(draft);
            comboPizza.setShowPizzaUpsell(true);
          }}
          pizzaUpsellData={pizzaUpsellResolved}
          onCloseUpsell={() => comboPizza.setShowPizzaUpsell(false)}
          onUpsellFinish={comboPizza.handleUpsellFinish}
        />
        </div>
      )}

      {screen === 'cart' && (
        <CartScreen
          cart={cart}
          total={total}
          qtyById={qtyById}
          recommendations={cartRecommendations}
          onBack={() => setScreen('menu')}
          onConfirm={payment.openPayment}
          onDec={decItem}
          onInc={incItem}
          onAddRecommendation={handleAddRecommendation}
        />
      )}

      {screen === 'payment' && payment.paymentStep === 'select' && (
        <PaymentMethodScreen
          total={total}
          onBack={payment.onPaymentBack}
          onSelectQr={payment.onSelectQr}
          onSelectHumo={payment.onSelectHumo}
          onSelectCash={payment.onSelectCash}
        />
      )}

      {screen === 'payment' && payment.paymentStep === 'qr' && (
        <PaymentQrScreen onBack={payment.onPaymentBack} qrUrl={import.meta.env.VITE_PAYMENT_QR_URL} />
      )}

      {screen === 'payment' && payment.paymentStep === 'processing' && (
        <PaymentProcessingScreen total={total} />
      )}

      {screen === 'success' && orderNumber != null && (
        <OrderConfirm orderNumber={orderNumber} onStartOrder={resetFlow} />
      )}

      {adminOpen && <AdminPanel open={adminOpen} onClose={closeAdmin} />}

      <KioskPasswordModal
        open={kioskPasswordOpen}
        onClose={() => setKioskPasswordOpen(false)}
        onSuccess={() => {
          setKioskPasswordOpen(false);
          setKioskSettingsOpen(true);
        }}
      />

      <KioskSettingsModal open={kioskSettingsOpen} onClose={() => setKioskSettingsOpen(false)} />

      <IdleSessionModal
        open={idleSession.warningOpen}
        secondsLeft={idleSession.secondsLeft}
        onContinue={idleSession.staySession}
      />

      <BackWithCartModal
        open={backCartModalOpen}
        onCancel={() => setBackCartModalOpen(false)}
        onConfirm={handleConfirmBackWithCart}
      />
    </AppShell>
  );
}
