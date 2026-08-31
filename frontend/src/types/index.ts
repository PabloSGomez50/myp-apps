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
  created_at: string;
}

export interface AuthState {
  user: User | null;
  household: Household | null;
  householdMembers: User[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type ExpenseType =
  | 'FIXED_HOUSEHOLD'    // Gastos fijos compartidos del hogar (Alquiler, expensas, luz, gas, internet)
  | 'VARIABLE_HOUSEHOLD' // Gastos variables compartidos del hogar (Supermercado, farmacia, mantenimiento)
  | 'LEISURE_COUPLE'     // Ocio y salidas compartidas de pareja (Cenas, cine, viajes juntos)
  | 'FIXED_PERSONAL'     // Gastos fijos individuales de cada uno (Gimnasio, celular personal, seguro propio)
  | 'VARIABLE_PERSONAL'; // Gastos variables individuales (Ropa propia, almuerzos de trabajo, hobbies)

export interface Category {
  id: string;
  nombre: string;
  tipo_gasto: ExpenseType;
  icono: string;
  color: string;
}

export interface Account {
  id: string;
  user_id: string;
  nombre: string;
  tipo: 'BANK' | 'FINTECH' | 'CASH' | 'CRYPTO_WALLET';
  moneda: 'ARS' | 'USD' | 'USDT';
  saldo_actual: number;
  is_active: boolean;
}

export interface CoupleBalance {
  net_balance: number; // Positivo: pareja le debe al usuario, Negativo: usuario le debe a su pareja
  user_name: string;
  partner_name: string;
  currency: string;
}
