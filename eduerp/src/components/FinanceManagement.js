import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3,
  Calendar,
  Download,
  Filter,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const FinanceManagement = ({ data, updateData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedView, setSelectedView] = useState('overview');

  const financeData = data.finance;

  // Calculate additional metrics
  const profitMargin = ((financeData.netProfit / financeData.totalRevenue) * 100).toFixed(1);
  const collectionRate = ((data.students.reduce((sum, s) => sum + s.fees.paid, 0) / data.students.reduce((sum, s) => sum + s.fees.annual, 0)) * 100).toFixed(1);
  const monthlyAvgRevenue = financeData.monthlyBreakdown.reduce((sum, month) => sum + month.income, 0) / financeData.monthlyBreakdown.length;
  const monthlyAvgExpense = financeData.monthlyBreakdown.reduce((sum, month) => sum + month.expense, 0) / financeData.monthlyBreakdown.length;

  // Get trend indicators
  const recentMonths = financeData.monthlyBreakdown.slice(-3);
  const revenueTrend = recentMonths[2].income > recentMonths[0].income ? 'up' : 'down';
  const expenseTrend = recentMonths[2].expense > recentMonths[0].expense ? 'up' : 'down';

  // Revenue Overview Component
  const RevenueOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Revenue Summary</h3>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Revenue</span>
            <span className="text-2xl font-bold text-green-600">
              ₹{financeData.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monthly Average</span>
            <span className="font-semibold">
              ₹{monthlyAvgRevenue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Growth Trend</span>
            <span className={`flex items-center gap-1 ${revenueTrend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {revenueTrend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {revenueTrend === 'up' ? 'Increasing' : 'Decreasing'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Expense Summary</h3>
          <TrendingDown className="w-5 h-5 text-red-500" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Expenses</span>
            <span className="text-2xl font-bold text-red-600">
              ₹{financeData.totalExpenses.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monthly Average</span>
            <span className="font-semibold">
              ₹{monthlyAvgExpense.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Expense Trend</span>
            <span className={`flex items-center gap-1 ${expenseTrend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
              {expenseTrend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {expenseTrend === 'up' ? 'Increasing' : 'Decreasing'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Profit Analysis</h3>
          <DollarSign className="w-5 h-5 text-purple-500" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Net Profit</span>
            <span className="text-2xl font-bold text-purple-600">
              ₹{financeData.netProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Profit Margin</span>
            <span className="font-semibold text-purple-600">
              {profitMargin}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Financial Health</span>
            <span className={`flex items-center gap-1 ${parseFloat(profitMargin) > 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {parseFloat(profitMargin) > 15 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {parseFloat(profitMargin) > 15 ? 'Excellent' : 'Good'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Fee Collection Component
  const FeeCollection = () => {
    const totalFees = data.students.reduce((sum, s) => sum + s.fees.annual, 0);
    const collectedFees = data.students.reduce((sum, s) => sum + s.fees.paid, 0);
    const pendingFees = data.students.reduce((sum, s) => sum + s.fees.pending, 0);
    const studentsWithPending = data.students.filter(s => s.fees.pending > 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">₹{totalFees.toLocaleString()}</div>
                <div className="text-sm text-blue-600">Total Fees</div>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">₹{collectedFees.toLocaleString()}</div>
                <div className="text-sm text-green-600">Collected</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">₹{pendingFees.toLocaleString()}</div>
                <div className="text-sm text-red-600">Pending</div>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{collectionRate}%</div>
                <div className="text-sm text-purple-600">Collection Rate</div>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Fee Collection Status</h3>
          <div className="space-y-3">
            {studentsWithPending.map(student => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-medium text-sm">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-600">Grade {student.grade}-{student.section}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">₹{student.fees.pending.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Due: {new Date(student.fees.dueDate).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Expense Breakdown Component
  const ExpenseBreakdown = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {financeData.expenseCategories.map(category => (
          <div key={category.category} className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{category.category}</h3>
              <span className="text-sm text-gray-500">{category.percentage}%</span>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">
                ₹{category.amount.toLocaleString()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">
                {category.percentage}% of total expenses
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Monthly Expense Trend</h3>
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
          {financeData.monthlyBreakdown.map((month, index) => (
            <div key={index} className="text-center">
              <div className="text-sm text-gray-600 mb-2">{month.month}</div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-green-600">
                  ₹{(month.income / 1000).toFixed(0)}K
                </div>
                <div className="text-lg font-bold text-red-600">
                  ₹{(month.expense / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-gray-500">
                  Net: ₹{((month.income - month.expense) / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    month.income > month.expense ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((month.income / Math.max(...financeData.monthlyBreakdown.map(m => m.income))) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Revenue Streams Component
  const RevenueStreams = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {financeData.revenueStreams.map(stream => (
          <div key={stream.source} className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{stream.source}</h3>
              <span className="text-sm text-gray-500">{stream.percentage}%</span>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                ₹{stream.amount.toLocaleString()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stream.percentage}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600">
                {stream.percentage}% of total revenue
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Budget Allocation</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(financeData.budgetAllocations).map(([category, percentage]) => (
            <div key={category} className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{percentage}%</div>
              <div className="text-sm text-gray-600 capitalize">{category}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (selectedView) {
      case 'overview':
        return <RevenueOverview />;
      case 'fees':
        return <FeeCollection />;
      case 'expenses':
        return <ExpenseBreakdown />;
      case 'revenue':
        return <RevenueStreams />;
      default:
        return <RevenueOverview />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Financial Management</h2>
            <p className="text-gray-600">Monitor revenue, expenses, and financial health</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">₹{(financeData.totalRevenue / 1000000).toFixed(1)}M</div>
                <div className="text-sm opacity-90">Total Revenue</div>
              </div>
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">₹{(financeData.totalExpenses / 1000000).toFixed(1)}M</div>
                <div className="text-sm opacity-90">Total Expenses</div>
              </div>
              <TrendingDown className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">₹{(financeData.netProfit / 1000000).toFixed(1)}M</div>
                <div className="text-sm opacity-90">Net Profit</div>
              </div>
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{profitMargin}%</div>
                <div className="text-sm opacity-90">Profit Margin</div>
              </div>
              <BarChart3 className="w-8 h-8 opacity-80" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'fees', name: 'Fee Collection', icon: CreditCard },
              { id: 'expenses', name: 'Expenses', icon: Receipt },
              { id: 'revenue', name: 'Revenue Streams', icon: Wallet }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id)}
                className={`${
                  selectedView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};

export default FinanceManagement;