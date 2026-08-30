import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import {
  login,
  register,
  getCurrentUser,
} from '../api/client';

import type {
  User,
  RegisterData,
  LoginData,
} from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;

  loginUser: (data: LoginData) => Promise<void>;

  registerUser: (
    data: RegisterData
  ) => Promise<{
    user: User;
    redirectTo: string;
  }>;

  logout: () => void;

  // Merges partial profile data (e.g. one onboarding step's worth)
  // into user.profile — both in context state and localStorage —
  // so anything reading `user.profile` (like the Dashboard's
  // completion %) updates immediately, without waiting for the
  // whole onboarding flow to finish.
  //
  // NOTE: this is optimistic/client-side only. It does NOT call the
  // backend. It survives a page refresh in *this* browser via the
  // checkAuth() fallback below, but it will NOT show up on another
  // device/browser, and a cleared localStorage will lose it, until
  // there's a real partial-save API endpoint to call here too.
  updateProfile: (partialProfile: Record<string, any>) => void;

  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // CHECK EXISTING AUTHENTICATION
  // ============================================

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('access_token');

      if (storedToken) {
        try {
          const userData = await getCurrentUser();

          // The server is the source of truth, but there's no
          // partial-save endpoint yet for onboarding-in-progress —
          // completeCreatorOnboarding only fires at the very end.
          // So if the server's profile is empty/missing and we have
          // a locally cached one from an earlier updateProfile()
          // call in this browser, keep it instead of dropping it on
          // refresh. Once a real partial-save API exists, this
          // fallback can go away.
          const cachedRaw = localStorage.getItem('user');
          const cached: User | null = cachedRaw ? JSON.parse(cachedRaw) : null;
          const cachedProfile = cached?.profile;
          const serverProfile = userData.profile;

          const mergedUser: User =
            cachedProfile && (!serverProfile || Object.keys(serverProfile).length === 0)
              ? { ...userData, profile: cachedProfile }
              : userData;

          setUser(mergedUser);
          setToken(storedToken);

          localStorage.setItem('user', JSON.stringify(mergedUser));
        } catch (error) {
          console.error('Authentication check failed:', error);

          localStorage.removeItem('access_token');
          localStorage.removeItem('user');

          setUser(null);
          setToken(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // ============================================
  // LOGIN
  // ============================================

  const loginUser = async (data: LoginData): Promise<void> => {
    try {
      const response = await login(data);

      localStorage.setItem(
        'access_token',
        response.access_token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.user)
      );

      setUser(response.user);
      setToken(response.access_token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // ============================================
  // REGISTER
  // ============================================

  const registerUser = async (
    data: RegisterData
  ): Promise<{
    user: User;
    redirectTo: string;
  }> => {
    try {
      const response = await register(data);

      localStorage.setItem(
        'access_token',
        response.access_token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.user)
      );

      setUser(response.user);
      setToken(response.access_token);

      // Determine where the user should go
      // based on their role.

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
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  // ============================================
  // UPDATE PROFILE (optimistic, client-side)
  // ============================================

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

  // ============================================
  // LOGOUT
  // ============================================

  const logout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    setUser(null);
    setToken(null);
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    user,
    token,
    loading,
    loginUser,
    registerUser,
    logout,
    updateProfile,
    isAuthenticated: !!user && !!token,
  };

  // ============================================
  // PROVIDER
  // ============================================

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// useAuth HOOK
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};