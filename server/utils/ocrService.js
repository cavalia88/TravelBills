const axios = require('axios');

class CircuitBreaker {
  constructor(failureThreshold = 5, timeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async call(operation) {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

class OcrService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
    this.OCR_BACKEND_URL = process.env.OCR_BACKEND_URL || 'https://track-production-115b.up.railway.app/api/parse-receipt';
    this.OCR_API_KEY = process.env.OCR_API_KEY;
  }
  
  async processReceipt(imageData) {
    try {
      const result = await this.circuitBreaker.call(async () => {
        // Apply retry logic with exponential backoff
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const response = await axios.post(this.OCR_BACKEND_URL, imageData, {
              headers: {
                'Authorization': `Bearer ${this.OCR_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 90000 // 90 seconds
            });
            
            return response.data;
          } catch (error) {
            retryCount++;
            
            // If this is the last retry, throw the error
            if (retryCount >= maxRetries) {
              throw error;
            }
            
            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
            const jitter = Math.random() * 1000; // Add up to 1 second of jitter
            const totalDelay = delay + jitter;
            
            console.log(`Retry ${retryCount}/${maxRetries} in ${totalDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, totalDelay));
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('OCR service error:', error);
      
      // Handle different error types
      if (error.code === 'ECONNABORTED') {
        throw new Error('OCR processing timed out');
      }
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 429) {
          throw new Error('OCR service rate limit exceeded');
        }
        
        if (status >= 500) {
          throw new Error('OCR service unavailable');
        }
        
        throw new Error(data?.error || `OCR service error: ${status}`);
      }
      
      // Network or other error
      throw new Error('Failed to connect to OCR service');
    }
  }
}

module.exports = new OcrService();