// Enhanced main.js with all new features

const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://ai-study-tutor-1-3dt7.onrender.com";

// (all other variables the same...)

let currentQuizData = null;
let currentQuizAnswers = [];
let quickfireTimer = null;
let quickfireTimeLeft = 60;

// (all your DOM elements here...)

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

// ==================== QUIZ FUNCTIONS (unchanged) ====================
// Keep the QUIZ functions as they were – only Quickfire below needs fix!

// ==================== QUICKFIRE FUNCTIONS (FIXED!) ====================
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
            difficulty: "medium",
            count: 5,
            types: "mcq,fillblank,truefalse"
        });
        currentQuizData = response.questions;
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

// ---- FIXED renderQuickfire TO SUPPORT ALL TYPES ----
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
        // Render based on question type
        if (q.type === 'fillblank') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'quiz-input';
            input.placeholder = 'Type your answer here...';
            input.addEventListener('input', e => {
                currentQuizAnswers[idx] = e.target.value.trim();
            });
            qDiv.appendChild(input);
        } else if (q.type === 'truefalse') {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'quiz-options';
            ['True', 'False'].forEach((opt, optIdx) => {
                const optDiv = document.createElement('div');
                optDiv.className = 'quiz-option';
                optDiv.textContent = opt;
                optDiv.addEventListener('click', () => {
                    optionsDiv.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
                    optDiv.classList.add('selected');
                    currentQuizAnswers[idx] = optIdx; // 0 for True, 1 for False
                });
                optionsDiv.appendChild(optDiv);
            });
            qDiv.appendChild(optionsDiv);
        } else if (q.type === 'mcq') {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'quiz-options';
            (q.options || []).forEach((opt, optIdx) => {
                const optDiv = document.createElement('div');
                optDiv.className = 'quiz-option';
                optDiv.textContent = opt;
                optDiv.addEventListener('click', () => {
                    optionsDiv.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
                    optDiv.classList.add('selected');
                    currentQuizAnswers[idx] = optIdx;
                });
                optionsDiv.appendChild(optDiv);
            });
            qDiv.appendChild(optionsDiv);
        }
        quickfireContainer.appendChild(qDiv);
    });
}

function startQuickfireTimer() {
    quickfireTimeLeft = 60;
    updateTimerDisplay();
    if (quickfireTimer) clearInterval(quickfireTimer);
    quickfireTimer = setInterval(() => {
        quickfireTimeLeft--;
        updateTimerDisplay();
        if (quickfireTimeLeft === 10) timerDisplay?.classList.add('warning');
        if (quickfireTimeLeft === 0) {
            clearInterval(quickfireTimer);
            submitQuickfire?.click();
        }
    }, 1000);
}
function updateTimerDisplay() {
    if (!timerDisplay) return;
    const mins = Math.floor(quickfireTimeLeft / 60);
    const secs = quickfireTimeLeft % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
        } else if (q.type === 'truefalse') {
            isCorrect = (userAnswer === q.correctIndex);
            const options = qDiv.querySelectorAll('.quiz-option');
            options.forEach((opt, optIdx) => {
                opt.style.pointerEvents = 'none';
                if (optIdx === q.correctIndex) opt.classList.add('correct');
                if (userAnswer === optIdx && !isCorrect) opt.classList.add('incorrect');
            });
        } else if (q.type === 'mcq') {
            isCorrect = userAnswer === q.correctIndex;
            const options = qDiv.querySelectorAll('.quiz-option');
            options.forEach((opt, optIdx) => {
                opt.style.pointerEvents = 'none';
                if (optIdx === q.correctIndex) opt.classList.add('correct');
                if (userAnswer === optIdx && !isCorrect) opt.classList.add('incorrect');
            });
        }
        if (isCorrect) correctCount++;
    });
    showElement(quickfireActions, false);
    const timeUsed = 60 - quickfireTimeLeft;
    quickfireResult.innerHTML = `
        <div class="quiz-score">
            <h2>${correctCount}/5</h2>
            <p>Time: ${timeUsed}s</p>
            <p>${
                correctCount >= 4
                    ? '🎉 Excellent!'
                    : correctCount >= 3
                        ? '👍 Good job!'
                        : '💪 Keep practicing!'
            }</p>
        </div>
    `;
    showElement(quickfireResultSection, true);
}
retryQuickfire?.addEventListener('click', () => quickfireBtn?.click());

// ==================== ...rest of your main.js remains as-is ... ====================
