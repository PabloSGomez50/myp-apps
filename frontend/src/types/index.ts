export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  nombre: string;
  color_avatar: string;
  is_active: boolean;
  created_at: string;
}

export interface Household {
  id: string;
  nombre: string;
  moneda_principal: 'ARS' | 'USD';
  members?: HouseholdMember[];
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  user: User;
  rol: UserRole;
  activo: boolean;
}

export interface AuthState {
  user: User | null;
  household: Household | null;
  householdMembers: User[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
  household_id: string | null;
}

export type ExpenseType =
  | 'FIXED_HOUSEHOLD'    // Gastos fijos compartidos del hogar
  | 'VARIABLE_HOUSEHOLD' // Gastos variables compartidos del hogar
  | 'LEISURE_COUPLE'     // Ocio y salidas compartidas de pareja
  | 'FIXED_PERSONAL'     // Gastos fijos individuales
  | 'VARIABLE_PERSONAL'; // Gastos variables individuales

export type AccountType = 'BANK' | 'FINTECH' | 'CASH' | 'CRYPTO_WALLET';

export interface Account {
  id: string;
  user_id: string;
  household_id: string;
  nombre: string;
  tipo: AccountType;
  moneda: string;
  saldo_actual: number;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  household_id: string;
  nombre: string;
  tipo_gasto: ExpenseType;
  icono: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  household_id: string;
  category_id: string;
  month: number;
  year: number;
  monto_limite: number;
  moneda: string;
  gastado: number;
  porcentaje_consumido: number;
  category?: Category;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'SETTLEMENT' | 'TRANSFER';

export interface Transaction {
  id: string;
  household_id: string;
  account_id?: string | null;
  user_id: string;
  category_id?: string | null;
  tipo: TransactionType;
  monto: number;
  moneda: string;
  es_compartido: boolean;
  split_ratio: number;
  tipo_cambio: number;
  descripcion: string;
  fecha: string;
  created_at: string;
  account?: Account | null;
  category?: Category | null;
}

export interface CategoryMapping {
  id: string;
  household_id: string;
  patron: string;
  category_id: string;
  category?: Category | null;
  created_at: string;
}

export interface CsvPreviewRow {
  row_index: number;
  fecha: string;
  concepto: string;
  monto: number;
  quien_pago_raw: string;
  user_id?: string | null;
  user_name?: string | null;
  user_matched: boolean;
  category_id?: string | null;
  category_name?: string | null;
  category_matched: boolean;
}

export interface CsvParseResponse {
  rows: CsvPreviewRow[];
  total_rows: number;
  unmatched_users: number;
  unmatched_categories: number;
}

export interface BulkImportRow {
  fecha: string;
  concepto: string;
  monto: number;
  user_id: string;
  category_id?: string | null;
  es_compartido: boolean;
}

export interface BulkImportRequest {
  rows: BulkImportRow[];
  new_mappings?: { patron: string; category_id: string }[];
}

export interface CoupleBalance {
  net_balance: number;
  active_user_id: string;
  active_user_name: string;
  partner_id?: string | null;
  partner_name?: string | null;
  currency: string;
  summary_text: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  descuento_especifico_porcentaje?: number | null;
  descuento_aplicado_porcentaje: number;
  precio_final_calculado: number;
  comprado: boolean;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  nombre: string;
  descuento_general_porcentaje: number;
  is_completed: boolean;
  total_con_descuentos: number;
  division_50_50: number;
  items: ShoppingItem[];
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  household_id: string;
  nombre: string;
  monto_objetivo: number;
  monto_acumulado: number;
  porcentaje_avance: number;
  moneda: string;
  fecha_limite?: string | null;
  created_at: string;
}

export interface EmergencyFundCalculation {
  gasto_fijo_promedio_mensual: number;
  meses_cobertura_sugeridos: number;
  meta_sugerida: number;
  ahorro_actual_emergencia: number;
  porcentaje_cobertura_actual: number;
  meses_cubiertos_reales: number;
}

export interface Location {
  id: string;
  household_id: string;
  nombre: string;
  descripcion?: string | null;
  created_at: string;
}

export interface InventoryCategory {
  id: string;
  household_id: string;
  nombre: string;
  icono: string;
  color: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  household_id: string;
  location_id?: string | null;
  category_id?: string | null;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  fecha_vencimiento?: string | null;
  es_stock_bajo?: boolean;
  location?: Location | null;
  category?: InventoryCategory | null;
  created_at: string;
}


