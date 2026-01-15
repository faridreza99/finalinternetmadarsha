import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import uuid
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Form, Body
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from bson import ObjectId

from student_utils import resolve_student_identity, get_student_fee_structure

logger = logging.getLogger(__name__)

# --- Models ---

class PaymentGatewaySettings(BaseModel):
    store_id: str
    store_passwd: str
    is_sandbox: bool = True
    is_active: bool = True

class PaymentInitiateRequest(BaseModel):
    months: List[str] # List of month names to pay for
    year: int

# --- Service ---

class SSLCommerzService:
    def __init__(self, settings: Dict[str, Any]):
        self.store_id = settings.get('store_id')
        self.store_passwd = settings.get('store_passwd')
        self.is_sandbox = settings.get('is_sandbox', True)
        
        if self.is_sandbox:
            self.base_url = "https://sandbox.sslcommerz.com"
        else:
            self.base_url = "https://securepay.sslcommerz.com"
            
    def initiate_session(self, data: Dict[str, Any]) -> str:
        api_url = f"{self.base_url}/gwprocess/v4/api.php"
        
        post_data = {
            'store_id': self.store_id,
            'store_passwd': self.store_passwd,
            'total_amount': data['amount'],
            'currency': "BDT",
            'tran_id': data['tran_id'],
            'success_url': data['success_url'],
            'fail_url': data['fail_url'],
            'cancel_url': data['cancel_url'],
            'emi_option': 0,
            'cus_name': data['cus_name'],
            'cus_email': data.get('cus_email', 'test@test.com'),
            'cus_add1': data.get('cus_add1', 'Dhaka'),
            'cus_city': data.get('cus_city', 'Dhaka'),
            'cus_country': "Bangladesh",
            'cus_phone': data.get('cus_phone', '01711111111'),
            'shipping_method': "NO",
            'product_name': "School Fees",
            'product_category': "Service",
            'product_profile': "general"
        }
        
        try:
            logger.info(f"Initiating SSLCommerz Session: {post_data['tran_id']} - {post_data['total_amount']}")
            response = requests.post(api_url, data=post_data)
            response_data = response.json()
            
            if response_data.get('status') == 'SUCCESS':
                return response_data.get('GatewayPageURL')
            else:
                logger.error(f"SSLCommerz Init Failed: {response_data}")
                raise Exception(f"Payment Gateway Error: {response_data.get('failedreason')}")
                
        except Exception as e:
            logger.error(f"SSLCommerz Connection Error: {e}")
            raise

    def validate_transaction(self, val_id: str) -> Dict[str, Any]:
        api_url = f"{self.base_url}/validator/api/validationserverAPI.php"
        
        params = {
            'val_id': val_id,
            'store_id': self.store_id,
            'store_passwd': self.store_passwd,
            'format': 'json'
        }
        
        try:
            response = requests.get(api_url, params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Validation Error: {e}")
            return {"status": "FAILED"}

# --- Routes Setup ---

def setup_payment_gateway_routes(router, db, get_current_user):
    
    @router.post("/setup/payment-gateway")
    async def save_payment_gateway_settings(
        settings: PaymentGatewaySettings,
        request: Request,
        current_user = Depends(get_current_user)
    ):
        if current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized")
            
        tenant_id = current_user.tenant_id
        
        data = settings.dict()
        data['tenant_id'] = tenant_id
        data['updated_at'] = datetime.utcnow()
        
        await db.payment_settings.update_one(
            {"tenant_id": tenant_id},
            {"$set": data},
            upsert=True
        )
        
        return {"success": True, "message": "পেমেন্ট গেটওয়ে সেটিংস সংরক্ষণ করা হয়েছে"}

    @router.get("/setup/payment-gateway")
    async def get_payment_gateway_settings(
        request: Request,
        current_user = Depends(get_current_user)
    ):
        if current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized")
            
        tenant_id = current_user.tenant_id
        
        settings = await db.payment_settings.find_one({"tenant_id": tenant_id})
        
        if not settings:
            return {"store_id": "", "store_passwd": "", "is_sandbox": True, "is_active": False}
            
        return {
            "store_id": settings.get('store_id'),
            "store_passwd": settings.get('store_passwd'),
            "is_sandbox": settings.get('is_sandbox', True),
            "is_active": settings.get('is_active', True)
        }

    @router.post("/student/payment/initiate")
    async def initiate_student_payment(
        data: PaymentInitiateRequest,
        request: Request,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            
            # 1. Get Settings
            settings = await db.payment_settings.find_one({"tenant_id": tenant_id})
            if not settings or not settings.get('is_active'):
                 raise HTTPException(status_code=400, detail="অনলাইন পেমেন্ট বর্তমানে বন্ধ আছে")
                 
            # 2. Get Student
            student = await resolve_student_identity(db, current_user)
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
                
            # 3. Calculate Amount
            fee_structure = await get_student_fee_structure(db, tenant_id, student)
            monthly_fee = fee_structure.get('monthly_total', 0)
            
            if monthly_fee <= 0:
                 raise HTTPException(status_code=400, detail="মাসিক ফি নির্ধারণ করা হয়নি")
                 
            total_amount = monthly_fee * len(data.months)
            
            if total_amount <= 0:
                raise HTTPException(status_code=400, detail="Invalid amount")
            
            # 4. Generate Tran ID
            tran_id = f"SSLC_{uuid.uuid4().hex[:12].upper()}"
            
            # 5. Save Transaction Record (Pending)
            transaction = {
                "tenant_id": tenant_id,
                "tran_id": tran_id,
                "student_id": student.get('student_id') or student.get('id'),
                "student_name": student.get('name'),
                "student_uid": str(student.get('_id')), # internal ID
                "amount": total_amount,
                "months": data.months,
                "year": data.year,
                "status": "pending",
                "created_at": datetime.utcnow(),
                "gateway": "sslcommerz"
            }
            await db.payment_transactions.insert_one(transaction)
            
            # 6. Call Gateway
            service = SSLCommerzService(settings)
            
            # Construct Callback URLs
            base_url = str(request.base_url).rstrip('/')
            # NOTE: For localhost, these need to be accessible. 
            # In production, they are fine.
            # We will use /public/payment/* endpoints
            
            session_data = {
                'amount': total_amount,
                'tran_id': tran_id,
                'success_url': f"{base_url}/api/public/payment/success",
                'fail_url': f"{base_url}/api/public/payment/fail",
                'cancel_url': f"{base_url}/api/public/payment/cancel",
                'cus_name': student.get('name', 'Student'),
                'cus_email': student.get('email', 'no-email@example.com'),
                'cus_phone': student.get('phone') or student.get('parent_phone', '01700000000')
            }
            
            gateway_url = service.initiate_session(session_data)
            
            return {"gateway_url": gateway_url}
            
        except Exception as e:
            logger.error(f"Payment Initiation Error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # --- Public Callbacks (No Auth Required) ---
    
    @router.post("/public/payment/success")
    async def payment_success(request: Request):
        form_data = await request.form()
        val_id = form_data.get('val_id')
        tran_id = form_data.get('tran_id') # SSLC sends tran_id too usually
        
        logger.info(f"Payment Success Callback: {val_id} {tran_id}")
        
        if not val_id or not tran_id:
             # Basic handling
             return RedirectResponse(url="/student/payment/fail?reason=invalid_callback")
             
        # Find Transaction
        transaction = await db.payment_transactions.find_one({"tran_id": tran_id})
        if not transaction:
             return RedirectResponse(url="/student/payment/fail?reason=tran_not_found")
             
        tenant_id = transaction['tenant_id']
        
        # Get Settings
        settings = await db.payment_settings.find_one({"tenant_id": tenant_id})
        service = SSLCommerzService(settings)
        
        validation = service.validate_transaction(val_id)
        
        if validation.get('status') == 'VALID' or validation.get('status') == 'VALIDATED':
            # 1. Update Transaction
            await db.payment_transactions.update_one(
                {"_id": transaction['_id']},
                {"$set": {
                    "status": "success", 
                    "val_id": val_id, 
                    "validated_at": datetime.utcnow(),
                    "payment_details": validation
                }}
            )
            
            # 2. Assign Payments to monthly_payments collection
            # "এডমিন প্যানেলের ফি আদায়ে সেই ছাত্রের পেমেন্ট হিস্টোরী তে এড হবে"
            
            student_id = transaction['student_id']
            months = transaction['months'] # e.g. ['January', 'February']
            year = transaction['year']
            amount_per_month = transaction['amount'] / len(months)
            
            # Create/Update monthly payment records
            for month in months:
                existing = await db.monthly_payments.find_one({
                    "tenant_id": tenant_id,
                    "student_id": student_id,
                    "month": month,
                    "year": year
                })
                
                payment_record = {
                    "tenant_id": tenant_id,
                    "student_id": student_id,
                    "month": month,
                    "year": year,
                    "amount": amount_per_month,
                    "status": "paid", # Mark as paid
                    "payment_date": datetime.utcnow(),
                    "payment_method": "sslcommerz",
                    "tran_id": tran_id,
                    "collected_by": "online",
                    "receipt_no": f"RCP-{uuid.uuid4().hex[:8].upper()}"
                }
                
                if existing:
                    # Update if exists? Usually we shouldn't double pay.
                    # But if it was pending or partial... let's just update
                    await db.monthly_payments.update_one(
                        {"_id": existing['_id']},
                        {"$set": payment_record}
                    )
                else:
                    await db.monthly_payments.insert_one(payment_record)
            
            # Redirect to Frontend Success
            # Need to know frontend URL. Assuming relative path works or standard port.
            # Check Origin? 
            # Using standard path /student/payment/success
            return RedirectResponse(url="/student/payment/success?tran_id=" + tran_id, status_code=303)
            
        else:
            await db.payment_transactions.update_one(
                {"_id": transaction['_id']},
                {"$set": {"status": "failed", "validation_response": validation}}
            )
            return RedirectResponse(url="/student/payment/fail", status_code=303)

    @router.post("/public/payment/fail")
    async def payment_fail(request: Request):
        form_data = await request.form()
        tran_id = form_data.get('tran_id')
        
        if tran_id:
            await db.payment_transactions.update_one(
                {"tran_id": tran_id},
                {"$set": {"status": "failed", "failed_at": datetime.utcnow()}}
            )
            
        return RedirectResponse(url="/student/payment/fail", status_code=303)

    @router.post("/public/payment/cancel")
    async def payment_cancel(request: Request):
        form_data = await request.form()
        tran_id = form_data.get('tran_id')
        
        if tran_id:
            await db.payment_transactions.update_one(
                {"tran_id": tran_id},
                {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}}
            )
            
        return RedirectResponse(url="/student/payment/fail?reason=cancelled", status_code=303)

    logger.info("Payment Gateway Routes Registered")
