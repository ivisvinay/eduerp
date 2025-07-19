import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  Brain, 
  X, 
  Minimize2,
  Maximize2,
  Volume2,
  Square,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ChatAssistant = ({ data, isOpen, setIsOpen, onTabChange }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Assistant for Modern International School ERP. I can help you with student records, teacher management, finances, inventory, and analytics. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [typingIndicator, setTypingIndicator] = useState('');
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setCurrentTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          setInputMessage(finalTranscript.trim());
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setCurrentTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  // Process AI queries
  const processAgenticQuery = async (query) => {
    setIsProcessing(true);
    setTypingIndicator('AI is thinking...');
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerQuery = query.toLowerCase();
    let response = '';
    let action = null;
    
    try {
      // Student-related queries
      if (lowerQuery.includes('student') || lowerQuery.includes('aarav') || lowerQuery.includes('priya') || lowerQuery.includes('rohan')) {
        if (lowerQuery.includes('fee') || lowerQuery.includes('payment')) {
          const pendingStudents = data.students.filter(s => s.fees.pending > 0);
          response = `📊 **Fee Status Analysis:**\n\n${pendingStudents.map(s => 
            `• **${s.name}** (${s.rollNumber}): ₹${s.fees.pending.toLocaleString()} pending`
          ).join('\n')}\n\n**Total Pending:** ₹${pendingStudents.reduce((sum, s) => sum + s.fees.pending, 0).toLocaleString()}\n\n**Recommendation:** Send payment reminders to parents and offer installment options if needed.`;
          action = { type: 'highlight', tab: 'students', filter: 'pending_fees' };
        } else if (lowerQuery.includes('grade') || lowerQuery.includes('marks') || lowerQuery.includes('performance')) {
          const topPerformers = data.students.map(s => ({
            name: s.name,
            average: Object.values(s.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(s.grades).length
          })).sort((a, b) => b.average - a.average);
          
          response = `🎓 **Academic Performance Analysis:**\n\n${topPerformers.map((s, i) => 
            `${i + 1}. **${s.name}**: ${s.average.toFixed(1)}% average ${i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}`
          ).join('\n')}\n\n**Insights:**\n• Top performer: ${topPerformers[0].name} (${topPerformers[0].average.toFixed(1)}%)\n• Class average: ${(topPerformers.reduce((sum, s) => sum + s.average, 0) / topPerformers.length).toFixed(1)}%\n• Students above 85%: ${topPerformers.filter(s => s.average >= 85).length}`;
          action = { type: 'highlight', tab: 'students', filter: 'performance' };
        } else if (lowerQuery.includes('attendance')) {
          const attendanceData = data.students.map(s => ({
            name: s.name,
            percentage: s.attendance.percentage
          })).sort((a, b) => a.percentage - b.percentage);
          
          response = `📅 **Attendance Analysis:**\n\n${attendanceData.map(s => 
            `• **${s.name}**: ${s.percentage}% attendance ${s.percentage >= 95 ? '✅' : s.percentage >= 90 ? '⚠️' : '🚨'}`
          ).join('\n')}\n\n**Alerts:**\n• Below 95%: ${attendanceData.filter(s => s.percentage < 95).length} students\n• Below 90%: ${attendanceData.filter(s => s.percentage < 90).length} students\n\n**Action Required:** Contact parents of students with <90% attendance.`;
          action = { type: 'highlight', tab: 'students', filter: 'attendance' };
        } else if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
          const topStudent = data.students.reduce((best, student) => {
            const studentAvg = Object.values(student.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(student.grades).length;
            const bestAvg = Object.values(best.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(best.grades).length;
            return studentAvg > bestAvg ? student : best;
          });
          
          response = `🌟 **Top Student Profile:**\n\n**${topStudent.name}** (${topStudent.rollNumber})\n• Grade: ${topStudent.grade}-${topStudent.section}\n• Academic Average: ${(Object.values(topStudent.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(topStudent.grades).length).toFixed(1)}%\n• Attendance: ${topStudent.attendance.percentage}%\n• Behavior: ${topStudent.behavior}\n\n**Achievements:**\n${topStudent.achievements.map(a => `• ${a}`).join('\n')}\n\n**Extracurricular:**\n${topStudent.extracurricular.map(e => `• ${e}`).join('\n')}`;
          action = { type: 'highlight', tab: 'students' };
        } else {
          response = `👥 **Student Overview:**\n\n**Total Students:** ${data.students.length}\n**Grade Distribution:** ${[...new Set(data.students.map(s => s.grade))].sort().join(', ')}\n\n**Quick Stats:**\n• Average Attendance: ${(data.students.reduce((sum, s) => sum + s.attendance.percentage, 0) / data.students.length).toFixed(1)}%\n• Students with Excellent Behavior: ${data.students.filter(s => s.behavior === 'Excellent' || s.behavior === 'Outstanding').length}\n• Pending Fees: ${data.students.filter(s => s.fees.pending > 0).length} students\n\n**What would you like to know more about?**\n• Academic performance\n• Attendance patterns\n• Fee collection status\n• Individual student details`;
        }
      }
      
      // Teacher-related queries
      else if (lowerQuery.includes('teacher') || lowerQuery.includes('staff') || lowerQuery.includes('sunita') || lowerQuery.includes('amit')) {
        if (lowerQuery.includes('salary') || lowerQuery.includes('payment')) {
          const totalSalary = data.teachers.reduce((sum, t) => sum + t.salary, 0);
          response = `💰 **Teacher Salary Analysis:**\n\n${data.teachers.map(t => 
            `• **${t.name}** (${t.subject}): ₹${t.salary.toLocaleString()}/month`
          ).join('\n')}\n\n**Summary:**\n• Total Monthly Salary: ₹${totalSalary.toLocaleString()}\n• Annual Salary Budget: ₹${(totalSalary * 12).toLocaleString()}\n• Average Salary: ₹${(totalSalary / data.teachers.length).toLocaleString()}\n\n**Salary Range:** ₹${Math.min(...data.teachers.map(t => t.salary)).toLocaleString()} - ₹${Math.max(...data.teachers.map(t => t.salary)).toLocaleString()}`;
        } else if (lowerQuery.includes('performance') || lowerQuery.includes('rating')) {
          response = `⭐ **Teacher Performance Overview:**\n\n${data.teachers.map(t => 
            `• **${t.name}** (${t.subject}): ${t.performance} ${t.performance === 'Outstanding' ? '🌟' : t.performance === 'Excellent' ? '⭐' : '✅'}\n  Experience: ${t.experience} years | Classes: ${t.classes.join(', ')}`
          ).join('\n')}\n\n**Performance Distribution:**\n• Outstanding: ${data.teachers.filter(t => t.performance === 'Outstanding').length}\n• Excellent: ${data.teachers.filter(t => t.performance === 'Excellent').length}\n• Very Good: ${data.teachers.filter(t => t.performance === 'Very Good').length}\n\n**Average Experience:** ${(data.teachers.reduce((sum, t) => sum + t.experience, 0) / data.teachers.length).toFixed(1)} years`;
        } else {
          response = `👨‍🏫 **Teacher Overview:**\n\n**Total Teachers:** ${data.teachers.length}\n**Subjects Covered:** ${[...new Set(data.teachers.map(t => t.subject))].join(', ')}\n\n**Experience Distribution:**\n• 10+ years: ${data.teachers.filter(t => t.experience >= 10).length}\n• 5-9 years: ${data.teachers.filter(t => t.experience >= 5 && t.experience < 10).length}\n• <5 years: ${data.teachers.filter(t => t.experience < 5).length}\n\n**Performance Summary:**\n• All teachers performing well\n• Strong subject expertise\n• Good class distribution`;
        }
        action = { type: 'highlight', tab: 'teachers' };
      }
      
      // Finance-related queries
      else if (lowerQuery.includes('finance') || lowerQuery.includes('money') || lowerQuery.includes('revenue') || lowerQuery.includes('profit')) {
        response = `💳 **Financial Dashboard:**\n\n**Revenue & Profitability:**\n• Total Revenue: ₹${data.finance.totalRevenue.toLocaleString()}\n• Total Expenses: ₹${data.finance.totalExpenses.toLocaleString()}\n• Net Profit: ₹${data.finance.netProfit.toLocaleString()}\n• Profit Margin: ${((data.finance.netProfit / data.finance.totalRevenue) * 100).toFixed(1)}%\n\n**Outstanding Collections:**\n• Pending Fees: ₹${data.finance.pendingFees.toLocaleString()}\n• Collection Rate: ${(((data.students.reduce((sum, s) => sum + s.fees.paid, 0)) / (data.students.reduce((sum, s) => sum + s.fees.annual, 0))) * 100).toFixed(1)}%\n\n**Major Expenses:**\n• Salaries: ₹${data.finance.salaryExpenses.toLocaleString()} (${((data.finance.salaryExpenses / data.finance.totalExpenses) * 100).toFixed(1)}%)\n• Infrastructure: ₹${data.finance.infrastructureExpenses.toLocaleString()}\n• Operations: ₹${data.finance.operationalExpenses.toLocaleString()}\n\n**Financial Health: ${data.finance.netProfit > 0 ? 'Strong 💚' : 'Needs Attention 🟡'}**`;
        action = { type: 'highlight', tab: 'finance' };
      }
      
      // Inventory-related queries
      else if (lowerQuery.includes('inventory') || lowerQuery.includes('stock') || lowerQuery.includes('supplies')) {
        const lowStock = data.inventory.filter(item => item.quantity < item.minStock);
        response = `📦 **Inventory Status Report:**\n\n**Current Status:**\n• Total Items: ${data.inventory.length}\n• Low Stock Alerts: ${lowStock.length} items\n• Total Value: ₹${data.inventory.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}\n\n${lowStock.length > 0 ? `**🚨 Items Need Immediate Reordering:**\n${lowStock.map(item => 
          `• **${item.item}**: ${item.quantity} units (Min: ${item.minStock})\n  Supplier: ${item.supplier}`
        ).join('\n')}\n\n**Action Required:** Contact suppliers for urgent restock.` : '✅ **All items are adequately stocked!**'}\n\n**Inventory by Category:**\n${[...new Set(data.inventory.map(i => i.category))].map(cat => 
          `• ${cat}: ${data.inventory.filter(i => i.category === cat).length} items`
        ).join('\n')}`;
        action = { type: 'highlight', tab: 'inventory' };
      }
      
      // Analytics and reporting
      else if (lowerQuery.includes('report') || lowerQuery.includes('analytics') || lowerQuery.includes('summary')) {
        response = `📊 **School Analytics Dashboard:**\n\n**🎓 Academic Excellence:**\n• Class Average: ${(data.students.reduce((sum, s) => sum + Object.values(s.grades).reduce((a, b) => a + b, 0) / Object.values(s.grades).length, 0) / data.students.length).toFixed(1)}%\n• Top Subject: ${Object.keys(data.students[0].grades).reduce((best, subject) => {
            const avg = data.students.reduce((sum, s) => sum + s.grades[subject], 0) / data.students.length;
            const bestAvg = data.students.reduce((sum, s) => sum + s.grades[best], 0) / data.students.length;
            return avg > bestAvg ? subject : best;
          })}\n• Students >85%: ${data.students.filter(s => Object.values(s.grades).reduce((a, b) => a + b, 0) / Object.values(s.grades).length > 85).length}\n\n**👥 Student Engagement:**\n• Average Attendance: ${(data.students.reduce((sum, s) => sum + s.attendance.percentage, 0) / data.students.length).toFixed(1)}%\n• Extracurricular Participation: ${data.students.filter(s => s.extracurricular.length > 0).length} students\n• Academic Achievements: ${data.students.reduce((sum, s) => sum + s.achievements.length, 0)} total\n\n**💰 Financial Performance:**\n• Revenue: ₹${(data.finance.totalRevenue / 1000000).toFixed(1)}M\n• Profit Margin: ${((data.finance.netProfit / data.finance.totalRevenue) * 100).toFixed(1)}%\n• Fee Collection: ${(((data.students.reduce((sum, s) => sum + s.fees.paid, 0)) / (data.students.reduce((sum, s) => sum + s.fees.annual, 0))) * 100).toFixed(1)}%\n\n**📈 Growth Indicators:**\n• Student Retention: High\n• Teacher Satisfaction: Excellent\n• Academic Performance: Improving`;
        action = { type: 'highlight', tab: 'analytics' };
      }
      
      // Events and activities
      else if (lowerQuery.includes('event') || lowerQuery.includes('activity') || lowerQuery.includes('sports')) {
        response = `🎉 **Events & Activities Overview:**\n\n**Upcoming Events:**\n${data.events.map(event => 
          `• **${event.title}**\n  📅 ${new Date(event.date).toLocaleDateString()} | ${event.type}\n  👥 ${event.participants} participants\n  💰 Budget: ₹${event.budget.toLocaleString()} | Spent: ₹${event.spentAmount.toLocaleString()}\n  📊 Status: ${event.status} | Coordinator: ${event.coordinator}`
        ).join('\n\n')}\n\n**Event Summary:**\n• Total Events: ${data.events.length}\n• Total Budget: ₹${data.events.reduce((sum, e) => sum + e.budget, 0).toLocaleString()}\n• Expected Participants: ${data.events.reduce((sum, e) => sum + e.participants, 0)}\n\n**Next Event:** ${data.events.find(e => e.status === 'Planned')?.title} on ${new Date(data.events.find(e => e.status === 'Planned')?.date).toLocaleDateString()}`;
        action = { type: 'highlight', tab: 'events' };
      }
      
      // Help and capabilities
      else if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
        response = `🤖 **AI Assistant Capabilities:**\n\n**🎓 Student Management:**\n• View student records and academic performance\n• Monitor attendance and behavior patterns\n• Track fee payments and outstanding amounts\n• Generate individual student reports\n\n**👨‍🏫 Teacher Administration:**\n• Access staff directory and qualifications\n• Monitor salary and performance data\n• Review class assignments and schedules\n\n**💰 Financial Analytics:**\n• Revenue and expense tracking\n• Profit/loss analysis and trends\n• Fee collection monitoring\n• Budget vs actual comparisons\n\n**📦 Inventory Management:**\n• Stock level monitoring and alerts\n• Supplier information and contacts\n• Reorder notifications\n• Asset valuation reports\n\n**📊 Advanced Analytics:**\n• Academic performance trends\n• Attendance pattern analysis\n• Financial health indicators\n• Predictive insights\n\n**🎯 Smart Features:**\n• Natural language queries\n• Proactive alerts and recommendations\n• Cross-module data correlation\n• Automated report generation\n\n**Try asking me:**\n• "Show me students with pending fees"\n• "What's our monthly profit trend?"\n• "Which inventory items need reordering?"\n• "Generate a performance report for Grade 8"`;
      }
      
      // Specific student queries
      else if (lowerQuery.includes('aarav')) {
        const student = data.students.find(s => s.name.toLowerCase().includes('aarav'));
        response = `👦 **Aarav Patel Profile:**\n\n**Academic Performance:**\n• Overall Average: ${(Object.values(student.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(student.grades).length).toFixed(1)}%\n• Strongest Subject: ${Object.entries(student.grades).reduce((best, [subject, grade]) => grade > best[1] ? [subject, grade] : best, ['', 0])[0]} (${Object.entries(student.grades).reduce((best, [subject, grade]) => grade > best[1] ? [subject, grade] : best, ['', 0])[1]}%)\n• Attendance: ${student.attendance.percentage}%\n\n**Financial Status:**\n• Pending Fees: ₹${student.fees.pending.toLocaleString()}\n• Payment Status: ${student.fees.pending > 0 ? 'Overdue' : 'Current'}\n\n**Achievements:**\n${student.achievements.map(a => `• ${a}`).join('\n')}\n\n**Extracurricular:**\n${student.extracurricular.map(e => `• ${e}`).join('\n')}\n\n**Recommendations:**\n• Follow up on pending fees\n• Encourage continued excellence in Science\n• Support Math improvement initiatives`;
      }
      
      // General school information
      else if (lowerQuery.includes('school') || lowerQuery.includes('information')) {
        response = `🏫 **Modern International School Overview:**\n\n**Basic Information:**\n• Established: ${data.school.established}\n• Board: ${data.school.board}\n• Principal: ${data.school.principal}\n• Address: ${data.school.address}\n\n**Current Statistics:**\n• Total Students: ${data.school.totalStudents}\n• Total Teachers: ${data.school.totalTeachers}\n• Grades: ${data.school.grades.join(', ')}\n\n**Facilities:**\n${data.school.facilities.map(f => `• ${f}`).join('\n')}\n\n**Contact Information:**\n• Phone: ${data.school.contact.phone}\n• Email: ${data.school.contact.email}\n• Website: ${data.school.contact.website}\n\n**Key Metrics:**\n• Student-Teacher Ratio: ${Math.round(data.school.totalStudents / data.school.totalTeachers)}:1\n• Academic Performance: Strong\n• Financial Health: Stable\n• Infrastructure: Modern`;
      }
      
      // Default response for unrecognized queries
      else {
        response = `🤔 I understand you're asking about "${query}". Let me help you with that!\n\n**Here's what I can assist you with:**\n\n**📊 Quick Insights:**\n• Student performance analytics\n• Teacher management data\n• Financial reports and trends\n• Inventory status updates\n• Event planning information\n\n**💡 Try asking:**\n• "Show me top performing students"\n• "What's our profit this quarter?"\n• "Which students have pending fees?"\n• "Generate attendance report"\n• "What items need reordering?"\n\n**🎯 Smart Features:**\n• Natural language processing\n• Predictive analytics\n• Real-time data insights\n• Automated recommendations\n\n**Ask me anything specific about your school data and I'll provide detailed insights!**`;
      }
      
      // Add the AI response to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
        action: action
      }]);
      
      // Execute any actions
      if (action) {
        if (action.type === 'highlight' && action.tab) {
          setTimeout(() => {
            onTabChange(action.tab);
          }, 500);
        }
      }
      
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: "I apologize, but I encountered an error processing your request. Please try again or ask a different question.",
        timestamp: new Date().toISOString()
      }]);
    }
    
    setIsProcessing(false);
    setTypingIndicator('');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }]);
    
    const query = inputMessage;
    setInputMessage('');
    
    // Process the query with AI
    await processAgenticQuery(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
      >
        <div className="relative">
          <Brain className="w-7 h-7" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <h3 className="font-semibold">AI Assistant</h3>
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-green-300" />
              <span className="text-xs text-green-200">Active</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[450px]">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  <div className="text-xs opacity-75 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm">{typingIndicator}</span>
                  </div>
                </div>
              </div>
            )}
            
            {isListening && (
              <div className="flex justify-start">
                <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">Listening... Speak clearly</span>
                  </div>
                  {currentTranscript && (
                    <div className="text-sm text-blue-600 italic mt-1">"{currentTranscript}"</div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your school..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isProcessing}
              />
              
              {/* Voice Input Button */}
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                disabled={isProcessing}
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !inputMessage.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Show pending fees",
                "Top students",
                "Financial summary",
                "Inventory alerts"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputMessage(suggestion);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={isProcessing}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            
            {/* Status */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing your request...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>AI Assistant ready • Press Enter to send</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatAssistant;