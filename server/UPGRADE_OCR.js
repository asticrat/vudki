// Simple adapter to use the new ThermalReceiptOCR in your server
//  Replace your existing OCR endpoint with this code:

const ThermalReceiptOCR = require('./ThermalReceiptOCR');
const path = require('path');

// Replace the POST /api/receipts/analyze endpoint with this:

/*
app.post('/api/receipts/analyze', authenticateToken, upload.single('receipt'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const imagePath = 'uploads/' + req.file.filename;
    const fullPath = req.file.path;

    try {
        console.log(`\n==== OCR Request for ${req.file.filename} ====`);
        
        // Initialize OCR engine
        // Mode options: 'low' (2 passes, fastest), 'medium' (6 passes, balanced), 'high' (15 passes, most accurate)
        const ocr = new ThermalReceiptOCR({ 
            mode: 'medium',
            logFile: path.join(__dirname, 'server_debug.log')
        });
        
        // Run multi-pass OCR
        const result = await ocr.processReceipt(fullPath);
        
        console.log(`OCR Complete: Amount=$${result.amount}, Date=${result.date}, Confidence=${JSON.stringify(result.confidence)}`);
        
        // Return result
        res.json({
            message: result.success ? 'Analysis complete' : 'Analysis complete with low confidence',
            data: {
                amount: result.amount || 0,
                date: result.date || new Date().toISOString().split('T')[0],
                description: 'Receipt',
                imagePath: imagePath,
                confidence: result.confidence,
                warning: result.warning,
                rawText: result.rawText
            }
        });

    } catch (error) {
        console.error("OCR Error:", error);
        res.status(500).send(error.message);
    }
});
*/

// INSTRUCTIONS:
// 1. Copy the code inside /* ... */ above
// 2. Replace your existing app.post('/api/receipts/analyze', ...) endpoint in index.js
// 3. Restart your server
// 4. Test with the Coles receipt

module.exports = ThermalReceiptOCR;
