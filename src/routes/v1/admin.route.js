const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { adminController } = require('../../controllers');
const router = express.Router();

router.get('/documents/today', auth('getToDayDocumentCount'), adminController.getToDayDocumentCount);

router.get('/users/today', auth('getToDayUserCount'), adminController.getToDayUserCount);

router.get('/users/monthly', auth('getUserMonthly'), adminController.getUserMonthly);

router.get('/documents/fields/daily', auth('getTodayDocumentsByNotaryField'), adminController.getTodayDocumentsByNotaryField);

router.get('/documents/fields/monthly', auth('getMonthDocumentsByNotaryField'), adminController.getMonthDocumentsByNotaryField);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Admins
 *   description: Admin management and retrieval
 */

/**
 * @swagger
 * /admin/metrics/documents/today:
 *   get:
 *     summary: Get today's document count and percent document growth
 *     description: Only admins can retrieve today's document count and growth percentage.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documentCount:
 *                   type: integer
 *                   description: The number of documents created today
 *                   example: 20
 *                 percentGrowth:
 *                   type: number
 *                   description: The percentage growth of documents from previous day
 *                   example: 15.5
 *       "401":
 *         description: Unauthorized access - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - the user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Not found - endpoint does not exist
 */

/**
 * @swagger
 * /admin/metrics/users/today:
 *   get:
 *     summary: Get today's user count and percent user growth
 *     description: Only admins can retrieve today's user count and growth percentage.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userCount:
 *                   type: integer
 *                   description: The number of user created today
 *                   example: 20
 *                 percentGrowth:
 *                   type: number
 *                   description: The percentage growth of user from previous day
 *                   example: 15.5
 *       "401":
 *         description: Unauthorized access - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - the user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Not found - endpoint does not exist
 */

/**
 * @swagger
 * /admin/metrics/users/monthly:
 *   get:
 *     summary: Get user count for this month and last month
 *     description: Retrieve the number of users registered this month and last month. Only admins can access this information.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userThisMonthCount:
 *                   type: integer
 *                   description: The number of users registered this month
 *                   example: 2
 *                 userLastMonthCount:
 *                   type: integer
 *                   description: The number of users registered last month
 *                   example: 12
 *       "401":
 *         description: Unauthorized access - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - the user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Not found - endpoint does not exist
 */

/**
 * @swagger
 * /admin/metrics/documents/fields/daily:
 *   get:
 *     summary: Get today's document count by notary field
 *     description: Retrieve the number of documents created today, grouped by notary fields. Only admins can access this information.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todayDocumentsByNotaryField:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The name of the notary field
 *                         example: "Example1 Notary Field"
 *                       count:
 *                         type: integer
 *                         description: The number of documents created today for this notary field
 *                         example: 1
 *       "401":
 *         description: Unauthorized access - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - the user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Not found - endpoint does not exist
 */

/**
 * @swagger
 * /admin/metrics/documents/fields/monthly:
 *   get:
 *     summary: Get month's document count by notary field
 *     description: Retrieve the number of documents created month, grouped by notary fields. Only admins can access this information.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 monthDocumentsByNotaryField:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The name of the notary field
 *                         example: "Example1 Notary Field"
 *                       count:
 *                         type: integer
 *                         description: The number of documents created today for this notary field
 *                         example: 1
 *       "401":
 *         description: Unauthorized access - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - the user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Forbidden'
 *       "404":
 *         description: Not found - endpoint does not exist
 */