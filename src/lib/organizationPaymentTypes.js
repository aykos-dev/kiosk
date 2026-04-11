/**
 * @param {unknown[]} organizations
 * @param {string} organizationId
 */
export function getPaymentTypesForOrganization(organizations, organizationId) {
  const org = organizations?.find((o) => o && typeof o === 'object' && o.id === organizationId);
  if (!org?.terminals?.length) return [];
  const terminal = org.terminals[0];
  return Array.isArray(terminal.paymentTypes) ? terminal.paymentTypes : [];
}
