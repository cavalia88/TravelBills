module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create receipt_images table
    await queryInterface.createTable('receipt_images', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      expense_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'expenses',
          key: 'id'
        }
      },
      original_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      display_path: {
        type: Sequelize.STRING(500)
      },
      thumbnail_path: {
        type: Sequelize.STRING(500)
      },
      file_size: {
        type: Sequelize.INTEGER
      },
      image_format: {
        type: Sequelize.STRING(10)
      },
      width: {
        type: Sequelize.INTEGER
      },
      height: {
        type: Sequelize.INTEGER
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
    
    // Create receipt_details table
    await queryInterface.createTable('receipt_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      expense_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'expenses',
          key: 'id'
        }
      },
      shop_name: {
        type: Sequelize.STRING(255)
      },
      address: {
        type: Sequelize.TEXT
      },
      receipt_time: {
        type: Sequelize.TIME
      },
      currency_code: {
        type: Sequelize.STRING(3)
      },
      currency_symbol: {
        type: Sequelize.STRING(10)
      },
      currency_position: {
        type: Sequelize.ENUM('before', 'after'),
        defaultValue: 'before'
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2)
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
    
    // Add columns to expenses table
    await queryInterface.addColumn('expenses', 'is_detailed_receipt', {
      type: Sequelize.TINYINT(1),
      defaultValue: 0,
      allowNull: false
    });
    
    await queryInterface.addColumn('expenses', 'receipt_detail_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
      references: {
        model: 'receipt_details',
        key: 'id'
      }
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    // Reverse migration
    await queryInterface.removeColumn('expenses', 'receipt_detail_id');
    await queryInterface.removeColumn('expenses', 'is_detailed_receipt');
    await queryInterface.dropTable('receipt_details');
    await queryInterface.dropTable('receipt_images');
  }
};