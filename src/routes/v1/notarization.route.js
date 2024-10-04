const express = require('express');
const multer = require('multer');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const notarizationValidation = require('../../validations/notarization.validation');
const notarizationController = require('../../controllers/notarization.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
 */

/**
 * @swagger
 * tags:
 *   name: Notarizations
 *   description: Notarization document management API
 */

router
  .route('/upload-files')
  .post(
    auth('uploadDocuments'),
    upload.array('files'),
    validate(notarizationValidation.createDocument),
    notarizationController.createDocument
  );

router
  .route('/history')
  .get(
    auth('viewNotarizationHistory'),
    validate(notarizationValidation.getHistoryByUserId),
    notarizationController.getHistoryByUserId
  );

router.route('/getStatusById/:documentId').get(notarizationController.getDocumentStatus);

router.route('/getDocumentByRole').get(auth('getDocumentsByRole'), notarizationController.getDocumentByRole);

router
  .route('/forwardDocumentStatus/:documentId')
  .patch(
    auth('forwardDocumentStatus'),
    validate(notarizationValidation.forwardDocumentStatus),
    notarizationController.forwardDocumentStatus
  );

router.route('/getAllNotarization').get(auth('getAllNotarizations'), notarizationController.getAllNotarizations);

router.route('/getApproveHistory').get(auth('getApproveHistory'), notarizationController.getApproveHistory);
/**
 * @swagger
 * /notarization/upload-files:
 *   post:
 *     summary: Upload notarization documents
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: The files to upload
 *               notaryService:
 *                 type: string
 *                 description: Name of the notary service
 *                 example: Example Notary Service
 *               notaryField:
 *                 type: string
 *                 description: Field of the notary service
 *                 example: Example Notary Field
 *               requesterInfo:
 *                 type: object
 *                 properties:
 *                   citizenId:
 *                     type: string
 *                     example: 123456789012
 *                   phoneNumber:
 *                     type: string
 *                     example: 0941788455
 *                   email:
 *                     type: string
 *                     example: 123@gmail.com
 *                 required:
 *                   - citizenId
 *                   - phoneNumber
 *                   - email
 *             required:
 *               - files
 *               - notaryService
 *               - notaryField
 *               - requesterInfo
 *           example:
 *             files: [file1.pdf, file2.docx]
 *             notaryService: Example Notary Service
 *             notaryField: Example Notary Field
 *             requesterInfo:
 *               citizenId: 123456789012
 *               phoneNumber: 0941788455
 *               email: 123@gmail.com
 *     responses:
 *       "201":
 *         description: Documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created document
 *                   example: 66f1818416c9ba1bfc053c3c
 *                 notaryService:
 *                   type: string
 *                   example: Vay-Mượn Tài Sản
 *                 notaryField:
 *                   type: string
 *                   example: Vay mượn
 *                 requesterInfo:
 *                   type: object
 *                   properties:
 *                     citizenId:
 *                       type: string
 *                       example: 123456789012
 *                     phoneNumber:
 *                       type: string
 *                       example: 0941788455
 *                     email:
 *                       type: string
 *                       example: 123@gmail.com
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 66f1818416c9ba1bfc053c3c
 *                       filename:
 *                         type: string
 *                         example: file1.pdf
 *                       firebaseUrl:
 *                         type: string
 *                         example: https://storage.googleapis.com/file-url.pdf
 *       "400":
 *         description: Bad Request - No files provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No files provided
 *       "401":
 *          description: Unauthorized
 *          content:
 *            application/json:
 *              schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: Please authenticate
 *       "500":
 *         description: Internal Server Error - Failed to upload files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to upload files
 */

/**
 * @swagger
 * /notarization/history:
 *   get:
 *     summary: Retrieve notarization history by UUID
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Notarization history details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the created document
 *                   example: 66f1818416c9ba1bfc053c3c
 *                 notaryService:
 *                   type: string
 *                   example: Vay-Mượn Tài Sản
 *                 notaryField:
 *                   type: string
 *                   example: Vay mượn
 *                 requesterInfo:
 *                   type: object
 *                   properties:
 *                     citizenId:
 *                       type: string
 *                       example: 123456789012
 *                     phoneNumber:
 *                       type: string
 *                       example: 0941788455
 *                     email:
 *                       type: string
 *                       example: 123@gmail.com
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /notarization/getStatusById/{documentId}:
 *   get:
 *     summary: Get the status of a document by ID
 *     tags: [Notarizations]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the document to retrieve status
 *     responses:
 *       "200":
 *         description: Document status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "66f52c4e4df9701becbf1c57"
 *                 documentId:
 *                   type: string
 *                   example: "66f52c4d4df9701becbf1c53"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-09-26T09:41:34.790Z"
 *                 __v:
 *                   type: integer
 *                   example: 0
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *       "500":
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /notarization/getDocumentByRole:
 *   get:
 *     summary: Get all notarization documents by user role
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successfully retrieved documents for the specified role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requesterInfo:
 *                   type: object
 *                   properties:
 *                     citizenId:
 *                       type: string
 *                       example: "123456789012"
 *                     phoneNumber:
 *                       type: string
 *                       example: "941788455"
 *                     email:
 *                       type: string
 *                       example: "123@gmail.com"
 *                 _id:
 *                   type: string
 *                   example: "66f516c6df00763b8878bb89"
 *                 notaryService:
 *                   type: string
 *                   example: "Example Notary Service"
 *                 notaryField:
 *                   type: string
 *                   example: "Example Notary Field"
 *                 userId:
 *                   type: string
 *                   example: "66f46255529f780cf0b20d3e"
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "66f516c6df00763b8878bb8b"
 *                       filename:
 *                         type: string
 *                         example: "1727338182964-search-interface-symbol.png"
 *                       firebaseUrl:
 *                         type: string
 *                         example: "https://storage.googleapis.com/congchungonline-6692e.appspot.com/66f516c6df00763b8878bb89/1727338182108-search-interface-symbol.png"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-09-26T08:09:42.039Z"
 *                 __v:
 *                   type: integer
 *                   example: 1
 *                 status:
 *                   type: string
 *                   example: "processing"
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         code: 403
 *         message: You do not have permission to access these documents
 *       "500":
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /notarization/forwardDocumentStatus/{documentId}:
 *   patch:
 *     summary: Forward the status of a notarization document by document ID
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the document to forward status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: The action to do
 *                 example: accept
 *     responses:
 *       "200":
 *         description: Successfully updated the document status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Document status updated to digitalSignature"
 *                 documentId:
 *                   type: string
 *                   example: "66f462fa57b33d48e47ab55f"
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         code: 403
 *         message: You do not have permission to access these documents
 *       "404":
 *         code: 404
 *         message: Document not found
 *       "500":
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /notarization/getApproveHistory:
 *   get:
 *     summary: Retrieve the approval history of notarization documents
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Successfully retrieved approval history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   documentId:
 *                     type: string
 *                     example: "66f462fa57b33d48e47ab55f"
 *                   status:
 *                     type: string
 *                     example: "approved"
 *                   approvedBy:
 *                     type: string
 *                     example: "userId123"
 *                   approvedAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-09-26T08:09:42.039Z"
 *                   comments:
 *                     type: string
 *                     example: "Document approved successfully."
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         description: Forbidden - User does not have permission to access this resource
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to access this resource."
 *       "404":
 *         description: Not Found - Approval history not found for the specified document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Approval history not found."
 *       "500":
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve approval history"
 */

/**
 * @swagger
 * /notarization/getAllNotarization:
*   get:
 *     summary: Get allnotarizations
 *     description: Only admins can retrieve all notarizations.
 *     tags: [Notarizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. name:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of notarization
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notarizations'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

module.exports = router;
