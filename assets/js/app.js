/**
 * World Medicine OTC Catalog Application (Alpine.js State)
 */

document.addEventListener('alpine:init', () => {
  Alpine.data('catalogApp', () => ({
    lang: localStorage.getItem('wm_lang') || 'ru',
    searchQuery: '',
    selectedCategory: 'all',
    selectedForm: 'all',
    selectedLetter: '',
    selectedSymptom: null,
    sortBy: 'popular',
    
    // Products and taxonomies
    products: WM_PRODUCTS,
    categories: WM_CATEGORIES,
    forms: WM_FORMS,
    symptoms: WM_SYMPTOMS,
    awards: typeof WM_AWARDS !== 'undefined' ? WM_AWARDS : [],
    certificates: typeof WM_CERTIFICATES !== 'undefined' ? WM_CERTIFICATES : [],

    // Cart & Wishlist
    cart: JSON.parse(localStorage.getItem('wm_cart') || '[]'),
    favorites: JSON.parse(localStorage.getItem('wm_favorites') || '[]'),
    
    // Telegram Bot Live Delivery Configuration
    telegramBot: {
      token: '8924881958:AAETcQcg6iH-2RDDbILywa5qF13xUhjoUUE',
      chatId: '-1003942536859'
    },
    isSubmittingOrder: false,
    
    // AI Health Consultant & Conversational Intelligence State
    isChatOpen: false,
    chatInput: '',
    chatPhone: '',
    isAiTyping: false,
    hasUnreadChat: true,
    isVoiceRecording: false,
    isSpeakingAudio: false,
    currentSpeakingId: null,
    speechRecognition: null,
    isVoiceEnabled: true,
        chatMessages: [
      {
        id: 1,
        sender: 'ai',
        time: 'Только что',
        text_ru: "Здравствуйте! Я консультант World Medicine 🌿\n\nЧем могу вам помочь? Напишите своими словами, что вас беспокоит или какую задачу хотите решить (например: упадок сил, суставы, плохой сон, иммунитет или красота кожи и волос). Подберу нужный комплекс и подскажу, как правильно принимать!",
        text_uz: "Assalomu alaykum! Men World Medicine maslahatchisiman 🌿\n\nSizga qanday yordam bera olaman? Sizni nima bezovta qilayotganini yoki qanday maqsad qo'yganingizni yozing (masalan: holsizlik, bo'g'imlar og'rig'i, uyqusizlik, immunitet yoki soch va teri go'zalligi). Sizga mos majmuani tanlab, qabul qilish tartibini tushuntirib beraman!",
        recommendedProducts: []
      }
    ],

    // Quick Conversation Starters
    quickPrompts: [
      { ru: "⚡ Постоянная усталость и упадок сил", uz: "⚡ Doimiy charchoq va holsizlik", query: "усталость нет сил упадок энергии бодрость" },
      { ru: "🦴 Болят или хрустят суставы, спина", uz: "🦴 Bo'g'imlar va bel og'riyapti", query: "болят суставы колени спина хруст артрокол" },
      { ru: "🌙 Тревога, стресс и бессонница", uz: "🌙 Stress, asabiylik va uyqusizlik", query: "не могу уснуть стресс тревога нервы вамелан" },
      { ru: "🛡️ Укрепить иммунитет и витамины", uz: "🛡️ Immunitetni oshirish va vitaminlar", query: "иммунитет защита от простуды витамин D сановит" },
      { ru: "🔥 Изжога, тяжесть в желудке", uz: "🔥 Oshqozonda og'irlik va qaynash", query: "желудок изжога тяжесть пищеварение" },
      { ru: "✨ Красота кожи, волос и ногтей", uz: "✨ Soch, teri va tirnoqlar go'zalligi", query: "выпадают волосы кожа ногти коллаген полижен" }
    ],

    initVoiceServices() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = this.lang === 'uz' ? 'uz-UZ' : 'ru-RU';

        this.speechRecognition.onstart = () => {
          this.isVoiceRecording = true;
        };

        this.speechRecognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            this.chatInput = transcript;
            this.handleSendMessage(true);
          }
        };

        this.speechRecognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          this.isVoiceRecording = false;
          if (event.error === 'not-allowed') {
            this.showToast(this.lang === 'uz' ? "Iltimos, mikrofon ruxsatini bering" : "Пожалуйста, разрешите доступ к микрофону");
          }
        };

        this.speechRecognition.onend = () => {
          this.isVoiceRecording = false;
        };
      }
    },

    toggleVoiceRecording() {
      if (!this.speechRecognition) {
        this.initVoiceServices();
      }

      if (!this.speechRecognition) {
        this.showToast(this.lang === 'uz' ? "Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi" : "Ваш браузер не поддерживает голосовой ввод");
        return;
      }

      if (this.isVoiceRecording) {
        try { this.speechRecognition.stop(); } catch(e){}
        this.isVoiceRecording = false;
      } else {
        try {
          this.speechRecognition.lang = this.lang === 'uz' ? 'uz-UZ' : 'ru-RU';
          this.speechRecognition.start();
          this.showToast(this.lang === 'uz' ? "🎙️ Eshitmoqdaman... Gapiring" : "🎙️ Слушаю вас... Говорите");
        } catch(e) {
          console.warn(e);
        }
      }
    },

    speakAiMessage(msg) {
      if (!('speechSynthesis' in window)) {
        this.showToast(this.lang === 'uz' ? "Ovozli o'qish qo'llab-quvvatlanmaydi" : "Озвучка не поддерживается в браузере");
        return;
      }

      if (this.isSpeakingAudio && this.currentSpeakingId === msg.id) {
        window.speechSynthesis.cancel();
        this.isSpeakingAudio = false;
        this.currentSpeakingId = null;
        return;
      }

      window.speechSynthesis.cancel();
      const rawText = this.lang === 'uz' ? msg.text_uz : msg.text_ru;
      const cleanText = (rawText || '')
        .replace(/[*_~`#]/g, '')
        .replace(/[💊🌿🦴🛡️✨🩸🔥⚡🌙👶📞✅•]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ru-RU';
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeakingAudio = true;
        this.currentSpeakingId = msg.id;
      };

      utterance.onend = () => {
        this.isSpeakingAudio = false;
        this.currentSpeakingId = null;
      };

      utterance.onerror = () => {
        this.isSpeakingAudio = false;
        this.currentSpeakingId = null;
      };

      window.speechSynthesis.speak(utterance);
    },

    stopSpeaking() {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isSpeakingAudio = false;
      this.currentSpeakingId = null;
    },

    toggleChat() {
      this.isChatOpen = !this.isChatOpen;
      if (this.isChatOpen) {
        this.hasUnreadChat = false;
        this.stopSpeaking();
        this.$nextTick(() => {
          this.scrollChatToBottom();
          this.refreshIcons();
        });
      } else {
        this.stopSpeaking();
        if (this.isVoiceRecording && this.speechRecognition) {
          try { this.speechRecognition.stop(); } catch(e){}
        }
      }
    },

    scrollChatToBottom() {
      const container = document.getElementById('chatMessagesContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    sendQuickPrompt(prompt) {
      this.chatInput = this.lang === 'uz' ? prompt.uz : prompt.ru;
      this.handleSendMessage();
    },

    handleSendMessage(wasSpoken = false) {
      const text = (this.chatInput || '').trim();
      const phone = (this.chatPhone || '').trim();
      if (!text && !phone) return;

      const userMsg = {
        id: Date.now(),
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: text + (phone ? `\n📞 Тел: ${phone}` : '')
      };

      this.chatMessages.push(userMsg);
      const query = text.toLowerCase();
      this.chatInput = '';
      this.isAiTyping = true;
      this.$nextTick(() => this.scrollChatToBottom());

      // Empathetic Human-Like Medical Consultation Engine
      setTimeout(() => {
        const response = this.generateHumanAiResponse(query, phone);
        const newAiMsg = {
          id: Date.now() + 1,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text_ru: response.text_ru,
          text_uz: response.text_uz,
          recommendedProducts: response.products || []
        };

        this.chatMessages.push(newAiMsg);
        this.isAiTyping = false;

        // Forward lead/question automatically to Telegram
        this.sendConsultationLeadToTelegram(text, phone, response.products || []);
        
        this.$nextTick(() => {
          this.scrollChatToBottom();
          this.refreshIcons();
          // Voice readout disabled
        });
      }, 750);
    },

        generateHumanAiResponse(query, phone) {
      const q = query.toLowerCase().trim();
      let matched = [];
      let text_ru = '';
      let text_uz = '';

      const getProd = (id) => this.products.find(p => p.id === id);

      // 1. SPECIFIC PRODUCT INQUIRIES
      if (q.includes('полижен') || q.includes('polijen')) {
        matched = [getProd('polijen')].filter(Boolean);
        text_ru = `Полижен — наш флагманский швейцарский комплекс для энергии, молодости и тонуса. 🌿

В составе: натуральный экстракт женьшеня, маточное молочко, коэнзим Q10, плюс 12 витаминов и 10 минералов. Он не просто бодрит, а восстанавливает клетки изнутри, улучшает состояние кожи, останавливает выпадение волос и дает заряд сил без скачков давления.

💊 **Как принимать**: по 1 капсуле утром во время или после завтрака. Курс — 1 месяц.

Хотите оформить заказ или подобрать курс под конкретную задачу?`;
        text_uz = `Polijen — quvvat, yoshlik va tetiklik uchun Shveytsariya formulasi asosidagi mashhur majmuamiz. 🌿

Tarkibida: tabiiy jenshen ekstrakti, ona ari suti, koenzim Q10, 12 ta vitamin va 10 ta muhim mineral bor. U nafaqat quvvat beradi, balki hujayralarni yoshartiradi, terini taranglashtiradi va soch to'kilishini to'xtatadi.

💊 **Qanday ichiladi**: ertalab nonushta paytida 1 kapsuladan. Kurs — 1 oy.

Buyurtma berishni xohlaysizmi yoki qo'shimcha savolingiz bormi?`;
      }
      else if (q.includes('вамелан') || q.includes('vamelan')) {
        matched = [getProd('vamelan'), getProd('vamelan-kids')].filter(Boolean);
        text_ru = `Вамелан — это 100% натуральный фитокомплекс европейского качества для спокойствия и глубокого сна. 🌙

В составе: чистые стандартизированные экстракты валерианы, мяты перечной и мелиссы. Он мягко снимает тревожность, спазмы сосудов и раздражительность, но не вызывает привыкания и сонливости днем.

🕒 **Как принимать**:
• При стрессе и тревоге: по 1 капсуле 1-2 раза в день.
• Для легкого засыпания и глубокого сна: 1-2 капсулы за 40-60 минут до сна.

(Для деток есть сироп Вамелан Кидс). Вам для себя или для ребенка?`;
        text_uz = `Vamelan — xotirjamlik va chuqur orombaxsh uyqu uchun 100% tabiiy fitomajmua. 🌙

Tarkibida: toza valeriana, qalampir yalpiz va melissa o'simlik ekstraktlari jamlangan. Asabiy zo'riqish, xavotir va stressni muloyimlik bilan bartaraf etadi, o'rganib qolish chaqirmaydi.

🕒 **Qanday ichiladi**:
• Kunduzgi xotirjamlik uchun: kuniga 1-2 marta 1 kapsuladan.
• Tinch uyqu uchun: yotishdan 40-60 daqiqa oldin 1-2 kapsula.

(Bolalar uchun Vamelan Kids siropi ham bor). O'zingizgami yoki farzandingizgami?`;
      }
      else if (q.includes('драстоп') || q.includes('drastop') || q.includes('артрокол') || q.includes('artrocol')) {
        matched = [getProd('drastop-max'), getProd('artrocol-gel')].filter(Boolean);
        text_ru = `Для суставов и позвоночника у нас разработан мощный дуэт: 🦴

1. **Драстоп Макс** (внутрь) — питает и восстанавливает сам хрящ, содержит хондроитин, глюкозамин, био-коллаген и гиалуроновую кислоту. Защищает суставы от стирания и хруста.
2. **Артрокол гель** (снаружи) — быстро снимает острую боль, воспаление и скованность в мышцах и суставах.

💡 Вместе они дают быстрый эффект обезболивания и долгосрочное восстановление хрящевой ткани.

Где именно ощущается боль — в коленях, пояснице или шее?`;
        text_uz = `Bo'g'imlar va umurtqa pog'onasi uchun samarali juftligimiz: 🦴

1. **Drastop Maks** (ichishga) — tog'ay to'qimasini tiklaydi, tarkibida xondroitin, glyukozamin, bio-kollagen va gialuron kislotasi bor. Bo'g'imlarning yemirilishini to'xtatadi.
2. **Artrokol gel** (surishga) — og'riq, yallig'lanish va qisirlashni tezda bartaraf etadi.

💡 Birgalikda qo'llanganda tezkor yengillik va mustahkam tiklanish beradi.

Og'riq aynan qayerda — tizzada, beldami yoki bo'yindami?`;
      }
      else if (q.includes('сановит') || q.includes('sanovit') || q.includes('коледан') || q.includes('koledan') || q.includes('кальцин') || q.includes('calcin')) {
        matched = [getProd('sanovit'), getProd('koledan-drops'), getProd('d-calcin')].filter(Boolean);
        text_ru = `Это базовые витаминные комплексы для всей семьи: 🛡️

• **Сановит** — вкусный мультивитаминный комплекс для иммунитета, аппетита и роста сил.
• **Коледан D3 (50 000 МЕ)** — масляный витамин D высокой биодоступности для иммунной защиты, костей и гормонального баланса.
• **Д-Кальцин** — гранулы кальция с витамином D3 для крепких зубов, костей и ногтей.

Подскажите, подбираете для взрослого или для ребенка?`;
        text_uz = `Butun oila uchun asosiy vitaminlar majmuamiz: 🛡️

• **Sanovit** — immunitet, ishtaha va quvvatni oshiruvchi shirin polivitamin siropi.
• **Koledan D3 (50 000 XB)** — suyaklar, immunitet va o'pka himoyasi uchun yuqori singuvchan D vitamini tomchilari.
• **D-Kalsin** — mustahkam tishlar, suyaklar va tirnoqlar uchun kalsiy va D3 granulalari.

Kattalargami yoki farzandingizgami?`;
      }

      // 2. GREETINGS & CASUAL HELLO
      else if (q.match(/^(привет|здравствуй|салам|добрый|салом|assalomu|salom|hayrli|privet|hi|hello)/)) {
        text_ru = `Здравствуйте! Рада общению с вами. 🌿

Расскажите, что вас привело или что хотите улучшить в самочувствии? Например: поднять энергию, укрепить суставы, наладить сон, поддержать иммунитет или укрепить волосы и кожу. С радостью подберу точный состав!`;
        text_uz = `Assalomu alaykum! Siz bilan muloqotdan xursandman. 🌿

Ayting-chi, salomatligingizda qanday o'zgarish qilmoqchisiz yoki nima bezovta qilyapti? Masalan: quvvatni oshirish, bo'g'imlarni tiklash, uyquni yaxshilash, immunitet yoki soch-teri parvarishi. Mamnuniyat bilan mos vositani tanlab beraman!`;
        matched = [getProd('polijen'), getProd('sanovit')].filter(Boolean);
      }

      // 3. GRATITUDE / ACKNOWLEDGEMENT
      else if (q.includes('спасибо') || q.includes('благодар') || q.includes('рахмат') || q.includes('rahmat') || q.includes('понятно') || q.includes('хорошо') || q.includes('отлично') || q.includes('tushunarli') || q.includes('yaxshi')) {
        text_ru = `Всегда пожалуйста! Рада помочь. 😊

Главное — принимать выбранный комплекс регулярно и запивать стаканом чистой воды. Если захотите оформить заказ с быстрой доставкой за 1 день — просто напишите или нажмите «В корзину». Крепкого вам здоровья!`;
        text_uz = `Salomat bo'ling! Yordam bera olganimdan mamnunman. 😊

Asosiysi — qabul qilish tartibiga rioya qilib, 1 stakan toza suv bilan ichish. Agar 1 kunda yetkazib berish bilan buyurtma bermoqchi bo'lsangiz — bemalol yozing yoki «Savat»ga bosing. Sog'ligingiz mustahkam bo'lsin!`;
        matched = [];
      }

      // 4. ENERGY & FATIGUE
      else if (q.includes('устал') || q.includes('сил нет') || q.includes('нет сил') || q.includes('бодрост') || q.includes('энерги') || q.includes('слабост') || q.includes('апати') || q.includes('вялост') || q.includes('сонлив') || q.includes('holsiz') || q.includes('charchoq') || q.includes('quvvat') || q.includes('energiya') || q.includes('tetik')) {
        matched = [getProd('polijen'), getProd('sanovit')].filter(Boolean);
        text_ru = `Понимаю вас. Постоянная усталость и сонливость обычно связаны с истощением клеточной энергии и нехваткой адаптогенов.

Вам отлично подойдет наш швейцарский комплекс **ПОЛИЖЕН**. В нем есть натуральный женьшень, маточное молочко, коэнзим Q10 и 25 нутриентов. Он бережно запускает выработку энергии без тахикардии и скачков давления.

💊 Принимать: всего 1 капсулу утром во время завтрака. Уже через 3-4 дня почувствуете легкость и прилив сил.

У вас усталость больше физическая или от умственной работы и стресса?`;
        text_uz = `Sizni tushunaman. Doimiy charchoq va uyquchanlik organizmda hujayra quvvati va vitaminlar yetishmasligidan kelib chiqadi.

Sizga Shveytsariya formulasi bo'lgan **POLIJEN** ayni muddao. Tarkibidagi tabiiy jenshen, ona ari suti va koenzim Q10 qon bosimini oshirmasdan tetiklik baxsh etadi.

💊 Ichish tartibi: ertalab nonushta paytida 1 kapsula. 3-4 kunda quvvat to'lishini his qilasiz.

Charchoq ko'proq jismoniy zo'riqishdanmi yoki aqliy toliqishdan?`;
      }

      // 5. JOINTS, KNEES, BACK
      else if (q.includes('сустав') || q.includes('колен') || q.includes('спин') || q.includes('поясниц') || q.includes('хруст') || q.includes('нога') || q.includes('шея') || q.includes('грыж') || q.includes("bo'g'im") || q.includes('tizza') || q.includes('bel') || q.includes("og'riq") || q.includes('mushak') || q.includes('shiqirl')) {
        matched = [getProd('drastop-max'), getProd('artrocol-gel')].filter(Boolean);
        text_ru = `Боль и хруст в суставах или пояснице говорят о том, что хрящевая ткань теряет эластичность и влагу.

Рекомендую проверенную схему:
• **Драстоп Макс** (капсулы) — глубоко восстанавливает хрящ благодаря глюкозамину, хондроитину и био-коллагену.
• **Артрокол гель** — наносите на сустав 2 раза в день, он быстро снимет скованность и воспаление.

💡 Пейте больше чистой воды, так как суставная смазка на 80% состоит из жидкости.

Боль беспокоит при ходьбе по лестнице или даже в покое?`;
        text_uz = `Bo'g'imlardagi og'riq va qisirlash tog'ay to'qimasi elastikligini yo'qotayotganidan darak beradi.

Sinovdan o'tgan samarali sxema:
• **Drastop Maks** (kapsula) — glyukozamin, xondroitin va bio-kollagen bilan tog'ayni ichkaridan tiklaydi.
• **Artrokol gel** — kuniga 2 mahal surting, og'riq va shishni tezda ketkazadi.

💡 Ko'proq suv iching, chunki bo'g'im suyuqligi suvdan hosil bo'ladi.

Og'riq zinadan chiqqanda bezovta qiladimi yoki tinch turgandami?`;
      }

      // 6. SLEEP, STRESS, ANXIETY
      else if (q.includes('сон') || q.includes('уснуть') || q.includes('бессонниц') || q.includes('стресс') || q.includes('нерв') || q.includes('тревог') || q.includes('паник') || q.includes('uyqu') || q.includes('asab') || q.includes('siqilish') || q.includes('tinchlan')) {
        matched = [getProd('vamelan')].filter(Boolean);
        text_ru = `При бессоннице и нервном напряжении лучше всего работает натуральный растительный фитокомплекс **ВАМЕЛАН** (валериана, мята и мелисса).

Он успокаивает мысли, снимает спазм сосудов головы и помогает заснуть естественным, глубоким сном без тяжелой головы наутро.

🌙 Принимайте 1-2 капсулы за 45 минут до сна с теплой водой.

Вам тяжело именно уснуть с вечера или просыпаетесь среди ночи?`;
        text_uz = `Uyqusizlik va asabiy zo'riqishda 100% tabiiy **VAMELAN** fitomajmuasi (valeriana, yalpiz va melissa) ajoyib ta'sir ko'rsatadi.

U ortiqcha o'y-xayollarni tinchlantiradi, bosh tomirlari siqilishini yozadi va ertalab bosh og'rig'isiz tetik uyg'onishni ta'minlaydi.

🌙 Yotishdan 45 daqiqa oldin 1-2 kapsulani iliq suv bilan iching.

Uyquga ketish qiyinmi yoki tunda uyg'onib ketyapsizmi?`;
      }

      // 7. IMMUNITY & VITAMINS
      else if (q.includes('иммун') || q.includes('простуд') || q.includes('грипп') || q.includes('витамин') || q.includes('d3') || q.includes('d-3') || q.includes('immunitet') || q.includes('shamollash') || q.includes('gripp')) {
        matched = [getProd('koledan-drops'), getProd('sanovit')].filter(Boolean);
        text_ru = `Для крепкого иммунитета ключевую роль играют витамин D3 и базовые микроэлементы.

Рекомендую:
1. **КОЛЕДАН (D3 50 000 МЕ)** — восполняет дефицит солнечного витамина, усиливает защитные барьеры организма.
2. **САНОВИТ** — мультивитаминный сироп для укрепления тонуса всей семьи.

☀️ Витамин D лучше принимать утром во время завтрака с полезными жирами (масло, сыр, яйцо).

Хотите укрепить иммунитет для профилактики или после болезни?`;
        text_uz = `Kuchli immunitet uchun eng muhimi D3 vitamini va asosiy mikroelementlardir.

Tavsiya qilaman:
1. **KOLEDAN (D3 50 000 XB)** — immunitet himoya to'sig'ini kuchaytiradi.
2. **SANOVIT** — butun oila uchun quvvat va immunitet siropi.

☀️ D vitaminini ertalab yog'liroq nonushta bilan ichish ma'qul.

Profilaktika uchunmi yoki kasallikdan keyin tiklanishgami?`;
      }

      // 8. BEAUTY: HAIR, SKIN, NAILS
      else if (q.includes('волос') || q.includes('кожа') || q.includes('ногти') || q.includes('выпаден') || q.includes('красот') || q.includes('морщин') || q.includes('коллаген') || q.includes('teri') || q.includes('soch') || q.includes('tirnoq') || q.includes("go'zal") || q.includes('ajin')) {
        matched = [getProd('polijen'), getProd('d-calcin')].filter(Boolean);
        text_ru = `Красота волос, кожи и ногтей идет изнутри. Когда волосам не хватает питания, а коже — упругости, идеально помогает сочетание:

• **ПОЛИЖЕН** — содержит коэнзим Q10, маточное молочко и цинк, которые стимулируют синтез коллагена и укрепляют волосяные луковицы.
• **Д-КАЛЬЦИН** — укрепляет ногти и предотвращает их ломкость.

Курс приема — 1 месяц. Уже через 2 недели волосы становятся заметно гуще и меньше выпадают.

Беспокоит больше выпадение волос или сухость кожи?`;
        text_uz = `Soch, teri va tirnoqlar go'zalligi organizmning ichki oziqlanishiga bog'liq.

Eng yaxshi natija beruvchi juftlik:
• **POLIJEN** — koenzim Q10, ona ari suti va rux moddasi bilan kollagen ishlab chiqarishni kuchaytiradi va soch to'kilishini to'xtatadi.
• **D-KALSIN** — tirnoqlarni qatlamlanishdan saqlaydi.

1 oylik kursdan so'ng sochlar qalinlashib, yuzingiz tiniqlashadi.

Sizda ko'proq soch to'kilishimi yoki teri quruqligimi?`;
      }

      // 9. KIDS & PREGNANCY / MOMS
      else if (q.includes('дет') || q.includes('ребенок') || q.includes('малыш') || q.includes('школ') || q.includes('памят') || q.includes('аппетит') || q.includes('bola') || q.includes('farzand') || q.includes('maktab') || q.includes('ishtaha')) {
        matched = [getProd('vamelan-kids'), getProd('sanovit'), getProd('d-calcin')].filter(Boolean);
        text_ru = `Для детей у нас есть сертифицированные детские формы с приятным вкусом: 👶

• **Сановит** — вкусный сироп для памяти, аппетита и крепкого иммунитета.
• **Вамелан Кидс** — фитосироп на травах при гиперактивности, капризах и тревожном сне.
• **Д-Кальцин** — гранулы с кальцием и D3 для здоровых зубок и роста костей.

Сколько лет ребенку? Подскажу точную дозировку.`;
        text_uz = `Bolalar uchun yoqimli ta'mga ega maxsus sertifikatlangan vositalarimiz bor: 👶

• **Sanovit** — ishtaha, xotira va immunitet uchun polivitamin siropi.
• **Vamelan Kids** — tinch uyqu va asabiylikni kamaytirish uchun tabiiy fitosirop.
• **D-Kalsin** — suyaklar va tishlar mustahkamligi uchun kalsiy granulalari.

Farzandingiz necha yoshda? Yoshi bo'yicha aniq me'yorni aytib beraman.`;
      }

      // 10. DELIVERY & PURCHASE
      else if (q.includes('доставк') || q.includes('заказ') || q.includes('купит') || q.includes('цена') || q.includes('стои') || q.includes('yetkaz') || q.includes('buyurtma') || q.includes('narx') || q.includes('qancha')) {
        matched = this.featuredProducts.slice(0, 2);
        text_ru = `Все препараты в наличии, 100% оригинал от производителя World Medicine. 📦

• **Доставка по Ташкенту**: курьером за 2-4 часа прямо в руки.
• **По всему Узбекистану**: быстрая экспресс-доставка через Uzum за 1 день.
• **Оплата**: при получении наличными или картой (Humo / Uzcard / Click / Payme).

Вы можете нажать кнопку «В корзину» под препаратом или оставить номер телефона, и мы все оформим за вас!`;
        text_uz = `Barcha preparatlarimiz mavjud, World Medicine kompaniyasining 100% original mahsulotlari. 📦

• **Toshkent bo'ylab**: kuryer orqali 2-4 soatda yetkaziladi.
• **O'zbekiston bo'ylab**: Uzum orqali 1 kunda yetkazib berish.
• **To'lov**: qabul qilganda naqd yoki karta orqali (Humo / Uzcard / Click / Payme).

Mahsulot ostidagi «Savat» tugmasini bosishingiz yoki telefon raqamingizni qoldirishingiz mumkin!`;
      }

      // 11. GENERAL SMART HUMAN MATCHING
      else {
        const found = this.products.find(p => 
          p.name_ru.toLowerCase().includes(q) || 
          p.description_ru.toLowerCase().includes(q) || 
          p.indications_ru.toLowerCase().includes(q) ||
          p.pharm_group_ru.toLowerCase().includes(q)
        );

        if (found) {
          matched = [found];
          text_ru = `По вашему запросу отлично подходит **${found.name_ru}** (${found.pharm_group_ru}).

💡 **В чем его польза**: ${found.description_ru.slice(0, 180)}...

🕒 **Как принимать**: ${found.usage_ru}

Хотите уточнить подробнее о составе или оформить заказ?`;
          text_uz = `So'rovingiz bo'yicha **${found.name_uz}** (${found.pharm_group_uz}) juda mos keladi.

💡 **Foydasi**: ${found.description_uz.slice(0, 180)}...

🕒 **Qanday ichiladi**: ${found.usage_uz}

Tarkibi haqida batafsil bilmoqchimisiz yoki buyurtma berasizmi?`;
        } else {
          matched = [getProd('polijen'), getProd('sanovit')].filter(Boolean);
          text_ru = `Поняла вас. Чтобы подобрать самый точный и эффективный комплекс, уточните, пожалуйста: какую главную задачу мы хотим решить — вернуть энергию, укрепить суставы, наладить сон, поддержать иммунитет или что-то другое?

Я сразу распишу правильный состав и схему приема!`;
          text_uz = `Sizni tushundim. Eng mos va samarali majmuani tanlash uchun ayting-chi: qaysi asosiy natijaga erishmoqchimiz — quvvatni oshirish, bo'g'imlarni davolash, uyquni yaxshilash yoki immunitetni mustahkamlashmi?

Darhol kerakli tarkib va qabul qilish tartibini yozib beraman!`;
        }
      }

      if (phone) {
        text_ru += `

📞 Номер **${phone}** записан! Наш специалист свяжется с вами в течение 10-15 минут для консультации и подтверждения заказа.`;
        text_uz += `

📞 **${phone}** raqamingiz qabul qilindi! Mutaxassisimiz 10-15 daqiqa ichida qo'ng'iroq qilib, buyurtmani tasdiqlaydi.`;
      }

      return { text_ru, text_uz, products: matched.slice(0, 2) };
    },

    // UI state
    isCartOpen: false,
    isMobileMenuOpen: false,
    isProductModalOpen: false,
    isCheckoutModalOpen: false,
    isOrderSuccessModalOpen: false,
    modalQty: 1,
    isVideoMuted: true,

    // Pagination (2 rows = 8 products per page)
    currentPage: 1,
    itemsPerPage: 8,

    toggleHeroVideo() {
      const vid = document.getElementById('heroBgVideo');
      if (vid) {
        this.isVideoMuted = !this.isVideoMuted;
        vid.muted = this.isVideoMuted;
        if (!this.isVideoMuted) {
          vid.play();
        }
        this.refreshIcons();
      }
    },

    // Checkout form
    checkout: {
      name: '',
      phone: '+998',
      city: 'Ташкент / Toshkent',
      address: '',
      deliveryType: 'tashkent_courier', // 'tashkent_courier' or 'regions_post'
      paymentMethod: 'cash_or_card',
      notes: ''
    },

    // Toast notifications
    toast: {
      visible: false,
      message: '',
      timeout: null
    },

    // Hero Carousel State
    heroCarouselIndex: 0,
    heroTimer: null,
    
    get featuredProducts() {
      const ids = ['sanovit', 'vamelan', 'drastop-max', 'polijen', 'koledan-drops'];
      return ids.map(id => this.products.find(p => p.id === id)).filter(Boolean);
    },

    get currentHeroProduct() {
      const list = this.featuredProducts;
      if (!list.length) return null;
      return list[this.heroCarouselIndex % list.length];
    },

    nextHeroSlide() {
      const list = this.featuredProducts;
      if (!list.length) return;
      this.heroCarouselIndex = (this.heroCarouselIndex + 1) % list.length;
      this.refreshIcons();
    },

    prevHeroSlide() {
      const list = this.featuredProducts;
      if (!list.length) return;
      this.heroCarouselIndex = (this.heroCarouselIndex - 1 + list.length) % list.length;
      this.refreshIcons();
    },

    setHeroSlide(idx) {
      this.heroCarouselIndex = idx;
      this.refreshIcons();
    },

    startHeroAutoSlide() {
      if (this.heroTimer) clearInterval(this.heroTimer);
      this.heroTimer = setInterval(() => {
        this.nextHeroSlide();
      }, 4000);
    },

    getSlideStyle(index) {
      const total = this.featuredProducts.length;
      if (!total) return '';
      let diff = (index - this.heroCarouselIndex) % total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;

      if (diff === 0) {
        // Active Main Product: Large, centered, fully visible
        return 'transform: translateY(0) scale(1.35); z-index: 30; opacity: 1; pointer-events: auto; filter: drop-shadow(0 30px 45px rgba(0,0,0,0.45)); transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);';
      } else {
        // Other Products: Completely invisible (hidden)
        return 'transform: translateY(20px) scale(0.9); z-index: 10; opacity: 0; pointer-events: none; filter: none; transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);';
      }
    },

    onSlideClick(prod, index) {
      const total = this.featuredProducts.length;
      let diff = (index - this.heroCarouselIndex) % total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;

      if (diff === 0) {
        this.openProductModal(prod);
      } else {
        this.setHeroSlide(index);
      }
    },

    // Init
    init() {
      // Re-render lucide icons when state updates
      this.$watch('isProductModalOpen', () => this.refreshIcons());
      this.$watch('isCartOpen', () => this.refreshIcons());
      this.$watch('isCheckoutModalOpen', () => this.refreshIcons());
      this.$watch('lang', (val) => {
        localStorage.setItem('wm_lang', val);
        document.documentElement.lang = val;
        this.refreshIcons();
      });
      this.$watch('selectedCategory', () => { this.currentPage = 1; this.refreshIcons(); });
      this.$watch('selectedForm', () => { this.currentPage = 1; this.refreshIcons(); });
      this.$watch('selectedLetter', () => { this.currentPage = 1; this.refreshIcons(); });
      this.$watch('selectedSymptom', () => { this.currentPage = 1; this.refreshIcons(); });
      this.$watch('searchQuery', () => { this.currentPage = 1; this.refreshIcons(); });
      this.$watch('sortBy', () => { this.currentPage = 1; this.refreshIcons(); });
      
      this.startHeroAutoSlide();
      setTimeout(() => this.refreshIcons(), 100);
    },

    setLang(newLang) {
      this.lang = newLang;
    },

    t(key) {
      const dict = {
        catalog_title: {
          ru: "Формулы красоты, молодости и здоровья",
          uz: "Go'zallik, yoshlik va salomatlik formulalari"
        },
        catalog_subtitle: {
          ru: "Европейские премиум-формулы: естественное сияние, бодрость, молодость и гармония каждый день",
          uz: "Premium Yevropa formulalari: tabiiy jilo, yoshlik nuri, tetiklik va har kungi mukammal uyg'unlik"
        },
        search_placeholder: {
          ru: "Поиск по названию, симптому или веществу...",
          uz: "Nomi, alomati yoki tarkibi bo'yicha qidirish..."
        },
        all_categories: {
          ru: "Все категории",
          uz: "Barcha toifalar"
        },
        all_letters: {
          ru: "Все буквы",
          uz: "Barcha harflar"
        },
        reset_filters: {
          ru: "Сбросить фильтры",
          uz: "Filtrlarni tozalash"
        },
        found_products: {
          ru: "Найдено позиций",
          uz: "Topilgan mahsulotlar"
        },
        add_to_cart: {
          ru: "В корзину",
          uz: "Savatga"
        },
        in_cart: {
          ru: "В корзине",
          uz: "Savatda"
        },
        more_details: {
          ru: "Подробнее",
          uz: "Batafsil"
        },
        cart_title: {
          ru: "Корзина заказов",
          uz: "Buyurtmalar savati"
        },
        empty_cart: {
          ru: "Ваша корзина пуста",
          uz: "Savatingiz bo'sh"
        },
        empty_cart_desc: {
          ru: "Выберите нужные комплексы и БАД в каталоге и добавьте их в корзину",
          uz: "Katalogdan kerakli BFQ vositalarini tanlang va savatga qo'shing"
        },
        total: {
          ru: "Итого к оплате",
          uz: "Jami to'lov"
        },
        free_delivery_notice: {
          ru: "Бесплатная доставка от 200 000 сум по Ташкенту",
          uz: "Toshkent bo'ylab 200 000 so'mdan bepul yetkazib berish"
        },
        checkout_btn: {
          ru: "Оформить заказ",
          uz: "Buyurtma berish"
        },
        telegram_order_btn: {
          ru: "Быстрый заказ через Telegram",
          uz: "Telegram orqali tezkor buyurtma"
        },
        otc_badge: {
          ru: "Без рецепта",
          uz: "Retseptsiz"
        },
        sum: {
          ru: "сум",
          uz: "so'm"
        },
        composition: {
          ru: "Состав и активные вещества",
          uz: "Tarkibi va faol moddalar"
        },
        indications: {
          ru: "Рекомендации к применению",
          uz: "Qo'llash bo'yicha tavsiyalar"
        },
        usage: {
          ru: "Способ применения и дозы",
          uz: "Qo'llash usuli va dozalari"
        },
        pharm_group: {
          ru: "Направление",
          uz: "Yo'nalishi"
        },
        form_release: {
          ru: "Форма выпуска",
          uz: "Chiqarilish shakli"
        },
        buy_on_uzum: {
          ru: "Купить на Uzum Market",
          uz: "Uzum Market'da xarid qilish"
        },
        uzum_delivery_tag: {
          ru: "Доставка за 1 день от Uzum",
          uz: "Uzum'dan 1 kunda yetkazish"
        },
        uzum_official_store: {
          ru: "Официальный магазин World Medicine на Uzum",
          uz: "World Medicine rasmiy do'koni Uzum'da"
        }
      };

      return dict[key] ? (dict[key][this.lang] || dict[key]['ru']) : key;
    },

    getUzumUrl(product) {
      if (!product) return 'https://uzum.uz/ru';
      if (product.uzum_url) return product.uzum_url;
      const cleanName = (product.name_ru || '').split('(')[0].trim();
      return `https://uzum.uz/ru/search?q=${encodeURIComponent(cleanName + ' world medicine')}`;
    },

    getProductBg(product) {
      if (!product) return 'bg-gradient-to-b from-[#f2f7fd] via-[#f8fbfe] to-white';
      const id = (product.id || '').toLowerCase();
      const cat = product.category_id || '';
      const name = (product.name_ru || '').toLowerCase();

      // 1. Specific brand packaging palettes
      if (id.includes('iodofol') || name.includes('йодофол')) {
        return 'bg-gradient-to-b from-[#fff0f3] via-[#fff8fa] to-white border-b border-rose-100/60'; // Ruby / Red (Йодофол)
      }
      if (id.includes('polijen') || name.includes('полижен')) {
        return 'bg-gradient-to-b from-[#fff6e5] via-[#fffbf3] to-white border-b border-amber-100/60'; // Golden Honey (Полижен)
      }
      if (id.includes('emfetal') || name.includes('эмфетал')) {
        return 'bg-gradient-to-b from-[#fff0f7] via-[#fff8fc] to-white border-b border-pink-100/60'; // Fuchsia / Pink (Эмфетал)
      }
      if (id.includes('koledan') || name.includes('коледан')) {
        return 'bg-gradient-to-b from-[#eaf3ff] via-[#f6faff] to-white border-b border-blue-100/60'; // Blue & Gold (Коледан)
      }
      if (id.includes('vamelan') || name.includes('вамелан')) {
        return 'bg-gradient-to-b from-[#ebfaf1] via-[#f6fdf9] to-white border-b border-emerald-100/60'; // Herbal Mint (Вамелан)
      }
      if (id.includes('artrocol') || name.includes('артрокол') || id.includes('drastop') || name.includes('драстоп')) {
        return 'bg-gradient-to-b from-[#e6f7fa] via-[#f4fcfe] to-white border-b border-cyan-100/60'; // Cyan / Aquamarine (Артрокол & Драстоп)
      }
      if (id.includes('lacidoforte') || name.includes('лацидофорте') || cat === 'gastro') {
        return 'bg-gradient-to-b from-[#effcf6] via-[#f7fdfa] to-white border-b border-teal-100/60'; // Prebiotic Mint (Лацидофорте / ЖКТ)
      }
      if (id.includes('rotavit') || name.includes('ротавит') || id.includes('sanovit')) {
        return 'bg-gradient-to-b from-[#fff4eb] via-[#fffaf5] to-white border-b border-orange-100/60'; // Citrus Energy (Ротавит / Сановит)
      }
      if (cat === 'kids_mom') {
        return 'bg-gradient-to-b from-[#fff3f5] via-[#fff9fa] to-white border-b border-rose-100/60'; // Soft Rose Kids
      }
      if (cat === 'nervous_sedative') {
        return 'bg-gradient-to-b from-[#f3f0ff] via-[#f9f8fe] to-white border-b border-purple-100/60'; // Lavender Sedative
      }
      if (cat === 'vitamins_minerals' || id.includes('d-calcin')) {
        return 'bg-gradient-to-b from-[#edf6ff] via-[#f8fbff] to-white border-b border-sky-100/60'; // Clean Sky Vitamin
      }

      return 'bg-gradient-to-b from-[#f2f7fd] via-[#f8fbfe] to-white';
    },

    // Available Russian alphabet letters based on current products
    get availableLetters() {
      const letters = new Set();
      this.products.forEach(p => {
        const firstLetter = p.name_ru.trim().charAt(0).toUpperCase();
        if (/[А-ЯЁ]/.test(firstLetter)) {
          letters.add(firstLetter);
        }
      });
      return Array.from(letters).sort((a, b) => a.localeCompare(b, 'ru'));
    },

    // Filtered & Sorted Products
    get filteredProducts() {
      let list = [...this.products];

      // Filter by category
      if (this.selectedCategory !== 'all') {
        list = list.filter(p => p.category_id === this.selectedCategory);
      }

      // Filter by form
      if (this.selectedForm !== 'all') {
        const formObj = this.forms.find(f => f.id === this.selectedForm);
        if (formObj) {
          if (this.selectedForm === 'capsules') list = list.filter(p => /капсул/i.test(p.form_ru));
          else if (this.selectedForm === 'tablets') list = list.filter(p => /таблет/i.test(p.form_ru));
          else if (this.selectedForm === 'gel_cream') list = list.filter(p => /гель|крем|мазь/i.test(p.form_ru));
          else if (this.selectedForm === 'syrup_drops') list = list.filter(p => /сироп|капли|суспензия|раствор/i.test(p.form_ru));
          else if (this.selectedForm === 'sachets') list = list.filter(p => /саше|порошок|гранул/i.test(p.form_ru));
        }
      }

      // Filter by alphabet letter
      if (this.selectedLetter) {
        list = list.filter(p => p.name_ru.toUpperCase().startsWith(this.selectedLetter.toUpperCase()));
      }

      // Filter by symptom selector
      if (this.selectedSymptom) {
        const symptomObj = this.symptoms.find(s => s.id === this.selectedSymptom);
        if (symptomObj) {
          list = list.filter(p => symptomObj.product_ids.includes(p.id));
        }
      }

      // Search query
      if (this.searchQuery.trim() !== '') {
        const q = this.searchQuery.toLowerCase().trim();
        list = list.filter(p => 
          p.name_ru.toLowerCase().includes(q) ||
          p.name_uz.toLowerCase().includes(q) ||
          p.description_ru.toLowerCase().includes(q) ||
          p.description_uz.toLowerCase().includes(q) ||
          p.composition_ru.toLowerCase().includes(q) ||
          p.indications_ru.toLowerCase().includes(q) ||
          p.pharm_group_ru.toLowerCase().includes(q)
        );
      }

      // Sorting
      if (this.sortBy === 'price_asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (this.sortBy === 'price_desc') {
        list.sort((a, b) => b.price - a.price);
      } else if (this.sortBy === 'name') {
        const nameKey = this.lang === 'uz' ? 'name_uz' : 'name_ru';
        list.sort((a, b) => a[nameKey].localeCompare(b[nameKey]));
      } else if (this.sortBy === 'popular') {
        list.sort((a, b) => (b.reviews_count * b.rating) - (a.reviews_count * a.rating));
      }

      return list;
    },

    // Pagination Getters & Methods
    get totalPages() {
      return Math.ceil(this.filteredProducts.length / this.itemsPerPage) || 1;
    },

    get paginatedProducts() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredProducts.slice(start, start + this.itemsPerPage);
    },

    setPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.currentPage = page;
      this.$nextTick(() => {
        this.refreshIcons();
        const el = document.getElementById('catalog-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },

    nextPage() {
      this.setPage(this.currentPage + 1);
    },

    prevPage() {
      this.setPage(this.currentPage - 1);
    },

    // Products matching selected symptom
    get selectedSymptomProducts() {
      if (!this.selectedSymptom) return [];
      const sym = this.symptoms.find(s => s.id === this.selectedSymptom);
      if (!sym) return [];
      return this.products.filter(p => sym.product_ids.includes(p.id));
    },

    // Cart calculations
    get cartTotal() {
      return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    get cartCount() {
      return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    },

    get isFreeDeliveryEligible() {
      return this.cartTotal >= 200000;
    },

    get deliveryProgressPercent() {
      const target = 200000;
      return Math.min(100, Math.round((this.cartTotal / target) * 100));
    },

    // Product methods
    formatPrice(price) {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + this.t('sum');
    },

    openProductModal(product) {
      this.selectedProduct = product;
      this.modalQty = 1;
      this.isProductModalOpen = true;
    },

    closeProductModal() {
      this.isProductModalOpen = false;
      this.selectedProduct = null;
    },

    selectSymptomFilter(symptomId) {
      if (this.selectedSymptom === symptomId) {
        this.selectedSymptom = null;
      } else {
        this.selectedSymptom = symptomId;
        this.selectedCategory = 'all';
        this.selectedLetter = '';
      }
      this.refreshIcons();
    },

    resetAllFilters() {
      this.searchQuery = '';
      this.selectedCategory = 'all';
      this.selectedForm = 'all';
      this.selectedLetter = '';
      this.selectedSymptom = null;
      this.sortBy = 'popular';
    },

    scrollToCatalog() {
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    // Cart operations
    addToCart(product, qty = 1) {
      const existing = this.cart.find(item => item.id === product.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        this.cart.push({
          id: product.id,
          name_ru: product.name_ru,
          name_uz: product.name_uz,
          dosage_ru: product.dosage_ru,
          dosage_uz: product.dosage_uz,
          price: product.price,
          image: product.image,
          quantity: qty
        });
      }
      this.saveCart();
      this.showToast(this.lang === 'uz' ? `"${product.name_uz}" savatga qo'shildi` : `"${product.name_ru}" добавлен в корзину`);
      this.refreshIcons();
    },

    updateCartQty(productId, delta) {
      const item = this.cart.find(i => i.id === productId);
      if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
          this.cart = this.cart.filter(i => i.id !== productId);
        }
        this.saveCart();
      }
    },

    removeFromCart(productId) {
      this.cart = this.cart.filter(i => i.id !== productId);
      this.saveCart();
      this.showToast(this.lang === 'uz' ? "Mahsulot savatdan olib tashlandi" : "Товар удален из корзины");
    },

    clearCart() {
      this.cart = [];
      this.saveCart();
    },

    isInCart(productId) {
      return this.cart.some(item => item.id === productId);
    },

    saveCart() {
      localStorage.setItem('wm_cart', JSON.stringify(this.cart));
    },

    // Wishlist / Favorites
    toggleFavorite(productId) {
      if (this.favorites.includes(productId)) {
        this.favorites = this.favorites.filter(id => id !== productId);
        this.showToast(this.lang === 'uz' ? "Sevimlilardan o'chirildi" : "Удалено из избранного");
      } else {
        this.favorites.push(productId);
        this.showToast(this.lang === 'uz' ? "Sevimlilarga qo'shildi" : "Добавлено в избранное");
      }
      localStorage.setItem('wm_favorites', JSON.stringify(this.favorites));
      this.refreshIcons();
    },

    isFavorite(productId) {
      return this.favorites.includes(productId);
    },

    // Toast
    showToast(message) {
      this.toast.message = message;
      this.toast.visible = true;
      if (this.toast.timeout) clearTimeout(this.toast.timeout);
      this.toast.timeout = setTimeout(() => {
        this.toast.visible = false;
      }, 2600);
    },

    // Checkout & Telegram order
    openCheckout() {
      if (this.cart.length === 0) return;
      this.isCartOpen = false;
      this.isCheckoutModalOpen = true;
    },

    // Telegram Bot Configuration for Instant Order Notifications    // Forward AI Consultant Dialog & Leads to Telegram Bot
    async sendConsultationLeadToTelegram(question, phone, products) {
      if (!question && !phone) return;

      const now = new Date();
      const timeStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const isUz = this.lang === 'uz';

      let msg = `💬 <b>${isUz ? 'AI-MASLAHATCHI: YANGI MUROJAAT' : 'НОВОЕ ОБРАЩЕНИЕ К AI-КОНСУЛЬТАНТУ'}</b>
`;
      msg += `📅 <i>${timeStr}</i>

`;

      if (question) {
        msg += `❓ <b>${isUz ? 'Mijoz savoli' : 'Вопрос клиента'}:</b>
<i>«${question}»</i>

`;
      }

      if (phone) {
        msg += `📞 <b>${isUz ? 'Bog\'lanish telefoni' : 'Контактный телефон'}:</b> <code>${phone}</code>

`;
      } else {
        msg += `📞 <b>${isUz ? 'Telefon' : 'Телефон'}:</b> <i>Не указан (вопрос на сайте)</i>

`;
      }

      if (products && products.length > 0) {
        msg += `💡 <b>${isUz ? 'Tavsiya etilgan BFQ preparatlari' : 'Подобранные БАД комплексы'}:</b>
`;
        products.forEach((p, idx) => {
          const name = isUz ? p.name_uz : p.name_ru;
          const dosage = isUz ? p.dosage_uz : p.dosage_ru;
          msg += `${idx + 1}. <b>${name}</b> (${dosage}) — ${this.formatPrice(p.price)}
`;
        });
      }

      msg += `
🌐 <i>Manba: World Medicine OTC AI Assistant</i>`;

      if (this.telegramBot && this.telegramBot.token && this.telegramBot.chatId) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${this.telegramBot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.telegramBot.chatId,
              text: msg,
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          console.log('AI Lead Telegram delivery status:', data.ok);
        } catch (err) {
          console.warn('Telegram lead delivery error:', err);
        }
      }
    },

    async submitOrder() {
      if (!this.checkout.name || !this.checkout.phone || this.checkout.phone.length < 9) {
        alert(this.lang === 'uz' ? "Iltimos, ism va telefon raqamingizni kiriting" : "Пожалуйста, укажите имя и контактный телефон");
        return;
      }

      if (this.cart.length === 0) return;
      this.isSubmittingOrder = true;

      // 1. Generate Structured Telegram Order Report
      const now = new Date();
      const timeStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      const isUz = this.lang === 'uz';
      let message = `🛍 <b>${isUz ? 'YANGI BUYURTMA' : 'НОВЫЙ ЗАКАЗ'} — World Medicine OTC</b>
`;
      message += `📅 <i>${timeStr}</i>

`;
      
      message += `👤 <b>${isUz ? 'Mijoz' : 'Клиент'}:</b> ${this.checkout.name}
`;
      message += `📞 <b>${isUz ? 'Telefon' : 'Телефон'}:</b> <code>${this.checkout.phone}</code>
`;
      message += `📍 <b>${isUz ? 'Manzil' : 'Адрес доставки'}:</b> ${this.checkout.city || 'Toshkent'}, ${this.checkout.address || (isUz ? 'Aniqlanadi' : 'Уточняется')}

`;

      message += `🛒 <b>${isUz ? 'Buyurtma tarkibi' : 'Состав заказа'}:</b>
`;
      this.cart.forEach((item, index) => {
        const name = isUz ? item.name_uz : item.name_ru;
        const dosage = isUz ? item.dosage_uz : item.dosage_ru;
        const itemTotal = this.formatPrice(item.price * item.quantity);
        message += `${index + 1}. <b>${name}</b> (${dosage})
`;
        message += `   └ ${item.quantity} шт × ${this.formatPrice(item.price)} = <b>${itemTotal}</b>
`;
      });

      const finalTotal = this.isFreeDeliveryEligible ? this.cartTotal : this.cartTotal + 25000;
      message += `
🚚 <b>${isUz ? 'Yetkazib berish' : 'Доставка'}:</b> ${this.isFreeDeliveryEligible ? (isUz ? 'Bepul (Uzum 1-Day)' : 'Бесплатно (Uzum 1-Day)') : '25 000 сум'}
`;
      message += `💰 <b>${isUz ? 'JAMI TO\'LOV' : 'ИТОГО К ОПЛАТЕ'}:</b> <b>${this.formatPrice(finalTotal)}</b>
`;
      message += `🌐 <i>Manba: wm-otc online platform</i>`;

      // 2. Send via Telegram Bot API
      if (this.telegramBot && this.telegramBot.token && this.telegramBot.chatId) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${this.telegramBot.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: this.telegramBot.chatId,
              text: message,
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          console.log('Order Telegram delivery status:', data.ok);
        } catch (err) {
          console.error('Failed to send order via Telegram Bot:', err);
        }
      }

      this.isSubmittingOrder = false;
      this.isCheckoutModalOpen = false;
      this.isOrderSuccessModalOpen = true;
      this.clearCart();
      this.refreshIcons();
    },

    sendTelegramDirectOrder() {
      if (this.cart.length === 0) return;

      const title = this.lang === 'uz' ? "📦 *Yangi buyurtma (World Medicine OTC):*\n\n" : "📦 *Новый заказ (World Medicine OTC):*\n\n";
      let itemsText = "";
      
      this.cart.forEach((item, index) => {
        const name = this.lang === 'uz' ? item.name_uz : item.name_ru;
        const dosage = this.lang === 'uz' ? item.dosage_uz : item.dosage_ru;
        itemsText += `${index + 1}. *${name}* (${dosage})\n   ${item.quantity} dona x ${this.formatPrice(item.price)} = ${this.formatPrice(item.price * item.quantity)}\n`;
      });

      const totalText = `\n💰 *${this.t('total')}:* ${this.formatPrice(this.cartTotal)}\n`;
      const clientInfo = `👤 *Ism/Имя:* ${this.checkout.name || 'Mijoz'}\n📞 *Tel:* ${this.checkout.phone}\n📍 *Manzil/Адрес:* ${this.checkout.city}, ${this.checkout.address || 'Yetkazib berishda aniqlanadi'}\n`;
      
      const fullMessage = encodeURIComponent(title + itemsText + totalText + "\n" + clientInfo);
      
      // Open Telegram direct message
      window.open(`https://t.me/worldmedicineuz?text=${fullMessage}`, '_blank');
      
      this.isCheckoutModalOpen = false;
      this.isOrderSuccessModalOpen = true;
      this.clearCart();
    },

    selectSymptomFilter(symptomId) {
      if (this.selectedSymptom === symptomId) {
        this.selectedSymptom = null;
      } else {
        this.selectedSymptom = symptomId;
        this.selectedCategory = 'all';
        this.selectedLetter = '';
        this.scrollToCatalog();
      }
      this.refreshIcons();
    },

    resetAllFilters() {
      this.selectedCategory = 'all';
      this.selectedForm = 'all';
      this.selectedLetter = '';
      this.selectedSymptom = null;
      this.searchQuery = '';
      this.refreshIcons();
    },

    scrollToCatalog() {
      const el = document.getElementById('products-catalog') || document.getElementById('catalog-section');
      if (el) {
        const headerOffset = 75;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    },

    refreshIcons() {
      this.$nextTick(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      });
    }
  }));
});


/**
 * Vibecoded Motion Layer
 * -----------------------
 * Scroll-triggered reveal animations + cursor-following spotlight on
 * product cards + subtle hero video parallax on scroll.
 * Runs independently of Alpine so it survives every filter/pagination
 * re-render (tracked via MutationObserver) without extra wiring.
 * Respects prefers-reduced-motion throughout.
 */
document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- 1. Scroll reveal (fade + rise into view) --- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function observeReveals() {
    document.querySelectorAll('.reveal-on-scroll:not(.reveal-observed)').forEach((el) => {
      el.classList.add('reveal-observed');
      if (prefersReducedMotion) {
        el.classList.add('revealed');
      } else {
        revealObserver.observe(el);
      }
    });
  }

  observeReveals();
  // Alpine re-renders the product grid on every filter/page/language change,
  // so new cards keep appearing after the initial load — pick them up too.
  new MutationObserver(observeReveals).observe(document.body, { childList: true, subtree: true });

  /* --- 2. Cursor-following spotlight on product cards --- */
  if (!prefersReducedMotion) {
    let spotlightPending = false;
    let lastPointerEvent = null;

    document.addEventListener('mousemove', (e) => {
      lastPointerEvent = e;
      if (spotlightPending) return;
      spotlightPending = true;
      requestAnimationFrame(() => {
        spotlightPending = false;
        const card = lastPointerEvent.target.closest && lastPointerEvent.target.closest('.product-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', (lastPointerEvent.clientX - rect.left) + 'px');
        card.style.setProperty('--spot-y', (lastPointerEvent.clientY - rect.top) + 'px');
      });
    }, { passive: true });
  }

  /* --- 3. Hero video parallax on scroll --- */
  const heroVideo = document.getElementById('heroBgVideo');
  if (heroVideo && !prefersReducedMotion) {
    let parallaxPending = false;
    const applyParallax = () => {
      parallaxPending = false;
      const offset = Math.min(Math.max(window.scrollY * 0.12, 0), 90);
      heroVideo.style.transform = 'scale(1.12) translateY(' + offset + 'px)';
    };
    window.addEventListener('scroll', () => {
      if (!parallaxPending) {
        parallaxPending = true;
        requestAnimationFrame(applyParallax);
      }
    }, { passive: true });
    applyParallax();
  }

                      /* --- 4. Interactive Mouse Follower Character (Handled by <mouse-follower> component) --- */

/* --- 5. Realistic Blue Morpho Butterfly Cursor with Glow Trail --- */
  (function initButterflyCursor() {
    const section = document.getElementById('symptoms-guide');
    if (!section) return;

    let canvas = document.getElementById('butterflyTrailCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'butterflyTrailCanvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    let butterflyWrap = document.querySelector('.butterfly-cursor-wrap');
    if (!butterflyWrap) {
      butterflyWrap = document.createElement('div');
      butterflyWrap.className = 'butterfly-cursor-wrap';
      butterflyWrap.innerHTML = `
        <div class="butterfly-body-container">
          <!-- Realistic Left Wing (Forewing + Hindwing) -->
          <div class="butterfly-wing-wrap butterfly-wing-wrap-left">
            <svg viewBox="0 0 100 120" class="wing-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="morphoBlueL" x1="100%" y1="50%" x2="0%" y2="0%">
                  <stop offset="0%" stop-color="#001f66"/>
                  <stop offset="25%" stop-color="#0052cc"/>
                  <stop offset="60%" stop-color="#00e5ff"/>
                  <stop offset="85%" stop-color="#80ffff"/>
                  <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id="edgeDarkL" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#050a1f"/>
                  <stop offset="85%" stop-color="#0a194f"/>
                  <stop offset="100%" stop-color="#0032a0"/>
                </linearGradient>
              </defs>
              <path d="M 98,62 C 90,45 70,12 35,2 C 15,-4 2,12 1,28 C 0,44 12,58 30,68 C 45,75 75,76 98,64 Z" fill="url(#edgeDarkL)" />
              <path d="M 96,60 C 88,44 68,16 38,6 C 22,2 10,16 9,28 C 8,40 18,52 34,60 C 48,67 76,68 96,60 Z" fill="url(#morphoBlueL)" opacity="0.95" />
              <path d="M 95,60 C 65,45 35,30 18,22 M 95,60 C 60,50 30,42 16,38 M 95,60 C 70,55 45,56 26,56" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.6"/>
              <circle cx="6" cy="18" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="4" cy="28" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="8" cy="40" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="16" cy="52" r="1.5" fill="#ffffff" opacity="0.9"/>
              <path d="M 96,62 C 85,68 60,70 42,76 C 24,82 18,98 28,110 C 38,120 62,118 78,102 C 88,92 95,78 98,64 Z" fill="url(#edgeDarkL)" />
              <path d="M 94,64 C 83,70 60,72 45,78 C 30,84 25,96 34,105 C 42,112 62,110 74,98 C 84,88 92,76 94,64 Z" fill="url(#morphoBlueL)" opacity="0.92" />
              <path d="M 94,64 C 70,80 48,92 38,102 M 94,64 C 78,88 65,102 54,106" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.5"/>
              <circle cx="28" cy="106" r="1.4" fill="#ffffff" opacity="0.9"/>
              <circle cx="42" cy="114" r="1.4" fill="#ffffff" opacity="0.9"/>
              <circle cx="60" cy="114" r="1.4" fill="#ffffff" opacity="0.9"/>
            </svg>
          </div>

          <!-- Realistic Right Wing (Forewing + Hindwing) -->
          <div class="butterfly-wing-wrap butterfly-wing-wrap-right">
            <svg viewBox="0 0 100 120" class="wing-svg" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="morphoBlueR" x1="0%" y1="50%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#001f66"/>
                  <stop offset="25%" stop-color="#0052cc"/>
                  <stop offset="60%" stop-color="#00e5ff"/>
                  <stop offset="85%" stop-color="#80ffff"/>
                  <stop offset="100%" stop-color="#ffffff"/>
                </linearGradient>
                <linearGradient id="edgeDarkR" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#050a1f"/>
                  <stop offset="85%" stop-color="#0a194f"/>
                  <stop offset="100%" stop-color="#0032a0"/>
                </linearGradient>
              </defs>
              <path d="M 2,62 C 10,45 30,12 65,2 C 85,-4 98,12 99,28 C 100,44 88,58 70,68 C 55,75 25,76 2,64 Z" fill="url(#edgeDarkR)" />
              <path d="M 4,60 C 12,44 32,16 62,6 C 78,2 90,16 91,28 C 92,40 82,52 66,60 C 52,67 24,68 4,60 Z" fill="url(#morphoBlueR)" opacity="0.95" />
              <path d="M 5,60 C 35,45 65,30 82,22 M 5,60 C 40,50 70,42 84,38 M 5,60 C 30,55 55,56 74,56" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.6"/>
              <circle cx="94" cy="18" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="96" cy="28" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="92" cy="40" r="1.5" fill="#ffffff" opacity="0.9"/>
              <circle cx="84" cy="52" r="1.5" fill="#ffffff" opacity="0.9"/>
              <path d="M 4,62 C 15,68 40,70 58,76 C 76,82 82,98 72,110 C 62,120 38,118 22,102 C 12,92 5,78 2,64 Z" fill="url(#edgeDarkR)" />
              <path d="M 6,64 C 17,70 40,72 55,78 C 70,84 75,96 66,105 C 58,112 38,110 26,98 C 16,88 8,76 6,64 Z" fill="url(#morphoBlueR)" opacity="0.92" />
              <path d="M 6,64 C 30,80 52,92 62,102 M 6,64 C 22,88 35,102 46,106" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.5"/>
              <circle cx="72" cy="106" r="1.4" fill="#ffffff" opacity="0.9"/>
              <circle cx="58" cy="114" r="1.4" fill="#ffffff" opacity="0.9"/>
              <circle cx="40" cy="114" r="1.4" fill="#ffffff" opacity="0.9"/>
            </svg>
          </div>

          <!-- Realistic Center Body & Curved Antennae -->
          <svg viewBox="0 0 40 120" class="butterfly-center-body" xmlns="http://www.w3.org/2000/svg">
            <path d="M 18,30 C 14,18 8,10 2,8" stroke="#050a1f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <circle cx="2" cy="8" r="1.6" fill="#00e5ff"/>
            <path d="M 22,30 C 26,18 32,10 38,8" stroke="#050a1f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <circle cx="38" cy="8" r="1.6" fill="#00e5ff"/>
            <ellipse cx="20" cy="32" rx="3.5" ry="3.5" fill="#050a1f"/>
            <circle cx="17.5" cy="31" r="1.2" fill="#00e5ff"/>
            <circle cx="22.5" cy="31" r="1.2" fill="#00e5ff"/>
            <ellipse cx="20" cy="45" rx="4" ry="9" fill="#050a1f"/>
            <ellipse cx="20" cy="45" rx="2.2" ry="7" fill="#0044cc" opacity="0.8"/>
            <ellipse cx="20" cy="68" rx="3.2" ry="15" fill="#0a1128"/>
            <ellipse cx="20" cy="68" rx="1.8" ry="12" fill="#0066ff" opacity="0.7"/>
          </svg>
        </div>
      `;
      document.body.appendChild(butterflyWrap);
    }

    const container = butterflyWrap.querySelector('.butterfly-body-container');
    const particles = [];
    const maxParticles = 45;

    let mouseX = -100, mouseY = -100;
    let bX = -100, bY = -100;
    let prevBX = -100, prevBY = -100;
    let flightAngle = 0;
    let isInside = false;
    let tick = 0;

    function addParticle(x, y) {
      if (particles.length >= maxParticles) {
        particles.shift();
      }
      const colors = ['#00e5ff', '#38bdf8', '#80ffff', '#fbbf24', '#ffffff'];
      particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10 + 8,
        vx: (Math.random() - 0.5) * 0.9,
        vy: Math.random() * 0.9 + 0.4,
        size: Math.random() * 2.8 + 1.4,
        alpha: 0.9,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    function loop() {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isInside) {
        const ease = 0.2;
        bX += (mouseX - bX) * ease;
        bY += (mouseY - bY) * ease;

        const bobX = Math.sin(tick * 0.11) * 2.5;
        const bobY = Math.cos(tick * 0.13) * 3;

        const dx = bX - prevBX;
        const dy = bY - prevBY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        if (speed > 1.2) {
          const targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
          flightAngle += (targetAngle - flightAngle) * 0.28;
        }

        prevBX = bX;
        prevBY = bY;

        butterflyWrap.style.transform = `translate(${bX + bobX}px, ${bY + bobY}px)`;
        container.style.transform = `rotate(${flightAngle}deg)`;

        if (tick % 2 === 0) {
          addParticle(bX, bY);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.022;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    window.addEventListener('pointermove', (e) => {
      const rect = section.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        if (!isInside) {
          isInside = true;
          bX = e.clientX;
          bY = e.clientY;
          prevBX = e.clientX;
          prevBY = e.clientY;
          butterflyWrap.classList.add('active');
          canvas.classList.add('active');
        }
        mouseX = e.clientX;
        mouseY = e.clientY;
      } else {
        if (isInside) {
          isInside = false;
          butterflyWrap.classList.remove('active');
          canvas.classList.remove('active');
        }
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      if (isInside) {
        isInside = false;
        butterflyWrap.classList.remove('active');
        canvas.classList.remove('active');
      }
    });
  })();
});