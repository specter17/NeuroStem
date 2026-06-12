(function() {
    // Detect API URL based on current location
    const API_URL = "https://neurostem-backend-kt8l.onrender.com";
    const tokenKey = 'neurostem_token';
    let authToken = localStorage.getItem(tokenKey) || '';
    let currentUser = null;

    let selectedSubject = 'math';
    let selectedLevel = 'grade1-8';
    let activeTab = 'simple';
    let isSpeaking = false;
    let formulas = [];
    let jargon = [];
    const speechSynth = window.speechSynthesis;

    const LEVEL_LABELS = {
        'grade1-8': 'Grade 1–8',
        'grade9-12': 'Grade 9–12',
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

    const authOpenBtn = document.getElementById('authOpenBtn');
    const authModal = document.getElementById('authModal');
    const authCloseBtn = document.getElementById('authCloseBtn');
    const authTabs = document.querySelectorAll('.auth-tabs .chip');
    const authLoginForm = document.getElementById('authLoginForm');
    const authRegisterForm = document.getElementById('authRegisterForm');
    const authStatus = document.getElementById('authStatus');
    const authSession = document.getElementById('authSession');
    const authUserEmail = document.getElementById('authUserEmail');
    const authLogoutBtn = document.getElementById('authLogoutBtn');

    const flashcardInput = document.getElementById('flashcardInput');
    const flashcardTopicInput = document.getElementById('flashcardTopicInput');
    const flashcardCount = document.getElementById('flashcardCount');
    const flashcardGenerateBtn = document.getElementById('flashcardGenerateBtn');
    const flashcardClearBtn = document.getElementById('flashcardClearBtn');
    const flashcardStatus = document.getElementById('flashcardStatus');
    const flashcardSelection = document.getElementById('flashcardSelection');
    const flashcardImageInput = document.getElementById('flashcardImageInput');
    const flashcardImageFront = document.getElementById('flashcardImageFront');
    const flashcardImageBack = document.getElementById('flashcardImageBack');
    const flashcardImageUploadBtn = document.getElementById('flashcardImageUploadBtn');
    const flashcardImageStatus = document.getElementById('flashcardImageStatus');
    const flashcardTopicFilter = document.getElementById('flashcardTopicFilter');
    const flashcardBookmarkFilter = document.getElementById('flashcardBookmarkFilter');
    const flashcardWeakFilter = document.getElementById('flashcardWeakFilter');
    const flashcardTypeFilter = document.getElementById('flashcardTypeFilter');
    const flashcardTimerSelect = document.getElementById('flashcardTimerSelect');
    const flashcardStartSessionBtn = document.getElementById('flashcardStartSessionBtn');
    const flashcardEndSessionBtn = document.getElementById('flashcardEndSessionBtn');
    const flashcardTimerDisplay = document.getElementById('flashcardTimerDisplay');
    const flashcardProgressFill = document.getElementById('flashcardProgressFill');
    const flashcardProgressPercent = document.getElementById('flashcardProgressPercent');
    const flashcardKnownCount = document.getElementById('flashcardKnownCount');
    const flashcardUnknownCount = document.getElementById('flashcardUnknownCount');
    const flashcardStreakCount = document.getElementById('flashcardStreakCount');
    const flashcardSwipe = document.getElementById('flashcardSwipe');
    const flashcardInner = document.getElementById('flashcardInner');
    const flashcardFront = document.getElementById('flashcardFront');
    const flashcardBack = document.getElementById('flashcardBack');
    const flashcardTopicLabel = document.getElementById('flashcardTopicLabel');
    const flashcardTypeLabel = document.getElementById('flashcardTypeLabel');
    const flashcardFlipBtn = document.getElementById('flashcardFlipBtn');
    const flashcardBookmarkBtn = document.getElementById('flashcardBookmarkBtn');
    const flashcardDontBtn = document.getElementById('flashcardDontBtn');
    const flashcardKnowBtn = document.getElementById('flashcardKnowBtn');
    const flashcardCardIndex = document.getElementById('flashcardCardIndex');
    const flashcardShuffleBtn = document.getElementById('flashcardShuffleBtn');

    const quizTopicInput = document.getElementById('quizTopicInput');
    const quizSelection = document.getElementById('quizSelection');
    const quizDifficultyRow = document.getElementById('quizDifficultyRow');
    const quizTimerSelect = document.getElementById('quizTimerSelect');
    const quizStartBtn = document.getElementById('quizStartBtn');
    const quizGenerateMoreBtn = document.getElementById('quizGenerateMoreBtn');
    const quizRetryBtn = document.getElementById('quizRetryBtn');
    const quizStatus = document.getElementById('quizStatus');
    const quizBankOutput = document.getElementById('quizBankOutput');
    const quizScore = document.getElementById('quizScore');
    const quizAccuracy = document.getElementById('quizAccuracy');
    const quizStreak = document.getElementById('quizStreak');
    const quizTimerDisplay = document.getElementById('quizTimerDisplay');
    const quizRecommendedDifficulty = document.getElementById('quizRecommendedDifficulty');
    const quizWeakTopics = document.getElementById('quizWeakTopics');

    let currentOutput = { simple: '', steps: '', terms: [], quiz: [] };
    let flashcards = [];
    let flashcardIndex = 0;
    let flashcardFilters = { topic: '', type: '', bookmarked: false, weak: false };
    let flashcardSessionId = null;
    let flashcardTimerId = null;
    let flashcardTimeLeft = 0;
    let flashcardSessionStats = { seen: 0, known: 0, unknown: 0 };
    let quizSessionId = null;
    let quizQuestions = [];
    let quizDifficulty = 'easy';
    let quizTimerId = null;
    let quizTimeLeft = 0;

    // Reset filters on page load
    if (flashcardTopicFilter) flashcardTopicFilter.value = '';
    if (flashcardBookmarkFilter) {
        flashcardBookmarkFilter.checked = false;
        flashcardFilters.bookmarked = false;
    }
    if (flashcardWeakFilter) {
        flashcardWeakFilter.checked = false;
        flashcardFilters.weak = false;
    }
    
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function escHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function ensureAuth() {
        if (authToken) return true;
        openAuthModal();
        showToast('Please sign in to save progress.');
        return false;
    }

    async function apiFetch(url, options = {}, requireAuth = false) {
        const headers = options.headers ? { ...options.headers } : {};
        if (requireAuth) {
            if (!authToken) throw new Error('Auth required');
            headers.Authorization = `Bearer ${authToken}`;
        }
        const response = await fetch(url, { ...options, headers });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data.error || data.message || response.statusText;
            throw new Error(message);
        }
        return data;
    }

    function openAuthModal() {
        if (!authModal) return;
        authModal.classList.add('open');
        authModal.setAttribute('aria-hidden', 'false');
        if (authStatus) authStatus.textContent = '';
    }

    function closeAuthModal() {
        if (!authModal) return;
        authModal.classList.remove('open');
        authModal.setAttribute('aria-hidden', 'true');
    }

    function setAuthMode(mode) {
        authTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.auth === mode);
        });
        if (authLoginForm) authLoginForm.classList.toggle('hidden', mode !== 'login');
        if (authRegisterForm) authRegisterForm.classList.toggle('hidden', mode !== 'register');
        if (authStatus) authStatus.textContent = '';
    }

    async function loadCurrentUser() {
        if (!authToken) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/auth/me`, {}, true);
            currentUser = data.user;
        } catch (error) {
            authToken = '';
            localStorage.removeItem(tokenKey);
            currentUser = null;
        }
        updateAuthUI();
    }

    function updateAuthUI() {
        if (authOpenBtn) {
            authOpenBtn.textContent = currentUser ? 'Signed In' : 'Account';
        }
        if (authSession) {
            authSession.style.display = currentUser ? 'flex' : 'none';
        }
        if (authUserEmail) authUserEmail.textContent = currentUser ? currentUser.email : '—';
    }

    if (authOpenBtn) authOpenBtn.addEventListener('click', openAuthModal);
    if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
    if (authTabs) authTabs.forEach(tab => tab.addEventListener('click', () => setAuthMode(tab.dataset.auth)));
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });
    }

    if (authLoginForm) {
        authLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authLoginEmail').value.trim();
            const password = document.getElementById('authLoginPassword').value;
            try {
                const data = await apiFetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                authToken = data.token;
                localStorage.setItem(tokenKey, authToken);
                currentUser = data.user;
                updateAuthUI();
                closeAuthModal();
                showToast('Welcome back!');
                refreshFlashcardData();
            } catch (error) {
                if (authStatus) authStatus.textContent = error.message;
            }
        });
    }

    if (authRegisterForm) {
        authRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authRegisterEmail').value.trim();
            const password = document.getElementById('authRegisterPassword').value;
            try {
                const data = await apiFetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                authToken = data.token;
                localStorage.setItem(tokenKey, authToken);
                currentUser = data.user;
                updateAuthUI();
                closeAuthModal();
                showToast('Account created!');
                refreshFlashcardData();
            } catch (error) {
                if (authStatus) authStatus.textContent = error.message;
            }
        });
    }

    if (authLogoutBtn) {
        authLogoutBtn.addEventListener('click', () => {
            authToken = '';
            localStorage.removeItem(tokenKey);
            currentUser = null;
            updateAuthUI();
            showToast('Logged out.');
        });
    }

    async function callBackendAPI() {
        const payload = {
            content: stemInput.value,
            subject: selectedSubject,
            level: selectedLevel
        };

        try {
            setLoading(true);
            
            const response = await fetch(`${API_BASE}/api/stem/simplify`, {
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
                const formulasRes = await fetch(`${API_BASE}/api/stem/extract-formulas`, {
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
                const jargonRes = await fetch(`${API_BASE}/api/stem/extract-jargon`, {
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
            showToast('❌ Error: ' + error.message);
            console.error('API Error:', error);
        } finally {
            setLoading(false);
        }
    }

    function setFlashcardLoading(state) {
        if (!flashcardGenerateBtn) return;
        flashcardGenerateBtn.disabled = state;
        flashcardGenerateBtn.textContent = state ? '⏳ Generating…' : '✨ Generate Flashcards';
        if (flashcardClearBtn) flashcardClearBtn.disabled = state;
    }

    function setQuizLoading(state) {
        if (!quizStartBtn) return;
        quizStartBtn.disabled = state;
        quizStartBtn.textContent = state ? '⏳ Starting…' : 'Start Quiz';
    }

    function updateSelectionDisplay() {
        const label = SUBJECT_LABELS[selectedSubject] + ' · ' + LEVEL_LABELS[selectedLevel];
        if (selectionDisplay) selectionDisplay.textContent = label;
        if (levelBadge) levelBadge.textContent = label;
        if (flashcardSelection) flashcardSelection.textContent = label;
        if (quizSelection) quizSelection.textContent = label;
    }

    async function generateFlashcards() {
        if (!ensureAuth()) return;
        if (!flashcardInput) return;
        const content = flashcardInput.value.trim();
        if (!content) return showToast('Paste content to generate flashcards.');
        const countValue = flashcardCount ? parseInt(flashcardCount.value, 10) : 8;
        const topic = flashcardTopicInput ? flashcardTopicInput.value.trim() : '';

        try {
            setFlashcardLoading(true);
            if (flashcardStatus) flashcardStatus.textContent = 'Generating flashcards…';

            const data = await apiFetch(`${API_BASE}/api/flashcards/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    subject: selectedSubject,
                    level: selectedLevel,
                    count: countValue,
                    topic
                })
            }, true);

            if (flashcardStatus) flashcardStatus.textContent = `Generated ${data.cards.length} cards.`;
            if (flashcardInput) flashcardInput.value = '';
            refreshFlashcardData();
            const section = document.getElementById('flashcards-section');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            if (flashcardStatus) flashcardStatus.textContent = 'Failed to generate flashcards.';
            showToast('❌ Error: ' + error.message);
        } finally {
            setFlashcardLoading(false);
        }
    }

    async function uploadImageCard() {
        if (!ensureAuth()) return;
        if (!flashcardImageInput || !flashcardImageInput.files.length) {
            return showToast('Select an image first.');
        }
        const topic = flashcardTopicInput ? flashcardTopicInput.value.trim() : '';
        const formData = new FormData();
        formData.append('image', flashcardImageInput.files[0]);
        formData.append('front', flashcardImageFront ? flashcardImageFront.value.trim() : '');
        formData.append('back', flashcardImageBack ? flashcardImageBack.value.trim() : '');
        formData.append('topic', topic);
        formData.append('subject', selectedSubject);
        formData.append('level', selectedLevel);

        try {
            if (flashcardImageStatus) flashcardImageStatus.textContent = 'Uploading image card…';
            await apiFetch(`${API_BASE}/api/flashcards/image`, {
                method: 'POST',
                body: formData,
                headers: {}
            }, true);
            if (flashcardImageStatus) flashcardImageStatus.textContent = 'Image card added.';
            if (flashcardImageInput) flashcardImageInput.value = '';
            if (flashcardImageFront) flashcardImageFront.value = '';
            if (flashcardImageBack) flashcardImageBack.value = '';
            refreshFlashcardData();
        } catch (error) {
            if (flashcardImageStatus) flashcardImageStatus.textContent = 'Upload failed.';
            showToast('❌ Error: ' + error.message);
        }
    }

    async function loadFlashcardTopics() {
        if (!authToken || !flashcardTopicFilter) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/flashcards/topics`, {}, true);
            flashcardTopicFilter.innerHTML = '<option value="">All topics</option>' +
                data.topics.map(t => `<option value="${escHtml(t.topic)}">${escHtml(t.topic)} (${t.total})</option>`).join('');
        } catch (error) {
            console.log(error);
        }
    }

    function renderFlashcardFace(card, target, isBack) {
        target.innerHTML = '';
        const text = isBack ? card.back_text : card.front_text;
        const p = document.createElement('p');
        p.textContent = text || (isBack ? 'No answer' : 'No question');
        target.appendChild(p);
    }

    function renderFlashcard() {
        if (!flashcardFront || !flashcardBack || !flashcardInner) return;
        if (!flashcards.length) {
            flashcardFront.innerHTML = '<p>Generate a deck to begin.</p>';
            flashcardBack.innerHTML = '<p>Answers will appear here.</p>';
            if (flashcardCardIndex) flashcardCardIndex.textContent = 'Card 0 of 0';
            if (flashcardTopicLabel) flashcardTopicLabel.textContent = 'Topic: —';
            if (flashcardTypeLabel) flashcardTypeLabel.textContent = 'Type: —';
            if (flashcardBookmarkBtn) flashcardBookmarkBtn.textContent = '☆ Bookmark';
            return;
        }
        if (flashcardIndex >= flashcards.length) flashcardIndex = 0;
        const card = flashcards[flashcardIndex];
        flashcardInner.classList.remove('is-flipped');
        renderFlashcardFace(card, flashcardFront, false);
        renderFlashcardFace(card, flashcardBack, true);
        if (flashcardCardIndex) flashcardCardIndex.textContent = `Card ${flashcardIndex + 1} of ${flashcards.length}`;
        if (flashcardTopicLabel) flashcardTopicLabel.textContent = `Topic: ${card.topic || 'General'}`;
        if (flashcardTypeLabel) flashcardTypeLabel.textContent = `Type: ${card.type || 'definition'}`;
        if (flashcardBookmarkBtn) flashcardBookmarkBtn.textContent = card.bookmarked ? '★ Bookmarked' : '☆ Bookmark';
    }

    function pickNextFlashcardIndex() {
        if (flashcards.length <= 1) return 0;
        const weights = flashcards.map(card => {
            const strength = card.strength || 0;
            let weight = 6 - strength;
            if (card.bookmarked) weight += 1;
            if (flashcardFilters.weak) weight += 2;
            return Math.max(weight, 1);
        });
        const total = weights.reduce((sum, w) => sum + w, 0);
        let roll = Math.random() * total;
        for (let i = 0; i < weights.length; i += 1) {
            roll -= weights[i];
            if (roll <= 0) return i;
        }
        return 0;
    }

    function nextFlashcard() {
        if (!flashcards.length) return;
        flashcardIndex = pickNextFlashcardIndex();
        renderFlashcard();
    }

    async function updateFlashcardStats() {
        if (!authToken) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/flashcards/analytics`, {}, true);
            const totals = data.totals || {};
            if (flashcardProgressPercent) flashcardProgressPercent.textContent = `${totals.progress || 0}%`;
            if (flashcardProgressFill) flashcardProgressFill.style.width = `${totals.progress || 0}%`;
            if (flashcardKnownCount) flashcardKnownCount.textContent = totals.mastered || 0;
            if (flashcardUnknownCount) flashcardUnknownCount.textContent = totals.weak || 0;
            if (flashcardStreakCount) flashcardStreakCount.textContent = flashcards[flashcardIndex]?.streak || 0;
        } catch (error) {
            console.log(error);
        }
    }

    async function loadFlashcards() {
        if (!authToken) return;
        const params = new URLSearchParams();
        if (flashcardFilters.topic) params.set('topic', flashcardFilters.topic);
        if (flashcardFilters.type) params.set('type', flashcardFilters.type);
        if (flashcardFilters.bookmarked) params.set('bookmarked', 'true');
        if (flashcardFilters.weak) params.set('weak', 'true');

        const endpoint = flashcardFilters.weak ? 'flashcards/revision' : 'flashcards';
        try {
            const data = await apiFetch(`${API_BASE}/api/${endpoint}?${params.toString()}`, {}, true);
            flashcards = data.cards || [];
            flashcardIndex = 0;
            renderFlashcard();
            updateFlashcardStats();
        } catch (error) {
            console.log(error);
        }
    }

    async function refreshFlashcardData() {
        if (!authToken) return;
        await loadFlashcardTopics();
        await loadFlashcards();
    }

    async function recordFlashcardResult(result) {
        if (!ensureAuth()) return;
        const card = flashcards[flashcardIndex];
        if (!card) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/flashcards/${card.id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result })
            }, true);
            card.strength = data.strength;
            card.known_count = data.known_count;
            card.unknown_count = data.unknown_count;
            card.streak = data.streak;
            flashcardSessionStats.seen += 1;
            if (result === 'know') flashcardSessionStats.known += 1;
            if (result === 'dont') flashcardSessionStats.unknown += 1;
            flashcardStreakCount.textContent = data.streak;
            updateFlashcardStats();
            nextFlashcard();
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
    }

    async function toggleBookmark() {
        if (!ensureAuth()) return;
        const card = flashcards[flashcardIndex];
        if (!card) return;
        const nextValue = !card.bookmarked;
        try {
            await apiFetch(`${API_BASE}/api/flashcards/${card.id}/bookmark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookmarked: nextValue })
            }, true);
            card.bookmarked = nextValue;
            renderFlashcard();
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
    }

    function startFlashcardTimer(duration) {
        if (flashcardTimerId) clearInterval(flashcardTimerId);
        flashcardTimeLeft = duration;
        updateFlashcardTimerDisplay();
        if (duration <= 0) return;
        flashcardTimerId = setInterval(() => {
            flashcardTimeLeft -= 1;
            updateFlashcardTimerDisplay();
            if (flashcardTimeLeft <= 0) {
                stopFlashcardSession();
            }
        }, 1000);
    }

    function updateFlashcardTimerDisplay() {
        if (!flashcardTimerDisplay) return;
        const minutes = Math.floor(flashcardTimeLeft / 60);
        const seconds = flashcardTimeLeft % 60;
        flashcardTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    async function startFlashcardSession() {
        if (!ensureAuth()) return;
        const duration = parseInt(flashcardTimerSelect.value, 10) || 0;
        flashcardSessionStats = { seen: 0, known: 0, unknown: 0 };
        try {
            const data = await apiFetch(`${API_BASE}/api/flashcards/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: flashcardFilters.weak ? 'revision' : 'standard', durationSeconds: duration })
            }, true);
            flashcardSessionId = data.sessionId;
            startFlashcardTimer(duration);
            if (flashcardEndSessionBtn) flashcardEndSessionBtn.disabled = false;
            showToast('Flashcard session started.');
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
    }

    async function stopFlashcardSession() {
        if (flashcardTimerId) clearInterval(flashcardTimerId);
        flashcardTimerId = null;
        if (!flashcardSessionId) return;
        try {
            await apiFetch(`${API_BASE}/api/flashcards/sessions/${flashcardSessionId}/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    totalSeen: flashcardSessionStats.seen,
                    totalKnown: flashcardSessionStats.known,
                    totalUnknown: flashcardSessionStats.unknown
                })
            }, true);
            showToast('Session complete.');
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
        flashcardSessionId = null;
        if (flashcardEndSessionBtn) flashcardEndSessionBtn.disabled = true;
    }

    function handleFlashcardSwipe() {
        if (!flashcardSwipe) return;
        let startX = 0;
        let currentX = 0;
        let dragging = false;

        flashcardSwipe.addEventListener('click', () => {
            if (flashcardInner) flashcardInner.classList.toggle('is-flipped');
        });

        flashcardSwipe.addEventListener('pointerdown', (e) => {
            dragging = true;
            startX = e.clientX;
            flashcardSwipe.setPointerCapture(e.pointerId);
        });
        flashcardSwipe.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            currentX = e.clientX;
            const delta = currentX - startX;
            flashcardSwipe.style.transform = `translateX(${delta}px) rotate(${delta / 18}deg)`;
        });
        flashcardSwipe.addEventListener('pointerup', (e) => {
            if (!dragging) return;
            dragging = false;
            const delta = e.clientX - startX;
            flashcardSwipe.style.transform = '';
            if (delta > 90) recordFlashcardResult('know');
            if (delta < -90) recordFlashcardResult('dont');
        });
        flashcardSwipe.addEventListener('pointercancel', () => {
            dragging = false;
            flashcardSwipe.style.transform = '';
        });
    }

    async function startQuizSession() {
        if (!ensureAuth()) return;
        const topic = quizTopicInput.value.trim();
        if (!topic) return showToast('Enter a quiz topic.');
        const duration = parseInt(quizTimerSelect.value, 10) || 0;
        try {
            setQuizLoading(true);
            if (quizStatus) quizStatus.textContent = 'Starting session...';
            const data = await apiFetch(`${API_BASE}/api/quiz/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    subject: selectedSubject,
                    level: selectedLevel,
                    difficulty: quizDifficulty,
                    durationSeconds: duration
                })
            }, true);
            quizSessionId = data.sessionId;
            quizQuestions = [];
            if (quizGenerateMoreBtn) quizGenerateMoreBtn.disabled = false;
            if (quizRetryBtn) quizRetryBtn.disabled = true;
            if (quizScore) quizScore.textContent = '0';
            if (quizAccuracy) quizAccuracy.textContent = '0%';
            if (quizStreak) quizStreak.textContent = '0';
            if (quizRecommendedDifficulty) quizRecommendedDifficulty.textContent = '—';
            startQuizTimer(duration);
            await generateQuizQuestions();
            if (quizStatus) quizStatus.textContent = 'Session active.';
        } catch (error) {
            if (quizStatus) quizStatus.textContent = 'Failed to start session.';
            showToast('❌ Error: ' + error.message);
        } finally {
            setQuizLoading(false);
        }
    }

    async function generateQuizQuestions() {
        if (!ensureAuth()) return;
        if (!quizSessionId) return;
        try {
            if (quizStatus) quizStatus.textContent = 'Generating questions...';
            const data = await apiFetch(`${API_BASE}/api/quiz/sessions/${quizSessionId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }, true);
            quizQuestions = quizQuestions.concat(data.questions || []);
            renderQuizQuestions();
            if (quizStatus) quizStatus.textContent = 'Questions ready.';
            await updateQuizAnalytics();
        } catch (error) {
            if (quizStatus) quizStatus.textContent = 'Failed to generate questions.';
            showToast('❌ Error: ' + error.message);
        }
    }

    function renderQuizQuestions() {
        if (!quizBankOutput) return;
        if (!quizQuestions.length) {
            quizBankOutput.innerHTML = '<div class="empty-state small"><div class="empty-icon">📊</div><p>Start a session to generate questions.</p></div>';
            return;
        }
        quizBankOutput.innerHTML = quizQuestions.map((q, index) => {
            const options = q.options || [];
            return `
                <div class="quiz-q" data-id="${q.id}">
                    <p class="q-text">${index + 1}. ${escHtml(q.question)}</p>
                    ${options.map((opt, oi) => `<button class="quiz-bank-option" data-oi="${oi}">${escHtml(opt)}</button>`).join('')}
                    <div class="quiz-actions">
                        <button class="btn btn-ghost btn-sm quiz-hint-btn">Hint</button>
                    </div>
                    <div class="quiz-explanation">${escHtml(q.explanation || '')}</div>
                    <div class="quiz-hint"></div>
                </div>
            `;
        }).join('');

        quizBankOutput.querySelectorAll('.quiz-bank-option').forEach(btn => {
            btn.addEventListener('click', async () => {
                const questionEl = btn.closest('.quiz-q');
                const questionId = questionEl.dataset.id;
                const answerIndex = parseInt(btn.dataset.oi, 10);
                try {
                    const data = await apiFetch(`${API_BASE}/api/quiz/questions/${questionId}/answer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answerIndex })
                    }, true);
                    const question = quizQuestions.find(q => String(q.id) === String(questionId));
                    questionEl.querySelectorAll('.quiz-bank-option').forEach((optionBtn, oi) => {
                        optionBtn.disabled = true;
                        if (question && oi === question.correct) optionBtn.classList.add('correct');
                        if (oi === answerIndex && !data.isCorrect) optionBtn.classList.add('wrong');
                    });
                    const explanationEl = questionEl.querySelector('.quiz-explanation');
                    if (explanationEl) explanationEl.style.display = 'block';
                    if (quizScore) quizScore.textContent = data.score;
                    if (quizStreak) quizStreak.textContent = data.streak;
                    await updateQuizAnalytics();
                    if (quizRetryBtn) quizRetryBtn.disabled = false;
                } catch (error) {
                    showToast('❌ Error: ' + error.message);
                }
            });
        });

        quizBankOutput.querySelectorAll('.quiz-hint-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const questionEl = btn.closest('.quiz-q');
                const questionId = questionEl.dataset.id;
                try {
                    const data = await apiFetch(`${API_BASE}/api/quiz/questions/${questionId}/hint`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    }, true);
                    const hintEl = questionEl.querySelector('.quiz-hint');
                    if (hintEl) {
                        hintEl.textContent = data.hint;
                        hintEl.style.display = 'block';
                    }
                } catch (error) {
                    showToast('❌ Error: ' + error.message);
                }
            });
        });
    }

    async function updateQuizAnalytics() {
        if (!quizSessionId) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/quiz/sessions/${quizSessionId}/analytics`, {}, true);
            if (quizAccuracy) quizAccuracy.textContent = `${data.accuracy}%`;
            if (quizRecommendedDifficulty) quizRecommendedDifficulty.textContent = data.recommendedDifficulty || '—';
            const topics = data.weakTopics || [];
            if (quizWeakTopics) {
                quizWeakTopics.innerHTML = topics.length
                    ? topics.map(t => `<p>${escHtml(t.topic)} · ${Math.round((t.accuracy || 0) * 100)}%</p>`).join('')
                    : '<p class="muted">No weak topics yet.</p>';
            }
        } catch (error) {
            console.log(error);
        }
    }

    async function retryIncorrect() {
        if (!ensureAuth()) return;
        if (!quizSessionId) return;
        try {
            const data = await apiFetch(`${API_BASE}/api/quiz/sessions/${quizSessionId}/retry-wrong`, {}, true);
            quizQuestions = data.questions || [];
            renderQuizQuestions();
            await updateQuizAnalytics();
        } catch (error) {
            showToast('❌ Error: ' + error.message);
        }
    }

    function startQuizTimer(duration) {
        if (quizTimerId) clearInterval(quizTimerId);
        quizTimeLeft = duration;
        updateQuizTimerDisplay();
        if (duration <= 0) return;
        quizTimerId = setInterval(() => {
            quizTimeLeft -= 1;
            updateQuizTimerDisplay();
            if (quizTimeLeft <= 0) {
                clearInterval(quizTimerId);
                quizTimerId = null;
                if (quizStatus) quizStatus.textContent = 'Session ended.';
                showToast('Quiz timer finished.');
            }
        }, 1000);
    }

    function updateQuizTimerDisplay() {
        const minutes = Math.floor(quizTimeLeft / 60);
        const seconds = quizTimeLeft % 60;
        if (quizTimerDisplay) {
            quizTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedLevel = card.dataset.level;
            updateSelectionDisplay();
        });
    });

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

    if (flashcardGenerateBtn) flashcardGenerateBtn.addEventListener('click', generateFlashcards);
    if (flashcardClearBtn) flashcardClearBtn.addEventListener('click', () => {
        if (flashcardInput) flashcardInput.value = '';
        if (flashcardStatus) flashcardStatus.textContent = '';
    });
    if (flashcardImageUploadBtn) flashcardImageUploadBtn.addEventListener('click', uploadImageCard);

    if (flashcardTopicFilter) flashcardTopicFilter.addEventListener('change', (e) => {
        flashcardFilters.topic = e.target.value;
        loadFlashcards();
    });
    if (flashcardBookmarkFilter) flashcardBookmarkFilter.addEventListener('change', (e) => {
        flashcardFilters.bookmarked = e.target.checked;
        loadFlashcards();
    });
    if (flashcardWeakFilter) flashcardWeakFilter.addEventListener('change', (e) => {
        flashcardFilters.weak = e.target.checked;
        loadFlashcards();
    });
    if (flashcardTypeFilter) {
        flashcardTypeFilter.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                flashcardTypeFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                flashcardFilters.type = chip.dataset.type || '';
                loadFlashcards();
            });
        });
    }

    if (flashcardFlipBtn) flashcardFlipBtn.addEventListener('click', () => flashcardInner.classList.toggle('is-flipped'));
    if (flashcardBookmarkBtn) flashcardBookmarkBtn.addEventListener('click', toggleBookmark);
    if (flashcardDontBtn) flashcardDontBtn.addEventListener('click', () => recordFlashcardResult('dont'));
    if (flashcardKnowBtn) flashcardKnowBtn.addEventListener('click', () => recordFlashcardResult('know'));
    if (flashcardShuffleBtn) flashcardShuffleBtn.addEventListener('click', () => {
        flashcards.sort(() => Math.random() - 0.5);
        flashcardIndex = 0;
        renderFlashcard();
    });

    if (flashcardStartSessionBtn) flashcardStartSessionBtn.addEventListener('click', startFlashcardSession);
    if (flashcardEndSessionBtn) flashcardEndSessionBtn.addEventListener('click', stopFlashcardSession);

    if (quizDifficultyRow) {
        quizDifficultyRow.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                quizDifficultyRow.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                quizDifficulty = chip.dataset.difficulty;
            });
        });
    }

    if (quizStartBtn) quizStartBtn.addEventListener('click', startQuizSession);
    if (quizGenerateMoreBtn) quizGenerateMoreBtn.addEventListener('click', generateQuizQuestions);
    if (quizRetryBtn) quizRetryBtn.addEventListener('click', retryIncorrect);

    document.querySelectorAll('.chip[data-q]').forEach(chip => {
        chip.addEventListener('click', () => {
            stemInput.value = chip.dataset.q;
            charCounter.textContent = stemInput.value.length + ' / 3000';
            stemInput.focus();
            showToast('Example loaded! Click ✨ Simplify');
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
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard! 📋')).catch(() => showToast('Could not copy'));
    });

    simplifyMoreBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('No content to simplify');
        showToast('Simplifying further…');
        callBackendAPI();
    });

    deeperBtn.addEventListener('click', () => {
        if (!stemInput.value.trim()) return showToast('No content to go deeper on');
        showToast('Going deeper…');
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

    function normalizeText(value) {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map(normalizeText).join('\n');
        if (value && typeof value === 'object') {
            return value.text || value.content || value.simple || value.steps || JSON.stringify(value);
        }
        return '';
    }

    function formatSimple(text) {
        const safeText = normalizeText(text);
        if (!safeText) return '<p>No explanation returned.</p>';
        return safeText.split(/\n\n+/).map(p => '<p>' + escHtml(p).replace(/\n/g, '<br>') + '</p>').join('');
    }

    function formatSteps(text) {
        const safeText = normalizeText(text);
        if (!safeText) return '<p>No steps returned.</p>';
        const items = safeText.split(/\n/).filter(l => l.trim()).map(l => '<li>' + escHtml(l.replace(/^\d+\.\s*/, '')) + '</li>');
        return '<ol style="padding-left:1.5rem;">' + items.join('') + '</ol>';
    }

    function formatTerms(terms) {
        return terms.map(t => '<div class="term-card"><strong>' + escHtml(t.word) + '</strong><p>' + escHtml(t.definition) + '</p></div>').join('');
    }

    function formatFormulas(formulas) {
        return formulas.length > 0 ? formulas.map(f => '<div class="formula-card"><strong>' + escHtml(f.formula) + '</strong><p>' + escHtml(f.explanation) + '</p></div>').join('') : '<p>No formulas found.</p>';
    }

    function formatJargon(jargon) {
        return jargon.length > 0 ? jargon.map(j => '<div class="term-card"><strong>' + escHtml(j.word) + '</strong><p>' + escHtml(j.definition) + '</p></div>').join('') : '<p>No difficult words found.</p>';
    }

    function formatQuiz(quiz) {
        return quiz.map((q, qi) => '<div class="quiz-q"><p class="q-text">' + (qi + 1) + '. ' + escHtml(q.question) + '</p>' + q.options.map((opt, oi) => '<button class="quiz-option" data-qi="' + qi + '" data-oi="' + oi + '" data-correct="' + q.correct + '">' + escHtml(opt) + '</button>').join('') + '</div>').join('');
    }

    function attachQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', function() {
                const qi = this.dataset.qi;
                const oi = parseInt(this.dataset.oi);
                const correct = parseInt(this.dataset.correct);
                const group = document.querySelectorAll('.quiz-option[data-qi="' + qi + '"]');
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
        simplifyBtn.textContent = state ? '⏳ Thinking…' : '✨ Simplify';
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }

    handleFlashcardSwipe();
    setAuthMode('login');
    updateSelectionDisplay();
    loadCurrentUser().then(refreshFlashcardData);
})();
