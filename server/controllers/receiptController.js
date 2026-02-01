const Receipt = require('../models/Receipt');
const ocrService = require('../utils/ocrService');
const imageProcessor = require('../utils/imageProcessor');
const { validateOcrRequest, validateReceiptDataQuality, validateImageFile } = require('../utils/validators');

class ReceiptController {
  constructor(db) {
    this.db = db;
    this.receiptModel = new Receipt(db);
  }
  
  // Process receipt image with OCR
  async processReceipt(req, res) {
    try {
      // Validate request
      const validation = validateOcrRequest(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.errors
        });
      }
      
      // Process with OCR service
      const ocrResult = await ocrService.processReceipt(req.body);
      
      // Validate OCR result
      const resultValidation = validateReceiptDataQuality(ocrResult.receiptData);
      if (!resultValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OCR result',
          details: resultValidation.errors
        });
      }
      
      res.json(ocrResult);
    } catch (error) {
      console.error('Error processing receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process receipt'
      });
    }
  }
  
  // Upload receipt image for existing expense
  async uploadReceiptImage(req, res) {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }
      
      const imageFile = req.files.image;
      const expenseId = req.params.expenseId;
      
      // Validate image file
      const validation = validateImageFile(imageFile);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image file',
          details: validation.errors
        });
      }
      
      // Initialize image processor
      await imageProcessor.initialize();
      
      // Process and store image
      const imagePaths = await imageProcessor.processImage(imageFile, expenseId);
      
      // Save to database
      const receiptImage = await this.receiptModel.saveImage(expenseId, imagePaths);
      
      res.json({
        success: true,
        message: 'Receipt image uploaded successfully',
        imageId: receiptImage.id
      });
    } catch (error) {
      console.error('Error uploading receipt image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload receipt image'
      });
    }
  }
  
  // Get receipt image
  async getReceiptImage(req, res) {
    try {
      const expenseId = req.params.expenseId;
      
      // Get image record from database
      const receiptImage = await this.receiptModel.getImageByExpenseId(expenseId);
      
      if (!receiptImage) {
        return res.status(404).json({
          success: false,
          error: 'No receipt image found for this expense'
        });
      }
      
      // Initialize image processor
      await imageProcessor.initialize();
      
      // Get image file
      const imageBuffer = await imageProcessor.getImage(receiptImage.original_path);
      
      // Set appropriate content type
      res.setHeader('Content-Type', `image/${receiptImage.image_format || 'jpeg'}`);
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error retrieving receipt image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve receipt image'
      });
    }
  }
  
  // Get detailed receipt information
  async getReceiptDetails(req, res) {
    try {
      const expenseId = req.params.expenseId;
      
      // Get receipt details from database
      const receiptDetails = await this.receiptModel.getReceiptDetailsByExpenseId(expenseId);
      
      if (!receiptDetails) {
        return res.status(404).json({
          success: false,
          error: 'No receipt details found for this expense'
        });
      }
      
      res.json({
        success: true,
        receiptDetails
      });
    } catch (error) {
      console.error('Error retrieving receipt details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve receipt details'
      });
    }
  }
  
  // Create detailed receipt information
  async createReceiptDetails(req, res) {
    try {
      const expenseId = req.params.expenseId;
      const receiptData = req.body;
      
      // Save receipt details to database
      const receiptDetailId = await this.receiptModel.saveReceiptDetails(expenseId, receiptData);
      
      // Update expense to mark as detailed receipt
      await this.db.query(
        'UPDATE expenses SET is_detailed_receipt = 1, receipt_detail_id = ? WHERE id = ?', 
        [receiptDetailId, expenseId]
      );
      
      res.json({
        success: true,
        message: 'Receipt details created successfully',
        receiptDetailId
      });
    } catch (error) {
      console.error('Error creating receipt details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create receipt details'
      });
    }
  }
  
  // Update detailed receipt information
  async updateReceiptDetails(req, res) {
    try {
      const expenseId = req.params.expenseId;
      const receiptData = req.body;
      
      // Save receipt details to database (same as create since we're using ON DUPLICATE KEY UPDATE)
      const receiptDetailId = await this.receiptModel.saveReceiptDetails(expenseId, receiptData);
      
      res.json({
        success: true,
        message: 'Receipt details updated successfully'
      });
    } catch (error) {
      console.error('Error updating receipt details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update receipt details'
      });
    }
  }
  
  // Save item allocations for a receipt
  async saveItemAllocations(req, res) {
    try {
      const expenseId = req.params.expenseId;
      const allocations = req.body.allocations;
      
      // Save item allocations to database
      await this.receiptModel.saveItemAllocations(expenseId, allocations);
      
      res.json({
        success: true,
        message: 'Item allocations saved successfully'
      });
    } catch (error) {
      console.error('Error saving item allocations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save item allocations'
      });
    }
  }
  
  // Get item allocations for a receipt
  async getItemAllocations(req, res) {
    try {
      const expenseId = req.params.expenseId;
      
      // Get item allocations from database
      const allocations = await this.receiptModel.getItemAllocationsByExpenseId(expenseId);
      
      res.json({
        success: true,
        allocations
      });
    } catch (error) {
      console.error('Error retrieving item allocations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve item allocations'
      });
    }
  }
}

module.exports = ReceiptController;