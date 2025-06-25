import requests
import json
import sys
from datetime import datetime

class LeaveManagementTester:
    def __init__(self, base_url="https://3e2377aa-7739-4d6a-bb31-d9ac8ad5816f.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, message="", response=None):
        """Log test result with details"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {test_name}"
        if message:
            result += f": {message}"
        
        print(result)
        self.test_results.append({
            "name": test_name,
            "success": success,
            "message": message,
            "response": response
        })
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"text": response.text}
            
            message = f"Status: {response.status_code}"
            if not success:
                message += f", Expected: {expected_status}"
            
            return self.log_result(name, success, message, response_data), response_data
        except Exception as e:
            return self.log_result(name, False, f"Error: {str(e)}"), None

    def test_login(self, employee_id, password):
        """Test login functionality"""
        success, response = self.run_test(
            f"Login as {employee_id}",
            "POST",
            "login",
            200,
            data={"employee_id": employee_id, "password": password},
            auth=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user = response['user']
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        return self.run_test(
            "Login with invalid credentials",
            "POST",
            "login",
            401,
            data={"employee_id": "invalid", "password": "invalid"},
            auth=False
        )[0]

    def test_submit_leave(self, month, year):
        """Test leave submission"""
        data = {
            "month": month,
            "year": year,
            "monthly_leave_dates": ["2025-02-15"],
            "optional_leave_dates": ["2025-02-20"],
            "wfh_dates": ["2025-02-25"],
            "additional_hours": "15-Feb-2025: 2 hours",
            "pending_leaves": 5,
            "total_days_off_dates": ["2025-02-15", "2025-02-20"]
        }
        
        success, response = self.run_test(
            "Submit leave application",
            "POST",
            "submit-leave",
            200,
            data=data
        )
        
        return success, response

    def test_get_my_submissions(self):
        """Test retrieving employee's submissions"""
        return self.run_test(
            "Get my submissions",
            "GET",
            "my-submissions",
            200
        )

    def test_get_all_submissions(self):
        """Test retrieving all submissions (HR only)"""
        return self.run_test(
            "Get all submissions",
            "GET",
            "all-submissions",
            200
        )

    def test_export_excel(self):
        """Test Excel export functionality (HR only)"""
        return self.run_test(
            "Export Excel",
            "GET",
            "export-excel",
            200
        )

    def test_leave_stats(self, user_id, year):
        """Test leave statistics endpoint"""
        return self.run_test(
            "Get leave statistics",
            "GET",
            f"leave-stats/{user_id}?year={year}",
            200
        )

    def test_unauthorized_access(self):
        """Test unauthorized access to HR endpoints"""
        # First login as employee
        self.test_login("EMP001", "pass123")
        
        # Try to access HR-only endpoint
        return self.run_test(
            "Unauthorized access to HR endpoint",
            "GET",
            "all-submissions",
            403
        )

    def run_employee_tests(self):
        """Run all employee-related tests"""
        print("\n==== EMPLOYEE TESTS ====")
        
        # Login as employee
        if not self.test_login("EMP001", "pass123"):
            return False
        
        # Get user ID for stats
        user_id = self.user["id"]
        
        # Test leave submission
        self.test_submit_leave(2, 2025)  # February 2025
        
        # Test retrieving submissions
        self.test_get_my_submissions()
        
        # Test leave stats
        self.test_leave_stats(user_id, 2025)
        
        return True

    def run_hr_tests(self):
        """Run all HR-related tests"""
        print("\n==== HR TESTS ====")
        
        # Login as HR
        if not self.test_login("HR001", "hr123"):
            return False
        
        # Test retrieving all submissions
        self.test_get_all_submissions()
        
        # Test Excel export
        self.test_export_excel()
        
        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Leave Management System API Tests")
        
        # Test invalid login
        self.test_invalid_login()
        
        # Run employee tests
        self.run_employee_tests()
        
        # Test unauthorized access
        self.test_unauthorized_access()
        
        # Run HR tests
        self.run_hr_tests()
        
        # Print summary
        print("\n==== TEST SUMMARY ====")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = LeaveManagementTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)