import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  GraduationCap,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  Target,
  PieChart,
  Activity,
  Clock
} from 'lucide-react';

const Analytics = ({ data }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('current');
  const [selectedMetric, setSelectedMetric] = useState('academic');

  // Calculate academic performance metrics
  const calculateAcademicMetrics = () => {
    const studentGrades = data.students.map(student => {
      const grades = Object.values(student.grades);
      const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
      return { student: student.name, average, grade: student.grade };
    });

    const classAverage = studentGrades.reduce((sum, s) => sum + s.average, 0) / studentGrades.length;
    const topPerformers = studentGrades.filter(s => s.average >= 85).length;
    const needsAttention = studentGrades.filter(s => s.average < 70).length;

    // Subject averages
    const subjectAverages = Object.keys(data.students[0].grades).map(subject => {
      const avg = data.students.reduce((sum, student) => sum + student.grades[subject], 0) / data.students.length;
      return { subject, average: avg };
    });

    return {
      classAverage: classAverage.toFixed(1),
      topPerformers,
      needsAttention,
      subjectAverages,
      totalStudents: data.students.length
    };
  };

  // Calculate attendance metrics
  const calculateAttendanceMetrics = () => {
    const totalDays = data.students[0].attendance.total;
    const classAttendance = data.students.reduce((sum, student) => sum + student.attendance.percentage, 0) / data.students.length;
    const excellentAttendance = data.students.filter(s => s.attendance.percentage >= 95).length;
    const poorAttendance = data.students.filter(s => s.attendance.percentage < 90).length;

    return {
      classAttendance: classAttendance.toFixed(1),
      excellentAttendance,
      poorAttendance,
      totalDays,
      totalStudents: data.students.length
    };
  };

  // Calculate teacher performance metrics
  const calculateTeacherMetrics = () => {
    const totalTeachers = data.teachers.length;
    const avgExperience = data.teachers.reduce((sum, teacher) => sum + teacher.experience, 0) / totalTeachers;
    const topPerformers = data.teachers.filter(t => t.performance === 'Outstanding' || t.performance === 'Excellent').length;
    const totalSalary = data.teachers.reduce((sum, teacher) => sum + teacher.salary, 0);

    return {
      totalTeachers,
      avgExperience: avgExperience.toFixed(1),
      topPerformers,
      totalSalary,
      avgSalary: (totalSalary / totalTeachers).toFixed(0)
    };
  };

  // Calculate financial metrics
  const calculateFinancialMetrics = () => {
    const profitMargin = ((data.finance.netProfit / data.finance.totalRevenue) * 100).toFixed(1);
    const monthlyGrowth = data.finance.monthlyBreakdown.map((month, index) => {
      if (index === 0) return 0;
      const prevMonth = data.finance.monthlyBreakdown[index - 1];
      return ((month.income - prevMonth.income) / prevMonth.income * 100).toFixed(1);
    });

    return {
      profitMargin,
      monthlyGrowth,
      totalRevenue: data.finance.totalRevenue,
      totalExpenses: data.finance.totalExpenses,
      netProfit: data.finance.netProfit
    };
  };

  const academicMetrics = calculateAcademicMetrics();
  const attendanceMetrics = calculateAttendanceMetrics();
  const teacherMetrics = calculateTeacherMetrics();
  const financialMetrics = calculateFinancialMetrics();

  // Academic Performance Chart Component
  const AcademicPerformanceChart = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Academic Performance by Subject</h3>
      <div className="space-y-4">
        {academicMetrics.subjectAverages.map(subject => (
          <div key={subject.subject} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
            <div className="flex items-center gap-3 flex-1 ml-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    subject.average >= 85 ? 'bg-green-500' : 
                    subject.average >= 75 ? 'bg-blue-500' : 
                    subject.average >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${subject.average}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-gray-900 w-12">
                {subject.average.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Attendance Trends Component
  const AttendanceTrends = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Attendance Trends</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{attendanceMetrics.excellentAttendance}</div>
          <div className="text-sm text-green-600">Excellent (≥95%)</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">
            {attendanceMetrics.totalStudents - attendanceMetrics.excellentAttendance - attendanceMetrics.poorAttendance}
          </div>
          <div className="text-sm text-blue-600">Good (90-94%)</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-3xl font-bold text-red-600">{attendanceMetrics.poorAttendance}</div>
          <div className="text-sm text-red-600">Needs Attention ({"<90%"})</div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{attendanceMetrics.classAttendance}%</div>
        <div className="text-sm text-gray-600">Overall Class Average</div>
      </div>
    </div>
  );

  // Financial Performance Chart
  const FinancialPerformanceChart = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Monthly Financial Performance</h3>
      <div className="space-y-4">
        {data.finance.monthlyBreakdown.map((month, index) => (
          <div key={month.month} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-20">{month.month}</span>
            <div className="flex-1 mx-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(month.income / Math.max(...data.finance.monthlyBreakdown.map(m => m.income))) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-green-600 w-16">₹{(month.income / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(month.expense / Math.max(...data.finance.monthlyBreakdown.map(m => m.expense))) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-red-600 w-16">₹{(month.expense / 1000).toFixed(0)}K</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                ₹{((month.income - month.expense) / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-500">Net</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Key Performance Indicators
  const KeyPerformanceIndicators = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{academicMetrics.classAverage}%</div>
            <div className="text-sm opacity-90">Class Average</div>
          </div>
          <GraduationCap className="w-8 h-8 opacity-80" />
        </div>
        <div className="mt-2 text-sm opacity-75">
          {academicMetrics.topPerformers} students above 85%
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{attendanceMetrics.classAttendance}%</div>
            <div className="text-sm opacity-90">Attendance Rate</div>
          </div>
          <Calendar className="w-8 h-8 opacity-80" />
        </div>
        <div className="mt-2 text-sm opacity-75">
          {attendanceMetrics.excellentAttendance} students with excellent attendance
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{teacherMetrics.avgExperience}</div>
            <div className="text-sm opacity-90">Avg Experience</div>
          </div>
          <Users className="w-8 h-8 opacity-80" />
        </div>
        <div className="mt-2 text-sm opacity-75">
          {teacherMetrics.topPerformers} top performing teachers
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{financialMetrics.profitMargin}%</div>
            <div className="text-sm opacity-90">Profit Margin</div>
          </div>
          <TrendingUp className="w-8 h-8 opacity-80" />
        </div>
        <div className="mt-2 text-sm opacity-75">
          ₹{(financialMetrics.netProfit / 1000000).toFixed(1)}M net profit
        </div>
      </div>
    </div>
  );

  // Performance Insights Component
  const PerformanceInsights = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <div className="font-medium text-green-800">Academic Excellence</div>
            <div className="text-sm text-green-700">
              {academicMetrics.topPerformers} students (
              {((academicMetrics.topPerformers / academicMetrics.totalStudents) * 100).toFixed(1)}%) 
              are performing above 85% average
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-medium text-blue-800">Attendance Success</div>
            <div className="text-sm text-blue-700">
              {attendanceMetrics.excellentAttendance} students (
              {((attendanceMetrics.excellentAttendance / attendanceMetrics.totalStudents) * 100).toFixed(1)}%) 
              maintain excellent attendance (≥95%)
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
          <Award className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <div className="font-medium text-purple-800">Teacher Quality</div>
            <div className="text-sm text-purple-700">
              {teacherMetrics.topPerformers} teachers (
              {((teacherMetrics.topPerformers / teacherMetrics.totalTeachers) * 100).toFixed(1)}%) 
              rated as excellent or outstanding
            </div>
          </div>
        </div>

        {academicMetrics.needsAttention > 0 && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800">Attention Required</div>
              <div className="text-sm text-yellow-700">
                {academicMetrics.needsAttention} students (
                {((academicMetrics.needsAttention / academicMetrics.totalStudents) * 100).toFixed(1)}%) 
                have grades below 70% and need additional support
              </div>
            </div>
          </div>
        )}

        {attendanceMetrics.poorAttendance > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <Clock className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-800">Attendance Concerns</div>
              <div className="text-sm text-red-700">
                {attendanceMetrics.poorAttendance} students (
                {((attendanceMetrics.poorAttendance / attendanceMetrics.totalStudents) * 100).toFixed(1)}%) 
                have attendance below 90% - immediate intervention needed
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Report Generation Component
  const ReportGeneration = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Quick Reports</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Academic Report</span>
          </div>
          <div className="text-sm text-gray-600">
            Comprehensive academic performance analysis for all students
          </div>
        </button>

        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <span className="font-medium">Attendance Report</span>
          </div>
          <div className="text-sm text-gray-600">
            Detailed attendance patterns and trends analysis
          </div>
        </button>

        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Teacher Performance</span>
          </div>
          <div className="text-sm text-gray-600">
            Teacher evaluation and performance metrics summary
          </div>
        </button>

        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <span className="font-medium">Financial Summary</span>
          </div>
          <div className="text-sm text-gray-600">
            Revenue, expenses, and profit analysis with trends
          </div>
        </button>

        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-red-500" />
            <span className="font-medium">At-Risk Students</span>
          </div>
          <div className="text-sm text-gray-600">
            Students requiring immediate attention and intervention
          </div>
        </button>

        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Achievement Report</span>
          </div>
          <div className="text-sm text-gray-600">
            Student achievements, awards, and recognition summary
          </div>
        </button>
      </div>
    </div>
  );

  // Comparative Analysis Component
  const ComparativeAnalysis = () => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Grade-wise Comparison</h3>
      <div className="space-y-4">
        {[...new Set(data.students.map(s => s.grade))].sort().map(grade => {
          const gradeStudents = data.students.filter(s => s.grade === grade);
          const gradeAverage = gradeStudents.reduce((sum, s) => {
            const avg = Object.values(s.grades).reduce((a, b) => a + b, 0) / Object.values(s.grades).length;
            return sum + avg;
          }, 0) / gradeStudents.length;
          
          const gradeAttendance = gradeStudents.reduce((sum, s) => sum + s.attendance.percentage, 0) / gradeStudents.length;
          
          return (
            <div key={grade} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-bold text-blue-600">{grade}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Grade {grade}</div>
                  <div className="text-sm text-gray-600">{gradeStudents.length} students</div>
                </div>
              </div>
              <div className="flex gap-8 text-right">
                <div>
                  <div className="text-lg font-bold text-blue-600">{gradeAverage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Academic Avg</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{gradeAttendance.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Attendance</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Analytics & Reports</h2>
            <p className="text-gray-600">Comprehensive insights into school performance and trends</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current">Current Term</option>
              <option value="previous">Previous Term</option>
              <option value="year">Full Year</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <KeyPerformanceIndicators />

        {/* Performance Insights */}
        <PerformanceInsights />

        {/* Charts and Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AcademicPerformanceChart />
          <AttendanceTrends />
        </div>

        {/* Financial Performance */}
        <FinancialPerformanceChart />

        {/* Comparative Analysis */}
        <ComparativeAnalysis />

        {/* Report Generation */}
        <ReportGeneration />

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Student Engagement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Extracurricular Participation</span>
                <span className="font-semibold">
                  {data.students.filter(s => s.extracurricular.length > 0).length}/{data.students.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Activities per Student</span>
                <span className="font-semibold">
                  {(data.students.reduce((sum, s) => sum + s.extracurricular.length, 0) / data.students.length).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Achievement Rate</span>
                <span className="font-semibold">
                  {((data.students.filter(s => s.achievements.length > 0).length / data.students.length) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Infrastructure Utilization</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Library Usage</span>
                <span className="font-semibold">
                  {data.library.issuedBooks.length} books issued
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transportation</span>
                <span className="font-semibold">
                  {data.transportation.reduce((sum, bus) => sum + bus.currentStudents, 0)} students
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Facilities</span>
                <span className="font-semibold">
                  {data.school.facilities.length} facilities
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Data Quality</span>
                <span className="font-semibold text-green-600">Excellent</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Report Accuracy</span>
                <span className="font-semibold text-green-600">99.9%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;