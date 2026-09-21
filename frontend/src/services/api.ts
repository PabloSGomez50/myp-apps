import axios from 'axios';
import {
  TokenResponse,
  User,
  Household,
  Account,
  Category,
  Budget,
  Transaction,
  CoupleBalance,
  ShoppingList,
  ShoppingListCreate,
  ShoppingListUpdate,
  ShoppingCheckoutRequest,
  ShoppingItem,
  Supermarket,
  SupermarketCreate,
  SupermarketUpdate,
  FoodPriceHistory,
  PostCheckoutSyncRequest,
  SavingsGoal,
  EmergencyFundCalculation,
  Broker,
  BrokerTx,
  BrokerTxType,
  CurrencyQuote,
  InvestmentAsset,
  Location,
  InventoryCategory,
  InventoryItem,
  StockLog,
  SendToShoppingListRequest,
  CategoryMapping,
  CsvParseResponse,
  BulkImportRequest,
} from '@/types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching Auth token and Active Household ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('myp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const householdId = localStorage.getItem('myp_household_id');
  if (householdId) {
    config.headers['X-Household-ID'] = householdId;
  }
  return config;
});

// Interceptor for 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('myp_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==============================================================================
// Auth API Services
// ==============================================================================
export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/login', { email, password });
    return data;
  },
  register: async (registerData: {
    email: string;
    password: string;
    nombre: string;
    pin?: string;
    household_name?: string;
  }): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/register', registerData);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/core/me');
    return data;
  },
  switchPin: async (target_user_id: string, pin: string): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/auth/switch-profile', { target_user_id, pin });
    return data;
  },
};

export const coreApi = {
  getHousehold: async (): Promise<Household> => {
    const { data } = await api.get<Household>('/core/household');
    return data;
  },
  addHouseholdMember: async (memberData: { email: string; nombre: string }): Promise<Household> => {
    const { data } = await api.post<Household>('/core/household/members', memberData);
    return data;
  },

  updateUser: async (id: string, userData: { nombre?: string; color_avatar?: string }): Promise<User> => {
    const { data } = await api.put<User>(`/core/users/${id}`, userData);
    return data;
  },
};


// ==============================================================================
// Finanzas API Services
// ==============================================================================
export const finanzasApi = {
  getAccounts: async (onlyMine: boolean = false): Promise<Account[]> => {
    const { data } = await api.get<Account[]>('/finanzas/accounts', {
      params: { only_mine: onlyMine },
    });
    return data;
  },

  createAccount: async (accountData: {
    nombre: string;
    tipo: string;
    moneda: string;
    saldo_actual: number;
  }): Promise<Account> => {
    const { data } = await api.post<Account>('/finanzas/accounts', accountData);
    return data;
  },

  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/finanzas/categories');
    return data;
  },

  createCategory: async (categoryData: {
    nombre: string;
    tipo_gasto: string;
    icono?: string;
    color?: string;
  }): Promise<Category> => {
    const { data } = await api.post<Category>('/finanzas/categories', categoryData);
    return data;
  },

  updateCategory: async (
    id: string,
    categoryData: {
      nombre?: string;
      tipo_gasto?: string;
      icono?: string;
      color?: string;
      is_active?: boolean;
    }
  ): Promise<Category> => {
    const { data } = await api.put<Category>(`/finanzas/categories/${id}`, categoryData);
    return data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/categories/${id}`);
  },


  getBudgets: async (month: number, year: number): Promise<Budget[]> => {
    const { data } = await api.get<Budget[]>('/finanzas/budgets', {
      params: { month, year },
    });
    return data;
  },

  createBudget: async (budgetData: {
    category_id: string;
    month: number;
    year: number;
    monto_limite: number;
    moneda?: string;
  }): Promise<Budget> => {
    const { data } = await api.post<Budget>('/finanzas/budgets', budgetData);
    return data;
  },

  getCoupleBalance: async (): Promise<CoupleBalance> => {
    const { data } = await api.get<CoupleBalance>('/finanzas/balance/couple-net');
    return data;
  },

  createTransaction: async (txData: {
    account_id?: string | null;
    user_id?: string | null;
    category_id?: string | null;
    tipo?: string;
    monto: number;
    moneda?: string;
    es_compartido?: boolean;
    split_ratio?: number;
    tipo_cambio?: number;
    descripcion: string;
    fecha?: string;
  }): Promise<Transaction> => {
    const { data } = await api.post<Transaction>('/finanzas/transactions', txData);
    return data;
  },

  createSplitTransaction: async (splitData: {
    account_id?: string | null;
    user_id?: string | null;
    category_id: string;
    monto: number;
    moneda?: string;
    descripcion: string;
    fecha?: string;
  }): Promise<Transaction> => {
    const { data } = await api.post<Transaction>('/finanzas/transactions/split', splitData);
    return data;
  },

  getCategoryMappings: async (): Promise<CategoryMapping[]> => {
    const { data } = await api.get<CategoryMapping[]>('/finanzas/category-mappings');
    return data;
  },

  createCategoryMapping: async (mappingData: {
    patron: string;
    category_id: string;
  }): Promise<CategoryMapping> => {
    const { data } = await api.post<CategoryMapping>('/finanzas/category-mappings', mappingData);
    return data;
  },

  updateCategoryMapping: async (
    id: string,
    mappingData: { patron?: string; category_id?: string }
  ): Promise<CategoryMapping> => {
    const { data } = await api.put<CategoryMapping>(`/finanzas/category-mappings/${id}`, mappingData);
    return data;
  },

  deleteCategoryMapping: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/category-mappings/${id}`);
  },


  parseCsv: async (file: File): Promise<CsvParseResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<CsvParseResponse>('/finanzas/transactions/parse-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  bulkImport: async (bulkData: BulkImportRequest): Promise<{ imported_count: number }> => {
    const { data } = await api.post<{ imported_count: number }>('/finanzas/transactions/bulk-import', bulkData);
    return data;
  },

  getTransactions: async (params?: { user_id?: string; category_id?: string; limit?: number }): Promise<Transaction[]> => {
    const { data } = await api.get<Transaction[]>('/finanzas/transactions', { params });
    return data;
  },

  updateTransaction: async (id: string, txData: Partial<Transaction>): Promise<Transaction> => {
    const { data } = await api.put<Transaction>(`/finanzas/transactions/${id}`, txData);
    return data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/transactions/${id}`);
  },

  deleteAllTransactions: async (): Promise<void> => {
    await api.delete('/finanzas/transactions/all');
  },

  deleteFilteredTransactions: async (payload: {
    ids?: string[];
    user_id?: string;
    category_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ deleted_count: number }> => {
    const { data } = await api.post<{ deleted_count: number }>('/finanzas/transactions/bulk-delete', payload);
    return data;
  },

  createSettlement: async (settlementData: {
    source_user_id?: string | null;
    target_user_id?: string | null;
    source_account_id?: string | null;
    target_account_id?: string | null;
    monto: number;
    moneda?: string;
    descripcion?: string;
    fecha?: string;
  }): Promise<Transaction> => {
    const { data } = await api.post<Transaction>('/finanzas/transactions/settlement', settlementData);
    return data;
  },

  // Supermarkets & Stores
  getSupermarkets: async (): Promise<Supermarket[]> => {
    const { data } = await api.get<Supermarket[]>('/finanzas/supermarkets');
    return data;
  },

  createSupermarket: async (supermarketData: SupermarketCreate): Promise<Supermarket> => {
    const { data } = await api.post<Supermarket>('/finanzas/supermarkets', supermarketData);
    return data;
  },

  updateSupermarket: async (id: string, supermarketData: SupermarketUpdate): Promise<Supermarket> => {
    const { data } = await api.put<Supermarket>(`/finanzas/supermarkets/${id}`, supermarketData);
    return data;
  },

  deleteSupermarket: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/supermarkets/${id}`);
  },

  // Food Price History
  getFoodPriceHistory: async (itemNombre?: string): Promise<FoodPriceHistory[]> => {
    const { data } = await api.get<FoodPriceHistory[]>('/finanzas/food-price-history', {
      params: itemNombre ? { item_nombre: itemNombre } : {},
    });
    return data;
  },

  // Shopping Lists & Items
  getShoppingLists: async (estado?: string): Promise<ShoppingList[]> => {
    const { data } = await api.get<ShoppingList[]>('/finanzas/shopping/lists', {
      params: estado ? { estado } : {},
    });
    return data;
  },

  getShoppingList: async (id: string): Promise<ShoppingList> => {
    const { data } = await api.get<ShoppingList>(`/finanzas/shopping/lists/${id}`);
    return data;
  },

  createShoppingList: async (listData: ShoppingListCreate): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>('/finanzas/shopping/lists', listData);
    return data;
  },

  updateShoppingList: async (id: string, listData: ShoppingListUpdate): Promise<ShoppingList> => {
    const { data } = await api.put<ShoppingList>(`/finanzas/shopping/lists/${id}`, listData);
    return data;
  },

  deleteShoppingList: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/shopping/lists/${id}`);
  },

  addShoppingItem: async (
    listId: string,
    itemData: {
      nombre: string;
      precio_unitario: number;
      cantidad: number;
      descuento_especifico_porcentaje?: number;
      inventory_item_id?: string | null;
    }
  ): Promise<ShoppingItem> => {
    const { data } = await api.post<ShoppingItem>(`/finanzas/shopping/lists/${listId}/items`, itemData);
    return data;
  },

  updateShoppingItem: async (
    itemId: string,
    itemData: {
      nombre?: string;
      precio_unitario?: number;
      cantidad?: number;
      descuento_especifico_porcentaje?: number | null;
      comprado?: boolean;
      inventory_item_id?: string | null;
    }
  ): Promise<ShoppingItem> => {
    const { data } = await api.put<ShoppingItem>(`/finanzas/shopping/items/${itemId}`, itemData);
    return data;
  },

  deleteShoppingItem: async (itemId: string): Promise<void> => {
    await api.delete(`/finanzas/shopping/items/${itemId}`);
  },

  checkoutShoppingList: async (
    listId: string,
    checkoutData: ShoppingCheckoutRequest
  ): Promise<Transaction> => {
    const { data } = await api.post<Transaction>(`/finanzas/shopping/lists/${listId}/checkout`, checkoutData);
    return data;
  },

  postCheckoutSyncInventory: async (syncData: PostCheckoutSyncRequest): Promise<{ synced_count: number; message: string }> => {
    const { data } = await api.post<{ synced_count: number; message: string }>('/finanzas/shopping/post-checkout-sync', syncData);
    return data;
  },

  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const { data } = await api.get<SavingsGoal[]>('/finanzas/savings/goals');
    return data;
  },

  createSavingsGoal: async (goalData: {
    nombre: string;
    monto_objetivo: number;
    moneda?: string;
    fecha_limite?: string | null;
    user_id?: string | null;
    es_personal?: boolean;
  }): Promise<SavingsGoal> => {
    const { data } = await api.post<SavingsGoal>('/finanzas/savings/goals', goalData);
    return data;
  },

  updateSavingsGoal: async (
    id: string,
    goalData: {
      nombre?: string;
      monto_objetivo?: number;
      moneda?: string;
      fecha_limite?: string | null;
      user_id?: string | null;
      es_personal?: boolean;
    }
  ): Promise<SavingsGoal> => {
    const { data } = await api.put<SavingsGoal>(`/finanzas/savings/goals/${id}`, goalData);
    return data;
  },

  deleteSavingsGoal: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/savings/goals/${id}`);
  },

  contributeToGoal: async (
    goalId: string,
    contributionData: {
      account_id?: string | null;
      broker_id?: string | null;
      monto: number;
      fecha?: string;
    }
  ): Promise<SavingsGoal> => {
    const { data } = await api.post<SavingsGoal>(`/finanzas/savings/goals/${goalId}/contribute`, contributionData);
    return data;
  },

  getEmergencyFund: async (meses: number = 3): Promise<EmergencyFundCalculation> => {
    const { data } = await api.get<EmergencyFundCalculation>('/finanzas/savings/emergency-fund-calculator', {
      params: { meses_cobertura: meses },
    });
    return data;
  },

  getBrokers: async (): Promise<Broker[]> => {
    const { data } = await api.get<Broker[]>('/finanzas/investments/brokers');
    return data;
  },

  createBroker: async (brokerData: {
    nombre: string;
    saldo_total_ars?: number;
    saldo_total_usd?: number;
    saldo_total_crypto?: number;
    user_id?: string | null;
  }): Promise<Broker> => {
    const { data } = await api.post<Broker>('/finanzas/investments/brokers', brokerData);
    return data;
  },

  recordBrokerTransaction: async (
    brokerId: string,
    txData: {
      tipo: BrokerTxType;
      monto: number;
      moneda?: string;
      descripcion: string;
      fecha?: string;
    }
  ): Promise<BrokerTx> => {
    const { data } = await api.post<BrokerTx>(`/finanzas/investments/brokers/${brokerId}/transactions`, txData);
    return data;
  },

  getCurrencyQuotes: async (monedaOrigen?: string): Promise<CurrencyQuote[]> => {
    const { data } = await api.get<CurrencyQuote[]>('/finanzas/currency-quotes', {
      params: { moneda_origen: monedaOrigen },
    });
    return data;
  },

  getLatestCurrencyQuotes: async (): Promise<Record<string, number>> => {
    const { data } = await api.get<Record<string, number>>('/finanzas/currency-quotes/latest');
    return data;
  },

  createCurrencyQuote: async (quoteData: {
    moneda_origen: string;
    moneda_destino?: string;
    cotizacion: number;
    fecha?: string;
  }): Promise<CurrencyQuote> => {
    const { data } = await api.post<CurrencyQuote>('/finanzas/currency-quotes', quoteData);
    return data;
  },

  getInvestmentAssets: async (): Promise<InvestmentAsset[]> => {
    const { data } = await api.get<InvestmentAsset[]>('/finanzas/investments/assets');
    return data;
  },

  createInvestmentAsset: async (assetData: {
    ticker: string;
    nombre: string;
    tipo: string;
    cantidad: number;
    precio_compra?: number;
    precio_actual: number;
    rentabilidad_esperada_anual: number;
    moneda?: string;
    broker_id?: string | null;
  }): Promise<InvestmentAsset> => {
    const { data } = await api.post<InvestmentAsset>('/finanzas/investments/assets', assetData);
    return data;
  },

  updateInvestmentAsset: async (
    id: string,
    assetData: Partial<{
      ticker: string;
      nombre: string;
      tipo: string;
      cantidad: number;
      precio_compra: number;
      precio_actual: number;
      rentabilidad_esperada_anual: number;
      moneda: string;
      broker_id: string | null;
    }>
  ): Promise<InvestmentAsset> => {
    const { data } = await api.put<InvestmentAsset>(`/finanzas/investments/assets/${id}`, assetData);
    return data;
  },

  deleteInvestmentAsset: async (id: string): Promise<void> => {
    await api.delete(`/finanzas/investments/assets/${id}`);
  },
};

// ==============================================================================
// Inventario API Services
// ==============================================================================
export const inventarioApi = {
  getLocations: async (): Promise<Location[]> => {
    const { data } = await api.get<Location[]>('/inventario/locations');
    return data;
  },

  createLocation: async (locData: { nombre: string; descripcion?: string }): Promise<Location> => {
    const { data } = await api.post<Location>('/inventario/locations', locData);
    return data;
  },

  updateLocation: async (
    id: string,
    locData: { nombre?: string; descripcion?: string }
  ): Promise<Location> => {
    const { data } = await api.put<Location>(`/inventario/locations/${id}`, locData);
    return data;
  },

  deleteLocation: async (id: string): Promise<void> => {
    await api.delete(`/inventario/locations/${id}`);
  },

  getCategories: async (): Promise<InventoryCategory[]> => {
    const { data } = await api.get<InventoryCategory[]>('/inventario/categories');
    return data;
  },

  createCategory: async (catData: {
    nombre: string;
    icono?: string;
    color?: string;
  }): Promise<InventoryCategory> => {
    const { data } = await api.post<InventoryCategory>('/inventario/categories', catData);
    return data;
  },

  updateCategory: async (
    id: string,
    catData: { nombre?: string; icono?: string; color?: string }
  ): Promise<InventoryCategory> => {
    const { data } = await api.put<InventoryCategory>(`/inventario/categories/${id}`, catData);
    return data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/inventario/categories/${id}`);
  },

  getItems: async (locationId?: string, categoryId?: string): Promise<InventoryItem[]> => {
    const { data } = await api.get<InventoryItem[]>('/inventario/items', {
      params: { location_id: locationId, category_id: categoryId },
    });
    return data;
  },

  getLowStock: async (): Promise<InventoryItem[]> => {
    const { data } = await api.get<InventoryItem[]>('/inventario/low-stock');
    return data;
  },

  createItem: async (itemData: {
    nombre: string;
    location_id?: string;
    category_id?: string;
    stock_actual: number;
    stock_minimo: number;
    unidad_medida: string;
    fecha_vencimiento?: string | null;
  }): Promise<InventoryItem> => {
    const { data } = await api.post<InventoryItem>('/inventario/items', itemData);
    return data;
  },

  updateItem: async (
    id: string,
    itemData: Partial<{
      nombre: string;
      location_id: string | null;
      category_id: string | null;
      stock_actual: number;
      stock_minimo: number;
      unidad_medida: string;
      fecha_vencimiento: string | null;
    }>
  ): Promise<InventoryItem> => {
    const { data } = await api.put<InventoryItem>(`/inventario/items/${id}`, itemData);
    return data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventario/items/${id}`);
  },

  adjustStock: async (
    itemId: string,
    cantidadCambio: number,
    nota?: string
  ): Promise<InventoryItem> => {
    const { data } = await api.patch<InventoryItem>(`/inventario/items/${itemId}/stock`, {
      cantidad_cambio: cantidadCambio,
      nota,
    });
    return data;
  },

  getItemLogs: async (itemId: string): Promise<StockLog[]> => {
    const { data } = await api.get<StockLog[]>(`/inventario/items/${itemId}/logs`);
    return data;
  },

  sendToShoppingList: async (req: SendToShoppingListRequest): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>('/inventario/send-to-shopping-list', req);
    return data;
  },
};


