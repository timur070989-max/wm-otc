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

    isUzbekQuery(text) {
      if (!text) return false;
      const uzbekIndicators = [
        // Latin Uzbek
        'assalom', 'alaykum', 'salom', 'rahmat', 'raxmat', 'tashakkur', 'qanday', 'nima', 'qanaqa',
        'yaxshi', 'kerak', 'mumkin', 'bormi', "yo'q", 'yoq', 'qayerda', 'qancha', 'narxi', 'narx',
        'yetkaz', 'bering', 'aytib', 'yordam', 'uchun', 'ichiladi', 'ichish', 'qabul', 'qilish', 'bolalar',
        'bola', 'onalar', 'farzand', "bo'g'im", 'bogim', 'bel', 'tizza', "og'riq", 'ogriq', "og'ri", 'ogri',
        'holsiz', 'charchoq', 'uyqu', 'asab', 'siqilish', 'teri', 'soch', 'tirnoq',
        'oshqozon', 'hazm', 'jigar', "jig'ildon", 'jigildon', "dam bo'l", 'dam bol', 'shamollash',
        'isitma', 'tomir', 'varikoz', "ko'z", 'koz', 'kamqonlik', 'gemoglobin', 'homilador', 'ozish',
        'sotib', 'olish', 'buyurtma', 'iltimos', 'tushunarli', 'boshim', 'bosh ', 'oyog', 'qolim',

        // Cyrillic Uzbek
        'ассалом', 'алейкум', 'салом', 'рахмат', 'ташаккур', 'қандай', 'кандай', 'нима', 'яхши', 'керак',
        'мумкин', 'борми', 'йўқ', 'йук', 'қанча', 'канча', 'нарх', 'етказиб', 'етказиш', 'беринг', 'айтиб',
        'ёрдам', 'ердам', 'учун', 'ичилади', 'ичиш', 'қабул', 'кабул', 'қилиш', 'килиш', 'болалар', 'бола',
        'фарзанд', 'бўғим', 'бугим', 'бел', 'тизза', 'оғриқ', 'огриқ', 'оғрияпти', 'огрияпти', 'оғри', 'огри',
        'ҳолсиз', 'холсиз', 'чарчоқ', 'чарчок', 'уйқу', 'уйку', 'асаб', 'сиқилиш', 'сикилиш', 'тери', 'соч',
        'тирноқ', 'тирнок', 'ошқозон', 'ошкозон', 'ҳазм', 'хазм', 'жигар', 'жиғилдон', 'жигилдон',
        'шамоллаш', 'иситма', 'томир', 'варикоз', 'кўз', 'куз', 'камқонлик', 'камконлик', 'ҳомиладор',
        'хомиладор', 'озиш', 'сотиб', 'буюртма', 'илтимос', 'тушунарли', 'бошим', 'оёғим', 'оёк', 'оёг',
        'қўлим', 'кулим', 'бўлади', 'булади', 'қилса', 'килса'
      ];
      const t = text.toLowerCase().trim();
      return uzbekIndicators.some(w => t.includes(w));
    },

    handleSendMessage(wasSpoken = false) {
      const text = (this.chatInput || '').trim();
      const phone = (this.chatPhone || '').trim();
      if (!text && !phone) return;

      // Auto-detect conversation language
      if (this.isUzbekQuery(text)) {
        this.lang = 'uz';
        localStorage.setItem('wm_lang', 'uz');
      } else if (/[а-яё]/i.test(text) && !this.isUzbekQuery(text)) {
        this.lang = 'ru';
        localStorage.setItem('wm_lang', 'ru');
      }

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

      // 1. SPECIFIC PRODUCT BY NAME (32 World Medicine Products)
      if (q.includes('полижен') || q.includes('polijen')) {
        matched = [getProd('polijen')].filter(Boolean);
        text_ru = "Полижен — наш флагманский швейцарский комплекс для энергии, молодости и тонуса. 🌿\n\nВ составе: натуральный экстракт женьшеня, маточное молочко, коэнзим Q10, 12 витаминов и 10 минералов. Он запускает клеточную энергию, улучшает упругость кожи, укрепляет волосяные луковицы и дает заряд бодрости без скачков давления.\n\n💊 **Как принимать**: по 1 капсуле утром во время или после завтрака. Курс — 1 месяц.\n\nХотите оформить заказ или подобрать курс под конкретную задачу?";
        text_uz = "Polijen — quvvat, yoshlik va tetiklik uchun Shveytsariya formulasi asosidagi mashhur majmuamiz. 🌿\n\nTarkibida: tabiiy jenshen ekstrakti, ona ari suti, koenzim Q10, 12 ta vitamin va 10 ta muhim mineral bor. U hujayralarni yoshartiradi, terini taranglashtiradi va soch to'kilishini to'xtatadi.\n\n💊 **Qanday ichiladi**: ertalab nonushta paytida 1 kapsuladan. Kurs — 1 oy.\n\nBuyurtma berishni xohlaysizmi yoki qo'shimcha savolingiz bormi?";
      }
      else if (q.includes('вамелан кидс') || q.includes('vamelan kids')) {
        matched = [getProd('vamelan-kids'), getProd('sanovit')].filter(Boolean);
        text_ru = "Вамелан Кидс — это натуральный растительный сироп для детей при беспокойном сне, гиперактивности, капризах и в период адаптации к школе и садику. 👶\n\nВ составе: экстракты пассифлоры, цветков липы, листьев мелиссы, ромашки, магний и витамин B6. Он мягко нормализует сон и эмоциональный фон ребенка, не вызывая заторможенности.\n\n🥄 **Как принимать**: детям от 1 до 3 лет — по 2.5 мл 1–2 раза в день; от 3 до 6 лет — по 5 мл; старше 6 лет — по 5–10 мл.\n\nСколько лет вашему ребенку?";
        text_uz = "Vamelan Kids — bolalardagi bezovta uyqu, asabiylik, injiqlik va maktab/bog'chaga moslashish davrida tavsiya etiladigan tabiiy fitosirop. 👶\n\nTarkibida: passiflora, jo'ka gullari, melissa, moychechak, magniy va B6 vitamini. Bolaning uyqusini va xotirjamligini muloyimlik bilan tiklaydi.\n\n🥄 **Qanday ichiladi**: 1-3 yosh — 2.5 ml dan 1-2 marta; 3-6 yosh — 5 ml; 6 yoshdan yuqori — 5-10 ml dan.\n\nFarzandingiz necha yoshda?";
      }
      else if (q.includes('вамелан') || q.includes('vamelan')) {
        matched = [getProd('vamelan'), getProd('vamelan-kids')].filter(Boolean);
        text_ru = "Вамелан — это 100% природный фитокомплекс антистресс для глубокого сна и душевного равновесия. 🌙\n\nВ составе: стандартизированные экстракты валерианы (125 мг), мяты перечной и мелиссы. Он мягко снимает эмоциональное напряжение, тревожность и спазм сосудов головы, гарантируя легкое засыпание и бодрое утро без привыкания.\n\n🕒 **Как принимать**: по 1–2 капсулы за 40–60 минут до сна или 1 капсулу днем при тревожности.\n\nВам сложно именно уснуть с вечера или сон прерывистый?";
        text_uz = "Vamelan — xotirjamlik va chuqur uyqu uchun 100% tabiiy fitomajmua. 🌙\n\nTarkibida: toza valeriana, qalampir yalpiz va melissa ekstraktlari. Asabiy zo'riqish va stressni bartaraf etib, tongda tetik uyg'onishni ta'minlaydi.\n\n🕒 **Qanday ichiladi**: yotishdan 40-60 daqiqa oldin 1-2 kapsula iliq suv bilan.\n\nUyquga ketish qiyinmi yoki tunda uyg'onib ketyapsizmi?";
      }
      else if (q.includes('драстоп') || q.includes('drastop')) {
        matched = [getProd('drastop-max'), getProd('artrocol-gel')].filter(Boolean);
        text_ru = "Драстоп Макс — премиальный хондро-нутрицевтик для глубокого восстановления суставов и позвоночника. 🦴\n\nВ составе: глюкозамин (1500 мг), хондроитин (1200 мг), MSM (500 мг), гиалуроновая кислота (50 мг) и экстракт босвеллии. Он восполняет суставную смазку, останавливает стирание хрящей и убирает хруст и скованность движений.\n\n🥤 **Как принимать**: 1 саше растворить в 200 мл теплой воды, принимать 1 раз в сутки во время еды. Курс — от 1 до 3 месяцев.\n\nБоль ощущается в коленях, спине или тазобедренных суставах?";
        text_uz = "Drastop Maks — bo'g'imlar va umurtqa pog'onasi tog'ay to'qimasini tiklovchi premium nutritsevtik. 🦴\n\nTarkibida: glyukozamin (1500 mg), xondroitin (1200 mg), MSM, gialuron kislotasi va bosvelliya ekstrakti. Bo'g'im suyuqligini to'ldiradi, qisirlash va yemirilishni to'xtatadi.\n\n🥤 **Qanday ichiladi**: 1 sasheni 200 ml iliq suvda eritib, ovqat vaqtida kuniga 1 marta ichiladi. Kurs — 1 oydan 3 oygacha.\n\nOg'riq ko'proq tizzadami yoki beldami?";
      }
      else if (q.includes('артрокол') || q.includes('artrocol')) {
        matched = [getProd('artrocol-gel'), getProd('drastop-max')].filter(Boolean);
        text_ru = "Артрокол гель — быстродействующий охлаждающий восстанавливающий гель для суставов и мышц. ❄️\n\nСодержит кетопрофен и натуральное лавандовое масло. Быстро проникает в очаг боли, снимает воспаление, отек и возвращает легкость движений после нагрузок или при артрозе.\n\n🧴 **Как применять**: полоску геля 3–5 см наносить массажными движениями на больное место 2–3 раза в день.\n\nБоль острая после физической работы/тренировки или тянущая постоянная?";
        text_uz = "Artrokol gel — bo'g'imlar va mushaklar uchun tezkor sovutuvchi va og'riqsizlantiruvchi gel. ❄️\n\nTarkibida ketoprofen va tabiiy lavanda moyi bor. Yallig'lanish, shish va og'riqni tezda ketkazadi.\n\n🧴 **Qanday surtiladi**: og'riyotgan sohaga 3-5 sm gelni kuniga 2-3 marta yengil massaj bilan surting.\n\nOg'riq zo'riqishdan keyin boshlandimi yoki doimiymi?";
      }
      else if (q.includes('лювитан') || q.includes('luvitan') || q.includes('глаз') || q.includes('зрени') || q.includes('сетчатк') || q.includes("ko'z") || q.includes('lyutein')) {
        matched = [getProd('luvitan-long'), getProd('reytoil')].filter(Boolean);
        text_ru = "Лювитан Лонг — специализированный комплекс для защиты зрения и здоровья сетчатки глаз. 👁️\n\nСодержит натуральный лютеин и зеаксантин премиум-очистки, витамины A, C, E и цинк. Защищает глаза от усталости, синего излучения экранов, снимает сухость, резь и предупреждает возрастное снижение резкости зрения.\n\n💊 **Как принимать**: по 1 капсуле в день во время еды. Курс — 1–2 месяца.\n\nУ вас устают глаза от работы за компьютером/телефоном или снизилась четкость зрения?";
        text_uz = "Lyuvitan Long — ko'rish qobiliyatini saqlash va to'r pardani himoya qilish uchun maxsus majmua. 👁️\n\nTarkibida: lyutein, zeaksantin, A, C, E vitaminlari va rux. Ko'z charchog'i, qizarish va kompyuter nuridan ishonchli himoya qiladi.\n\n💊 **Qanday ichiladi**: kuniga 1 kapsuladan ovqat vaqtida. Kurs — 1-2 oy.\n\nKo'proq kompyuterda ishlaysizmi yoki ko'rish xiralashganmi?";
      }
      else if (q.includes('колефер') || q.includes('kolefer') || q.includes('анеми') || q.includes('гемоглобин') || q.includes('ферритин') || q.includes('желез') || q.includes('kamqon') || q.includes('temir')) {
        matched = [getProd('kolefer'), getProd('polijen')].filter(Boolean);
        text_ru = "Колефер — современный биодоступный комплекс железа с фолиевой кислотой и витаминами. 🩸\n\nБлагодаря микрокапсулированной форме он не раздражает желудок, не вызывает тошноты и металлического привкуса. Быстро повышает гемоглобин и ферритин, устраняя слабость, головокружение и бледность.\n\n💊 **Как принимать**: по 1 капсуле в день во время или после еды.\n\nЗнаете свой текущий уровень гемоглобина или ферритина?";
        text_uz = "Kolefer — foliy kislotasi va vitaminlar bilan boyitilgan yuqori singuvchan temir majmuasi. 🩸\n\nOshqozonni bezovta qilmaydi, ko'ngil aynishi chaqirmaydi. Gemoglobin va ferritinni tezda ko'tarib, holsizlik va bosh aylanishini ketkazadi.\n\n💊 **Qanday ichiladi**: kuniga 1 kapsuladan ovqatdan keyin.\n\nGemoglobin darajangizni bilasizmi?";
      }
      else if (q.includes('роксет') || q.includes('венодиол') || q.includes('rokset') || q.includes('venodiol') || q.includes('варикоз') || q.includes('отекают ноги') || q.includes('тяжесть в ногах') || q.includes('varikoz') || q.includes('геморрой')) {
        matched = [getProd('rokset'), getProd('venodiol-ultra')].filter(Boolean);
        text_ru = "Для здоровья вен и снятия тяжести в ногах рекомендую дуэт: 🦵\n\n1. **РОКСЕТ** (таблетки) — микронизированный диосмин + гесперидин. Повышает тонус вен изнутри, убирает отеки, венозный застой и ночные судороги в икрах.\n2. **ВЕНОДИОЛ-УЛЬТРА гель** — фитогель с конским каштаном для мгновенного снятия чувства распирания и усталости в ногах.\n\nБеспокоит больше отечность к вечеру или сосудистая сетка?";
        text_uz = "Tomirlar mustahkamligi va oyoqdagi og'irlikni ketkazish uchun: 🦵\n\n1. **ROKSET** (ichishga) — diosmin va gesperidin majmuasi. Tomirlarni kuchaytiradi, shish va tunda oyoq tortishishini to'xtatadi.\n2. **VENODIOL-ULTRA gel** (surishga) — charchoq va qizishni tezda ketkazuvchi sovutuvchi fitogel.\n\nOyoqlaringiz ko'proq kechqurun shishadimi?";
      }
      else if (q.includes('беневрон') || q.includes('benevron') || q.includes('немеют') || q.includes('онемени') || q.includes('невралги') || q.includes('витамин b') || q.includes('uyushish')) {
        matched = [getProd('benevron-bf'), getProd('vamelan')].filter(Boolean);
        text_ru = "Беневрон БФ — усиленный комплекс витаминов группы B (B1, B6, B12) в высоких терапевтических дозах. 🧠\n\nВосстанавливает нервные волокна, снимает онемение пальцев рук и ног, невралгические прострелы, корешковые боли в спине и улучшает память и внимание.\n\n💊 **Как принимать**: по 1 таблетке 1–2 раза в день во время еды. Курс — 1 месяц.\n\nГде именно ощущается онемение или прострелы?";
        text_uz = "Benevron BF — yuqori dozadagi B guruhi vitaminlari (B1, B6, B12) majmuasi. 🧠\n\nAsab tolalari faoliyatini tiklaydi, barmoqlar uyushishi, beldagi sanchiq og'riqlar va asabiy toliqishni ketkazadi.\n\n💊 **Qanday ichiladi**: kuniga 1-2 marta 1 tabletkadan ovqat paytida. Kurs — 1 oy.\n\nUyushish ko'proq qo'llardami yoki oyoqlardami?";
      }
      else if (q.includes('рейтоил') || q.includes('reytoil') || q.includes('омега') || q.includes('холестерин') || q.includes('рыбий жир') || q.includes('сердц') || q.includes('сосуд') || q.includes('omega') || q.includes('xolesterin')) {
        matched = [getProd('reytoil'), getProd('polijen')].filter(Boolean);
        text_ru = "Рейтоил — премиальная Омега-3 из диких глубоководных рыб + витамин E. ❤️\n\nОчищает сосуды от избытка «плохого» холестерина, поддерживает эластичность артерий, нормализует липидный профиль и улучшает работу мозга и сердца.\n\n💊 **Как принимать**: по 1 капсуле 1–2 раза в день во время еды. Курс — 2–3 месяца.\n\nПринимаете для профилактики или есть повышенный холестерин?";
        text_uz = "Reytoil — yovvoyi dengiz baliqlaridan olingan toza Omega-3 va tabiiy E vitamini. ❤️\n\nQon tomirlarni xolesterindan tozalaydi, yurak va miya faoliyatini qo'llab-quvvatlaydi, qon bosimini me'yorlashtiradi.\n\n💊 **Qanday ichiladi**: kuniga 1-2 marta 1 kapsuladan ovqat vaqtida. Kurs — 2-3 oy.\n\nProfilaktikami yoki xolesterin balandmi?";
      }
      else if (q.includes('сарпал') || q.includes('sarpal') || q.includes('печен') || q.includes('желч') || q.includes('тяжесть в боку') || q.includes('горечь') || q.includes('jigar')) {
        matched = [getProd('sarpal'), getProd('lacidoforte')].filter(Boolean);
        text_ru = "Сарпал — натуральный растительный фитокомплекс для защиты и детокса печени. 🌿\n\nЗащищает клетки печени (гепатоциты), улучшает отток желчи, снимает тяжесть в правом подреберье, устраняет горечь во рту и очищает кожу лица от токсических высыпаний.\n\n💊 **Как принимать**: по 1–2 таблетки 2–3 раза в день за 20 минут до еды. Курс — 1–2 месяца.\n\nБеспокоит горечь во рту или дискомфорт после еды?";
        text_uz = "Sarpal — jigarni himoyalash va tozalash uchun tabiiy o'simlik majmuasi. 🌿\n\nJigar hujayralarini tiklaydi, o't haydalishini yaxshilaydi, o'ng qovurg'a ostidagi og'irlik va og'izdagi achchiq ta'mni ketkazadi.\n\n💊 **Qanday ichiladi**: ovqatdan 20 daqiqa oldin 1-2 tabletkadan kuniga 2-3 marta.\n\nOg'irlik ovqatdan keyin bo'ladimi?";
      }
      else if (q.includes('симальгель') || q.includes('сималгель') || q.includes('simalgel') || q.includes('изжог') || q.includes('горит в груди') || q.includes('кислотност') || q.includes("jig'ildon") || q.includes('гастрит')) {
        matched = [getProd('simalgel'), getProd('lacidoforte')].filter(Boolean);
        text_ru = "Симальгель — антацидная суспензия скорой помощи при изжоге и повышенной кислотности желудка. 🛡️\n\nБыстро нейтрализует избыток кислоты, обволакивает стенки желудка и пищевода защитным слоем и устраняет жжение, кислую отрыжку и боли уже через 3–5 минут.\n\n🥄 **Как принимать**: по 1 пакетику через 40–60 минут после еды и перед сном при изжоге.\n\nИзжога возникает после определенной пищи или постоянно?";
        text_uz = "Simalgel — jig'ildon qaynashi va me'da kislotaliligi oshganda tezkor yordam suspenziyasi. 🛡️\n\nOshqozon kislotasini zararsizlantiradi, qizilo'ngachni himoya qiladi va 3-5 daqiqada achishishni to'xtatadi.\n\n🥄 **Qanday ichiladi**: ovqatdan 40-60 daqiqa keyin 1 paketcha.\n\nJig'ildon ovqatdan keyin qaynaydimi?";
      }
      else if (q.includes('метигаст') || q.includes('metigast') || q.includes('вздути') || q.includes('газ') || q.includes('метеоризм') || q.includes('бурлит') || q.includes("dam bo'l") || q.includes("dam bol")) {
        matched = [getProd('metigast'), getProd('lacidoforte')].filter(Boolean);
        text_ru = "Метигаст — капсулы с симетиконом против вздутия живота и скопления газов. 🎈\n\nМягко схлопывает пузырьки газа в просвете кишечника, быстро снимая чувство распирания, урчание и спазмы, возвращая легкость и плоский живот.\n\n💊 **Как принимать**: по 1–2 капсулы 3–4 раза в день после еды при вздутии.\n\nВздутие беспокоит после определенных продуктов или постоянно?";
        text_uz = "Metigast — qorin dam bo'lishi va gaz to'planishiga qarshi simetikon kapsulalari. 🎈\n\nIchakdagi gaz pufakchalarini parchalab, qorin tarangligi va og'irlikni tezda yo'qotadi.\n\n💊 **Qanday ichiladi**: ovqatdan keyin 1-2 kapsuladan kuniga 3-4 marta.\n\nDam bo'lish ovqatdan keyinmi?";
      }
      else if (q.includes('панкраз') || q.includes('pankraza') || q.includes('фермент') || q.includes('тяжело после еды') || q.includes('переел') || q.includes('не переваривается') || q.includes('hazm')) {
        matched = [getProd('pankraza'), getProd('lacidoforte')].filter(Boolean);
        text_ru = "Панкраза — сбалансированный энзимный комплекс ферментов поджелудочной железы (липаза, амилаза, протеаза). 🍽️\n\nПомогает полностью переваривать белки, жиры и углеводы, избавляет от тяжести и чувства «камня» в желудке после плотной или жирной пищи.\n\n💊 **Как принимать**: по 1–2 капсулы во время каждого основного приема пищи, запивая водой.\n\nТяжесть возникает только после жирной еды или после любой пищи?";
        text_uz = "Pankraza — oshqozonosti bezi faoliyatini qo'llab-quvvatlovchi fermentlar majmuasi (lipaza, amilaza, proteaza). 🍽️\n\nOvqatni to'liq hazm qilishga yordam beradi, to'qlik va qorindagi og'irlik hissini ketkazadi.\n\n💊 **Qanday ichiladi**: asosiy ovqatlanish vaqtida 1-2 kapsuladan suv bilan.\n\nOg'irlik har doim bo'ladimi?";
      }
      else if (q.includes('лацидофорте') || q.includes('lacidoforte') || q.includes('антибиотик') || q.includes('микрофлор') || q.includes('дисбактериоз') || q.includes('пробиотик') || q.includes('расстройство кишечника') || q.includes('ichak')) {
        matched = [getProd('lacidoforte'), getProd('sanovit')].filter(Boolean);
        text_ru = "Лацидофорте — премиальный синбиотик (пробиотики + пребиотики) для восстановления микрофлоры кишечника. 🌿\n\nСодержит 4 млрд живых полезных лактобактерий (R0011, R0052) в защитных капсулах. Восстанавливает стул после антибиотиков, укрепляет 70% иммунитета в ЖКТ и очищает кожу лица от высыпаний.\n\n💊 **Как принимать**: по 1–2 капсулы в день во время еды (интервал от антибиотика — не менее 2 часов).\n\nПринимаете после курса антибиотиков или для нормализации стула?";
        text_uz = "Latsidoforte — ichak mikroflorasini tiklovchi premium sinbiotik (probiotik + prebiotik). 🌿\n\nTarkibida 4 milliard tirik foydali laktobakteriyalar bor. Antibiotiklardan keyin ichak faoliyatini va immunitetni tiklaydi.\n\n💊 **Qanday ichiladi**: ovqatlanish paytida kuniga 1-2 kapsuladan.\n\nAntibiotikdan keyin ichyapsizmi?";
      }
      else if (q.includes('эмфетал') || q.includes('emfetal') || q.includes('йодофол') || q.includes('yodofol') || q.includes('беременн') || q.includes('кормящ') || q.includes('планировани') || q.includes('homilador')) {
        matched = [getProd('emfetal'), getProd('iodofol')].filter(Boolean);
        text_ru = "Для планирования беременности, будущих и кормящих мам: 🤰\n\n1. **ЭМФЕТАЛ** — полноценный витаминно-минеральный комплекс для всех триместров и лактации (фолаты, йод, железо, кальций, витамины).\n2. **ЙОДОФОЛ** — точный бьюти-дуэт фолиевой кислоты (400 мкг) и йода (200 мкг) для правильного развития малыша и поддержки щитовидной железы мамы.\n\n💊 Принимать: по 1 таблетке утром во время еды.\n\nКакой у вас срок или вы на этапе планирования?";
        text_uz = "Homiladorlikni rejalashtirish, homiladorlik davri va emizikli onalar uchun: 🤰\n\n1. **EMFETAL** — barcha trimestrlar va emizish davri uchun maxsus to'liq vitaminlar majmuasi.\n2. **YODOFOL** — foliy kislotasi (400 mkg) va yod (200 mkg) dueti.\n\n💊 Qanday ichiladi: ertalab nonushta vaqtida 1 tabletkadan.\n\nHomiladorlikning qaysi davridasiz?";
      }
      else if (q.includes('метакартин') || q.includes('metacartin') || q.includes('карнитин') || q.includes('похуде') || q.includes('жиросжигани') || q.includes('фитнес') || q.includes('ozish')) {
        matched = [getProd('metacartin-oral'), getProd('polijen')].filter(Boolean);
        text_ru = "Метакартин (L-Карнитин) — чистый клеточный энергетик и катализатор сжигания жира. ⚡\n\nТранспортирует жировые кислоты в митохондрии, превращая их в энергию для мышц. Ускоряет метаболизм, повышает выносливость при тренировках и защищает сердце без стимуляторов и нервозности.\n\n🥤 **Как принимать**: 1 флакон за 30 минут до физической активности или утром.\n\nСочетаете с тренировками или для общего ускорения обмена веществ?";
        text_uz = "Metakartin (L-Karnitin) — yog'larni energiyaga aylantiruvchi va metabolizmni tezlashtiruvchi vosita. ⚡\n\nJismoniy mashqlarda yog' erishini tezlashtiradi, chidamlilikni oshiradi va yurakni qo'llab-quvvatlaydi.\n\n🥤 **Qanday ichiladi**: mashg'ulotdan 30 daqiqa oldin 1 flakon.\n\nSport bilan shug'ullanasizmi?";
      }
      else if (q.includes('с-мун') || q.includes('c-mun') || q.includes('витамин с') || q.includes('аскорбинк') || q.includes('цинк') || q.includes('vitamin c')) {
        matched = [getProd('c-mun-plus'), getProd('koledan-capsules')].filter(Boolean);
        text_ru = "С-Мун Плюс — шипучие таблетки с ударной дозой Витамина C 1000 мг + Цинк + Экстракт черной бузины. 🍊\n\nМощный иммунный щит при сезонных вирусах и первых признаках недомогания. Сокращает длительность простуды и дает антиоксидантный заряд бодрости.\n\n🥤 **Как принимать**: 1 шипучую таблетку растворить в стакане теплой воды 1 раз в день после еды.\n\nУже чувствуете симптомы простуды или принимаете для профилактики?";
        text_uz = "S-Mun Plyus — Vitamin C 1000 mg + Rux + Qora marjon (buzina) ekstrakti eruvchi tabletkalari. 🍊\n\nShamollashning dastlabki belgilarida viruslar ko'payishini to'xtatadi va immunitetni kuchaytiradi.\n\n🥤 **Qanday ichiladi**: 1 tabletkani 1 stakan iliq suvda eritib, ovqatdan keyin ichiladi.\n\nShamollash boshlandimi yoki profilaktikami?";
      }
      else if (q.includes('гриппофф') || q.includes('грипофф') || q.includes('gripoff') || q.includes('пиретикол') || q.includes('температур') || q.includes('жар') || q.includes('простуд') || q.includes('ломит') || q.includes('озноб') || q.includes('isitma')) {
        matched = [getProd('gripoff'), getProd('c-mun-plus')].filter(Boolean);
        text_ru = "При простуде, температуре и ломоте в теле: ☕\n\n• **ГРИПОФФ** — горячий витаминный напиток со вкусом лимона. Быстро сбивает жар, снимает заложенность носа, головную боль и ломоту в мышцах.\n• Для деток при температуре — сироп **ПИРЕТИКОЛ** с точной дозировкой.\n\n🍵 Растворите 1 пакетик Грипофф в кружке горячей воды и выпейте теплым.\n\nКакая сейчас температура и для кого подбираем?";
        text_uz = "Isitma, qaltirash va gripp belgilarida: ☕\n\n• **GRIPOFF** — limon ta'mli issiq ichimlik. Isitmani tushiradi, burun bitishi va bosh og'rig'ini yo'qotadi.\n• Bolalar uchun — **PIRETIKOL** shirin siropi.\n\n🍵 1 paketcha Gripoffni issiq suvda eritib ichiladi.\n\nHarorat qancha va kim uchun tanlayapsiz?";
      }
      else if (q.includes('спентен') || q.includes('дебара') || q.includes('spenten') || q.includes('debara') || q.includes('пантенол') || q.includes('ожог') || q.includes('трещин') || q.includes('сухость кожи') || q.includes('зуд') || q.includes('kuyish')) {
        matched = [getProd('spenten'), getProd('debara')].filter(Boolean);
        text_ru = "Для восстановления и защиты поврежденной кожи: 🧴\n\n1. **СПЕНТЕН** (Декспантенол 5%) — ускоряет заживление трещин, ожогов, обветренной и сухой кожи.\n2. **ДЕБАРА** — крем для мгновенного снятия зуда, раздражения, покраснения и аллергических высыпаний.\n\n🧴 Наносить тонким слоем на проблемные участки 2–3 раза в день.\n\nБеспокоит сильная сухость и трещины или зуд и покраснение?";
        text_uz = "Zararlangan va quruq terini tiklash uchun: 🧴\n\n1. **SPENTEN** (Dekspantenol 5%) — yoriqlar, kuyish va quruq terining tez bitishini ta'minlaydi.\n2. **DEBARA** — qichishish, qizarish va allergik toshmalarni tinchlantiradi.\n\n🧴 Kuniga 2-3 marta yupqa qilib surting.\n\nTerida ko'proq quruqlikmi yoki qichishishmi?";
      }
      else if (q.includes('мускомед') || q.includes('клодифен') || q.includes('muscomed') || q.includes('clodifen') || q.includes('спазм') || q.includes('защемил') || q.includes('шея') || q.includes('шею') || q.includes('миозит') || q.includes('mushak siqilishi')) {
        matched = [getProd('muscomed-cream'), getProd('clodifen-gel')].filter(Boolean);
        text_ru = "При мышечных спазмах, защемлении шеи или поясницы: 💆‍♂️\n\n1. **МУСКОМЕД крем** — специальный миорелаксирующий крем, расслабляет спазмированные мышечные волокна и триггерные точки.\n2. **КЛОДИФЕН гель** — мощное противовоспалительное и обезболивающее действие при растяжениях и прострелах.\n\n🧴 Наносите мягкими массирующими движениями 2–3 раза в день.\n\nЗащемило шею, лопатку или поясницу?";
        text_uz = "Mushak tortishishi, bo'yin yoki bel qisilishida: 💆‍♂️\n\n1. **MUSKOMED krem** — mushaklardagi qisilgan nuqtalarni bo'shashtiruvchi miorelaksant krem.\n2. **KLODIFEN gel** — kuchli og'riqsizlantiruvchi va yallig'lanishga qarshi gel.\n\n🧴 Kuniga 2-3 marta yengil massaj bilan surting.\n\nQayerda siqilish bo'ldi — bo'yindami yoki beldami?";
      }
      else if (q.includes('протекта') || q.includes('protecta')) {
        matched = [getProd('protecta'), getProd('protecta-advance')].filter(Boolean);
        text_ru = "Протекта — инновационный шипучий хондро-комплекс с кальцием и витамином D3. 🦴\n\nОдновременно восстанавливает хрящевую ткань и укрепляет минеральную плотность костей, защищая суставы от стирания при активных физических нагрузках.\n\n🥤 **Как принимать**: 1 шипучую таблетку растворить в стакане воды 1 раз в день.\n\nБеспокоят суставы или требуется укрепление костей?";
        text_uz = "Protekta — kalsiy va D3 vitamini bilan boyitilgan eruvchi xondromajmua. 🦴\n\nBir vaqtning o'zida tog'ay to'qimasini tiklaydi va suyaklar mustahkamligini oshiradi.\n\n🥤 **Qanday ichiladi**: 1 ta eriydigan tabletkani 1 stakan suvda eritib ichiladi.\n\nBo'g'imlar bezovta qilyaptimi yoki suyaklarmi?";
      }
      else if (q.includes('коледан') || q.includes('koledan') || q.includes('витамин d') || q.includes('d3') || q.includes('d-3') || q.includes('d vitamin')) {
        matched = [getProd('koledan-drops'), getProd('koledan-capsules')].filter(Boolean);
        text_ru = "Коледан — высокоочищенный масляный витамин D3 европейского качества. ☀️\n\n• **Коледан капли** — точная дозировка для деток и взрослых.\n• **Коледан капсулы 5000 МЕ** — терапевтическая дозировка для быстрого восполнения глубокого дефицита, укрепления костей, зубов и иммунитета.\n\n💊 Принимать утром во время завтрака с полезными жирами.\n\nПодбираете для профилактики или по результатам анализа?";
        text_uz = "Koledan — Yevropa sifatidagi toza moyli D3 vitamini. ☀️\n\n• **Koledan tomchilari** — bolalar va kattalar uchun oson dozalash.\n• **Koledan kapsula 5000 XB** — D vitamini tanqisligini tezda to'ldirish uchun.\n\n💊 Ertalab yog'liroq nonushta bilan ichiladi.\n\nProfilaktika uchunmi yoki tahlil natijasiga ko'rami?";
      }
      else if (q.includes('д-кальцин') || q.includes('кальцин') || q.includes('d-calcin') || q.includes('кальций') || q.includes('kalsiy')) {
        matched = [getProd('d-calcin'), getProd('koledan-drops')].filter(Boolean);
        text_ru = "Д-Кальцин — легкоусвояемый комплекс кальция с витамином D3 в виде приятных гранул. 🦷\n\nУкрепляет зубную эмаль, предотвращает кариес, делает ногти прочными, а волосы густыми, формирует правильную осанку и крепкий скелет.\n\n🥄 Гранулы растворяют в воде, молоке или соке во время еды.\n\nДля ребенка или для взрослого?";
        text_uz = "D-Kalsin — kalsiy va D3 vitaminining oson eruvchi granulalar majmuasi. 🦷\n\nTish emalini mustahkamlaydi, tirnoqlarni qatlamlanishdan saqlaydi, suyaklarni baquvvat qiladi.\n\n🥄 Granulalar suv, sut yoki sharbatda eritib ichiladi.\n\nBolalar uchunmi yoki kattalargami?";
      }
      else if (q.includes('сановит') || q.includes('sanovit') || q.includes('мультивитамин')) {
        matched = [getProd('sanovit'), getProd('polijen')].filter(Boolean);
        text_ru = "Сановит — универсальный витаминно-минеральный сироп со вкусом апельсина для всей семьи. 🍊\n\nСодержит комплекс жизненно важных витаминов для укрепления иммунитета, хорошего аппетита, энергии и концентрации внимания в учебе и работе.\n\n🥄 Принимать по 5–10 мл 1 раз в день во время или после еды.\n\nДля ребенка или для взрослых членов семьи?";
        text_uz = "Sanovit — yoqimli apelsin ta'mli butun oila uchun polivitamin siropi. 🍊\n\nImmunitetni mustahkamlaydi, ishtaha va aqliy faollikni oshiradi.\n\n🥄 Kuniga 1 marta 5-10 ml dan ovqatdan keyin ichiladi.\n\nFarzandingizgami yoki kattalargami?";
      }

      // 2. BROAD SYMPTOM AND TARGET MATCHER
      else if (q.includes('устал') || q.includes('нет сил') || q.includes('слабост') || q.includes('апати') || q.includes('бодрост') || q.includes('энерги') || q.includes('holsiz') || q.includes('charchoq')) {
        matched = [getProd('polijen'), getProd('metacartin-oral')].filter(Boolean);
        text_ru = "При хронической усталости и нехватке энергии организму нужны адаптогены и антиоксиданты.\n\nВам идеально подойдет **ПОЛИЖЕН** (женьшень, маточное молочко, Q10 и 25 нутриентов) — он запускает выработку энергии в клетках без скачков давления.\n\n💊 Всего 1 капсула утром за завтраком. Через 3–4 дня почувствуете легкость и бодрость.\n\nУсталость больше физическая или от умственного переутомления?";
        text_uz = "Doimiy charchoq va holsizlikda organizmga tabiiy adaptogenlar va vitaminlar zarur.\n\nSizga **POLIJEN** majmuasi a'lo darajada yordam beradi (jenshen, ona ari suti, Q10 va 25 ta mineral). Qon bosimini oshirmasdan tetiklik bag'ishlaydi.\n\n💊 Ertalab nonushta paytida 1 kapsula. 3-4 kunda quvvat to'lishini his qilasiz.\n\nCharchoq jismoniy zo'riqishdanmi yoki aqliy toliqishdan?";
      }
      else if (q.includes('сустав') || q.includes('колен') || q.includes('спин') || q.includes('поясниц') || q.includes('хруст') || q.includes("bo'g'im") || q.includes('tizza') || q.includes('bel') || q.includes("og'riq")) {
        matched = [getProd('drastop-max'), getProd('artrocol-gel')].filter(Boolean);
        text_ru = "Боль и хруст в суставах или спине говорят о потере влаги и упругости хряща.\n\nРекомендую проверенную схему:\n• **Драстоп Макс** (внутрь) — питает и восстанавливает хрящ (глюкозамин + хондроитин + коллаген + гиалуронка).\n• **Артрокол гель** (снаружи) — быстро снимает воспаление и скованность.\n\nБоль беспокоит при ходьбе или в покое?";
        text_uz = "Bo'g'imlardagi og'riq va qisirlash tog'ay to'qimasining elastikligi yo'qolishidan dalolat beradi.\n\nSinovdan o'tgan sxema:\n• **Drastop Maks** (ichishga) — tog'ayni ichkaridan tiklaydi.\n• **Artrokol gel** (surishga) — og'riq va shishni tezda ketkazadi.\n\nOg'riq yurgandami yoki tinch turgandami?";
      }
      else if (q.includes('сон') || q.includes('уснуть') || q.includes('бессонниц') || q.includes('стресс') || q.includes('нерв') || q.includes('тревог') || q.includes('uyqu') || q.includes('asab')) {
        matched = [getProd('vamelan'), getProd('benevron-bf')].filter(Boolean);
        text_ru = "При бессоннице и стрессе лучше всего работает натуральный фитокомплекс **ВАМЕЛАН** (валериана, мята, мелисса).\n\nУспокаивает нервную систему, снимает спазм сосудов и дарит глубокий сон без утренней тяжести.\n\n🌙 Принимайте 1–2 капсулы за 45 минут до сна.\n\nТрудно уснуть вечером или часто просыпаетесь среди ночи?";
        text_uz = "Uyqusizlik va asabiylikda 100% tabiiy **VAMELAN** fitomajmuasi eng yaxshi tanlovdir.\n\nAsab tizimini tinchlantiradi, ertalab bosh og'rig'isiz tetik uyg'onishni ta'minlaydi.\n\n🌙 Yotishdan 45 daqiqa oldin 1-2 kapsula ichiladi.\n\nUyquga ketish qiyinmi yoki tunda uyg'onasizmi?";
      }
      else if (q.includes('волос') || q.includes('кожа') || q.includes('ногти') || q.includes('выпаден') || q.includes('soch') || q.includes('teri') || q.includes('tirnoq')) {
        matched = [getProd('polijen'), getProd('d-calcin')].filter(Boolean);
        text_ru = "Красота волос, кожи и ногтей зависит от питания фолликулов и синтеза коллагена.\n\nИдеальный дуэт:\n• **ПОЛИЖЕН** — коэнзим Q10, маточное молочко и цинк останавливают выпадение волос и возвращают лицу свежесть.\n• **Д-КАЛЬЦИН** — укрепляет ногти и эмаль зубов.\n\nБеспокоит больше выпадение волос или сухость кожи?";
        text_uz = "Soch, teri va tirnoqlar go'zalligi ichki oziqlanishga bog'liq.\n\nA'lo juftlik:\n• **POLIJEN** — kollagen sintezini kuchaytiradi va soch to'kilishini to'xtatadi.\n• **D-KALSIN** — tirnoqlarni mustahkamlaydi.\n\nKo'proq soch to'kilishimi yoki teri quruqligimi?";
      }
      else if (q.includes('дет') || q.includes('ребенок') || q.includes('малыш') || q.includes('аппетит') || q.includes('bola') || q.includes('farzand')) {
        matched = [getProd('sanovit'), getProd('vamelan-kids')].filter(Boolean);
        text_ru = "Для деток у нас есть вкусные сертифицированные детские формы:\n\n• **Сановит** — сироп для аппетита, памяти и крепкого иммунитета.\n• **Вамелан Кидс** — фитосироп при капризах, гиперактивности и беспокойном сне.\n• **Д-Кальцин** — гранулы с кальцием для зубок и костей.\n\nСколько лет ребенку?";
        text_uz = "Bolalar uchun shirin va xavfsiz maxsus vositalarimiz bor:\n\n• **Sanovit** — ishtaha, xotira va immunitet siropi.\n• **Vamelan Kids** — tinch uyqu va xotirjamlik fitosiropi.\n• **D-Kalsin** — tishlar va suyaklar uchun kalsiy granulalari.\n\nFarzandingiz necha yoshda?";
      }
      else if (q.includes('доставк') || q.includes('заказ') || q.includes('купит') || q.includes('цена') || q.includes('стои') || q.includes('yetkaz') || q.includes('buyurtma') || q.includes('narx')) {
        matched = [];
        text_ru = "Все препараты в наличии, 100% оригинал World Medicine. 📦\n\n• **Доставка по Ташкенту**: курьером за 2–4 часа прямо до двери.\n• **По Узбекистану**: экспресс-доставка через Uzum за 1 день.\n• **Оплата**: при получении наличными или картой (Humo, Uzcard, Click, Payme).\n\nВы можете нажать кнопку «В корзину» или оставить номер телефона для оформления!";
        text_uz = "Barcha preparatlar mavjud, World Medicine original mahsulotlari. 📦\n\n• **Toshkent bo'ylab**: kuryer orqali 2-4 soatda yetkaziladi.\n• **O'zbekiston bo'ylab**: Uzum orqali 1 kunda yetkazib berish.\n• **To'lov**: qabul qilganda naqd yoki karta orqali (Humo, Uzcard, Click, Payme).\n\n«Savat» tugmasi orqali yoki telefon raqamingizni qoldirib buyurtma berishingiz mumkin!";
      }
      else if (q.match(/^(ассалому|алейкум|салом|assalomu|salom|hayrli|привет|здравствуй|салам|добрый|privet|hi|hello)/) || q.includes('ассалому алейкум') || q.includes('assalomu alaykum')) {
        text_ru = "Здравствуйте! Рада общению с вами. 🌿\n\nНапишите, что именно вас беспокоит или какую задачу хотите решить (например: суставы, упадок сил, бессонница, зрение, вены, пищеварение, иммунитет или красота кожи и волос). Подберу нужный комплекс и подскажу, как правильно принимать!";
        text_uz = "Assalomu alaykum! Siz bilan muloqotdan mamnunman. 🌿\n\nSizni nima bezovta qilayotganini yozing (masalan: bo'g'imlar, holsizlik, uyqusizlik, ko'rish, tomirlar, oshqozon, immunitet yoki soch-teri parvarishi). Sizga mos majmuani tanlab beraman!";
        matched = [];
      }
      else if (q.includes('спасибо') || q.includes('благодар') || q.includes('рахмат') || q.includes('rahmat') || q.includes('понятно') || q.includes('хорошо') || q.includes('tushunarli')) {
        text_ru = "Всегда рада помочь! 😊\n\nГлавное — регулярность приема и стакан чистой воды. Если решите оформить заказ — пишите в любое время или добавляйте в корзину. Крепкого здоровья!";
        text_uz = "Doimo yordam berishga tayyorman! 😊\n\nAsosiysi — qabul qilish tartibiga rioya qiling. Buyurtma berishni istasangiz — bemalol yozing. Salomat bo'ling!";
        matched = [];
      }
      else {
        // Dynamic search across all 32 products by name, description, indications, and pharm group
        const found = this.products.find(p => 
          p.name_ru.toLowerCase().includes(q) || 
          p.description_ru.toLowerCase().includes(q) || 
          p.indications_ru.toLowerCase().includes(q) ||
          p.pharm_group_ru.toLowerCase().includes(q)
        );

        if (found) {
          matched = [found];
          text_ru = "По вашему запросу отлично подходит **" + found.name_ru + "** (" + found.pharm_group_ru + ").\n\n💡 **В чем его польза**: " + found.description_ru.slice(0, 180) + "...\n\n🕒 **Как принимать**: " + found.usage_ru + "\n\nХотите уточнить подробнее о составе или оформить заказ?";
          text_uz = "So'rovingiz bo'yicha **" + found.name_uz + "** (" + found.pharm_group_uz + ") juda mos keladi.\n\n💡 **Foydasi**: " + found.description_uz.slice(0, 180) + "...\n\n🕒 **Qanday ichiladi**: " + found.usage_uz + "\n\nTarkibi haqida batafsil bilmoqchimisiz yoki buyurtma berasizmi?";
        } else {
          matched = [];
          text_ru = "Поняла вас. Чтобы подобрать самый точный и эффективный комплекс, уточните, пожалуйста: какую главную задачу мы хотим решить — вернуть энергию, укрепить суставы, наладить сон, поддержать иммунитет, вены или пищеварение?\n\nЯ сразу распишу правильный состав и схему приема!";
          text_uz = "Sizni tushundim. Eng to'g'ri majmuani tanlash uchun ayting-chi: qaysi asosiy natijaga erishmoqchimiz — quvvatni oshirish, bo'g'imlar, uyqu, immunitet, tomirlar yoki hazm qilishmi?\n\nDarhol kerakli tarkib va qabul qilish tartibini yozib beraman!";
        }
      }

      if (phone) {
        text_ru += "\n\n📞 Номер **" + phone + "** записан! Наш специалист свяжется с вами в течение 10–15 минут для консультации и подтверждения заказа.";
        text_uz += "\n\n📞 **" + phone + "** raqamingiz qabul qilindi! Mutaxassisimiz 10-15 daqiqa ichida qo'ng'iroq qilib, buyurtmani tasdiqlaydi.";
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