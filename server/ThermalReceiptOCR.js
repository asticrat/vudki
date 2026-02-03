// Production Thermal Receipt OCR Implementation
// Based on THERMAL_RECEIPT_OCR_GUIDE.md

const { Jimp } = require('jimp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

class ThermalReceiptOCR {
    constructor(config = {}) {
        this.mode = config.mode || 'medium'; // low, medium, high
        this.logFile = config.logFile || path.join(__dirname, 'ocr_debug.log');

        // Mode configurations (CPU vs accuracy tradeoffs)
        this.modeConfig = {
            low: { variants: ['default', 'high_contrast'], psms: [6], maxPasses: 2 },
            medium: { variants: ['default', 'high_contrast', 'threshold'], psms: [6, 4], maxPasses: 6 },
            high: { variants: ['default', 'high_contrast', 'threshold', 'sharpen', 'denoise'], psms: [6, 4, 3], maxPasses: 15 }
        };

        this.config = this.modeConfig[this.mode];
    }

    log(msg) {
        const entry = `[${new Date().toISOString()}] ${msg}\n`;
        try {
            fs.appendFile(this.logFile, entry).catch(() => { });
        } catch (e) { }
        console.log(msg);
    }

    // Main entry point
    async processReceipt(imagePath) {
        try {
            this.log(`\n=== Starting OCR for ${path.basename(imagePath)} ===`);

            // Run multi-pass OCR
            const result = await this.multiPassOCR(imagePath);

            // Evaluate quality
            const quality = this.evaluateQuality(result);
            this.log(`Quality Score: ${quality.score}/100 - Verdict: ${quality.verdict}`);

            if (quality.verdict === 'ACCEPT') {
                this.log(`✓ OCR Success - Amount: $${result.amount}, Date: ${result.date}`);
                return {
                    success: true,
                    amount: result.amount,
                    date: result.date,
                    confidence: result.confidence,
                    source: 'local',
                    rawText: result.rawText
                };
            }

            this.log(`⚠ Low confidence OCR result`);
            return {
                success: false,
                amount: result.amount || 0,
                date: result.date || null,
                confidence: result.confidence,
                source: 'local_low_confidence',
                warning: 'OCR confidence is low - please verify manually',
                rawText: result.rawText
            };

        } catch (error) {
            this.log(`✗ OCR Error: ${error.message}`);
            throw error;
        }
    }

    // Multi-pass OCR with different preprocessing variants
    async multiPassOCR(imagePath) {
        const { variants, psms } = this.config;
        const allResults = [];

        this.log(`Running ${variants.length} preprocessing variants × ${psms.length} PSM modes = ${variants.length * psms.length} passes`);

        for (const variant of variants) {
            try {
                const processed = await this.preprocess(imagePath, variant);
                const tempPath = path.join(__dirname, 'uploads', `temp_${variant}_${Date.now()}.jpg`);
                await processed.write(tempPath);

                for (const psm of psms) {
                    try {
                        this.log(`  Pass: variant=${variant}, PSM=${psm}`);

                        const { data } = await Tesseract.recognize(tempPath, 'eng', {
                            tessedit_pageseg_mode: psm,
                            tessedit_ocr_engine_mode: 3, // LSTM only
                            logger: () => { } // Suppress verbose logs
                        });

                        allResults.push({
                            variant,
                            psm,
                            text: data.text,
                            confidence: data.confidence,
                            words: data.words
                        });

                        this.log(`    Confidence: ${data.confidence.toFixed(1)}%`);

                    } catch (ocrError) {
                        this.log(`    OCR error: ${ocrError.message}`);
                    }
                }

                // Clean up temp file
                await fs.unlink(tempPath).catch(() => { });

            } catch (preprocessError) {
                this.log(`  Preprocessing error for ${variant}: ${preprocessError.message}`);
            }
        }

        if (allResults.length === 0) {
            throw new Error('All OCR passes failed');
        }

        // Select and merge best results
        return this.selectBestResults(allResults);
    }

    // Preprocessing with different variants
    async preprocess(imagePath, variant) {
        this.log(`  Preprocessing: ${variant}`);
        let image = await Jimp.read(imagePath);

        // Step 1: Grayscale
        image.greyscale();

        // Step 2: Resize to optimal dimensions (minimum 1200px width for thermal receipts)
        if (image.bitmap.width < 1200) {
            const scale = Math.ceil(1200 / image.bitmap.width);
            this.log(`    Upscaling ${scale}x to ${image.bitmap.width * scale}px width`);
            image.resize({ w: image.bitmap.width * scale, h: image.bitmap.height * scale });
        }

        // Limit maximum size (Raspberry Pi memory constraints)
        if (image.bitmap.width > 2400) {
            const scale = 2400 / image.bitmap.width;
            this.log(`    Downscaling to 2400px width`);
            image.resize({ w: 2400, h: Math.floor(image.bitmap.height * scale) });
        }

        // Step 3: Normalize (expand dynamic range)
        image.normalize();

        // Step 4: Apply variant-specific processing
        switch (variant) {
            case 'high_contrast':
                // Strong contrast boost for faded thermal paper
                image.contrast(0.9);
                this.log(`    Applied high contrast (0.9)`);
                break;

            case 'threshold':
                // Adaptive binary threshold
                const avgBrightness = this.calculateAverageBrightness(image);
                const threshold = avgBrightness * 0.65; // 65% of average (tuned for thermal paper)
                this.log(`    Adaptive threshold: ${threshold.toFixed(1)} (avg: ${avgBrightness.toFixed(1)})`);
                this.applyAdaptiveThreshold(image, threshold);
                break;

            case 'sharpen':
                // Sharpening for blurry photos
                image.contrast(0.7);
                image.convolute([
                    [0, -1, 0],
                    [-1, 5, -1],
                    [0, -1, 0]
                ]);
                this.log(`    Applied sharpening`);
                break;

            case 'denoise':
                // Light blur + contrast for grainy photos
                image.blur(1); // Very light blur
                image.contrast(0.8);
                this.log(`    Applied denoising (blur=1, contrast=0.8)`);
                break;

            default: // 'default'
                // Conservative preprocessing - preserves all text
                image.contrast(0.6);
                this.log(`    Applied default contrast (0.6)`);
        }

        return image;
    }

    calculateAverageBrightness(image) {
        let total = 0;
        let count = 0;
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            total += this.bitmap.data[idx];
            count++;
        });
        return total / count;
    }

    applyAdaptiveThreshold(image, threshold) {
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const gray = this.bitmap.data[idx];
            // Thermal ink is darker than background, so < threshold = black
            const newVal = gray < threshold ? 0 : 255;
            this.bitmap.data[idx] = newVal;
            this.bitmap.data[idx + 1] = newVal;
            this.bitmap.data[idx + 2] = newVal;
        });
    }

    // Select best results from all passes
    selectBestResults(results) {
        this.log(`\n  Analyzing ${results.length} OCR results...`);

        // Extract amount and date from each result
        const candidates = results.map(r => {
            const amount = this.extractAmount(r.text, r.words);
            const date = this.extractDate(r.text, r.words);

            return {
                amount,
                date,
                rawText: r.text,
                overallConfidence: r.confidence,
                variant: r.variant,
                psm: r.psm
            };
        });

        // Log all candidates
        candidates.forEach((c, i) => {
            this.log(`    Result ${i + 1}: Amount=$${c.amount.value} (conf=${c.amount.confidence.toFixed(1)}%), Date=${c.date?.value || 'none'} (${c.variant}, PSM${c.psm})`);
        });

        // Select best amount (highest confidence)
        const validAmounts = candidates.filter(c => c.amount.value > 0 && c.amount.confidence > 30);
        const bestAmount = validAmounts.sort((a, b) => b.amount.confidence - a.amount.confidence)[0];

        // Select best date (highest confidence)
        const validDates = candidates.filter(c => c.date?.value && c.date.confidence > 40);
        const bestDate = validDates.sort((a, b) => b.date.confidence - a.date.confidence)[0];

        this.log(`\n  Best Amount: $${bestAmount?.amount.value || 0} from ${bestAmount?.variant || 'none'}`);
        this.log(`  Best Date: ${bestDate?.date?.value || 'not found'} from ${bestDate?.variant || 'none'}`);

        return {
            amount: bestAmount?.amount.value || 0,
            date: bestDate?.date?.value || null,
            confidence: {
                amount: bestAmount?.amount.confidence || 0,
                date: bestDate?.date?.confidence || 0
            },
            rawText: candidates[0]?.rawText || ''
        };
    }

    // Extract amount from OCR text
    extractAmount(text, words) {
        const lines = text.split('\n').map(l => l.trim());
        const candidates = [];

        // Strategy 1: Look for "TOTAL" or similar keywords
        const totalKeywords = /(?:total|amount|balance|net|payable|due)[\s:]*\$?\s*([\d,]+\.?\d{0,2})/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(totalKeywords);

            if (match) {
                const rawValue = match[1].replace(/,/g, '');
                const value = parseFloat(rawValue);

                if (!isNaN(value) && value > 0) {
                    const confidence = this.getLineConfidence(words, line);
                    const priority = /^total/i.test(line) ? 3 : /balance|net/i.test(line) ? 2 : 1;

                    candidates.push({ value, confidence, priority, source: 'keyword' });
                }
            }
        }

        // Strategy 2: Find all currency amounts
        const amountRegex = /\$?\s*([\d,]+\.\d{2})\b/g;
        const amounts = [];

        lines.forEach(line => {
            let match;
            while ((match = amountRegex.exec(line)) !== null) {
                const rawValue = match[1].replace(/,/g, '');
                const value = parseFloat(rawValue);

                if (!isNaN(value) && value > 0) {
                    const confidence = this.getLineConfidence(words, line);
                    amounts.push({ value, confidence });
                }
            }
        });

        // Strategy 3: Largest amount (fallback)
        if (amounts.length > 0 && candidates.length === 0) {
            const largest = amounts.sort((a, b) => b.value - a.value)[0];
            candidates.push({ ...largest, priority: 0, source: 'largest' });
        }

        // Sort by priority, then confidence
        candidates.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return b.confidence - a.confidence;
        });

        return candidates[0] || { value: 0, confidence: 0 };
    }

    // Extract date from OCR text
    extractDate(text, words) {
        const datePatterns = [
            { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g, type: 'dmy' },
            { regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g, type: 'ymd' },
            { regex: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/gi, type: 'dMy' }
        ];

        const candidates = [];

        for (const pattern of datePatterns) {
            const matches = [...text.matchAll(pattern.regex)];

            for (const match of matches) {
                try {
                    const dateStr = this.parseDate(match, pattern.type);
                    const date = new Date(dateStr);

                    if (this.isValidReceiptDate(date)) {
                        const confidence = this.getTextConfidence(words, match[0]);
                        candidates.push({ value: dateStr, confidence, raw: match[0] });
                    }
                } catch (e) {
                    // Invalid date, skip
                }
            }
        }

        // Return highest confidence date
        candidates.sort((a, b) => b.confidence - a.confidence);
        return candidates[0] || null;
    }

    parseDate(match, type) {
        let year, month, day;

        switch (type) {
            case 'dmy': // 26/10/2020
                day = match[1].padStart(2, '0');
                month = match[2].padStart(2, '0');
                year = match[3].length === 2 ? '20' + match[3] : match[3];
                break;

            case 'ymd': // 2020-10-26
                year = match[1];
                month = match[2].padStart(2, '0');
                day = match[3].padStart(2, '0');
                break;

            case 'dMy': // 26 Oct 2020
                day = match[1].padStart(2, '0');
                const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                month = (months.indexOf(match[2].toLowerCase().slice(0, 3)) + 1).toString().padStart(2, '0');
                year = match[3].length === 2 ? '20' + match[3] : match[3];
                break;
        }

        return `${year}-${month}-${day}`;
    }

    isValidReceiptDate(date) {
        if (isNaN(date.getTime())) return false;

        // Receipt should be between 2000 and 1 week in the future
        const minDate = new Date('2000-01-01');
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 7);

        return date >= minDate && date <= maxDate;
    }

    getLineConfidence(words, line) {
        if (!words || words.length === 0) return 50;

        const lineWords = words.filter(w => line.includes(w.text));
        if (lineWords.length === 0) return 40;

        const sum = lineWords.reduce((acc, w) => acc + w.confidence, 0);
        return sum / lineWords.length;
    }

    getTextConfidence(words, text) {
        if (!words || words.length === 0) return 50;

        const matchingWords = words.filter(w => text.includes(w.text));
        if (matchingWords.length === 0) return 40;

        const sum = matchingWords.reduce((acc, w) => acc + w.confidence, 0);
        return sum / matchingWords.length;
    }

    evaluateQuality(result) {
        const avgConfidence = (result.confidence.amount + result.confidence.date) / 2;
        const hasAmount = result.amount > 0;
        const hasDate = result.date !== null;

        let score = 0;

        // Confidence contribution (0-50 points)
        if (avgConfidence > 70) score += 50;
        else if (avgConfidence > 50) score += 30;
        else if (avgConfidence > 30) score += 15;

        // Data extraction contribution (0-50 points)
        if (hasAmount && hasDate) score += 50;
        else if (hasAmount || hasDate) score += 25;

        let verdict;
        if (score > 70) verdict = 'ACCEPT';
        else if (score > 40) verdict = 'RETRY';
        else verdict = 'ESCALATE';

        return { score, verdict };
    }
}

module.exports = ThermalReceiptOCR;
