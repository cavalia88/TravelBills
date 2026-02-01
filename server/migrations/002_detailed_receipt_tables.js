module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create receipt_items table
    await queryInterface.createTable('receipt_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      receipt_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'receipt_details',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'categories',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
    
    // Create receipt_item_allocations table
    await queryInterface.createTable('receipt_item_allocations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      receipt_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'receipt_items',
          key: 'id'
        }
      },
      member_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      allocated_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
    
    // Create receipt_discounts table
    await queryInterface.createTable('receipt_discounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      receipt_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'receipt_details',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
    
    // Create receipt_service_charges table
    await queryInterface.createTable('receipt_service_charges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      receipt_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'receipt_details',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
    
    // Create receipt_taxes table
    await queryInterface.createTable('receipt_taxes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      receipt_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'receipt_details',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
    
    // Add indexes for better performance
    await queryInterface.addIndex('receipt_images', ['expense_id']);
    await queryInterface.addIndex('receipt_details', ['expense_id']);
    await queryInterface.addIndex('receipt_items', ['receipt_detail_id']);
    await queryInterface.addIndex('receipt_items', ['category_id']);
    await queryInterface.addIndex('receipt_item_allocations', ['receipt_item_id']);
    await queryInterface.addIndex('receipt_discounts', ['receipt_detail_id']);
    await queryInterface.addIndex('receipt_service_charges', ['receipt_detail_id']);
    await queryInterface.addIndex('receipt_taxes', ['receipt_detail_id']);
  },
  
  down: async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('receipt_taxes', ['receipt_detail_id']);
    await queryInterface.removeIndex('receipt_service_charges', ['receipt_detail_id']);
    await queryInterface.removeIndex('receipt_discounts', ['receipt_detail_id']);
    await queryInterface.removeIndex('receipt_item_allocations', ['receipt_item_id']);
    await queryInterface.removeIndex('receipt_items', ['category_id']);
    await queryInterface.removeIndex('receipt_items', ['receipt_detail_id']);
    await queryInterface.removeIndex('receipt_details', ['expense_id']);
    await queryInterface.removeIndex('receipt_images', ['expense_id']);
    
    // Drop tables in reverse order
    await queryInterface.dropTable('receipt_taxes');
    await queryInterface.dropTable('receipt_service_charges');
    await queryInterface.dropTable('receipt_discounts');
    await queryInterface.dropTable('receipt_item_allocations');
    await queryInterface.dropTable('receipt_items');
  }
};