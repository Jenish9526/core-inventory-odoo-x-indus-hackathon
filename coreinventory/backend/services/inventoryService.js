const { Stock, StockLedger } = require('../models');

const getOrCreateStock = async (productId, warehouseId) => {
  let stock = await Stock.findOne({ product: productId, warehouse: warehouseId });
  if (!stock) {
    stock = await Stock.create({ product: productId, warehouse: warehouseId, quantity: 0 });
  }
  return stock;
};

const addStock = async ({ productId, warehouseId, quantity, type, referenceId, referenceRef, note, userId }) => {
  const stock = await getOrCreateStock(productId, warehouseId);
  stock.quantity += Number(quantity);
  await stock.save();

  await StockLedger.create({
    product: productId,
    warehouse: warehouseId,
    type,
    quantity: Number(quantity),
    balanceAfter: stock.quantity,
    referenceId,
    referenceRef,
    note,
    createdBy: userId,
  });

  return stock;
};

const deductStock = async ({ productId, warehouseId, quantity, type, referenceId, referenceRef, note, userId }) => {
  const stock = await getOrCreateStock(productId, warehouseId);

  if (stock.quantity < Number(quantity)) {
    throw new Error(`Insufficient stock. Available: ${stock.quantity}, Requested: ${quantity}`);
  }

  stock.quantity -= Number(quantity);
  await stock.save();

  await StockLedger.create({
    product: productId,
    warehouse: warehouseId,
    type,
    quantity: -Number(quantity),
    balanceAfter: stock.quantity,
    referenceId,
    referenceRef,
    note,
    createdBy: userId,
  });

  return stock;
};

const getLowStockAlerts = async () => {
  return await Stock.aggregate([
    { $group: { _id: '$product', totalQty: { $sum: '$quantity' } } },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $match: { $expr: { $lte: ['$totalQty', '$product.reorderLevel'] }, 'product.isActive': true } },
    { $project: { product: 1, totalQty: 1 } },
  ]);
};

module.exports = { addStock, deductStock, getOrCreateStock, getLowStockAlerts };
