import { ComboDetailsModal } from "../components/ComboDetailsModal.jsx";
import { ComboItemChangeModal } from "../components/ComboItemChangeModal.jsx";
import { KioskCartBar } from "../components/KioskCartBar.jsx";
import { KioskHeader } from "../components/KioskHeader.jsx";
import { CategorySidebar } from "../components/CategorySidebar.jsx";
import { PizzaDetailsModal } from "../components/PizzaDetailsModal.jsx";
import { PizzaUpsellModal } from "../components/PizzaUpsellModal.jsx";
import { MenuHeroSlider } from "../components/MenuHeroSlider.jsx";
import { ProductCard } from "../components/ProductCard.jsx";

export function KioskMenuScreen({
  lastError,
  heroSlides,
  categories,
  categoryId,
  onSelectCategory,
  activeItems,
  qtyById,
  cart,
  total,
  onBack,
  onOpenCart,
  onAdd,
  onDec,
  onInc,
  onIncByProductId,
  onDecByProductId,
  onComboOpen,
  onPizzaOpen,
  comboProduct,
  comboDetailsLoading,
  comboSelections,
  comboPizzaBySlot,
  onChangeComboSlot,
  onCloseCombo,
  onConfirmCombo,
  changeSlot,
  changeSlotId,
  selectedComboOptionId,
  onCloseChangeSlot,
  onConfirmChangeSlot,
  pizzaProduct,
  showPizzaUpsell,
  pizzaTemplate,
  onClosePizza,
  onPizzaContinue,
  pizzaUpsellData,
  onCloseUpsell,
  onUpsellFinish,
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <KioskHeader
        onBack={onBack}
        online={typeof navigator !== "undefined" && navigator.onLine}
      />

      {lastError && (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-3 text-center text-[15px] text-red-900">
          {lastError}
        </div>
      )}

      <div className="relative h-[calc(min(100vw,962px)*255/740)] w-full shrink-0 overflow-hidden bg-brand-orange">
        <MenuHeroSlider slides={heroSlides} />
      </div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <CategorySidebar
          categories={categories}
          activeId={categoryId}
          onSelect={onSelectCategory}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[clamp(15rem,32vh,20rem)] pt-8">
          <div className="flex flex-wrap justify-center gap-6">
            {activeItems.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                qty={qtyById[product.id] || 0}
                onAdd={onAdd}
                onComboOpen={onComboOpen}
                onPizzaOpen={onPizzaOpen}
                onInc={onIncByProductId}
                onDec={onDecByProductId}
              />
            ))}
          </div>
        </div>
      </div>

      <KioskCartBar
        cart={cart}
        total={total}
        onOpenCart={onOpenCart}
        onDec={onDec}
        onInc={onInc}
      />

      {comboProduct && (comboDetailsLoading || comboProduct.combo) && (
        <ComboDetailsModal
          product={comboProduct}
          selections={comboSelections}
          comboPizzaBySlot={comboPizzaBySlot}
          loading={comboDetailsLoading}
          onChangeSlot={onChangeComboSlot}
          onClose={onCloseCombo}
          onConfirm={onConfirmCombo}
        />
      )}

      {comboProduct && !comboDetailsLoading && changeSlot && (
        <ComboItemChangeModal
          slot={changeSlot}
          selectedId={selectedComboOptionId}
          comboProduct={comboProduct}
          comboSelections={comboSelections}
          comboPizzaBySlot={comboPizzaBySlot}
          onClose={onCloseChangeSlot}
          onConfirm={onConfirmChangeSlot}
        />
      )}

      {pizzaProduct && (
        <div className={showPizzaUpsell ? "hidden" : ""}>
          <PizzaDetailsModal
            key={pizzaProduct.id}
            product={pizzaProduct}
            template={pizzaTemplate}
            badgeHit={!!pizzaProduct.hit}
            onClose={onClosePizza}
            onContinue={onPizzaContinue}
          />
        </div>
      )}

      {pizzaProduct && showPizzaUpsell && (
        <PizzaUpsellModal
          upsell={pizzaUpsellData}
          onClose={onCloseUpsell}
          onFinish={onUpsellFinish}
        />
      )}
    </div>
  );
}
