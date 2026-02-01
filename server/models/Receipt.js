class Receipt {
  constructor(db) {
    this.db = db;
  }
  
  async saveImage(expenseId, imagePaths) {
    try {
      const query = `
        INSERT INTO receipt_images 
        (expense_id, original_path, display_path, thumbnail_path, file_size, image_format, width, height) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        original_path = VALUES(original_path),
        display_path = VALUES(display_path),
        thumbnail_path = VALUES(thumbnail_path),
        file_size = VALUES(file_size),
        image_format = VALUES(image_format),
        width = VALUES(width),
        height = VALUES(height),
        updated_at = CURRENT_TIMESTAMP
      `;
      
      const result = await this.db.query(query, [
        expenseId,
        imagePaths.original_path,
        imagePaths.display_path,
        imagePaths.thumbnail_path,
        imagePaths.file_size,
        imagePaths.image_format,
        imagePaths.width,
        imagePaths.height
      ]);
      
      return {
        id: result.insertId || expenseId,
        ...imagePaths
      };
    } catch (error) {
      console.error('Error saving receipt image:', error);
      throw error;
    }
  }
  
  async getImageByExpenseId(expenseId) {
    try {
      const query = 'SELECT * FROM receipt_images WHERE expense_id = ?';
      const results = await this.db.query(query, [expenseId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error retrieving receipt image:', error);
      throw error;
    }
  }
  
  async saveReceiptDetails(expenseId, receiptData) {
    try {
      // Start transaction
      await this.db.query('START TRANSACTION');
      
      // Save receipt details
      const detailsQuery = `
        INSERT INTO receipt_details 
        (expense_id, shop_name, address, receipt_time, currency_code, currency_symbol, currency_position, total_amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        shop_name = VALUES(shop_name),
        address = VALUES(address),
        receipt_time = VALUES(receipt_time),
        currency_code = VALUES(currency_code),
        currency_symbol = VALUES(currency_symbol),
        currency_position = VALUES(currency_position),
        total_amount = VALUES(total_amount),
        updated_at = CURRENT_TIMESTAMP
      `;
      
      const detailsResult = await this.db.query(detailsQuery, [
        expenseId,
        receiptData.shopName || null,
        receiptData.address || null,
        receiptData.time || null,
        receiptData.currency?.code || null,
        receiptData.currency?.symbol || null,
        receiptData.currency?.position || 'before',
        receiptData.total || 0
      ]);
      
      const receiptDetailId = detailsResult.insertId || 
        (await this.db.query('SELECT id FROM receipt_details WHERE expense_id = ?', [expenseId]))[0].id;
      
      // Update expense to mark as detailed receipt
      await this.db.query(
        'UPDATE expenses SET is_detailed_receipt = 1, receipt_detail_id = ? WHERE id = ?', 
        [receiptDetailId, expenseId]
      );
      
      // Save items
      if (receiptData.items && receiptData.items.length > 0) {
        // Delete existing items for this receipt
        await this.db.query('DELETE FROM receipt_items WHERE receipt_detail_id = ?', [receiptDetailId]);
        
        // Insert new items
        for (const item of receiptData.items) {
          await this.db.query(
            'INSERT INTO receipt_items (receipt_detail_id, name, amount, category_id) VALUES (?, ?, ?, ?)',
            [receiptDetailId, item.name, item.amount, item.categoryId || null]
          );
        }
      }
      
      // Save discounts
      if (receiptData.discounts && receiptData.discounts.length > 0) {
        // Delete existing discounts for this receipt
        await this.db.query('DELETE FROM receipt_discounts WHERE receipt_detail_id = ?', [receiptDetailId]);
        
        // Insert new discounts
        for (const discount of receiptData.discounts) {
          await this.db.query(
            'INSERT INTO receipt_discounts (receipt_detail_id, name, amount) VALUES (?, ?, ?)',
            [receiptDetailId, discount.name, discount.amount]
          );
        }
      }
      
      // Save service charges
      if (receiptData.serviceCharges && receiptData.serviceCharges.length > 0) {
        // Delete existing service charges for this receipt
        await this.db.query('DELETE FROM receipt_service_charges WHERE receipt_detail_id = ?', [receiptDetailId]);
        
        // Insert new service charges
        for (const charge of receiptData.serviceCharges) {
          await this.db.query(
            'INSERT INTO receipt_service_charges (receipt_detail_id, name, amount) VALUES (?, ?, ?)',
            [receiptDetailId, charge.name, charge.amount]
          );
        }
      }
      
      // Save taxes
      if (receiptData.taxes && receiptData.taxes.length > 0) {
        // Delete existing taxes for this receipt
        await this.db.query('DELETE FROM receipt_taxes WHERE receipt_detail_id = ?', [receiptDetailId]);
        
        // Insert new taxes
        for (const tax of receiptData.taxes) {
          await this.db.query(
            'INSERT INTO receipt_taxes (receipt_detail_id, name, amount) VALUES (?, ?, ?)',
            [receiptDetailId, tax.name, tax.amount]
          );
        }
      }
      
      // Commit transaction
      await this.db.query('COMMIT');
      
      return receiptDetailId;
    } catch (error) {
      // Rollback transaction
      await this.db.query('ROLLBACK');
      console.error('Error saving receipt details:', error);
      throw error;
    }
  }
  
  async getReceiptDetailsByExpenseId(expenseId) {
    try {
      // Get receipt details
      const detailsQuery = 'SELECT * FROM receipt_details WHERE expense_id = ?';
      const detailsResult = await this.db.query(detailsQuery, [expenseId]);
      
      if (detailsResult.length === 0) {
        return null;
      }
      
      const receiptDetail = detailsResult[0];
      const receiptDetailId = receiptDetail.id;
      
      // Get items
      const itemsQuery = 'SELECT * FROM receipt_items WHERE receipt_detail_id = ?';
      const itemsResult = await this.db.query(itemsQuery, [receiptDetailId]);
      
      // Get discounts
      const discountsQuery = 'SELECT * FROM receipt_discounts WHERE receipt_detail_id = ?';
      const discountsResult = await this.db.query(discountsQuery, [receiptDetailId]);
      
      // Get service charges
      const serviceChargesQuery = 'SELECT * FROM receipt_service_charges WHERE receipt_detail_id = ?';
      const serviceChargesResult = await this.db.query(serviceChargesQuery, [receiptDetailId]);
      
      // Get taxes
      const taxesQuery = 'SELECT * FROM receipt_taxes WHERE receipt_detail_id = ?';
      const taxesResult = await this.db.query(taxesQuery, [receiptDetailId]);
      
      return {
        id: receiptDetail.id,
        expenseId: receiptDetail.expense_id,
        shopName: receiptDetail.shop_name,
        address: receiptDetail.address,
        receiptTime: receiptDetail.receipt_time,
        currency: {
          code: receiptDetail.currency_code,
          symbol: receiptDetail.currency_symbol,
          position: receiptDetail.currency_position
        },
        items: itemsResult,
        discounts: discountsResult,
        serviceCharges: serviceChargesResult,
        taxes: taxesResult,
        totalAmount: receiptDetail.total_amount
      };
    } catch (error) {
      console.error('Error retrieving receipt details:', error);
      throw error;
    }
  }
  
  async saveItemAllocations(expenseId, allocations) {
    try {
      // Start transaction
      await this.db.query('START TRANSACTION');
      
      // Get receipt detail ID
      const receiptDetailsQuery = 'SELECT id FROM receipt_details WHERE expense_id = ?';
      const receiptDetailsResult = await this.db.query(receiptDetailsQuery, [expenseId]);
      
      if (receiptDetailsResult.length === 0) {
        throw new Error('Receipt details not found for this expense');
      }
      
      const receiptDetailId = receiptDetailsResult[0].id;
      
      // Get all receipt items
      const itemsQuery = 'SELECT id, name FROM receipt_items WHERE receipt_detail_id = ?';
      const itemsResult = await this.db.query(itemsQuery, [receiptDetailId]);
      
      // Create a map of item names to IDs
      const itemMap = {};
      itemsResult.forEach(item => {
        itemMap[item.name] = item.id;
      });
      
      // Delete existing allocations for this receipt
      const deleteQuery = `
        DELETE ria FROM receipt_item_allocations ria
        JOIN receipt_items ri ON ria.receipt_item_id = ri.id
        WHERE ri.receipt_detail_id = ?
      `;
      await this.db.query(deleteQuery, [receiptDetailId]);
      
      // Insert new allocations
      for (const allocation of allocations) {
        const itemId = itemMap[allocation.itemName];
        if (itemId) {
          for (const member of allocation.members) {
            const amount = allocation.amount / allocation.members.length;
            await this.db.query(
              'INSERT INTO receipt_item_allocations (receipt_item_id, member_name, allocated_amount) VALUES (?, ?, ?)',
              [itemId, member, amount]
            );
          }
        }
      }
      
      // Commit transaction
      await this.db.query('COMMIT');
    } catch (error) {
      // Rollback transaction
      await this.db.query('ROLLBACK');
      console.error('Error saving item allocations:', error);
      throw error;
    }
  }
  
  async getItemAllocationsByExpenseId(expenseId) {
    try {
      const query = `
        SELECT 
          ri.name as item_name,
          ria.member_name,
          ria.allocated_amount
        FROM receipt_item_allocations ria
        JOIN receipt_items ri ON ria.receipt_item_id = ri.id
        JOIN receipt_details rd ON ri.receipt_detail_id = rd.id
        WHERE rd.expense_id = ?
        ORDER BY ri.name, ria.member_name
      `;
      
      const result = await this.db.query(query, [expenseId]);
      
      // Group by item name
      const allocations = {};
      result.forEach(row => {
        if (!allocations[row.item_name]) {
          allocations[row.item_name] = [];
        }
        allocations[row.item_name].push({
          member: row.member_name,
          amount: row.allocated_amount
        });
      });
      
      return allocations;
    } catch (error) {
      console.error('Error retrieving item allocations:', error);
      throw error;
    }
  }
}

module.exports = Receipt;