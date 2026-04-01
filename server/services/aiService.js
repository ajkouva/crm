const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const AI_TIMEOUT_MS = 20000;

// Initialize Gemini if key is present
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

const DEPARTMENTS = [
  'Water Supply', 'Roads & Infrastructure', 'Sanitation',
  'Electricity', 'Public Safety', 'Health Services', 'Education', 'Transport'
];

const DEPT_TO_ID = {
  'Water Supply': 'd1', 'Roads & Infrastructure': 'd2', 'Sanitation': 'd3',
  'Electricity': 'd4', 'Public Safety': 'd5', 'Health Services': 'd6',
  'Education': 'd7', 'Transport': 'd8'
};

// ── Gibberish / low-quality input detection ───────────────────────────────────
/**
 * Returns true if the text is too short, repetitive, or has no meaningful words.
 * "hi", "hello", "test", "asdfjkl", etc. will all be caught.
 */
function isGibberish(text) {
  const t = (text || '').trim().toLowerCase();

  // Too short
  if (t.length < 8) {
    // Exception for very short but critical words
    const CRITICAL = new Set(['fire', 'help', 'leak', 'accident', 'danger', 'dead', 'death', 'sos', 'blood']);
    if (!CRITICAL.has(t)) return true;
  }

  const words = t.split(/\s+/).filter(Boolean);

  // Too few words
  if (words.length < 2) return true;

  // Use Unicode property escapes for letters (including Hindi, etc.)
  // \p{L} matches any letter from any language
  const meaningfulWords = words.filter(w => w.length >= 2 && /\p{L}/u.test(w));
  
  // If we have some meaningful words, it's probably not gibberish
  if (meaningfulWords.length >= 2) return false;

  // Entirely repeated words (e.g. "test test test")
  const unique = new Set(words);
  if (unique.size === 1 && words.length > 1) return true;

  // Only common filler words / greetings / garbage
  const FILLER = new Set([
    'hi', 'hello', 'hey', 'test', 'testing', 'yo', 'helo', 'hii', 'helo',
    'ok', 'okay', 'yes', 'no', 'nope', 'bye', 'lol', 'lmao', 'wtf', 'asdf',
    'qwerty', 'abcd', 'abc', 'xyz', 'zzz', 'aaa', 'bbb', 'ccc',
    'nothing', 'something', 'anything', 'idk', 'idc', 'haha', 'hmm',
  ]);
  const allFiller = words.every(w => FILLER.has(w));
  if (allFiller) return true;

  // Fraction of unique chars too low (e.g. "aaaaaaaaaaaaa")
  const uniqueChars = new Set(t.replace(/\s/g, '')).size;
  if (uniqueChars < 3) return true; // Relaxed from 4 to 3

  return false;
}

// ── Keyword-based fallback classifier ────────────────────────────────────────
function keywordClassify(text) {
  const t = text.toLowerCase();
  const scores = {
    'Water Supply':           ['water', 'pipe', 'leak', 'supply', 'tap', 'drainage', 'flood', 'sewage'].filter(k => t.includes(k)).length,
    'Roads & Infrastructure': ['road', 'pothole', 'bridge', 'footpath', 'pavement', 'street', 'construction'].filter(k => t.includes(k)).length,
    'Sanitation':             (['garbage', 'waste', 'trash', 'clean', 'toilet', 'latrine', 'dump', 'smell', 'hygiene', 'bin', 'sewage'].filter(k => t.includes(k)).length) * 1.5,
    'Electricity':            ['power', 'electricity', 'light', 'wire', 'transformer', 'outage', 'voltage', 'meter'].filter(k => t.includes(k)).length,
    'Public Safety':          ['crime', 'theft', 'police', 'accident', 'danger', 'safety', 'harassment', 'assault', 'illegal'].filter(k => t.includes(k)).length,
    'Health Services':        ['hospital', 'doctor', 'medicine', 'health', 'clinic', 'ambulance', 'disease'].filter(k => t.includes(k)).length,
    'Education':              ['school', 'teacher', 'student', 'college', 'education', 'books', 'class'].filter(k => t.includes(k)).length,
    'Transport':              ['bus', 'auto', 'traffic', 'signal', 'transport', 'vehicle', 'parking'].filter(k => t.includes(k)).length,
  };

  const best = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  // If the top score is 0, no keywords matched at all — return null to signal unclear
  if (best[0][1] === 0) return null;

  return best
    .slice(0, 3)
    .filter(([, score]) => score > 0)
    .map(([dept, score]) => ({
      department: dept,
      departmentId: DEPT_TO_ID[dept],
      confidence: Math.min(0.95, 0.5 + score * 0.15)
    }));
}

function detectUrgency(text) {
  const urgentWords = ['urgent', 'emergency', 'danger', 'death', 'fire', 'flood', 'accident', 'critical', 'immediately', 'help'];
  const t = text.toLowerCase();
  return urgentWords.some(w => t.includes(w));
}

/** Race an async operation against a timeout */
function withTimeout(promise, ms, fallback) {
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ── Models Integration ────────────────────────────────────────

const cleanJSON = (str) => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n/, '');
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n?/, '');
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/\n?```$/, '');
  return cleaned;
};

async function fetchGemini(prompt, jsonMode = false) {
  if (!geminiModel) return null;
  
  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : {}
    });
    const response = result.response;
    return response.text();
  } catch (err) {
    console.warn(`[AI-Gemini] API failure:`, err.message);
    return null;
  }
}

async function fetchOllama(prompt, jsonMode = false) {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        format: jsonMode ? 'json' : undefined
      })
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.warn(`[AI-Ollama] Failed to reach local model (${OLLAMA_MODEL}):`, err.message);
    return null;
  }
}

// Main generation wrapper that falls back if Gemini fails
async function fetchAI(prompt, jsonMode = false) {
  // Try Gemini first
  let res = await fetchGemini(prompt, jsonMode);
  if (res) return { text: res, method: 'gemini' };

  // Fallback to Ollama
  res = await fetchOllama(prompt, jsonMode);
  if (res) return { text: res, method: 'ollama' };

  return null;
}


// ── AI Classification ─────────────────────────────────────────────────────────
async function classifyComplaint(text) {
  // ── GATE 1: Gibberish / low-quality input ─────────────────────────────────
  if (isGibberish(text)) {
    return {
      categories: [],
      isUrgent: false,
      isGibberish: true,
      summary: '',
      translatedDescription: text,
      method: 'gibberish-rejected',
      error: 'Your complaint description is too short or unclear. Please provide more details about the issue (at least 8 characters with descriptive words).'
    };
  }

  const isUrgent = detectUrgency(text);

  // ── GATE 2: Keyword fallback first (fast, no AI needed for obvious cases) ──
  const keywordResult = keywordClassify(text);

  const prompt = `You are a government complaint classification system for India.
Classify this citizen complaint into ONE department from: ${DEPARTMENTS.join(', ')}.

Rules:
- WASTE/GARBAGE/TRASH/DRAIN → "Sanitation"
- POTHOLE/ROAD/BRIDGE → "Roads & Infrastructure"
- ELECTRICITY/POWER/WIRE/OUTAGE → "Electricity"
- WATER/LEAK/TAP/PIPELINE → "Water Supply"
- If the text is obvious nonsense or pure greetings with no context (e.g. "hi", "asdfasdf", "hello") → respond with isGibberish: true. If there are AT LEAST 2 contextual words (e.g. "water leak"), it is NOT gibberish.
- confidence must be 0.0–1.0

Complaint: "${text.slice(0, 1000)}"

Respond ONLY with valid JSON:
{
  "categories": [{"department": "Electricity", "confidence": 0.9}],
  "isGibberish": false,
  "isUrgent": false,
  "summary": "One-sentence English summary of the complaint",
  "translatedDescription": "Full English translation if non-English, else same as input"
}`;

  const fallbackCategories = keywordResult || [{
    department: 'General',
    departmentId: 'd7',
    confidence: 0.3
  }];
  const fallback = {
    categories: fallbackCategories,
    isUrgent,
    summary: text.slice(0, 100),
    translatedDescription: text,
    method: keywordResult ? 'keyword-fallback' : 'keyword-timeout'
  };

  const aiCall = async () => {
    const aiResult = await fetchAI(prompt, true);
    
    if (aiResult && aiResult.text) {
      try {
        const parsed = JSON.parse(cleanJSON(aiResult.text));

        // AI says it's gibberish
        if (parsed.isGibberish === true) {
          return {
            categories: [],
            isUrgent: false,
            isGibberish: true,
            summary: '',
            translatedDescription: text,
            method: `${aiResult.method}-gibberish`,
            error: 'Your complaint description does not describe a real civic issue. Please be more specific.'
          };
        }

        const categories = (parsed.categories || []).map(c => ({
          ...c,
          departmentId: DEPT_TO_ID[c.department] || 'd7'
        }));

        if (!categories.length) return fallback;

        return {
          categories,
          isUrgent: parsed.isUrgent || isUrgent,
          summary: parsed.summary || text.slice(0, 100),
          translatedDescription: parsed.translatedDescription || text,
          method: aiResult.method
        };
      } catch (e) {
        console.error(`[AI] JSON Parse Error for ${aiResult.method}:`, e.message, '\nRaw Output:', aiResult.text);
      }
    }
    return fallback;
  };

  return await withTimeout(aiCall(), AI_TIMEOUT_MS, fallback);
}

// ── AI Summary ────────────────────────────────────────────────────────────────
async function generateSummary(complaint) {
  const prompt = `Summarize this citizen complaint in one concise English sentence for an officer dashboard. 
If the input is in Hindi, translate it to English first.

Complaint: "${complaint.description.slice(0, 1000)}"

Return only the summary sentence without quotation marks.`;

  const aiCall = async () => {
    const aiResult = await fetchAI(prompt);
    if (aiResult && aiResult.text) return aiResult.text.trim().replace(/^"|"$/g, '');
    return complaint.description.slice(0, 120);
  };

  return await withTimeout(aiCall(), AI_TIMEOUT_MS, complaint.description.slice(0, 120));
}

/** Detect if a new complaint is a duplicate of any existing recent complaints. */
async function detectDuplicates(newComplaint, recentComplaints) {
  if (!recentComplaints.length) return null;

  const list = recentComplaints.map(c => `ID: ${c.id}\nTitle: ${c.title}\nDescription: ${c.description.slice(0, 300)}`).join('\n\n---\n\n');
  const prompt = `A citizen is submitting a new complaint. Below is a list of existing nearby complaints. Determine if the new complaint is a duplicate (describing the exact same incident/issue) of ANY existing complaint.

NEW COMPLAINT:
Title: ${newComplaint.title}
Description: ${newComplaint.description.slice(0, 500)}

EXISTING COMPLAINTS:
${list}

Return ONLY the ID of the matching duplicate complaint, or "NULL" if no duplicate is found.`;

  const aiCall = async () => {
    const aiResult = await fetchAI(prompt);
    if (aiResult && aiResult.text) {
      const match = aiResult.text.trim().replace(/^"|"$/g, '');
      if (match !== 'NULL' && match.toLowerCase() !== 'null') {
         return match.match(/[0-9a-f-]{36}/i)?.[0] || 'NULL';
      }
    }
    return null;
  };

  try {
    const matchedId = await withTimeout(aiCall(), AI_TIMEOUT_MS, null);
    return recentComplaints.find(c => c.id === matchedId) ? matchedId : null;
  } catch {
    return null;
  }
}

module.exports = {
  DEPT_TO_ID,
  isGibberish,
  classifyComplaint,
  generateSummary,
  detectDuplicates
};
