import { apiRequest } from '../api-client';

export interface SystemSettingsDto {
  orgId: string;
  taxName: string;
  taxRate: number;
  baseCurrency: string;
  updatedAt: string;
}

export interface UpdateSystemSettingsPayload {
  taxName?: string;
  taxRate?: number;
  baseCurrency?: string;
}

export interface ExchangeRateDto {
  id: string;
  baseCurrency: string;
  currencyCode: string;
  /** 1 unidad de currencyCode = rate unidades de baseCurrency. */
  rate: number;
  /** AAAA-MM-DD */
  effectiveDate: string;
  updatedAt: string;
}

export interface SetExchangeRatePayload {
  currencyCode: string;
  rate: number;
  effectiveDate?: string;
}

export const systemSettingsApi = {
  get(): Promise<SystemSettingsDto> {
    return apiRequest<SystemSettingsDto>('/organizations/system-settings');
  },
  update(payload: UpdateSystemSettingsPayload): Promise<SystemSettingsDto> {
    return apiRequest<SystemSettingsDto>('/organizations/system-settings', { method: 'PATCH', body: payload });
  },
  listRates(): Promise<ExchangeRateDto[]> {
    return apiRequest<ExchangeRateDto[]>('/organizations/exchange-rates');
  },
  setRate(payload: SetExchangeRatePayload): Promise<ExchangeRateDto> {
    return apiRequest<ExchangeRateDto>('/organizations/exchange-rates', { method: 'POST', body: payload });
  },
};