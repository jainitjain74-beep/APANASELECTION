/* =====================================================================
   APANA SELECTION — script.js
   Pure vanilla JS. No frameworks, no backend. Everything is stored in
   the browser using localStorage, so it works by simply opening
   index.html.
   ===================================================================== */

(function () {
  "use strict";

  /* ===================================================================
     OWNER LOGIN CREDENTIALS

     IMPORTANT — read this if you plan to actually launch this site:
     This project has no backend, so this login can only ever be a light
     deterrent, not real security. Anyone can open DevTools (or just
     "View Page Source") and read this file. Storing the password as a
     SHA-256 hash means a casual visitor can't just read your password
     off the screen — but a visitor who understands what a hash is can
     still bypass the login screen entirely, because the code that
     checks "is this person logged in?" also has to live here, in the
     browser, where anyone can read or run it. If you need real
     protection for the dashboard, you need a server-side login (see the
     note in the dashboard's Website Settings tab).

     To set a NEW password:
     1. Open owner-login.html in your browser.
     2. Open the browser console (F12 → Console) and run:
          APANA_makePasswordHash("yourNewPassword").then(console.log)
     3. Copy the hex string it prints and paste it below as
        OWNER_PASSWORD_HASH.
     =================================================================== */
  const OWNER_USERNAME = "tarunjinu@789";
  const OWNER_PASSWORD_HASH = "bf14f6edf5c356219f93ecf9b7909a53670c45e637c196a47e69c209625aeb68"; // password updated — see chat history for how this was generated
  const OWNER_PASSWORD_SALT = "apana_selection_salt_v1";

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function hashOwnerPassword(password) {
    return sha256Hex(OWNER_PASSWORD_SALT + password);
  }
  // Handy console helper for generating a new OWNER_PASSWORD_HASH value — see comment above.
  if (typeof window !== "undefined") {
    window.APANA_makePasswordHash = hashOwnerPassword;
  }

  /* ===================================================================
     STORAGE KEYS
     =================================================================== */
  const KEYS = {
    products: "apana_products",
    homepage: "apana_homepage",
    offer: "apana_offer",
    about: "apana_about",
    shopInfo: "apana_shopinfo",
    categories: "apana_categories",
    social: "apana_social",
    settings: "apana_settings",
    favorites: "apana_favorites",
    visitors: "apana_visitors",
    visitorLog: "apana_visitor_log",
    theme: "apana_theme",
    ownerSession: "apana_owner_session",
  };

  /* ===================================================================
     HELPERS
     =================================================================== */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const uid = () => "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  const escapeHtml = (str) =>
    String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  const formatPrice = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const digitsOnly = (str) => String(str || "").replace(/[^\d]/g, "");

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Storage write failed", e);
      showToast("Could not save — your browser storage may be full.");
      return false;
    }
  }

  function showToast(msg) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  /* True only on index.html — used to guard customer-site render functions
     that are reused (for their data-saving side) from dashboard forms on
     owner-dashboard.html, where the corresponding DOM does not exist. */
  function isSitePage() {
    return document.body.dataset.page === "site";
  }

  /* Build a self-contained SVG placeholder image (no network required). */
  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  const PALETTE = ["#20222a", "#2a2118", "#1c2622", "#241c26", "#26201c", "#1c2026"];
  function placeholderImage(label, sub) {
    const seed = hashSeed(label + (sub || ""));
    const bg = PALETTE[seed % PALETTE.length];
    const accent = "#d6a419";
    const safe = escapeHtml(label);
    const safeSub = escapeHtml(sub || "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750">
      <rect width="600" height="750" fill="${bg}"/>
      <rect x="0" y="0" width="600" height="750" fill="none" stroke="${accent}" stroke-width="4" stroke-opacity=".35"/>
      <circle cx="300" cy="300" r="120" fill="${accent}" opacity=".12"/>
      <text x="300" y="330" font-family="Arial, sans-serif" font-size="30" fill="${accent}" text-anchor="middle" opacity=".9">${safe}</text>
      <text x="300" y="368" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" opacity=".55">${safeSub}</text>
      <text x="300" y="700" font-family="Arial, sans-serif" font-size="14" fill="${accent}" text-anchor="middle" opacity=".5">APANA SELECTION</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }
  function placeholder360Set(label) {
    const angles = ["Front", "Front Right", "Right", "Back Right", "Back", "Back Left", "Left", "Front Left"];
    return angles.map((a) => placeholderImage(label, a));
  }

  /* ===================================================================
     DEFAULT DATA
     =================================================================== */
  function defaultCategories() {
    return [
      { id: "tshirts", name: "T-Shirts", hidden: false },
      { id: "trackpants", name: "Track Pants", hidden: false },
      { id: "shirts", name: "Shirts", hidden: false },
      { id: "jeans", name: "Jeans", hidden: false },
      { id: "hoodies", name: "Hoodies", hidden: false },
      { id: "jackets", name: "Jackets", hidden: false },
      { id: "shorts", name: "Shorts", hidden: false },
    ];
  }

  const CATEGORY_DESC_PHRASE = {
    tshirts: "t-shirt",
    trackpants: "track pant",
    shirts: "shirt",
    jeans: "pair of jeans",
    hoodies: "hoodie",
    jackets: "jacket",
    shorts: "pair of shorts",
  };

  function defaultProducts() {
    const specs = [
      // name, category, price, oldPrice, badge, sizes, colors, available, newArrival, trending, featured
      ["Classic Black T-Shirt", "tshirts", 399, 599, "Bestseller", ["S", "M", "L", "XL"], ["Black"], true, false, false, true],
      ["Casual White T-Shirt", "tshirts", 349, 499, "", ["S", "M", "L", "XL"], ["White"], true, false, false, false],
      ["Premium Grey T-Shirt", "tshirts", 599, 799, "Premium", ["S", "M", "L", "XL", "XXL"], ["Grey"], true, false, false, true],
      ["Blue Casual T-Shirt", "tshirts", 399, 0, "", ["S", "M", "L"], ["Blue"], true, false, false, false],
      ["Brown Street T-Shirt", "tshirts", 449, 649, "", ["S", "M", "L", "XL"], ["Brown"], true, false, true, false],
      ["Basic Green T-Shirt", "tshirts", 349, 0, "", ["M", "L", "XL"], ["Green"], false, false, false, false],
      ["Oversized Black T-Shirt", "tshirts", 599, 899, "New", ["M", "L", "XL", "XXL"], ["Black"], true, true, true, true],
      ["Basic Navy T-Shirt", "tshirts", 349, 499, "", ["S", "M", "L"], ["Navy"], true, false, false, false],
      ["Summer White T-Shirt", "tshirts", 379, 0, "New", ["S", "M", "L", "XL"], ["White"], true, true, false, false],
      ["Street Style Grey", "tshirts", 499, 699, "Trending", ["S", "M", "L", "XL"], ["Grey"], true, false, true, false],

      ["Classic Track Pant", "trackpants", 599, 799, "", ["S", "M", "L", "XL"], ["Black", "Grey"], true, false, false, false],
      ["Black Track Pant", "trackpants", 649, 899, "Trending", ["M", "L", "XL"], ["Black"], true, false, true, true],

      ["Formal White Shirt", "shirts", 599, 799, "Formal", ["S", "M", "L", "XL"], ["White"], true, false, false, true],
      ["Casual Checked Shirt", "shirts", 549, 0, "", ["S", "M", "L", "XL"], ["Blue", "White"], true, true, false, false],
      ["Denim Shirt", "shirts", 649, 899, "Trending", ["M", "L", "XL"], ["Blue"], true, false, true, false],

      ["Slim Fit Blue Jeans", "jeans", 899, 1199, "Bestseller", ["30", "32", "34", "36"], ["Blue"], true, false, true, true],
      ["Straight Fit Black Jeans", "jeans", 849, 0, "", ["30", "32", "34", "36"], ["Black"], true, false, false, false],
      ["Ripped Grey Jeans", "jeans", 999, 1299, "New", ["30", "32", "34"], ["Grey"], true, true, false, false],

      ["Pullover Black Hoodie", "hoodies", 799, 999, "Trending", ["M", "L", "XL", "XXL"], ["Black"], true, false, true, true],
      ["Zipper Grey Hoodie", "hoodies", 849, 0, "", ["M", "L", "XL"], ["Grey"], true, false, false, false],
      ["Oversized Navy Hoodie", "hoodies", 899, 1099, "New", ["L", "XL", "XXL"], ["Navy"], true, true, false, false],

      ["Bomber Jacket", "jackets", 1299, 1599, "Premium", ["M", "L", "XL"], ["Black", "Olive"], true, false, false, true],
      ["Denim Jacket", "jackets", 1199, 0, "Trending", ["M", "L", "XL"], ["Blue"], true, false, true, false],
      ["Windcheater Jacket", "jackets", 999, 1299, "New", ["M", "L", "XL", "XXL"], ["Black", "Navy"], true, true, false, false],

      ["Casual Cargo Shorts", "shorts", 549, 699, "", ["S", "M", "L", "XL"], ["Olive", "Black"], true, false, false, false],
      ["Sports Shorts", "shorts", 349, 0, "", ["S", "M", "L", "XL"], ["Black", "Grey"], true, false, true, false],
      ["Denim Shorts", "shorts", 599, 799, "New", ["M", "L", "XL"], ["Blue"], true, true, false, false],
    ];
    return specs.map((s, i) => {
      const [name, category, price, oldPrice, badge, sizes, colors, available, newArrival, trending, featured] = s;
      return {
        id: uid(),
        name,
        price,
        oldPrice: oldPrice || 0,
        category,
        description:
          "A comfortable, everyday " +
          (CATEGORY_DESC_PHRASE[category] || "piece") +
          " from APANA SELECTION, made for all-day wear with a relaxed, reliable fit.",
        sizes,
        colors,
        image: placeholderImage(name),
        images: placeholder360Set(name),
        badge,
        available,
        featured,
        newArrival,
        trending,
        enable360: true,
      };
    });
  }

  function defaultHomepage() {
    return {
      siteName: "APANA SELECTION",
      heroKicker: "APANA SELECTION",
      heroHeading: "Men's Fashion.\nSimple. Stylish. Affordable.",
      heroDesc: "Everyday t-shirts and track pants built for comfort, made for the street.",
      heroImage: placeholderImage("APANA SELECTION", "Men's Fashion"),
      btnPrimaryText: "View Collection",
      shopHeading: "Shop the Selection",
      shopDesc: "Handpicked t-shirts and track pants — tap a card to look closer.",
      showOffer: true,
      showAbout: true,
      showShopInfo: true,
    };
  }

  function defaultOffer() {
    return {
      enabled: true,
      tag: "Limited Time",
      title: "Season Sale",
      discount: "Up to 30% off",
      description: "Grab your favourite fits before the rack empties out.",
      image: placeholderImage("Season Sale", "Up to 30% off"),
      btnText: "Shop the Sale",
    };
  }

  function defaultAbout() {
    return {
      heading: "Built on the Street, Worn Everywhere",
      description: "APANA SELECTION started with one idea: good clothes shouldn't cost a fortune.",
      story: "We pick every fabric ourselves, test every fit on real customers, and keep our prices honest — no middlemen, no markup games. What you see is what you pay.",
      image: placeholderImage("Our Story"),
      features: ["Premium cotton fabric", "Free size exchange", "Fast local delivery", "Trusted by 1000+ customers"],
    };
  }

  function defaultShopInfo() {
    return {
      shopName: "APANA SELECTION",
      address: "Shop No. 4, Market Road, Pimpri, Pune, Maharashtra",
      phone: "+91 98765 43210",
      whatsapp: "919876543210",
      email: "hello@apanaselection.com",
      hours: "Mon – Sun: 10:00 AM – 9:00 PM",
      mapLink: "https://maps.google.com",
    };
  }

  function defaultContact() {
    return {
      heading: "Contact Us",
      description: "Questions about sizing, delivery or an order? Message us any time.",
    };
  }

  function defaultSocial() {
    return { instagram: "", facebook: "", youtube: "", whatsapp: "" };
  }

  function defaultSettings() {
    return {
      siteName: "APANA SELECTION",
      logo: "",
      favicon: "",
      footerText: "Men's Fashion. Simple. Stylish. Affordable.",
      copyright: "© 2026 APANA SELECTION. All rights reserved.",
      defaultTheme: "dark",
    };
  }

  /* ===================================================================
     STATE — load from localStorage, seeding defaults on first run
     =================================================================== */
  const state = {};

  function loadState() {
    state.products = readJSON(KEYS.products, null) || defaultProducts();
    state.homepage = readJSON(KEYS.homepage, null) || defaultHomepage();
    state.offer = readJSON(KEYS.offer, null) || defaultOffer();
    state.about = readJSON(KEYS.about, null) || defaultAbout();
    state.shopInfo = readJSON(KEYS.shopInfo, null) || defaultShopInfo();
    state.contact = readJSON("apana_contact", null) || defaultContact();
    state.categories = readJSON(KEYS.categories, null) || defaultCategories();
    state.social = readJSON(KEYS.social, null) || defaultSocial();
    state.settings = readJSON(KEYS.settings, null) || defaultSettings();
    state.favorites = readJSON(KEYS.favorites, null) || [];
  }
  function persist(key, storageKey) {
    writeJSON(storageKey, state[key]);
  }

  /* runtime (not persisted) UI state */
  const ui = {
    filter: "all",
    search: "",
    currentProductId: null,
    viewerFrameIndex: 0,
    viewerZoom: 1,
    editingProductId: null,
  };

  /* ===================================================================
     VISITOR COUNTER
     Tracks a running total AND a per-day log, so the owner dashboard can
     show Today / Last 7 Days / This Month / This Year / All Time.
     Note: the per-day log only starts recording from when this feature
     was added — it can't retroactively split up visits already folded
     into the old running total.
     =================================================================== */
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function getVisitorLog() {
    return readJSON(KEYS.visitorLog, {}) || {};
  }
  function recordDailyVisit() {
    const log = getVisitorLog();
    const key = dateKey(new Date());
    log[key] = (log[key] || 0) + 1;
    writeJSON(KEYS.visitorLog, log);
  }
  function sumLastNDays(log, n) {
    let total = 0;
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      total += log[dateKey(d)] || 0;
    }
    return total;
  }
  function sumThisCalendarMonth(log) {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    let total = 0;
    Object.keys(log).forEach((k) => {
      const [ky, km] = k.split("-").map(Number);
      if (ky === y && km - 1 === m) total += log[k];
    });
    return total;
  }
  function sumThisCalendarYear(log) {
    const today = new Date();
    const y = today.getFullYear();
    let total = 0;
    Object.keys(log).forEach((k) => {
      if (Number(k.split("-")[0]) === y) total += log[k];
    });
    return total;
  }

  function bumpVisitorCount() {
    let count = parseInt(localStorage.getItem(KEYS.visitors) || "0", 10);
    count += 1;
    localStorage.setItem(KEYS.visitors, String(count));
    recordDailyVisit();
    return count;
  }

  /* ===================================================================
     THEME
     =================================================================== */
  function applyTheme(theme) {
    document.body.classList.toggle("theme-light", theme === "light");
    const icon = $("#themeIcon");
    if (icon) icon.textContent = theme === "light" ? "☀️" : "🌙";
  }
  function initTheme() {
    const saved = localStorage.getItem(KEYS.theme);
    const theme = saved || state.settings.defaultTheme || "dark";
    applyTheme(theme);
  }
  function toggleTheme() {
    const isLight = document.body.classList.contains("theme-light");
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(KEYS.theme, next);
  }

  /* ===================================================================
     CATEGORY HELPERS
     =================================================================== */
  function categoryName(id) {
    const c = state.categories.find((c) => c.id === id);
    return c ? c.name : id;
  }
  function visibleCategories() {
    return state.categories.filter((c) => !c.hidden);
  }

  /* ===================================================================
     RENDER: HEADER / BRAND
     =================================================================== */
  function renderBrand() {
    if (!isSitePage()) return;
    const name = state.settings.siteName || "APANA SELECTION";
    document.title = name + " — Men's Fashion";
    $("#brandName").textContent = name;
    $("#footerBrandName").textContent = name;
    $("#shopInfoName").textContent = state.shopInfo.shopName || name;

    const brandLink = $("#brandLink");
    let logoImg = $("#brandLogoImg");
    if (state.settings.logo) {
      if (!logoImg) {
        logoImg = document.createElement("img");
        logoImg.id = "brandLogoImg";
        brandLink.insertBefore(logoImg, brandLink.firstChild);
      }
      logoImg.src = state.settings.logo;
    } else if (logoImg) {
      logoImg.remove();
    }

    if (state.settings.favicon) {
      $("#faviconLink").href = state.settings.favicon;
    }

    $("#footerText").textContent = state.settings.footerText || "";
    $("#footerCopy").textContent = state.settings.copyright || "";
  }

  /* ===================================================================
     RENDER: HERO
     =================================================================== */
  function renderHero() {
    if (!isSitePage()) return;
    const h = state.homepage;
    $("#heroKicker").textContent = h.heroKicker || "";
    $("#heroHeading").innerHTML = escapeHtml(h.heroHeading || "").replace(/\n/g, "<br>");
    $("#heroDesc").textContent = h.heroDesc || "";
    $("#heroBtnPrimary").textContent = h.btnPrimaryText || "View Collection";
    $("#heroImage").src = h.heroImage || placeholderImage("APANA SELECTION");
    const shopH = document.querySelector(".shop-heading h2");
    const shopP = document.querySelector(".shop-heading p");
    if (shopH) shopH.textContent = h.shopHeading || "Shop the Selection";
    if (shopP) shopP.textContent = h.shopDesc || "";

    $("#offers").style.display = h.showOffer ? "" : "none";
    $("#about").style.display = h.showAbout ? "" : "none";
    $("#shopinfo").style.display = h.showShopInfo ? "" : "none";

    updateWhatsappLinks();
  }

  /* ===================================================================
     RENDER: STATS / VISITORS
     =================================================================== */
  function renderStats(visitorCount) {
    if (!isSitePage()) return;
    $("#visitorCount").textContent = visitorCount.toLocaleString("en-IN");
    $("#statStyles").textContent = state.products.length + "+";
  }

  /* ===================================================================
     RENDER: OFFER
     =================================================================== */
  function renderOffer() {
    if (!isSitePage()) return;
    const o = state.offer;
    const section = $("#offers");
    if (!o.enabled) {
      section.style.display = "none";
      return;
    }
    if (state.homepage.showOffer) section.style.display = "";
    $("#offerTag").textContent = o.tag || "";
    $("#offerTitle").textContent = o.title || "";
    $("#offerDiscount").textContent = o.discount || "";
    $("#offerDesc").textContent = o.description || "";
    $("#offerImage").src = o.image || placeholderImage("Offer");
    $("#offerBtn").textContent = o.btnText || "Shop the Sale";
  }

  /* ===================================================================
     RENDER: ABOUT
     =================================================================== */
  function renderAbout() {
    if (!isSitePage()) return;
    const a = state.about;
    $("#aboutHeading").textContent = a.heading || "";
    $("#aboutDesc").textContent = a.description || "";
    $("#aboutStory").textContent = a.story || "";
    $("#aboutImage").src = a.image || placeholderImage("About Us");
    const list = $("#featurePoints");
    list.innerHTML = (a.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  }

  /* ===================================================================
     RENDER: SHOP INFO + CONTACT (share underlying data)
     =================================================================== */
  function renderShopInfoAndContact() {
    if (!isSitePage()) return;
    const s = state.shopInfo;
    $("#shopInfoName").textContent = s.shopName || "APANA SELECTION";
    $("#shopInfoAddress").textContent = s.address || "—";
    $("#shopInfoPhone").textContent = s.phone || "—";
    $("#shopInfoWhatsapp").textContent = s.whatsapp ? "+" + s.whatsapp : "—";
    $("#shopInfoHours").textContent = s.hours || "—";
    $("#shopInfoMapLink").href = s.mapLink || "#";

    const c = state.contact;
    $("#contactHeading").textContent = c.heading || "Contact Us";
    $("#contactDesc").textContent = c.description || "";
    $("#contactPhone").textContent = s.phone || "—";
    $("#contactWhatsapp").textContent = s.whatsapp ? "+" + s.whatsapp : "—";
    $("#contactEmail").textContent = s.email || "—";
    $("#contactAddress").textContent = s.address || "—";
    $("#contactHours").textContent = s.hours || "—";
    $("#contactMapLink").href = s.mapLink || "#";
  }

  /* ===================================================================
     RENDER: SOCIAL LINKS (footer)
     =================================================================== */
  const SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2.2c2.7 0 3 0 4.1.06 1 .05 1.6.2 2 .35.5.2.9.4 1.3.8.4.4.6.8.8 1.3.15.4.3 1 .35 2 .05 1.1.06 1.4.06 4.1s0 3-.06 4.1c-.05 1-.2 1.6-.35 2a3.6 3.6 0 0 1-2.1 2.1c-.4.15-1 .3-2 .35-1.1.05-1.4.06-4.1.06s-3 0-4.1-.06c-1-.05-1.6-.2-2-.35a3.6 3.6 0 0 1-2.1-2.1c-.15-.4-.3-1-.35-2-.05-1.1-.06-1.4-.06-4.1s0-3 .06-4.1c.05-1 .2-1.6.35-2a3.6 3.6 0 0 1 2.1-2.1c.4-.15 1-.3 2-.35C9 2.2 9.3 2.2 12 2.2zm0 1.8c-2.65 0-2.96 0-4 .06-.82.04-1.26.17-1.55.28-.39.15-.67.33-.96.62-.3.3-.47.57-.62.96-.11.29-.24.73-.28 1.55-.05 1.04-.06 1.35-.06 4s0 2.96.06 4c.04.82.17 1.26.28 1.55.15.39.33.67.62.96.3.3.57.47.96.62.29.11.73.24 1.55.28 1.04.05 1.35.06 4 .06s2.96 0 4-.06c.82-.04 1.26-.17 1.55-.28.39-.15.67-.33.96-.62.3-.3.47-.57.62-.96.11-.29.24-.73.28-1.55.05-1.04.06-1.35.06-4s0-2.96-.06-4c-.04-.82-.17-1.26-.28-1.55a2.6 2.6 0 0 0-.62-.96 2.6 2.6 0 0 0-.96-.62c-.29-.11-.73-.24-1.55-.28-1.04-.05-1.35-.06-4-.06zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28zm5.13-1.98a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.28C16.3 4.2 15.4 4.1 14.3 4.1c-2.3 0-3.9 1.4-3.9 4v2.3H7.8v3h2.6V21h3.1z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M22 12s0-3.1-.4-4.6a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.4a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.6a2.9 2.9 0 0 0 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.4a2.9 2.9 0 0 0 2-2C22 15.1 22 12 22 12zM10 15.5v-7l6 3.5-6 3.5z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2.2A9.8 9.8 0 0 0 3.4 17l-1.2 4.3 4.4-1.2A9.8 9.8 0 1 0 12 2.2zm5.7 13.9c-.24.68-1.4 1.3-1.9 1.34-.5.05-1 .24-3.4-.72-2.9-1.15-4.7-4.1-4.85-4.3-.14-.2-1.16-1.55-1.16-2.95 0-1.4.73-2.1 1-2.38.24-.28.53-.35.7-.35h.5c.16 0 .38-.06.6.45.24.56.8 1.93.88 2.07.08.14.13.3.03.5-.1.2-.16.3-.3.47-.16.16-.32.37-.46.5-.16.14-.3.3-.14.6.16.28.72 1.2 1.56 1.94 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.08.16-.2.7-.82.9-1.1.18-.28.36-.24.6-.14.24.1 1.55.73 1.8.86.28.14.46.2.53.32.06.13.06.72-.18 1.4z"/></svg>',
  };
  function renderSocial() {
    if (!isSitePage()) return;
    const wrap = $("#footerSocial");
    const s = state.social;
    let html = "";
    ["instagram", "facebook", "youtube", "whatsapp"].forEach((key) => {
      if (s[key]) {
        html += `<a href="${escapeHtml(s[key])}" target="_blank" rel="noopener" aria-label="${key}">${SOCIAL_ICONS[key]}</a>`;
      }
    });
    wrap.innerHTML = html;
  }

  /* ===================================================================
     WHATSAPP LINKS
     =================================================================== */
  function whatsappBaseNumber() {
    return digitsOnly(state.shopInfo.whatsapp);
  }
  function buildWhatsappLink(message) {
    const num = whatsappBaseNumber();
    const text = encodeURIComponent(message || "Hello APANA SELECTION, I'd like to know more about your products.");
    return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  }
  function updateWhatsappLinks() {
    if (!isSitePage()) return;
    const generalMsg = "Hello APANA SELECTION,\n\nI am interested in your collection.";
    $("#whatsappFloat").href = buildWhatsappLink(generalMsg);
    $("#heroBtnWhatsapp").href = buildWhatsappLink(generalMsg);
  }

  /* ===================================================================
     RENDER: FILTER CHIPS
     =================================================================== */
  function renderFilters() {
    if (!isSitePage()) return;
    const row = $("#filterRow");
    const chips = [{ key: "all", label: "All" }];
    visibleCategories().forEach((c) => chips.push({ key: "cat:" + c.id, label: c.name }));
    chips.push({ key: "new", label: "New" });
    chips.push({ key: "trending", label: "Trending" });
    chips.push({ key: "under500", label: "Under ₹500" });

    row.innerHTML = chips
      .map(
        (c) =>
          `<button class="filter-chip${ui.filter === c.key ? " active" : ""}" data-filter="${escapeHtml(c.key)}">${escapeHtml(c.label)}</button>`
      )
      .join("");

    $all(".filter-chip", row).forEach((btn) => {
      btn.addEventListener("click", () => {
        ui.filter = btn.dataset.filter;
        renderFilters();
        renderProducts();
      });
    });
  }

  /* ===================================================================
     PRODUCT FILTERING / SEARCH
     =================================================================== */
  function getFilteredProducts() {
    let list = state.products.slice();

    if (ui.filter.startsWith("cat:")) {
      const catId = ui.filter.slice(4);
      list = list.filter((p) => p.category === catId);
    } else if (ui.filter === "new") {
      list = list.filter((p) => p.newArrival);
    } else if (ui.filter === "trending") {
      list = list.filter((p) => p.trending);
    } else if (ui.filter === "under500") {
      list = list.filter((p) => Number(p.price) < 500);
    }

    const q = ui.search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const cat = categoryName(p.category).toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          cat.includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }

  /* ===================================================================
     RENDER: PRODUCT GRID
     =================================================================== */
  function renderProducts() {
    if (!isSitePage()) return;
    const grid = $("#productGrid");
    const list = getFilteredProducts();
    const empty = $("#emptyState");

    if (!list.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    grid.innerHTML = list.map(productCardHTML).join("");

    $all(".product-card", grid).forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".pc-fav") || e.target.closest(".pc-whatsapp")) return;
        openProductModal(id);
      });
      attachTilt(card);
    });
    $all(".pc-fav", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.id);
      });
    });
    $all(".pc-whatsapp", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = state.products.find((p) => p.id === btn.dataset.id);
        if (p) window.open(buildWhatsappLink(productWhatsappMessage(p)), "_blank");
      });
    });
  }

  function productCardHTML(p) {
    const isFav = state.favorites.includes(p.id);
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="pc-media">
          <img src="${p.image || placeholderImage(p.name)}" alt="${escapeHtml(p.name)}" loading="lazy"
               onerror="this.src='${placeholderImage("Image unavailable")}'">
          ${p.badge ? `<span class="pc-badge">${escapeHtml(p.badge)}</span>` : ""}
          <button class="pc-fav${isFav ? " active" : ""}" data-id="${p.id}" aria-label="Toggle favorite">${isFav ? "♥" : "♡"}</button>
          ${!p.available ? `<div class="pc-unavailable">Sold Out</div>` : ""}
        </div>
        <div class="pc-body">
          <p class="pc-cat">${escapeHtml(categoryName(p.category))}</p>
          <h3 class="pc-name">${escapeHtml(p.name)}</h3>
          <div class="pc-price">
            <span class="price-now">${formatPrice(p.price)}</span>
            ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)}</span>` : ""}
          </div>
          <div class="pc-actions">
            <button class="btn btn-outline pc-view">View Details</button>
            <button class="btn btn-primary pc-whatsapp" data-id="${p.id}">WhatsApp</button>
          </div>
        </div>
      </article>`;
  }

  function productWhatsappMessage(p) {
    return `Hello APANA SELECTION,\n\nI am interested in:\n\nProduct: ${p.name}\nPrice: ${formatPrice(p.price)}`;
  }

  /* ===================================================================
     3D TILT EFFECT ON PRODUCT CARDS
     =================================================================== */
  function attachTilt(card) {
    const strength = 10;
    function handleMove(clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * strength).toFixed(2)}deg) rotateY(${(x * strength).toFixed(2)}deg) scale3d(1.02,1.02,1.02)`;
    }
    function reset() {
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
    }
    card.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
    card.addEventListener("mouseleave", reset);
    // Touch: keep it light so scrolling stays smooth — no tilt-follow on touchmove.
    card.addEventListener("touchend", reset, { passive: true });
  }

  /* ===================================================================
     FAVORITES
     =================================================================== */
  function toggleFavorite(id) {
    const idx = state.favorites.indexOf(id);
    if (idx === -1) {
      state.favorites.push(id);
      showToast("Added to favorites");
    } else {
      state.favorites.splice(idx, 1);
      showToast("Removed from favorites");
    }
    persist("favorites", KEYS.favorites);
    updateFavCount();
    renderProducts();
    if (ui.currentProductId === id) updateProductModalFavState(id);
  }
  function updateFavCount() {
    if (!isSitePage()) return;
    $("#favCount").textContent = state.favorites.length;
  }

  /* ===================================================================
     PRODUCT MODAL + 360 VIEWER
     =================================================================== */
  function getProductImages(p) {
    const imgs = (p.images && p.images.length ? p.images : [p.image]).filter(Boolean);
    return imgs.length ? imgs : [placeholderImage(p.name)];
  }

  function openProductModal(id) {
    const p = state.products.find((p) => p.id === id);
    if (!p) return;
    ui.currentProductId = id;
    ui.viewerFrameIndex = 0;
    ui.viewerZoom = 1;

    $("#pmBadge").textContent = p.badge || "";
    $("#pmName").textContent = p.name;
    $("#pmCategory").textContent = categoryName(p.category);
    $("#pmPrice").textContent = formatPrice(p.price);
    $("#pmOldPrice").textContent = p.oldPrice ? formatPrice(p.oldPrice) : "";
    $("#pmDesc").textContent = p.description || "";
    $("#pmSizes").innerHTML = (p.sizes || []).map((s) => `<span class="pm-option">${escapeHtml(s)}</span>`).join("") || "<span class='pm-option'>One Size</span>";
    $("#pmColors").innerHTML = (p.colors || []).map((c) => `<span class="pm-option">${escapeHtml(c)}</span>`).join("") || "<span class='pm-option'>—</span>";

    const avail = $("#pmAvailability");
    avail.textContent = p.available ? "In Stock" : "Sold Out";
    avail.className = "pm-availability " + (p.available ? "available" : "unavailable");

    const imgs = getProductImages(p);
    renderViewerThumbs(imgs);
    setViewerFrame(0);
    $("#viewerHint").style.display = p.enable360 && imgs.length > 1 ? "" : "none";
    $("#viewerHint").textContent = "↔ Drag to rotate";

    $("#pmWhatsappBtn").onclick = () => window.open(buildWhatsappLink(productWhatsappMessage(p)), "_blank");
    updateProductModalFavState(id);

    $("#productModalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function updateProductModalFavState(id) {
    const btn = $("#pmFavBtn");
    const isFav = state.favorites.includes(id);
    btn.textContent = isFav ? "♥" : "♡";
    btn.classList.toggle("active", isFav);
    btn.onclick = () => toggleFavorite(id);
  }

  function renderViewerThumbs(imgs) {
    const wrap = $("#viewerThumbs");
    if (imgs.length <= 1) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = imgs
      .map((src, i) => `<img src="${src}" data-i="${i}" class="${i === 0 ? "active" : ""}" alt="View ${i + 1}">`)
      .join("");
    $all("img", wrap).forEach((img) => {
      img.addEventListener("click", () => setViewerFrame(parseInt(img.dataset.i, 10)));
    });
  }

  function setViewerFrame(index) {
    const p = state.products.find((p) => p.id === ui.currentProductId);
    if (!p) return;
    const imgs = getProductImages(p);
    const clamped = ((index % imgs.length) + imgs.length) % imgs.length;
    ui.viewerFrameIndex = clamped;
    $("#viewerImage").src = imgs[clamped];
    $all("#viewerThumbs img").forEach((img, i) => img.classList.toggle("active", i === clamped));
  }

  function closeProductModal() {
    $("#productModalOverlay").classList.remove("open");
    document.body.style.overflow = "";
    ui.currentProductId = null;
  }

  function initViewerInteractions() {
    const viewer = $("#viewer360");
    const img = $("#viewerImage");
    let dragging = false;
    let startX = 0;
    let lastIndexShift = 0;

    function onDown(x) {
      dragging = true;
      startX = x;
      lastIndexShift = 0;
      $("#viewerHint").style.opacity = "0";
    }
    function onMove(x) {
      if (!dragging) return;
      const p = state.products.find((p) => p.id === ui.currentProductId);
      if (!p || !p.enable360) return;
      const imgs = getProductImages(p);
      if (imgs.length <= 1) return;
      const delta = x - startX;
      const step = 28; // px per frame
      const shift = Math.trunc(delta / step);
      if (shift !== lastIndexShift) {
        setViewerFrame(ui.viewerFrameIndex - (shift - lastIndexShift));
        lastIndexShift = shift;
      }
    }
    function onUp() {
      dragging = false;
    }

    viewer.addEventListener("mousedown", (e) => onDown(e.clientX));
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", onUp);

    viewer.addEventListener(
      "touchstart",
      (e) => onDown(e.touches[0].clientX),
      { passive: true }
    );
    viewer.addEventListener(
      "touchmove",
      (e) => {
        onMove(e.touches[0].clientX);
      },
      { passive: true }
    );
    viewer.addEventListener("touchend", onUp);

    $("#zoomInBtn").addEventListener("click", () => {
      ui.viewerZoom = Math.min(2.2, ui.viewerZoom + 0.2);
      img.style.transform = `scale(${ui.viewerZoom})`;
    });
    $("#zoomOutBtn").addEventListener("click", () => {
      ui.viewerZoom = Math.max(1, ui.viewerZoom - 0.2);
      img.style.transform = `scale(${ui.viewerZoom})`;
    });
  }

  /* ===================================================================
     SCROLL REVEAL
     =================================================================== */
  function initScrollReveal() {
    if (!("IntersectionObserver" in window)) {
      $all(".reveal").forEach((el) => el.classList.add("in-view"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    $all(".reveal").forEach((el) => observer.observe(el));
  }

  /* ===================================================================
     BACK TO TOP + STICKY NAV ACTIVE LINK
     =================================================================== */
  function initBackToTop() {
    const btn = $("#backToTopBtn");
    window.addEventListener("scroll", () => {
      btn.classList.toggle("visible", window.scrollY > 500);
    });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ===================================================================
     HEADER: SEARCH, NAV, THEME, HAMBURGER
     =================================================================== */
  function initHeaderControls() {
    const searchBar = $("#searchBar");
    const searchInput = $("#searchInput");

    $("#searchToggleBtn").addEventListener("click", () => {
      searchBar.classList.toggle("open");
      if (searchBar.classList.contains("open")) searchInput.focus();
    });
    $("#searchCloseBtn").addEventListener("click", () => searchBar.classList.remove("open"));
    searchInput.addEventListener("input", () => {
      ui.search = searchInput.value;
      renderProducts();
    });

    $("#favToggleBtn").addEventListener("click", () => {
      document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
      ui.filter = "all";
      ui.search = "";
      searchInput.value = "";
      renderFilters();
      renderProducts();
      showFavoritesOnly();
    });

    $("#themeToggleBtn").addEventListener("click", toggleTheme);

    const hamburger = $("#hamburgerBtn");
    const nav = $("#mainNav");
    const overlay = $("#navOverlay");
    function closeMobileNav() {
      hamburger.classList.remove("open");
      nav.classList.remove("open");
      overlay.classList.remove("open");
    }
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      nav.classList.toggle("open");
      overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", closeMobileNav);

    const FILTER_NAV_TYPES = { tshirts: "cat:tshirts", trackpants: "cat:trackpants", new: "new", trending: "trending" };
    $all(".nav-link[data-nav]").forEach((link) => {
      link.addEventListener("click", (e) => {
        const type = link.dataset.nav;
        closeMobileNav();
        if (!FILTER_NAV_TYPES[type]) return; // home / offers / about / contact use default anchor behaviour
        e.preventDefault();
        document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
        ui.filter = FILTER_NAV_TYPES[type];
        ui.search = "";
        searchInput.value = "";
        renderFilters();
        renderProducts();
      });
    });

    $all(".main-nav a:not([data-nav])").forEach((a) => a.addEventListener("click", closeMobileNav));

    $("#ownerNavLink").addEventListener("click", (e) => {
      closeMobileNav();
      // If already logged in on this browser, skip the login page and jump straight to the dashboard.
      if (isOwnerLoggedIn()) {
        e.preventDefault();
        window.location.href = "owner-dashboard.html";
      }
      // Otherwise let the link's default href (owner-login.html) navigate normally.
    });
  }

  function showFavoritesOnly() {
    const grid = $("#productGrid");
    const favProducts = state.products.filter((p) => state.favorites.includes(p.id));
    const empty = $("#emptyState");
    if (!favProducts.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "You haven't favorited anything yet — tap the heart on a product you like.";
      return;
    }
    empty.hidden = true;
    grid.innerHTML = favProducts.map(productCardHTML).join("");
    $all(".product-card", grid).forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener("click", (e) => {
        if (e.target.closest(".pc-fav") || e.target.closest(".pc-whatsapp")) return;
        openProductModal(id);
      });
      attachTilt(card);
    });
    $all(".pc-fav", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.id);
        showFavoritesOnly();
      });
    });
    $all(".pc-whatsapp", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = state.products.find((p) => p.id === btn.dataset.id);
        if (p) window.open(buildWhatsappLink(productWhatsappMessage(p)), "_blank");
      });
    });
  }

  /* ===================================================================
     MODALS: generic open/close (product modal only — login/dashboard
     now live on their own standalone pages)
     =================================================================== */
  function initModals() {
    $("#productModalClose").addEventListener("click", closeProductModal);
    $("#productModalOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeProductModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProductModal();
    });
  }

  /* ===================================================================
     OWNER AUTH
     =================================================================== */
  function isOwnerLoggedIn() {
    return sessionStorage.getItem(KEYS.ownerSession) === "true";
  }

  /* ===================================================================
     OWNER LOGIN PAGE (owner-login.html)
     =================================================================== */
  function initLoginPage() {
    const brandEl = $("#brandName");
    if (brandEl) brandEl.textContent = state.settings.siteName || "APANA SELECTION";

    // Already logged in on this device/browser — skip straight to the dashboard.
    if (isOwnerLoggedIn()) {
      window.location.href = "owner-dashboard.html";
      return;
    }

    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = $("#loginUsername").value.trim();
      const p = $("#loginPassword").value;

      if (!window.crypto || !window.crypto.subtle) {
        $("#loginError").textContent = "This browser can't run the login check securely. Try a recent version of Chrome, Firefox, Edge or Safari.";
        $("#loginError").hidden = false;
        return;
      }

      const enteredHash = await hashOwnerPassword(p);
      if (u === OWNER_USERNAME && enteredHash === OWNER_PASSWORD_HASH) {
        sessionStorage.setItem(KEYS.ownerSession, "true");
        window.location.href = "owner-dashboard.html";
      } else {
        $("#loginError").textContent = "Incorrect username or password.";
        $("#loginError").hidden = false;
      }
    });
  }

  /* ===================================================================
     OWNER DASHBOARD (owner-dashboard.html)
     =================================================================== */
  function initDashboardPage() {
    // Guard: only reachable when logged in on this browser.
    if (!isOwnerLoggedIn()) {
      window.location.href = "owner-login.html";
      return;
    }

    // Run each dashboard step independently: if one panel's markup is
    // missing or one step throws, the rest of the dashboard (including
    // button wiring further down) still loads instead of silently
    // breaking everything after the failure point.
    const steps = [
      renderDashboardOverview,
      renderVisitorsPanel,
      renderDashboardProductList,
      populateProductCategorySelect,
      resetProductForm,
      populateHomepageForm,
      populateOfferForm,
      populateAboutForm,
      populateShopInfoForm,
      populateContactForm,
      renderCategoryList,
      populateSocialForm,
      populateSettingsForm,
      () => switchDashPanel("overview"),
      initDashboardNav,
      initProductForm,
      initHomepageForm,
      initOfferForm,
      initAboutForm,
      initShopInfoForm,
      initContactForm,
      initCategoryForm,
      initSocialForm,
      initSettingsForm,
    ];
    steps.forEach((step) => {
      try {
        step();
      } catch (err) {
        console.error("Dashboard init step failed:", step.name || step, err);
      }
    });
  }

  function switchDashPanel(name) {
    $all(".dash-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    $all(".dash-link").forEach((l) => l.classList.toggle("active", l.dataset.panel === name));
    $("#dashSidebar").classList.remove("open");
    $(".dash-main").scrollTo && $(".dash-main").scrollTo(0, 0);
  }

  function renderVisitorsPanel() {
    if (!$("#visitorStatsGrid") || !$("#visitorChart")) return; // markup not present on this page
    const log = getVisitorLog();
    const todayCount = log[dateKey(new Date())] || 0;
    const last7 = sumLastNDays(log, 7);
    const thisMonth = sumThisCalendarMonth(log);
    const thisYear = sumThisCalendarYear(log);
    const allTime = parseInt(localStorage.getItem(KEYS.visitors) || "0", 10);

    const cards = [
      ["Today", todayCount],
      ["Last 7 Days", last7],
      ["This Month", thisMonth],
      ["This Year", thisYear],
      ["All Time", allTime],
    ];
    $("#visitorStatsGrid").innerHTML = cards
      .map((c) => `<div class="dash-stat-card"><span class="num">${c[1]}</span><span class="label">${escapeHtml(c[0])}</span></div>`)
      .join("");

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      days.push({
        count: log[key] || 0,
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      });
    }
    const max = Math.max(1, ...days.map((d) => d.count));
    $("#visitorChart").innerHTML = days
      .map(
        (d) => `
      <div class="visitor-bar-col" title="${escapeHtml(d.label)}: ${d.count} visit${d.count === 1 ? "" : "s"}">
        <div class="visitor-bar-track">
          <div class="visitor-bar" style="height:${Math.max(4, (d.count / max) * 100)}%"></div>
        </div>
        <span class="visitor-bar-label">${escapeHtml(d.label)}</span>
      </div>`
      )
      .join("");
  }

  function renderDashboardOverview() {
    const total = state.products.length;
    const newP = state.products.filter((p) => p.newArrival).length;
    const trending = state.products.filter((p) => p.trending).length;
    const available = state.products.filter((p) => p.available).length;
    const visitors = parseInt(localStorage.getItem(KEYS.visitors) || "0", 10);

    const cards = [["Total Products", total]];
    visibleCategories().forEach((c) => {
      const count = state.products.filter((p) => p.category === c.id).length;
      cards.push([c.name, count]);
    });
    cards.push(["New Products", newP]);
    cards.push(["Trending Products", trending]);
    cards.push(["Available Products", available]);
    cards.push(["Website Visitors", visitors]);

    $("#dashStatsGrid").innerHTML = cards
      .map((c) => `<div class="dash-stat-card"><span class="num">${c[1]}</span><span class="label">${escapeHtml(c[0])}</span></div>`)
      .join("");
  }

  function renderDashboardProductList() {
    const wrap = $("#dashProductList");
    if (!state.products.length) {
      wrap.innerHTML = "<p class='form-hint'>No products yet — add your first one from the Add Product tab.</p>";
      return;
    }
    wrap.innerHTML = state.products
      .map(
        (p) => `
      <div class="dash-product-row" data-id="${p.id}">
        <img src="${p.image || placeholderImage(p.name)}" alt="${escapeHtml(p.name)}">
        <div class="dpr-info">
          <div class="dpr-name">${escapeHtml(p.name)}</div>
          <div class="dpr-meta">
            <span>${formatPrice(p.price)}</span>
            <span>${escapeHtml(categoryName(p.category))}</span>
            <span class="dpr-tag ${p.available ? "available" : "unavailable"}">${p.available ? "Available" : "Unavailable"}</span>
          </div>
        </div>
        <div class="dpr-actions">
          <button class="dpr-edit" data-id="${p.id}">Edit</button>
          <button class="dpr-delete danger" data-id="${p.id}">Delete</button>
        </div>
      </div>`
      )
      .join("");

    $all(".dpr-edit", wrap).forEach((btn) =>
      btn.addEventListener("click", () => {
        loadProductIntoForm(btn.dataset.id);
        switchDashPanel("addproduct");
      })
    );
    $all(".dpr-delete", wrap).forEach((btn) =>
      btn.addEventListener("click", () => {
        if (confirm("Delete this product? This cannot be undone.")) {
          deleteProduct(btn.dataset.id);
        }
      })
    );
  }

  function populateProductCategorySelect() {
    const sel = $("#pfCategory");
    sel.innerHTML = state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  }

  function resetProductForm() {
    ui.editingProductId = null;
    $("#productFormHeading").textContent = "Add Product";
    $("#productForm").reset();
    $("#pfId").value = "";
    $("#pfAvailable").checked = true;
    $("#pf360").checked = true;
    $("#pfMainImagePreview").innerHTML = "";
    $("#pfExtraImagesPreview").innerHTML = "";
    $("#pfCancelEdit").hidden = true;
    productDraftImages = { main: "", extra: [] };
  }

  let productDraftImages = { main: "", extra: [] };

  function loadProductIntoForm(id) {
    const p = state.products.find((p) => p.id === id);
    if (!p) return;
    ui.editingProductId = id;
    $("#productFormHeading").textContent = "Edit Product";
    $("#pfId").value = p.id;
    $("#pfName").value = p.name;
    $("#pfPrice").value = p.price;
    $("#pfOldPrice").value = p.oldPrice || "";
    $("#pfCategory").value = p.category;
    $("#pfDescription").value = p.description || "";
    $("#pfSizes").value = (p.sizes || []).join(", ");
    $("#pfColors").value = (p.colors || []).join(", ");
    $("#pfBadge").value = p.badge || "";
    $("#pfAvailable").checked = !!p.available;
    $("#pfNewArrival").checked = !!p.newArrival;
    $("#pfTrending").checked = !!p.trending;
    $("#pfFeatured").checked = !!p.featured;
    $("#pf360").checked = !!p.enable360;

    productDraftImages = { main: p.image || "", extra: (p.images || []).slice() };
    renderImagePreview($("#pfMainImagePreview"), productDraftImages.main ? [productDraftImages.main] : [], true);
    renderImagePreview($("#pfExtraImagesPreview"), productDraftImages.extra, false);
    $("#pfCancelEdit").hidden = false;
  }

  function renderImagePreview(container, images, isSingle) {
    container.innerHTML = images
      .map(
        (src, i) => `
      <span class="thumb-wrap" data-i="${i}">
        <img src="${src}" alt="preview">
        <button type="button" class="thumb-remove" data-i="${i}" data-single="${isSingle}">✕</button>
      </span>`
      )
      .join("");
    $all(".thumb-remove", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.i, 10);
        if (btn.dataset.single === "true") {
          productDraftImages.main = "";
          renderImagePreview($("#pfMainImagePreview"), [], true);
        } else {
          productDraftImages.extra.splice(i, 1);
          renderImagePreview($("#pfExtraImagesPreview"), productDraftImages.extra, false);
        }
      });
    });
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function initProductForm() {
    $("#pfMainImage").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      productDraftImages.main = await fileToDataURL(file);
      renderImagePreview($("#pfMainImagePreview"), [productDraftImages.main], true);
    });
    $("#pfExtraImages").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        const dataUrl = await fileToDataURL(f);
        productDraftImages.extra.push(dataUrl);
      }
      renderImagePreview($("#pfExtraImagesPreview"), productDraftImages.extra, false);
      e.target.value = "";
    });

    $("#pfCancelEdit").addEventListener("click", () => resetProductForm());

    $("#productForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#pfName").value.trim();
      if (!name) return;

      const sizes = $("#pfSizes").value.split(",").map((s) => s.trim()).filter(Boolean);
      const colors = $("#pfColors").value.split(",").map((s) => s.trim()).filter(Boolean);
      const mainImage = productDraftImages.main || placeholderImage(name);
      const extraImages = productDraftImages.extra.length ? productDraftImages.extra : placeholder360Set(name);

      const productData = {
        name,
        price: Number($("#pfPrice").value) || 0,
        oldPrice: Number($("#pfOldPrice").value) || 0,
        category: $("#pfCategory").value,
        description: $("#pfDescription").value.trim(),
        sizes,
        colors,
        badge: $("#pfBadge").value.trim(),
        image: mainImage,
        images: extraImages,
        available: $("#pfAvailable").checked,
        newArrival: $("#pfNewArrival").checked,
        trending: $("#pfTrending").checked,
        featured: $("#pfFeatured").checked,
        enable360: $("#pf360").checked,
      };

      if (ui.editingProductId) {
        const idx = state.products.findIndex((p) => p.id === ui.editingProductId);
        if (idx !== -1) state.products[idx] = { ...state.products[idx], ...productData };
        showToast("Product updated");
      } else {
        state.products.push({ id: uid(), ...productData });
        showToast("Product added");
      }
      persist("products", KEYS.products);
      resetProductForm();
      renderDashboardProductList();
      renderDashboardOverview();
      renderFilters();
      renderProducts();
      renderStats(parseInt(localStorage.getItem(KEYS.visitors) || "0", 10));
      switchDashPanel("products");
    });
  }

  function deleteProduct(id) {
    state.products = state.products.filter((p) => p.id !== id);
    persist("products", KEYS.products);
    renderDashboardProductList();
    renderDashboardOverview();
    renderFilters();
    renderProducts();
    showToast("Product deleted");
  }

  /* ---------- Homepage ---------- */
  function populateHomepageForm() {
    const h = state.homepage;
    $("#hfSiteName").value = h.siteName || "";
    $("#hfHeroHeading").value = h.heroHeading || "";
    $("#hfHeroKicker").value = h.heroKicker || "";
    $("#hfHeroDesc").value = h.heroDesc || "";
    $("#hfBtnPrimary").value = h.btnPrimaryText || "";
    $("#hfShopHeading").value = h.shopHeading || "";
    $("#hfShopDesc").value = h.shopDesc || "";
    $("#hfShowOffer").checked = h.showOffer !== false;
    $("#hfShowAbout").checked = h.showAbout !== false;
    $("#hfShowShopInfo").checked = h.showShopInfo !== false;
    renderImagePreview($("#hfHeroImagePreview"), h.heroImage ? [h.heroImage] : [], true);
    heroImageDraft = h.heroImage || "";
  }
  let heroImageDraft = "";
  function initHomepageForm() {
    $("#hfHeroImage").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      heroImageDraft = await fileToDataURL(file);
      renderImagePreview($("#hfHeroImagePreview"), [heroImageDraft], true);
    });
    $("#homepageForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.homepage = {
        ...state.homepage,
        siteName: $("#hfSiteName").value.trim() || state.homepage.siteName,
        heroHeading: $("#hfHeroHeading").value,
        heroKicker: $("#hfHeroKicker").value,
        heroDesc: $("#hfHeroDesc").value,
        heroImage: heroImageDraft || state.homepage.heroImage,
        btnPrimaryText: $("#hfBtnPrimary").value,
        shopHeading: $("#hfShopHeading").value,
        shopDesc: $("#hfShopDesc").value,
        showOffer: $("#hfShowOffer").checked,
        showAbout: $("#hfShowAbout").checked,
        showShopInfo: $("#hfShowShopInfo").checked,
      };
      persist("homepage", KEYS.homepage);
      renderBrand();
      renderHero();
      renderOffer();
      showToast("Homepage updated");
    });
  }

  /* ---------- Offer ---------- */
  let offerImageDraft = "";
  function populateOfferForm() {
    const o = state.offer;
    $("#ofEnabled").checked = o.enabled !== false;
    $("#ofTag").value = o.tag || "";
    $("#ofTitle").value = o.title || "";
    $("#ofDiscount").value = o.discount || "";
    $("#ofDesc").value = o.description || "";
    $("#ofBtnText").value = o.btnText || "";
    offerImageDraft = o.image || "";
    renderImagePreview($("#ofImagePreview"), o.image ? [o.image] : [], true);
  }
  function initOfferForm() {
    $("#ofImage").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      offerImageDraft = await fileToDataURL(file);
      renderImagePreview($("#ofImagePreview"), [offerImageDraft], true);
    });
    $("#offerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.offer = {
        enabled: $("#ofEnabled").checked,
        tag: $("#ofTag").value,
        title: $("#ofTitle").value,
        discount: $("#ofDiscount").value,
        description: $("#ofDesc").value,
        image: offerImageDraft || state.offer.image,
        btnText: $("#ofBtnText").value,
      };
      persist("offer", KEYS.offer);
      renderOffer();
      showToast("Offer updated");
    });
  }

  /* ---------- About ---------- */
  let aboutImageDraft = "";
  function populateAboutForm() {
    const a = state.about;
    $("#afHeading").value = a.heading || "";
    $("#afDesc").value = a.description || "";
    $("#afStory").value = a.story || "";
    $("#afFeatures").value = (a.features || []).join("\n");
    aboutImageDraft = a.image || "";
    renderImagePreview($("#afImagePreview"), a.image ? [a.image] : [], true);
  }
  function initAboutForm() {
    $("#afImage").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      aboutImageDraft = await fileToDataURL(file);
      renderImagePreview($("#afImagePreview"), [aboutImageDraft], true);
    });
    $("#aboutForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.about = {
        heading: $("#afHeading").value,
        description: $("#afDesc").value,
        story: $("#afStory").value,
        image: aboutImageDraft || state.about.image,
        features: $("#afFeatures").value.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      persist("about", KEYS.about);
      renderAbout();
      showToast("About page updated");
    });
  }

  /* ---------- Shop Info + Contact ---------- */
  function populateShopInfoForm() {
    const s = state.shopInfo;
    $("#siShopName").value = s.shopName || "";
    $("#siAddress").value = s.address || "";
    $("#siPhone").value = s.phone || "";
    $("#siWhatsapp").value = s.whatsapp || "";
    $("#siEmail").value = s.email || "";
    $("#siHours").value = s.hours || "";
    $("#siMapLink").value = s.mapLink || "";
  }
  function initShopInfoForm() {
    $("#shopInfoForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.shopInfo = {
        shopName: $("#siShopName").value.trim(),
        address: $("#siAddress").value.trim(),
        phone: $("#siPhone").value.trim(),
        whatsapp: digitsOnly($("#siWhatsapp").value),
        email: $("#siEmail").value.trim(),
        hours: $("#siHours").value.trim(),
        mapLink: $("#siMapLink").value.trim(),
      };
      persist("shopInfo", KEYS.shopInfo);
      renderBrand();
      renderShopInfoAndContact();
      updateWhatsappLinks();
      showToast("Shop information updated");
    });
  }

  function populateContactForm() {
    const c = state.contact;
    $("#cfHeading").value = c.heading || "";
    $("#cfDesc").value = c.description || "";
  }
  function initContactForm() {
    $("#contactForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.contact = {
        heading: $("#cfHeading").value,
        description: $("#cfDesc").value,
      };
      writeJSON("apana_contact", state.contact);
      renderShopInfoAndContact();
      showToast("Contact page updated");
    });
  }

  /* ---------- Categories ---------- */
  function renderCategoryList() {
    const wrap = $("#categoryList");
    wrap.innerHTML = state.categories
      .map(
        (c) => `
      <div class="dash-list-item" data-id="${c.id}">
        <span class="name">${escapeHtml(c.name)}${c.hidden ? " (hidden)" : ""}</span>
        <div class="dash-list-actions">
          <button class="cat-rename" data-id="${c.id}">Rename</button>
          <button class="cat-toggle" data-id="${c.id}">${c.hidden ? "Unhide" : "Hide"}</button>
          <button class="cat-delete danger" data-id="${c.id}">Delete</button>
        </div>
      </div>`
      )
      .join("");

    $all(".cat-rename", wrap).forEach((btn) =>
      btn.addEventListener("click", () => {
        const cat = state.categories.find((c) => c.id === btn.dataset.id);
        const name = prompt("Rename category", cat.name);
        if (name && name.trim()) {
          cat.name = name.trim();
          persist("categories", KEYS.categories);
          renderCategoryList();
          populateProductCategorySelect();
          renderFilters();
          renderProducts();
          showToast("Category renamed");
        }
      })
    );
    $all(".cat-toggle", wrap).forEach((btn) =>
      btn.addEventListener("click", () => {
        const cat = state.categories.find((c) => c.id === btn.dataset.id);
        cat.hidden = !cat.hidden;
        persist("categories", KEYS.categories);
        renderCategoryList();
        renderFilters();
        renderProducts();
      })
    );
    $all(".cat-delete", wrap).forEach((btn) =>
      btn.addEventListener("click", () => {
        const inUse = state.products.some((p) => p.category === btn.dataset.id);
        if (inUse) {
          alert("This category is used by existing products. Reassign or delete those products first.");
          return;
        }
        if (confirm("Delete this category?")) {
          state.categories = state.categories.filter((c) => c.id !== btn.dataset.id);
          persist("categories", KEYS.categories);
          renderCategoryList();
          populateProductCategorySelect();
          renderFilters();
          renderProducts();
          showToast("Category deleted");
        }
      })
    );
  }
  function initCategoryForm() {
    $("#addCategoryForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#newCategoryName");
      const name = input.value.trim();
      if (!name) return;
      const id = "cat_" + uid();
      state.categories.push({ id, name, hidden: false });
      persist("categories", KEYS.categories);
      input.value = "";
      renderCategoryList();
      populateProductCategorySelect();
      renderFilters();
      renderProducts();
      showToast("Category added");
    });
  }

  /* ---------- Social ---------- */
  function populateSocialForm() {
    const s = state.social;
    $("#socInstagram").value = s.instagram || "";
    $("#socFacebook").value = s.facebook || "";
    $("#socYoutube").value = s.youtube || "";
    $("#socWhatsapp").value = s.whatsapp || "";
  }
  function initSocialForm() {
    $("#socialForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.social = {
        instagram: $("#socInstagram").value.trim(),
        facebook: $("#socFacebook").value.trim(),
        youtube: $("#socYoutube").value.trim(),
        whatsapp: $("#socWhatsapp").value.trim(),
      };
      persist("social", KEYS.social);
      renderSocial();
      showToast("Social links updated");
    });
  }

  /* ---------- Settings ---------- */
  let logoDraft = "";
  let faviconDraft = "";
  function populateSettingsForm() {
    const s = state.settings;
    $("#stSiteName").value = s.siteName || "";
    $("#stFooterText").value = s.footerText || "";
    $("#stCopyright").value = s.copyright || "";
    $("#stDefaultTheme").value = s.defaultTheme || "dark";
    logoDraft = s.logo || "";
    faviconDraft = s.favicon || "";
    renderImagePreview($("#stLogoPreview"), s.logo ? [s.logo] : [], true);
    renderImagePreview($("#stFaviconPreview"), s.favicon ? [s.favicon] : [], true);
  }
  function initSettingsForm() {
    $("#stLogo").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      logoDraft = await fileToDataURL(file);
      renderImagePreview($("#stLogoPreview"), [logoDraft], true);
    });
    $("#stFavicon").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      faviconDraft = await fileToDataURL(file);
      renderImagePreview($("#stFaviconPreview"), [faviconDraft], true);
    });
    $("#stRemoveLogo").addEventListener("click", () => {
      logoDraft = "";
      renderImagePreview($("#stLogoPreview"), [], true);
    });
    $("#settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.settings = {
        siteName: $("#stSiteName").value.trim() || "APANA SELECTION",
        logo: logoDraft,
        favicon: faviconDraft,
        footerText: $("#stFooterText").value,
        copyright: $("#stCopyright").value,
        defaultTheme: $("#stDefaultTheme").value,
      };
      persist("settings", KEYS.settings);
      renderBrand();
      showToast("Settings saved");
    });
  }

  /* ---------- Dashboard nav / logout ---------- */
  function initDashboardNav() {
    $all(".dash-link").forEach((link) => {
      link.addEventListener("click", () => switchDashPanel(link.dataset.panel));
    });
    $("#dashMenuToggle").addEventListener("click", () => $("#dashSidebar").classList.toggle("open"));
    $("#logoutBtn").addEventListener("click", () => {
      sessionStorage.removeItem(KEYS.ownerSession);
      window.location.href = "owner-login.html";
    });
  }

  /* ===================================================================
     INITIALISATION
     =================================================================== */
  function renderAll(visitorCount) {
    renderBrand();
    renderHero();
    renderStats(visitorCount);
    renderFilters();
    renderProducts();
    renderOffer();
    renderAbout();
    renderShopInfoAndContact();
    renderSocial();
    updateFavCount();
    updateWhatsappLinks();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadState();

    // persist any auto-seeded defaults so future loads read from storage
    persist("products", KEYS.products);
    persist("homepage", KEYS.homepage);
    persist("offer", KEYS.offer);
    persist("about", KEYS.about);
    persist("shopInfo", KEYS.shopInfo);
    writeJSON("apana_contact", state.contact);
    persist("categories", KEYS.categories);
    persist("social", KEYS.social);
    persist("settings", KEYS.settings);
    persist("favorites", KEYS.favorites);

    const page = document.body.dataset.page;

    if (page === "site") {
      initTheme();
      const visitorCount = bumpVisitorCount();
      renderAll(visitorCount);

      initHeaderControls();
      initModals();
      initViewerInteractions();
      initScrollReveal();
      initBackToTop();
    } else if (page === "login") {
      initTheme();
      initLoginPage();
    } else if (page === "dashboard") {
      initTheme();
      initDashboardPage();
    }
  });
})();
