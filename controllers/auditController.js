const AuditService = require('../services/auditService');
const ApiResponse = require('../utils/apiResponse');

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await AuditService.getLogs(req.query);
    return ApiResponse.success(res, 'Audit logs retrieved', result.logs, 200, result.meta);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
