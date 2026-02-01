const express = require('express');
const router = express.Router();
const ReceiptController = require('../controllers/receiptController');

// Placeholder for authentication middleware
const authenticateUser = (req, res, next) => {
  // In a real implementation, you would check for a valid session or token
  // For now, we'll just pass through
  next();
};

// This middleware would check if the user has access to the trip/expense
const authorizeExpenseAccess = (req, res, next) => {
  // In a real implementation, you would verify:
  // 1. The user is authenticated
  // 2. The user is a member of the trip associated with the expense
  // 3. The expense exists and belongs to the trip
  next();
};

// Process receipt image with OCR
router.post('/process', authenticateUser, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.processReceipt(req, res);
  } catch (error) {
    next(error);
  }
});

// Upload receipt image for existing expense
router.post('/:expenseId/image', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.uploadReceiptImage(req, res);
  } catch (error) {
    next(error);
  }
});

// Get receipt image
router.get('/:expenseId/image', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.getReceiptImage(req, res);
  } catch (error) {
    next(error);
  }
});

// Get detailed receipt information
router.get('/:expenseId/details', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.getReceiptDetails(req, res);
  } catch (error) {
    next(error);
  }
});

// Create detailed receipt information
router.post('/:expenseId/details', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.createReceiptDetails(req, res);
  } catch (error) {
    next(error);
  }
});

// Update detailed receipt information
router.put('/:expenseId/details/:receiptDetailId', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.updateReceiptDetails(req, res);
  } catch (error) {
    next(error);
  }
});

// Save item allocations for a receipt
router.post('/:expenseId/allocations', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.saveItemAllocations(req, res);
  } catch (error) {
    next(error);
  }
});

// Get item allocations for a receipt
router.get('/:expenseId/allocations', authenticateUser, authorizeExpenseAccess, async (req, res, next) => {
  try {
    const controller = new ReceiptController(req.app.get('db'));
    await controller.getItemAllocations(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;