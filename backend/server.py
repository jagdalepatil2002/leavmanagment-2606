from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import motor.motor_asyncio
import uuid
from datetime import datetime, timedelta
import pandas as pd
from io import BytesIO
import json
import calendar

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client.leave_management

app = FastAPI(title="Leave Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Pydantic models
class User(BaseModel):
    id: str
    name: str
    employee_id: str
    password: str
    role: str  # 'employee' or 'hr'
    department: Optional[str] = None
    active: bool = True

class CreateEmployeeRequest(BaseModel):
    name: str
    employee_id: str
    password: str
    department: Optional[str] = None

class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    department: Optional[str] = None
    active: Optional[bool] = None

class LoginRequest(BaseModel):
    employee_id: str
    password: str

class LeaveSubmission(BaseModel):
    id: str
    user_id: str
    employee_name: str
    employee_id: str
    month: int
    year: int
    monthly_leave_dates: List[str]
    optional_leave_dates: List[str]
    wfh_dates: List[str]
    additional_hours: str
    pending_leaves: int
    total_days_off_dates: List[str]
    submitted_at: str

class LeaveSubmissionRequest(BaseModel):
    month: int
    year: int
    monthly_leave_dates: List[str]
    optional_leave_dates: List[str]
    wfh_dates: List[str]
    additional_hours: str
    pending_leaves: int
    total_days_off_dates: List[str]

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # In a real app, you'd verify JWT tokens. For MVP, we'll use simple session-like approach
        user_data = json.loads(token)
        user = await db.users.find_one({"id": user_data["id"]})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize sample data
@app.on_event("startup")
async def startup_event():
    # Check if HR user already exists
    existing_hr = await db.users.count_documents({"role": "hr"})
    if existing_hr == 0:
        # Create only the HR admin user
        hr_user = {
            "id": str(uuid.uuid4()),
            "name": "HR Admin",
            "employee_id": "tejasai",
            "password": "Tejas#2377",
            "role": "hr",
            "department": "Human Resources",
            "active": True
        }
        await db.users.insert_one(hr_user)
        print("HR admin user created successfully!")

# Routes
@app.get("/api/")
async def root():
    return {"message": "Leave Management System API"}

@app.post("/api/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({
        "employee_id": request.employee_id,
        "password": request.password,
        "active": True  # Only allow active users to login
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create a simple token (in production, use proper JWT)
    token = json.dumps({
        "id": user["id"],
        "name": user["name"],
        "employee_id": user["employee_id"],
        "role": user["role"],
        "department": user.get("department")
    })
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "employee_id": user["employee_id"],
            "role": user["role"],
            "department": user.get("department")
        }
    }

@app.post("/api/submit-leave")
async def submit_leave(request: LeaveSubmissionRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can submit leave")
    
    # Check if submission already exists for this month/year
    existing = await db.leave_submissions.find_one({
        "user_id": current_user["id"],
        "month": request.month,
        "year": request.year
    })
    
    submission_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "employee_name": current_user["name"],
        "employee_id": current_user["employee_id"],
        "month": request.month,
        "year": request.year,
        "monthly_leave_dates": request.monthly_leave_dates,
        "optional_leave_dates": request.optional_leave_dates,
        "wfh_dates": request.wfh_dates,
        "additional_hours": request.additional_hours,
        "pending_leaves": request.pending_leaves,
        "total_days_off_dates": request.total_days_off_dates,
        "submitted_at": datetime.now().isoformat()
    }
    
    if existing:
        # Update existing submission
        await db.leave_submissions.update_one(
            {"_id": existing["_id"]},
            {"$set": submission_data}
        )
        message = "Leave submission updated successfully"
    else:
        # Create new submission
        await db.leave_submissions.insert_one(submission_data)
        message = "Leave submission created successfully"
    
    # Remove MongoDB _id field before returning
    submission_data.pop("_id", None)
    return {"message": message, "submission": submission_data}

@app.get("/api/my-submissions")
async def get_my_submissions(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can view their submissions")
    
    filter_query = {"user_id": current_user["id"]}
    if month:
        filter_query["month"] = month
    if year:
        filter_query["year"] = year
    
    submissions = []
    async for submission in db.leave_submissions.find(filter_query).sort("year", -1).sort("month", -1):
        submission.pop("_id", None)  # Remove MongoDB ObjectId
        submissions.append(submission)
    
    return {"submissions": submissions}

@app.get("/api/all-submissions")
async def get_all_submissions(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view all submissions")
    
    filter_query = {}
    if month:
        filter_query["month"] = month
    if year:
        filter_query["year"] = year
    
    submissions = []
    async for submission in db.leave_submissions.find(filter_query).sort("year", -1).sort("month", -1):
        submission.pop("_id", None)  # Remove MongoDB ObjectId
        submissions.append(submission)
    
    return {"submissions": submissions}

@app.delete("/api/delete-submission/{submission_id}")
async def delete_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can delete submissions")
    
    result = await db.leave_submissions.delete_one({"id": submission_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Submission deleted successfully"}

@app.get("/api/export-excel")
async def export_excel(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can export data")
    
    filter_query = {}
    if month:
        filter_query["month"] = month
    if year:
        filter_query["year"] = year
    
    submissions = []
    async for submission in db.leave_submissions.find(filter_query).sort("year", -1).sort("month", -1):
        submission.pop("_id", None)  # Remove MongoDB ObjectId
        submissions.append(submission)
    
    if not submissions:
        raise HTTPException(status_code=404, detail="No submissions found")
    
    # Create DataFrame
    df_data = []
    for sub in submissions:
        df_data.append({
            "Employee Name": sub["employee_name"],
            "Employee ID": sub["employee_id"],
            "Month": sub["month"],
            "Year": sub["year"],
            "Monthly Leave Dates": ", ".join(sub["monthly_leave_dates"]),
            "Optional Leave Dates": ", ".join(sub["optional_leave_dates"]),
            "Work From Home Dates": ", ".join(sub["wfh_dates"]),
            "Additional Hours": sub["additional_hours"],
            "Pending Leaves": sub["pending_leaves"],
            "Total Days Off": ", ".join(sub["total_days_off_dates"]),
            "Submitted At": sub["submitted_at"]
        })
    
    df = pd.DataFrame(df_data)
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Leave Submissions', index=False)
    
    output.seek(0)
    
    filename = f"leave_submissions"
    if month and year:
        filename += f"_{year}_{month:02d}"
    elif year:
        filename += f"_{year}"
    filename += ".xlsx"
    
    return StreamingResponse(
        BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/leave-stats/{user_id}")
async def get_leave_stats(user_id: str, year: int, current_user: dict = Depends(get_current_user)):
    # Calculate yearly leave statistics
    submissions = []
    async for submission in db.leave_submissions.find({"user_id": user_id, "year": year}):
        submissions.append(submission)
    
    total_optional_leaves = sum(len(sub["optional_leave_dates"]) for sub in submissions)
    remaining_optional_leaves = max(0, 6 - total_optional_leaves)
    
    return {
        "total_optional_leaves_used": total_optional_leaves,
        "remaining_optional_leaves": remaining_optional_leaves,
        "submissions_count": len(submissions)
    }

@app.get("/api/analytics/{user_id}")
async def get_analytics(user_id: str, month: int, year: int, current_user: dict = Depends(get_current_user)):
    # Get submission for specific month
    submission = await db.leave_submissions.find_one({
        "user_id": user_id,
        "month": month,
        "year": year
    })
    
    if not submission:
        # Return default data for months without submissions
        days_in_month = calendar.monthrange(year, month)[1]
        return {
            "working_days": days_in_month - 8,  # Assuming ~8 weekends
            "leave_days": 0,
            "wfh_days": 0,
            "total_days": days_in_month,
            "month_name": calendar.month_name[month],
            "year": year
        }
    
    # Calculate days
    days_in_month = calendar.monthrange(year, month)[1]
    weekends = sum(1 for i in range(1, days_in_month + 1) 
                   if datetime(year, month, i).weekday() >= 5)
    
    total_leave_days = len(submission["monthly_leave_dates"]) + len(submission["optional_leave_dates"]) + len(submission["total_days_off_dates"])
    wfh_days = len(submission["wfh_dates"])
    working_days = days_in_month - weekends - total_leave_days
    
    return {
        "working_days": max(0, working_days),
        "leave_days": total_leave_days,
        "wfh_days": wfh_days,
        "total_days": days_in_month,
        "month_name": calendar.month_name[month],
        "year": year,
        "weekends": weekends
    }

@app.get("/api/hr-analytics")
async def get_hr_analytics(month: int, year: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view analytics")
    
    # Get all submissions for the month
    submissions = []
    async for submission in db.leave_submissions.find({"month": month, "year": year}):
        submissions.append(submission)
    
    # Calculate overall statistics
    total_employees = await db.users.count_documents({"role": "employee"})
    employees_submitted = len(set(sub["user_id"] for sub in submissions))
    
    total_leave_days = sum(
        len(sub["monthly_leave_dates"]) + len(sub["optional_leave_dates"]) + len(sub["total_days_off_dates"])
        for sub in submissions
    )
    
    total_wfh_days = sum(len(sub["wfh_dates"]) for sub in submissions)
    
    # Days in month calculation
    days_in_month = calendar.monthrange(year, month)[1]
    weekends = sum(1 for i in range(1, days_in_month + 1) 
                   if datetime(year, month, i).weekday() >= 5)
    
    working_days_possible = (days_in_month - weekends) * employees_submitted
    actual_working_days = working_days_possible - total_leave_days
    
    return {
        "total_employees": total_employees,
        "employees_submitted": employees_submitted,
        "total_leave_days": total_leave_days,
        "total_wfh_days": total_wfh_days,
        "working_days": max(0, actual_working_days),
        "month_name": calendar.month_name[month],
        "year": year,
        "submission_rate": round((employees_submitted / total_employees) * 100, 1) if total_employees > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)