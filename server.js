import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import fetch from "node-fetch";

// Load environment variables with error handling
const envResult = dotenv.config();

if (envResult.error) {
  console.error('⚠️  Error loading .env file:', envResult.error);
  console.log('💡 Make sure you have a .env file in your root directory');
}

// Validate API key on startup
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found in environment variables!');
  console.log('📝 Please create a .env file with: OPENROUTER_API_KEY=your_key_here');
  console.log('🔗 Get your key from: https://openrouter.ai/keys');
} else {
  console.log('✅ API Key loaded successfully');
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
});
app.use(limiter);

const WORKING_MODEL = "google/gemma-2-9b-it";

// Helper: Call AI
async function callAI(prompt, maxTokens = 1000) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("API key not configured");
  }

  console.log("Sending prompt to AI:", prompt.substring(0, 100) + "...");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: WORKING_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      stream: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data?.error?.message || data?.error || response.statusText || "Unknown API error";
    throw new Error(`API Error (${response.status}): ${errMsg}`);
  }

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("No response from AI");
  }

  return data.choices[0].message.content;
}

// Parse quiz JSON
function parseQuizResponse(rawResponse) {
  let cleaned = rawResponse.trim();

  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '').trim();
  }

  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']') + 1;

  if (arrayStart === -1 || arrayEnd <= arrayStart) {
    throw new Error("No valid JSON array found in response");
  }

  cleaned = cleaned.substring(arrayStart, arrayEnd);

  try {
    const quizData = JSON.parse(cleaned);
    if (!Array.isArray(quizData)) throw new Error("Response is not an array");
    return quizData;
  } catch (jsonErr) {
    throw new Error("Failed to parse quiz JSON: " + jsonErr.message);
  }
}

// Homepage
app.get("/", (req, res) => {
  res.send("AI Study Tutor API - Enhanced Edition");
});

// ENHANCED SUMMARIZE ENDPOINT
app.post("/api/summarize", async (req, res) => {
  try {
    const { content, length = 'medium', format = 'paragraph' } = req.body;

    if (!content) return res.status(400).json({ error: "No content provided" });

    const truncatedContent = content.length > 2500 ? content.substring(0, 2500) + "..." : content;

    const lengthMap = {
      'short': '150 words',
      'medium': '500 words',
      'long': '800 words'
    };

    const formatInstructions = {
      'paragraph': 'Write as flowing paragraphs.',
      'points': 'Write as bullet points with key information.',
      'headings': 'Organize with headings and subheadings.',
      'mixed': 'Use a mix of paragraphs, headings, and bullet points for best clarity.'
    };

    const prompt = `Summarize this text in ${lengthMap[length] || '150 words'} or less. ${formatInstructions[format] || ''} Use simple, clear language suitable for students:

${truncatedContent}

Provide ONLY the summary, no preamble or extra text.`;

    const rawSummary = await callAI(prompt, 500);

    const summary = rawSummary.trim()
      .replace(/^(Here's|Here is|This is|The following is)\s+(a\s+)?(summary|text|content)[^:]*:\s*/i, '')
      .replace(/^Summary:\s*/i, '')
      .trim();

    res.json({ summary });
  } catch (err) {
    console.error("Error generating summary:", err);
    res.status(500).json({ error: "Failed to summarize", details: err.message });
  }
});

// ENHANCED QUIZ ENDPOINT
app.post("/api/generateQuiz", async (req, res) => {
  try {
    const { 
      content, 
      count = 10, 
      difficulty = 'medium',
      types = 'mcq,fillblank,truefalse'
    } = req.body;

    if (!content) return res.status(400).json({ error: "No content provided" });

    const requestedCount = Math.min(parseInt(count), 50);
    const truncatedText = content.length > 2500 ? content.substring(0, 2500) + "..." : content;

    const typeArray = types.split(',').filter(t => ['mcq', 'fillblank', 'truefalse'].includes(t));
    
    const difficultyMap = {
      'easy': 'simple, straightforward concepts',
      'medium': 'standard difficulty with moderate depth',
      'hard': 'complex concepts requiring deep understanding'
    };

    // Calculate distribution of question types
    const distribution = {};
    const perType = Math.floor(requestedCount / typeArray.length);
    const remainder = requestedCount % typeArray.length;
    
    typeArray.forEach((type, idx) => {
      distribution[type] = perType + (idx < remainder ? 1 : 0);
    });

    const prompt = `Create ${requestedCount} quiz questions (${difficultyMap[difficulty]}) from this content.

Question type distribution:
${Object.entries(distribution).map(([type, num]) => `- ${num} ${type.toUpperCase()} questions`).join('\n')}

Return ONLY this JSON format with NO extra text:
[
  {
    "type": "mcq" | "fillblank" | "truefalse",
    "question": "Question text?",
    "options": ["A", "B", "C", "D"] (for mcq/truefalse only),
    "correctIndex": 0 (for mcq/truefalse),
    "correctAnswer": "answer text" (for fillblank only),
    "hint": "Brief hint",
    "explanation": "Why this is correct"
  }
]

For TRUE/FALSE questions: options should be ["True", "False"]
For FILL IN THE BLANK: omit "options" and "correctIndex", provide "correctAnswer" instead

Content:
${truncatedText}`;

    const tokensPerQuestion = 150;
    const maxTokens = Math.min(4000, 300 + (requestedCount * tokensPerQuestion));

    const quiz = await callAI(prompt, maxTokens);
    const quizData = parseQuizResponse(quiz);

    // Validate and format questions
    const filtered = quizData
      .filter(q => {
        if (!q.question) return false;
        if (q.type === 'fillblank') return q.correctAnswer;
        return Array.isArray(q.options) && typeof q.correctIndex === 'number';
      })
      .slice(0, requestedCount)
      .map(q => ({
        type: q.type || 'mcq',
        question: q.question.trim(),
        options: q.options?.map(opt => String(opt).trim()),
        correctIndex: q.correctIndex,
        correctAnswer: q.correctAnswer?.trim(),
        hint: q.hint || "Think about the key concepts from the material.",
        explanation: q.explanation || "Review this topic for better understanding."
      }));

    if (filtered.length === 0) {
      throw new Error("No valid questions generated");
    }

    res.json({ questions: filtered });

  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(500).json({ error: "Failed to generate quiz", details: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Enhanced AI Study Tutor running on port ${PORT}`);
  console.log("Environment check:", { 
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    model: WORKING_MODEL
  });
});