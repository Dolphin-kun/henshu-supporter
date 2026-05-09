const DM_REQUEST_TTL_MS = 30 * 60 * 1000;

const pendingDmRequests = new Map();

const normalizeUserId = (userId) => String(userId);

const setPendingDmRequest = (userId, data) => {
  const key = normalizeUserId(userId);
  pendingDmRequests.set(key, {
    ...data,
    expiresAt: Date.now() + DM_REQUEST_TTL_MS,
  });
};

const getPendingDmRequest = (userId) => {
  const key = normalizeUserId(userId);
  const entry = pendingDmRequests.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    pendingDmRequests.delete(key);
    return null;
  }

  return entry;
};

const refreshPendingDmRequest = (userId) => {
  const key = normalizeUserId(userId);
  const entry = pendingDmRequests.get(key);
  if (!entry) return;
  entry.expiresAt = Date.now() + DM_REQUEST_TTL_MS;
};

const clearPendingDmRequest = (userId) => {
  pendingDmRequests.delete(normalizeUserId(userId));
};

module.exports = {
  setPendingDmRequest,
  getPendingDmRequest,
  refreshPendingDmRequest,
  clearPendingDmRequest,
};
