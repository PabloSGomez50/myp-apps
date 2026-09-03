import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, Household } from '@/types';
import { authApi, coreApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  pin?: string;
  household_name?: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  switchProfileWithPin: (userId: string, pin: string) => Promise<boolean>;
  activeUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<User[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('myp_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('myp_token');
      if (savedToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);

          try {
            const householdData = await coreApi.getHousehold();
            setHousehold(householdData);
          } catch {
            setHousehold(null);
          }
        } catch {
          logout();
        }
      } else {
        setUser(null);
        setHousehold(null);
        setHouseholdMembers([]);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('myp_token', res.access_token);
      if (res.household_id) {
        localStorage.setItem('myp_household_id', res.household_id);
      }
      setToken(res.access_token);
      setUser(res.user);

      try {
        const householdData = await coreApi.getHousehold();
        setHousehold(householdData);
      } catch {
        setHousehold(null);
      }

      queryClient.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (registerData: RegisterData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(registerData);
      localStorage.setItem('myp_token', res.access_token);
      if (res.household_id) {
        localStorage.setItem('myp_household_id', res.household_id);
      }
      setToken(res.access_token);
      setUser(res.user);

      try {
        const householdData = await coreApi.getHousehold();
        setHousehold(householdData);
      } catch {
        setHousehold(null);
      }

      queryClient.invalidateQueries();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('myp_token');
    localStorage.removeItem('myp_household_id');
    setToken(null);
    setUser(null);
    setHousehold(null);
    setHouseholdMembers([]);
    queryClient.clear();
  };

  const switchProfileWithPin = async (userId: string, pin: string): Promise<boolean> => {
    if (pin.length !== 4) return false;
    try {
      const res = await authApi.switchPin(userId, pin);
      localStorage.setItem('myp_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      queryClient.invalidateQueries();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeUser: user,
        household,
        householdMembers,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchProfileWithPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
