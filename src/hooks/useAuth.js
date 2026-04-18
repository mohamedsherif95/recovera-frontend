import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth';
import { accessApi } from '@/api/endpoints/access';
import { useAuthStore } from '@/store/authStore';
import { usePermissionsStore } from '@/store/permissionsStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth, logout: logoutStore, user, isAuthenticated, refreshToken } = useAuthStore();
  const {
    setRolesPermissionsMap,
    derivePermissionsFromRoles,
    clearPermissions,
    rolesPermissionsMap,
  } = usePermissionsStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log('Login response:', data);
      if (data?.requiresPasswordChange && data?.setupToken) {
        sessionStorage.setItem(
          'recovera-first-login',
          JSON.stringify({
            setupToken: data.setupToken,
            user: data.user || null,
          }),
        );
        toast.success('Please set your permanent password to continue');
        navigate('/first-login', {
          replace: true,
          state: { setupToken: data.setupToken, user: data.user || null },
        });
        return;
      }

      const { user, accessToken, refreshToken } = data;

      // Validate required fields
      if (!user || !accessToken) {
        console.error('Invalid login response - missing user or token');
        toast.error('Login failed - invalid response from server');
        return;
      }

      // Store auth data
      setAuth(user, accessToken, refreshToken);
      console.log('Auth state updated');

      // Trigger permissions map refetch
      queryClient.invalidateQueries({ queryKey: ['access', 'roles-permissions'] });

      toast.success('Login successful');

      // Delay navigation slightly to ensure state is persisted
      setTimeout(() => {
        console.log('Navigating to daily ops...');
        navigate('/', { replace: true });
      }, 100);
    },
    onError: (error) => {
      console.error('Login error:', error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.details ||
        'Login failed';
      toast.error(message);
    },
  });

  const completeFirstLoginMutation = useMutation({
    mutationFn: authApi.completeFirstLogin,
    onSuccess: (data) => {
      const { user, accessToken, refreshToken } = data;

      if (!user || !accessToken) {
        toast.error('Password setup completed, but login response was invalid');
        navigate('/login', { replace: true });
        return;
      }

      sessionStorage.removeItem('recovera-first-login');
      setAuth(user, accessToken, refreshToken);
      queryClient.invalidateQueries({ queryKey: ['access', 'roles-permissions'] });
      toast.success('Password set successfully');
      navigate('/', { replace: true });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.details ||
        'Password setup failed';
      toast.error(message);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(refreshToken),
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
      clearPermissions();
      toast.success('Logged out successfully');
      navigate('/login');
    },
    onError: () => {
      // Force logout even if API call fails
      logoutStore();
      queryClient.clear();
      clearPermissions();
      navigate('/login');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success('Password reset link sent to your email');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to send reset link';
      toast.error(message);
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Password reset successful! Please login.');
      navigate('/login');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
    },
  });

  // Get profile query (only when authenticated)
  const profileQuery = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: authApi.getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const userRoles = useMemo(() => {
    return profileQuery.data?.roles || user?.roles || [];
  }, [profileQuery.data?.roles, user?.roles]);

  const { data: rolesPermissionsData, isError: rolesPermissionsError } = useQuery({
    queryKey: ['access', 'roles-permissions'],
    queryFn: accessApi.getRolesPermissions,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!userRoles.length) return;
    if (!rolesPermissionsData?.length) return;

    setRolesPermissionsMap(rolesPermissionsData);
    derivePermissionsFromRoles(userRoles);
  }, [
    isAuthenticated,
    userRoles,
    rolesPermissionsData,
    setRolesPermissionsMap,
    derivePermissionsFromRoles,
  ]);

  useEffect(() => {
    if (!rolesPermissionsError) return;
    toast.error('Failed to load permissions');
  }, [rolesPermissionsError]);

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    completeFirstLogin: completeFirstLoginMutation.mutate,
    logout: logoutMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isCompletingFirstLogin: completeFirstLoginMutation.isPending,
    profile: profileQuery.data,
  };
}
