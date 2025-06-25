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
    employee_id: '',
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
        setLoginData({ employee_id: '', password: '' });
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
    return date.toLocaleDateString('en-GB');
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Leave Management</h1>
            <p className="text-white/80">Welcome back! Please sign in to continue</p>
          </div>
          
          <form onSubmit={login} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="e.g., EMP001 or HR001"
                value={loginData.employee_id}
                onChange={(e) => setLoginData(prev => ({...prev, employee_id: e.target.value}))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-transparent placeholder-white/50 text-white backdrop-blur-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-transparent placeholder-white/50 text-white backdrop-blur-sm"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 font-medium transition-all duration-200 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 text-sm text-white/70 text-center">
            <p className="mb-3"><strong className="text-white">Demo Credentials:</strong></p>
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="mb-1">👥 <strong>Employees:</strong> EMP001-EMP005</p>
              <p className="mb-1">🔑 <strong>Password:</strong> pass123</p>
              <p>👤 <strong>HR:</strong> HR001 / hr123</p>
            </div>
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
                          {submission.total_days_off_dates.length > 0 
                            ? submission.total_days_off_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
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