class ReceiptUploader {
  constructor() {
    this.imageData = null;
    this.isProcessing = false;
    this.currentTripId = null;
    this.initialized = false;
    this.stream = null; // Store camera stream
    this.currentReceiptData = null;
    this.isEditing = false;
    this.tripMembers = [];
    this.currentAllocations = [];
    this.currentPayer = null;
  }
  
  init() {
    // Prevent multiple initializations which cause duplicate event listeners
    if (this.initialized) {
      console.log('ReceiptUploader already initialized, checking file input...');
      this.initFileInput(); // Ensure file input exists
      return;
    }
    
    console.log('ReceiptUploader.init() called');
    // Get current trip ID from the global variable set in trip.js
    if (window.currentTripId) {
      this.currentTripId = window.currentTripId;
      console.log('Trip ID set from global variable:', this.currentTripId);
    } else {
      // Fallback: try to get trip ID from URL
      const tripUrlMatch = window.location.pathname.match(new RegExp('/trip/([^/]+)'));
      if (tripUrlMatch && tripUrlMatch[1]) {
        const urlId = tripUrlMatch[1];
        console.log('Using URL ID to get database ID:', urlId);
        
        // Get the trip details to get the database ID
        fetch(`/api/trips/${urlId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(tripData => {
            if (tripData && tripData.id) {
              this.currentTripId = tripData.id;
              console.log('Got database ID from URL ID:', this.currentTripId);
            } else {
              console.error('Could not get database ID from trip data:', tripData);
            }
          })
          .catch(error => {
            console.error('Error fetching trip data:', error);
          });
      } else {
        console.warn('Could not determine trip ID');
      }
    }
    
    // Initialize event listeners
    this.setupEventListeners();
    
    // Initialize file input
    this.initFileInput();
    
    this.initialized = true;
  }
  
  setupEventListeners() {
    // Use event delegation to handle clicks on buttons
    document.addEventListener('click', (event) => {
      // Use .closest() to handle clicks on children elements (like icons inside buttons)
      const selectBtn = event.target.closest('#select-image-btn');
      const captureBtn = event.target.closest('#capture-image-btn');
      const processBtn = event.target.closest('#process-receipt-btn');
      const removeBtn = event.target.closest('#remove-image-btn');
      
      // Camera controls
      const takePhotoBtn = event.target.closest('#take-photo-btn');
      const cancelCameraBtn = event.target.closest('#cancel-camera-btn');

      // Edit / Create controls
      const editReceiptBtn = event.target.closest('#edit-receipt-btn');
      const createExpenseBtn = event.target.closest('#create-expense-btn');
      const allocateItemsBtn = event.target.closest('#allocate-items-btn');

      // Allocation controls
      const cancelAllocationBtn = event.target.closest('#cancel-allocation-btn');
      const saveAllocationBtn = event.target.closest('#save-allocation-btn');
      const backToAllocationBtn = event.target.closest('#back-to-allocation-btn');
      const selectPayerBtn = event.target.closest('#select-payer-btn');
      const backToBillSplitBtn = event.target.closest('#back-to-bill-split-btn');
      const createExpenseFromAllocationBtn = event.target.closest('#create-expense-from-allocation-btn');

      // Dynamic table controls
      const removeRowBtn = event.target.closest('.remove-row-btn');
      const addRowBtn = event.target.closest('.add-row-btn');

      // Member allocation controls
      const memberCheckbox = event.target.closest('.member-allocation-checkbox');

      if (selectBtn) {
        console.log('Select image button clicked');
        this.selectImage();
      } else if (captureBtn) {
        console.log('Capture image button clicked');
        this.captureImage();
      } else if (processBtn) {
        console.log('Process receipt button clicked');
        this.processReceipt();
      } else if (removeBtn) {
        console.log('Remove image button clicked');
        this.removeImage();
      } else if (takePhotoBtn) {
        console.log('Take photo button clicked');
        this.takePhoto();
      } else if (cancelCameraBtn) {
        console.log('Cancel camera button clicked');
        this.stopCamera();
      } else if (editReceiptBtn) {
        console.log('Edit receipt button clicked');
        this.toggleEditMode();
      } else if (createExpenseBtn) {
        console.log('Create expense button clicked');
        this.populateExpenseForm();
      } else if (allocateItemsBtn) {
        console.log('Allocate items button clicked');
        this.showItemAllocation();
      } else if (cancelAllocationBtn) {
        console.log('Cancel allocation button clicked');
        this.showTripSection('receipt-details');
      } else if (saveAllocationBtn) {
        console.log('Save allocation button clicked');
        this.saveItemAllocations();
      } else if (backToAllocationBtn) {
        console.log('Back to allocation button clicked');
        this.showTripSection('item-allocation');
      } else if (selectPayerBtn) {
        console.log('Select payer button clicked');
        this.showPayerSelection();
      } else if (backToBillSplitBtn) {
        console.log('Back to bill split button clicked');
        this.showTripSection('bill-split');
      } else if (createExpenseFromAllocationBtn) {
        console.log('Create expense from allocation button clicked');
        this.createExpenseFromAllocation();
      } else if (removeRowBtn) {
        removeRowBtn.closest('tr').remove();
      } else if (addRowBtn) {
        this.addEmptyRow(addRowBtn.dataset.target);
      } else if (memberCheckbox) {
        this.updateAllocationSummary();
      }
    });
  }
  
  initFileInput() {
    console.log('ReceiptUploader.initFileInput() called');
    let fileInput = document.getElementById('receipt-image-input');
    
    if (!fileInput) {
      console.log('Creating new file input element');
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.id = 'receipt-image-input';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      this.attachFileInputListener(fileInput);
    } else {
      console.log('Refreshing existing file input');
      // Replace to clear old listeners if any, and ensure clean state
      const newFileInput = fileInput.cloneNode(true);
      newFileInput.value = ''; // Reset value
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      this.attachFileInputListener(newFileInput);
    }
  }
  
  attachFileInputListener(fileInput) {
    fileInput.addEventListener('change', (e) => {
      console.log('File input change event triggered');
      if (e.target.files && e.target.files.length > 0) {
        this.handleImageSelection(e.target.files[0]);
      }
      // Reset value so the same file can be selected again if needed
      e.target.value = '';
    });
  }
  
  selectImage() {
    console.log('ReceiptUploader.selectImage() called');
    const fileInput = document.getElementById('receipt-image-input');
    if (fileInput) {
      // Ensure value is clear before click
      fileInput.value = '';
      console.log('Triggering click on file input');
      fileInput.click();
    } else {
      console.log('File input not found, re-initializing');
      this.initFileInput();
      document.getElementById('receipt-image-input')?.click();
    }
  }

  removeImage() {
    this.imageData = null;
    const previewElement = document.getElementById('receipt-preview');
    if (previewElement) previewElement.src = '';
    
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');
    
    const processButton = document.getElementById('process-receipt-btn');
    if (processButton) processButton.classList.add('hidden');
    
    const fileInput = document.getElementById('receipt-image-input');
    if (fileInput) fileInput.value = '';
    
    // Make sure upload options are visible
    const uploadOptions = document.getElementById('upload-options-container');
    if (uploadOptions) uploadOptions.classList.remove('hidden');
  }
  
  async captureImage() {
    // Hide upload options and show camera interface
    const uploadOptions = document.getElementById('upload-options-container');
    const cameraInterface = document.getElementById('camera-interface');
    const video = document.getElementById('camera-stream');
    const previewContainer = document.getElementById('image-preview-container');
    
    // Clean up any existing image
    if (previewContainer && !previewContainer.classList.contains('hidden')) {
        this.removeImage();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.showError('Camera access is not supported in this browser');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
      });
      
      this.stream = stream;
      if (video) {
          video.srcObject = stream;
      }
      
      if (uploadOptions) uploadOptions.classList.add('hidden');
      if (cameraInterface) cameraInterface.classList.remove('hidden');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.showError('Unable to access camera. Please check permissions.');
    }
  }

  takePhoto() {
      const video = document.getElementById('camera-stream');
      const canvas = document.getElementById('camera-canvas');
      
      if (video && canvas) {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to base64 JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          // Stop camera
          this.stopCamera();
          
          // Process the image data
          this.handleImageString(dataUrl);
      }
  }

  stopCamera() {
      if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
      }
      
      const video = document.getElementById('camera-stream');
      if (video) video.srcObject = null;
      
      const cameraInterface = document.getElementById('camera-interface');
      const uploadOptions = document.getElementById('upload-options-container');
      
      if (cameraInterface) cameraInterface.classList.add('hidden');
      if (uploadOptions) uploadOptions.classList.remove('hidden');
  }
  
  handleImageString(dataUrl) {
      // Store image data for processing
      this.imageData = {
          imageBase64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
      };
      
      // Display preview
      const previewElement = document.getElementById('receipt-preview');
      if (previewElement) {
          previewElement.src = dataUrl;
      }
      
      const previewContainer = document.getElementById('image-preview-container');
      if (previewContainer) {
          previewContainer.classList.remove('hidden');
          previewContainer.style.display = 'block';
      }
      
      const processButton = document.getElementById('process-receipt-btn');
      if (processButton) {
          processButton.classList.remove('hidden');
          processButton.style.display = 'inline-block';
      }
  }
  
  handleImageSelection(file) {
    console.log('ReceiptUploader.handleImageSelection() called with file:', file.name, file.type, file.size);
    // Validate file
    if (!this.validateImageFile(file)) {
      return;
    }
    
    // Display preview
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('FileReader onload event triggered');
      this.handleImageString(e.target.result);
    };
    
    reader.onerror = (err) => {
        console.error('Error reading file:', err);
        this.showError('Failed to read image file.');
    };
    
    reader.readAsDataURL(file);
  }
  
  validateImageFile(file) {
    // File size validation (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showError('Image file size exceeds 10MB limit');
      return false;
    }
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      console.warn('File type not explicitly allowed:', file.type);
      // Allow it if it starts with image/
      if (!file.type.startsWith('image/')) {
          this.showError('Invalid image format. Please select an image file.');
          return false;
      }
    }
    return true;
  }
  
  async processReceipt() {
    if (!this.imageData) {
      this.showError('Please select or capture a receipt image first');
      return;
    }
    
    this.isProcessing = true;
    this.showProcessingIndicator();
    
    try {
      const response = await fetch('/api/receipts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.imageData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.displayReceiptDetails(result.receiptData);
      } else {
        this.showError(result.error || 'Failed to process receipt');
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      this.showError('Failed to process receipt. Please try again.');
    } finally {
      this.isProcessing = false;
      this.hideProcessingIndicator();
    }
  }
  
  displayReceiptDetails(receiptData) {
    // Store data for editing
    this.currentReceiptData = receiptData;

    // 1. Basic Info
    const shopNameElement = document.getElementById('shop-name');
    if (shopNameElement) shopNameElement.textContent = receiptData.shopName || 'Shop Name Not Available';
    
    const addressElement = document.getElementById('receipt-address');
    if (addressElement) addressElement.textContent = receiptData.address || 'Address Not Available';
    
    const dateTimeElement = document.getElementById('receipt-date-time');
    if (dateTimeElement) {
      const dateStr = receiptData.date || new Date().toISOString().split('T')[0];
      const timeStr = receiptData.time || '';
      dateTimeElement.textContent = timeStr ? `${dateStr} (${timeStr})` : dateStr;
    }

    // 2. Perform Calculations & Warnings
    const warningContainer = document.getElementById('receipt-warning-container');
    if (warningContainer) {
        // Calculate sum of all items
        const itemsSum = receiptData.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;
        // Calculate sum of all taxes
        const taxesSum = receiptData.taxes?.reduce((sum, tax) => sum + (parseFloat(tax.amount) || 0), 0) || 0;
        // Calculate sum of all service charges
        const serviceChargesSum = receiptData.serviceCharges?.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0) || 0;
        // Calculate sum of all discounts
        const discountsSum = receiptData.discounts?.reduce((sum, discount) => sum + (Math.abs(parseFloat(discount.amount)) || 0), 0) || 0;

        // Calculated total: Items + Taxes + Service - Discounts
        const calculated = parseFloat((itemsSum + taxesSum + serviceChargesSum - discountsSum).toFixed(2));
        const receiptTotal = parseFloat((receiptData.total || 0).toFixed(2));
        
        const difference = parseFloat(Math.abs(calculated - receiptTotal).toFixed(2));
        const toleranceAmount = parseFloat((receiptTotal * 0.005).toFixed(2)); // 0.5% tolerance

        if (difference > toleranceAmount) {
            warningContainer.innerHTML = `
                <div class="warning-container">
                    <p class="warning-text">
                        Warning: The total amount on the receipt (${this.formatCurrency(receiptTotal, receiptData.currency)}) 
                        doesn't match the calculated total (${this.formatCurrency(calculated, receiptData.currency)}).
                        Variation: ${this.formatCurrency(difference, receiptData.currency)} 
                        (exceeds 0.5% tolerance of ${this.formatCurrency(toleranceAmount, receiptData.currency)})
                        <br>Please double check the values and edit if necessary.
                    </p>
                </div>
            `;
            warningContainer.classList.remove('hidden');
            warningContainer.style.display = 'block';
        } else {
            warningContainer.classList.add('hidden');
            warningContainer.innerHTML = '';
        }
    }
    
    // 3. Populate Tables
    const populateTable = (containerId, items, isDiscount = false) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
            if (items && items.length > 0) {
                items.forEach(item => {
                    const row = document.createElement('tr');
                    const amountValue = parseFloat(item.amount) || 0;
                    // For discounts, display as negative. For others, positive.
                    const displayAmount = isDiscount ? -Math.abs(amountValue) : amountValue;
                    const amountStr = this.formatCurrency(displayAmount, receiptData.currency);
                    
                    row.innerHTML = `<td>${this.escapeHtml(item.name || 'Unnamed Item')}</td><td>${amountStr}</td>`;
                    container.appendChild(row);
                });
            } else {
                 const row = document.createElement('tr');
                 row.innerHTML = `<td colspan="2" style="text-align:center; color:#999; font-size: 0.9em;">No items</td>`;
                 container.appendChild(row);
            }
        }
    };

    populateTable('receipt-items-list', receiptData.items);
    populateTable('receipt-discounts-list', receiptData.discounts, true); // true for discounts
    populateTable('receipt-service-charges-list', receiptData.serviceCharges);
    populateTable('receipt-taxes-list', receiptData.taxes);
    
    // 4. Total
    const totalElement = document.getElementById('receipt-total-amount');
    if (totalElement) {
      totalElement.textContent = this.formatCurrency(receiptData.total || 0, receiptData.currency);
    }
    
    this.showTripSection('receipt-details');
  }

  // ===================================
  // EDIT MODE FUNCTIONALITY
  // ===================================

  toggleEditMode() {
    if (this.isEditing) {
      this.saveEditedReceipt();
    } else {
      this.enableEditMode();
    }
  }

  enableEditMode() {
    this.isEditing = true;
    const data = this.currentReceiptData;
    
    // Update Edit Button
    const editBtn = document.getElementById('edit-receipt-btn');
    if (editBtn) {
        editBtn.textContent = 'Save Changes';
        editBtn.classList.remove('btn-secondary');
        editBtn.classList.add('btn-success');
    }

    // 1. Basic Info
    const shopContainer = document.getElementById('shop-name');
    shopContainer.innerHTML = `<input type="text" id="edit-shop-name" value="${this.escapeHtml(data.shopName)}" class="form-control" style="font-size: 1.2rem; font-weight: bold; width: 100%; text-align: center; margin-bottom: 5px;">`;

    const addressContainer = document.getElementById('receipt-address');
    addressContainer.innerHTML = `<input type="text" id="edit-address" value="${this.escapeHtml(data.address)}" class="form-control" style="width: 100%; text-align: center; margin-bottom: 5px;">`;

    const dateContainer = document.getElementById('receipt-date-time');
    const dateVal = data.date || new Date().toISOString().split('T')[0];
    const timeVal = data.time || '';
    dateContainer.innerHTML = `
        <div style="display: flex; gap: 10px; justify-content: center;">
            <input type="date" id="edit-date" value="${dateVal}" class="form-control">
            <input type="time" id="edit-time" value="${timeVal}" class="form-control">
        </div>
    `;

    // 2. Tables
    this.makeTableEditable('receipt-items-list', data.items);
    this.makeTableEditable('receipt-discounts-list', data.discounts);
    this.makeTableEditable('receipt-service-charges-list', data.serviceCharges);
    this.makeTableEditable('receipt-taxes-list', data.taxes);

    // 3. Total
    const totalContainer = document.getElementById('receipt-total-amount');
    totalContainer.innerHTML = `<input type="number" step="0.01" id="edit-total" value="${data.total}" class="form-control" style="width: 120px; text-align: right; font-weight: bold;">`;
  }

  makeTableEditable(containerId, items) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    (items || []).forEach(item => {
        this.addEditableRow(tbody, item.name, item.amount);
    });
    
    // Add "Add Row" button after the table if not present
    const table = tbody.closest('table');
    if (table && !table.nextElementSibling?.classList.contains('add-row-btn')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm add-row-btn';
        btn.textContent = '+ Add Item';
        btn.dataset.target = containerId;
        btn.style.marginTop = '5px';
        btn.style.marginBottom = '15px';
        // Insert after table
        table.parentNode.insertBefore(btn, table.nextSibling);
    }
  }

  addEditableRow(tbody, name = '', amount = 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="edit-item-name form-control" value="${this.escapeHtml(name)}" placeholder="Item name" style="width: 100%;"></td>
        <td><input type="number" step="0.01" class="edit-item-amount form-control" value="${Math.abs(amount)}" placeholder="0.00" style="width: 100%;"></td>
        <td style="width: 40px;"><button class="btn btn-danger btn-sm remove-row-btn" title="Remove row">×</button></td>
    `;
    tbody.appendChild(tr);
  }
  
  addEmptyRow(containerId) {
    const tbody = document.getElementById(containerId);
    if(tbody) this.addEditableRow(tbody);
  }

  saveEditedReceipt() {
    // Scrape data
    const newData = { ...this.currentReceiptData };
    
    const shopInput = document.getElementById('edit-shop-name');
    if (shopInput) newData.shopName = shopInput.value;
    
    const addressInput = document.getElementById('edit-address');
    if (addressInput) newData.address = addressInput.value;
    
    const dateInput = document.getElementById('edit-date');
    if (dateInput) newData.date = dateInput.value;
    
    const timeInput = document.getElementById('edit-time');
    if (timeInput) newData.time = timeInput.value;
    
    newData.items = this.scrapeTableData('receipt-items-list');
    newData.discounts = this.scrapeTableData('receipt-discounts-list');
    newData.serviceCharges = this.scrapeTableData('receipt-service-charges-list');
    newData.taxes = this.scrapeTableData('receipt-taxes-list');
    
    const totalInput = document.getElementById('edit-total');
    if (totalInput) newData.total = parseFloat(totalInput.value) || 0;
    
    // Update state
    this.currentReceiptData = newData;
    this.isEditing = false;
    
    // Reset button
    const editBtn = document.getElementById('edit-receipt-btn');
    if (editBtn) {
        editBtn.textContent = 'Edit Receipt';
        editBtn.classList.remove('btn-success');
        editBtn.classList.add('btn-secondary');
    }
    
    // Remove "Add Row" buttons
    document.querySelectorAll('.add-row-btn').forEach(btn => btn.remove());
    
    // Re-render
    this.displayReceiptDetails(this.currentReceiptData);
  }

  scrapeTableData(containerId) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return [];
    
    const items = [];
    tbody.querySelectorAll('tr').forEach(tr => {
        const nameInput = tr.querySelector('.edit-item-name');
        const amountInput = tr.querySelector('.edit-item-amount');
        if (nameInput && amountInput) {
            const name = nameInput.value.trim();
            const amount = parseFloat(amountInput.value) || 0;
            if (name || amount) {
                items.push({ name, amount });
            }
        }
    });
    return items;
  }

  populateExpenseForm() {
    const data = this.currentReceiptData;
    if (!data) return;

    // Populate basic fields
    const descInput = document.getElementById('expense-description');
    const amountInput = document.getElementById('expense-amount');
    const dateInput = document.getElementById('expense-date');
    
    if (descInput) descInput.value = data.shopName ? `Receipt from ${data.shopName}` : 'Receipt Expense';
    if (amountInput) amountInput.value = data.total;
    if (dateInput) dateInput.value = data.date;
    
    // Navigate to expense section
    this.showTripSection('expenses');
    
    // Scroll to form
    const form = document.getElementById('expense-form');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  }
  
  // ===================================
  // ITEM ALLOCATION FUNCTIONALITY
  // ===================================
  
  showItemAllocation() {
    console.log('showItemAllocation called');
    const data = this.currentReceiptData;
    console.log('Current receipt data:', data);
    
    if (!data) {
      console.log('No receipt data available');
      this.showError('No receipt data available');
      return;
    }
    
    if (!data.items || data.items.length === 0) {
      console.log('No items found in receipt');
      this.showError('No items found in receipt');
      return;
    }
    
    console.log('Receipt items:', data.items);
    
    // Get trip members
    console.log('Fetching trip members...');
    this.getTripMembers().then(members => {
      console.log('Successfully fetched trip members:', members);
      
      // Display allocation summary
      this.updateAllocationSummary();
      
      // Populate items allocation container
      const container = document.getElementById('items-allocation-container');
      if (container) {
        container.innerHTML = '';
        
        data.items.forEach((item, index) => {
          const itemElement = this.createItemAllocationElement(item, index, members);
          container.appendChild(itemElement);
        });
      }
      
      // Show allocation section
      console.log('Showing item allocation section');
      this.showTripSection('item-allocation');
    }).catch(error => {
      console.error('Error fetching trip members:', error);
      this.showError('Failed to load trip members: ' + error.message);
    });
  }
  
  createItemAllocationElement(item, index, members) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-allocation-row';
    itemDiv.innerHTML = `
      <div class="item-allocation-header">
        <div>
          <strong>${this.escapeHtml(item.name)}</strong>
          <div>Amount: ${this.formatCurrency(item.amount, this.currentReceiptData.currency)}</div>
        </div>
      </div>
      <div class="allocation-controls">
        ${members.map(member => `
          <div class="member-allocation">
            <input type="checkbox" id="item-${index}-member-${member}" class="member-allocation-checkbox" data-item-index="${index}" data-member="${member}" checked>
            <label for="item-${index}-member-${member}">${member}</label>
          </div>
        `).join('')}
      </div>
    `;
    return itemDiv;
  }
  
  updateAllocationSummary() {
    const data = this.currentReceiptData;
    if (!data) return;
    
    const totalAmount = data.total || 0;
    let allocatedAmount = 0;
    
    // Calculate allocated amount based on checked checkboxes
    if (data.items) {
      data.items.forEach((item, itemIndex) => {
        const checkboxes = document.querySelectorAll(`.member-allocation-checkbox[data-item-index="${itemIndex}"]:checked`);
        if (checkboxes.length > 0) {
          allocatedAmount += parseFloat(item.amount) || 0;
        }
      });
    }
    
    const remainingAmount = totalAmount - allocatedAmount;
    
    // Update summary display
    const totalElement = document.getElementById('allocation-total');
    const allocatedElement = document.getElementById('allocated-amount');
    const remainingElement = document.getElementById('remaining-amount');
    
    if (totalElement) totalElement.textContent = this.formatCurrency(totalAmount, data.currency);
    if (allocatedElement) allocatedElement.textContent = this.formatCurrency(allocatedAmount, data.currency);
    if (remainingElement) remainingElement.textContent = this.formatCurrency(remainingAmount, data.currency);
  }
  
  saveItemAllocations() {
    // Collect allocation data
    const data = this.currentReceiptData;
    if (!data || !data.items) return;
    
    const allocations = [];
    
    data.items.forEach((item, itemIndex) => {
      const checkboxes = document.querySelectorAll(`.member-allocation-checkbox[data-item-index="${itemIndex}"]:checked`);
      const assignedMembers = Array.from(checkboxes).map(cb => cb.dataset.member);
      
      if (assignedMembers.length > 0) {
        allocations.push({
          itemName: item.name,
          amount: parseFloat(item.amount) || 0,
          members: assignedMembers
        });
      }
    });
    
    // Store allocations
    this.currentAllocations = allocations;
    
    // Save to backend
    this.saveAllocationsToBackend(allocations);
    
    // Show bill split
    this.showBillSplit();
  }
  
  async saveAllocationsToBackend(allocations) {
    try {
      // For now, we'll just log the allocations
      // In a full implementation, this would save to the database
      console.log('Saving allocations to backend:', allocations);
      
      // Example of how to save to backend:
      /*
      const response = await fetch(`/api/receipts/${this.currentExpenseId}/allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allocations })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Allocations saved:', result);
      */
    } catch (error) {
      console.error('Error saving allocations:', error);
      this.showError('Failed to save item allocations');
    }
  }
  
  showBillSplit() {
    const allocations = this.currentAllocations;
    const members = this.tripMembers;
    
    if (!allocations || !members) {
      this.showError('Allocation data not found');
      return;
    }
    
    // Calculate bill split
    const memberShares = {};
    members.forEach(member => {
      memberShares[member] = 0;
    });
    
    allocations.forEach(allocation => {
      const sharePerMember = allocation.amount / allocation.members.length;
      allocation.members.forEach(member => {
        if (memberShares.hasOwnProperty(member)) {
          memberShares[member] += sharePerMember;
        }
      });
    });
    
    // Display bill split
    const container = document.getElementById('bill-split-container');
    if (container) {
      container.innerHTML = '';
      
      Object.entries(memberShares).forEach(([member, share]) => {
        const row = document.createElement('div');
        row.className = 'bill-split-row';
        row.innerHTML = `
          <div>${member}</div>
          <div>${this.formatCurrency(share, this.currentReceiptData.currency)}</div>
        `;
        container.appendChild(row);
      });
      
      // Add total row
      const totalRow = document.createElement('div');
      totalRow.className = 'bill-split-row bill-split-total';
      const totalAmount = Object.values(memberShares).reduce((sum, share) => sum + share, 0);
      totalRow.innerHTML = `
        <div><strong>Total</strong></div>
        <div><strong>${this.formatCurrency(totalAmount, this.currentReceiptData.currency)}</strong></div>
      `;
      container.appendChild(totalRow);
    }
    
    // Show bill split section
    this.showTripSection('bill-split');
  }
  
  showPayerSelection() {
    // Get trip members
    this.getTripMembers().then(members => {
      // Populate payer select
      const payerSelect = document.getElementById('payer-select');
      if (payerSelect) {
        payerSelect.innerHTML = '';
        members.forEach(member => {
          const option = document.createElement('option');
          option.value = member;
          option.textContent = member;
          payerSelect.appendChild(option);
        });
      }
      
      // Show payer selection section
      this.showTripSection('payer-selection');
    }).catch(error => {
      console.error('Error fetching trip members:', error);
      this.showError('Failed to load trip members');
    });
  }
  
  async createExpenseFromAllocation() {
    console.log('createExpenseFromAllocation called');
    const payerSelect = document.getElementById('payer-select');
    const payer = payerSelect ? payerSelect.value : null;
    console.log('Selected payer:', payer);
    
    if (!payer) {
      console.log('No payer selected');
      this.showError('Please select a payer');
      return;
    }
    
    // Store payer information
    this.currentPayer = payer;
    
    // Ensure we have a trip ID before creating the expense
    console.log('Ensuring trip ID is available');
    try {
      await this.ensureTripId();
      console.log('Trip ID is available:', this.currentTripId);
      
      // Create the expense in the database
      console.log('Creating expense in database');
      this.createExpenseInDatabase();
    } catch (error) {
      console.error('Error ensuring trip ID:', error);
      this.showError('Could not create expense: ' + error.message);
    }
  }
  
  async createExpenseInDatabase() {
    try {
      console.log('createExpenseInDatabase called');
      console.log('Current allocations:', this.currentAllocations);
      console.log('Current receipt data:', this.currentReceiptData);
      console.log('Current payer:', this.currentPayer);
      console.log('Current trip ID:', this.currentTripId);
      
      // Check if we have a trip ID
      if (!this.currentTripId) {
        console.error('No trip ID available');
        this.showError('Could not create expense: No trip ID available');
        return;
      }
      
      // Calculate total amount from allocations
      const totalAmount = this.currentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      console.log('Total amount calculated:', totalAmount);
      
      // Prepare expense data
      const expenseData = {
        description: this.currentReceiptData.shopName ? `Receipt from ${this.currentReceiptData.shopName}` : 'Receipt Expense',
        amount: totalAmount,
        payer: this.currentPayer,
        date: this.currentReceiptData.date || new Date().toISOString().split('T')[0],
        category: 'Receipt', // Default category
        trip_id: this.currentTripId,
        participants: [], // Will be populated based on allocations
        shares: {} // Will be populated based on allocations
      };
      console.log('Prepared expense data:', expenseData);
      
      // Collect all unique participants from allocations
      const participantsSet = new Set();
      this.currentAllocations.forEach(allocation => {
        allocation.members.forEach(member => participantsSet.add(member));
      });
      
      expenseData.participants = Array.from(participantsSet);
      console.log('Participants:', expenseData.participants);
      
      // Calculate shares for each participant
      expenseData.participants.forEach(participant => {
        let share = 0;
        this.currentAllocations.forEach(allocation => {
          if (allocation.members.includes(participant)) {
            share += allocation.amount / allocation.members.length;
          }
        });
        expenseData.shares[participant] = share;
      });
      console.log('Shares:', expenseData.shares);
      
      // Create expense in database
      console.log('Sending request to /api/expenses');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      });
      console.log('Response received:', response);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Expense created:', result);
      
      // Show success message
      alert('Expense created successfully!');
      
      // Navigate to expenses list
      this.showTripSection('expenses-list');
      
      // Refresh all expense-related UI components
      if (typeof updateExpensesList === 'function') {
        updateExpensesList();
      }
      if (typeof updateExpensesTable === 'function') {
        updateExpensesTable();
      }
      if (typeof calculateBalances === 'function') {
        calculateBalances();
      }
      if (typeof calculateCashOutflows === 'function') {
        calculateCashOutflows();
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      this.showError('Failed to create expense: ' + error.message);
    }
  }
  
  // Ensure we have a trip ID, getting it from the URL if necessary
  async ensureTripId() {
    // If we already have a trip ID, we're good
    if (this.currentTripId) {
      return this.currentTripId;
    }
    
    // If we don't have a trip ID, try to get it from the URL
    const tripUrlMatch = window.location.pathname.match(new RegExp('/trip/([^/]+)'));
    if (tripUrlMatch && tripUrlMatch[1]) {
      const urlId = tripUrlMatch[1];
      console.log('Using URL ID to get database ID:', urlId);
      
      // Get the trip details to get the database ID
      const tripResponse = await fetch(`/api/trips/${urlId}`);
      if (!tripResponse.ok) {
        throw new Error(`HTTP ${tripResponse.status}: ${tripResponse.statusText}`);
      }
      
      const tripData = await tripResponse.json();
      if (tripData && tripData.id) {
        this.currentTripId = tripData.id;
        console.log('Got database ID from URL ID:', this.currentTripId);
        return this.currentTripId;
      } else {
        console.error('Could not get database ID from trip data:', tripData);
        throw new Error('Could not get database ID from trip data');
      }
    } else {
      console.error('Could not determine trip ID');
      throw new Error('Could not determine trip ID');
    }
  }
  
  async getTripMembers() {
    // If we already have members, return them
    if (this.tripMembers && this.tripMembers.length > 0) {
      console.log('Using cached trip members');
      return Promise.resolve(this.tripMembers);
    }
    
    // Use the database trip ID from window.currentTripId if available
    let tripId = window.currentTripId;
    
    // If we don't have the database trip ID, we need to get it first
    if (!tripId) {
      console.log('Database trip ID not found in window.currentTripId, trying to get it from URL ID');
      const tripUrlMatch = window.location.pathname.match(new RegExp('/trip/([^/]+)'));
      if (tripUrlMatch && tripUrlMatch[1]) {
        const urlId = tripUrlMatch[1];
        console.log('Using URL ID to get database ID:', urlId);
        
        // First get the trip details to get the database ID
        try {
          const tripResponse = await fetch(`/api/trips/${urlId}`);
          if (!tripResponse.ok) {
            throw new Error(`HTTP ${tripResponse.status}: ${tripResponse.statusText}`);
          }
          
          const tripData = await tripResponse.json();
          if (tripData && tripData.id) {
            tripId = tripData.id;
            console.log('Got database ID from URL ID:', tripId);
          } else {
            console.error('Could not get database ID from trip data:', tripData);
            throw new Error('Could not get database ID from trip data');
          }
        } catch (error) {
          console.error('Error fetching trip data:', error);
          throw new Error('Could not get trip information: ' + error.message);
        }
      }
    }
    
    if (!tripId) {
      console.error('No trip ID available');
      throw new Error('Trip ID not found');
    }
    
    // Now fetch the members using the database ID
    const apiEndpoint = `/api/trips/${tripId}/members`;
    console.log('Fetching trip members from:', apiEndpoint);
    
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const members = await response.json();
      console.log('Successfully fetched trip members:', members);
      this.tripMembers = members;
      return members;
    } catch (error) {
      console.error('Error fetching trip members:', error);
      // Try a different approach - get members from the global tripMembers array if available
      if (window.tripMembers && Array.isArray(window.tripMembers)) {
        console.log('Using trip members from global window.tripMembers');
        this.tripMembers = window.tripMembers;
        return window.tripMembers;
      }
      
      throw error;
    }
  }
  
  formatCurrency(amount, currency) {
    let code = 'USD';
    let symbol = '$';
    let position = 'before';

    if (currency) {
        if (typeof currency === 'string') {
            code = currency;
            symbol = this.getSymbolFromCode(code);
        } else if (typeof currency === 'object') {
            code = currency.code || 'USD';
            symbol = currency.symbol || this.getSymbolFromCode(code);
            position = currency.position || 'before';
        }
    }

    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toFixed(2);
    
    let formatted;
    // Add space if symbol is effectively a code (longer than 1 char)
    const needsSpace = symbol.length > 1;
    
    if (position === 'after') {
      formatted = `${absAmount} ${symbol}`;
    } else {
      formatted = `${symbol}${needsSpace ? ' ' : ''}${absAmount}`;
    }
    
    return isNegative ? `-${formatted}` : formatted;
  }
  
  getSymbolFromCode(code) {
      try {
          const format = new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
          const parts = format.formatToParts(0);
          const symbolPart = parts.find(part => part.type === 'currency');
          return symbolPart ? symbolPart.value : code;
      } catch (e) {
          return code;
      }
  }
  
  escapeHtml(text) {
    if (!text && text !== 0) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }
  
  showProcessingIndicator() {
    const progressElement = document.getElementById('upload-progress');
    if (progressElement) progressElement.classList.remove('hidden');
  }
  
  hideProcessingIndicator() {
    const progressElement = document.getElementById('upload-progress');
    if (progressElement) progressElement.classList.add('hidden');
  }
  
  showError(message) {
    const errorElement = document.getElementById('upload-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');
      errorElement.style.display = 'block';
      setTimeout(() => {
        errorElement.classList.add('hidden');
        errorElement.style.display = 'none';
      }, 5000);
    }
  }
  
  hideError() {
      const errorElement = document.getElementById('upload-error');
      if (errorElement) {
          errorElement.classList.add('hidden');
          errorElement.style.display = 'none';
      }
  }
  
  showTripSection(sectionName) {
    document.querySelectorAll('.trip-specific').forEach(el => {
      el.style.display = 'none';
    });
    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
      sectionElement.classList.remove('hidden');
      sectionElement.style.display = 'block';
    }
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-page="trip"]')) {
    if (!window.receiptUploader) {
        window.receiptUploader = new ReceiptUploader();
    }
    window.receiptUploader.init();
  }
});

// Observer to handle section visibility changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      initializeReceiptUploaderIfNeeded();
    }
  });
});

function initializeReceiptUploaderIfNeeded() {
  const receiptUploadSection = document.getElementById('receipt-upload-section');
  if (receiptUploadSection && receiptUploadSection.offsetParent !== null) {
    console.log('Receipt upload section visible');
    if (!window.receiptUploader) {
      window.receiptUploader = new ReceiptUploader();
    }
    // init() checks if it's already initialized internally
    window.receiptUploader.init();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const receiptUploadSection = document.getElementById('receipt-upload-section');
  if (receiptUploadSection) {
    observer.observe(receiptUploadSection, { 
      attributes: true, 
      attributeFilter: ['style']
    });
  }
});

document.addEventListener('click', (event) => {
  // Handle navigation buttons
  if (event.target.classList.contains('nav-btn') && event.target.dataset.section === 'receipt-upload') {
    setTimeout(() => {
      initializeReceiptUploaderIfNeeded();
    }, 100);
  }
});