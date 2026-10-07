import { apiRequest } from '@/lib/api-client';

export interface PlanDto {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  currency?: string;
  features?: Record<string, number | null>;
}

export interface SubscriptionDto {
  id: string;
  orgId: string;
  planId: string;
  status: 'active' | 'canceled' | 'cancelled' | 'past_due' | 'trialing';
  startDate: string;
  endDate: string | null;
  graceDays: number;
  renewalPeriod: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export const plansApi = {
  list: (): Promise<PlanDto[]> =>
    apiRequest<PlanDto[]>('/billing/plans', { requiresTenant: false }),
};

export const subscriptionsApi = {
  getCurrent: (): Promise<SubscriptionDto> =>
    apiRequest<SubscriptionDto>('/billing/subscriptions/current'),
};
