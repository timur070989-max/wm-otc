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
        text_ru: "Здравствуйте! Рад приветствовать вас. Я ваш персональный консультант по биологически активным добавкам (БАД) и витаминным комплексам World Medicine.\n\nВсе наши продукты — это сертифицированные БАД европейского качества для естественной поддержки здоровья, бодрости и долголетия.\n\nРасскажите своими словами, что вас беспокоит или какую задачу мы хотим решить — например, вернуть бодрость и тонус, поддержать суставы, наладить сон или укрепить иммунитет? Вы также можете нажать на микрофон и просто сказать свой вопрос голосом! 🎙️",
        text_uz: "Assalomu alaykum! Sizni qutlashdan xursandman. Men sizning biologik faol qo\'shimchalar (BFQ) va vitaminlar bo\'yicha World Medicine shaxsiy maslahatchiman.\n\nBarcha mahsulotlarimiz — salomatlik, quvvat va go\'zallikni qo\'llab-quvvatlash uchun Yevropa sifatidagi sertifikatlangan tabiiy BFQ vositalaridir.\n\nSizni nima bezovta qilayotganini yoki qanday maqsad qo'yganingizni o'z so'zlaringiz bilan ayting — masalan, quvvat va tetiklikni tiklash, bo'g'imlarni davolash, uyquni yaxshilash yoki immunitetni mustahkamlash? Shuningdek, mikrofondan foydalanib savolingizni ovozli tarzda aytishingiz mumkin! 🎙️",
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
        
        this.$nextTick(() => {
          this.scrollChatToBottom();
          this.refreshIcons();
          if (wasSpoken && this.isVoiceEnabled) {
            this.speakAiMessage(newAiMsg);
          }
        });
      }, 750);
    },

    generateHumanAiResponse(query, phone) {
      const q = query.toLowerCase();
      let matched = [];
      let text_ru = '';
      let text_uz = '';

      // 1. GREETINGS & INTRODUCTIONS (Приветствия и знакомство)
      if (q.match(/^(привет|здравствуй|салам|добрый день|добрый вечер|доброе утро|салом|assalomu|salom|hayrli|privet)/)) {
        text_ru = "Здравствуйте! Очень рад нашему общению. Я консультант по БАД и витаминным комплексам World Medicine.\n\nМоя задача — внимательно выслушать вас, помочь разобраться в причинах недомогания и подобрать проверенные европейские комплексы для вашего здоровья.\n\nПодскажите, что именно вас беспокоит или для кого мы подбираем препарат — для вас, детей или родителей?";
        text_uz = "Assalomu alaykum! Siz bilan muloqot qilishdan bag'oyat xursandman. Men World Medicine kompaniyasining BFQ va vitaminlar bo'yicha maslahatchisiman.\n\nVazifam — sizni tinglash, bezovtalik sabablarini tushunish va salomatligingiz uchun sertifikatlangan Yevropa sifatidagi eng yaxshi majmualarni tanlashga yordam berishdir.\n\nAyting-chi, sizni aynan nima bezovta qilyapti yoki preparatni kimga tanlayapmiz — o'zingizga, farzandlaringizga yoki ota-onangizgami?";
        matched = [this.products.find(p => p.id === 'polijen'), this.products.find(p => p.id === 'sanovit')].filter(Boolean);
      }
      
      // 2. WHO ARE YOU / ARE YOU A ROBOT? (Кто ты, живой ли человек?)
      else if (q.includes('кто ты') || q.includes('ты робот') || q.includes('ты бот') || q.includes('kim siz') || q.includes('siz kimsiz') || q.includes('robot')) {
        text_ru = "Я цифровой консультант по биологически активным добавкам (БАД) World Medicine! Все наши продукты являются БАД и созданы для бережного восполнения дефицитов, укрепления организма и естественной поддержки здоровья.\n\nЯ не просто выдаю список лекарств, а объясняю, как работает организм, как правильно принимать капсулы до или после еды, и какие компоненты помогут именно вам.\n\nСмело задавайте любой вопрос своими словами — например: «почему болит спина» или «что попить при упадке сил?». Я рядом и готов помочь!";
        text_uz = "Men World Medicine kompaniyasining biologik faol qo\'shimchalar (BFQ) bo\'yicha raqamli maslahatchisiman! Barcha vositalarimiz BFQ hisoblanadi va organizmni tabiiy qo\'llab-quvvatlash, vitaminlar o\'rnini to\'ldirish uchun mo\'ljallangan.\n\nMen shunchaki dorilar ro'yxatini bermayman, balki organizm qanday ishlashini, preparatlarni qachon va qanday ichish kerakligini tushuntirib beraman.\n\nIstalgan savolingizni o'z so'zlaringiz bilan bering — masalan: «bel og'rig'iga nima yordam beradi» yoki «charchoqni qanday ketkazish mumkin?». Yordam berishga tayyorman!";
        matched = [this.products.find(p => p.id === 'polijen')].filter(Boolean);
      }

      // 3. GRATITUDE & POLITE COURTESY (Спасибо, благодарность)
      else if (q.includes('спасибо') || q.includes('благодарю') || q.includes('рахмат') || q.includes('rahmat') || q.includes('tashakkur') || q.includes('отлично') || q.includes('понятно') || q.includes('tushunarli')) {
        text_ru = "На здоровье! Мне очень приятно быть полезным для вас. 🌿\n\nГлавное — соблюдать регулярность приема и пить достаточное количество чистой воды. Если возникнут любые вопросы по дозировке, самочувствию или заказу — пишите в любое время.\n\nЖелаю вам и вашим близким крепкого здоровья и отличного настроения!";
        text_uz = "Salomat bo'ling! Sizga yordam bera olganimdan chin dildan xursandman. 🌿\n\nAsosiysi — qabul qilish tartibiga rioya qilish va yetarli miqdorda toza suv ichishdir. Agar dozirovka, nojo'ya ta'sir yoki buyurtma bo'yicha savollaringiz tug'ilsa — istalgan payt yozing.\n\nSizga va yaqinlaringizga mustahkam sog'lik va a'lo kayfiyat tilayman!";
        matched = [];
      }

      // 4. ENERGY, CHRONIC FATIGUE & VITALITY (Усталость, упадок сил, энергия, слабость)
      else if (q.includes('устал') || q.includes('сил нет') || q.includes('нет сил') || q.includes('бодрост') || q.includes('энерги') || q.includes('слабост') || q.includes('апати') || q.includes('holsiz') || q.includes('charchoq') || q.includes('quvvat') || q.includes('energiya') || q.includes('tetik')) {
        matched = [this.products.find(p => p.id === 'polijen'), this.products.find(p => p.id === 'sanovit')].filter(Boolean);
        text_ru = "Прекрасно понимаю ваше состояние. Когда нет сил и преследует постоянная утомляемость, организму обычно не хватает коэнзимов, антиоксидантов и адаптогенов для клеточного дыхания.\n\n💡 **Моя рекомендация**:\nЛучшее решение в линейке World Medicine — швейцарский комплекс **ПОЛИЖЕН**.\n• В нем содержится натуральный женьшень, маточное молочко, коэнзим Q10 и 25 биоактивных нутриентов.\n• Он мягко восстанавливает тонус без скачков давления и нервного возбуждения.\n\n🕒 **Как принимать**: всего 1 капсула в день утром во время завтрака. Курс — 1 месяц, и уже через 4-5 дней вы почувствуете прилив сил и ясность в голове.\n\nПодскажите, есть ли у вас сопутствующая бессонница или стресс на работе?";
        text_uz = "Holatingizni juda yaxshi tushunaman. Doimiy holsizlik va charchoq paytida organizmga hujayra energiyasi uchun koenzimlar, antioksidantlar va adaptogenlar yetishmaydi.\n\n💡 **Mening tavsiyam**:\nWorld Medicine qatoridagi eng samarali yechim — Shveytsariya formulasi bo'lgan **POLIJEN**.\n• Tarkibida tabiiy jenshen, ona ari suti, koenzim Q10 va 25 ta bioaktiv moddalar mavjud.\n• U qon bosimini oshirmasdan tetiklik va aqliy tiniqlikni tiklaydi.\n\n🕒 **Qanday ichiladi**: kuniga atigi 1 kapsuladan ertalab nonushta paytida. 1 oylik kursdan so'ng 4-5 kun ichidayoq kuch-quvvat to'lishini his qilasiz.\n\nAyting-chi, sizda uyqusizlik yoki asabiylik ham bormi?";
      }

      // 5. JOINTS, BACK PAIN & CARTILAGE (Суставы, спина, колени, хруст, мышцы)
      else if (q.includes('сустав') || q.includes('колен') || q.includes('спин') || q.includes('поясниц') || q.includes('хруст') || q.includes('артрокол') || q.includes('драстоп') || q.includes('болит нога') || q.includes("bo'g'im") || q.includes("bo'g'im") || q.includes('tizza') || q.includes('bel') || q.includes("og'riq") || q.includes("og'riq") || q.includes('mushak') || q.includes('artroz')) {
        matched = [this.products.find(p => p.id === 'drastop-max'), this.products.find(p => p.id === 'artrocol-gel')].filter(Boolean);
        text_ru = "Боль и хруст в суставах или спине — это прямой сигнал о том, что хрящевой ткани не хватает влаги, коллагена и естественной смазки.\n\n💡 **Комплексный подход для быстрого и долгосрочного результата**:\n1. **Снаружи**: **АРТРОКОЛ гель** — наносите на больное место 2 раза в день. Он быстро снимает локальное воспаление, отек и возвращает легкость движений.\n2. **Изнутри**: **ДРАСТОП МАКС** — это глубокое восстановление суставов. Содержит глюкозамин, хондроитин, био-коллаген и гиалуроновую кислоту, которые восстанавливают сам хрящ.\n\n🚶‍♂️ **Рекомендация по приему БАД**: старайтесь не делать резких нагрузок и пейте не менее 1.5-2 литров воды в день, так как хрящ питается за счет суставной жидкости.\n\nБоль усиливается при ходьбе или беспокоит даже в покое?";
        text_uz = "Bo'g'imlar yoki beldagi og'riq va qisirlash — tog'ay to'qimasiga namlik, kollagen va bo'g'im suyuqligi yetishmayotganligidan dalolat beradi.\n\n💡 **Tezkor va mustahkam natija uchun kompleks yechim**:\n1. **Tashqi tomondan**: **ARTROKOL gel** — og'riyotgan joyga kuniga 2 marta surting. U yallig'lanish va og'riqni tezda ketkazib, harakatni yengillashtiradi.\n2. **Ichki tomondan**: **DRASTOP MAKS** — bo'g'imlarni chuqur tiklovchi majmua. Glyukozamin, xondroitin, bio-kollagen va gialuron kislotasi yordamida tog'ayni qayta tiklaydi.\n\n🚶‍♂️ **BFQ qabul qilish bo'yicha maslahat**: og'ir jismoniy zo'riqishlardan saqlaning va kuniga kamida 1.5-2 litr toza suv iching.\n\nOg'riq yurganda kuchayadimi yoki tinch turganda ham bezovta qiladimi?";
      }

      // 6. STRESS, ANXIETY & SLEEP DISORDERS (Стресс, бессонница, тревога, нервы, сон)
      else if (q.includes('сон') || q.includes('уснуть') || q.includes('бессонниц') || q.includes('стресс') || q.includes('нерв') || q.includes('тревог') || q.includes('вамелан') || q.includes('паник') || q.includes('uyqu') || q.includes('asab') || q.includes('siqilish') || q.includes('tinchlan') || q.includes('vamelan')) {
        matched = [this.products.find(p => p.id === 'vamelan'), this.products.find(p => p.id === 'vamelan-kids')].filter(Boolean);
        text_ru = "Очень сочувствую вам. Хронический стресс и бессонница истощают нервную систему, а химические снотворные часто вызывают привыкание и тяжесть по утрам.\n\n💡 **Натуральное растительное решение**:\nРекомендую **ВАМЕЛАН** — это 100% натуральный европейский фитокомплекс на основе экстрактов валерианы, мяты перечной и мелиссы.\n• Он мягко успокаивает мысли, снимает спазмы сосудов и тревожность.\n• Не вызывает сонливости днем и дарит легкое, свежее пробуждение утром.\n\n🌙 **Схема приема**:\n• При тревожности: по 1 капсуле 2 раза в день.\n• Для глубокого сна: 1-2 капсулы за 45 минут до сна со стаканом теплой воды.\n\nЕсли препарат нужен ребенку — у нас есть детский сироп **ВАМЕЛАН КИДС**. Уточните, для кого подбираем?";
        text_uz = "Sizni tushunaman. Doimiy stress va uyqusizlik asab tizimini toliqtiradi, kimyoviy tinchlantiruvchi dorilar esa o'rganib qolish va ertalab bosh og'rig'iga sabab bo'lishi mumkin.\n\n💡 **Tabiiy o'simlik yechimi**:\n**VAMELAN** fitomajmuasini tavsiya etaman — 100% tabiiy valeriana, yalpiz va melissa ekstraktlari jamlanmasi.\n• Miyadagi ortiqcha hayajonni bosadi, tomirlar siqilishini yozadi va xotirjamlik beradi.\n• Kunduzi uyqu keltirmaydi, ertalab esa tetik uyg'onishni ta'minlaydi.\n\n🌙 **Qanday ichiladi**:\n• Xotirjamlik uchun: kuniga 1 kapsuladan 2 marta.\n• Tinch uyqu uchun: uyqudan 45 daqiqa oldin 1-2 kapsula iliq suv bilan.\n\nAgar preparat bola uchun bo'lsa — **VAMELAN KIDS** tabiiy siropi bor. Kim uchun tanlayotganingizni ayta olasizmi?";
      }

      // 7. IMMUNITY, COLDS & VITAMIN D (Иммунитет, простуда, грипп, витамин D, Сановит, Коледан)
      else if (q.includes('иммун') || q.includes('простуд') || q.includes('грипп') || q.includes('витамин') || q.includes('сановит') || q.includes('коледан') || q.includes('d3') || q.includes('d-3') || q.includes('immunitet') || q.includes('shamollash') || q.includes('gripp') || q.includes('d kalsin') || q.includes('d-kal')) {
        matched = [this.products.find(p => p.id === 'koledan-drops'), this.products.find(p => p.id === 'sanovit'), this.products.find(p => p.id === 'd-calcin')].filter(Boolean);
        text_ru = "Защита иммунитета — это основа активной жизни! Особенно в межсезонье наш организм испытывает дефицит солнечного витамина D3 и ключевых минералов (цинк, селен, витамины группы B).\n\n💡 **Золотой стандарт иммунной защиты от World Medicine**:\n1. **КОЛЕДАН (Витамин D3 50 000 МЕ)** — масляная форма с максимальной биодоступностью. Быстро восполняет дефицит, укрепляет защитный барьер легких и костную систему.\n2. **САНОВИТ** — сбалансированный поливитаминный комплекс для всей семьи с приятным апельсиновым вкусом.\n\n☀️ Принимайте витамин D утром во время еды, содержащей полезные жиры (масло, яйца, авокадо) — так он усваивается на 100%!\n\nВы хотите укрепить иммунитет профилактически или после перенесенной простуды?";
        text_uz = "Immunitetni himoya qilish — sog'lom va faol hayot garovidir! Ayniqsa mavsum almashganda organizmda D3 vitamini va muhim minerallar (rux, selen, B guruhi vitaminlari) tanqisligi yuzaga keladi.\n\n💡 **World Medicine immunitet standarti**:\n1. **KOLEDAN (Vitamin D3 50 000 XB)** — maksimal singuvchan moyli tomchilar. D vitamini yetishmovchiligini tezda to'ldiradi, o'pka va suyaklarni mustahkamlaydi.\n2. **SANOVIT** — butun oila uchun yoqimli apelsin ta'mli polivitamin majmuasi.\n\n☀️ D vitaminini ertalab yog'liroq ovqat (sariyog', tuxum) bilan ichish tavsiya etiladi — shunda u 100% so'riladi!\n\nImmunitetni profilaktika uchun mustahkamlamoqchimisiz yoki shamollashdan keyinmi?";
      }

      // 8. STOMACH, DIGESTION, LIVER & HEARTBURN (Желудок, изжога, пищеварение, печень, вздутие)
      else if (q.includes('желуд') || q.includes('изжог') || q.includes('живот') || q.includes('гастро') || q.includes('печен') || q.includes('вздути') || q.includes('диаре') || q.includes('oshqozon') || q.includes('hazm') || q.includes("jig'ildon") || q.includes("jig'ildon") || q.includes('jigar') || q.includes('ich qotish')) {
        matched = this.products.filter(p => p.category_id === 'gastro');
        if (!matched.length) matched = [this.products.find(p => p.id === 'sanovit')].filter(Boolean);
        text_ru = "Проблемы с пищеварением (тяжесть, вздутие, изжога) напрямую влияют на самочувствие и уровень энергии, ведь 70% иммунитета формируется именно в кишечнике.\n\n💡 **Что мы рекомендуем**:\n• При изжоге и повышенной кислотности важно мягко обволакивать слизистую и нормализовать ферментативный баланс.\n• Для защиты клеток печени и улучшения оттока желчи применяются гепатопротекторные комплексы World Medicine.\n\n🍵 **Рекомендация по питанию**: старайтесь пить теплую воду за 20 минут до еды, избегайте холодных газированных напитков во время приема пищи.\n\nБеспокоит ли вас изжога после жирной пищи или постоянная тяжесть?";
        text_uz = "Oshqozon va hazm qilishdagi bezovtalik (og'irlik, jig'ildon qaynashi, dam bo'lish) umumiy kayfiyatga to'g'ridan-to'g'ri ta'sir qiladi, chunki immunitetning 70% ichaklarda shakllanadi.\n\n💡 **Bizning tavsiyalarimiz**:\n• Jig'ildon qaynashida me'da shilliq qavatini himoya qilish va kislotalilikni me'yorlashtirish zarur.\n• Jigar hujayralarini tozalash va o't haydash uchun World Medicine gepatoprotektor vositalari tavsiya etiladi.\n\n🍵 **Foydali maslahat**: ovqatdan 20 daqiqa oldin iliq suv iching, ovqatlanish paytida sovuq gazlangan ichimliklardan saqlaning.\n\nSizda og'irlik ko'proq yog'li ovqatdan keyin bo'ladimi?";
      }

      // 9. BEAUTY: HAIR, SKIN, NAILS & COLLAGEN (Волосы, кожа, ногти, красота, морщины)
      else if (q.includes('волос') || q.includes('кожа') || q.includes('ногти') || q.includes('красот') || q.includes('морщин') || q.includes('коллаген') || q.includes('teri') || q.includes('soch') || q.includes('tirnoq') || q.includes("go'zal") || q.includes("go'zal") || q.includes('ajin')) {
        matched = [this.products.find(p => p.id === 'polijen'), this.products.find(p => p.id === 'd-calcin')].filter(Boolean);
        text_ru = "Истинная красота кожи, пышность волос и прочность ногтей всегда начинаются изнутри — с питания клеток и синтеза собственного коллагена.\n\n💡 **Идеальный бьюти-дуэт**:\n1. **ПОЛИЖЕН** — содержит коэнзим Q10, маточное молочко и антиоксиданты, которые защищают клетки кожи от фотостарения, останавливают выпадение волос и возвращают лицу здоровое сияние.\n2. **Д-КАЛЬЦИН** — укрепляет ногтевую пластину, предотвращает ломкость и делает зубную эмаль белоснежной.\n\n💧 **Секрет косметолога**: сочетайте прием с 1.5 л чистой воды в день для максимального тургора кожи!\n\nБеспокоит ли вас выпадение волос или сухость кожи?";
        text_uz = "Teri jilosi, sochlarning qalinligi va tirnoqlar mustahkamligi doimo ichki oziqlanish va kollagen sinteziga bog'liqdir.\n\n💡 **Go'zallik uchun a'lo juftlik**:\n1. **POLIJEN** — koenzim Q10, ona ari suti va antioksidantlar bilan terini yoshartiradi, soch to'kilishini to'xtatadi va yuzga tabiiy tiniqlik bag'ishlaydi.\n2. **D-KALSIN** — tirnoqlarni qatlamlanishdan saqlaydi, sochlarni mustahkam qiladi.\n\n💧 **Kosmetolog siri**: natijani kuchaytirish uchun kuniga 1.5 litr toza suv iching!\n\nSizda ko'proq soch to'kilishi bezovta qilyaptimi yoki teri quruqligimi?";
      }

      // 10. CHILDREN & MOTHERS (Дети, ребенок, рост, память в школе, ребенок капризничает)
      else if (q.includes('дет') || q.includes('ребенок') || q.includes('малыш') || q.includes('школ') || q.includes('памят') || q.includes('bola') || q.includes('farzand') || q.includes('maktab') || q.includes('xotira')) {
        matched = [this.products.find(p => p.id === 'vamelan-kids'), this.products.find(p => p.id === 'sanovit'), this.products.find(p => p.id === 'd-calcin')].filter(Boolean);
        text_ru = "Здоровье и правильное развитие ребенка — самый важный приоритет каждого родителя! 👶\n\n💡 **Что мы подготовили для детей**:\n• **ВАМЕЛАН КИДС** — мягкий сироп на травах при гиперактивности, капризах, адаптации к садику и беспокойном сне.\n• **САНОВИТ** — витаминно-минеральный сироп для укрепления памяти, иммунитета и аппетита школьника.\n• **Д-КАЛЬЦИН** — гранулы с кальцием и витамином D3 для правильного роста костей и крепких зубов.\n\nСколько лет вашему ребенку? Я с удовольствием подскажу точную дозировку по возрасту!";
        text_uz = "Farzandning sog'lom va barkamol o'sishi har bir ota-onaning eng katta orzusidir! 👶\n\n💡 **Bolalar salomatligi uchun vositalar**:\n• **VAMELAN KIDS** — bolalardagi asabiylik, maktabga moslashish va tinch uyqu uchun shirin ta'mli tabiiy fitosirop.\n• **SANOVIT** — bolaning xotirasi, ishtahasi va darmonini oshiruvchi vitaminlar majmuasi.\n• **D-KALSIN** — suyaklar to'g'ri o'sishi va mustahkam tishlar uchun kalsiy va D3 granulalari.\n\nFarzandingiz necha yoshda? Yoshi bo'yicha aniq dozirovkani aytib beraman!";
      }

            // 10.5. INSTAGRAM & SOCIAL CHANNELS (Инстаграм, соцсети, контакты)
      else if (q.includes('инстаграм') || q.includes('instagram') || q.includes('соцсет') || q.includes('канал') || q.includes('profil') || q.includes('sahifa')) {
        text_ru = "Подписывайтесь на наш официальный профиль в Instagram: **[@evro_farm_biznes](https://www.instagram.com/evro_farm_biznes)** 📸\n\nТам мы регулярно публикуем полезные советы нутрициологов и экспертов, видеообзоры составов, акции и информацию о новинках World Medicine. Будем рады видеть вас среди наших подписчиков!";
        text_uz = "Rasmiy Instagram sahifamizga obuna bo'ling: **[@evro_farm_biznes](https://www.instagram.com/evro_farm_biznes)** 📸\n\nU yerda mutaxassislarimizning foydali maslahatlari, tarkiblar tahlili, aksiyalar va World Medicine yangiliklari muntazam e'lon qilib boriladi!";
        matched = this.featuredProducts.slice(0, 2);
      }

      // 11. PRICE, DELIVERY & ORDERING (Цена, как купить, доставка, оплата)
      else if (q.includes('цен') || q.includes('скольк') || q.includes('стои') || q.includes('доставк') || q.includes('заказ') || q.includes('купит') || q.includes('narx') || q.includes('qancha') || q.includes('yetkaz') || q.includes('buyurtma') || q.includes('sotib')) {
        matched = this.featuredProducts.slice(0, 2);
        text_ru = "Все наши препараты являются 100% оригинальной продукцией World Medicine с европейской сертификацией качества.\n\n🚚 **Условия доставки по Узбекистану**:\n• **По Ташкенту**: доставка курьером прямо до двери за 2-4 часа (при заказе от 200 000 сум — **БЕСПЛАТНО**!).\n• **По регионам Узбекистана**: надежная экспресс-доставка через почту / курьерские службы за 1-2 дня.\n• **Оплата**: наличными при получении, картами Uzcard / Humo или через Payme / Click.\n\nВы можете добавить нужный препарат в корзину прямо из этого чата по кнопке «Купить» или оставить свой номер телефона, и наш специалист оформит доставку за вас!";
        text_uz = "Barcha preparatlarimiz 100% original bo'lib, Yevropa sifat standartlariga muvofiq sertifikatlangan.\n\n🚚 **O'zbekiston bo'ylab yetkazib berish**:\n• **Toshkent shahrida**: kuryer orqali eshikkacha 2-4 soat ichida (200 000 so'mdan yuqori buyurtmalarda — **BEPUL**!).\n• **Viloyatlarga**: 1-2 kun ichida ekspress pochta orqali xavfsiz yetkaziladi.\n• **To'lov**: qabul qilganda naqd, Uzcard / Humo yoki Payme / Click orqali.\n\nSiz xohlagan mahsulotni shu yerdan «Savat» tugmasi orqali qo'shishingiz yoki telefon raqamingizni qoldirishingiz mumkin!";
      }

      // 12. GENERAL EMPATHETIC CLINICAL CONSULTATION (Любые другие вопросы)
      else {
        matched = this.featuredProducts.slice(0, 2);
        text_ru = `Спасибо за ваш вопрос! Я внимательно проанализировал ваш запрос по теме «${query.trim()}».\n\nВ каталоге World Medicine представлены оригинальные европейские формулы, направленные на бережное восстановление ресурсов организма.\n\nДля детальной рекомендации я подобрал ключевые препараты с доказанной эффективностью. Если вы уточните свой возраст или характер симптомов — я распишу индивидуальный курс приема!`;
        text_uz = `Savolingiz uchun rahmat! «${query.trim()}» bo'yicha so'rovingizni ko'rib chiqdim.\n\nWorld Medicine katalogida organizm quvvatini tiklovchi original Yevropa sifatidagi preparatlar jamlangan.\n\nSiz uchun eng samarali va xavfsiz vositalarni tavsiya qilaman. Agar yoshingiz yoki alomatlaringizni aniqlashtirsangiz — sizga mos individual qabul qilish kursini tuzib beraman!`;
      }

      // Append callback notification if phone was provided
      if (phone) {
        text_ru += `\n\n📞 **Заявка принята!** Наш ведущий фармацевт перезвонит на номер **${phone}** в течение 10-15 минут для персональной консультации и уточнения адреса доставки.`;
        text_uz += `\n\n📞 **Qabul qilindi!** Bosh farmatsevtimiz **${phone}** raqamingizga 10-15 daqiqa ichida qo'ng'iroq qilib, batafsil maslahat beradi va manzilni tasdiqlaydi.`;
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

    // Telegram Bot Configuration for Instant Order Notifications
    telegramBot: {
      token: '', // Вставьте токен бота (например: '7123456789:AAH..._xyz')
      chatId: '', // Вставьте ID чата или группы (например: '123456789' или '-1001234567890')
    },
    isSubmittingOrder: false,

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
      let message = `🛍 <b>${isUz ? 'YANGI BUYURTMA' : 'НОВЫЙ ЗАКАЗ'} — World Medicine OTC</b>\n`;
      message += `📅 <i>${timeStr}</i>\n\n`;
      
      message += `👤 <b>${isUz ? 'Mijoz' : 'Клиент'}:</b> ${this.checkout.name}\n`;
      message += `📞 <b>${isUz ? 'Telefon' : 'Телефон'}:</b> <code>${this.checkout.phone}</code>\n`;
      message += `📍 <b>${isUz ? 'Manzil' : 'Адрес доставки'}:</b> ${this.checkout.city || 'Toshkent'}, ${this.checkout.address || (isUz ? 'Aniqlanadi' : 'Уточняется')}\n\n`;

      message += `🛒 <b>${isUz ? 'Buyurtma tarkibi' : 'Состав заказа'}:</b>\n`;
      this.cart.forEach((item, index) => {
        const name = isUz ? item.name_uz : item.name_ru;
        const dosage = isUz ? item.dosage_uz : item.dosage_ru;
        const itemTotal = this.formatPrice(item.price * item.quantity);
        message += `${index + 1}. <b>${name}</b> (${dosage})\n`;
        message += `   └ ${item.quantity} шт × ${this.formatPrice(item.price)} = <b>${itemTotal}</b>\n`;
      });

      const finalTotal = this.isFreeDeliveryEligible ? this.cartTotal : this.cartTotal + 25000;
      message += `\n🚚 <b>${isUz ? 'Yetkazib berish' : 'Доставка'}:</b> ${this.isFreeDeliveryEligible ? (isUz ? 'Bepul (Uzum 1-Day)' : 'Бесплатно (Uzum 1-Day)') : '25 000 сум'}\n`;
      message += `💰 <b>${isUz ? 'JAMI TO\'LOV' : 'ИТОГО К ОПЛАТЕ'}:</b> <b>${this.formatPrice(finalTotal)}</b>\n`;
      message += `🌐 <i>Manba: wm-otc online platform</i>`;

      // 2. If Bot Token is configured, send via Telegram Bot API
      if (this.telegramBot.token && this.telegramBot.chatId) {
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
          if (!data.ok) {
            console.error('Telegram Bot API error:', data);
          }
        } catch (err) {
          console.error('Failed to send order via Telegram Bot:', err);
        }
      } else {
        console.log('Order generated (Telegram bot token pending):', message);
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
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
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