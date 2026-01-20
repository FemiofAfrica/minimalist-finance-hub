from groq import Groq
from app.core.config import settings
import json
from typing import List, Dict, Any

class ParserService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.system_prompt = """
        You are a transaction parser for Kpege, a Nigerian personal finance app.
        Extract spending items from the user's message.

        Rules:
        - Handle formats: "2k" = 2000, "15k" = 15000, "N5000" = 5000, "₦5,000" = 5000.
        - Normalize all amounts to integers or floats without symbols.
        - Infer categories: lunch/dinner/eat → Food & Dining, uber/taxi/fuel/bolt → Transport, airtime/data/credit → Utilities, etc.
        - Categories must be one of: [Food & Dining, Transport, Utilities, Shopping, Transfers, Bills, Health, Education, Other].
        - Return ONLY a JSON list of objects: [{"item": "name", "amount": 123, "category": "category_name"}]
        - If no transactions are found, return an empty list: []
        """

    def parse_message(self, message: str) -> List[Dict[str, Any]]:
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": message}
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            content = chat_completion.choices[0].message.content
            data = json.loads(content)
            # Support both {"transactions": [...]} or just [...] depending on model behavior
            if isinstance(data, dict):
                # Look for a list in any key
                for val in data.values():
                    if isinstance(val, list):
                        return val
                return []
            return data if isinstance(data, list) else []
        except Exception as e:
            print(f"Error parsing message with Groq: {e}")
            return []

parser_service = ParserService()
