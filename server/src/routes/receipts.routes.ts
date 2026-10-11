import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { ReceiptOcrService } from '../services/receipt-ocr.service.js';
import { HttpStatus, AppError } from '@lumaspend/shared';
import rateLimit from 'express-rate-limit';

export const receiptsRouter = Router();

// Protect all receipt routes with authentication
receiptsRouter.use(requireAuth);

// Rate limiter for OCR scanning to protect resources (15 requests per 10 minutes)
const ocrRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many receipt scans. Please wait a few minutes before trying again.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Multer memory storage configuration (5MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// POST /api/receipts/scan - Upload and scan receipt image via OCR
receiptsRouter.post(
  '/scan',
  ocrRateLimiter,
  upload.single('receipt'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.badRequest('No receipt image file uploaded. Please provide a file with key "receipt".');
    }

    // 1. Validate file format and magic byte signature
    const validation = ReceiptOcrService.validateImageBuffer(req.file.buffer, req.file.mimetype);
    if (!validation.isValid) {
      throw AppError.badRequest(validation.error || 'Invalid receipt image format');
    }

    // 2. Perform OCR candidate extraction
    const currency = (req.user as any)?.preferences?.currency || 'INR';
    const scanResult = await ReceiptOcrService.scanReceipt(req.file.buffer, currency);

    // 3. Return candidate findings for explicit user review
    res.status(HttpStatus.OK).json({
      success: true,
      data: scanResult
    });
  })
);
