import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  login,
  register,
  getCurrentUser,
  deleteAccount as deleteAccountRequest,
} from '../api/client';

import type { User, RegisterData, LoginData } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginUser: (data: LoginData) => Promise<void>;
  registerUser: (data: RegisterData) => Promise<{
    user: User;
    redirectTo: string;
  }>;
  logout: () => void;
  deleteAccount: (password: string) => Promise<void>;
  updateProfile: (partialProfile: Record<string, any>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('access_token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getCurrentUser();

        let cachedUser: User | null = null;
        try {
          const cachedRaw = localStorage.getItem('user');
          cachedUser = cachedRaw ? JSON.parse(cachedRaw) : null;
        } catch {
          localStorage.removeItem('user');
        }

        const cachedProfile = cachedUser?.profile;
        const serverProfile = userData.profile;

        const mergedUser: User =
          cachedProfile &&
          (!serverProfile || Object.keys(serverProfile).length === 0)
            ? { ...userData, profile: cachedProfile }
            : userData;

        setUser(mergedUser);
        setToken(storedToken);
        localStorage.setItem('user', JSON.stringify(mergedUser));
      } catch (error: any) {
        // 401 means the saved session is no longer valid.
        if (error?.response?.status !== 401) {
          console.error('Authentication check failed:', error);
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginUser = async (data: LoginData): Promise<void> => {
    const response = await login(data);

    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));

    setUser(response.user);
    setToken(response.access_token);
  };

  const registerUser = async (
    data: RegisterData
  ): Promise<{ user: User; redirectTo: string }> => {
    const response = await register(data);

    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));

    setUser(response.user);
    setToken(response.access_token);

    let redirectTo = '/dashboard';

    if (response.user.role === 'creator') {
      redirectTo = '/onboarding/creator';
    } else if (response.user.role === 'business') {
      redirectTo = '/onboarding/business';
    }

    return {
      user: response.user,
      redirectTo,
    };
  };

  const updateProfile = (partialProfile: Record<string, any>): void => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;

      const updatedUser: User = {
        ...prevUser,
        profile: {
          ...prevUser.profile,
          ...partialProfile,
        },
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const logout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const deleteAccount = async (password: string): Promise<void> => {
    await deleteAccountRequest(password);
    logout();
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    loginUser,
    registerUser,
    logout,
    deleteAccount,
    updateProfile,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
