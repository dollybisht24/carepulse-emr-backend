const { AuditLog } = require('../models');

class AuditService {
  /**
   * Records an audit event asynchronously
   */
  static async log({
    userId,
    userEmail = '',
    role = 'unknown',
    action,
    entityType,
    entityId = null,
    details = {},
    ipAddress = null,
  }) {
    try {
      // Ensure sensitive data like passwords are never logged
      const sanitizedDetails = { ...details };
      if (sanitizedDetails.password) delete sanitizedDetails.password;
      if (sanitizedDetails.refreshToken) delete sanitizedDetails.refreshToken;

      await AuditLog.create({
        userId,
        userEmail,
        role,
        action,
        entityType,
        entityId: entityId ? entityId.toString() : null,
        details: sanitizedDetails,
        ipAddress,
      });
    } catch (err) {
      // Audit logging should not crash the main operation, but warn
      console.error('[AuditService Error]: Failed to write audit record', err.message);
    }
  }

  /**
   * Retrieves audit logs with pagination and filters
   */
  static async getLogs({ page = 1, limit = 20, action, entityType, userId }) {
    const query = {};
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = AuditService;
