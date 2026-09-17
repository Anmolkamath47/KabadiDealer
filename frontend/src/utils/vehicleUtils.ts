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
  topDownSvgHtml: string;
}

// 1. Top-Down Photorealistic Vehicle Models for Live Map Live Tracking (Matching Zomato/Swiggy Delivery Vehicles)
const TOP_DOWN_VEHICLE_SVGS: Record<VehicleCategory, string> = {
  // Model 1: Delivery Scooter / Bike with Driver (Image 1 reference)
  bike: `
    <svg width="42" height="72" viewBox="0 0 42 72" fill="none" xmlns="http://www.w3.org/2000/svg" class="topdown-bike-svg">
      <!-- Ground Drop Shadow -->
      <ellipse cx="21" cy="38" rx="13" ry="30" fill="rgba(0,0,0,0.38)"/>
      <!-- Front Wheel -->
      <rect x="18" y="2" width="6" height="15" rx="3" fill="#0f172a"/>
      <!-- Front Mudguard (Red) -->
      <path d="M17 9C17 6.5 19 4.5 21 4.5C23 4.5 25 6.5 25 9L26 18H16L17 9Z" fill="#b91c1c"/>
      <!-- Headlight Beam -->
      <ellipse cx="21" cy="5" rx="3" ry="1.5" fill="#fef08a"/>
      <!-- Handlebars & Grips -->
      <path d="M6 17L18 19M24 19L36 17" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
      <rect x="4" y="15.5" width="4" height="3" rx="1" fill="#0f172a"/>
      <rect x="34" y="15.5" width="4" height="3" rx="1" fill="#0f172a"/>
      <!-- Side Mirrors -->
      <ellipse cx="5" cy="13" rx="2.5" ry="3.5" fill="#94a3b8" stroke="#334155" stroke-width="1"/>
      <ellipse cx="37" cy="13" rx="2.5" ry="3.5" fill="#94a3b8" stroke="#334155" stroke-width="1"/>
      <!-- Scooter Front Apron (Red) -->
      <path d="M14 18H28L30 27C30 29 26 30 21 30C16 30 12 29 12 27L14 18Z" fill="#dc2626"/>
      <!-- Rider Arms in Red Delivery Jacket -->
      <path d="M8 30L16 19L18 21L11 34Z" fill="#ef4444"/>
      <path d="M34 30L26 19L24 21L31 34Z" fill="#ef4444"/>
      <!-- Rider Shoulders in Red -->
      <ellipse cx="21" cy="31" rx="11" ry="7" fill="#dc2626"/>
      <!-- Helmet (White with Red Racing Stripe and Dark Visor) -->
      <ellipse cx="21" cy="27" rx="7" ry="8.5" fill="#f8fafc" stroke="#dc2626" stroke-width="1.5"/>
      <path d="M15 23C15 20.5 27 20.5 27 23C27 25 15 25 15 23Z" fill="#0f172a"/>
      <!-- Scooter Seat -->
      <rect x="16" y="36" width="10" height="15" rx="3" fill="#1e293b"/>
      <!-- Rear Scrap Carrier Rack / Bag (Red/Dark Brown with Straps) -->
      <rect x="10" y="52" width="22" height="17" rx="3" fill="#7f1d1d" stroke="#991b1b" stroke-width="1.5"/>
      <rect x="12" y="54" width="18" height="13" rx="2" fill="#991b1b"/>
      <line x1="10" y1="60" x2="32" y2="60" stroke="#f59e0b" stroke-width="2"/>
      <!-- Tail Light -->
      <rect x="17" y="69" width="8" height="2.5" rx="1" fill="#ef4444"/>
    </svg>
  `,

  // Model 2: Open-Bed Pickup Truck / Tata Ace (Image 2 reference)
  truck: `
    <svg width="46" height="82" viewBox="0 0 46 82" fill="none" xmlns="http://www.w3.org/2000/svg" class="topdown-truck-svg">
      <!-- Ground Shadow -->
      <rect x="3" y="4" width="40" height="76" rx="8" fill="rgba(0,0,0,0.4)"/>
      <!-- 4 Heavy Tires -->
      <rect x="1" y="14" width="5" height="12" rx="2" fill="#0f172a"/>
      <rect x="40" y="14" width="5" height="12" rx="2" fill="#0f172a"/>
      <rect x="1" y="58" width="5" height="14" rx="2" fill="#0f172a"/>
      <rect x="40" y="58" width="5" height="14" rx="2" fill="#0f172a"/>
      <!-- Cab Body (Rich Glossy Red) -->
      <path d="M6 7C6 4.5 9 3 14 3H32C37 3 40 4.5 40 7L41 33H5L6 7Z" fill="#b91c1c"/>
      <!-- Front Bumper & Headlights -->
      <rect x="6" y="3" width="34" height="4" rx="1.5" fill="#7f1d1d"/>
      <rect x="8" y="2.5" width="6" height="3" rx="1" fill="#fef08a"/>
      <rect x="32" y="2.5" width="6" height="3" rx="1" fill="#fef08a"/>
      <!-- Curved Front Windshield -->
      <path d="M9 10L37 10L35 22L11 22Z" fill="#0f172a"/>
      <path d="M12 11L21 11L18 21L10 21Z" fill="rgba(255,255,255,0.25)"/>
      <!-- Windshield Wipers -->
      <line x1="16" y1="21" x2="22" y2="14" stroke="#475569" stroke-width="1"/>
      <line x1="28" y1="21" x2="34" y2="14" stroke="#475569" stroke-width="1"/>
      <!-- Cab Roof (Bright Red) -->
      <rect x="10" y="22" width="26" height="11" rx="2" fill="#dc2626"/>
      <!-- Side Mirrors -->
      <rect x="0" y="12" width="4" height="5" rx="1" fill="#991b1b"/>
      <rect x="42" y="12" width="4" height="5" rx="1" fill="#991b1b"/>
      <!-- Open Cargo Bed Outer Shell (Red) -->
      <rect x="5" y="34" width="36" height="44" rx="2" fill="#991b1b" stroke="#7f1d1d" stroke-width="1.5"/>
      <!-- Open Bed Interior (Dark Red Ribbed Floor matching Image 2) -->
      <rect x="8" y="36" width="30" height="39" fill="#4c0e0e"/>
      <!-- Corrugated Floor Ribs -->
      <line x1="13" y1="37" x2="13" y2="74" stroke="#370707" stroke-width="1.5"/>
      <line x1="18" y1="37" x2="18" y2="74" stroke="#370707" stroke-width="1.5"/>
      <line x1="23" y1="37" x2="23" y2="74" stroke="#370707" stroke-width="1.5"/>
      <line x1="28" y1="37" x2="28" y2="74" stroke="#370707" stroke-width="1.5"/>
      <line x1="33" y1="37" x2="33" y2="74" stroke="#370707" stroke-width="1.5"/>
      <!-- Tailgate & Rear Lights -->
      <rect x="6" y="78" width="34" height="3" rx="0.5" fill="#7f1d1d"/>
      <rect x="8" y="78.5" width="4" height="2" fill="#ef4444"/>
      <rect x="34" y="78.5" width="4" height="2" fill="#ef4444"/>
    </svg>
  `,

  // Model 3: 3-Wheeler Auto / Tempo / Ape Loader (Image 3 reference)
  auto: `
    <svg width="44" height="74" viewBox="0 0 44 74" fill="none" xmlns="http://www.w3.org/2000/svg" class="topdown-auto-svg">
      <!-- Ground Shadow -->
      <ellipse cx="22" cy="39" rx="15" ry="33" fill="rgba(0,0,0,0.4)"/>
      <!-- Single Front Wheel -->
      <rect x="20" y="2" width="4.5" height="13" rx="2.25" fill="#0f172a"/>
      <!-- Tapered Front Nose Cab -->
      <path d="M16 6C16 3.5 28 3.5 28 6L33 19H11L16 6Z" fill="#b91c1c"/>
      <circle cx="22" cy="6" r="2.5" fill="#fef08a"/>
      <!-- Windshield -->
      <path d="M12 18H32L34 27H10L12 18Z" fill="#0f172a"/>
      <path d="M14 19L23 19L21 26L11 26Z" fill="rgba(255,255,255,0.2)"/>
      <!-- Cabin Roof (Red & Yellow Accent) -->
      <rect x="9" y="26" width="26" height="13" rx="3" fill="#dc2626"/>
      <path d="M14 26H30V28H14V26Z" fill="#f59e0b"/>
      <!-- Side Mirrors -->
      <rect x="6" y="20" width="3.5" height="3.5" rx="1" fill="#7f1d1d"/>
      <rect x="34.5" y="20" width="3.5" height="3.5" rx="1" fill="#7f1d1d"/>
      <!-- 2 Rear Tires -->
      <rect x="1" y="46" width="5" height="15" rx="2.5" fill="#0f172a"/>
      <rect x="38" y="46" width="5" height="15" rx="2.5" fill="#0f172a"/>
      <!-- Red Slatted Container / Cargo Box (matching Image 3) -->
      <rect x="6" y="39" width="32" height="32" rx="2.5" fill="#b91c1c" stroke="#7f1d1d" stroke-width="1.5"/>
      <!-- Container Slats -->
      <line x1="7" y1="45" x2="37" y2="45" stroke="#7f1d1d" stroke-width="2"/>
      <line x1="7" y1="52" x2="37" y2="52" stroke="#7f1d1d" stroke-width="2"/>
      <line x1="7" y1="59" x2="37" y2="59" stroke="#7f1d1d" stroke-width="2"/>
      <!-- Tailgate -->
      <rect x="8" y="69" width="28" height="3" fill="#7f1d1d"/>
      <rect x="9" y="69.5" width="4" height="2" fill="#ef4444"/>
      <rect x="31" y="69.5" width="4" height="2" fill="#ef4444"/>
    </svg>
  `,

  // Model 4: Electric Scrap Loader (E-Rickshaw)
  rickshaw: `
    <svg width="44" height="74" viewBox="0 0 44 74" fill="none" xmlns="http://www.w3.org/2000/svg" class="topdown-rickshaw-svg">
      <ellipse cx="22" cy="39" rx="15" ry="33" fill="rgba(0,0,0,0.38)"/>
      <!-- Front Wheel -->
      <rect x="20" y="2" width="4.5" height="13" rx="2.25" fill="#0f172a"/>
      <!-- Front Mudguard & Fairing (Emerald Green) -->
      <path d="M16 6C16 3.5 28 3.5 28 6L33 19H11L16 6Z" fill="#059669"/>
      <circle cx="22" cy="6" r="2.5" fill="#fef08a"/>
      <!-- Canopy Windshield -->
      <path d="M12 18H32L34 27H10L12 18Z" fill="#0f172a"/>
      <!-- Solar / Battery Roof (Emerald Green) -->
      <rect x="9" y="26" width="26" height="13" rx="3" fill="#10b981"/>
      <!-- Rear Wheels -->
      <rect x="1" y="46" width="5" height="15" rx="2.5" fill="#0f172a"/>
      <rect x="38" y="46" width="5" height="15" rx="2.5" fill="#0f172a"/>
      <!-- Green Steel Mesh Scrap Box -->
      <rect x="6" y="39" width="32" height="32" rx="2.5" fill="#047857" stroke="#065f46" stroke-width="1.5"/>
      <rect x="8" y="41" width="28" height="28" fill="#064e3b"/>
      <!-- Metal Scrap Cage Cross-bars -->
      <line x1="8" y1="41" x2="36" y2="69" stroke="#10b981" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="36" y1="41" x2="8" y2="69" stroke="#10b981" stroke-width="1" stroke-dasharray="3 2"/>
    </svg>
  `,

  // Model 5: Cycle Cart / Thela
  cart: `
    <svg width="42" height="72" viewBox="0 0 42 72" fill="none" xmlns="http://www.w3.org/2000/svg" class="topdown-cart-svg">
      <ellipse cx="21" cy="38" rx="14" ry="32" fill="rgba(0,0,0,0.35)"/>
      <rect x="19" y="2" width="4" height="15" rx="2" fill="#0f172a"/>
      <line x1="8" y1="17" x2="34" y2="17" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="21" cy="27" rx="8" ry="5" fill="#ea580c"/>
      <circle cx="21" cy="24" r="5" fill="#fed7aa"/>
      <rect x="1" y="38" width="4" height="26" rx="2" fill="#0f172a"/>
      <rect x="37" y="38" width="4" height="26" rx="2" fill="#0f172a"/>
      <rect x="6" y="34" width="30" height="36" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <line x1="12" y1="35" x2="12" y2="69" stroke="#92400e" stroke-width="1.5"/>
      <line x1="18" y1="35" x2="18" y2="69" stroke="#92400e" stroke-width="1.5"/>
      <line x1="24" y1="35" x2="24" y2="69" stroke="#92400e" stroke-width="1.5"/>
      <line x1="30" y1="35" x2="30" y2="69" stroke="#92400e" stroke-width="1.5"/>
    </svg>
  `,
};

// 2. Compact Badge SVGs for UI cards and lists
const VEHICLE_BADGE_SVGS: Record<VehicleCategory, string> = {
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
    str.includes('splendor') ||
    str.includes('scooty')
  ) {
    return {
      category: 'bike',
      name: rawVehicleType || 'Two-Wheeler with Cart',
      badge: '🛵 Bike / 2-Wheeler Cart',
      emoji: '🛵',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      bgGradient: 'from-rose-600 to-red-600',
      ringColor: 'ring-rose-400/30',
      svgHtml: VEHICLE_BADGE_SVGS.bike,
      topDownSvgHtml: TOP_DOWN_VEHICLE_SVGS.bike,
    };
  }

  // 2. Mini Truck / Tata Ace / Pickup / Hauler / Commercial (Image 2)
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
      tagColor: 'bg-red-50 text-red-700 border-red-200',
      bgGradient: 'from-red-600 to-rose-700',
      ringColor: 'ring-red-400/30',
      svgHtml: VEHICLE_BADGE_SVGS.truck,
      topDownSvgHtml: TOP_DOWN_VEHICLE_SVGS.truck,
    };
  }

  // 3. 3-Wheeler Auto / Tempo / Ape (Image 3)
  if (
    str.includes('auto') ||
    str.includes('3-wheeler') ||
    str.includes('three-wheeler') ||
    str.includes('three wheeler') ||
    str.includes('ape') ||
    str.includes('tempo') ||
    str.includes('piaggio')
  ) {
    return {
      category: 'auto',
      name: rawVehicleType || '3-Wheeler Auto Loader',
      badge: '🛺 3-Wheeler Auto (Ape)',
      emoji: '🛺',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      bgGradient: 'from-amber-600 to-red-600',
      ringColor: 'ring-amber-400/30',
      svgHtml: VEHICLE_BADGE_SVGS.auto,
      topDownSvgHtml: TOP_DOWN_VEHICLE_SVGS.auto,
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
      svgHtml: VEHICLE_BADGE_SVGS.cart,
      topDownSvgHtml: TOP_DOWN_VEHICLE_SVGS.cart,
    };
  }

  // 5. Default: Electric Scrap Loader (E-Rickshaw)
  return {
    category: 'rickshaw',
    name: rawVehicleType || 'Electric Scrap Loader',
    badge: '🛺 E-Rickshaw Scrap Loader',
    emoji: '🛺',
    tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bgGradient: 'from-emerald-600 to-teal-600',
    ringColor: 'ring-emerald-400/30',
    svgHtml: VEHICLE_BADGE_SVGS.rickshaw,
    topDownSvgHtml: TOP_DOWN_VEHICLE_SVGS.rickshaw,
  };
}
