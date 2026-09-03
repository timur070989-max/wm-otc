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
    
    // UI state
    isCartOpen: false,
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

    submitOrder() {
      if (!this.checkout.name || !this.checkout.phone || this.checkout.phone.length < 9) {
        alert(this.lang === 'uz' ? "Iltimos, ism va telefon raqamingizni kiriting" : "Пожалуйста, укажите имя и контактный телефон");
        return;
      }

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

      /* --- 4. Interactive 3D Model Fast Look-At Mouse (High-Speed Head Tracking) --- */
  const bodyViewer = document.getElementById('bodyViewer');
  const symptomsSection = document.getElementById('symptoms-guide');

  if (bodyViewer && symptomsSection) {
    const baseAzimuth = 0;      // front-facing center
    const baseElevation = 78;   // base eye level
    const maxAzimuth = 52;      // wide turn angle (+/- 52 deg)
    const maxElevation = 16;    // tilt up/down (+/- 16 deg)

    let targetAzimuth = baseAzimuth;
    let targetElevation = baseElevation;
    let currentAzimuth = baseAzimuth;
    let currentElevation = baseElevation;
    let isTracking = false;
    let modelRaf = null;

    function render3DFrame() {
      // High-speed snappy response (ease = 0.26)
      const ease = 0.26;
      currentAzimuth += (targetAzimuth - currentAzimuth) * ease;
      currentElevation += (targetElevation - currentElevation) * ease;

      const orbitStr = `${currentAzimuth.toFixed(1)}deg ${currentElevation.toFixed(1)}deg 105%`;
      bodyViewer.cameraOrbit = orbitStr;
      bodyViewer.setAttribute('camera-orbit', orbitStr);

      if (Math.abs(targetAzimuth - currentAzimuth) > 0.08 || Math.abs(targetElevation - currentElevation) > 0.08 || isTracking) {
        modelRaf = requestAnimationFrame(render3DFrame);
      } else {
        modelRaf = null;
      }
    }

    // Track mouse position relative to the 3D model center
    function handlePointer(clientX, clientY) {
      const rect = bodyViewer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from center of 3D model
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;

      // Normalize with higher sensitivity (narrower divisor = faster turn)
      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth * 0.35)));
      const normY = Math.max(-1, Math.min(1, deltaY / (window.innerHeight * 0.35)));

      // Invert azimuth so model turns FACE directly towards mouse position
      targetAzimuth = -normX * maxAzimuth;
      targetElevation = baseElevation - normY * maxElevation; // Inverted: mouse UP -> model looks UP

      isTracking = true;
      if (!modelRaf) {
        modelRaf = requestAnimationFrame(render3DFrame);
      }
    }

    window.addEventListener('pointermove', (e) => {
      const secRect = symptomsSection.getBoundingClientRect();
      if (secRect.bottom > -200 && secRect.top < window.innerHeight + 200) {
        handlePointer(e.clientX, e.clientY);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      isTracking = false;
      targetAzimuth = baseAzimuth;
      targetElevation = baseElevation;
      if (!modelRaf) modelRaf = requestAnimationFrame(render3DFrame);
    });
  }
});