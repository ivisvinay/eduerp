import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const StudentManagement = ({ data, updateData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Filter students based on search and filters
  const filteredStudents = data.students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === 'all' || student.grade === filterGrade;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'paid' && student.fees.pending === 0) ||
                         (filterStatus === 'pending' && student.fees.pending > 0);
    return matchesSearch && matchesGrade && matchesStatus;
  });

  // Get unique grades for filter
  const grades = [...new Set(data.students.map(s => s.grade))].sort();

  // Calculate average grade for a student
  const getAverageGrade = (student) => {
    return Object.values(student.grades).reduce((sum, grade) => sum + grade, 0) / Object.values(student.grades).length;
  };

  // Get attendance status color
  const getAttendanceStatusColor = (percentage) => {
    if (percentage >= 95) return 'bg-green-100 text-green-800';
    if (percentage >= 90) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Get fee status color
  const getFeeStatusColor = (pending) => {
    return pending === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // Student Detail Modal
  const StudentDetailModal = ({ student, onClose }) => {
    if (!student) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                  <p className="text-gray-600">Grade {student.grade}-{student.section} • {student.rollNumber}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Student Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Date of Birth:</strong> {new Date(student.dateOfBirth).toLocaleDateString()}</div>
                  <div><strong>Gender:</strong> {student.gender}</div>
                  <div><strong>Blood Group:</strong> {student.bloodGroup}</div>
                  <div><strong>Address:</strong> {student.address}</div>
                  <div><strong>Admission Date:</strong> {new Date(student.admissionDate).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Parent Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Parent Name:</strong> {student.parentName}</div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{student.parentPhone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{student.parentEmail}</span>
                  </div>
                  <div><strong>Emergency:</strong> {student.emergencyContact}</div>
                </div>
              </div>

              {/* Fee Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Fee Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Annual Fee:</strong> ₹{student.fees.annual.toLocaleString()}</div>
                  <div><strong>Paid:</strong> <span className="text-green-600">₹{student.fees.paid.toLocaleString()}</span></div>
                  <div><strong>Pending:</strong> <span className="text-red-600">₹{student.fees.pending.toLocaleString()}</span></div>
                  <div><strong>Due Date:</strong> {new Date(student.fees.dueDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Academic Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(student.grades).map(([subject, grade]) => (
                  <div key={subject} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{grade}%</div>
                    <div className="text-sm text-gray-600">{subject}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{getAverageGrade(student).toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Overall Average</div>
              </div>
            </div>

            {/* Attendance */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Attendance Record</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{student.attendance.present}</div>
                  <div className="text-sm text-gray-600">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{student.attendance.absent}</div>
                  <div className="text-sm text-gray-600">Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{student.attendance.total}</div>
                  <div className="text-sm text-gray-600">Total Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{student.attendance.percentage}%</div>
                  <div className="text-sm text-gray-600">Percentage</div>
                </div>
              </div>
            </div>

            {/* Achievements and Extracurricular */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Achievements</h3>
                <div className="space-y-2">
                  {student.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{achievement}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Extracurricular Activities</h3>
                <div className="space-y-2">
                  {student.extracurricular.map((activity, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Medical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Allergies:</strong> {student.medicalInfo.allergies.length > 0 ? student.medicalInfo.allergies.join(', ') : 'None'}
                </div>
                <div>
                  <strong>Medications:</strong> {student.medicalInfo.medications.length > 0 ? student.medicalInfo.medications.join(', ') : 'None'}
                </div>
                <div>
                  <strong>Special Needs:</strong> {student.medicalInfo.specialNeeds}
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
            <h2 className="text-xl font-semibold text-gray-900">Student Management</h2>
            <p className="text-gray-600">Manage student records, attendance, and academic performance</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search students by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Grades</option>
            {grades.map(grade => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="paid">Fees Paid</option>
            <option value="pending">Fees Pending</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
            <div className="text-sm text-blue-600">Students Shown</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredStudents.filter(s => s.fees.pending === 0).length}
            </div>
            <div className="text-sm text-green-600">Fees Paid</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredStudents.filter(s => s.fees.pending > 0).length}
            </div>
            <div className="text-sm text-red-600">Fees Pending</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredStudents.filter(s => s.attendance.percentage >= 95).length}
            </div>
            <div className="text-sm text-purple-600">Excellent Attendance</div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.rollNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.grade}-{student.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getAttendanceStatusColor(student.attendance.percentage)}`}>
                        {student.attendance.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAverageGrade(student).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFeeStatusColor(student.fees.pending)}`}>
                        {student.fees.pending === 0 ? 'Paid' : `₹${student.fees.pending.toLocaleString()} Due`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
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

        {/* Student Detail Modal */}
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </div>
    </div>
  );
};

export default StudentManagement;