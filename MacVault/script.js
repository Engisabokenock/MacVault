// ==========================================
// MacVault - Personal Password & Notes Manager
// ==========================================

// DOM ELEMENTS
const vaultList = document.getElementById("vaultList");
const emptyState = document.getElementById("emptyState");
const modalOverlay = document.getElementById("modalOverlay");
const itemForm = document.getElementById("itemForm");

const itemType = document.getElementById("itemType");
const itemTitle = document.getElementById("itemTitle");
const itemUsername = document.getElementById("itemUsername");
const itemPassword = document.getElementById("itemPassword");
const itemWebsite = document.getElementById("itemWebsite");
const itemContent = document.getElementById("itemContent");
const itemCategory = document.getElementById("itemCategory");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const toast = document.getElementById("toast");

// APPLICATION STATE
let items = JSON.parse(localStorage.getItem("macvaultItems")) || [];
let currentView = "all";
let editingId = null;
let toastTimeout;

// ==========================================
// 1. SAVE DATA
// ==========================================

function saveItems() {
  localStorage.setItem("macvaultItems", JSON.stringify(items));
}

// ==========================================
// 2. NOTIFICATION
// ==========================================

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ==========================================
// 3. MODAL MANAGEMENT
// ==========================================

function openModal(id = null) {
  editingId = id;

  itemForm.reset();

  if (id !== null) {
    const existing = items.find(item => item.id === id);

    if (!existing) return;

    document.getElementById("modalTitle").textContent = "Edit Item";

    itemType.value = existing.type;
    itemTitle.value = existing.title;
    itemCategory.value = existing.category;

    if (existing.type === "password") {
      itemUsername.value = existing.username || "";
      itemPassword.value = existing.password || "";
      itemWebsite.value = existing.website || "";
    } else {
      itemContent.value = existing.content || "";
    }
  } else {
    document.getElementById("modalTitle").textContent = "Add New Item";
    itemType.value = "password";
  }

  updateFormFields();

  modalOverlay.classList.add("open");
  itemTitle.focus();
}

function closeModal() {
  modalOverlay.classList.remove("open");
  editingId = null;
  itemForm.reset();
  updateFormFields();
}

document.getElementById("addButton").addEventListener("click", () => {
  openModal();
});

document.getElementById("emptyAddButton").addEventListener("click", () => {
  openModal();
});

document.getElementById("closeModal").addEventListener("click", closeModal);

document.getElementById("cancelButton").addEventListener("click", closeModal);

modalOverlay.addEventListener("click", event => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
  }
});

// ==========================================
// 4. FORM FIELD SWITCHING
// ==========================================

function updateFormFields() {
  const isPassword = itemType.value === "password";

  document.getElementById("passwordFields")
    .classList.toggle("hidden", !isPassword);

  document.getElementById("noteFields")
    .classList.toggle("hidden", isPassword);

  itemUsername.required = isPassword;
  itemPassword.required = isPassword;
  itemContent.required = !isPassword;
}

itemType.addEventListener("change", updateFormFields);

updateFormFields();

// ==========================================
// 5. ADD AND EDIT ITEMS
// ==========================================

itemForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = itemTitle.value.trim();

  if (!title) {
    showToast("Please enter a title.");
    return;
  }

  const type = itemType.value;

  const itemData = {
    title,
    type,
    category: itemCategory.value,
    updatedAt: Date.now()
  };

  if (type === "password") {
    itemData.username = itemUsername.value.trim();
    itemData.password = itemPassword.value;
    itemData.website = itemWebsite.value.trim();
    itemData.content = "";
  } else {
    itemData.content = itemContent.value.trim();
    itemData.username = "";
    itemData.password = "";
    itemData.website = "";
  }

  if (editingId !== null) {
    const index = items.findIndex(item => item.id === editingId);

    if (index !== -1) {
      items[index] = {
        ...items[index],
        ...itemData
      };
    }

    showToast("Item updated successfully!");
  } else {
    items.unshift({
      id: crypto.randomUUID(),
      ...itemData,
      createdAt: Date.now()
    });

    showToast("New item saved!");
  }

  saveItems();
  renderItems();
  closeModal();
});

// ==========================================
// 6. PASSWORD GENERATOR
// ==========================================

function generatePassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";

  const randomValues = new Uint32Array(20);
  crypto.getRandomValues(randomValues);

  const generated = Array.from(randomValues, value =>
    characters[value % characters.length]
  ).join("");

  itemPassword.value = generated;
  itemPassword.type = "text";

  document.getElementById("toggleInputPassword").textContent = "Hide";

  showToast("Strong password generated!");
}

document.getElementById("generatePassword")
  .addEventListener("click", generatePassword);

// ==========================================
// 7. SHOW / HIDE PASSWORD IN FORM
// ==========================================

document.getElementById("toggleInputPassword")
  .addEventListener("click", () => {
    const button = document.getElementById("toggleInputPassword");

    if (itemPassword.type === "password") {
      itemPassword.type = "text";
      button.textContent = "Hide";
    } else {
      itemPassword.type = "password";
      button.textContent = "Show";
    }
  });

// ==========================================
// 8. PASSWORD VISIBILITY IN CARDS
// ==========================================

function toggleCardPassword(id, button, valueElement) {
  const item = items.find(entry => entry.id === id);

  if (!item) return;

  const visible = button.dataset.visible === "true";

  valueElement.textContent = visible
    ? "••••••••••••"
    : item.password;

  button.dataset.visible = String(!visible);
  button.textContent = visible ? "Show" : "Hide";
}

// ==========================================
// 9. COPY TO CLIPBOARD
// ==========================================

async function copyToClipboard(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const temporary = document.createElement("textarea");

      temporary.value = value;
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";

      document.body.appendChild(temporary);
      temporary.select();

      const copied = document.execCommand("copy");
      temporary.remove();

      if (!copied) throw new Error("Copy failed");
    }

    showToast("Copied to clipboard!");
  } catch (error) {
    showToast("Unable to copy. Check browser permissions.");
  }
}

// ==========================================
// 10. DELETE ITEMS
// ==========================================

function deleteItem(id) {
  const confirmed = confirm(
    "Are you sure you want to delete this item?"
  );

  if (!confirmed) return;

  items = items.filter(item => item.id !== id);

  saveItems();
  renderItems();

  showToast("Item deleted.");
}

// ==========================================
// 11. CREATE VAULT CARD
// ==========================================

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createButton(label, className, callback) {
  const button = createElement("button", className, label);

  button.type = "button";
  button.addEventListener("click", callback);

  return button;
}

function createVaultCard(item) {
  const card = createElement("article", "vault-card");

  // Card header
  const top = createElement("div", "card-top");

  const icon = createElement(
    "div",
    "item-icon",
    item.type === "password" ? "🔑" : "📝"
  );

  const titleContainer = createElement("div", "card-title");

  const title = createElement("h3", "", item.title);

  const subtitle = createElement(
    "p",
    "",
    item.type === "password"
      ? (item.username || "Password entry")
      : "Personal note"
  );

  titleContainer.append(title, subtitle);

  const category = createElement(
    "span",
    "category-tag",
    item.category
  );

  top.append(icon, titleContainer, category);

  // Card details
  const details = createElement("div", "card-details");

  if (item.type === "password") {
    const usernameLabel = createElement(
      "p",
      "detail-label",
      "USERNAME / EMAIL"
    );

    const usernameRow = createElement("div", "detail-value");

    const username = createElement(
      "span",
      "",
      item.username || "Not provided"
    );

    const copyUsername = createButton(
      "Copy",
      "action-btn",
      () => copyToClipboard(item.username || "")
    );

    usernameRow.append(username, copyUsername);

    const passwordLabel = createElement(
      "p",
      "detail-label",
      "PASSWORD"
    );

    passwordLabel.style.marginTop = "13px";

    const passwordRow = createElement("div", "detail-value");

    const passwordValue = createElement(
      "span",
      "",
      "••••••••••••"
    );

    const showButton = createButton(
      "Show",
      "action-btn",
      () => toggleCardPassword(
        item.id,
        showButton,
        passwordValue
      )
    );

    showButton.dataset.visible = "false";

    passwordRow.append(passwordValue, showButton);

    details.append(
      usernameLabel,
      usernameRow,
      passwordLabel,
      passwordRow
    );

    if (item.website) {
      const websiteLabel = createElement(
        "p",
        "detail-label",
        "WEBSITE"
      );

      websiteLabel.style.marginTop = "13px";

      const website = createElement(
        "div",
        "detail-value",
        item.website
      );

      details.append(websiteLabel, website);
    }
  } else {
    const noteLabel = createElement(
      "p",
      "detail-label",
      "NOTE CONTENT"
    );

    const note = createElement(
      "div",
      "detail-value",
      item.content || "Empty note"
    );

    note.style.lineHeight = "1.6";

    details.append(noteLabel, note);
  }

  // Card actions
  const actions = createElement("div", "card-actions");

  if (item.type === "password") {
    actions.append(
      createButton(
        "Copy Password",
        "action-btn",
        () => copyToClipboard(item.password || "")
      )
    );
  } else {
    actions.append(
      createButton(
        "Copy Note",
        "action-btn",
        () => copyToClipboard(item.content || "")
      )
    );
  }

  actions.append(
    createButton(
      "Edit",
      "action-btn",
      () => openModal(item.id)
    )
  );

  actions.append(
    createButton(
      "Delete",
      "action-btn delete-btn",
      () => deleteItem(item.id)
    )
  );

  card.append(top, details, actions);

  return card;
}

// ==========================================
// 12. RENDER VAULT ITEMS
// ==========================================

function renderItems() {
  vaultList.innerHTML = "";

  const searchTerm = searchInput.value.trim().toLowerCase();

  let filteredItems = items.filter(item => {
    const matchesView =
      currentView === "all" || item.type === currentView;

    const searchableText = [
      item.title,
      item.username,
      item.website,
      item.category,
      item.content
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return matchesView && matchesSearch;
  });

  // Sorting
  if (sortSelect.value === "newest") {
    filteredItems.sort((a, b) => b.createdAt - a.createdAt);
  }

  if (sortSelect.value === "oldest") {
    filteredItems.sort((a, b) => a.createdAt - b.createdAt);
  }

  if (sortSelect.value === "alphabetical") {
    filteredItems.sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }

  filteredItems.forEach(item => {
    vaultList.appendChild(createVaultCard(item));
  });

  emptyState.style.display =
    filteredItems.length === 0 ? "block" : "none";

  if (items.length === 0) {
    emptyState.querySelector("h3").textContent =
      "Your vault is empty";

    emptyState.querySelector("p").textContent =
      "Add your first password or personal note to get started.";
  } else if (filteredItems.length === 0) {
    emptyState.querySelector("h3").textContent =
      "No matching items";

    emptyState.querySelector("p").textContent =
      "Try another search or switch your category.";
  }

  updateStatistics();
}

// ==========================================
// 13. DASHBOARD STATISTICS
// ==========================================

function updateStatistics() {
  const passwords = items.filter(
    item => item.type === "password"
  ).length;

  const notes = items.filter(
    item => item.type === "note"
  ).length;

  document.getElementById("totalCount").textContent =
    items.length;

  document.getElementById("allCount").textContent =
    items.length;

  document.getElementById("passwordCount").textContent =
    passwords;

  document.getElementById("noteCount").textContent =
    notes;
}

// ==========================================
// 14. SIDEBAR NAVIGATION
// ==========================================

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".nav-item.active")
      ?.classList.remove("active");

    button.classList.add("active");

    currentView = button.dataset.view;

    const titles = {
      all: "All Items",
      password: "Passwords",
      note: "Secure Notes"
    };

    document.getElementById("pageTitle").textContent =
      titles[currentView];

    document.getElementById("listTitle").textContent =
      currentView === "all"
        ? "Your Items"
        : titles[currentView];

    document.getElementById("currentSection").textContent =
      titles[currentView].toUpperCase();

    renderItems();
  });
});

// ==========================================
// 15. SEARCH AND SORT
// ==========================================

searchInput.addEventListener("input", renderItems);

sortSelect.addEventListener("change", renderItems);

// ==========================================
// 16. DARK / LIGHT THEME
// ==========================================

const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("macvaultTheme");

if (savedTheme === "light") {
  document.body.classList.add("light");
}

function updateTheme() {
  const light = document.body.classList.contains("light");

  themeToggle.textContent = light
    ? "🌙 Switch to dark mode"
    : "☀️ Switch to light mode";
}

updateTheme();

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const theme = document.body.classList.contains("light")
    ? "light"
    : "dark";

  localStorage.setItem("macvaultTheme", theme);

  updateTheme();
});

// ==========================================
// 17. APPLICATION INITIALIZATION
// ==========================================

renderItems();

console.log("--------------------------------");
console.log("MacVault initialized successfully!");
console.log("Total saved items:", items.length);
console.log("Passwords:", items.filter(item =>
  item.type === "password"
).length);
console.log("Notes:", items.filter(item =>
  item.type === "note"
).length);
console.log("--------------------------------");
