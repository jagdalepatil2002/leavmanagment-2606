import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const COLORS = {
  working: '#10b981',
  leave: '#ef4444', 
  wfh: '#3b82f6',
  weekend: '#6b7280'
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Login state
  const [loginData, setLoginData] = useState({
    username: '',  // Changed from employee_id to username
    password: ''
  });

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    monthly_leave_dates: [],
    optional_leave_dates: [],
    wfh_dates: [],
    additional_hours: '',
    pending_leaves: 0,
    total_days_off_dates: []
  });

  // Filter state
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // HR Management state
  const [employees, setEmployees] = useState([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showCreateHR, setShowCreateHR] = useState(false);  // Add HR creation modal state
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    username: '',  // Add username field
    employee_id: '',
    password: '',
    department: ''
  });
  const [newHR, setNewHR] = useState({  // Add HR creation state
    name: '',
    username: '',
    employee_id: '',
    password: '',
    department: ''
  });

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [hrAnalytics, setHrAnalytics] = useState(null);

  // Refs for date inputs
  const dateInputRefs = useRef({});

  // Initialize user from token
  useEffect(() => {
    if (token) {
      try {
        const userData = JSON.parse(token);
        setUser(userData);
        if (userData.role === 'employee') {
          fetchMySubmissions();
          fetchLeaveStats(userData.id, filter.year);
          fetchAnalytics(userData.id, filter.month, filter.year);
        } else if (userData.role === 'hr') {
          fetchAllSubmissions();
          fetchHrAnalytics(filter.month, filter.year);
          fetchEmployees();
        }
      } catch (error) {
        console.error('Invalid token:', error);
        logout();
      }
    }
  }, [token]);

  // Update data when filter changes
  useEffect(() => {
    if (user) {
      if (user.role === 'employee') {
        fetchMySubmissions();
        fetchAnalytics(user.id, filter.month, filter.year);
      } else if (user.role === 'hr') {
        fetchAllSubmissions();
        fetchHrAnalytics(filter.month, filter.year);
      }
    }
  }, [filter]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setLoginData({ username: '', password: '' });
      } else {
        alert('❌ Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('❌ Login failed. Please try again.');
    }
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setActiveTab('dashboard');
  };

  const fetchMySubmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.month) params.append('month', filter.month);
      if (filter.year) params.append('year', filter.year);
      
      const response = await fetch(`${API_BASE_URL}/api/my-submissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchAllSubmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.month) params.append('month', filter.month);
      if (filter.year) params.append('year', filter.year);
      
      const response = await fetch(`${API_BASE_URL}/api/all-submissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error('Error fetching all submissions:', error);
    }
  };

  const fetchLeaveStats = async (userId, year) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave-stats/${userId}?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveStats(data);
      }
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    }
  };

  const fetchAnalytics = async (userId, month, year) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/${userId}?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchHrAnalytics = async (month, year) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr-analytics?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHrAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching HR analytics:', error);
    }
  };

  // HR Management Functions
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const createHR = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr/create-hr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newHR),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        setNewHR({ name: '', username: '', employee_id: '', password: '', department: '' });
        setShowCreateHR(false);
        // Optionally refresh employees list to show HR users too
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Create HR error:', error);
      alert('❌ Failed to create HR user. Please try again.');
    }
    setLoading(false);
  };

  const createEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr/create-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newEmployee),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        setNewEmployee({ name: '', username: '', employee_id: '', password: '', department: '' });
        setShowCreateEmployee(false);
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Create employee error:', error);
      alert('❌ Failed to create employee. Please try again.');
    }
    setLoading(false);
  };

  const deleteEmployee = async (employeeId) => {
    if (!confirm('Are you sure you want to delete this employee? This will also delete all their leave data.')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr/delete-employee/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        alert('✅ Employee deleted successfully');
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete employee error:', error);
      alert('❌ Delete failed. Please try again.');
    }
  };

  const revokeAccess = async (employeeId) => {
    if (!confirm('Are you sure you want to revoke access for this employee?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/hr/revoke-access/${employeeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        alert('✅ Employee access revoked successfully');
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Revoke access error:', error);
      alert('❌ Operation failed. Please try again.');
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leaveForm),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        fetchMySubmissions();
        fetchLeaveStats(user.id, leaveForm.year);
        fetchAnalytics(user.id, leaveForm.month, leaveForm.year);
        // Reset form
        setLeaveForm({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          monthly_leave_dates: [],
          optional_leave_dates: [],
          wfh_dates: [],
          additional_hours: '',
          pending_leaves: 0,
          total_days_off_dates: []
        });
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail || 'Submission failed'}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('❌ Submission failed. Please try again.');
    }
    setLoading(false);
  };

  const deleteSubmission = async (submissionId) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/delete-submission/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        alert('✅ Submission deleted successfully');
        fetchAllSubmissions();
        fetchHrAnalytics(filter.month, filter.year);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Delete failed. Please try again.');
    }
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.month) params.append('month', filter.month);
      if (filter.year) params.append('year', filter.year);
      
      const response = await fetch(`${API_BASE_URL}/api/export-excel?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leave_submissions_${filter.year}_${filter.month}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('✅ Excel exported successfully!');
      } else {
        alert('❌ Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed. Please try again.');
    }
  };

  const addDate = (field, inputRef) => {
    const date = inputRef.current?.value;
    if (date && !leaveForm[field].includes(date)) {
      setLeaveForm(prev => ({
        ...prev,
        [field]: [...prev[field], date]
      }));
      inputRef.current.value = ''; // Clear the input
    }
  };

  const removeDate = (field, date) => {
    setLeaveForm(prev => ({
      ...prev,
      [field]: prev[field].filter(d => d !== date)
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;  // DD-MM-YYYY format
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const renderPieChart = (data, title) => {
    const chartData = [
      { name: 'Working Days', value: data.working_days, color: COLORS.working },
      { name: 'Leave Days', value: data.leave_days, color: COLORS.leave },
      { name: 'WFH Days', value: data.wfh_days, color: COLORS.wfh }
    ].filter(item => item.value > 0);

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">{title}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>Working: {data.working_days} days</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span>Leave: {data.leave_days} days</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span>WFH: {data.wfh_days} days</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
            <span>Total: {data.total_days} days</span>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Animation Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-80 h-80 bg-white/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-pink-300/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative bg-white/15 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/30 hover:bg-white/20 transition-all duration-500">
          <div className="text-center mb-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center mb-6 shadow-xl backdrop-blur-sm border border-white/20">
              <span className="text-4xl animate-bounce">📋</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Leave Management
            </h1>
            <p className="text-white/90 text-lg font-medium">Welcome! Please sign in to continue</p>
          </div>
          
          <form onSubmit={login} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/95 mb-2 tracking-wide">
                Username
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={loginData.username}
                  onChange={(e) => setLoginData(prev => ({...prev, username: e.target.value}))}
                  className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl focus:ring-4 focus:ring-white/30 focus:border-white/50 placeholder-white/60 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/15 focus:bg-white/20 text-lg font-medium"
                  required
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/95 mb-2 tracking-wide">
                Password
              </label>
              <div className="relative group">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                  className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-2xl focus:ring-4 focus:ring-white/30 focus:border-white/50 placeholder-white/60 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/15 focus:bg-white/20 text-lg font-medium"
                  required
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-2xl focus:ring-4 focus:ring-white/30 disabled:opacity-50 disabled:transform-none group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                    <span className="animate-pulse">Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Sign In
                  </>
                )}
              </div>
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-6"></div>
            <p className="text-white/70 text-sm font-medium">
              Secure Employee Portal
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📋</span>
              <h1 className="text-2xl font-bold text-white">Leave Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white/90">
                <span className="text-sm">Welcome back,</span>
                <span className="font-semibold ml-1">{user.name}</span>
                <span className="text-xs ml-2 bg-white/20 px-2 py-1 rounded-full">{user.employee_id}</span>
              </div>
              <button
                onClick={logout}
                className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Dashboard
            </button>
            {user.role === 'employee' && (
              <button
                onClick={() => setActiveTab('submit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'submit'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ✍️ Submit Leave
              </button>
            )}
            {user.role === 'hr' && (
              <button
                onClick={() => setActiveTab('hr-management')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'hr-management'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 HR Management
              </button>
            )}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'analytics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📈 Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Month/Year Filter */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={filter.month}
                onChange={(e) => setFilter(prev => ({...prev, month: parseInt(e.target.value)}))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={filter.year}
                onChange={(e) => setFilter(prev => ({...prev, year: parseInt(e.target.value)}))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          {user.role === 'hr' && (
            <button
              onClick={exportExcel}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {user.role === 'hr' ? '🏢 All Leave Submissions' : '📝 My Leave Submissions'}
              </h2>
              <p className="text-gray-600">
                Viewing data for {getMonthName(filter.month)} {filter.year}
              </p>
            </div>

            {user.role === 'employee' && leaveStats && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6 border border-blue-200">
                <h3 className="font-semibold text-indigo-900 mb-3">📊 Your Leave Statistics for {filter.year}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 p-3 rounded-lg">
                    <span className="text-indigo-700">Optional Leaves Used:</span>
                    <div className="text-xl font-bold text-indigo-900">{leaveStats.total_optional_leaves_used}/6</div>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg">
                    <span className="text-indigo-700">Remaining Optional Leaves:</span>
                    <div className="text-xl font-bold text-green-600">{leaveStats.remaining_optional_leaves}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">📭</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                  <p className="text-gray-500">No leave submissions for {getMonthName(filter.month)} {filter.year}</p>
                </div>
              ) : (
                submissions.map((submission) => (
                  <div key={submission.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <span className="mr-2">👤</span>
                          {submission.employee_name} ({submission.employee_id})
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {getMonthName(submission.month)} {submission.year}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Submitted: {formatDate(submission.submitted_at)}
                        </span>
                        {user.role === 'hr' && (
                          <button
                            onClick={() => deleteSubmission(submission.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete submission"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <strong className="text-blue-700 flex items-center mb-2">
                          <span className="mr-1">🏖️</span> Monthly Leave:
                        </strong>
                        <p className="text-gray-700">
                          {submission.monthly_leave_dates.length > 0 
                            ? submission.monthly_leave_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg">
                        <strong className="text-green-700 flex items-center mb-2">
                          <span className="mr-1">🌟</span> Optional Leave:
                        </strong>
                        <p className="text-gray-700">
                          {submission.optional_leave_dates.length > 0 
                            ? submission.optional_leave_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <strong className="text-purple-700 flex items-center mb-2">
                          <span className="mr-1">🏠</span> Work From Home:
                        </strong>
                        <p className="text-gray-700">
                          {submission.wfh_dates.length > 0 
                            ? submission.wfh_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <strong className="text-yellow-700 flex items-center mb-2">
                          <span className="mr-1">⏰</span> Additional Hours:
                        </strong>
                        <p className="text-gray-700">{submission.additional_hours || 'None'}</p>
                      </div>
                      
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <strong className="text-indigo-700 flex items-center mb-2">
                          <span className="mr-1">📊</span> Remaining Leaves:
                        </strong>
                        <p className="text-gray-700 text-lg font-semibold">{submission.pending_leaves}</p>
                      </div>
                      
                      <div className="bg-red-50 p-3 rounded-lg">
                        <strong className="text-red-700 flex items-center mb-2">
                          <span className="mr-1">🔴</span> Total Days Off:
                        </strong>
                        <p className="text-gray-700">
                          <span className="text-lg font-bold text-red-600">
                            {(submission.calculated_total_days_off || 
                              (submission.monthly_leave_dates.length + submission.optional_leave_dates.length))}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            (Monthly: {submission.monthly_leave_dates.length} + Optional: {submission.optional_leave_dates.length})
                          </span>
                          {submission.total_days_off_dates.length > 0 && (
                            <div className="mt-1 text-sm">
                              <span className="text-gray-600">Additional days: </span>
                              {submission.total_days_off_dates.map(date => formatDate(date)).join(', ')}
                            </div>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'submit' && user.role === 'employee' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-3">✍️</span>
                Submit Leave Application
              </h2>
              
              <form onSubmit={submitLeave} className="space-y-6">
                {/* Month and Year Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={leaveForm.month}
                      onChange={(e) => setLeaveForm(prev => ({...prev, month: parseInt(e.target.value)}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{getMonthName(i + 1)}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <select
                      value={leaveForm.year}
                      onChange={(e) => setLeaveForm(prev => ({...prev, year: parseInt(e.target.value)}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Fields */}
                {[
                  { field: 'monthly_leave_dates', label: '🏖️ Monthly Leave Dates', color: 'blue' },
                  { field: 'optional_leave_dates', label: '🌟 Optional Leave Dates', color: 'green' },
                  { field: 'wfh_dates', label: '🏠 Work From Home Dates', color: 'purple' },
                  { field: 'total_days_off_dates', label: '🔴 Total Days Off', color: 'red' }
                ].map(({ field, label, color }) => {
                  if (!dateInputRefs.current[field]) {
                    dateInputRefs.current[field] = React.createRef();
                  }
                  
                  return (
                    <div key={field} className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {label}
                      </label>
                      <div className="flex space-x-2 mb-3">
                        <input
                          ref={dateInputRefs.current[field]}
                          type="date"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => addDate(field, dateInputRefs.current[field])}
                          className={`px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors duration-200 font-medium`}
                        >
                          Add Date
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {leaveForm[field].map((date, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-3 py-1 bg-${color}-100 text-${color}-800 rounded-full text-sm font-medium`}
                          >
                            {formatDate(date)}
                            <button
                              type="button"
                              onClick={() => removeDate(field, date)}
                              className="ml-2 text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Additional Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏰ Additional Hours Worked
                  </label>
                  <textarea
                    value={leaveForm.additional_hours}
                    onChange={(e) => setLeaveForm(prev => ({...prev, additional_hours: e.target.value}))}
                    placeholder="e.g., 15-May-2025: 2 hours, 20-May-2025: 3 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    rows="3"
                  />
                </div>

                {/* Remaining Leaves */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Remaining Leaves
                  </label>
                  <input
                    type="number"
                    value={leaveForm.pending_leaves}
                    onChange={(e) => setLeaveForm(prev => ({...prev, pending_leaves: parseInt(e.target.value) || 0}))}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 font-medium transition-all duration-200 transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : '✅ Submit Leave Application'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'hr-management' && user.role === 'hr' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <span className="mr-3">👥</span>
                  Employee Management
                </h2>
                <p className="text-gray-600">Manage employees, departments, and access permissions</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateEmployee(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 shadow-lg font-medium"
                >
                  <span>➕</span>
                  <span>Add Employee</span>
                </button>
                <button
                  onClick={() => setShowCreateHR(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg font-medium"
                >
                  <span>👤</span>
                  <span>Add HR User</span>
                </button>
              </div>
            </div>

            {/* Create Employee Modal */}
            {showCreateEmployee && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="mr-2">👤</span>
                    Create New Employee
                  </h3>
                  <form onSubmit={createEmployee} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee(prev => ({...prev, name: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={newEmployee.username}
                        onChange={(e) => setNewEmployee(prev => ({...prev, username: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="Login username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                      <input
                        type="text"
                        value={newEmployee.employee_id}
                        onChange={(e) => setNewEmployee(prev => ({...prev, employee_id: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee(prev => ({...prev, password: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee(prev => ({...prev, department: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="e.g., Engineering, Marketing, Sales"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium"
                      >
                        {loading ? 'Creating...' : 'Create Employee'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateEmployee(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Employees List */}
            <div className="grid gap-4">
              {employees.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">👤</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
                  <p className="text-gray-500">Create your first employee to get started</p>
                </div>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">{employee.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employee.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Employee ID:</strong> {employee.employee_id}</p>
                          {employee.department && <p><strong>Department:</strong> {employee.department}</p>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {employee.active && (
                          <button
                            onClick={() => revokeAccess(employee.employee_id)}
                            className="text-orange-500 hover:text-orange-700 p-2 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                            title="Revoke access"
                          >
                            🔒
                          </button>
                        )}
                        <button
                          onClick={() => deleteEmployee(employee.employee_id)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete employee"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <span className="mr-3">📈</span>
                {user.role === 'hr' ? 'Team Analytics' : 'My Analytics'}
              </h2>
              <p className="text-gray-600">
                Analytics for {getMonthName(filter.month)} {filter.year}
              </p>
            </div>

            {user.role === 'employee' && analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderPieChart(analytics, `${analytics.month_name} ${analytics.year} - Work Distribution`)}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Monthly Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">👔 Working Days</span>
                      <span className="font-bold text-green-800">{analytics.working_days}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700">🏖️ Leave Days</span>
                      <span className="font-bold text-red-800">{analytics.leave_days}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700">🏠 WFH Days</span>
                      <span className="font-bold text-blue-800">{analytics.wfh_days}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">📅 Total Days</span>
                      <span className="font-bold text-gray-800">{analytics.total_days}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'hr' && hrAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderPieChart(hrAnalytics, `Team Overview - ${hrAnalytics.month_name} ${hrAnalytics.year}`)}
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🏢 Team Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-700">👥 Total Employees</span>
                        <span className="font-bold text-blue-800">{hrAnalytics.total_employees}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700">📋 Submissions</span>
                        <span className="font-bold text-green-800">{hrAnalytics.employees_submitted}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-purple-700">📊 Submission Rate</span>
                        <span className="font-bold text-purple-800">{hrAnalytics.submission_rate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Leave Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-red-700">🏖️ Total Leave Days</span>
                        <span className="font-bold text-red-800">{hrAnalytics.total_leave_days}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-700">🏠 Total WFH Days</span>
                        <span className="font-bold text-blue-800">{hrAnalytics.total_wfh_days}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700">👔 Total Working Days</span>
                        <span className="font-bold text-green-800">{hrAnalytics.working_days}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;