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
  ShoppingItem,
  SavingsGoal,
  EmergencyFundCalculation,
  Location,
  InventoryCategory,
  InventoryItem,
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

  getShoppingList: async (id: string): Promise<ShoppingList> => {
    const { data } = await api.get<ShoppingList>(`/finanzas/shopping/lists/${id}`);
    return data;
  },

  createShoppingList: async (listData: {
    nombre: string;
    descuento_general_porcentaje?: number;
  }): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>('/finanzas/shopping/lists', listData);
    return data;
  },

  addShoppingItem: async (
    listId: string,
    itemData: {
      nombre: string;
      precio_unitario: number;
      cantidad: number;
      descuento_especifico_porcentaje?: number;
    }
  ): Promise<ShoppingItem> => {
    const { data } = await api.post<ShoppingItem>(`/finanzas/shopping/lists/${listId}/items`, itemData);
    return data;
  },

  checkoutShoppingList: async (
    listId: string,
    checkoutData: {
      account_id: string;
      category_id: string;
      descripcion?: string;
    }
  ): Promise<Transaction> => {
    const { data } = await api.post<Transaction>(`/finanzas/shopping/lists/${listId}/checkout`, checkoutData);
    return data;
  },

  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const { data } = await api.get<SavingsGoal[]>('/finanzas/savings/goals');
    return data;
  },

  getEmergencyFund: async (meses: number = 3): Promise<EmergencyFundCalculation> => {
    const { data } = await api.get<EmergencyFundCalculation>('/finanzas/savings/emergency-fund-calculator', {
      params: { meses_cobertura: meses },
    });
    return data;
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

  getCategories: async (): Promise<InventoryCategory[]> => {
    const { data } = await api.get<InventoryCategory[]>('/inventario/categories');
    return data;
  },

  getItems: async (locationId?: string): Promise<InventoryItem[]> => {
    const { data } = await api.get<InventoryItem[]>('/inventario/items', {
      params: { location_id: locationId },
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
    fecha_vencimiento?: string;
  }): Promise<InventoryItem> => {
    const { data } = await api.post<InventoryItem>('/inventario/items', itemData);
    return data;
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
};


