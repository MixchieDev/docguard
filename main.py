from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import base64
from typing import Dict, Any
import os
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Claude client
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.get("/")
def read_root():
    return {"message": "DocGuard AI Backend Running"}

@app.post("/analyze-receipt")
async def analyze_receipt(file: UploadFile = File(...)):
    """
    Analyze a receipt image using Claude Vision
    """
    try:
        # Read the image file
        contents = await file.read()
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Prepare the prompt for Claude
        prompt = """Analyze this Philippine receipt/bill image VERY CAREFULLY. This may be handwritten or printed.

CRITICAL FOR HANDWRITTEN RECEIPTS:
- ZOOM IN mentally on each number and letter
- Handwritten '7' often looks like '1' or '4'
- '5' might look like 'S' or '6'
- '8' might look like '0' or '6'
- Check if numbers make sense (₱50,000 for coffee is wrong, ₱50 is right)
- If unsure about a digit, look at the TOTAL and work backwards
- Check for written amounts in words (e.g., "Five hundred pesos")

Extract ALL the following information:

1. VENDOR/STORE NAME: Look at the top, may be stamped/printed/handwritten
2. VENDOR TIN (CRITICAL - LOOK CAREFULLY): 
   - Look EVERYWHERE on the receipt for TIN
   - Common formats: "TIN: 000-000-000-000" or "VAT Reg TIN: 000-000-000"
   - May appear as: "TIN#", "TIN No.", "VAT REG. TIN", "TIN:", "TAX ID"
   - Usually 12 digits with dashes: XXX-XXX-XXX-XXX or XXXXXXXXXXXX
   - Check: top header, after address, bottom footer, near business permit
   - For stores like SM, Mercury Drug - TIN is usually printed
   - RETURN NULL ONLY if you absolutely cannot find any TIN
3. INVOICE/OR NUMBER: Look for "OR#", "SI#", "Invoice No.", "Ref#", usually at top
4. TRANSACTION DATE: Not the printed date - the actual transaction date
5. TOTAL AMOUNT: 
   - For handwritten: CAREFULLY read each digit
   - Cross-check with item prices if visible
   - If total seems wrong, add up individual items

6. SALES BREAKDOWN:
   - VATable Sales (before VAT)
   - VAT-Exempt Sales  
   - Zero-Rated Sales
   - VAT Amount (12%)
   - Discount
   - Service Charge or Other Charges

7. EXPENSE CATEGORY - Identify the type:
   - Groceries: SM, Puregold, Robinsons Supermarket
   - Meals: restaurants, food
   - Utilities: Meralco, water, internet
   - Fuel: Petron, Shell, Caltex
   - Office Supplies: National Bookstore, paper, pens
   - Hardware/Maintenance: Ace, Handyman, paint, tools
   - Professional Services: consultancy, legal, accounting
   - Delivery: LBC, 2GO, Grab, Lalamove
   - Cleaning Services: janitorial
   - Condo Dues: association fees

8. ITEMS/DESCRIPTION: Main items purchased (brief)

HANDWRITING TIPS:
- Compare similar digits across the receipt
- A '1' is usually just a vertical line
- A '7' has a horizontal line at top
- Look for currency symbols ₱ or PHP to identify amounts
- Round numbers are more likely (₱500 not ₱527)

Return JSON format:
{
    "vendor": "exact business name",
    "vendorTIN": "000-000-000-000 or null",
    "referenceNumber": "OR/SI number or null", 
    "date": "YYYY-MM-DD or null",
    "amount": total_amount_number,
    "vatableSales": number_or_null,
    "vatExemptSales": 0,
    "zeroRatedSales": 0,
    "vatAmount": number_or_null,
    "discount": 0,
    "otherCharges": 0,
    "suggestedExpenseAccount": "account name",
    "items": "brief description",
    "confidence": 0-100,
    "isHandwritten": true/false,
    "handwritingNotes": "any specific issues reading the receipt",
    "rawText": "any other useful text"
}
IMPORTANT: If you find a TIN number ANYWHERE on the receipt, you MUST include it in the "vendorTIN" field of your JSON response. 

For example, if you see "VAT Reg. TIN 304-895-356-00000", then your JSON must include:
"vendorTIN": "304-895-356-00000"

Return JSON format:
{
    "vendor": "exact business name",
    "vendorTIN": "THE TIN NUMBER YOU FOUND or null",  <-- PUT THE TIN HERE!
    "referenceNumber": "OR/SI number or null", 
    ...rest of fields...
}

DO NOT just put the TIN in rawText - it MUST be in the vendorTIN field!

For handwritten amounts: If confidence is below 70%, include your best guess but note the uncertainty in handwritingNotes."""

        
        # Call Claude Vision API
        response = anthropic.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": file.content_type,
                                "data": base64_image
                            }
                        }
                    ]
                }
            ]
        )
        
        # Parse Claude's response
        import json
        result_text = response.content[0].text
        
        # Try to extract JSON from the response
        try:
            # Find JSON in the response
            start = result_text.find('{')
            end = result_text.rfind('}') + 1
            json_str = result_text[start:end]
            result = json.loads(json_str)
        except:
            # Fallback if JSON parsing fails
            result = {
                "vendor": "Unable to parse",
                "amount": 0.0,
                "netOfVat": None,
                "vatAmount": None,
                "discount": 0,
                "date": None,
                "receiptType": "Unknown",
                "referenceNumber": None,
                "items": result_text[:100],
                "confidence": 0,
                "isHandwritten": False,
                "rawText": result_text
            }
        
        return {
            "success": True,
            "data": result,
            "message": "Receipt analyzed successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to analyze receipt"
        }

@app.post("/test-receipt")
async def test_receipt():
    """
    Test endpoint that returns mock data without calling AI
    """
    return {
        "success": True,
        "data": {
            "vendor": "Ace Hardware Philippines",
            "amount": 2750.00,
            "date": "2024-05-28",
            "receiptType": "Official Receipt",
            "referenceNumber": "OR-123456",
            "items": "Paint supplies, brushes",
            "confidence": 95,
            "rawText": "Sample receipt data"
        },
        "message": "Test receipt data"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)