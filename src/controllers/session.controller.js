const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { sessionService, emailService } = require('../services');

const createSession = catchAsync(async (req, res) => {
  const { sessionName, notaryField, notaryService, startTime, startDate, duration, email } = req.body;
  const createdBy = req.user.id;
  await sessionService.validateEmails(email);
  const session = await sessionService.createSession({
    sessionName,
    notaryField,
    notaryService,
    startTime: new Date(startTime),
    startDate: new Date(startDate),
    duration,
    email,
    createdBy,
  });
  await Promise.all(session.email.map((emailItem) => emailService.sendInvitationEmail(emailItem, session._id)));
  res.status(httpStatus.CREATED).send(session);
});

const addUserToSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { email } = req.body;
  const userId = req.user.id;
  const updatedSession = await sessionService.addUserToSession({ sessionId, email, userId });
  await Promise.all(
    updatedSession.email.map((emailItem) => emailService.sendInvitationEmail(emailItem, updatedSession._id))
  );
  res.status(httpStatus.OK).send(updatedSession);
});

const deleteUserOutOfSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { email } = req.body;
  const userId = req.user.id;
  const updatedSession = await sessionService.deleteUserOutOfSession({ sessionId, email, userId });
  res.status(httpStatus.OK).send(updatedSession);
});

const joinSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  const { require } = req.body;
  const userId = req.user.id;
  const joinSession = await sessionService.joinSession({ sessionId, require, userId });
  res.status(httpStatus.OK).send(joinSession);
});

module.exports = {
  createSession,
  addUserToSession,
  deleteUserOutOfSession,
  joinSession,
};
