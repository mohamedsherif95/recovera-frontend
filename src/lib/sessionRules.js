import { SESSION_STATUS } from '@/lib/constants';
import { getCurrentLocalTime } from '@/lib/utils';

export function getAllowedStatusTransitions(currentStatus, options = {}) {
  if (!currentStatus) return [];

  const { isAdmin = false } = options;

  if (isAdmin) {
    return Object.values(SESSION_STATUS).filter((status) => status !== currentStatus);
  }

  switch (currentStatus) {
    case SESSION_STATUS.SCHEDULED:
      // From scheduled: can mark as arrived or cancel
      return [SESSION_STATUS.ARRIVED, SESSION_STATUS.CANCELLED];
    case SESSION_STATUS.ARRIVED:
      // From arrived: can start session or cancel
      return [SESSION_STATUS.IN_PROGRESS, SESSION_STATUS.CANCELLED];
    case SESSION_STATUS.IN_PROGRESS:
      // From in_progress: can complete or cancel
      return [SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED];
    case SESSION_STATUS.COMPLETED:
    case SESSION_STATUS.CANCELLED:
    default:
      return [];
  }
}

export function buildStatusUpdatePayload(session, nextStatus) {
  const payload = { status: nextStatus };
  const now = getCurrentLocalTime();
  const previousStatus = session?.status;

  // Mark arrival: scheduled -> arrived
  if (
    nextStatus === SESSION_STATUS.ARRIVED &&
    previousStatus === SESSION_STATUS.SCHEDULED
  ) {
    payload.arrivalTime = now;
  }

  // Start session: arrived -> in_progress (or scheduled -> in_progress for admin)
  if (
    nextStatus === SESSION_STATUS.IN_PROGRESS &&
    (previousStatus === SESSION_STATUS.ARRIVED || previousStatus === SESSION_STATUS.SCHEDULED)
  ) {
    payload.startTime = now;
  }

  if (nextStatus === SESSION_STATUS.COMPLETED) {
    if (!session?.startTime) {
      payload.startTime = now;
    }
    payload.endTime = now;
  }

  if (
    nextStatus === SESSION_STATUS.CANCELLED &&
    previousStatus === SESSION_STATUS.IN_PROGRESS
  ) {
    if (!session?.startTime) {
      payload.startTime = now;
    }
    payload.endTime = now;
  }

  return payload;
}
