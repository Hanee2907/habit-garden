// ================================
// Habit Garden - every habit is a plant
// ================================

// ----- Plant types you can choose -----
const SEEDS = {
  sunflower: { name: 'Sunflower' },
  tulip:     { name: 'Tulip' },
  lavender:  { name: 'Lavender' },
  cactus:    { name: 'Cactus' }
};

// Growth stages (streak needed -> stage)
const STAGES = [
  { min: 0,  name: 'Seed' },
  { min: 1,  name: 'Sprout' },
  { min: 3,  name: 'Young plant' },
  { min: 7,  name: 'Bud' },
  { min: 14, name: 'Flower' },
  { min: 30, name: 'Full bloom' }
];

// ----- Page elements -----
const beds = document.getElementById('beds');
const garden = document.getElementById('garden');
const nameInput = document.getElementById('habit-name');
const formError = document.getElementById('form-error');

// ----- App state -----
let habits = loadHabits();
let selectedSeed = 'sunflower';


// ================================
// Saving and loading
// ================================

function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem('habit-garden')) || [];
  } catch (error) {
    return [];
  }
}

function saveHabits() {
  localStorage.setItem('habit-garden', JSON.stringify(habits));
}


// ================================
// Date helpers ("YYYY-MM-DD" in local time)
// ================================

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function fromKey(key) {
  const p = key.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function daysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return toKey(date);
}

function todayKey() {
  return daysAgo(0);
}

// Whole days between two keys
function daysBetween(fromK, toK) {
  return Math.round((fromKey(toK) - fromKey(fromK)) / 86400000);
}


// ================================
// The garden rules
// ================================

// How many days since this plant was last watered?
function daysSinceWatered(habit) {
  if (habit.checks.length === 0) return daysBetween(habit.created, todayKey());
  const last = habit.checks.slice().sort().pop();
  return daysBetween(last, todayKey());
}

// The "run" of waterings that ends at the last watering.
// Plants are kind: missing ONE day doesn't break the run.
function lastRun(habit) {
  const sorted = habit.checks.slice().sort();
  if (sorted.length === 0) return 0;

  let run = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap <= 2) run++;
    else break;
  }
  return run;
}

// Current streak: the run only counts if you watered in the last 2 days
function currentStreak(habit) {
  return daysSinceWatered(habit) <= 2 ? lastRun(habit) : 0;
}

function bestStreak(habit) {
  const sorted = habit.checks.slice().sort();
  let best = 0;
  let run = 0;
  sorted.forEach(function (key, i) {
    if (i > 0 && daysBetween(sorted[i - 1], key) <= 2) run++;
    else run = 1;
    best = Math.max(best, run);
  });
  return best;
}

// The plant keeps its size from its last run, even while wilting
function stageOf(habit) {
  const run = lastRun(habit);
  let stage = 0;
  STAGES.forEach(function (s, i) {
    if (run >= s.min) stage = i;
  });
  return stage;
}

function healthOf(habit) {
  const days = daysSinceWatered(habit);
  if (days <= 1) return 'happy';
  if (days <= 3) return 'thirsty';
  return 'wilted';
}

function wateredToday(habit) {
  return habit.checks.includes(todayKey());
}


// ================================
// Drawing plants with SVG
// ================================

function leafShape(x, y, side, size, color) {
  const cx = x + side * size * 0.8;
  return '<ellipse cx="' + cx + '" cy="' + y + '" rx="' + size + '" ry="' + (size * 0.42) + '"' +
    ' transform="rotate(' + (side * -28) + ' ' + cx + ' ' + y + ')" fill="' + color + '"/>';
}

function flowerHead(type, x, y, stage) {
  let svg = '';
  const big = stage === 5 ? 1.25 : 1;

  if (type === 'sunflower') {
    if (stage === 3) {
      return '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#6fae3c"/><circle cx="' + x + '" cy="' + (y - 5) + '" r="3" fill="#ffc93c"/>';
    }
    const r = 15 * big;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * 360;
      svg += '<ellipse cx="' + x + '" cy="' + (y - r) + '" rx="' + (r * 0.32) + '" ry="' + (r * 0.62) + '"' +
        ' fill="#ffc93c" transform="rotate(' + angle + ' ' + x + ' ' + y + ')"/>';
    }
    svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.62) + '" fill="#7a4a24"/>';
    svg += '<circle cx="' + (x - 3) + '" cy="' + (y - 3) + '" r="' + (r * 0.2) + '" fill="#9b6334"/>';
    return svg;
  }

  if (type === 'tulip') {
    if (stage === 3) {
      return '<path d="M' + (x - 6) + ' ' + y + ' Q' + x + ' ' + (y - 22) + ' ' + (x + 6) + ' ' + y + ' Z" fill="#ff8a9b"/>';
    }
    const s = 13 * big;
    svg += '<path d="M' + (x - s) + ' ' + (y - 4) +
      ' Q' + (x - s * 1.1) + ' ' + (y - s * 1.9) + ' ' + (x - s * 0.45) + ' ' + (y - s * 2.1) +
      ' L' + x + ' ' + (y - s * 1.3) +
      ' L' + (x + s * 0.45) + ' ' + (y - s * 2.1) +
      ' Q' + (x + s * 1.1) + ' ' + (y - s * 1.9) + ' ' + (x + s) + ' ' + (y - 4) +
      ' Q' + x + ' ' + (y + s * 0.6) + ' ' + (x - s) + ' ' + (y - 4) + ' Z" fill="#ff5d73"/>';
    svg += '<path d="M' + x + ' ' + (y - s * 1.3) + ' Q' + (x + 2) + ' ' + (y - s * 0.6) + ' ' + x + ' ' + y + '" stroke="#e8435a" stroke-width="2" fill="none"/>';
    return svg;
  }

  if (type === 'lavender') {
    const spikes = stage === 3 ? 4 : stage === 4 ? 7 : 9;
    const color = stage === 3 ? '#b9a3e8' : '#8b6bd6';
    for (let i = 0; i < spikes; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      svg += '<ellipse cx="' + (x + side * 3.5) + '" cy="' + (y + 4 - i * 5.5) + '" rx="4" ry="5.5" fill="' + color + '"/>';
    }
    return svg;
  }

  return svg;
}

function drawCactus(stage) {
  const heights = [0, 18, 36, 56, 72, 86];
  const h = heights[stage];
  const top = 136 - h;
  let svg = '';

  // Arms
  if (stage >= 3) {
    svg += '<path d="M58 ' + (top + h * 0.55) + ' H46 Q40 ' + (top + h * 0.55) + ' 40 ' + (top + h * 0.45) + ' V' + (top + h * 0.25) + '" stroke="#4f9e5c" stroke-width="12" stroke-linecap="round" fill="none"/>';
  }
  if (stage >= 4) {
    svg += '<path d="M82 ' + (top + h * 0.45) + ' H94 Q100 ' + (top + h * 0.45) + ' 100 ' + (top + h * 0.35) + ' V' + (top + h * 0.12) + '" stroke="#4f9e5c" stroke-width="12" stroke-linecap="round" fill="none"/>';
  }

  // Body
  svg += '<rect x="56" y="' + top + '" width="28" height="' + (h + 4) + '" rx="14" fill="#5fb36b"/>';
  svg += '<line x1="70" y1="' + (top + 8) + '" x2="70" y2="' + (top + h) + '" stroke="#4f9e5c" stroke-width="2"/>';

  // Little spines
  for (let y = top + 10; y < 132; y += 12) {
    svg += '<circle cx="62" cy="' + y + '" r="1.2" fill="#e9f5d0"/><circle cx="78" cy="' + (y + 5) + '" r="1.2" fill="#e9f5d0"/>';
  }

  // Flowers on top
  if (stage >= 4) {
    svg += '<circle cx="70" cy="' + (top - 2) + '" r="7" fill="#ff7eb3"/><circle cx="70" cy="' + (top - 2) + '" r="2.5" fill="#ffd166"/>';
  }
  if (stage === 5) {
    svg += '<circle cx="100" cy="' + (top + h * 0.12 - 7) + '" r="5.5" fill="#ff9ec7"/><circle cx="100" cy="' + (top + h * 0.12 - 7) + '" r="2" fill="#ffd166"/>';
  }
  return svg;
}

function drawPlant(type, stage, health) {
  // Pot and soil
  let svg = '<svg viewBox="0 0 140 180" aria-hidden="true">';
  svg += '<path d="M40 142 H100 L93 178 H47 Z" fill="#d9774a"/>';
  svg += '<path d="M44 142 H58 L54 178 H47 Z" fill="#e8895a" opacity="0.7"/>';
  svg += '<rect x="35" y="132" width="70" height="13" rx="6.5" fill="#e8895a"/>';
  svg += '<ellipse cx="70" cy="134" rx="30" ry="4" fill="#6b4b33"/>';

  // Thirsty and wilted plants lean over
  const lean = health === 'wilted' ? 26 : health === 'thirsty' ? 9 : 0;
  svg += '<g transform="rotate(' + lean + ' 70 134)"><g class="sway">';

  if (stage === 0) {
    svg += '<ellipse cx="70" cy="130" rx="8" ry="5.5" fill="#8b5a2b"/>';
    svg += '<path d="M70 126 q2 -5 6 -6" stroke="#6fae3c" stroke-width="2" fill="none" stroke-linecap="round"/>';
  } else if (type === 'cactus') {
    svg += drawCactus(stage);
  } else {
    const heights = [0, 24, 48, 72, 90, 106];
    const h = heights[stage];
    const topY = 134 - h;
    const leafColor = type === 'lavender' ? '#7fa86b' : '#5cb85c';

    // Stem
    svg += '<path d="M70 134 Q' + (66 + stage) + ' ' + (134 - h / 2) + ' 70 ' + topY + '" stroke="#3f8f3a" stroke-width="' + (2 + stage * 0.6) + '" fill="none" stroke-linecap="round"/>';

    // Leaves along the stem
    const pairs = Math.min(stage + 1, 5);
    for (let i = 1; i <= pairs; i++) {
      const y = 134 - h * (i / (pairs + 1));
      const side = i % 2 === 0 ? 1 : -1;
      const size = 6 + stage * 1.6 - i * 0.6;
      svg += leafShape(70, y, side, size, i % 2 ? leafColor : '#7ccf63');
    }

    // Tiny top leaves for sprouts
    if (stage <= 2) {
      svg += leafShape(70, topY, -1, 5 + stage, '#7ccf63') + leafShape(70, topY, 1, 5 + stage, '#5cb85c');
    } else {
      svg += flowerHead(type, 70, topY, stage);
    }
  }

  svg += '</g></g>';

  // Sparkles for full bloom
  if (stage === 5 && health === 'happy') {
    svg += '<text x="22" y="40" font-size="14">✨</text><text x="108" y="70" font-size="11">✨</text>';
  }

  svg += '</svg>';
  return svg;
}


// ================================
// Showing the garden
// ================================

let firstRender = true;

function renderGarden(wateredId) {
  beds.innerHTML = '';
  document.getElementById('empty').classList.toggle('hidden', habits.length > 0);

  habits.forEach(function (habit) {
    const stage = stageOf(habit);
    const health = healthOf(habit);
    const streak = currentStreak(habit);
    const done = wateredToday(habit);
    const missed = daysSinceWatered(habit);

    let status = '';
    if (health === 'happy') {
      status = streak > 0 ? '🔥 ' + streak + ' day streak' : 'Ready to grow';
    } else if (health === 'thirsty') {
      status = missed === 2
        ? '<span class="mood-thirsty">💧 Thirsty! Water today to keep your streak</span>'
        : '<span class="mood-thirsty">💧 Thirsty, streak lost</span>';
    } else {
      status = '<span class="mood-wilted">🥀 Wilting, ' + missed + ' days without water</span>';
    }

    // Last 7 days as dots
    let dots = '';
    for (let i = 6; i >= 0; i--) {
      dots += '<span class="' + (habit.checks.includes(daysAgo(i)) ? 'on' : '') + '"></span>';
    }

    const plant = document.createElement('div');
    plant.className = 'plant ' + health;
    if (habit.id === wateredId) plant.classList.add('watering');
    plant.dataset.id = habit.id;
    plant.innerHTML =
      '<button class="remove-btn" aria-label="Remove ' + escapeHTML(habit.name) + '">×</button>' +
      '<div class="drops"><i></i><i></i><i></i></div>' +
      (stage === 5 && health === 'happy' ? '<span class="butterfly">🦋</span><span class="butterfly b2">🦋</span>' : '') +
      drawPlant(habit.type, stage, health) +
      '<div class="plant-info">' +
        '<p class="plant-name">' + escapeHTML(habit.name) + '</p>' +
        '<p class="plant-status">' + status + '</p>' +
        '<button class="water-btn ' + (done ? 'done' : '') + '">' + (done ? '✓ Watered' : '💧 Water') + '</button>' +
        '<div class="week-dots" title="Last 7 days">' + dots + '</div>' +
      '</div>';

    plant.querySelector('.water-btn').addEventListener('click', function () {
      toggleWater(habit.id);
    });
    plant.querySelector('.remove-btn').addEventListener('click', function (event) {
      removeHabit(habit.id, event.currentTarget);
    });

    beds.appendChild(plant);
  });

  // Only the first render pops plants in; later renders stay still
  if (!firstRender) {
    beds.querySelectorAll('.plant').forEach(function (p) { p.style.animation = 'none'; });
  }
  firstRender = false;

  updateStats();
  updateGreeting();
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// ================================
// Watering, planting and removing
// ================================

function toggleWater(id) {
  const habit = habits.find(function (h) { return h.id === id; });
  const today = todayKey();
  const oldStage = stageOf(habit);

  if (wateredToday(habit)) {
    // Undo today's watering
    habit.checks = habit.checks.filter(function (k) { return k !== today; });
    saveHabits();
    renderGarden();
    return;
  }

  habit.checks.push(today);
  saveHabits();
  renderGarden(id);

  // Celebrate when the plant grows to a new stage
  const newStage = stageOf(habit);
  if (newStage > oldStage) {
    const messages = ['', '🌱 ' + habit.name + ' sprouted!', '🌿 ' + habit.name + ' is growing strong!',
      '🫛 ' + habit.name + ' has a bud! 7 days!', '🌼 ' + habit.name + ' is flowering! 14 days!',
      '🦋 ' + habit.name + ' is in full bloom! 30 days!'];
    showToast(messages[newStage]);
  }

  if (habits.every(wateredToday)) {
    showToast('🎉 The whole garden is watered today!');
  }
}

function removeHabit(id, button) {
  // First click asks, second click removes
  if (!button.classList.contains('sure')) {
    button.classList.add('sure');
    button.textContent = 'Remove?';
    setTimeout(function () {
      button.classList.remove('sure');
      button.textContent = '×';
    }, 3000);
    return;
  }
  habits = habits.filter(function (h) { return h.id !== id; });
  saveHabits();
  renderGarden();
}

document.getElementById('plant-btn').addEventListener('click', function () {
  const name = nameInput.value.trim();

  if (name.length < 2) {
    formError.textContent = 'Give your habit a short name, like "Read 10 pages".';
    return;
  }
  if (habits.length >= 12) {
    formError.textContent = 'Your garden is full! Remove a plant to make space.';
    return;
  }
  if (habits.some(function (h) { return h.name.toLowerCase() === name.toLowerCase(); })) {
    formError.textContent = 'You already have that habit growing.';
    return;
  }

  habits.push({
    id: Date.now().toString(36),
    name: name,
    type: selectedSeed,
    created: todayKey(),
    checks: []
  });
  saveHabits();
  nameInput.value = '';
  firstRender = true; // let the new plant pop in
  renderGarden();
  showToast('🌱 ' + name + ' was planted!');
  garden.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

nameInput.addEventListener('input', function () {
  formError.textContent = '';
});

nameInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') document.getElementById('plant-btn').click();
});

function buildSeedPicker() {
  const picker = document.getElementById('seed-picker');
  Object.keys(SEEDS).forEach(function (type) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'seed' + (type === selectedSeed ? ' selected' : '');
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', type === selectedSeed);
    button.innerHTML = drawPlant(type, 4, 'happy') + SEEDS[type].name;
    button.addEventListener('click', function () {
      selectedSeed = type;
      picker.querySelectorAll('.seed').forEach(function (b) {
        b.classList.toggle('selected', b === button);
        b.setAttribute('aria-checked', b === button);
      });
    });
    picker.appendChild(button);
  });
}


// ================================
// Stats, level and heatmap
// ================================

function updateStats() {
  const total = habits.reduce(function (sum, h) { return sum + h.checks.length; }, 0);
  const watered = habits.filter(wateredToday).length;
  const best = habits.reduce(function (max, h) { return Math.max(max, bestStreak(h)); }, 0);

  // Health: happy = 100, thirsty = 60, wilted = 20
  const points = { happy: 100, thirsty: 60, wilted: 20 };
  const health = habits.length
    ? Math.round(habits.reduce(function (sum, h) { return sum + points[healthOf(h)]; }, 0) / habits.length)
    : 100;

  document.getElementById('stat-today').textContent = watered + '/' + habits.length;
  document.getElementById('stat-best').textContent = best + (best === 1 ? ' day' : ' days');
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-health').textContent = health + '%';

  // Every 10 waterings = 1 gardener level
  const level = Math.floor(total / 10) + 1;
  document.getElementById('level').textContent = level;
  document.getElementById('level-fill').style.width = (total % 10) * 10 + '%';
  document.getElementById('level-hint').textContent = (10 - (total % 10)) + ' more waterings to level ' + (level + 1);

  // 14-day heatmap
  const heatmap = document.getElementById('heatmap');
  if (habits.length === 0) {
    heatmap.innerHTML = '<p class="heat-empty">Plant a habit to see your history here.</p>';
    return;
  }
  heatmap.innerHTML = habits.map(function (h) {
    let cells = '';
    for (let i = 13; i >= 0; i--) {
      const key = daysAgo(i);
      const classes = 'heat-cell' + (h.checks.includes(key) ? ' on' : '') + (i === 0 ? ' today' : '');
      cells += '<span class="' + classes + '" title="' + key + '"></span>';
    }
    return '<div class="heat-row"><span class="heat-name">' + escapeHTML(h.name) + '</span>' + cells + '</div>';
  }).join('');
}

function updateGreeting() {
  const hour = new Date().getHours();
  let hello = 'Good evening';
  if (hour < 5) hello = 'Hello, night owl';
  else if (hour < 12) hello = 'Good morning';
  else if (hour < 18) hello = 'Good afternoon';

  const thirsty = habits.filter(function (h) { return !wateredToday(h); }).length;
  let line = '';
  if (habits.length === 0) line = hello + '! Let\'s plant something.';
  else if (thirsty === 0) line = hello + '! Every plant is happy today 🌞';
  else line = hello + '! ' + thirsty + (thirsty === 1 ? ' plant is' : ' plants are') + ' waiting for water 💧';

  document.getElementById('greeting').textContent = line;
}


// ================================
// Seasons, day and night
// ================================

function setScene() {
  const now = new Date();
  const month = now.getMonth(); // 0 = January
  const hour = now.getHours();

  let season = 'winter';
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'autumn';

  const isNight = hour >= 19 || hour < 6;
  garden.classList.add('season-' + season);
  if (isNight) garden.classList.add('is-night');

  const badges = { spring: '🌸 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' };
  document.getElementById('season-badge').textContent = badges[season] + (isNight ? ' night' : '');

  // Falling things that match the season (fireflies on warm nights)
  let kind = { spring: 'petal', summer: 'petal', autumn: 'leaf', winter: 'snow' }[season];
  if (isNight && season !== 'winter') kind = 'firefly';
  if (season === 'summer' && !isNight) kind = null; // clear summer sky

  const particles = document.getElementById('particles');
  if (!kind) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('span');
    p.className = 'particle ' + kind;
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (kind === 'firefly' ? 3 + Math.random() * 3 : 8 + Math.random() * 8) + 's';
    p.style.animationDelay = (Math.random() * -16) + 's';
    if (kind === 'firefly') p.style.top = 40 + Math.random() * 50 + '%';
    particles.appendChild(p);
  }
}


// ================================
// Toasts, demo garden and reset
// ================================

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.getElementById('toasts').appendChild(toast);
  setTimeout(function () { toast.remove(); }, 3100);
}

function range(from, to) {
  // Keys for "from days ago" up to "to days ago"
  const keys = [];
  for (let i = from; i <= to; i++) keys.push(daysAgo(i));
  return keys;
}

document.getElementById('demo-btn').addEventListener('click', function () {
  habits = [
    { id: 'd1', name: 'Read 10 pages', type: 'sunflower', created: daysAgo(40), checks: range(0, 33) },
    { id: 'd2', name: 'Drink 8 glasses of water', type: 'tulip', created: daysAgo(20), checks: range(1, 6).concat(range(8, 16)) },
    { id: 'd3', name: 'Morning stretch', type: 'lavender', created: daysAgo(15), checks: range(2, 10) },
    { id: 'd4', name: 'Practice guitar', type: 'cactus', created: daysAgo(14), checks: range(6, 10) },
    { id: 'd5', name: 'No phone after 10pm', type: 'sunflower', created: daysAgo(2), checks: range(0, 1) }
  ];
  saveHabits();
  firstRender = true;
  renderGarden();
  showToast('🌻 Welcome to the demo garden!');
});

document.getElementById('reset-btn').addEventListener('click', function () {
  const button = document.getElementById('reset-btn');
  if (button.dataset.sure !== 'yes') {
    button.dataset.sure = 'yes';
    button.textContent = 'Click again to clear the garden';
    setTimeout(function () {
      button.dataset.sure = '';
      button.textContent = 'Start a fresh garden';
    }, 3000);
    return;
  }
  habits = [];
  saveHabits();
  button.dataset.sure = '';
  button.textContent = 'Start a fresh garden';
  renderGarden();
});


// ================================
// Start
// ================================

setScene();
buildSeedPicker();
renderGarden();
