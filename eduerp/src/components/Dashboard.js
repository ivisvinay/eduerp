import React from 'react';
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Star,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const Dashboard = ({ data }) => {
  // Calculate statistics
  const totalStudents = data.students.length;
  const totalTeachers = data.teachers.length;
  const totalRevenue = data.finance.totalRevenue;
  const pendingFees = data.students.reduce((sum, student) => sum + student.fees.pending, 0);
  
  // Calculate averages
  const avgAttendance = data.students.reduce((sum, student) => sum + student.attendance.percentage, 0) / totalStudents;
  const avgGrade = data.students.reduce((sum, student) => {
    const studentAvg = Object.values(student.grades).reduce((a, b) => a + b, 0) / Object.values(student.grades).length;
    return sum + studentAvg;
  }, 0) / totalStudents;

  // Recent activities
  const recentActivities = [
    {
      type: 'success',
      icon: CheckCircle,
      message: `${data.students.find(s => s.fees.pending === 0)?.name} - Fees paid (₹${data.students.find(s => s.fees.pending === 0)?.fees.annual.toLocaleString()})`
    },
    {
      type: 'warning',
      icon: AlertCircle,
      message: `${data.students.find(s => s.attendance.percentage < 95)?.name} - Attendance below 95%`
    },
    {
      type: 'info',
      icon: Star,
      message: `${data.students.find(s => s.achievements.length > 0)?.name} - New achievement: ${data.students.find(s => s.achievements.length > 0)?.achievements[0]}`
    },
    {
      type: 'info',
      icon: Clock,
      message: `${data.events.find(e => e.status === 'Planned')?.title} - ${new Date(data.events.find(e => e.status === 'Planned')?.date).toLocaleDateString()}`
    }
  ];

  // Alerts
  const alerts = [
    {
      type: 'error',
      icon: AlertCircle,
      message: `${data.inventory.filter(item => item.quantity < item.minStock).length} items need reordering`
    },
    {
      type: 'warning',
      icon: Clock,
      message: `${data.events.filter(e => e.status === 'Planned').length} upcoming events`
    },
    {
      type: 'info',
      icon: DollarSign,
      message: `${data.students.filter(s => s.fees.pending > 0).length} students with pending fees`
    }
  ];

  const getIconColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
                <p className="text-xs text-blue-600">Avg Attendance: {avgAttendance.toFixed(1)}%</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total Teachers</p>
                <p className="text-2xl font-bold text-green-900">{totalTeachers}</p>
                <p className="text-xs text-green-600">Avg Experience: {(data.teachers.reduce((sum, t) => sum + t.experience, 0) / totalTeachers).toFixed(1)} years</p>
              </div>
              <GraduationCap className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Annual Revenue</p>
                <p className="text-2xl font-bold text-purple-900">₹{(totalRevenue / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-purple-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {((data.finance.netProfit / data.finance.totalRevenue) * 100).toFixed(1)}% profit margin
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Pending Fees</p>
                <p className="text-2xl font-bold text-orange-900">₹{(pendingFees / 1000).toFixed(0)}K</p>
                <p className="text-xs text-orange-600">{data.students.filter(s => s.fees.pending > 0).length} students</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Academic Performance Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Academic Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{avgGrade.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Average Grade</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{avgAttendance.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Average Attendance</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{data.students.filter(s => s.behavior === 'Excellent' || s.behavior === 'Outstanding').length}</div>
              <p className="text-sm text-gray-600">Excellent Behavior</p>
            </div>
          </div>
        </div>
        
        {/* Recent Activities and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <activity.icon className={`w-5 h-5 ${getIconColor(activity.type)} flex-shrink-0 mt-0.5`} />
                  <span className="text-sm text-gray-700 leading-relaxed">{activity.message}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Alerts & Notifications */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Alerts & Notifications</h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3">
                  <alert.icon className={`w-5 h-5 ${getIconColor(alert.type)} flex-shrink-0 mt-0.5`} />
                  <span className="text-sm text-gray-700 leading-relaxed">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-blue-600">{data.events.length}</div>
            <p className="text-sm text-gray-600">Total Events</p>
            <p className="text-xs text-gray-500">{data.events.filter(e => e.status === 'Planned').length} upcoming</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-green-600">{data.extracurricular.length}</div>
            <p className="text-sm text-gray-600">Extracurricular Activities</p>
            <p className="text-xs text-gray-500">{data.extracurricular.reduce((sum, ext) => sum + ext.currentMembers, 0)} participants</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-purple-600">{data.library.totalBooks.toLocaleString()}</div>
            <p className="text-sm text-gray-600">Library Books</p>
            <p className="text-xs text-gray-500">{data.library.issuedBooks.length} currently issued</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-orange-600">{data.transportation.length}</div>
            <p className="text-sm text-gray-600">School Buses</p>
            <p className="text-xs text-gray-500">{data.transportation.reduce((sum, bus) => sum + bus.currentStudents, 0)} students</p>
          </div>
        </div>

        {/* Monthly Financial Trend */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Monthly Financial Trends</h3>
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            {data.finance.monthlyBreakdown.map((month, index) => (
              <div key={index} className="text-center">
                <div className="text-sm text-gray-600 mb-1">{month.month}</div>
                <div className="text-sm font-medium text-green-600">₹{(month.income / 1000).toFixed(0)}K</div>
                <div className="text-sm font-medium text-red-600">₹{(month.expense / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-500">
                  Net: ₹{((month.income - month.expense) / 1000).toFixed(0)}K
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(month.profit / Math.max(...data.finance.monthlyBreakdown.map(m => m.profit))) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Top Performers This Month</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.students
              .sort((a, b) => {
                const avgA = Object.values(a.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(a.grades).length;
                const avgB = Object.values(b.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(b.grades).length;
                return avgB - avgA;
              })
              .slice(0, 3)
              .map((student, index) => (
                <div key={student.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{student.name}</div>
                    <div className="text-xs text-gray-500">
                      Grade {student.grade}-{student.section} • {(Object.values(student.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(student.grades).length).toFixed(1)}% avg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600">#{index + 1}</div>
                    <Star className="w-4 h-4 text-yellow-500 mx-auto" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;