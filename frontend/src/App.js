import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);

  // Initialize user from token
  useEffect(() => {
    if (token) {
      try {
        const userData = JSON.parse(token);
        setUser(userData);
        if (userData.role === 'employee') {
          fetchMySubmissions();
          fetchLeaveStats(userData.id, leaveForm.year);
        } else if (userData.role === 'hr') {
          fetchAllSubmissions();
        }
      } catch (error) {
        console.error('Invalid token:', error);
        logout();
      }
    }
  }, [token]);

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
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
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
      const response = await fetch(`${API_BASE_URL}/api/my-submissions`, {
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
      const response = await fetch(`${API_BASE_URL}/api/all-submissions`, {
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

  const exportExcel = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export-excel`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leave_submissions.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const addDate = (field, date) => {
    if (date && !leaveForm[field].includes(date)) {
      setLeaveForm(prev => ({
        ...prev,
        [field]: [...prev[field], date]
      }));
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Leave Management</h1>
            <p className="text-gray-600">Please login to continue</p>
          </div>
          
          <form onSubmit={login} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                placeholder="e.g., EMP001 or HR001"
                value={loginData.employee_id}
                onChange={(e) => setLoginData(prev => ({...prev, employee_id: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({...prev, password: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-sm text-gray-600 text-center">
            <p className="mb-2"><strong>Sample Credentials:</strong></p>
            <p>Employee: EMP001, EMP002, EMP003, EMP004, EMP005</p>
            <p>Password: pass123</p>
            <p className="mt-2">HR: HR001 / hr123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user.name}</span> ({user.employee_id})
              </span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            {user.role === 'employee' && (
              <button
                onClick={() => setActiveTab('submit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'submit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Submit Leave
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.role === 'hr' ? 'All Leave Submissions' : 'My Leave Submissions'}
              </h2>
              {user.role === 'hr' && (
                <button
                  onClick={exportExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>Export Excel</span>
                </button>
              )}
            </div>

            {user.role === 'employee' && leaveStats && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Leave Statistics for {leaveForm.year}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Optional Leaves Used:</span>
                    <span className="font-medium ml-2">{leaveStats.total_optional_leaves_used}/6</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Remaining Optional Leaves:</span>
                    <span className="font-medium ml-2">{leaveStats.remaining_optional_leaves}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No leave submissions found
                </div>
              ) : (
                submissions.map((submission) => (
                  <div key={submission.id} className="bg-white p-6 rounded-lg shadow border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {submission.employee_name} ({submission.employee_id})
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getMonthName(submission.month)} {submission.year}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        Submitted: {formatDate(submission.submitted_at)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong className="text-gray-700">Monthly Leave:</strong>
                        <p className="mt-1">
                          {submission.monthly_leave_dates.length > 0 
                            ? submission.monthly_leave_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div>
                        <strong className="text-gray-700">Optional Leave:</strong>
                        <p className="mt-1">
                          {submission.optional_leave_dates.length > 0 
                            ? submission.optional_leave_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div>
                        <strong className="text-gray-700">Work From Home:</strong>
                        <p className="mt-1">
                          {submission.wfh_dates.length > 0 
                            ? submission.wfh_dates.map(date => formatDate(date)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      
                      <div>
                        <strong className="text-gray-700">Additional Hours:</strong>
                        <p className="mt-1">{submission.additional_hours || 'None'}</p>
                      </div>
                      
                      <div>
                        <strong className="text-gray-700">Remaining Leaves:</strong>
                        <p className="mt-1">{submission.pending_leaves}</p>
                      </div>
                      
                      <div>
                        <strong className="text-gray-700">Total Days Off:</strong>
                        <p className="mt-1">
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
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Leave Application</h2>
              
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Fields */}
                {[
                  { field: 'monthly_leave_dates', label: 'Monthly Leave Dates', color: 'blue' },
                  { field: 'optional_leave_dates', label: 'Optional Leave Dates', color: 'green' },
                  { field: 'wfh_dates', label: 'Work From Home Dates', color: 'purple' },
                  { field: 'total_days_off_dates', label: 'Total Days Off', color: 'red' }
                ].map(({ field, label, color }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {label}
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="date"
                        onChange={(e) => addDate(field, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector(`input[type="date"]`);
                          if (input.value) addDate(field, input.value);
                        }}
                        className={`px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors`}
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {leaveForm[field].map((date, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-3 py-1 bg-${color}-100 text-${color}-800 rounded-full text-sm`}
                        >
                          {formatDate(date)}
                          <button
                            type="button"
                            onClick={() => removeDate(field, date)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Additional Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Hours Worked
                  </label>
                  <textarea
                    value={leaveForm.additional_hours}
                    onChange={(e) => setLeaveForm(prev => ({...prev, additional_hours: e.target.value}))}
                    placeholder="e.g., 15-May-2025: 2 hours, 20-May-2025: 3 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>

                {/* Remaining Leaves */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remaining Leaves
                  </label>
                  <input
                    type="number"
                    value={leaveForm.pending_leaves}
                    onChange={(e) => setLeaveForm(prev => ({...prev, pending_leaves: parseInt(e.target.value) || 0}))}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;