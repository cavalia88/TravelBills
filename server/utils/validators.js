function validateOcrRequest(data) {
  const errors = [];
  
  // Validate base64 image data
  if (!data.imageBase64 || typeof data.imageBase64 !== 'string') {
    errors.push('Missing or invalid image data');
  }
  
  // Validate MIME type
  if (!data.mimeType || typeof data.mimeType !== 'string') {
    errors.push('Missing or invalid MIME type');
  }
  
  // Validate MIME type format
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimeTypes.includes(data.mimeType)) {
    errors.push('Invalid MIME type. Supported types: image/jpeg, image/png, image/webp');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateReceiptDataQuality(receiptData) {
  const warnings = [];
  const errors = [];
  
  // Validate total amount
  if (typeof receiptData.total === 'number') {
    if (receiptData.total < 0) {
      errors.push('Total amount cannot be negative');
    }
    
    if (receiptData.total > 100000) {
      warnings.push('Unusually high total amount - please verify');
    }
  }
  
  // Validate items
  if (Array.isArray(receiptData.items)) {
    if (receiptData.items.length === 0) {
      warnings.push('No items found in receipt');
    }
    
    let itemsTotal = 0;
    receiptData.items.forEach((item, index) => {
      if (!item.name || typeof item.name !== 'string') {
        errors.push(`Item ${index + 1}: Missing or invalid item name`);
      }
      
      if (typeof item.amount !== 'number') {
        errors.push(`Item ${index + 1}: Invalid amount format`);
      } else {
        if (item.amount < 0) {
          errors.push(`Item ${index + 1}: Amount cannot be negative`);
        }
        itemsTotal += item.amount;
      }
    });
    
    // Validate calculated total vs reported total
    if (typeof receiptData.total === 'number') {
      const tolerance = receiptData.total * 0.01; // 1% tolerance
      const difference = Math.abs(itemsTotal - receiptData.total);
      
      if (difference > tolerance) {
        warnings.push(`Calculated total (${itemsTotal.toFixed(2)}) differs from reported total (${receiptData.total.toFixed(2)})`);
      }
    }
  }
  
  // Validate discounts
  if (Array.isArray(receiptData.discounts)) {
    receiptData.discounts.forEach((discount, index) => {
      if (!discount.name || typeof discount.name !== 'string') {
        errors.push(`Discount ${index + 1}: Missing or invalid discount name`);
      }
      
      if (typeof discount.amount !== 'number') {
        errors.push(`Discount ${index + 1}: Invalid amount format`);
      } else if (discount.amount < 0) {
        warnings.push(`Discount ${index + 1}: Negative discount amount - should typically be positive`);
      }
    });
  }
  
  // Validate service charges
  if (Array.isArray(receiptData.serviceCharges)) {
    receiptData.serviceCharges.forEach((charge, index) => {
      if (!charge.name || typeof charge.name !== 'string') {
        errors.push(`Service charge ${index + 1}: Missing or invalid charge name`);
      }
      
      if (typeof charge.amount !== 'number') {
        errors.push(`Service charge ${index + 1}: Invalid amount format`);
      } else if (charge.amount < 0) {
        errors.push(`Service charge ${index + 1}: Amount cannot be negative`);
      }
    });
  }
  
  // Validate taxes
  if (Array.isArray(receiptData.taxes)) {
    receiptData.taxes.forEach((tax, index) => {
      if (!tax.name || typeof tax.name !== 'string') {
        errors.push(`Tax ${index + 1}: Missing or invalid tax name`);
      }
      
      if (typeof tax.amount !== 'number') {
        errors.push(`Tax ${index + 1}: Invalid amount format`);
      } else if (tax.amount < 0) {
        errors.push(`Tax ${index + 1}: Amount cannot be negative`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings
  };
}

function validateImageFile(file) {
  const errors = [];
  
  // File size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('Image file size exceeds 10MB limit');
  }
  
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push('Invalid image format. Supported formats: JPEG, PNG, WebP');
  }
  
  // File name validation
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid file name');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateOcrRequest,
  validateReceiptDataQuality,
  validateImageFile
};