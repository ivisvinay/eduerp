import React from 'react';
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  DollarSign, 
  BookOpen, 
  TrendingUp 
} from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'students', name: 'Students', icon: Users },
    { id: 'teachers', name: 'Teachers', icon: GraduationCap },
    { id: 'finance', name: 'Finance', icon: DollarSign },
    { id: 'inventory', name: 'Inventory', icon: BookOpen },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Navigation;