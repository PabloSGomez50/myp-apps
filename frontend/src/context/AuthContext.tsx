import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, Household } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('myp_token');
      if (savedToken) {
        try {
          const mockUser: User = {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'pablo@myp.local',
            nombre: 'Pablo',
            color_avatar: '#16a34a',
            is_active: true,
            created_at: new Date().toISOString(),
          };
          const mockPartner: User = {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'pareja@myp.local',
            nombre: 'Pareja',
            color_avatar: '#ec4899',
            is_active: true,
            created_at: new Date().toISOString(),
          };
          const mockHousehold: Household = {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            nombre: 'Casa Pablo & Pareja',
            moneda_principal: 'ARS',
            created_at: new Date().toISOString(),
          };

          setUser(mockUser);
          setHousehold(mockHousehold);
          setHouseholdMembers([mockUser, mockPartner]);
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      const mockToken = 'mock_jwt_token';
      localStorage.setItem('myp_token', mockToken);
      setToken(mockToken);
      
      const mockUser: User = {
        id: '11111111-1111-1111-1111-111111111111',
        email: email,
        nombre: email.toLowerCase().includes('pareja') ? 'Pareja' : 'Pablo',
        color_avatar: '#16a34a',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const mockPartner: User = {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'pareja@myp.local',
        nombre: 'Pareja',
        color_avatar: '#ec4899',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const mockHousehold: Household = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        nombre: 'Casa Pablo & Pareja',
        moneda_principal: 'ARS',
        created_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setHousehold(mockHousehold);
      setHouseholdMembers([mockUser, mockPartner]);
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
  };

  const switchProfileWithPin = async (userId: string, pin: string): Promise<boolean> => {
    if (pin.length === 4) {
      const targetUser = householdMembers.find((m) => m.id === userId);
      if (targetUser) {
        setUser(targetUser);
        return true;
      }
    }
    return false;
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
