(() => {
  const wallet = window.MathModeWallet;
  const pointsElement = document.getElementById('shop-points');
  const shopMessage = document.getElementById('shop-message');
  const shopGrid = document.getElementById('shop-items');

  function showMessage(text, tone = '') {
    shopMessage.textContent = text;
    shopMessage.className = `small-note ${tone}`;
  }

  function renderShop() {
    pointsElement.textContent = wallet.getPoints();
    shopGrid.innerHTML = wallet.items.map((item) => {
      const owned = wallet.owns(item.id);
      const equipped = wallet.isEquipped(item.id);
      return `<article class="shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
        <div class="shop-item-icon" aria-hidden="true">${item.icon}</div>
        <div class="shop-item-copy"><h2>${item.name}</h2><p>${item.description}</p><span class="shop-status">${owned ? (equipped ? 'EQUIPPED' : 'OWNED') : `COST: ${item.cost} POINTS`}</span></div>
        ${owned ? `<button class="shop-buy shop-equip ${equipped ? 'equipped' : ''}" type="button" data-toggle-item="${item.id}">${equipped ? 'Unequip' : 'Equip'}</button>` : `<button class="shop-buy" type="button" data-buy-item="${item.id}">Buy for ${item.cost} pts</button>`}
      </article>`;
    }).join('');

    shopGrid.querySelectorAll('[data-buy-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = wallet.items.find((entry) => entry.id === button.dataset.buyItem);
        if (!item || wallet.getPoints() < item.cost) {
          showMessage(`You need ${item.cost - wallet.getPoints()} more points for that item.`, 'bad');
          return;
        }
        if (wallet.buyItem(item.id)) {
          renderShop();
          showMessage(`${item.name} is ready to use!`, 'good');
        }
      });
    });
    shopGrid.querySelectorAll('[data-toggle-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = wallet.items.find((entry) => entry.id === button.dataset.toggleItem);
        if (!item) return;
        const equipped = wallet.toggleEquip(item.id);
        renderShop();
        showMessage(`${item.name} ${equipped ? 'equipped' : 'unequipped'}.`, equipped ? 'good' : '');
      });
    });
  }

  document.addEventListener('mathmodepointschange', renderShop);
  renderShop();
})();
