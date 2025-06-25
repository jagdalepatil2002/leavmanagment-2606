import requests
import json
import sys
import random
import string
from datetime import datetime

class LeaveManagementTester:
    def __init__(self, base_url="https://3e2377aa-7739-4d6a-bb31-d9ac8ad5816f.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_employee_id = None
        self.created_employee_uuid = None

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

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=True, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
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

    def test_old_credentials_login(self):
        """Test that old dummy credentials no longer work"""
        return self.run_test(
            "Login with old dummy credentials",
            "POST",
            "login",
            401,
            data={"employee_id": "EMP001", "password": "pass123"},
            auth=False
        )[0]

    def test_inactive_user_login(self):
        """Test that inactive users cannot login"""
        # First create an employee
        emp_id = f"EMP{random.randint(1000, 9999)}"
        self.test_create_employee(emp_id, "password123", "Test Department")
        
        # Then revoke access
        self.test_revoke_access(emp_id)
        
        # Try to login with revoked credentials
        return self.run_test(
            "Login with inactive user credentials",
            "POST",
            "login",
            401,
            data={"employee_id": emp_id, "password": "password123"},
            auth=False
        )[0]

    def test_submit_leave(self, month, year):
        """Test leave submission with total days calculation"""
        monthly_leaves = ["2025-02-15", "2025-02-16"]
        optional_leaves = ["2025-02-20", "2025-02-21"]
        
        data = {
            "month": month,
            "year": year,
            "monthly_leave_dates": monthly_leaves,
            "optional_leave_dates": optional_leaves,
            "wfh_dates": ["2025-02-25"],
            "additional_hours": "15-Feb-2025: 2 hours",
            "pending_leaves": 5,
            "total_days_off_dates": monthly_leaves + optional_leaves
        }
        
        success, response = self.run_test(
            "Submit leave application",
            "POST",
            "submit-leave",
            200,
            data=data
        )
        
        # Verify calculated_total_days_off field is returned and correct
        if success and 'submission' in response:
            calculated = response['submission'].get('calculated_total_days_off', 0)
            expected = len(monthly_leaves) + len(optional_leaves)
            
            if calculated == expected:
                self.log_result(
                    "Verify calculated_total_days_off field", 
                    True, 
                    f"Calculated value ({calculated}) matches expected ({expected})"
                )
            else:
                self.log_result(
                    "Verify calculated_total_days_off field", 
                    False, 
                    f"Calculated value ({calculated}) doesn't match expected ({expected})"
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
    
    def test_analytics(self, user_id, month, year):
        """Test analytics endpoint with calculated total days off"""
        success, response = self.run_test(
            "Get user analytics",
            "GET",
            f"analytics/{user_id}?month={month}&year={year}",
            200
        )
        
        # Verify calculated_total_days_off field is returned
        if success and 'calculated_total_days_off' in response:
            self.log_result(
                "Verify analytics calculated_total_days_off field", 
                True, 
                f"Field present with value: {response['calculated_total_days_off']}"
            )
        elif success:
            self.log_result(
                "Verify analytics calculated_total_days_off field", 
                False, 
                "Field missing from response"
            )
        
        return success, response

    def test_hr_analytics(self, month, year):
        """Test HR analytics endpoint with active employees only"""
        return self.run_test(
            "Get HR analytics",
            "GET",
            f"hr-analytics?month={month}&year={year}",
            200
        )

    def test_unauthorized_access(self):
        """Test unauthorized access to HR endpoints"""
        # First login as HR to create an employee
        hr_login_success = self.test_login("tejasai", "Tejas#2377")
        if not hr_login_success:
            return False
            
        # Create a new employee
        emp_id = f"EMP{random.randint(1000, 9999)}"
        self.test_create_employee(emp_id, "password123", "Test Department")
        
        # Now login as the employee
        emp_login_success = self.test_login(emp_id, "password123")
        if not emp_login_success:
            return False
            
        print(f"Current user role: {self.user.get('role') if self.user else 'None'}")
        
        # Try to access HR-only endpoint
        success, response = self.run_test(
            "Unauthorized access to HR endpoint",
            "GET",
            "all-submissions",
            403
        )
        
        print(f"Response from unauthorized access: {response}")
        
        # Try to access HR management endpoint
        success2, response2 = self.run_test(
            "Unauthorized access to HR management endpoint",
            "GET",
            "hr/employees",
            403
        )
        
        print(f"Response from unauthorized HR management access: {response2}")
        
        return success and success2

    # HR Management Endpoints Tests
    def test_create_employee(self, employee_id=None, password=None, department=None):
        """Test creating a new employee"""
        if not employee_id:
            employee_id = f"EMP{random.randint(1000, 9999)}"
        
        if not password:
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            
        if not department:
            department = random.choice(["Engineering", "Marketing", "Finance", "HR", "Operations"])
            
        data = {
            "name": f"Test Employee {employee_id}",
            "employee_id": employee_id,
            "password": password,
            "department": department
        }
        
        success, response = self.run_test(
            "Create new employee",
            "POST",
            "hr/create-employee",
            200,
            data=data
        )
        
        if success and 'employee' in response:
            self.created_employee_id = employee_id
            self.created_employee_uuid = response['employee']['id']
            
        return success, response

    def test_get_employees(self):
        """Test retrieving all employees"""
        success, response = self.run_test(
            "Get all employees",
            "GET",
            "hr/employees",
            200
        )
        
        # Verify our created employee is in the list
        if success and self.created_employee_id:
            found = False
            for emp in response.get('employees', []):
                if emp.get('employee_id') == self.created_employee_id:
                    found = True
                    break
                    
            self.log_result(
                "Verify created employee in list", 
                found, 
                f"Employee {self.created_employee_id} {'found' if found else 'not found'} in list"
            )
            
        return success, response

    def test_update_employee(self, employee_id=None):
        """Test updating an employee"""
        if not employee_id and self.created_employee_id:
            employee_id = self.created_employee_id
        elif not employee_id:
            # Create an employee first
            _, response = self.test_create_employee()
            employee_id = self.created_employee_id
            
        data = {
            "name": f"Updated Employee {employee_id}",
            "department": "Updated Department"
        }
        
        return self.run_test(
            f"Update employee {employee_id}",
            "PUT",
            f"hr/update-employee/{employee_id}",
            200,
            data=data
        )

    def test_revoke_access(self, employee_id=None):
        """Test revoking employee access"""
        if not employee_id and self.created_employee_id:
            employee_id = self.created_employee_id
        elif not employee_id:
            # Create an employee first
            _, response = self.test_create_employee()
            employee_id = self.created_employee_id
            
        return self.run_test(
            f"Revoke access for employee {employee_id}",
            "POST",
            f"hr/revoke-access/{employee_id}",
            200
        )

    def test_delete_employee(self, employee_id=None):
        """Test deleting an employee"""
        if not employee_id:
            # Create a temporary employee to delete
            temp_id = f"TEMP{random.randint(1000, 9999)}"
            _, response = self.test_create_employee(temp_id)
            employee_id = temp_id
            
        return self.run_test(
            f"Delete employee {employee_id}",
            "DELETE",
            f"hr/delete-employee/{employee_id}",
            200
        )

    def test_delete_month_data(self, month, year):
        """Test deleting month data"""
        return self.run_test(
            f"Delete data for {month}/{year}",
            "DELETE",
            f"hr/delete-month-data/{month}/{year}",
            200
        )

    def run_authentication_tests(self):
        """Run all authentication-related tests"""
        print("\n==== AUTHENTICATION TESTS ====")
        
        # Test HR login with new credentials
        hr_login = self.test_login("tejasai", "Tejas#2377")
        
        # Test that old dummy credentials no longer work
        self.test_old_credentials_login()
        
        # Test that inactive users cannot login
        self.test_inactive_user_login()
        
        return hr_login

    def run_hr_management_tests(self):
        """Run all HR management endpoint tests"""
        print("\n==== HR MANAGEMENT TESTS ====")
        
        # Login as HR if not already logged in
        if not self.user or self.user.get('role') != 'hr':
            if not self.test_login("tejasai", "Tejas#2377"):
                return False
        
        # Test creating a new employee
        self.test_create_employee()
        
        # Test getting all employees
        self.test_get_employees()
        
        # Test updating an employee
        self.test_update_employee()
        
        # Test revoking access
        self.test_revoke_access()
        
        # Test deleting an employee
        self.test_delete_employee()
        
        # Test deleting month data
        self.test_delete_month_data(2, 2025)
        
        return True

    def run_leave_submission_tests(self):
        """Run all leave submission tests"""
        print("\n==== LEAVE SUBMISSION TESTS ====")
        
        # Create a test employee
        if self.user and self.user.get('role') == 'hr':
            # Save HR credentials
            hr_token = self.token
            hr_user = self.user
            
            # Create employee
            emp_id = f"EMP{random.randint(1000, 9999)}"
            self.test_create_employee(emp_id, "password123", "Test Department")
            
            # Login as the employee
            self.test_login(emp_id, "password123")
        else:
            # Already logged in as employee or need to create one
            if not self.user:
                # Login as HR first
                if not self.test_login("tejasai", "Tejas#2377"):
                    return False
                
                # Create employee
                emp_id = f"EMP{random.randint(1000, 9999)}"
                self.test_create_employee(emp_id, "password123", "Test Department")
                
                # Login as the employee
                self.test_login(emp_id, "password123")
        
        # Test leave submission with total days calculation
        self.test_submit_leave(2, 2025)
        
        # Test retrieving submissions
        self.test_get_my_submissions()
        
        # Test analytics with calculated total days
        if self.user:
            self.test_analytics(self.user['id'], 2, 2025)
        
        return True

    def run_analytics_tests(self):
        """Run all analytics tests"""
        print("\n==== ANALYTICS TESTS ====")
        
        # Login as HR if not already
        if not self.user or self.user.get('role') != 'hr':
            if not self.test_login("tejasai", "Tejas#2377"):
                return False
        
        # Test HR analytics
        self.test_hr_analytics(2, 2025)
        
        return True

    def run_security_tests(self):
        """Run all security tests"""
        print("\n==== SECURITY TESTS ====")
        
        # Test unauthorized access to HR endpoints
        self.test_unauthorized_access()
        
        # Test inactive user login (already tested in authentication tests)
        
        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Leave Management System API Tests")
        
        # Run authentication tests
        self.run_authentication_tests()
        
        # Run HR management tests
        self.run_hr_management_tests()
        
        # Run leave submission tests
        self.run_leave_submission_tests()
        
        # Run analytics tests
        self.run_analytics_tests()
        
        # Run security tests
        self.run_security_tests()
        
        # Print summary
        print("\n==== TEST SUMMARY ====")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = LeaveManagementTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)