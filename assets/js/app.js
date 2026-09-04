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

                      /* --- 4. Interactive AI Multi-Pose Anatomy: Smooth Head Gaze Direction --- */
  (function initContinuous360Player() {
    const TOTAL_FRAMES = 120;
    const canvasDesktop = document.getElementById('humanFrameCanvas');
    const canvasMobile = document.getElementById('humanFrameCanvasMobile');
    const container = document.getElementById('humanFigureContainer');
    const symptomsSection = document.getElementById('symptoms-guide');

    if (!canvasDesktop && !canvasMobile) return;

    const ctxDesktop = canvasDesktop ? canvasDesktop.getContext('2d') : null;
    const ctxMobile = canvasMobile ? canvasMobile.getContext('2d') : null;

    // Preload all 120 frames
    const frames = [];
    let loadedCount = 0;
    let currentFrameIdx = 112.0; // Center gaze
    let targetFrameIdx = 112.0;
    let isUserHovering = false;

    function drawFrame(idx) {
      const displayIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(idx)));
      const frameImg = frames[displayIdx];
      if (!frameImg || !frameImg.complete) return;

      if (ctxDesktop) {
        ctxDesktop.clearRect(0, 0, canvasDesktop.width, canvasDesktop.height);
        ctxDesktop.drawImage(frameImg, 0, 0, canvasDesktop.width, canvasDesktop.height);
      }
      if (ctxMobile) {
        ctxMobile.clearRect(0, 0, canvasMobile.width, canvasMobile.height);
        ctxMobile.drawImage(frameImg, 0, 0, canvasMobile.width, canvasMobile.height);
      }
    }

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const numStr = String(i).padStart(3, '0');
      img.src = `assets/img/anatomy_frames/frame_${numStr}.png?v=3`;
      img.onload = () => {
        loadedCount++;
        if (i === 112 && !isUserHovering) {
          drawFrame(112);
        }
      };
      frames.push(img);
    }

    // 60 FPS Ultra-Smooth Lerp Animation Loop (No gaps, no jumps)
    function animateLoop() {
      const diff = targetFrameIdx - currentFrameIdx;
      if (Math.abs(diff) > 0.15) {
        // Continuous organic interpolation
        currentFrameIdx += diff * 0.18;
        drawFrame(currentFrameIdx);
      }
      requestAnimationFrame(animateLoop);
    }
    requestAnimationFrame(animateLoop);

    // Continuous 360-degree trigonometric interpolation
    // Top (angle = -90° / -PI/2): Frame 5
    // Top-Right (angle = -45° / -PI/4): Frame 24
    // Right (angle = 0°): Frame 30
    // Bottom-Right (angle = 45° / PI/4): Frame 80
    // Bottom (angle = 90° / PI/2): Frame 90
    // Bottom-Left (angle = 135° / 3PI/4): Frame 85
    // Left (angle = 180° / PI): Frame 42
    // Top-Left (angle = -135° / -3PI/4): Frame 16
    function calculate360TargetFrame(normX, normY) {
      const dist = Math.hypot(normX, normY);
      if (dist < 0.12) {
        return 112; // Center
      }

      // Calculate angle from -PI to +PI
      const angle = Math.atan2(normY, normX); // -PI to +PI (-PI/2 = Top, 0 = Right, PI/2 = Bottom, PI = Left)
      
      // Convert to degrees 0..360 (0 = Right, 90 = Bottom, 180 = Left, 270 = Top)
      let deg = (angle * 180 / Math.PI);
      if (deg < 0) deg += 360;

      // Smooth mathematical blending between compass anchors:
      if (deg >= 247.5 && deg < 292.5) {
        // Pure TOP (270°)
        return 5;
      } else if (deg >= 292.5 && deg < 337.5) {
        // TOP-RIGHT (315°)
        const t = (deg - 292.5) / 45.0;
        return 5 + (24 - 5) * t;
      } else if (deg >= 337.5 || deg < 22.5) {
        // Pure RIGHT (0°)
        return 30;
      } else if (deg >= 22.5 && deg < 67.5) {
        // BOTTOM-RIGHT (45°)
        const t = (deg - 22.5) / 45.0;
        return 30 + (80 - 30) * t;
      } else if (deg >= 67.5 && deg < 112.5) {
        // Pure BOTTOM (90°)
        return 90;
      } else if (deg >= 112.5 && deg < 157.5) {
        // BOTTOM-LEFT (135°)
        const t = (deg - 112.5) / 45.0;
        return 90 + (85 - 90) * t;
      } else if (deg >= 157.5 && deg < 202.5) {
        // Pure LEFT (180°)
        return 42;
      } else {
        // TOP-LEFT (225°)
        const t = (deg - 202.5) / 45.0;
        return 42 + (16 - 42) * t;
      }
    }

    function handlePointer(clientX, clientY) {
      if (!symptomsSection) return;
      const rect = symptomsSection.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;

      const normX = deltaX / (rect.width * 0.35);
      const normY = deltaY / (rect.height * 0.35);

      targetFrameIdx = calculate360TargetFrame(normX, normY);
      isUserHovering = true;

      // Instant 3D tactile perspective response
      if (container) {
        const tiltX = Math.max(-5, Math.min(5, normY * -4)).toFixed(1);
        const tiltY = Math.max(-6, Math.min(6, normX * 6)).toFixed(1);
        container.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
    }

    window.addEventListener('pointermove', (e) => {
      if (!symptomsSection) return;
      const secRect = symptomsSection.getBoundingClientRect();
      if (secRect.bottom > -50 && secRect.top < window.innerHeight + 50) {
        handlePointer(e.clientX, e.clientY);
      }
    }, { passive: true });

    if (symptomsSection) {
      symptomsSection.addEventListener('mouseleave', () => {
        targetFrameIdx = 112; // Return to center forward gaze smoothly
        if (container) container.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    }
  })();

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