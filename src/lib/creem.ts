/**
 * Creem.io Payment Integration
 * Multi-currency support for global users
 */

// We copy the client code directly here to avoid import path issues
// Original source: ~/.openclaw/workspace/skills/creem/creem-client.ts

export interface CreemConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'one-time' | 'subscription';
  interval?: 'monthly' | 'yearly';
  slug: string;
  active: boolean;
  created_at: number;
}

export interface CheckoutSession {
  id: string;
  checkout_url: string;
  product_id: string;
  expires_at: number;
}

export interface Subscription {
  id: string;
  customer_id: string;
  product_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_end: number;
  cancel_at_period_end: boolean;
  created_at: number;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  created_at: number;
}

export interface AIQueryResponse {
  answer: string;
  data?: any;
}

export class CreemClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: CreemConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.creem.io/v1';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Creem API error ${response.status}: ${text}`);
    }

    return response.json();
  }

  // Products
  async listProducts(): Promise<{ products: Product[] }> {
    return this.request('GET', '/products');
  }

  async getProduct(id: string): Promise<{ product: Product }> {
    return this.request('GET', `/products/${id}`);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<{ product: Product }> {
    return this.request('POST', '/products', product);
  }

  async updateProduct(id: string, update: Partial<Product>): Promise<{ product: Product }> {
    return this.request('PATCH', `/products/${id}`, update);
  }

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/products/${id}`);
  }

  // Checkout
  async createCheckout(params: {
    product_id: string;
    success_url: string;
    cancel_url?: string;
    customer_email?: string;
  }): Promise<{ session: CheckoutSession }> {
    return this.request('POST', '/checkout', params);
  }

  // Subscriptions
  async listSubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    return this.request('GET', '/subscriptions');
  }

  async getSubscription(id: string): Promise<{ subscription: Subscription }> {
    return this.request('GET', `/subscriptions/${id}`);
  }

  async cancelSubscription(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/subscriptions/${id}`);
  }

  async updateSubscription(id: string, params: {
    cancel_at_period_end?: boolean;
  }): Promise<{ subscription: Subscription }> {
    return this.request('PATCH', `/subscriptions/${id}`, params);
  }

  // Customers
  async listCustomers(): Promise<{ customers: Customer[] }> {
    return this.request('GET', '/customers');
  }

  async getCustomer(id: string): Promise<{ customer: Customer }> {
    return this.request('GET', `/customers/${id}`);
  }

  // AI Business Insights
  async aiQuery(query: string): Promise<AIQueryResponse> {
    return this.request('POST', '/ai/query', { query });
  }
}

// Creem products (generation quota packs)
export interface QuotaProduct {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  quota: number;
  prices: {
    USD: number;
    CNY: number;
    EUR: number;
    GBP: number;
  };
  popular?: boolean;
  bestValue?: boolean;
}

// Available quota products - Creem will handle currency conversion automatically
// but we define localized prices for better UX
export const QUOTA_PRODUCTS: QuotaProduct[] = [
  {
    id: 'starter-2',
    name: { zh: '体验包', en: 'Starter Pack' },
    description: { zh: '适合偶尔需要生成照片', en: 'Perfect for occasional use' },
    quota: 2,
    prices: {
      USD: 1.99,
      CNY: 4.99,
      EUR: 1.79,
      GBP: 1.59,
    },
    popular: false,
  },
  {
    id: 'value-5',
    name: { zh: '超值包', en: 'Value Pack' },
    description: { zh: '推荐给家庭使用，帮亲友一起生成', en: 'Recommended for family use' },
    quota: 5,
    prices: {
      USD: 3.99,
      CNY: 9.99,
      EUR: 3.59,
      GBP: 3.19,
    },
    popular: true,
    bestValue: true,
  },
  {
    id: 'pro-12',
    name: { zh: '专业包', en: 'Pro Pack' },
    description: { zh: '经常使用，性价比最高', en: 'Frequent use, best value' },
    quota: 12,
    prices: {
      USD: 7.99,
      CNY: 19.99,
      EUR: 7.19,
      GBP: 6.49,
    },
    popular: false,
  },
];

// Get product by ID
export function getProductById(id: string): QuotaProduct | undefined {
  return QUOTA_PRODUCTS.find(p => p.id === id);
}

// Get formatted price based on currency
export function getFormattedPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    CNY: '¥',
    EUR: '€',
    GBP: '£',
  };
  
  return `${symbols[currency] || currency}${price.toFixed(2)}`;
}

// Initialize Creem client
export function getCreemClient(): CreemClient {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) {
    throw new Error('CREEM_API_KEY not configured in environment');
  }
  
  return new CreemClient({
    apiKey,
    baseUrl: process.env.CREEM_API_URL || 'https://api.creem.io/v1',
  });
}
