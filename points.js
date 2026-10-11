(() => {
  const POINTS_KEY = 'mathmode-points-v2';
  const PURCHASES_KEY = 'mathmode-purchases-v2';
  const EQUIPPED_KEY = 'mathmode-equipped-v2';
  try {
    window.localStorage.removeItem('mathmode-points-v1');
    window.localStorage.removeItem('mathmode-purchases-v1');
    window.localStorage.removeItem('mathmode-equipped-v1');
  } catch (error) {
    // Storage may be unavailable in private browsing.
  }
  const items = [
    { id: 'rainbow-mode', icon: '✦', name: 'Rainbow App', cost: 150, description: 'Makes the whole Math Mode app rainbow.' },
    { id: 'power-up-009', icon: '✦', name: 'Galaxy App', cost: 90, description: 'Gives the whole app a deep galaxy theme.', effect: { theme: 'galaxy' } },
    { id: 'all-game-power-up', icon: '✧', name: 'Girly Background', cost: 125, description: 'Gives the whole app a pink, sparkly theme.', effect: { theme: 'girly' } }
  ];
  const themeIds = ['rainbow-mode', 'power-up-009', 'all-game-power-up'];

  function readPoints() {
    try {
      const value = Number.parseInt(window.localStorage.getItem(POINTS_KEY) || '0', 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function readPurchases() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PURCHASES_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      return {};
    }
  }

  function readEquipped() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(EQUIPPED_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      return {};
    }
  }

  let points = readPoints();
  let purchases = readPurchases();
  let equipped = readEquipped();

  function save() {
    try {
      window.localStorage.setItem(POINTS_KEY, String(points));
      window.localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
      window.localStorage.setItem(EQUIPPED_KEY, JSON.stringify(equipped));
    } catch (error) {
      // The games still work if browser storage is unavailable.
    }
  }

  function saveProgress() {
    save();
    document.querySelectorAll('[data-save-points]').forEach((button) => {
      button.textContent = 'Saved!';
      button.classList.add('saved');
      window.setTimeout(() => {
        button.textContent = 'Save points & power-ups';
        button.classList.remove('saved');
      }, 1600);
    });
    announce({ amount: 0, reason: 'manual save' });
  }

  function owns(id) {
    return Boolean(purchases[id]);
  }

  items.forEach((item) => {
    if (owns(item.id) && typeof equipped[item.id] !== 'boolean') equipped[item.id] = true;
  });

  function isEquipped(id) {
    return owns(id) && Boolean(equipped[id]);
  }

  function equipTheme(id) {
    themeIds.forEach((themeId) => { equipped[themeId] = themeId === id; });
  }

  function rewardMultiplier() {
    return items.reduce((total, item) => {
      return total + (isEquipped(item.id) && item.effect ? Number(item.effect.multiplier || 0) : 0);
    }, 1);
  }

  function actionBonus() {
    return items.reduce((total, item) => {
      return total + (isEquipped(item.id) && item.effect ? Number(item.effect.bonus || 0) : 0);
    }, 0);
  }

  function updateDisplays() {
    document.querySelectorAll('[data-points]').forEach((element) => {
      element.textContent = points;
    });
    document.documentElement.classList.toggle('rainbow-mode', isEquipped('rainbow-mode'));
    document.documentElement.classList.toggle('galaxy-mode', isEquipped('power-up-009'));
    document.documentElement.classList.toggle('girly-mode', isEquipped('all-game-power-up'));
  }

  function announce(change = {}) {
    updateDisplays();
    document.dispatchEvent(new CustomEvent('mathmodepointschange', {
      detail: { points, ...change }
    }));
  }

  function addPoints(baseAmount, reason = 'playing', options = {}) {
    const base = Math.max(0, Math.floor(Number(baseAmount) || 0));
    if (!base) return 0;
    const awarded = options.exact ? base : Math.max(1, Math.round(base * rewardMultiplier() + actionBonus()));
    points += awarded;
    announce({ amount: awarded, reason });
    return awarded;
  }

  function spendPoints(cost) {
    const amount = Math.max(0, Math.floor(Number(cost) || 0));
    if (points < amount) return false;
    points -= amount;
    announce({ amount: -amount, reason: 'shop purchase' });
    return true;
  }

  function buyItem(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item || owns(id) || !spendPoints(item.cost)) return false;
    purchases[id] = true;
    equipped[id] = true;
    if (item.effect && item.effect.theme) equipTheme(id);
    announce({ amount: 0, reason: `bought ${item.name}` });
    return true;
  }

  function toggleEquip(id) {
    if (!owns(id)) return false;
    equipped[id] = !isEquipped(id);
    if (equipped[id] && themeIds.includes(id)) equipTheme(id);
    announce({ amount: 0, reason: `${equipped[id] ? 'equipped' : 'unequipped'} ${id}` });
    return equipped[id];
  }

  window.MathModeWallet = {
    items,
    addPoints,
    buyItem,
    getPoints: () => points,
    getPurchases: () => ({ ...purchases }),
    owns,
    isEquipped,
    toggleEquip,
    saveProgress,
    rewardMultiplier,
    actionBonus,
    updateDisplays
  };

  document.querySelectorAll('[data-save-points]').forEach((button) => {
    button.addEventListener('click', saveProgress);
  });
  updateDisplays();
})();
