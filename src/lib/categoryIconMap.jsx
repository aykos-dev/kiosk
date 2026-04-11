import comboImage from '../../assets/images/menu-groups/combos.png';
import pizzaImage from '../../assets/images/menu-groups/pizzas.png';
import snackImage from '../../assets/images/menu-groups/snacks.png';
import saladImage from '../../assets/images/menu-groups/salads.png';
import drinkImage from '../../assets/images/menu-groups/drinks.png';
import dessertImage from '../../assets/images/menu-groups/desserts.png';
import saucesImage from '../../assets/images/menu-groups/sauces.png';

const BY_KEY = {
  combo: comboImage,
  pizza: pizzaImage,
  snack: snackImage,
  salad: saladImage,
  drink: drinkImage,
  dessert: dessertImage,
  sauce: saucesImage,
};

function normalizeKey(name) {
  if (name == null || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/**
 * @param {{ name?: string | null, className?: string, size?: number }} props
 */
export function CategoryIcon({ name, className = '', size = 48 }) {
  const key = normalizeKey(name);
  const Icon = (key && BY_KEY[key]) || pizzaImage;
  return <img src={Icon} className={className} size={size} strokeWidth={1.75} aria-hidden />;
}
