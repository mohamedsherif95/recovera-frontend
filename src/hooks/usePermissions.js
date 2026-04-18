import { usePermissionsStore } from '@/store/permissionsStore';
import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const { permissions, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissionsStore();
  const { user, hasRole, hasAnyRole } = useAuthStore();

  const can = (permission) => permissions.includes(permission);

  const canAny = (permissionList = []) =>
    permissionList.some((perm) => permissions.includes(perm));

  const isOwnSession = (session) => {
    if (!user || !session) return false;
    const doctorId =
      session.doctorId != null
        ? session.doctorId
        : session.doctor?.id != null
          ? session.doctor.id
          : null;
    if (doctorId == null) return false;
    return doctorId === user.id;
  };

  const isOwnPatient = (patient) => {
    if (!user || !patient) return false;
    const doctorId =
      patient.assignedDoctorId != null
        ? patient.assignedDoctorId
        : patient.doctorId != null
          ? patient.doctorId
          : patient.doctor?.id != null
            ? patient.doctor.id
            : null;
    if (doctorId == null) return false;
    return doctorId === user.id;
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    can,
    canAny,
    isOwnSession,
    isOwnPatient,
    currentUser: user,
  };
}
