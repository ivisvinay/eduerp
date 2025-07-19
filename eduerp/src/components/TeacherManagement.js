import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar,
  Award,
  BookOpen,
  Clock,
  DollarSign,
  GraduationCap,
  Star,
  Users,
  TrendingUp
} from 'lucide-react';

const TeacherManagement = ({ data, updateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterPerformance, setFilterPerformance] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Filter teachers
  const filteredTeachers = data.teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || teacher.subject === filterSubject;
    const matchesPerformance = filterPerformance === 'all' || teacher.performance === filterPerformance;
    return matchesSearch && matchesSubject && matchesPerformance;
  });

  // Get unique subjects and performance levels
  const subjects = [...new Set(data.teachers.map(t => t.subject))];
  const performanceLevels = [...new Set(data.teachers.map(t => t.performance))];

  // Get performance badge color
  const getPerformanceBadgeColor = (performance) => {
    switch (performance) {
      case 'Outstanding': return 'bg-green-100 text-green-800';
      case 'Excellent': return 'bg-blue-100 text-blue-800';
      case 'Very Good': return 'bg-purple-100 text-purple-800';
      case 'Good': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get experience level color
  const getExperienceColor = (years) => {
    if (years >= 10) return 'text-green-600';
    if (years >= 5) return 'text-blue-600';
    return 'text-orange-600';
  };

  // Teacher Detail Modal
  const TeacherDetailModal = ({ teacher, onClose }) => {
    if (!teacher) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {teacher.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{teacher.name}</h2>
                  <p className="text-gray-600">{teacher.subject} Teacher • {teacher.employeeId}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceBadgeColor(teacher.performance)}`}>
                      {teacher.performance}
                    </span>
                    <span className="text-sm text-gray-500">{teacher.experience} years experience</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Teacher Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Date of Birth:</strong> {new Date(teacher.personalInfo.dateOfBirth).toLocaleDateString()}</div>
                  <div><strong>Gender:</strong> {teacher.personalInfo.gender}</div>
                  <div><strong>Blood Group:</strong> {teacher.personalInfo.bloodGroup}</div>
                  <div><strong>Address:</strong> {teacher.address}</div>
                  <div><strong>Joining Date:</strong> {new Date(teacher.joiningDate).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{teacher.email}</span>
                  </div>
                  <div><strong>Emergency Contact:</strong> {teacher.personalInfo.emergencyContact}</div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Professional Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Subject:</strong> {teacher.subject}</div>
                  <div><strong>Qualification:</strong> {teacher.qualification}</div>
                  <div><strong>Experience:</strong> {teacher.experience} years</div>
                  <div><strong>Salary:</strong> ₹{teacher.salary.toLocaleString()}/month</div>
                  <div><strong>Performance:</strong> {teacher.performance}</div>
                </div>
              </div>
            </div>

            {/* Classes and Specializations */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Classes Assigned
                </h3>
                <div className="space-y-2">
                  {teacher.classes.map((cls, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{cls}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <strong>Grades:</strong> {teacher.grades.join(', ')}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Specializations & Achievements
                </h3>
                <div className="space-y-2">
                  <div>
                    <strong className="text-sm">Specializations:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.specializations.map((spec, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong className="text-sm">Achievements:</strong>
                    <div className="space-y-1 mt-1">
                      {teacher.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Award className="w-3 h-3 text-yellow-500" />
                          <span className="text-sm">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Edit Profile
              </button>
              <button className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors">
                View Schedule
              </button>
              <button className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors">
                Performance Review
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Grid View Component
  const GridView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {filteredTeachers.map(teacher => (
        <div key={teacher.id} className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {teacher.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                <p className="text-sm text-gray-600">{teacher.subject} Teacher</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPerformanceBadgeColor(teacher.performance)}`}>
              {teacher.performance}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Experience</p>
              <p className={`font-semibold ${getExperienceColor(teacher.experience)}`}>
                {teacher.experience} years
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Salary</p>
              <p className="font-semibold text-gray-900">₹{teacher.salary.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Classes Assigned</p>
            <div className="flex flex-wrap gap-1">
              {teacher.classes.slice(0, 3).map(cls => (
                <span key={cls} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  {cls}
                </span>
              ))}
              {teacher.classes.length > 3 && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  +{teacher.classes.length - 3} more
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTeacher(teacher)}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
            <button className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Table View Component
  const TableView = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Experience
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map(teacher => (
              <tr key={teacher.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {teacher.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      <div className="text-sm text-gray-500">{teacher.employeeId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {teacher.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={getExperienceColor(teacher.experience)}>
                    {teacher.experience} years
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPerformanceBadgeColor(teacher.performance)}`}>
                    {teacher.performance}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{teacher.salary.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedTeacher(teacher)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="text-green-600 hover:text-green-900 inline-flex items-center gap-1">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Teacher Management</h2>
            <p className="text-gray-600">Manage teaching staff, qualifications, and performance</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search teachers by name, subject, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <select
            value={filterPerformance}
            onChange={(e) => setFilterPerformance(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Performance</option>
            {performanceLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{filteredTeachers.length}</div>
                <div className="text-sm text-blue-600">Total Teachers</div>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredTeachers.filter(t => t.performance === 'Outstanding' || t.performance === 'Excellent').length}
                </div>
                <div className="text-sm text-green-600">Top Performers</div>
              </div>
              <Star className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {(filteredTeachers.reduce((sum, t) => sum + t.experience, 0) / filteredTeachers.length).toFixed(1)}
                </div>
                <div className="text-sm text-purple-600">Avg Experience</div>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{(filteredTeachers.reduce((sum, t) => sum + t.salary, 0) / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-orange-600">Avg Salary</div>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Teachers Display */}
        {viewMode === 'grid' ? <GridView /> : <TableView />}

        {/* Teacher Detail Modal */}
        {selectedTeacher && (
          <TeacherDetailModal
            teacher={selectedTeacher}
            onClose={() => setSelectedTeacher(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherManagement;