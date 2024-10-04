const allRoles = {
  user: ['uploadDocuments', 'viewNotarizationHistory','createSession','addUserToSession','deleteUserOutOfSession','joinSession'],
  admin: [
    'getUsers',
    'manageUsers',
    'uploadDocuments',
    'viewNotarizationHistory',
    'manageRoles',
    'manageNotarizationFields',
    'manageNotarizationServices',
    'getAllNotarizations',
    'getToDayDocumentCount',
    'getToDayUserCount',
    'getUserMonthly',
    'getTodayDocumentsByNotaryField',
    'getMonthDocumentsByNotaryField',
  ],
  notary: ['getDocumentsByRole', 'forwardDocumentStatus', 'getApproveHistory','joinSession'],
  secretary: ['getDocumentsByRole', 'forwardDocumentStatus', 'getApproveHistory','joinSession'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

const getPermissionsByRoleName = (roleName) => {
  return roleRights.get(roleName);
};

module.exports = {
  roles,
  roleRights,
  getPermissionsByRoleName,
};
