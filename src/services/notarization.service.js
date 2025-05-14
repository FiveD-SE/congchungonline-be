const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const emailService = require('./email.service');
const { Document, StatusTracking, ApproveHistory, NotarizationService, NotarizationField } = require('../models');
const ApiError = require('../utils/ApiError');
const { bucket, downloadFile } = require('../config/firebase');
const RequestSignature = require('../models/requestSignature.model');
const { payOS } = require('../config/payos');
const Payment = require('../models/payment.model');
const { uploadToIPFS, mintDocumentNFT, getTransactionData } = require('../config/blockchain-solana'); // changed from blockchain.js to blockchain-solana.js
const userWalletService = require('./userWallet.service');

const generateOrderCode = () => {
  const MAX_SAFE_INTEGER = 9007199254740991;
  const MAX_ORDER_CODE = Math.floor(MAX_SAFE_INTEGER / 10);

  return Math.floor(Math.random() * MAX_ORDER_CODE) + 1;
};

const uploadFileToFirebase = async (file, rootFolder, folderName) => {
  const fileName = `${file.originalname}`;
  const fileRef = bucket.file(`${rootFolder}/${folderName}/${fileName}`);

  try {
    await fileRef.save(file.buffer, { contentType: file.mimetype });
    return `https://storage.googleapis.com/${bucket.name}/${rootFolder}/${folderName}/${fileName}`;
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload file');
  }
};

const createDocument = async (documentBody, files, fileIds, customFileNames, userId) => {
  try {
    if ((!files || files.length === 0) && (!fileIds || fileIds.length === 0)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No files provided');
    }

    const { notarizationField, notarizationService, requesterInfo, amount } = documentBody;

    const notarizationFieldDoc = await NotarizationField.findById(notarizationField.id);
    if (!notarizationFieldDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notarization field ID provided');
    }

    const notarizationServiceDoc = await NotarizationService.findById(notarizationService.id);
    if (!notarizationServiceDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notarization service ID provided');
    }

    if (String(notarizationServiceDoc.fieldId) !== String(notarizationFieldDoc._id)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Notarization service does not match the provided field');
    }

    const newDocument = new Document({
      files: [],
      notarizationService: {
        id: notarizationService.id,
        name: notarizationService.name,
        fieldId: notarizationService.fieldId,
        description: notarizationService.description,
        price: notarizationService.price,
        required_documents: notarizationService.required_documents,
        code: notarizationService.code,
      },
      notarizationField: {
        id: notarizationField.id,
        name: notarizationField.name,
        description: notarizationField.description,
        name_en: notarizationField.name_en,
        code: notarizationField.code,
      },
      requesterInfo: {
        fullName: requesterInfo.fullName,
        citizenId: requesterInfo.citizenId,
        phoneNumber: requesterInfo.phoneNumber,
        email: requesterInfo.email,
      },
      userId,
      createdAt: Date.now(),
      amount,
    });

    // Handle files from user wallet
    if (fileIds && fileIds.length > 0) {
      const userWallet = await userWalletService.getWallet(userId);
      const walletItems = userWallet.nftItems.filter((item) => fileIds.includes(item._id.toString()));

      if (walletItems.length !== fileIds.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Some files are not found in the user wallet');
      }

      const walletFiles = walletItems.map((item, index) => ({
        _id: item._id,
        filename: customFileNames && customFileNames[index] ? customFileNames[index] : item.filename,
        firebaseUrl: item.tokenURI,
      }));

      await userWalletService.decreaseNFTAmount(userId, fileIds);

      newDocument.files.push(...walletFiles);
    }

    // Handle file uploads to Firebase
    if (files && files.length > 0) {
      const fileUrls = await Promise.all(files.map((file) => uploadFileToFirebase(file, 'documents', newDocument._id)));
      const uploadedFiles = files.map((file, index) => ({
        filename: `${file.originalname}`,
        firebaseUrl: fileUrls[index],
      }));

      newDocument.files.push(...uploadedFiles);
    }

    await newDocument.save();

    await emailService.sendDocumentUploadEmail(requesterInfo.email, requesterInfo.fullName, newDocument._id);

    return newDocument;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error creating document:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to create document: ${error.message}`);
  }
};
const createStatusTracking = async (documentId, status) => {
  try {
    const statusTracking = new StatusTracking({
      documentId,
      status,
      updatedAt: new Date(),
    });

    await statusTracking.save();
    return statusTracking;
  } catch (error) {
    console.error('Error creating status tracking:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create status tracking');
  }
};

const getHistoryByUserId = async (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
    }

    const history = await Document.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: 'statustrackings',
          localField: '_id',
          foreignField: 'documentId',
          as: 'status',
          pipeline: [{ $sort: { updatedAt: -1 } }, { $limit: 1 }],
        },
      },
      {
        $addFields: {
          status: { $arrayElemAt: ['$status', 0] },
        },
      },
    ]);

    return history;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error fetching history by user ID:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch history by user ID');
  }
};

const getHistoryWithStatus = async (userId) => {
  const history = await Document.aggregate([
    {
      $match: { userId: new ObjectId(userId) },
    },
    {
      $lookup: {
        from: 'statustrackings',
        localField: '_id',
        foreignField: 'documentId',
        as: 'status',
        pipeline: [{ $sort: { updatedAt: -1 } }, { $limit: 1 }],
      },
    },
    {
      $lookup: {
        from: 'requestSignature',
        localField: '_id',
        foreignField: 'documentId',
        as: 'signature',
      },
    },
  ]);

  return history.map((doc) => ({
    ...doc,
    status: doc.status && doc.status.length > 0 ? doc.status[0] : null,
    signature: doc.signature && doc.signature.length > 0 ? doc.signature[0] : null,
  }));
};

const getDocumentStatus = async (documentId) => {
  try {
    const statusTracking = await StatusTracking.findOne({ documentId });
    return statusTracking;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getTotalDocuments = async (status) => {
  const countQueries = {
    processing: () => StatusTracking.countDocuments({ status: 'processing' }),
    readyToSign: () =>
      RequestSignature.countDocuments({
        'approvalStatus.notary.approved': false,
        'approvalStatus.user.approved': true,
      }),
    pendingSignature: () =>
      RequestSignature.countDocuments({
        'approvalStatus.user.approved': false,
      }),
  };

  return countQueries[status]();
};

const getDocumentByRole = async ({ status, limit = 10, page = 1 }) => {
  try {
    // Ensure limit and page are converted to numbers
    limit = Number(limit);
    page = Number(page);

    // Validate limit and page
    if (isNaN(limit) || limit <= 0) {
      limit = 10; // Default to 10 if invalid
    }

    if (isNaN(page) || page <= 0) {
      page = 1; // Default to 1 if invalid
    }

    const skipDocuments = (page - 1) * limit;

    const statusQueries = {
      processing: async () => {
        const documents = await StatusTracking.find({ status: 'processing' })
          .skip(skipDocuments)
          .limit(limit)
          .populate('documentId'); // Added populate to get document details

        return documents.map((doc) => ({
          ...doc.toObject(),
          status: 'processing',
        }));
      },
      readyToSign: async () => {
        const documents = await RequestSignature.find({
          'approvalStatus.notary.approved': false,
          'approvalStatus.user.approved': true,
        })
          .populate('documentId')
          .skip(skipDocuments)
          .limit(limit)
          .sort({ createdAt: -1 });

        return documents.map((doc) => ({
          ...doc.toObject(),
          status: 'readyToSign',
        }));
      },
      pendingSignature: async () => {
        const documents = await RequestSignature.find({
          'approvalStatus.user.approved': false,
        })
          .populate('documentId')
          .skip(skipDocuments)
          .limit(limit)
          .sort({ createdAt: -1 });

        return documents.map((doc) => ({
          ...doc.toObject(),
          status: 'pendingSignature',
        }));
      },
      // Handle the case where no status is provided
      default: async () => {
        // Implement logic to fetch all documents (or return an error)
        const documents = await Document.find().skip(skipDocuments).limit(limit);
        return documents.map((doc) => ({
          ...doc.toObject(),
          status: 'default',
        }));
      },
    };

    // Execute the query based on status or default
    const documents = await (status && statusQueries[status] ? statusQueries[status]() : statusQueries.default());

    // Count total documents for pagination.  This needs to be adjusted based on how you handle the default case.
    const totalDocuments = await getTotalDocuments(status || 'default'); // Pass 'default' if status is undefined

    return {
      documents,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalDocuments / limit),
        totalDocuments,
      },
    };
  } catch (error) {
    console.error('Error retrieving documents:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve documents');
  }
};

const forwardDocumentStatus = async (documentId, action, role, userId, feedback, files) => {
  try {
    const validStatuses = ['pending', 'processing', 'digitalSignature', 'completed'];
    const roleStatusMap = {
      notary: ['pending', 'processing', 'digitalSignature'],
    };

    // Fetch current status and document
    const [currentStatus, document] = await Promise.all([
      StatusTracking.findOne({ documentId }, 'status'),
      Document.findById(documentId),
    ]);

    if (!currentStatus) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Document status not found');
    }

    // Validate role permissions
    if (!roleStatusMap[role].includes(currentStatus.status)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access these documents');
    }

    // Handle files upload if provided
    let outputFiles = [];
    if (files && files.length > 0) {
      const fileUrls = await Promise.all(files.map((file) => uploadFileToFirebase(file, 'outputs', documentId)));

      outputFiles = files.map((file, index) => ({
        filename: `${Date.now()}-${file.originalname}`,
        firebaseUrl: fileUrls[index],
        transactionHash: null, // Reserved for future blockchain integration
        uploadedAt: new Date(),
      }));

      await Document.findByIdAndUpdate(
        documentId,
        {
          $push: {
            output: {
              $each: outputFiles,
            },
          },
        },
        { new: true }
      );
    }

    // Determine new status
    let newStatus;
    if (action === 'accept') {
      if (currentStatus.status === 'rejected') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Document already been rejected');
      }
      const currentStatusIndex = validStatuses.indexOf(currentStatus.status);

      // Disallow forwarding from 'digitalSignature' to 'completed'
      if (currentStatus.status === 'digitalSignature') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot forward from digitalSignature to completed');
      }

      newStatus = validStatuses[currentStatusIndex + 1];

      if (!newStatus) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Document has already reached final status');
      }
    } else if (action === 'reject') {
      if (!feedback) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Feedback is required for rejection');
      }
      newStatus = 'rejected';
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid action provided');
    }
    if (newStatus === 'digitalSignature') {
      const newRequestSignature = new RequestSignature({
        documentId,
        signatureImage: null,
        approvalStatus: {
          notary: {
            approved: false,
            approvedAt: null,
          },
          user: {
            approved: false,
            approvedAt: null,
          },
        },
      });
      await newRequestSignature.save();
    }

    // Create approve history
    const approveHistory = new ApproveHistory({
      userId,
      documentId,
      beforeStatus: currentStatus.status,
      afterStatus: newStatus,
    });
    await approveHistory.save();

    // Update status
    const updateData = {
      status: newStatus,
      updatedAt: new Date(),
      ...(feedback && { feedback }),
    };

    // Update status and send email
    const [email] = await Promise.all([
      Document.findOne({ _id: documentId }, 'requesterInfo.email'),
      StatusTracking.updateOne({ documentId }, updateData),
    ]);

    if (!email.requesterInfo.email) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Email not found');
    }

    await emailService.sendDocumentStatusUpdateEmail(
      email.requesterInfo.email,
      documentId,
      currentStatus.status,
      newStatus,
      feedback
    );

    return {
      message: `Document status updated to ${newStatus}`,
      documentId,
      outputFiles: outputFiles.length > 0 ? outputFiles : undefined,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error forwarding document status:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'An unexpected error occurred');
  }
};

const getApproveHistory = async (userId) => {
  try {
    const history = await ApproveHistory.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'document',
        },
      },
      {
        $unwind: '$document',
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          createdDate: 1,
          beforeStatus: 1,
          afterStatus: 1,
          document: 1,
        },
      },
      {
        $sort: { createdDate: -1 },
      },
    ]);

    if (history.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'No approval history found for this user.');
    }

    return history.map((record) => ({
      _id: record._id,
      createdDate: record.createdDate,
      beforeStatus: record.beforeStatus,
      status: record.afterStatus,
      documentId: {
        id: record.document._id,
        ...record.document,
      },
    }));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error fetching approve history:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch approve history');
  }
};

const getAllNotarizations = async (filter, options) => {
  const page = options.page && options.page > 0 ? parseInt(options.page, 10) : 1;
  const limit = options.limit && options.limit > 0 ? parseInt(options.limit, 10) : 10;
  const skip = (page - 1) * limit;

  const sortBy = options.sortBy || 'createdAt';

  const documents = await Document.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'statustrackings',
        let: { documentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$documentId', '$$documentId'] } } },
          { $sort: { updatedAt: -1 } },
          { $limit: 1 },
        ],
        as: 'status',
      },
    },
    {
      $addFields: {
        status: { $arrayElemAt: ['$status', 0] },
      },
    },
    {
      $sort: { [sortBy]: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  const totalDocuments = await Document.countDocuments(filter);

  return {
    results: documents,
    page,
    limit,
    totalPages: Math.ceil(totalDocuments / limit),
    totalResults: totalDocuments,
  };
};

const approveSignatureByUser = async (documentId, signatureImage) => {
  try {
    if (!ObjectId.isValid(documentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid document ID');
    }

    const statusTracking = await StatusTracking.findOne({ documentId });
    // Check if the document is in the correct status
    if (statusTracking.status !== 'digitalSignature') {
      throw new ApiError(httpStatus.CONFLICT, 'Document is not ready for digital signature');
    }

    const requestSignature = await RequestSignature.findOne({ documentId });
    if (!requestSignature) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found. User has not approved the document yet');
    }

    if (requestSignature.approvalStatus.user.approved) {
      throw new ApiError(httpStatus.CONFLICT, 'Cannot approve. User has already approved the document');
    }

    if (signatureImage) {
      const signatureImageUrl = await uploadFileToFirebase(signatureImage, 'signatures', documentId);
      requestSignature.signatureImage = signatureImageUrl;
    }

    requestSignature.approvalStatus.user = {
      approved: true,
      approvedAt: new Date(),
    };

    await requestSignature.save();

    return {
      message: 'User approved and signed the document successfully',
      documentId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error approve signature by user:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to approve signature by user');
  }
};

const approveSignatureByNotary = async (documentId, userId) => {
  try {
    if (!ObjectId.isValid(documentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid document ID');
    }
    if (!ObjectId.isValid(userId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
    }

    // Check document status
    const statusTracking = await StatusTracking.findOne({ documentId });
    if (!statusTracking) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Status tracking not found');
    }
    if (statusTracking.status !== 'digitalSignature') {
      throw new ApiError(httpStatus.CONFLICT, 'Document is not ready for digital signature');
    }

    // Verify signature request
    const requestSignature = await RequestSignature.findOne({ documentId });
    if (!requestSignature) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Signature request not found');
    }
    if (!requestSignature.approvalStatus.user.approved) {
      throw new ApiError(httpStatus.CONFLICT, 'User has not approved the document yet');
    }

    // Retrieve document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
    }
    if (document.payment) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Document has already been paid');
    }

    // Mint NFTs for output files
    if (document.output && Array.isArray(document.output)) {
      console.log(`document.output exists and is an array with length: ${document.output.length}`);
      if (document.output.length > 0) {
        for (const outputFile of document.output) {
          if (!outputFile.filename) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Output file filename is missing');
          }
          // Download file from storage
          const fileBuffer = await downloadFile(outputFile.firebaseUrl);
          if (!fileBuffer) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to download file');
          }
          // Upload to IPFS
          const ipfsUrl = await uploadToIPFS(fileBuffer, outputFile.filename);
          if (!ipfsUrl) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload to IPFS');
          }

          // Mint NFT
          const nftData = await mintDocumentNFT(ipfsUrl);
          if (!nftData || !nftData.transactionHash) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to mint NFT');
          }
          const transactionData = await getTransactionData(nftData.transactionHash);
          if (!transactionData || !transactionData.transactionHash) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve transaction data');
          }

          // Update output file with transaction details
          outputFile.transactionHash = transactionData.transactionHash;

          console.log('Adding NFT to wallet with data:', {
            transactionHash: transactionData.transactionHash,
            filename: outputFile.filename,
            amount: document.amount,
            tokenId: transactionData.tokenId,
            tokenURI: transactionData.tokenURI,
            contractAddress: transactionData.contractAddress,
          });

          await userWalletService.addNFTToWallet(document.userId, {
            transactionHash: transactionData.transactionHash,
            filename: outputFile.filename,
            amount: document.amount,
            tokenId: transactionData.tokenId,
            tokenURI: transactionData.tokenURI,
            contractAddress: transactionData.contractAddress,
          });
        }

        // Save updated document
        await document.save();
      }
    } else {
      console.warn('document.output is undefined or not an array');
    }

    // Create payment
    const payment = new Payment({
      orderCode: generateOrderCode(),
      amount: document.notarizationService.price * document.amount,
      description: `${document._id}`,
      returnUrl: `${process.env.SERVER_URL}/success.html`,
      cancelUrl: `${process.env.SERVER_URL}/cancel.html`,
      userId: document.userId,
      documentId,
      serviceId: document.notarizationService.id,
      fieldId: document.notarizationField.id,
    });

    await payment.save();

    // Generate payment link
    const paymentLinkResponse = await payOS.createPaymentLink({
      orderCode: payment.orderCode,
      amount: payment.amount,
      description: payment.description,
      returnUrl: payment.returnUrl,
      cancelUrl: payment.cancelUrl,
    });

    payment.checkoutUrl = paymentLinkResponse.checkoutUrl;
    await payment.save();

    // Update status tracking
    statusTracking.status = 'completed';
    statusTracking.updatedAt = new Date();
    await statusTracking.save();

    // Record approval history
    const approveHistory = new ApproveHistory({
      userId,
      documentId,
      beforeStatus: 'digitalSignature',
      afterStatus: 'completed',
    });

    // Update request approval status
    requestSignature.approvalStatus.notary = {
      approved: true,
      approvedAt: new Date(),
    };

    const userEmail = document.requesterInfo.email;

    // Send payment email
    await emailService.sendPaymentEmail(userEmail, documentId, paymentLinkResponse);

    // Send document status update email
    await emailService.sendDocumentStatusUpdateEmail(userEmail, documentId, 'digitalSignature', 'completed');

    // Save approve history
    await approveHistory.save();

    // Save request signature
    await requestSignature.save();

    return {
      message: 'Notary approved and minted NFTs successfully',
      documentId,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error approving signature by notary:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to approve signature by notary');
  }
};

const autoVerifyDocument = async () => {
  try {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

    const pendingDocuments = await StatusTracking.aggregate([
      {
        $match: {
          status: 'pending',
          updatedAt: { $lt: oneMinuteAgo },
        },
      },
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'documentInfo',
        },
      },
      { $unwind: '$documentInfo' },
    ]);

    const updatePromises = pendingDocuments.map(async (tracking) => {
      const document = tracking.documentInfo;

      // Check if any file URL contains IPFS gateway
      const hasIPFSFile = document.files.some((file) => file.firebaseUrl?.includes('https://gateway.pinata.cloud/ipfs/'));

      // If has IPFS file, automatically move to processing
      if (hasIPFSFile) {
        await StatusTracking.updateOne(
          { _id: tracking._id },
          {
            $set: {
              status: 'processing',
              updatedAt: new Date(),
            },
          }
        );

        emailService.sendDocumentStatusUpdateEmail(document.requesterInfo.email, document._id, 'pending', 'processing');

        await new ApproveHistory({
          userId: null,
          documentId: document._id,
          beforeStatus: 'pending',
          afterStatus: 'processing',
          createdDate: new Date(),
        }).save();

        return {
          documentId: document._id,
          status: 'processing',
        };
      }

      // Normal verification flow for non-IPFS files
      if (!document?.notarizationService?.required_documents) {
        console.log(`Document ${tracking._id} lacks notarization requirements`);
        return null;
      }

      const requiredDocs = document.notarizationService.required_documents;
      const existingFileNames = document.files.map((file) => file.filename);

      const missingDocs = requiredDocs.filter((reqDoc) => !existingFileNames.some((filename) => filename.includes(reqDoc)));

      const newStatus = missingDocs.length === 0 ? 'processing' : 'rejected';

      await StatusTracking.updateOne(
        { _id: tracking._id },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
            feedback: missingDocs.length > 0 ? `Missing documents: ${missingDocs.join(', ')}` : undefined,
          },
        }
      );

      emailService.sendDocumentStatusUpdateEmail(
        document.requesterInfo.email,
        document._id,
        'pending',
        newStatus,
        missingDocs.length > 0 ? `Missing documents: ${missingDocs.join(', ')}` : undefined
      );

      await new ApproveHistory({
        userId: null,
        documentId: document._id,
        beforeStatus: 'pending',
        afterStatus: newStatus,
        createdDate: new Date(),
      }).save();

      return {
        documentId: document._id,
        status: newStatus,
        missingDocs: missingDocs.length > 0 ? missingDocs : null,
      };
    });

    const results = (await Promise.all(updatePromises)).filter(Boolean);

    console.log(`Auto-verification completed: ${results.length} documents processed`);
    return results;
  } catch (error) {
    console.error('Auto-verification error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Document auto-verification failed');
  }
};

const getDocumentById = async (documentId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid document ID');
    }

    const document = await Document.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(documentId) },
      },
      {
        $lookup: {
          from: 'statustrackings',
          let: { documentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$documentId', '$$documentId'] },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: 'status',
        },
      },
      {
        $lookup: {
          from: 'requestsignature',
          localField: '_id',
          foreignField: 'documentId',
          as: 'signature',
        },
      },
      {
        $addFields: {
          status: { $arrayElemAt: ['$status', 0] },
          signature: { $arrayElemAt: ['$signature', 0] },
        },
      },
    ]);

    if (!document || document.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
    }

    return document[0];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error fetching document:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch document');
  }
};

module.exports = {
  uploadFileToFirebase,
  createDocument,
  createStatusTracking,
  getHistoryByUserId,
  getDocumentStatus,
  getDocumentByRole,
  forwardDocumentStatus,
  getApproveHistory,
  getAllNotarizations,
  approveSignatureByUser,
  approveSignatureByNotary,
  getHistoryWithStatus,
  autoVerifyDocument,
  getDocumentById,
};
