import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Trash2, 
  Filter,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  BarChart3,
  Eye,
  X
} from 'lucide-react';

const InventoryManagement = ({ data, updateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter inventory items
  const filteredItems = data.inventory.filter(item => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'low' && item.quantity < item.minStock) ||
                         (filterStatus === 'normal' && item.quantity >= item.minStock);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories
  const categories = [...new Set(data.inventory.map(item => item.category))];

  // Calculate metrics
  const totalItems = data.inventory.length;
  const totalValue = data.inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = data.inventory.filter(item => item.quantity < item.minStock);
  const criticalItems = data.inventory.filter(item => item.quantity === 0);

  // Get stock status
  const getStockStatus = (item) => {
    if (item.quantity === 0) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100' };
    if (item.quantity < item.minStock) return { status: 'low', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (item.quantity > item.maxStock) return { status: 'excess', color: 'text-purple-600', bg: 'bg-purple-100' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-100' };
  };

  // Add Item Form Component
  const AddItemForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Add New Item</h3>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="₹0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Supplier name"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // Item Detail Modal
  const ItemDetailModal = ({ item, onClose }) => {
    if (!item) return null;
    const stockStatus = getStockStatus(item);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{item.item}</h2>
                <p className="text-gray-600">{item.category} • {item.id}</p>
              </div>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Stock Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span className={`font-medium ${stockStatus.color}`}>{item.quantity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Stock:</span>
                      <span>{item.minStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Stock:</span>
                      <span>{item.maxStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${stockStatus.bg} ${stockStatus.color}`}>
                        {stockStatus.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Financial Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Unit Price:</span>
                      <span className="font-medium">₹{item.unitPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-medium">₹{item.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span>{new Date(item.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Supplier Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Supplier:</strong> {item.supplier}</div>
                    <div><strong>Contact:</strong> {item.supplierContact}</div>
                    <div><strong>Location:</strong> {item.location}</div>
                    <div><strong>Condition:</strong> {item.condition}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Actions</h3>
                  <div className="space-y-2">
                    <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Item
                    </button>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Reorder
                    </button>
                    <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Inventory Management</h2>
            <p className="text-gray-600">Track stock levels, suppliers, and inventory value</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                <div className="text-sm text-blue-600">Total Items</div>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">₹{(totalValue / 1000).toFixed(0)}K</div>
                <div className="text-sm text-green-600">Total Value</div>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
                <div className="text-sm text-orange-600">Low Stock</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{criticalItems.length}</div>
                <div className="text-sm text-red-600">Out of Stock</div>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items by name or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="low">Low Stock</option>
            <option value="normal">Normal Stock</option>
          </select>
        </div>

        {/* Critical Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Items Need Immediate Attention</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockItems.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.item}</div>
                    <div className="text-sm text-gray-600">{item.supplier}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-600 font-bold">{item.quantity} units</div>
                    <div className="text-sm text-gray-500">Min: {item.minStock}</div>
                  </div>
                </div>
              ))}
            </div>
            {lowStockItems.length > 4 && (
              <div className="mt-3 text-sm text-red-700">
                And {lowStockItems.length - 4} more items need attention.
              </div>
            )}
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map(item => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.item}</div>
                            <div className="text-sm text-gray-500">{item.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.quantity} units</div>
                          <div className="text-xs text-gray-500">Min: {item.minStock}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
                          {stockStatus.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">₹{item.totalValue.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">@₹{item.unitPrice}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.supplier}</div>
                          <div className="text-xs text-gray-500">{item.location}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900 inline-flex items-center gap-1">
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        {item.quantity < item.minStock && (
                          <button className="text-orange-600 hover:text-orange-900 inline-flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4" />
                            Reorder
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Summary */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Inventory by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map(category => {
              const categoryItems = data.inventory.filter(item => item.category === category);
              const categoryValue = categoryItems.reduce((sum, item) => sum + item.totalValue, 0);
              const categoryLowStock = categoryItems.filter(item => item.quantity < item.minStock).length;
              
              return (
                <div key={category} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{category}</h4>
                    {categoryLowStock > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {categoryLowStock} low
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      {categoryItems.length} items
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ₹{categoryValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modals */}
        {showAddForm && <AddItemForm />}
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;