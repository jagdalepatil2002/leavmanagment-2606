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
    # Check if users already exist
    existing_users = await db.users.count_documents({})
    if existing_users == 0:
        sample_users = [
            {
                "id": str(uuid.uuid4()),
                "name": "Tejas Jagdale",
                "employee_id": "EMP001",
                "password": "pass123",
                "role": "employee"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Aniket Vadar",
                "employee_id": "EMP002",
                "password": "pass123",
                "role": "employee"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Priya Sharma",
                "employee_id": "EMP003",
                "password": "pass123",
                "role": "employee"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Rahul Patel",
                "employee_id": "EMP004",
                "password": "pass123",
                "role": "employee"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Sneha Desai",
                "employee_id": "EMP005",
                "password": "pass123",
                "role": "employee"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "HR Admin",
                "employee_id": "HR001",
                "password": "hr123",
                "role": "hr"
            }
        ]
        await db.users.insert_many(sample_users)
        print("Sample users created successfully!")

# Routes
@app.get("/api/")
async def root():
    return {"message": "Leave Management System API"}

@app.post("/api/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({
        "employee_id": request.employee_id,
        "password": request.password
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create a simple token (in production, use proper JWT)
    token = json.dumps({
        "id": user["id"],
        "name": user["name"],
        "employee_id": user["employee_id"],
        "role": user["role"]
    })
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "employee_id": user["employee_id"],
            "role": user["role"]
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
async def get_my_submissions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can view their submissions")
    
    submissions = []
    async for submission in db.leave_submissions.find({"user_id": current_user["id"]}):
        submission.pop("_id", None)  # Remove MongoDB ObjectId
        submissions.append(submission)
    
    return {"submissions": submissions}

@app.get("/api/all-submissions")
async def get_all_submissions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can view all submissions")
    
    submissions = []
    async for submission in db.leave_submissions.find({}):
        submission.pop("_id", None)  # Remove MongoDB ObjectId
        submissions.append(submission)
    
    return {"submissions": submissions}

@app.get("/api/export-excel")
async def export_excel(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR can export data")
    
    submissions = []
    async for submission in db.leave_submissions.find({}):
        submission.pop("_id", None)
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
    
    return StreamingResponse(
        BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leave_submissions.xlsx"}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)