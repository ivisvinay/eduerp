import React, { useState, useEffect } from 'react';
import { School } from 'lucide-react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import TeacherManagement from './components/TeacherManagement';
import FinanceManagement from './components/FinanceManagement';
import InventoryManagement from './components/InventoryManagement';
import Analytics from './components/Analytics';
import ChatAssistant from './components/ChatAssistant';
import schoolData from './data/school-data.json';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [erpData, setErpData] = useState(schoolData);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Function to update ERP data
  const updateErpData = (newData) => {
    setErpData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  // Function to handle tab changes from AI assistant
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Render active tab content
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={erpData} />;
      case 'students':
        return <StudentManagement data={erpData} updateData={updateErpData} />;
      case 'teachers':
        return <TeacherManagement data={erpData} updateData={updateErpData} />;
      case 'finance':
        return <FinanceManagement data={erpData} updateData={updateErpData} />;
      case 'inventory':
        return <InventoryManagement data={erpData} updateData={updateErpData} />;
      case 'analytics':
        return <Analytics data={erpData} />;
      default:
        return <Dashboard data={erpData} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content Area */}
        <div className="mt-6">
          {renderActiveTab()}
        </div>
      </div>

      {/* Floating Chat Assistant */}
      <ChatAssistant 
        data={erpData} 
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        onTabChange={handleTabChange}
      />
    </div>
  );
};

export default App;