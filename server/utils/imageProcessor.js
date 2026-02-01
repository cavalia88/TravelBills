const fs = require('fs').promises;
const path = require('path');

class ImageProcessor {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', '..', 'uploads');
    this.receiptsDir = path.join(this.uploadDir, 'receipts');
    this.thumbnailsDir = path.join(this.uploadDir, 'thumbnails');
  }
  
  async initialize() {
    // Create directories if they don't exist
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.receiptsDir, { recursive: true });
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directories:', error);
      throw error;
    }
  }
  
  async processImage(imageFile, expenseId) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      // Create directory structure
      const receiptDir = path.join(this.receiptsDir, year.toString(), month);
      const thumbnailDir = path.join(this.thumbnailsDir, year.toString(), month);
      
      await fs.mkdir(receiptDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      // Generate filenames
      const originalFilename = `expense-${expenseId}-${timestamp}.jpg`;
      const originalPath = path.join(receiptDir, originalFilename);
      
      // For now, we'll just save the uploaded file directly
      // In a production environment, you would want to:
      // 1. Validate the file is actually an image
      // 2. Convert to a standard format (JPEG)
      // 3. Compress the image to reduce file size
      // 4. Generate thumbnail and display versions
      
      // Save original image
      await fs.writeFile(originalPath, imageFile.data);
      
      // Return paths (in a real implementation, you would also generate thumbnails)
      const relativeOriginalPath = path.join('receipts', year.toString(), month, originalFilename);
      
      return {
        original_path: relativeOriginalPath,
        display_path: relativeOriginalPath, // For now, same as original
        thumbnail_path: relativeOriginalPath, // For now, same as original
        file_size: imageFile.size,
        image_format: imageFile.mimetype.split('/')[1],
        width: null, // Would need to extract from image
        height: null // Would need to extract from image
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }
  
  async getImage(imagePath) {
    try {
      const fullPath = path.join(this.uploadDir, imagePath);
      const imageBuffer = await fs.readFile(fullPath);
      return imageBuffer;
    } catch (error) {
      console.error('Error retrieving image:', error);
      throw new Error('Failed to retrieve image');
    }
  }
}

module.exports = new ImageProcessor();