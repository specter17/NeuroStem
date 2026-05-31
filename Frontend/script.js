
(function() {
    // â”€â”€â”€ THEME INITIALIZATION â”€â”€â”€
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™';
        }
    }
    
    initializeTheme();

    let selectedSubject = 'math';
    let selectedLevel = 'grade1-8';
    let activeTab = 'simple';
    let isSpeaking = false;
    let formulas = [];
    let jargon = [];
    const speechSynth = window.speechSynthesis;

    const LEVEL_LABELS = {
        'grade1-8': 'Grade 1â€“8',
        'grade9-12': 'Grade 9â€“12',
        'undergrad': 'Undergraduate',
        'phd': 'Graduate / PhD',
    };
    const SUBJECT_LABELS = {
        'math': 'Mathematics',
        'science': 'Science',
    };

    const stemInput = document.getElementById('stemInput');
    const charCounter = document.getElementById('charCounter');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const simplifyBtn = document.getElementById('simplifyBtn');
    const readInputBtn = document.getElementById('readInputBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tabBar = document.getElementById('tabBar');
    const outputActions = document.getElementById('outputActions');
    const levelBadge = document.getElementById('levelBadge');
    const selectionDisplay = document.getElementById('selectionDisplay');
    const readOutputBtn = document.getElementById('readOutputBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    const simplifyMoreBtn = document.getElementById('simplifyMoreBtn');
    const deeperBtn = document.getElementById('deeperBtn');
    const toast = document.getElementById('toast');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    let currentOutput = { simple: '', steps: '', terms: [], quiz: [] };

    async function callBackendAPI() {
        const payload = {
            content: stemInput.value,
            subject: selectedSubject,
            level: selectedLevel
        };

        try {
            setLoading(true);
            
            const response = await fetch('http://localhost:3000/api/stem/simplify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Backend error: ' + response.statusText);
            }

            const data = await response.json();
            currentOutput = {
                simple: data.simple,
                steps: data.steps,
                terms: data.terms || [],
                quiz: data.quiz || [],
            };

            try {
                const formulasRes = await fetch('http://localhost:3000/api/stem/extract-formulas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: stemInput.value })
                });
                const formulasData = await formulasRes.json();
                formulas = formulasData.formulas || [];
            } catch (e) {
                console.log('Formula extraction not available');
            }

            try {
                const jargonRes = await fetch('http://localhost:3000/api/stem/extract-jargon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: stemInput.value, level: selectedLevel })
                });
                const jargonData = await jargonRes.json();
                jargon = jargonData.jargon || [];
            } catch (e) {
                console.log('Jargon extraction not available');
            }

            renderOutput();
            const outputSec = document.getElementById('output-section');
            if (outputSec) outputSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            showToast('âŒ Error: ' + error.message);
            console.error('API Error:', error);
        } finally {
            setLoading(false);
        }
    }

    simplifyBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('Please paste some STEM content first!');
        callBackendAPI();
    });

    if (hamburger) hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            if (hamburger) hamburger.classList.remove('open');
        });
    });

    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSubject = btn.dataset.subject;
            updateSelectionDisplay();
        });
    });

    
        card.addEventListener('click', () => {
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedLevel = card.dataset.level;
            updateSelectionDisplay();
        });
    });document.querySelectorAll('.level-card').forEach(card => {

    function updateSelectionDisplay() {
        const label = SUBJECT_LABELS[selectedSubject] + ' Â· ' + LEVEL_LABELS[selectedLevel];
        if (selectionDisplay) selectionDisplay.textContent = label;
        if (levelBadge) levelBadge.textContent = label;
    }

    stemInput.addEventListener('input', () => {
        charCounter.textContent = stemInput.value.length + ' / 3000';
    });

    clearInputBtn.addEventListener('click', () => {
        stemInput.value = '';
        charCounter.textContent = '0 / 3000';
    });

    clearAllBtn.addEventListener('click', () => {
        stemInput.value = '';
        charCounter.textContent = '0 / 3000';
        resetOutput();
    });

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            stemInput.value = chip.dataset.q;
            charCounter.textContent = stemInput.value.length + ' / 3000';
            stemInput.focus();
            showToast('Example loaded! Click âœ¨ Simplify');
        });
    });

    function speak(text) {
        if (!speechSynth) return showToast('Voice not supported in this browser');
        speechSynth.cancel();
        if (isSpeaking) { isSpeaking = false; return; }
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        utter.pitch = 1;
        utter.onend = () => { isSpeaking = false; };
        speechSynth.speak(utter);
        isSpeaking = true;
    }

    readInputBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('Nothing to read!');
        speak(stemInput.value);
    });

    readOutputBtn.addEventListener('click', () => {
        const text = getActiveTabText();
        if (!text) return showToast('Nothing to read');
        speak(text);
    });

    copyOutputBtn.addEventListener('click', () => {
        const text = getActiveTabText();
        if (!text) return showToast('Nothing to copy');
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard! ðŸ“‹')).catch(() => showToast('Could not copy'));
    });

    simplifyMoreBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('No content to simplify');
        showToast('Simplifying furtherâ€¦');
        callBackendAPI();
    });

    deeperBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('No content to go deeper on');
        showToast('Going deeperâ€¦');
        callBackendAPI();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            showTab(activeTab);
        });
    });

    function showTab(tab) {
        ['simpleTab', 'stepsTab', 'termsTab', 'quizTab', 'formulasTab', 'jargonTab'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const map = { simple: 'simpleTab', steps: 'stepsTab', terms: 'termsTab', quiz: 'quizTab', formulas: 'formulasTab', jargon: 'jargonTab' };
        const el = document.getElementById(map[tab]);
        if (el) el.style.display = 'block';
    }

    function getActiveTabText() {
        if (activeTab === 'simple') return currentOutput.simple;
        if (activeTab === 'steps') return currentOutput.steps;
        if (activeTab === 'terms') return currentOutput.terms.map(t => t.word + ': ' + t.definition).join('\n');
        if (activeTab === 'formulas') return formulas.map(f => f.formula + ' = ' + f.explanation).join('\n');
        if (activeTab === 'jargon') return jargon.map(j => j.word + ': ' + j.definition).join('\n');
        return '';
    }

    function renderOutput() {
        emptyState.style.display = 'none';
        tabBar.style.display = 'flex';
        outputActions.style.display = 'flex';
        
        document.getElementById('simpleTab').innerHTML = formatSimple(currentOutput.simple);
        document.getElementById('stepsTab').innerHTML = formatSteps(currentOutput.steps);
        document.getElementById('termsTab').innerHTML = formatTerms(currentOutput.terms);
        document.getElementById('quizTab').innerHTML = formatQuiz(currentOutput.quiz);
        
        if (formulas.length > 0 && document.getElementById('formulasTab')) {
            document.getElementById('formulasTab').innerHTML = formatFormulas(formulas);
        }
        if (jargon.length > 0 && document.getElementById('jargonTab')) {
            document.getElementById('jargonTab').innerHTML = formatJargon(jargon);
        }
        
        activeTab = 'simple';
        showTab('simple');
        attachQuizListeners();
    }

    function formatSimple(text) {
        return text.split(/\n\n+/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
    }

    function formatSteps(text) {
        const items = text.split(/\n/).filter(l => l.trim()).map(l => '<li>' + escHtml(l.replace(/^\d+\.\s*/, '')) + '</li>');
        return '<ol style="padding-left:1.5rem;">' + items.join('') + '</ol>';
    }

    function formatTerms(terms) {
        return terms.map(t => `<div class="term-card"><strong>${escHtml(t.word)}</strong><p>${escHtml(t.definition)}</p></div>`).join('');
    }

    function formatFormulas(formulas) {
        return formulas.length > 0 ? formulas.map(f => `<div class="formula-card"><strong>${escHtml(f.formula)}</strong><p>${escHtml(f.explanation)}</p></div>`).join('') : '<p>No formulas found.</p>';
    }

    function formatJargon(jargon) {
        return jargon.length > 0 ? jargon.map(j => `<div class="term-card"><strong>${escHtml(j.word)}</strong><p>${escHtml(j.definition)}</p></div>`).join('') : '<p>No difficult words found.</p>';
    }

    function formatQuiz(quiz) {
        return quiz.map((q, qi) => `<div class="quiz-q"><p class="q-text">${qi + 1}. ${escHtml(q.question)}</p>${q.options.map((opt, oi) => `<button class="quiz-option" data-qi="${qi}" data-oi="${oi}" data-correct="${q.correct}">${escHtml(opt)}</button>`).join('')}</div>`).join('');
    }

    function attachQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', function() {
                const qi = this.dataset.qi;
                const oi = parseInt(this.dataset.oi);
                const correct = parseInt(this.dataset.correct);
                const group = document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`);
                group.forEach(b => b.disabled = true);
                if (oi === correct) { this.classList.add('correct'); } 
                else { this.classList.add('wrong'); group[correct].classList.add('correct'); }
            });
        });
    }

    function resetOutput() {
        emptyState.style.display = 'block';
        tabBar.style.display = 'none';
        outputActions.style.display = 'none';
    }

    function setLoading(state) {
        loadingState.style.display = state ? 'flex' : 'none';
        simplifyBtn.disabled = state;
        simplifyBtn.textContent = state ? 'â³ Thinkingâ€¦' : 'âœ¨ Simplify';
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function escHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™';
        });
    }

    updateSelectionDisplay();
})();
const featureData = {
    'AI Simplification': {
        icon: 'âœ¨',
        desc: 'Transforms dense STEM content into clear, grade-appropriate explanations instantly. Just paste any Math or Science text and get a simplified explanation tailored to your level.'
    },
    'Voice Narration': {
        icon: 'ðŸ”Š',
        desc: 'Listen to any explanation read aloud at a comfortable speed. Great for dyslexic learners and anyone who prefers audio learning.'
    },
    'Formula Explainer': {
        icon: 'ðŸ“',
        desc: 'Any formula â€” from E=mcÂ² to integration â€” broken down into plain English, step by step. Never be confused by a formula again!'
    },
    '4 Education Levels': {
        icon: 'ðŸŽ“',
        desc: 'From Grade 1 stories to PhD research analysis. One tool for every stage of education â€” select your level and get explanations just right for you.'
    },
    'Science & Math Both': {
        icon: 'ðŸ”¬',
        desc: 'Covers Biology, Chemistry, Physics, Algebra, Calculus, Statistics and more. One platform for all your STEM needs.'
    },
    'Jargon Buster': {
        icon: 'ðŸ“–',
        desc: 'Automatically identifies hard words and explains every one in simple language. Never get stuck on a difficult term again!'
    },
    'Instant Quizzes': {
        icon: 'ðŸ§ ',
        desc: 'Auto-generates comprehension questions after every explanation to test understanding. Learn, then verify you understood!'
    },
};

document.querySelectorAll('.feature-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        const title = card.querySelector('h3')?.textContent?.trim();
        const data = featureData[title];
        if (!data) return;
        document.getElementById('modalIcon').textContent = data.icon;
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalDesc').textContent = data.desc;
        document.getElementById('featureModal').style.display = 'flex';
    });
});

document.getElementById('featureModal').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
});
function translatePage(lang) {
    if (!lang) return;
    const url = `https://translate.google.com/translate?sl=en&tl=${lang}&u=${encodeURIComponent(window.location.href)}`;
    window.location.href = url;
}
function translatePage(lang) {
    if (!lang) return;
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split('#')[0];
    const hash = currentUrl.includes('#') ? '#' + currentUrl.split('#')[1] : '';
    const translateUrl = `https://translate.google.com/translate?sl=auto&tl=${lang}&u=${encodeURIComponent(baseUrl)}`;
    window.location.href = translateUrl;
}
function translatePage(lang) {
    if (!lang) return;
    
    if (lang === 'en') {
        // English - reload original
        window.location.href = 'https://superlative-axolotl-ab98c1.netlify.app';
        return;
    }
    
    // Use Google Translate proxy
    const siteUrl = 'https://superlative-axolotl-ab98c1.netlify.app';
    const translateUrl = `https://${lang}.wikipedia.org` ; // placeholder
    
    // Direct Google Translate approach
    window.location.href = `https://translate.google.com/translate?sl=en&tl=${lang}&hl=${lang}&u=${siteUrl}&sandbox=1`;
}
