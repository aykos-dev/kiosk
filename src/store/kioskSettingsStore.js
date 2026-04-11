import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_KIOSK_CITY_ID,
  DEFAULT_KIOSK_ORGANIZATION_ID,
} from '../lib/organizationConstants.js';

const STORAGE_KEY = 'bellissimo-kiosk-settings';

/**
 * Persisted venue scope for organizations fetch and payment-type lookup.
 */
export const useKioskSettingsStore = create(
  persist(
    (set) => ({
      cityId: DEFAULT_KIOSK_CITY_ID,
      organizationId: DEFAULT_KIOSK_ORGANIZATION_ID,

      setCityId: (cityId) =>
        set({
          cityId: typeof cityId === 'string' && cityId.trim() ? cityId.trim() : DEFAULT_KIOSK_CITY_ID,
        }),

      setOrganizationId: (organizationId) =>
        set({
          organizationId:
            typeof organizationId === 'string' && organizationId.trim()
              ? organizationId.trim()
              : DEFAULT_KIOSK_ORGANIZATION_ID,
        }),

      setKioskLocation: (cityId, organizationId) =>
        set({
          cityId: typeof cityId === 'string' && cityId.trim() ? cityId.trim() : DEFAULT_KIOSK_CITY_ID,
          organizationId:
            typeof organizationId === 'string' && organizationId.trim()
              ? organizationId.trim()
              : DEFAULT_KIOSK_ORGANIZATION_ID,
        }),

      resetToDefaults: () =>
        set({
          cityId: DEFAULT_KIOSK_CITY_ID,
          organizationId: DEFAULT_KIOSK_ORGANIZATION_ID,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ cityId: s.cityId, organizationId: s.organizationId }),
    },
  ),
);
