// Enhanced main.js with all new features
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://ai-study-tutor-awpw.onrender.com";

// State management
let currentQuizData = null;
let currentQuizAnswers = [];
let quickfireTimer = null;
let quickfireTimeLeft = 60;

// DOM Elements
const contentInput = document.getElementById('contentInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');

// Tab buttons
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Summary elements
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryLength = document.getElementById('summaryLength');
const summaryFormat = document.getElementById('summaryFormat');
const summarySection = document.getElementById('summarySection');
const summaryDisplay = document.getElementById('summaryDisplay');
const regenerateSummary = document.getElementById('regenerateSummary');
const copySummary = document.getElementById('copySummary');
const exportSummaryPDF = document.getElementById('exportSummaryPDF');

// Quiz elements
const quizBtn = document.getElementById('quizBtn');
const quizDifficulty = document.getElementById('quizDifficulty');
const questionCount = document.getElementById('questionCount');
const quizTypeMCQ = document.getElementById('quizTypeMCQ');
const quizTypeFillBlank = document.getElementById('quizTypeFillBlank');
const quizTypeTrueFalse = document.getElementById('quizTypeTrueFalse');
const quizSection = document.getElementById('quizSection');
const quizContainer = document.getElementById('quizContainer');
const quizProgress = document.getElementById('quizProgress');
const quizActions = document.getElementById('quizActions');
const submitQuiz = document.getElementById('submitQuiz');
const quizResultSection = document.getElementById('quizResultSection');
const quizResult = document.getElementById('quizResult');
const quizExplanations = document.getElementById('quizExplanations');
const retryQuiz = document.getElementById('retryQuiz');
const exportQuizPDF = document.getElementById('exportQuizPDF');

// Quickfire elements
const quickfireBtn = document.getElementById('quickfireBtn');
const quickfireSection = document.getElementById('quickfireSection');
const quickfireContainer = document.getElementById('quickfireContainer');
const timerDisplay = document.getElementById('timerDisplay');
const quickfireActions = document.getElementById('quickfireActions');
const submitQuickfire = document.getElementById('submitQuickfire');
const quickfireResultSection = document.getElementById('quickfireResultSection');
const quickfireResult = document.getElementById('quickfireResult');
const retryQuickfire = document.getElementById('retryQuickfire');

// Theme toggle
const themeToggle = document.getElementById('themeToggle');

// Utility Functions
function showLoading(show = true) {
  loading?.classList.toggle('hidden', !show);
}

function showElement(el, show = true) {
  el?.classList.toggle('hidden', !show);
}

async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server error (${res.status}): ${text}`);
  }
  return res.json();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => 
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])
  );
}

// Tab Navigation
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;
    
    // Update active states
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${targetTab}Tab`) {
        content.classList.add('active');
      }
    });
    
    // Hide result sections when switching tabs
    showElement(summarySection, false);
    showElement(quizSection, false);
    showElement(quizResultSection, false);
    showElement(quickfireSection, false);
    showElement(quickfireResultSection, false);
  });
});

// File Upload
uploadBtn?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  
  if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    const text = await file.text();
    contentInput.value = text;
  } else {
    alert('Please upload a .txt or .md file');
  }
});

// ==================== SUMMARY FUNCTIONS ====================

summarizeBtn?.addEventListener('click', async () => {
  const content = contentInput?.value?.trim();
  if (!content) {
    alert('Please paste or upload some content first.');
    return;
  }

  const length = summaryLength?.value || 'medium';
  const format = summaryFormat?.value || 'paragraph';

  showElement(summarySection, false);
  showLoading(true);

  try {
    const response = await postJSON(`${API_BASE}/api/summarize`, { 
      content, 
      length,
      format 
    });
    
    displaySummary(response.summary, format);
    showElement(summarySection, true);
  } catch (err) {
    alert('Error generating summary: ' + err.message);
  } finally {
    showLoading(false);
  }
});

function displaySummary(summary, format) {
  if (!summaryDisplay) return;
  
  let formattedSummary = summary
    .replace(/^Here's a summary.*?:\s*/i, '')
    .replace(/^Summary:\s*/i, '')
    .trim();

  // Format based on type
  if (format === 'points') {
    formattedSummary = formattedSummary
      .split(/\n|\.(?=\s+[A-Z])/)
      .filter(s => s.trim())
      .map(s => `• ${s.trim()}`)
      .join('<br>');
  } else if (format === 'headings') {
    formattedSummary = formattedSummary
      .replace(/\n/g, '<br>')
      .replace(/^([A-Z][^.!?]*:)/gm, '<strong>$1</strong>');
  } else {
    formattedSummary = formattedSummary.replace(/\n/g, '<br>');
  }

  summaryDisplay.innerHTML = `<div class="result-content">${formattedSummary}</div>`;
}

regenerateSummary?.addEventListener('click', () => summarizeBtn?.click());

copySummary?.addEventListener('click', async () => {
  const text = summaryDisplay?.textContent?.trim();
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    alert('Summary copied to clipboard!');
  } catch (e) {
    alert('Copy failed: ' + e.message);
  }
});

exportSummaryPDF?.addEventListener('click', () => {
  const text = summaryDisplay?.textContent?.trim();
  if (!text) return;
  
  generatePDF('AI Study Tutor - Summary', [
    { type: 'title', text: 'Study Material Summary' },
    { type: 'text', text: text }
  ]);
});

// ==================== QUIZ FUNCTIONS ====================

quizBtn?.addEventListener('click', async () => {
  const content = contentInput?.value?.trim();
  if (!content) {
    alert('Please paste or upload some content first.');
    return;
  }

  const difficulty = quizDifficulty?.value || 'medium';
  const count = parseInt(questionCount?.value) || 10;
  
  const types = [];
  if (quizTypeMCQ?.checked) types.push('mcq');
  if (quizTypeFillBlank?.checked) types.push('fillblank');
  if (quizTypeTrueFalse?.checked) types.push('truefalse');
  
  if (types.length === 0) {
    alert('Please select at least one question type.');
    return;
  }

  showElement(quizSection, false);
  showElement(quizResultSection, false);
  showLoading(true);

  try {
    const response = await postJSON(`${API_BASE}/api/generateQuiz`, {
      content,
      difficulty,
      count,
      types: types.join(',')
    });
    
    currentQuizData = response.questions || [];
    currentQuizAnswers = new Array(currentQuizData.length).fill(null);
    
    renderQuiz(currentQuizData);
    showElement(quizSection, true);
    showElement(quizActions, true);
  } catch (err) {
    alert('Error generating quiz: ' + err.message);
  } finally {
    showLoading(false);
  }
});

function renderQuiz(questions) {
  if (!quizContainer || !questions.length) return;
  
  quizContainer.innerHTML = '';
  quizProgress.textContent = `0 / ${questions.length} answered`;
  
  questions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    qDiv.dataset.index = idx;
    
    const type = q.type || 'mcq';
    const typeBadge = {
      'mcq': 'Multiple Choice',
      'fillblank': 'Fill in the Blank',
      'truefalse': 'True/False'
    }[type] || 'Multiple Choice';
    
    qDiv.innerHTML = `
      <div class="quiz-question-header">
        <div class="question-text">
          <strong>Q${idx + 1}.</strong> ${escapeHtml(q.question)}
        </div>
        <span class="question-type-badge">${typeBadge}</span>
      </div>
    `;
    
    // Render based on question type
    if (type === 'fillblank') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'quiz-input';
      input.placeholder = 'Type your answer here...';
      input.addEventListener('input', (e) => {
        currentQuizAnswers[idx] = e.target.value.trim();
        updateProgress();
      });
      qDiv.appendChild(input);
    } else {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'quiz-options';
      
      (q.options || []).forEach((opt, optIdx) => {
        const optDiv = document.createElement('div');
        optDiv.className = 'quiz-option';
        optDiv.textContent = opt;
        optDiv.addEventListener('click', () => {
          // Remove selection from siblings
          optionsDiv.querySelectorAll('.quiz-option').forEach(o => 
            o.classList.remove('selected')
          );
          optDiv.classList.add('selected');
          currentQuizAnswers[idx] = optIdx;
          updateProgress();
        });
        optionsDiv.appendChild(optDiv);
      });
      
      qDiv.appendChild(optionsDiv);
    }
    
    // Add hint section
    const hintDiv = document.createElement('div');
    hintDiv.className = 'hint-section';
    const hintBtn = document.createElement('button');
    hintBtn.className = 'neumo-btn secondary hint-btn';
    hintBtn.textContent = '💡 Show Hint';
    hintBtn.addEventListener('click', () => {
      const hintContent = hintDiv.querySelector('.hint-content');
      if (hintContent) {
        hintContent.remove();
      } else {
        const hint = document.createElement('div');
        hint.className = 'hint-content';
        hint.textContent = q.hint || 'Think carefully about the key concepts.';
        hintDiv.appendChild(hint);
      }
    });
    hintDiv.appendChild(hintBtn);
    qDiv.appendChild(hintDiv);
    
    quizContainer.appendChild(qDiv);
  });
}

function updateProgress() {
  const answered = currentQuizAnswers.filter(a => a !== null && a !== '').length;
  if (quizProgress) {
    quizProgress.textContent = `${answered} / ${currentQuizData.length} answered`;
  }
}

submitQuiz?.addEventListener('click', () => {
  if (currentQuizAnswers.some(a => a === null || a === '')) {
    if (!confirm('Some questions are unanswered. Submit anyway?')) return;
  }
  
  gradeQuiz();
});

function gradeQuiz() {
  let correctCount = 0;
  const results = [];
  
  currentQuizData.forEach((q, idx) => {
    const userAnswer = currentQuizAnswers[idx];
    const qDiv = quizContainer.querySelector(`[data-index="${idx}"]`);
    
    let isCorrect = false;
    
    if (q.type === 'fillblank') {
      const correctAnswer = String(q.correctAnswer || '').toLowerCase().trim();
      const userAns = String(userAnswer || '').toLowerCase().trim();
      isCorrect = correctAnswer === userAns || 
                  correctAnswer.includes(userAns) || 
                  userAns.includes(correctAnswer);
      
      const input = qDiv.querySelector('.quiz-input');
      if (input) {
        input.disabled = true;
        input.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
      }
    } else {
      isCorrect = userAnswer === q.correctIndex;
      
      const options = qDiv.querySelectorAll('.quiz-option');
      options.forEach((opt, optIdx) => {
        opt.style.pointerEvents = 'none';
        if (optIdx === q.correctIndex) {
          opt.classList.add('correct');
        }
        if (optIdx === userAnswer && !isCorrect) {
          opt.classList.add('incorrect');
        }
      });
    }
    
    if (isCorrect) correctCount++;
    
    // Add explanation
    const expDiv = document.createElement('div');
    expDiv.className = 'explanation';
    expDiv.innerHTML = `
      <strong>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</strong><br>
      ${q.explanation || 'Review the material for better understanding.'}
      ${q.type === 'fillblank' ? `<br><em>Correct answer: ${q.correctAnswer}</em>` : ''}
    `;
    qDiv.appendChild(expDiv);
    
    results.push({
      question: q.question,
      userAnswer: q.type === 'fillblank' ? userAnswer : q.options[userAnswer],
      correctAnswer: q.type === 'fillblank' ? q.correctAnswer : q.options[q.correctIndex],
      isCorrect,
      explanation: q.explanation
    });
  });
  
  // Hide quiz actions
  showElement(quizActions, false);
  
  // Show results
  const percentage = Math.round((correctCount / currentQuizData.length) * 100);
  quizResult.innerHTML = `
    <div class="quiz-score">
      <h2>${correctCount} / ${currentQuizData.length}</h2>
      <p>${percentage}% Score</p>
    </div>
  `;
  
  showElement(quizResultSection, true);
  
  // Store results for PDF export
  window.lastQuizResults = results;
}

retryQuiz?.addEventListener('click', () => {
  currentQuizAnswers = new Array(currentQuizData.length).fill(null);
  renderQuiz(currentQuizData);
  showElement(quizResultSection, false);
  showElement(quizActions, true);
});

exportQuizPDF?.addEventListener('click', () => {
  if (!window.lastQuizResults) return;
  
  const pdfContent = [
    { type: 'title', text: 'Quiz Results' },
    { type: 'text', text: `Score: ${window.lastQuizResults.filter(r => r.isCorrect).length} / ${window.lastQuizResults.length}` },
    { type: 'text', text: '' }
  ];
  
  window.lastQuizResults.forEach((r, idx) => {
    pdfContent.push(
      { type: 'subtitle', text: `Q${idx + 1}. ${r.question}` },
      { type: 'text', text: `Your Answer: ${r.userAnswer || 'No answer'}` },
      { type: 'text', text: `Correct Answer: ${r.correctAnswer}` },
      { type: 'text', text: `Status: ${r.isCorrect ? '✓ Correct' : '✗ Incorrect'}` },
      { type: 'text', text: `Explanation: ${r.explanation}` },
      { type: 'text', text: '' }
    );
  });
  
  generatePDF('AI Study Tutor - Quiz Results', pdfContent);
});

// ==================== QUICKFIRE FUNCTIONS ====================

quickfireBtn?.addEventListener('click', async () => {
  const content = contentInput?.value?.trim();
  if (!content) {
    alert('Please paste or upload some content first.');
    return;
  }

  showElement(quickfireSection, false);
  showElement(quickfireResultSection, false);
  showLoading(true);

  try {
    const response = await postJSON(`${API_BASE}/api/generateQuiz`, {
      content,
      difficulty: 'medium',
      count: 5,
      types: 'mcq,truefalse'
    });
    
    currentQuizData = response.questions || [];
    currentQuizAnswers = new Array(5).fill(null);
    
    renderQuickfire(currentQuizData.slice(0, 5));
    showElement(quickfireSection, true);
    showElement(quickfireActions, true);
    startQuickfireTimer();
  } catch (err) {
    alert('Error starting quick fire: ' + err.message);
  } finally {
    showLoading(false);
  }
});

function renderQuickfire(questions) {
  if (!quickfireContainer) return;
  
  quickfireContainer.innerHTML = '';
  
  questions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    qDiv.dataset.index = idx;
    
    qDiv.innerHTML = `
      <div class="question-text">
        <strong>Q${idx + 1}.</strong> ${escapeHtml(q.question)}
      </div>
    `;
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';
    
    (q.options || []).forEach((opt, optIdx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'quiz-option';
      optDiv.textContent = opt;
      optDiv.addEventListener('click', () => {
        optionsDiv.querySelectorAll('.quiz-option').forEach(o => 
          o.classList.remove('selected')
        );
        optDiv.classList.add('selected');
        currentQuizAnswers[idx] = optIdx;
      });
      optionsDiv.appendChild(optDiv);
    });
    
    qDiv.appendChild(optionsDiv);
    quickfireContainer.appendChild(qDiv);
  });
}

function startQuickfireTimer() {
  quickfireTimeLeft = 60;
  updateTimerDisplay();
  
  quickfireTimer = setInterval(() => {
    quickfireTimeLeft--;
    updateTimerDisplay();
    
    if (quickfireTimeLeft <= 10) {
      timerDisplay?.classList.add('warning');
    }
    
    if (quickfireTimeLeft <= 0) {
      clearInterval(quickfireTimer);
      submitQuickfire?.click();
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (!timerDisplay) return;
  const mins = Math.floor(quickfireTimeLeft / 60);
  const secs = quickfireTimeLeft % 60;
  timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

submitQuickfire?.addEventListener('click', () => {
  if (quickfireTimer) clearInterval(quickfireTimer);
  gradeQuickfire();
});

function gradeQuickfire() {
  let correctCount = 0;
  
  currentQuizData.slice(0, 5).forEach((q, idx) => {
    const userAnswer = currentQuizAnswers[idx];
    const qDiv = quickfireContainer.querySelector(`[data-index="${idx}"]`);
    
    const isCorrect = userAnswer === q.correctIndex;
    if (isCorrect) correctCount++;
    
    const options = qDiv.querySelectorAll('.quiz-option');
    options.forEach((opt, optIdx) => {
      opt.style.pointerEvents = 'none';
      if (optIdx === q.correctIndex) {
        opt.classList.add('correct');
      }
      if (optIdx === userAnswer && !isCorrect) {
        opt.classList.add('incorrect');
      }
    });
  });
  
  showElement(quickfireActions, false);
  
  const timeUsed = 60 - quickfireTimeLeft;
  quickfireResult.innerHTML = `
    <div class="quiz-score">
      <h2>${correctCount} / 5</h2>
      <p>Time: ${timeUsed}s</p>
      <p>${correctCount >= 4 ? '🎉 Excellent!' : correctCount >= 3 ? '👍 Good job!' : '💪 Keep practicing!'}</p>
    </div>
  `;
  
  showElement(quickfireResultSection, true);
}

retryQuickfire?.addEventListener('click', () => quickfireBtn?.click());

// ==================== PDF GENERATION ====================

function generatePDF(filename, content) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  let yPos = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = 170;
  
  content.forEach(item => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    
    if (item.type === 'title') {
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text(item.text, margin, yPos);
      yPos += 15;
    } else if (item.type === 'subtitle') {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const lines = doc.splitTextToSize(item.text, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 7 + 5;
    } else if (item.type === 'text') {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(item.text, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 6 + 3;
    }
  });
  
  doc.save(`${filename}.pdf`);
}

// ==================== THEME TOGGLE ====================

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    if (themeToggle) themeToggle.textContent = '☀️';
  }

  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
});