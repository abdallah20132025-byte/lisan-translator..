document.addEventListener('DOMContentLoaded', function() {
    // --- Element References ---
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-languages');
    const textModeBtn = document.getElementById('text-mode-btn');
    const codeModeBtn = document.getElementById('code-mode-btn');
    const sourceTtsBtn = document.getElementById('source-tts-btn');
    const targetTtsBtn = document.getElementById('target-tts-btn');
    const copyBtn = document.getElementById('copy-btn');

    // --- State Variables ---
    let currentUser = null;
    let currentMode = 'text';

    // --- Language Definitions ---
    const textLanguages = { "ar": "العربية", "en": "English", "fr": "Français", "es": "Español", "de": "Deutsch", "ja": "日本語", "ko": "한국어", "ru": "Русский" };
    const codeLanguages = { "python": "Python", "javascript": "JavaScript", "java": "Java", "csharp": "C#", "cpp": "C++", "go": "Go", "ruby": "Ruby", "php": "PHP" };

    // --- Authentication Handling ---
    window.handleCredentialResponse = function(response) {
        try {
            const decodedToken = jwt_decode(response.credential);
            currentUser = { email: decodedToken.email, name: decodedToken.name, picture: decodedToken.picture };
            updateUIForUser();
            saveUserToLocalStorage();
        } catch (error) {
            console.error("Error decoding token:", error);
            alert("حدث خطأ أثناء تسجيل الدخول. قد يكون معرّف العميل غير صالح.");
        }
    }

    function updateUIForUser() {
        if (currentUser) {
            document.querySelector('.g_id_signin').classList.add('hidden');
            const userProfile = document.getElementById('user-profile');
            userProfile.classList.remove('hidden');
            document.getElementById('user-pic').src = currentUser.picture;
            document.getElementById('user-name').textContent = currentUser.name;
        }
    }
    
    function saveUserToLocalStorage() { if (currentUser) localStorage.setItem('lisanUser', JSON.stringify(currentUser)); }
    
    function loadUserFromLocalStorage() {
        const savedUser = localStorage.getItem('lisanUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            updateUIForUser();
        }
    }

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        localStorage.removeItem('lisanUser');
        google.accounts.id.disableAutoSelect();
        location.reload();
    });

    // --- Text-to-Speech (TTS) & Copy Logic ---
    function speakText(text, lang) {
        if (!text) return;
        if (lang === 'ar') {
            const audio = new Audio(`https://api.streamelements.com/audio-provider/v1/tts?voice=Nizar&text=${encodeURIComponent(text )}`);
            audio.play().catch(e => console.error("Error playing Arabic audio:", e));
            return;
        }
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            alert('عذراً، متصفحك لا يدعم ميزة النطق الصوتي.');
        }
    }
    if ('speechSynthesis' in window) { window.speechSynthesis.onvoiceschanged = () => {}; }

    sourceTtsBtn.addEventListener('click', () => speakText(sourceText.value, sourceLang.value));
    targetTtsBtn.addEventListener('click', () => speakText(targetText.textContent, targetLang.value));
    
    copyBtn.addEventListener('click', () => {
        const textToCopy = targetText.textContent;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.title = "تم النسخ!";
                setTimeout(() => { copyBtn.title = "نسخ الترجمة"; }, 2000);
            });
        }
    });

    // --- Application Logic ---
    function setMode(mode) {
        currentMode = mode;
        const isTextMode = mode === 'text';
        textModeBtn.classList.toggle('active', isTextMode);
        codeModeBtn.classList.toggle('active', !isTextMode);
        document.querySelectorAll('.tts-button, #copy-btn').forEach(btn => btn.classList.toggle('hidden', !isTextMode));
        swapBtn.style.display = isTextMode ? 'flex' : 'none';

        const languages = isTextMode ? textLanguages : codeLanguages;
        const defaultSource = isTextMode ? 'ar' : 'javascript';
        const defaultTarget = isTextMode ? 'en' : 'python';
        
        populateSelect(sourceLang, languages, defaultSource);
        populateSelect(targetLang, languages, defaultTarget);
        sourceText.placeholder = isTextMode ? "اكتب النص هنا للترجمة..." : "اكتب الكود البرمجي هنا للترجمة...";
    }

    function populateSelect(selectElement, languages, defaultLang) {
        selectElement.innerHTML = '';
        for (const code in languages) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = languages[code];
            selectElement.appendChild(option);
        }
        selectElement.value = defaultLang;
    }

    translateBtn.addEventListener('click', async () => {
        const textToTranslate = sourceText.value.trim();
        if (!textToTranslate) return;

        targetText.textContent = 'جارٍ الترجمة...';
        translateBtn.disabled = true;
        
        try {
            let translatedText = '';
            if (currentMode === 'text') {
                translatedText = await translateText(textToTranslate, sourceLang.value, targetLang.value);
            } else {
                translatedText = await translateCode(textToTranslate, sourceLang.value, targetLang.value);
            }
            targetText.textContent = translatedText;

        } catch (error) {
            targetText.textContent = 'حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.';
            console.error('Translation Error:', error);
        } finally {
            translateBtn.disabled = false;
        }
    });

    async function translateText(text, source, target) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text )}&langpair=${source}|${target}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.responseStatus !== 200) throw new Error(`API Error: ${data.responseDetails}`);
        return data.responseData.translatedText;
    }

    async function translateCode(code, source, target) {
        console.log(`Simulating code translation from ${source} to ${target}`);
        return new Promise(resolve => setTimeout(() => resolve(`// الكود تمت ترجمته من ${source} إلى ${target}\n\n${code}`), 1000));
    }

    // --- Other Event Listeners ---
    swapBtn.addEventListener('click', () => {
        if (currentMode !== 'text') return;
        const tempVal = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempVal;
    });
    
    textModeBtn.addEventListener('click', () => setMode('text'));
    codeModeBtn.addEventListener('click', () => setMode('code'));

    document.getElementById('edit-name').addEventListener('click', (e) => { e.preventDefault(); alert('ميزة تعديل الاسم قيد التطوير حاليًا.'); });

    // --- Initialization ---
    function initialize() {
        loadUserFromLocalStorage();
        setMode('text');
    }

    initialize();
});