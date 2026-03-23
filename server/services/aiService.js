const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '[GCP_API_KEY]';
const AI_TIMEOUT_MS = 6000; // 6-second timeout so AI never blocks complaint submission

const DEPARTMENTS = [
  'Water Supply', 'Roads & Infrastructure', 'Sanitation',
  'Electricity', 'Public Safety', 'Health Services', 'Education', 'Transport'
];

const DEPT_TO_ID = {
  'Water Supply': 'd1', 'Roads & Infrastructure': 'd2', 'Sanitation': 'd3',
  'Electricity': 'd4', 'Public Safety': 'd5', 'Health Services': 'd6',
  'Education': 'd7', 'Transport': 'd8'
};

// ── Keyword-based fallback classifier ────────────────────────────────────────
function keywordClassify(text) {
  const t = text.toLowerCase();
  const scores = {
    'Water Supply':           ['water', 'pipe', 'leak', 'supply', 'tap', 'drainage', 'flood', 'sewage'].filter(k => t.includes(k)).length,
    'Roads & Infrastructure': ['road', 'pothole', 'bridge', 'footpath', 'pavement', 'street', 'construction'].filter(k => t.includes(k)).length,
    'Sanitation':             ['garbage', 'waste', 'trash', 'clean', 'toilet', 'latrine', 'dump', 'smell', 'hygiene'].filter(k => t.includes(k)).length,
    'Electricity':            ['power', 'electricity', 'light', 'wire', 'transformer', 'outage', 'voltage', 'meter'].filter(k => t.includes(k)).length,
    'Public Safety':          ['crime', 'theft', 'police', 'accident', 'danger', 'safety', 'harassment', 'assault'].filter(k => t.includes(k)).length,
    'Health Services':        ['hospital', 'doctor', 'medicine', 'health', 'clinic', 'ambulance', 'disease'].filter(k => t.includes(k)).length,
    'Education':              ['school', 'teacher', 'student', 'college', 'education', 'books', 'class'].filter(k => t.includes(k)).length,
    'Transport':              ['bus', 'auto', 'traffic', 'signal', 'transport', 'vehicle', 'parking'].filter(k => t.includes(k)).length,
  };
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dept, score]) => ({
      department: dept,
      departmentId: DEPT_TO_ID[dept],
      confidence: Math.min(0.95, 0.4 + score * 0.15)
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

// ── AI Classification ─────────────────────────────────────────────────────────
async function classifyComplaint(text) {
  const isUrgent = detectUrgency(text);

  if (!GEMINI_API_KEY) {
    return { categories: keywordClassify(text), isUrgent, method: 'keyword' };
  }

  const prompt = `Classify this citizen complaint into the top 3 most relevant government departments from this list: ${DEPARTMENTS.join(', ')}.

Complaint: "${text.slice(0, 1000)}"

Respond ONLY with valid JSON in this exact format:
{"categories": [{"department": "...", "confidence": 0.9}, {"department": "...", "confidence": 0.7}, {"department": "...", "confidence": 0.4}], "isUrgent": false}

confidence is a number 0-1. isUrgent is true if the complaint involves danger/emergency.`;

  const aiCall = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 300 }
    })
  }).then(async r => {
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const categories = parsed.categories.map(c => ({
      ...c,
      departmentId: DEPT_TO_ID[c.department] || 'd1'
    }));
    return { categories, isUrgent: parsed.isUrgent || isUrgent, method: 'ai' };
  });

  const fallback = { categories: keywordClassify(text), isUrgent, method: 'keyword-timeout' };

  try {
    return await withTimeout(aiCall, AI_TIMEOUT_MS, fallback);
  } catch {
    return { categories: keywordClassify(text), isUrgent, method: 'keyword-fallback' };
  }
}

// ── AI Summary ────────────────────────────────────────────────────────────────
async function generateSummary(complaint) {
  if (!GEMINI_API_KEY) {
    return `Complaint regarding ${complaint.category} in ${complaint.location || 'the area'}. Priority: ${complaint.priority}.`;
  }

  const prompt = `Summarize this citizen complaint in one concise sentence for an officer dashboard:\n\n"${complaint.description.slice(0, 1000)}"\n\nReturn only the summary sentence without quotation marks.`;

  const aiCall = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 150 }
    })
  }).then(async r => {
    const data = await r.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (text) text = text.replace(/^"|"$/g, '');
    return text;
  });

  try {
    return await withTimeout(aiCall, AI_TIMEOUT_MS, null) || complaint.description.slice(0, 120);
  } catch {
    return complaint.description.slice(0, 120);
  }
}

/** Detect if a new complaint is a duplicate of any existing recent complaints. */
async function detectDuplicates(newComplaint, recentComplaints) {
  if (!GEMINI_API_KEY || !recentComplaints.length) return null;

  const list = recentComplaints.map(c => `ID: ${c.id}\nTitle: ${c.title}\nDescription: ${c.description.slice(0, 300)}`).join('\n\n---\n\n');
  const prompt = `A citizen is submitting a new complaint. Below is a list of existing nearby complaints. Determine if the new complaint is a duplicate (describing the exact same incident/issue) of ANY existing complaint.

NEW COMPLAINT:
Title: ${newComplaint.title}
Description: ${newComplaint.description.slice(0, 500)}

EXISTING COMPLAINTS:
${list}

Return ONLY the ID of the matching duplicate complaint, or "NULL" if no duplicate is found.`;

  const aiCall = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 50 }
    })
  }).then(async r => {
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NULL';
    if (text === 'NULL' || text === 'null') return null;
    // Basic validation that output is a UUID format or matches one of the IDs
    const matchedId = text.match(/[0-9a-f-]{36}/i)?.[0] || text;
    return recentComplaints.find(c => c.id === matchedId) ? matchedId : null;
  });

  try {
    return await withTimeout(aiCall, AI_TIMEOUT_MS, null);
  } catch {
    return null;
  }
}

module.exports = { classifyComplaint, generateSummary, detectUrgency, detectDuplicates };
