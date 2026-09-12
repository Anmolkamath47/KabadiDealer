/**
 * Computes the display initial letter for a scrap dealer / partner account.
 * Prioritizes the dealer's business or personal name over generic system titles.
 */
export const getDealerInitial = (dealer?: {
  businessName?: string;
  contactPerson?: string;
  name?: string;
} | null): string => {
  if (!dealer) return 'D';

  const genericPlaceholders = new Set([
    'partner collector',
    'partner dealer',
    'partner account',
    'scrap collection center',
    'partner scrap business',
    'pending registration',
    'dealer',
    'partner',
  ]);

  const bName = dealer.businessName?.trim() || '';
  const cPerson = dealer.contactPerson?.trim() || '';
  const uName = (dealer as any).name?.trim() || '';

  // 1. If businessName is valid and not a system placeholder, use its first letter
  if (bName && !genericPlaceholders.has(bName.toLowerCase())) {
    return bName.charAt(0).toUpperCase();
  }

  // 2. If contactPerson is valid and not a system placeholder, use its first letter
  if (cPerson && !genericPlaceholders.has(cPerson.toLowerCase())) {
    return cPerson.charAt(0).toUpperCase();
  }

  // 3. If explicit name is present and not a system placeholder
  if (uName && !genericPlaceholders.has(uName.toLowerCase())) {
    return uName.charAt(0).toUpperCase();
  }

  // 4. Fallback to any non-empty string available
  if (bName) return bName.charAt(0).toUpperCase();
  if (cPerson) return cPerson.charAt(0).toUpperCase();
  if (uName) return uName.charAt(0).toUpperCase();

  return 'D';
};
