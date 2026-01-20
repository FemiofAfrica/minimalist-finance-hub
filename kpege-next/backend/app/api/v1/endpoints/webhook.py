from fastapi import APIRouter, Request, HTTPException, Query
from app.core.config import settings
from sqlmodel import Session, select
from app.core.database import engine
from app.models import User, Transaction
from app.services.parser import parser_service
from app.services.messaging import messaging_service
from datetime import datetime
import json

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge"),
):
    """
    Verifies the webhook subscription with Meta.
    """
    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def webhook_handler(request: Request):
    payload = await request.json()
    print(f"DEBUG: Webhook POST received from {request.client.host}")
    print(f"DEBUG: Raw Payload: {json.dumps(payload)}")
    
    # Process WhatsApp Webhook
    try:
        # WhatsApp sends a list of changes
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Check for status updates (sent, delivered, etc.)
                if "statuses" in value:
                    print(f"DEBUG: Message status update: {value['statuses'][0]['status']}")
                    continue
                
                # Check for messages
                if "messages" not in value:
                    print(f"DEBUG: Change field '{change.get('field')}' has no messages.")
                    continue
                    
                message = value["messages"][0]
                from_number = message.get("from")
                body = message.get("text", {}).get("body", "")
                
                if not body:
                    print("DEBUG: Webhook received but text body is empty.")
                    return {"status": "ok"}
            
        print(f"Processing message from {from_number}: {body}")
            
        with Session(engine) as session:
            # 1. Check if user exists, create if not
            user = session.get(User, from_number)
            if not user:
                contact_name = value.get("contacts", [{}])[0].get("profile", {}).get("name", "New Friend")
                user = User(phone=from_number, name=contact_name)
                session.add(user)
                session.commit()
                session.refresh(user)
            
            # 2. Parse the message
            parsed_items = parser_service.parse_message(body)
            print(f"Groq parsed items: {parsed_items}")
            
            if not parsed_items:
                print(f"Failed to parse message: {body}")
                messaging_service.send_text_message(
                    from_number, 
                    "I couldn't quite catch that. Could you tell me what you spent and how much? (e.g., 'lunch 2000')"
                )
                return {"status": "parsed_failed"}

            # 3. Save transactions and build reply
            reply_text = "Got it! ✅\n\n"
            total_today = 0
            
            for item in parsed_items:
                txn = Transaction(
                    user_phone=from_number,
                    amount=item.get("amount", 0),
                    description=item.get("item", "unnamed"),
                    category=item.get("category", "Other"),
                    raw_input=body
                )
                session.add(txn)
                reply_text += f"• {txn.category}: ₦{txn.amount:,.2f} ({txn.description})\n"
                total_today += txn.amount
            
            user.last_interaction = datetime.utcnow()
            session.add(user)
            session.commit()
            
            reply_text += f"\nTotal logged: ₦{total_today:,.2f}\nSee you next check-in! 💚"
            
            # 4. Send confirmation
            messaging_service.send_text_message(from_number, reply_text)
            
    except Exception as e:
        print(f"Error processing webhook: {e}")
        # Don't throw error to Meta or they might stop sending retries/webhooks
    
    return {"status": "ok"}
