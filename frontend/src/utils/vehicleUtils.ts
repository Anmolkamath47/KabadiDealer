export type VehicleCategory = 'bike' | 'rickshaw' | 'auto' | 'truck' | 'cart';

export interface VehicleDetails {
  category: VehicleCategory;
  name: string;
  badge: string;
  emoji: string;
  tagColor: string;
  bgGradient: string;
  ringColor: string;
  svgHtml: string;
}

const VEHICLE_SVGS: Record<VehicleCategory, string> = {
  bike: `
    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5.5" cy="17.5" r="3" />
      <circle cx="18.5" cy="17.5" r="3" />
      <path d="M15 6h3l-3 6h-6l-3-6H3" />
      <path d="M9 17.5l3-5.5 3 5.5" />
      <rect x="2" y="8" width="5" height="5" rx="1" fill="currentColor" fill-opacity="0.35" />
    </svg>
  `,
  rickshaw: `
    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M3 15.5l2-8h4l1 4h10v4" />
      <path d="M5 7.5h4" />
      <path d="M10 11.5h11v4H10z" fill="currentColor" fill-opacity="0.35" />
      <path d="M15 13l-1.5 2h2l-1.5 2" stroke-width="1.6" />
    </svg>
  `,
  auto: `
    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M4 14l3-7c1-1 3-1 8-1h2c2 0 3 1 3 3v5" />
      <path d="M7 6l-1 8h14" />
      <path d="M11 6v8" />
      <rect x="13" y="9.5" width="7" height="4.5" fill="currentColor" fill-opacity="0.4" rx="0.5" />
    </svg>
  `,
  truck: `
    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M2 15V8c0-.6.4-1 1-1h7c.6 0 1 .4 1 1v7" />
      <path d="M2 11h9" />
      <path d="M11 9h10c.6 0 1 .4 1 1v5h-11" />
      <path d="M14 9v6" />
      <path d="M18 9v6" />
      <rect x="11" y="9" width="11" height="6" fill="currentColor" fill-opacity="0.35" />
    </svg>
  `,
  cart: `
    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="17" r="3" />
      <path d="M2 8h3l3 9h10l2-6H7" />
      <rect x="8" y="7" width="10" height="4" rx="1" fill="currentColor" fill-opacity="0.35" />
    </svg>
  `,
};

export function getVehicleDetails(rawVehicleType?: string): VehicleDetails {
  const str = (rawVehicleType || '').toLowerCase().trim();

  // 1. Bike / 2-Wheeler / Scooter / Motorcycle
  if (
    str.includes('bike') ||
    str.includes('scooter') ||
    str.includes('motorcycle') ||
    str.includes('2-wheeler') ||
    str.includes('two-wheeler') ||
    str.includes('two wheeler') ||
    str.includes('activa') ||
    str.includes('splendor')
  ) {
    return {
      category: 'bike',
      name: rawVehicleType || 'Two-Wheeler with Cart',
      badge: '🛵 Bike / 2-Wheeler Cart',
      emoji: '🛵',
      tagColor: 'bg-violet-50 text-violet-700 border-violet-200',
      bgGradient: 'from-violet-600 to-indigo-600',
      ringColor: 'ring-violet-400/30',
      svgHtml: VEHICLE_SVGS.bike,
    };
  }

  // 2. Mini Truck / Tata Ace / Pickup / Hauler / Commercial
  if (
    str.includes('truck') ||
    str.includes('tata ace') ||
    str.includes('mini truck') ||
    str.includes('pickup') ||
    str.includes('hauler') ||
    str.includes('commercial') ||
    str.includes('mahindra') ||
    str.includes('bolero')
  ) {
    return {
      category: 'truck',
      name: rawVehicleType || 'Mini Truck (Tata Ace)',
      badge: '🚚 Tata Ace Mini Truck',
      emoji: '🚚',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      bgGradient: 'from-blue-600 to-cyan-600',
      ringColor: 'ring-blue-400/30',
      svgHtml: VEHICLE_SVGS.truck,
    };
  }

  // 3. 3-Wheeler Auto / Tempo / Ape
  if (
    str.includes('auto') ||
    str.includes('3-wheeler') ||
    str.includes('three-wheeler') ||
    str.includes('three wheeler') ||
    str.includes('ape') ||
    str.includes('tempo')
  ) {
    return {
      category: 'auto',
      name: rawVehicleType || '3-Wheeler Auto Loader',
      badge: '🛺 3-Wheeler Auto (Ape)',
      emoji: '🛺',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      bgGradient: 'from-amber-600 to-yellow-600',
      ringColor: 'ring-amber-400/30',
      svgHtml: VEHICLE_SVGS.auto,
    };
  }

  // 4. Cycle Cart / Handcart / Thela
  if (
    str.includes('cycle') ||
    str.includes('handcart') ||
    str.includes('cart') ||
    str.includes('thela')
  ) {
    return {
      category: 'cart',
      name: rawVehicleType || 'Cycle Cart / Thela',
      badge: '🛒 Cycle Cart / Thela',
      emoji: '🛒',
      tagColor: 'bg-orange-50 text-orange-700 border-orange-200',
      bgGradient: 'from-orange-600 to-amber-600',
      ringColor: 'ring-orange-400/30',
      svgHtml: VEHICLE_SVGS.cart,
    };
  }

  // 5. Default / E-Rickshaw Loader (Electric Mini Loader, E-Rickshaw, etc.)
  return {
    category: 'rickshaw',
    name: rawVehicleType || 'Electric Scrap Loader',
    badge: '🛺 E-Rickshaw Scrap Loader',
    emoji: '🛺',
    tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bgGradient: 'from-emerald-600 to-teal-600',
    ringColor: 'ring-emerald-400/30',
    svgHtml: VEHICLE_SVGS.rickshaw,
  };
}
