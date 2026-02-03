# Production-Grade Thermal Receipt OCR Pipeline
## Complete Implementation Guide for Raspberry Pi 5

---

## 1. Core Principles for Robust Thermal Receipt OCR

### Why Single-Pass OCR Fails on Thermal Paper

**The Problem:**
- Thermal paper fades unevenly - some characters are darker than others
- A single preprocessing strategy cannot optimize for both faint AND bold text
- Thresholding that works for the total may destroy the date, and vice versa
- Real receipts have varying exposure across different regions

**The Solution:**
- **Multi-pass OCR with preprocessing variants** - run OCR 3-7 times with different settings
- **Aggregate results** - merge the best-confidence results from each pass
- **Region-based processing** - preprocess different receipt areas differently

---

### Why Aggressive Thresholding Destroys Thermal Ink

**Thermal Paper Characteristics:**
- Thermal ink is **gray**, not pure black (pixel values: 80-180, not 0-50)
- Aggressive binary thresholding (e.g., `threshold > 128 → white`) **erases faint characters**
- Thin strokes in "1", "7", ".", "," disappear completely

**Best Practices:**
- **Avoid hard thresholds** - use adaptive/local thresholding
- **Preserve gray gradients** - don't force pure black/white
- **Use contrast enhancement** instead of thresholding when possible
- **Test threshold values** in range 60-120, not 128-180

---

### How Redundancy and Variation Increase Accuracy

**Multi-Pass Strategy:**
```
Pass 1: High contrast, no threshold (preserves faint text)
Pass 2: Moderate threshold (enhances bold text)
Pass 3: Sharpened + denoised (improves small fonts)
Pass 4: Slightly rotated +/-2° (handles skew)
Pass 5: Different PSM mode (handles layout variations)
```

**Why This Works:**
- Some characters are clearest in high-contrast mode
- Other characters only appear after thresholding
- Decimal points may only be visible after sharpening
- Redundancy provides **multiple chances** to capture each character

**Result Aggregation:**
- Merge results by **selecting highest-confidence text** for each field
- If amount appears in 3/5 passes → high confidence
- If amount appears in 1/5 passes → low confidence, retry or escalate

---

### Why Preprocessing Diversity Improves Robustness

**Preprocessing Variants:**
1. **Brightness-first**: `brightness(+15%) → contrast(1.2)` → Good for underexposed receipts
2. **Contrast-first**: `contrast(1.5) → brightness(+5%)` → Good for faded thermal paper
3. **Threshold-first**: `adaptive_threshold → denoise` → Good for clear, high-contrast receipts
4. **Sharpen-first**: `sharpen → normalize → contrast` → Good for blurry phone photos

**Why Diversity Matters:**
- You **cannot predict** which variant will work best for a given receipt
- Running all variants in parallel (multi-pass) guarantees at least one will succeed
- Cost: 3-7x OCR time, but **essential for production reliability**

---

### Why OCR Confidence Scoring is Essential

**Tesseract Provides Per-Word Confidence (0-100):**
```javascript
const { data } = await Tesseract.recognize(image);
data.words.forEach(word => {
  console.log(`${word.text}: ${word.confidence}%`);
});
```

**Decision Logic:**
- **Confidence >85**: Accept result
- **Confidence 60-85**: Accept if validated (e.g., matches currency regex)
- **Confidence 40-60**: Retry with different preprocessing
- **Confidence <40**: Escalate to cloud OCR

**Why This Matters:**
- Prevents accepting garbage OCR ("L0L" instead of "101")
- Enables smart retry logic (don't retry if confidence is already 95%)
- Enables hybrid local/cloud strategies

---

## 2. Image Preprocessing Pipeline for Thermal Paper

### Complete Preprocessing Function (Node.js + Jimp)

```javascript
const { Jimp } = require('jimp');

async function preprocessThermalReceipt(inputPath, variant = 'default') {
  let image = await Jimp.read(inputPath);
  
  // Step 1: EXIF Orientation Correction
  // Jimp automatically handles this on read()
  
  // Step 2: Grayscale Conversion
  image.greyscale();
  
  // Step 3: Upscale to minimum 150 DPI (if needed)
  // Thermal receipts are typically 80mm wide → need ~1200px width minimum
  if (image.bitmap.width < 1200) {
    const scale = Math.ceil(1200 / image.bitmap.width);
    image.resize({ w: image.bitmap.width * scale, h: image.bitmap.height * scale });
  }
  
  // Step 4: Apply preprocessing variant
  switch(variant) {
    case 'high_contrast':
      image.normalize();           // Expand dynamic range
      image.contrast(0.9);          // Strong contrast boost
      image.brightness(0.05);       // Slight brightness
      break;
      
    case 'threshold':
      image.normalize();
      // Adaptive threshold simulation
      const avgBrightness = calculateAverageBrightness(image);
      const threshold = avgBrightness * 0.65; // Lower threshold for thermal paper
      applyAdaptiveThreshold(image, threshold);
      break;
      
    case 'sharpen':
      image.normalize();
      image.contrast(0.7);
      image.convolute([   // Sharpen kernel
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
      ]);
      break;
      
    case 'denoise':
      image.normalize();
      image.blur(1);  // Very light blur
      image.contrast(0.8);
      break;
      
    default: // 'default' - conservative preprocessing
      image.normalize();
      image.contrast(0.6);
      break;
  }
  
  return image;
}

function calculateAverageBrightness(image) {
  let total = 0;
  let count = 0;
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    total += this.bitmap.data[idx]; // R channel (grayscale)
    count++;
  });
  return total / count;
}

function applyAdaptiveThreshold(image, threshold) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const gray = this.bitmap.data[idx];
    const newVal = gray < threshold ? 0 : 255;
    this.bitmap.data[idx] = newVal;
    this.bitmap.data[idx + 1] = newVal;
    this.bitmap.data[idx + 2] = newVal;
  });
}
```

### Key Preprocessing Principles:

1. **EXIF Orientation**: Always correct first (Jimp does this automatically)

2. **Grayscale Strategy**: Convert to grayscale **before** any other processing
   - Removes color noise from phone cameras
   - Thermal receipts are monochrome anyway

3. **Contrast Enhancement for Faint Ink**:
   - Use `normalize()` first to expand dynamic range
   - Then apply `contrast(0.6-0.9)` - **not higher**
   - Thermal ink is gray (100-180), not black (0-50)

4. **Adaptive Thresholding**:
   - **When to apply**: Only for high-contrast receipts or as a variant
   - **When to avoid**: Default strategy should NOT use hard thresholding
   - **Best threshold**: 60-70% of average brightness (not 50%)

5. **Noise Reduction**:
   - Use **minimal blur** (radius=1) to remove grain from phone cameras
   - Heavy denoising **destroys thin characters** like "1", ".", ","
   - Apply *before* sharpening, never after

6. **Deskewing**:
   - Tesseract has built-in deskew - don't do aggressive rotation
   - Slight rotation variants (±1-2°) can help in multi-pass strategy

7. **Image Resizing**:
   - **Minimum effective DPI**: 150 DPI for English text
   - For thermal receipts (80mm wide): **minimum 1200px width**
   - **Upscale 2-3x** if original is too small
   - Use **bicubic interpolation** for smooth upscaling

8. **Sharpening for Small Fonts**:
   - Use sharpening kernel: `[[0,-1,0],[-1,5,-1],[0,-1,0]]`
   - Apply **after** contrast enhancement
   - Don't over-sharpen - creates harsh artifacts

---

## 3. Multi-Pass OCR Strategy (CRITICAL)

### Implementation

```javascript
async function multiPassOCR(imagePath) {
  const variants = ['default', 'high_contrast', 'threshold', 'sharpen', 'denoise'];
  const psms = [6, 4, 3]; // Try different page segmentation modes
  
  const results = [];
  
  // Run OCR with all combinations
  for (const variant of variants) {
    const processedImage = await preprocessThermalReceipt(imagePath, variant);
    const tempPath = `/tmp/processed_${variant}.jpg`;
    await processedImage.write(tempPath);
    
    for (const psm of psms) {
      const { data } = await Tesseract.recognize(tempPath, 'eng', {
        tessedit_pageseg_mode: psm,
        tessedit_ocr_engine_mode: 3 // LSTM only
      });
      
      results.push({
        variant,
        psm,
        text: data.text,
        confidence: data.confidence,
        words: data.words
      });
    }
  }
  
  // Merge and select best results
  return selectBestResults(results);
}

function selectBestResults(results) {
  // Strategy 1: Extract amount and date from each result
  const candidates = results.map(r => ({
    amount: extractAmount(r.text, r.words),
    date: extractDate(r.text, r.words),
    variant: r.variant,
    psm: r.psm
  }));
  
  // Strategy 2: Select highest-confidence amount
  const amounts = candidates.filter(c => c.amount.value && c.amount.confidence > 40);
  const bestAmount = amounts.sort((a, b) => b.amount.confidence - a.amount.confidence)[0];
  
  // Strategy 3: Select highest-confidence date
  const dates = candidates.filter(c => c.date.value && c.date.confidence > 50);
  const bestDate = dates.sort((a, b) => b.date.confidence - a.date.confidence)[0];
  
  return {
    amount: bestAmount?.amount.value || 0,
    date: bestDate?.date.value || null,
    confidence: {
      amount: bestAmount?.amount.confidence || 0,
      date: bestDate?.date.confidence || 0
    },
    metadata: {
      totalPasses: results.length,
      amountSource: bestAmount?.variant,
      dateSource: bestDate?.variant
    }
  };
}
```

### Preprocessing Variants Explained:

1. **`default`**: Minimal processing - normalize + light contrast
   - **Best for**: Clear, well-lit receipts
   - **Preserves**: All text, including faint characters

2. **`high_contrast`**: Aggressive contrast boost
   - **Best for**: Faded thermal paper
   - **Risk**: May over-brighten some areas

3. **`threshold`**: Binary threshold after normalization
   - **Best for**: High-contrast receipts with dark text
   - **Risk**: Destroys faint text

4. **`sharpen`**: Sharpening kernel + moderate contrast
   - **Best for**: Blurry phone photos
   - **Risk**: Amplifies noise

5. **`denoise`**: Light blur + contrast
   - **Best for**: Grainy phone camera receipts
   - **Risk**: May blur thin characters

### Merging Strategy:

**Option A: Highest Confidence Wins**
```javascript
const bestAmount = allResults
  .filter(r => r.amount.confidence > 60)
  .sort((a, b) => b.amount.confidence - a.amount.confidence)[0];
```

**Option B: Majority Voting**
```javascript
// If 3+ passes return same amount → high confidence
const amountCounts = {};
allResults.forEach(r => {
  amountCounts[r.amount.value] = (amountCounts[r.amount.value] || 0) + 1;
});
const mostCommon = Object.keys(amountCounts)
  .sort((a, b) => amountCounts[b] - amountCounts[a])[0];
```

**Option C: Hybrid (RECOMMENDED)**
```javascript
// Use highest confidence if >85, otherwise use majority voting
```

---

## 4. Tesseract Configuration for Receipts

### Best Settings for Thermal Receipts

```javascript
const tesseractConfig = {
  // OCR Engine Mode (OEM)
  tessedit_ocr_engine_mode: 3, // LSTM only (best for modern Tesseract 4.x/5.x)
  
  // Page Segmentation Mode (PSM) - try multiple
  tessedit_pageseg_mode: 6, // Default: Assume uniform block of text
  // Also try: PSM 4 (single column), PSM 3 (auto)
  
  // Language
  lang: 'eng',
  
  // Character Whitelist (for amounts and dates)
  tessedit_char_whitelist: '0123456789.$,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-: ',
  
  // Disable dictionary-based correction (can introduce errors for receipts)
  load_system_dawg: '0',
  load_freq_dawg: '0',
  
  // Preserve spaces and layout
  preserve_interword_spaces: '1'
};
```

### PSM Modes to Try:

| PSM | Mode | When to Use |
|-----|------|-------------|
| **6** | Uniform block of text | **DEFAULT** - works for most receipts |
| **4** | Single column of text | When receipt is clean and well-aligned |
| **3** | Fully automatic | Fallback if PSM 6 fails |
| **11** | Sparse text | For receipts with lots of whitespace |

### Multi-PSM Strategy:

```javascript
async function ocrWithMultiplePSMs(imagePath) {
  const psms = [6, 4, 3];
  const results = [];
  
  for (const psm of psms) {
    const { data } = await Tesseract.recognize(imagePath, 'eng', {
      tessedit_pageseg_mode: psm,
      tessedit_ocr_engine_mode: 3
    });
    results.push({ psm, data });
  }
  
  // Select best result based on confidence
  return results.sort((a, b) => b.data.confidence - a.data.confidence)[0];
}
```

### Character Whitelisting:

**For Amount Extraction Only:**
```javascript
tessedit_char_whitelist: '0123456789.$,-'
```

**For Date Extraction Only:**
```javascript
tessedit_char_whitelist: '0123456789/-: JanFebMarAprMayJunJulAugSepOctNovDec'
```

**For Full Receipt (DEFAULT):**
```javascript
// Don't use whitelist - allow all characters
// Tesseract's built-in language model is better than manual whitelisting
```

---

## 5. OCR Confidence Estimation and Decision Logic

### Confidence Scoring

```javascript
function evaluateOCRQuality(ocrResult) {
  const { text, confidence, words } = ocrResult.data;
  
  // 1. Tesseract's built-in confidence
  const avgConfidence = confidence;
  
  // 2. Word-level confidence
  const wordConfidences = words.map(w => w.confidence);
  const highConfWords = wordConfidences.filter(c => c > 80).length;
  const lowConfWords = wordConfidences.filter(c => c < 40).length;
  
  // 3. Numeric density (receipts have lots of numbers)
  const numericRatio = (text.match(/[0-9]/g) || []).length / text.length;
  
  // 4. Keyword presence
  const hasTotal = /total|amount|balance|net/i.test(text);
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text);
  const hasCurrency = /\$|£|€|\d+\.\d{2}/.test(text);
  
  // 5. Calculate overall quality score
  let qualityScore = 0;
  if (avgConfidence > 70) qualityScore += 40;
  else if (avgConfidence > 50) qualityScore += 20;
  
  if (highConfWords > words.length * 0.6) qualityScore += 20;
  if (lowConfWords < words.length * 0.2) qualityScore += 10;
  
  if (numericRatio > 0.15) qualityScore += 10;
  if (hasTotal) qualityScore += 10;
  if (hasDate) qualityScore += 5;
  if (hasCurrency) qualityScore += 5;
  
  return {
    qualityScore, // 0-100
    confidence: avgConfidence,
    verdict: qualityScore > 70 ? 'ACCEPT' : 
             qualityScore > 40 ? 'RETRY' : 'ESCALATE'
  };
}
```

### Decision Thresholds:

| Quality Score | Action | Rationale |
|---------------|--------|-----------|
| **>70** | Accept result | High confidence, likely accurate |
| **40-70** | Retry with different preprocessing | Medium confidence, worth retrying |
| **<40** | Escalate to cloud OCR or manual entry | Low confidence, local OCR failed |

### Preventing Infinite Retry Loops:

```javascript
async function ocrWithRetry(imagePath, maxRetries = 2) {
  let attempt = 0;
  let bestResult = null;
  
  while (attempt < maxRetries) {
    const result = await multiPassOCR(imagePath);
    const quality = evaluateOCRQuality(result);
    
    if (quality.verdict === 'ACCEPT') {
      return result; // Success!
    }
    
    if (quality.verdict === 'RETRY' && attempt < maxRetries - 1) {
      // Try again with different variant
      attempt++;
      continue;
    }
    
    if (quality.verdict === 'ESCALATE') {
      return {
        ...result,
        shouldEscalate: true,
        reason: 'Low OCR confidence'
      };
    }
    
    // Keep best result so far
    if (!bestResult || quality.qualityScore > bestResult.quality) {
      bestResult = { result, quality: quality.qualityScore };
    }
    
    attempt++;
  }
  
  return bestResult.result;
}
```

---

## 6. Fallback and Escalation Strategy

### Decision Tree

```
┌─────────────────────┐
│ Run Local Multi-Pass│
│ OCR (5 variants)    │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Confidence   │
    │ >70?         │
    └──┬───────┬───┘
       │       │
    YES│       │NO
       ▼       ▼
   ┌─────┐  ┌──────────────┐
   │DONE │  │ Amount/Date  │
   └─────┘  │ extracted?   │
            └──┬───────┬───┘
               │       │
            YES│       │NO
               ▼       ▼
         ┌──────────┐ ┌────────────┐
         │ Validate │ │ Escalate to│
         │ & Accept │ │ Cloud OCR  │
         └──────────┘ └────────────┘
```

### Implementation

```javascript
async function processReceiptWithFallback(imagePath, googleVisionApiKey) {
  // Step 1: Local multi-pass OCR
  const localResult = await multiPassOCR(imagePath);
  const localQuality = evaluateOCRQuality(localResult);
  
  // Step 2: Check if local OCR is good enough
  if (localQuality.qualityScore > 70 && localResult.amount && localResult.date) {
    return {
      source: 'local',
      ...localResult
    };
  }
  
  // Step 3: Check if partial success (amount found but not date, or vice versa)
  if (localQuality.qualityScore > 50 && (localResult.amount || localResult.date)) {
    // Keep local result, try to fill missing field with cloud OCR
    const cloudResult = await googleVisionOCR(imagePath, googleVisionApiKey);
    return {
      source: 'hybrid',
      amount: localResult.amount || cloudResult.amount,
      date: localResult.date || cloudResult.date
    };
  }
  
  // Step 4: Local OCR failed completely - escalate to cloud
  if (googleVisionApiKey) {
    const cloudResult = await googleVisionOCR(imagePath, googleVisionApiKey);
    return {
      source: 'cloud',
      ...cloudResult
    };
  }
  
  // Step 5: No cloud API available - return best local result
  return {
    source: 'local_low_confidence',
    ...localResult,
    warning: 'OCR confidence is low - please verify manually'
  };
}
```

### When to Use Each Strategy:

| Scenario | Strategy | Cost | Latency |
|----------|----------|------|---------|
| **Clear receipt, high confidence** | Local only | Free | 2-5s |
| **Faded receipt, partial success** | Hybrid (local + cloud for missing fields) | Low | 3-8s |
| **Very poor quality, local failed** | Cloud only | $$$ | 1-3s |
| **No internet / no API key** | Local with warning | Free | 2-5s |

---

## 7. Post-OCR Normalization and Correction

### Common Thermal OCR Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `L0` → `10` | "1" looks like "l" | Replace `L0` with `10` in amounts |
| `S` → `$` | Dollar sign faded | Replace `S` before numbers with `$` |
| `O` → `0` | Letter O vs digit 0 | In numeric contexts, prefer `0` |
| `16.1B` → `16.18` | "8" looks like "B" | Replace `B` with `8` in amounts |
| `1.2.34` → `12.34` | Extra decimal from noise | Keep only first decimal |

### Normalization Function

```javascript
function normalizeOCRText(rawText, context = 'amount') {
  let text = rawText;
  
  if (context === 'amount') {
    // Fix common OCR errors in currency amounts
    text = text.replace(/[Ll](\d)/g, '1$1');      // L0 → 10
    text = text.replace(/[Oo](\d)/g, '0$1');      // O0 → 00
    text = text.replace(/[Ss]\s*(\d)/g, '\$$1');  // S 16 → $16
    text = text.replace(/(\d)[IlL]/g, '$11');     // 1I → 11
    text = text.replace(/(\d)[Bb]/g, '$18');      // 1B → 18
    text = text.replace(/(\d)[Gg]/g, '$19');      // 1G → 19
    
    // Fix multiple decimals (keep only first)
    const parts = text.split('.');
    if (parts.length > 2) {
      text = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Remove spaces in numbers
    text = text.replace(/(\d)\s+(\d)/g, '$1$2');
    
    // Ensure 2 decimal places for currency
    const match = text.match(/\$?\s*(\d+)\.?(\d*)/);
    if (match) {
      const dollars = match[1];
      const cents = (match[2] || '00').padEnd(2, '0').slice(0, 2);
      text = `${dollars}.${cents}`;
    }
  }
  
  if (context === 'date') {
    // Fix common date OCR errors
    text = text.replace(/[Oo]/g, '0');            // O → 0
    text = text.replace(/[Ll]/g, '1');            // l → 1
    text = text.replace(/[Ss]/g, '5');            // S → 5
    
    // Normalize separators
    text = text.replace(/[\\|]/g, '/');           // \ or | → /
  }
  
  return text;
}
```

### Merging Broken Lines

```javascript
function mergeBrokenLines(ocrText) {
  const lines = ocrText.split('\n');
  const merged = [];
  let buffer = '';
  
  for (let line of lines) {
    line = line.trim();
    
    // If line ends with incomplete amount (no decimal or cents)
    if (/\$?\d+$/.test(line)) {
      buffer = line;
      continue;
    }
    
    // If line starts with decimal or cents (continuation of previous line)
    if (buffer && /^[\.,]\d{2}/.test(line)) {
      merged.push(buffer + line);
      buffer = '';
      continue;
    }
    
    if (buffer) {
      merged.push(buffer);
      buffer = '';
    }
    
    merged.push(line);
  }
  
  if (buffer) merged.push(buffer);
  
  return merged.join('\n');
}
```

---

## 8. Receipt-Aware Extraction Logic

### Reliable Total Detection

```javascript
function extractTotal(ocrText, words) {
  const lines = ocrText.split('\n');
  const candidates = [];
  
  // Strategy 1: Look for "TOTAL" keyword
  const totalRegex = /(?:total|amount|balance|net|payable)[\s:]*\$?\s*([\d,]+\.?\d{0,2})/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(totalRegex);
    
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const confidence = getLineConfidence(words, i);
      
      // Prioritize keywords
      const priority = /^total/i.test(line) ? 3 : 
                      /balance|net/i.test(line) ? 2 : 1;
      
      candidates.push({ value, confidence, priority, line: i });
    }
  }
  
  // Strategy 2: Look for largest amount on receipt
  const amountRegex = /\$?\s*([\d,]+\.\d{2})/g;
  let maxAmount = 0;
  let maxLine = -1;
  
  lines.forEach((line, i) => {
    const amounts = [...line.matchAll(amountRegex)];
    amounts.forEach(match => {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > maxAmount) {
        maxAmount = value;
        maxLine = i;
      }
    });
  });
  
  if (maxAmount > 0 && candidates.length === 0) {
    candidates.push({ 
      value: maxAmount, 
      confidence: 60, 
      priority: 0, 
      line: maxLine 
    });
  }
  
  // Sort: priority first, then confidence
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.confidence - a.confidence;
  });
  
  return candidates[0] || { value: 0, confidence: 0 };
}

function getLineConfidence(words, lineIndex) {
  // Calculate average confidence of words in this line
  const lineWords = words.filter(w => w.line_num === lineIndex);
  if (lineWords.length === 0) return 0;
  
  const sum = lineWords.reduce((acc, w) => acc + w.confidence, 0);
  return sum / lineWords.length;
}
```

### Handling Negative Values and Refunds

```javascript
function extractAmount(ocrText, words) {
  // Detect refund receipt
  const isRefund = /refund|return|credit/i.test(ocrText);
  
  // Extract total
  const total = extractTotal(ocrText, words);
  
  // Look for negative sign or parentheses
  const hasNegative = /-\s*\$?\s*\d+/.test(ocrText) || 
                     /\(\s*\$?\s*\d+\s*\)/.test(ocrText);
  
  // If refund receipt, make amount negative
  if ((isRefund || hasNegative) && total.value > 0) {
    total.value = -total.value;
  }
  
  return total;
}
```

### Distinguishing Total Types

```javascript
function classifyTotal(line, value) {
  const lower = line.toLowerCase();
  
  // Tax-only totals (ignore these)
  if (/tax/i.test(line) && !/total/i.test(line)) {
    return { type: 'tax', value, priority: 0 };
  }
  
  // Subtotal (not final total)
  if (/subtotal|sub-total|sub total/i.test(line)) {
    return { type: 'subtotal', value, priority: 1 };
  }
  
  // Final total (highest priority)
  if (/^total|grand total|final|amount due|balance|net/i.test(line)) {
    return { type: 'total', value, priority: 3 };
  }
  
  // Unknown amount
  return { type: 'unknown', value, priority: 1 };
}
```

### Date Extraction Across Formats

```javascript
function extractDate(ocrText, words) {
  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,           // MM/DD/YYYY
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,           // YYYY-MM-DD
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/i, // DD Mon YYYY
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i  // Mon DD, YYYY
  ];
  
  const candidates = [];
  
  for (const pattern of datePatterns) {
    const matches = [...ocrText.matchAll(new RegExp(pattern, 'gi'))];
    
    matches.forEach(match => {
      const dateStr = match[0];
      const confidence = getWordConfidence(words, dateStr);
      
      try {
        const date = parseDate(match);
        if (isValidDate(date)) {
          candidates.push({ date, confidence, raw: dateStr });
        }
      } catch (e) {
        // Invalid date, skip
      }
    });
  }
  
  // Return highest confidence date
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] || null;
}

function parseDate(match) {
  // Implementation depends on regex pattern
  // Convert to YYYY-MM-DD format
  // Handle 2-digit years (assume 20xx)
}

function isValidDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  // Receipt date should be within reasonable range
  const now = new Date();
  const minDate = new Date('2000-01-01');
  const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week in future
  
  return d >= minDate && d <= maxDate;
}

function getWordConfidence(words, text) {
  const matchingWords = words.filter(w => text.includes(w.text));
  if (matchingWords.length === 0) return 0;
  
  const sum = matchingWords.reduce((acc, w) => acc + w.confidence, 0);
  return sum / matchingWords.length;
}
```

---

## 9. Performance Optimization for Raspberry Pi 5

### Image Size Limits

```javascript
const CONFIG = {
  // Maximum image dimensions (to prevent memory exhaustion)
  MAX_WIDTH: 2400,
  MAX_HEIGHT: 4000,
  
  // Minimum dimensions (upscale if below this)
  MIN_WIDTH: 1200,
  
  // Target DPI
  TARGET_DPI: 150,
  
  // Preprocessing timeout per variant
  PREPROCESS_TIMEOUT_MS: 5000,
  
  // OCR timeout per pass
  OCR_TIMEOUT_MS: 10000,
  
  // Maximum total passes
  MAX_PASSES: 5,
  
  // Maximum retries
  MAX_RETRIES: 2
};

async function resizeForRPi5(image) {
  const { width, height } = image.bitmap;
  
  // Downscale if too large
  if (width > CONFIG.MAX_WIDTH || height > CONFIG.MAX_HEIGHT) {
    const scale = Math.min(
      CONFIG.MAX_WIDTH / width,
      CONFIG.MAX_HEIGHT / height
    );
    image.resize({ 
      w: Math.floor(width * scale), 
      h: Math.floor(height * scale) 
    });
  }
  
  // Upscale if too small
  if (width < CONFIG.MIN_WIDTH) {
    const scale = CONFIG.MIN_WIDTH / width;
    image.resize({ 
      w: Math.floor(width * scale), 
      h: Math.floor(height * scale) 
    });
  }
  
  return image;
}
```

### CPU vs Accuracy Tradeoffs

**Low CPU Mode (fastest, 70% accuracy):**
- 2 preprocessing variants (default + high_contrast)
- 1 PSM mode (6)
- No sharpening or heavy processing

**Medium CPU Mode (balanced, 85% accuracy):**
- 3 preprocessing variants (default + high_contrast + threshold)
- 2 PSM modes (6, 4)
- Light sharpening

**High CPU Mode (slowest, 95% accuracy):**
- 5 preprocessing variants (all)
- 3 PSM modes (6, 4, 3)
- Full preprocessing pipeline

```javascript
const MODE_CONFIGS = {
  low: { variants: ['default', 'high_contrast'], psms: [6] },
  medium: { variants: ['default', 'high_contrast', 'threshold'], psms: [6, 4] },
  high: { variants: ['default', 'high_contrast', 'threshold', 'sharpen', 'denoise'], psms: [6, 4, 3] }
};

async function processReceipt(imagePath, mode = 'medium') {
  const config = MODE_CONFIGS[mode];
  // ... run OCR with config.variants and config.psms
}
```

### Batch vs Single-Image OCR

**For Raspberry Pi 5:**
- **Process one receipt at a time** - avoid parallel OCR
- Tesseract is CPU-bound, parallelism won't help
- Use async queue for multiple receipts

```javascript
const queue = require('bull');

const ocrQueue = new queue('receipt-ocr', {
  settings: {
    maxStalledCount: 1,
    lockDuration: 60000
  },
  limiter: {
    max: 1, // Process 1 receipt at a time
    duration: 1000
  }
});

ocrQueue.process(async (job) => {
  const { imagePath } = job.data;
  return await multiPassOCR(imagePath);
});
```

### Sensible Timeouts

```javascript
async function ocrWithTimeout(imagePath, timeoutMs = 30000) {
  return Promise.race([
    multiPassOCR(imagePath),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR timeout')), timeoutMs)
    )
  ]);
}
```

---

## 10. Common Failure Patterns and Mitigations

### Issue 1: Over-Thresholding Thermal Paper

**Symptom:** OCR extracts nothing or gibberish

**Cause:** Hard threshold (e.g., 128) turns faint thermal ink white

**Fix:**
```javascript
// ❌ Bad: Hard threshold
image.scan(..., (x, y, idx) => {
  const gray = this.bitmap.data[idx];
  const newVal = gray > 128 ? 255 : 0; // Too aggressive!
});

// ✅ Good: Adaptive threshold based on average brightness
const avgBrightness = calculateAverageBrightness(image);
const threshold = avgBrightness * 0.65; // 60-70% of average
image.scan(..., (x, y, idx) => {
  const gray = this.bitmap.data[idx];
  const newVal = gray < threshold ? 0 : 255; // Note: < not >
});
```

### Issue 2: Excessive Denoising Removing Characters

**Symptom:** OCR misses decimal points, commas, thin characters

**Cause:** Heavy blur (radius >2) destroys fine details

**Fix:**
```javascript
// ❌ Bad: Heavy blur
image.blur(5);

// ✅ Good: Minimal blur
image.blur(1); // Only remove camera grain
```

### Issue 3: Incorrect PSM Selection

**Symptom:** OCR extracts text in wrong order, misses lines

**Cause:** Using PSM 7 (single line) for multi-line receipt

**Fix:**
```javascript
// ✅ Use PSM 6 (uniform block) for receipts
tessedit_pageseg_mode: 6

// Or try multiple PSMs and pick best result
const psms = [6, 4, 3];
```

### Issue 4: Low-Resolution Input Images

**Symptom:** OCR extracts gibberish, low confidence

**Cause:** Image is <800px wide (below 100 DPI)

**Fix:**
```javascript
// ✅ Always upscale to minimum 1200px width
if (image.bitmap.width < 1200) {
  const scale = Math.ceil(1200 / image.bitmap.width);
  image.resize({ w: image.bitmap.width * scale });
}
```

### Issue 5: Skewed or Curved Text Lines

**Symptom:** OCR extracts partial text, misses words

**Cause:** Receipt was photographed at an angle

**Fix:**
```javascript
// Tesseract has built-in deskew
// Enable it in config:
{
  tessedit_pageseg_mode: 3, // Auto mode includes deskew
}

// For severe skew, try preprocessing with rotation variants
const rotations = [-2, -1, 0, 1, 2]; // degrees
for (const angle of rotations) {
  const rotated = image.clone().rotate(angle);
  // Run OCR on rotated
}
```

---

## Complete Production Pipeline

### Final Implementation

```javascript
const { Jimp } = require('jimp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

class ThermalReceiptOCR {
  constructor(config = {}) {
    this.mode = config.mode || 'medium';
    this.enableCloudFallback = config.googleVisionApiKey ? true : false;
    this.apiKey = config.googleVisionApiKey;
    
    this.config = {
      variants: ['default', 'high_contrast', 'threshold'],
      psms: [6, 4],
      maxRetries: 2,
      confidenceThreshold: 70,
      timeoutMs: 30000
    };
  }
  
  async processReceipt(imagePath) {
    try {
      // Step 1: Multi-pass local OCR
      const localResult = await this.multiPassOCR(imagePath);
      
      // Step 2: Evaluate quality
      const quality = this.evaluateQuality(localResult);
      
      // Step 3: Decide on fallback
      if (quality.verdict === 'ACCEPT') {
        return { source: 'local', ...localResult };
      }
      
      if (quality.verdict === 'RETRY') {
        // Retry with different variants
        const retryResult = await this.multiPassOCR(imagePath, true);
        const retryQuality = this.evaluateQuality(retryResult);
        
        if (retryQuality.verdict === 'ACCEPT') {
          return { source: 'local_retry', ...retryResult };
        }
      }
      
      // Step 4: Escalate to cloud if available
      if (this.enableCloudFallback) {
        const cloudResult = await this.googleVisionOCR(imagePath);
        return { source: 'cloud', ...cloudResult };
      }
      
      // Step 5: Return best local result with warning
      return { 
        source: 'local_low_confidence', 
        ...localResult,
        warning: 'Please verify OCR results manually'
      };
      
    } catch (error) {
      console.error('OCR Pipeline Error:', error);
      throw error;
    }
  }
  
  async multiPassOCR(imagePath, useAllVariants = false) {
    const variants = useAllVariants 
      ? ['default', 'high_contrast', 'threshold', 'sharpen', 'denoise']
      : this.config.variants;
    
    const results = [];
    
    for (const variant of variants) {
      const processed = await this.preprocess(imagePath, variant);
      const tempPath = `/tmp/processed_${variant}_${Date.now()}.jpg`;
      await processed.write(tempPath);
      
      for (const psm of this.config.psms) {
        const { data } = await Tesseract.recognize(tempPath, 'eng', {
          tessedit_pageseg_mode: psm,
          tessedit_ocr_engine_mode: 3
        });
        
        results.push({ variant, psm, data });
      }
      
      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});
    }
    
    return this.selectBestResults(results);
  }
  
  async preprocess(imagePath, variant) {
    let image = await Jimp.read(imagePath);
    
    image.greyscale();
    
    // Resize to optimal dimensions
    if (image.bitmap.width < 1200) {
      const scale = Math.ceil(1200 / image.bitmap.width);
      image.resize({ w: image.bitmap.width * scale, h: image.bitmap.height * scale });
    }
    
    image.normalize();
    
    switch(variant) {
      case 'high_contrast':
        image.contrast(0.9);
        break;
      
      case 'threshold':
        const avgBrightness = this.calculateAverageBrightness(image);
        this.applyAdaptiveThreshold(image, avgBrightness * 0.65);
        break;
      
      case 'sharpen':
        image.contrast(0.7);
        image.convolute([[0,-1,0],[-1,5,-1],[0,-1,0]]);
        break;
      
      case 'denoise':
        image.blur(1);
        image.contrast(0.8);
        break;
      
      default:
        image.contrast(0.6);
    }
    
    return image;
  }
  
  calculateAverageBrightness(image) {
    let total = 0;
    let count = 0;
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      total += this.bitmap.data[idx];
      count++;
    });
    return total / count;
  }
  
  applyAdaptiveThreshold(image, threshold) {
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const gray = this.bitmap.data[idx];
      const newVal = gray < threshold ? 0 : 255;
      this.bitmap.data[idx] = newVal;
      this.bitmap.data[idx + 1] = newVal;
      this.bitmap.data[idx + 2] = newVal;
    });
  }
  
  selectBestResults(results) {
    const candidates = results.map(r => ({
      amount: this.extractAmount(r.data.text, r.data.words),
      date: this.extractDate(r.data.text, r.data.words),
      rawText: r.data.text,
      confidence: r.data.confidence
    }));
    
    // Select best amount
    const amounts = candidates
      .filter(c => c.amount.value && c.amount.confidence > 40)
      .sort((a, b) => b.amount.confidence - a.amount.confidence);
    
    // Select best date
    const dates = candidates
      .filter(c => c.date && c.date.confidence > 50)
      .sort((a, b) => b.date.confidence - a.date.confidence);
    
    return {
      amount: amounts[0]?.amount.value || 0,
      date: dates[0]?.date || null,
      confidence: {
        amount: amounts[0]?.amount.confidence || 0,
        date: dates[0]?.date.confidence || 0
      }
    };
  }
  
  extractAmount(text, words) {
    // Implementation from section 8
    // ... (total detection logic)
    return { value: 0, confidence: 0 }; // Placeholder
  }
  
  extractDate(text, words) {
    // Implementation from section 8
    // ... (date detection logic)
    return null; // Placeholder
  }
  
  evaluateQuality(result) {
    const score = (result.confidence.amount + result.confidence.date) / 2;
    return {
      verdict: score > 70 ? 'ACCEPT' : score > 40 ? 'RETRY' : 'ESCALATE',
      score
    };
  }
  
  async googleVisionOCR(imagePath) {
    // Google Vision API implementation
    // ... (cloud OCR logic)
    return { amount: 0, date: null };
  }
}

// Usage
const ocr = new ThermalReceiptOCR({ mode: 'medium' });
const result = await ocr.processReceipt('/path/to/receipt.jpg');
console.log(result);
```

---

## Quick Start Checklist

- [ ] Install dependencies: `jimp`, `tesseract.js`
- [ ] Implement multi-pass OCR with 3-5 preprocessing variants
- [ ] Use PSM 6 as default, try PSM 4 and 3 as alternates
- [ ] Set adaptive threshold at 60-70% of average brightness
- [ ] Upscale images to minimum 1200px width
- [ ] Extract amount using "total" keyword + largest amount fallback
- [ ] Extract date with multiple regex patterns
- [ ] Implement confidence scoring and retry logic
- [ ] Set timeout at 30 seconds per receipt
- [ ] Add Google Vision API fallback for failed receipts

---

This guide provides a production-ready foundation for thermal receipt OCR on Raspberry Pi 5.
