import { CategoryIcon } from '../lib/categoryIconMap.jsx';
import { tEntity } from '../lib/tEntity.js';
import { useI18n } from '../hooks/useI18n.js';

export function CategorySidebar({ categories = [], activeId, onSelect }) {
  const { t, locale } = useI18n();

  return (
    <aside className="flex h-full min-h-0 w-[180px] shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain border-r border-black/15 px-2 py-6 min-[560px]:w-[204px] min-[560px]:px-3 pb-[240px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => {
        const active = cat.id === activeId;
        const hasIcon = cat.icon != null && String(cat.icon).trim() !== '';
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex w-full flex-col items-center gap-2 rounded-[24px] px-3 py-4 shadow-card transition ${
              active
                ? 'border-[1.5px] border-brand-green bg-white'
                : 'border border-transparent bg-white'
            }`}
          >
            <div className="relative flex h-[132px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
              {hasIcon ? (
                <CategoryIcon name={cat.icon} className={active ? 'text-brand-green' : 'text-ink'} size={56} />
              ) : (
                <img
                  src={cat.image || '/menu-items/placeholder.svg'}
                  alt=""
                  className="h-full w-full object-cover mix-blend-multiply"
                />
              )}
              {cat.badgeNew && (
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  {t('common.new')}
                </span>
              )}
            </div>
            <span
              className={`max-w-full truncate px-1 text-center text-[18px] font-semibold leading-6 ${
                active ? 'text-brand-green' : 'text-ink'
              }`}
            >
              {tEntity(cat, locale, 'name')}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
