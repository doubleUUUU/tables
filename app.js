const STORAGE_KEY = "wedding-seating";

let state = {
  tables: [],
  nextTableNumber: 1,
  nextSide: "left",
};

let activeTableId = null;

const els = {
  tablesLeft: document.getElementById("tablesLeft"),
  tablesRight: document.getElementById("tablesRight"),
  addTableBtn: document.getElementById("addTableBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  tableDialog: document.getElementById("tableDialog"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogSide: document.getElementById("dialogSide"),
  guestNameInput: document.getElementById("guestNameInput"),
  guestChildInput: document.getElementById("guestChildInput"),
  addGuestBtn: document.getElementById("addGuestBtn"),
  guestList: document.getElementById("guestList"),
  deleteTableBtn: document.getElementById("deleteTableBtn"),
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = {
        tables: saved.tables ?? [],
        nextTableNumber: saved.nextTableNumber ?? 1,
        nextSide: saved.nextSide ?? "left",
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTable(id) {
  return state.tables.find((t) => t.id === id);
}

function sideLabel(side) {
  return side === "left" ? "Левая сторона" : "Правая сторона";
}

const GUEST_RADIUS = 118;

function renderTables() {
  els.tablesLeft.innerHTML = "";
  els.tablesRight.innerHTML = "";

  for (const table of state.tables) {
    const zone = table.side === "left" ? els.tablesLeft : els.tablesRight;
    const guests = table.guests;
    const count = guests.length;

    const widget = document.createElement("div");
    widget.className = "table-widget";

    const ring = document.createElement("div");
    ring.className = "guests-ring";
    ring.setAttribute("aria-hidden", "true");

    guests.forEach((guest, i) => {
      const label = document.createElement("span");
      label.className = "guest-label" + (guest.isChild ? " guest-label--child" : "");
      const angle = count > 0 ? (360 / count) * i - 90 : 0;
      label.style.setProperty("--angle", `${angle}deg`);
      label.style.setProperty("--radius", `${GUEST_RADIUS}px`);
      label.textContent = guest.name;
      if (guest.isChild) {
        label.title = `${guest.name} — ребёнок`;
      }
      ring.appendChild(label);
    });

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "table-center";
    btn.dataset.id = table.id;
    btn.setAttribute(
      "aria-label",
      `Стол ${table.number}, ${count} ${pluralGuests(count)}. Нажмите для редактирования`
    );
    btn.innerHTML = `<span class="table-number">${table.number}</span>`;
    btn.addEventListener("click", () => openTableDialog(table.id));

    widget.append(ring, btn);
    zone.appendChild(widget);
  }
}

function pluralGuests(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "гостей";
  if (mod10 === 1) return "гость";
  if (mod10 >= 2 && mod10 <= 4) return "гостя";
  return "гостей";
}

function addTable() {
  const side = state.nextSide;
  state.nextSide = side === "left" ? "right" : "left";

  state.tables.push({
    id: uid(),
    number: state.nextTableNumber++,
    side,
    guests: [],
  });

  save();
  renderTables();
}

function openTableDialog(tableId) {
  activeTableId = tableId;
  const table = getTable(tableId);
  if (!table) return;

  els.dialogTitle.textContent = `Стол ${table.number}`;
  els.dialogSide.textContent = sideLabel(table.side);
  els.guestNameInput.value = "";
  els.guestChildInput.checked = false;

  renderGuestList(table);
  els.tableDialog.showModal();
  els.guestNameInput.focus();
}

function renderGuestList(table) {
  els.guestList.innerHTML = "";

  for (const guest of table.guests) {
    const li = document.createElement("li");
    li.className = "guest-item";

    const nameWrap = document.createElement("span");
    nameWrap.className = "guest-name" + (guest.isChild ? " is-child" : "");
    nameWrap.textContent = guest.name;

    if (guest.isChild) {
      const tag = document.createElement("span");
      tag.className = "guest-tag-child";
      tag.textContent = "ребёнок";
      nameWrap.appendChild(tag);
    }

    const actions = document.createElement("div");
    actions.className = "guest-actions";

    const toggleChild = document.createElement("button");
    toggleChild.type = "button";
    toggleChild.textContent = guest.isChild ? "Взрослый" : "Ребёнок";
    toggleChild.addEventListener("click", () => {
      guest.isChild = !guest.isChild;
      save();
      renderGuestList(table);
      renderTables();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Удалить";
    remove.addEventListener("click", () => {
      table.guests = table.guests.filter((g) => g.id !== guest.id);
      save();
      renderGuestList(table);
      renderTables();
    });

    actions.append(toggleChild, remove);
    li.append(nameWrap, actions);
    els.guestList.appendChild(li);
  }
}

function addGuest() {
  const name = els.guestNameInput.value.trim();
  if (!name || !activeTableId) return;

  const table = getTable(activeTableId);
  if (!table) return;

  table.guests.push({
    id: uid(),
    name,
    isChild: els.guestChildInput.checked,
  });

  els.guestNameInput.value = "";
  els.guestChildInput.checked = false;

  save();
  renderGuestList(table);
  renderTables();
  els.guestNameInput.focus();
}

function deleteTable() {
  if (!activeTableId) return;
  if (!confirm("Удалить этот стол и всех гостей за ним?")) return;

  state.tables = state.tables.filter((t) => t.id !== activeTableId);
  activeTableId = null;
  save();
  renderTables();
  els.tableDialog.close();
}

function clearAll() {
  if (state.tables.length === 0) return;
  if (!confirm("Удалить все столы? Данные нельзя восстановить.")) return;

  state.tables = [];
  state.nextTableNumber = 1;
  state.nextSide = "left";
  save();
  renderTables();
}

els.addTableBtn.addEventListener("click", addTable);
els.clearAllBtn.addEventListener("click", clearAll);
els.addGuestBtn.addEventListener("click", addGuest);
els.deleteTableBtn.addEventListener("click", deleteTable);

els.guestNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addGuest();
  }
});

load();
renderTables();
