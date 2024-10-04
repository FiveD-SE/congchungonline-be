const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const sessionValidation = require('../../validations/session.validation');
const sessionController = require('../../controllers/session.controller');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: 'JWT authorization header. Use `Bearer <token>` format.'
 *
 *   responses:
 *     BadRequest:
 *       description: Bad Request
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Invalid request parameters
 *     Unauthorized:
 *       description: Unauthorized access
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Unauthorized
 *     InternalServerError:
 *       description: Internal Server Error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 */

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Sessions management API
 */

router
  .route('/createSession')
  .post(auth('createSession'), validate(sessionValidation.createSession), sessionController.createSession);

router
  .route('/addUser/:sessionId')
  .patch(auth('addUserToSession'), validate(sessionValidation.addUserToSession), sessionController.addUserToSession);

router
  .route('/deleteUser/:sessionId')
  .patch(
    auth('deleteUserOutOfSession'),
    validate(sessionValidation.deleteUserOutOfSession),
    sessionController.deleteUserOutOfSession
  );

router
  .route('/joinSession/:sessionId')
  .post(auth('joinSession'), validate(sessionValidation.joinSession), sessionController.joinSession);

/**
 * @swagger
 * /session/createSession:
 *   post:
 *     summary: Create session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionName:
 *                 type: string
 *                 description: The name of the session
 *                 example: "Notarization Session"
 *               notaryField:
 *                 type: string
 *                 description: The field of the notary
 *                 example: "Notary Field"
 *               notaryService:
 *                 type: string
 *                 description: The Service of the notary
 *                 example: "Notary Service"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: The time of session in ISO format
 *                 example: "2024-10-10T20:00:00Z"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: The date of session
 *                 example: "2024-10-10"
 *               duration:
 *                 type: number
 *                 description: The duration of the session in minutes
 *                 example: 120
 *               email:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of email addresses related to the session
 *             required:
 *               - sessionName
 *               - startTime
 *               - startDate
 *               - duration
 *               - email
 *               - notaryField
 *               - notaryService
 *     responses:
 *       "201":
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionName:
 *                   type: string
 *                   example: "Notarization Session"
 *                 notaryField:
 *                    type: string
 *                    example: "Notary Field"
 *                 notaryService:
 *                    type: string
 *                    example: "Notary Service"
 *                 startTime:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-10-10T20:00:00Z"
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   example: "2024-10-10"
 *                 duration:
 *                   type: number
 *                   example: 120
 *                 email:
 *                   type: array
 *                   items:
 *                      type: string
 *                   example: "abc@gmail.com"
 *                 createdBy:
 *                   type: string
 *
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request parameters"
 *       "401":
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       "500":
 *         description: Internal Server Error - Failed to create session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to create session"
 */
/**
 * @swagger
 * /session/addUser/{sessionId}:
 *   patch:
 *     summary: Add user to session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of email addresses add to the session
 *             required:
 *               - email
 *     responses:
 *       "201":
 *         description: User was added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   example: "66fe4c6b76f99374f4c87165"
 *                 email:
 *                   type: array
 *                   items:
 *                      type: string
 *                   example: "abc@gmail.com"
 *
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request parameters"
 *       "401":
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       "500":
 *         description: Internal Server Error - Failed to add user to session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to add user to session"
 */
/**
 * @swagger
 * /session/deleteUser/{sessionId}:
 *   patch:
 *     summary: Delete user out of session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of email addresses delete out of the session
 *             required:
 *               - email
 *     responses:
 *       "201":
 *         description: User was deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                    type: string
 *                    example: "User was deleted successfully"
 *       "400":
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request parameters"
 *       "401":
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       "500":
 *         description: Internal Server Error - Failed to delete user out of session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to delete user out of session"
 */
/**
 * @swagger
 * /session/joinSession/{sessionId}:
 *   post:
 *     summary: Join a session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the session to join
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               require:
 *                 type: string
 *                 description: The request status for joining the session (e.g., "accept")
 *                 example: "accept"
 *             required:
 *               - require
 *     responses:
 *       "201":
 *         description: Successfully joined the session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Join session successfully"
 *       "400":
 *         description: Bad request due to invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request parameters"
 *       "401":
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       "500":
 *         description: Internal server error - Failed to join the session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to join the session"
 */

module.exports = router;
