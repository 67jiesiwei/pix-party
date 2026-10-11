(() => {
  const params = new URLSearchParams(window.location.search);
  const selectedGame = params.get('game') || 'bowmasters';
  const mount = document.getElementById('game-mount');
  const title = document.getElementById('game-title');
  const kicker = document.getElementById('game-kicker');
  const scoreElement = document.getElementById('score');

  const games = {
    bowmasters: { title: 'Bowmasters', kicker: '01 · AIM + SHOOT', render: renderBowmasters },
    bridge: { title: 'Draw Bridge', kicker: '02 · SOLVE + DRAW', render: renderBridge },
    mining: { title: '67 Clicker', kicker: '03 · CLICK + UPGRADE', render: render67Clicker }
  };

  let score = 0;
  const game = games[selectedGame] || games.bowmasters;
  title.textContent = game.title;
  kicker.textContent = game.kicker;
  game.render();

  function addScore(points, walletOptions = {}) {
    score += points;
    scoreElement.textContent = score;
    scoreElement.classList.remove('pop-in');
    void scoreElement.offsetWidth;
    scoreElement.classList.add('pop-in');
    if (window.MathModeWallet) window.MathModeWallet.addPoints(points, `${game.title} play`, walletOptions);
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function makeAddition() {
    const left = randomInt(2, 9);
    const right = randomInt(1, 9);
    return { text: `${left} + ${right}`, answer: left + right };
  }

  function makeMultiplication() {
    const left = randomInt(2, 5);
    const right = randomInt(2, 9);
    return { text: `${left} × ${right}`, answer: left * right };
  }

  function makeAnswers(answer, spread = 5) {
    const answers = new Set([answer]);
    while (answers.size < 3) answers.add(Math.max(1, answer + randomInt(-spread, spread)));
    return [...answers].sort(() => Math.random() - 0.5);
  }

  function answerButtons(question, onAnswer, className = '') {
    const wrapper = document.createElement('div');
    wrapper.className = `answer-grid ${className}`;
    makeAnswers(question.answer).forEach((value) => {
      const button = document.createElement('button');
      button.className = 'answer-button';
      button.textContent = value;
      button.type = 'button';
      button.addEventListener('click', () => onAnswer(value, button, wrapper));
      wrapper.appendChild(button);
    });
    return wrapper;
  }

  function setMessage(element, text, tone = '') {
    element.textContent = text;
    element.className = `small-note ${tone}`;
  }

  function renderBowmasters() {
    mount.innerHTML = `
      <div class="game-layout bow-layout">
        <section class="game-board bow-board" aria-label="Bowmasters target board">
          <div class="game-sky"></div><div class="big-sun"></div>
          <div class="enemy enemy-one" data-enemy="one" aria-label="Enemy one"><span class="enemy-name">BLOB</span><div class="healthbar enemy-health"><span></span></div><div class="enemy-hat"></div><div class="enemy-face"><i></i><i></i><b></b></div><div class="enemy-body"><span>!</span></div></div>
          <div class="enemy enemy-two" data-enemy="two" aria-label="Enemy two"><span class="enemy-name">BOT</span><div class="healthbar enemy-health"><span></span></div><div class="enemy-antenna"></div><div class="enemy-face"><i></i><i></i><b></b></div><div class="enemy-body"><span>×</span></div></div>
          <div class="board-archer"><div class="healthbar player-health"><span></span></div><div class="big-head"></div><div class="big-body"></div><div class="big-bow"></div></div>
          <div class="bow-arrow-live"></div><div class="arrow-projectile" aria-hidden="true"></div><div class="enemy-projectile" aria-hidden="true"></div><div class="aim-reticle" aria-hidden="true">+</div><span class="aim-label">MOVE MOUSE TO AIM · CLICK TO SHOOT</span>
        </section>
        <aside class="game-panel">
          <h2>Take aim!</h2>
          <p>Move your mouse anywhere—even above the archer—to aim. Click to send the arrow across the arena.</p>
          <div class="aim-guide"><span class="guide-dot"></span><div><strong>Mouse = aim</strong><small>Find an enemy</small></div><span class="guide-arrow">→</span><div><strong>Click = shoot</strong><small>Hit both enemies</small></div></div>
          <div class="enemy-legend"><span class="legend-enemy legend-blob"></span><span>Blob</span><span class="legend-enemy legend-bot"></span><span>Bot</span></div>
          <p class="small-note" id="bow-message">Two enemies are moving. Track them and make your shot!</p>
          <div class="tip-box"><strong>Quick tip</strong>Aim at the enemy’s face for an easy hit. You get 15 points per hit.</div>
        </aside>
      </div>`;

    const board = document.querySelector('.bow-board');
    const archer = document.querySelector('.board-archer');
    const arrow = document.querySelector('.bow-arrow-live');
    const projectile = document.querySelector('.arrow-projectile');
    const enemyProjectile = document.querySelector('.enemy-projectile');
    const reticle = document.querySelector('.aim-reticle');
    const enemies = [...document.querySelectorAll('.enemy')];
    const messageElement = document.getElementById('bow-message');
    const playerHealthFill = document.querySelector('.player-health span');
    const player = document.querySelector('.board-archer');
    const enemyHealth = { one: 100, two: 100 };
    let playerHealth = 100;
    let aimingPoint = null;
    let shotCooldown = false;
    let gameOver = false;

    function setHealth(fill, value) {
      fill.style.width = `${Math.max(0, value)}%`;
      fill.parentElement.setAttribute('aria-label', `${Math.max(0, value)} percent health`);
    }

    function damageEnemy(enemy, damage = 50) {
      const id = enemy.dataset.enemy;
      enemyHealth[id] = Math.max(0, enemyHealth[id] - damage);
      setHealth(enemy.querySelector('.enemy-health span'), enemyHealth[id]);
      enemy.classList.remove('hit');
      void enemy.offsetWidth;
      enemy.classList.add('hit');
      setTimeout(() => enemy.classList.remove('hit'), 260);
      addScore(15);
      if (enemyHealth[id] === 0) {
        enemy.classList.add('defeated');
        const enemiesRemaining = enemies.some((otherEnemy) => !otherEnemy.classList.contains('defeated'));
        if (enemiesRemaining) {
          setMessage(messageElement, 'Enemy down! Keep your eyes on the other one.', 'good');
        } else {
          gameOver = true;
          setMessage(messageElement, 'Both enemies are down! You win — refresh to play again.', 'good');
        }
      } else {
        setMessage(messageElement, `${enemy.querySelector('.enemy-name').textContent} is at ${enemyHealth[id]}% health. Fire again!`, 'good');
      }
    }

    function damagePlayer(damage = 20) {
      playerHealth = Math.max(0, playerHealth - damage);
      setHealth(playerHealthFill, playerHealth);
      player.classList.remove('damaged');
      void player.offsetWidth;
      player.classList.add('damaged');
      setTimeout(() => player.classList.remove('damaged'), 320);
      if (playerHealth === 0) {
        gameOver = true;
        setMessage(messageElement, 'Your health is empty! Refresh to try again.', 'bad');
      } else {
        setMessage(messageElement, `You got hit! Your health is at ${playerHealth}%.`, 'bad');
      }
    }

    function pointerPosition(event) {
      const rect = board.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function arrowOrigin() {
      const boardRect = board.getBoundingClientRect();
      const archerRect = archer.getBoundingClientRect();
      return { x: archerRect.left - boardRect.left + archerRect.width * .78, y: archerRect.top - boardRect.top + archerRect.height * .38 };
    }

    function updateArrow(point) {
      const origin = arrowOrigin();
      const originX = origin.x;
      const originY = origin.y;
      const dx = point.x - originX;
      const dy = point.y - originY;
      const distance = Math.max(48, Math.min(260, Math.hypot(dx, dy)));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      arrow.style.left = `${originX}px`;
      arrow.style.top = `${originY}px`;
      arrow.style.bottom = 'auto';
      arrow.style.width = `${distance}px`;
      arrow.style.transform = `rotate(${angle}deg)`;
      reticle.style.left = `${point.x}px`;
      reticle.style.top = `${point.y}px`;
    }

    function arrowEndpoint(point) {
      const origin = arrowOrigin();
      const width = board.clientWidth;
      const height = board.clientHeight;
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const length = Math.hypot(dx, dy);
      if (!length) return { x: width, y: origin.y };
      const scaleCandidates = [];
      if (dx > 0) scaleCandidates.push((width - origin.x) / dx);
      if (dx < 0) scaleCandidates.push((0 - origin.x) / dx);
      if (dy > 0) scaleCandidates.push((height - origin.y) / dy);
      if (dy < 0) scaleCandidates.push((0 - origin.y) / dy);
      const scale = Math.min(...scaleCandidates.filter((candidate) => candidate > 0));
      return { x: origin.x + dx * scale, y: origin.y + dy * scale };
    }

    function launchArrow(point) {
      const origin = arrowOrigin();
      const angle = Math.atan2(point.y - origin.y, point.x - origin.x) * 180 / Math.PI;
      const endpoint = arrowEndpoint(point);
      projectile.style.transition = 'none';
      projectile.style.left = `${origin.x}px`;
      projectile.style.top = `${origin.y}px`;
      projectile.style.transform = `rotate(${angle}deg)`;
      projectile.classList.remove('flying');
      void projectile.offsetWidth;
      projectile.style.transition = 'left .72s cubic-bezier(.2,.75,.25,1), top .72s cubic-bezier(.2,.75,.25,1), opacity .12s ease-in';
      projectile.classList.add('flying');
      requestAnimationFrame(() => {
        projectile.style.left = `${endpoint.x}px`;
        projectile.style.top = `${endpoint.y}px`;
      });
      setTimeout(() => projectile.classList.remove('flying'), 790);
    }

    function launchEnemyShot(enemy) {
      if (!enemy) return;
      const boardRect = board.getBoundingClientRect();
      const enemyRect = enemy.getBoundingClientRect();
      const target = arrowOrigin();
      const origin = { x: enemyRect.left - boardRect.left + enemyRect.width * .5, y: enemyRect.top - boardRect.top + enemyRect.height * .45 };
      const angle = Math.atan2(target.y - origin.y, target.x - origin.x) * 180 / Math.PI;
      enemyProjectile.style.transition = 'none';
      enemyProjectile.style.left = `${origin.x}px`;
      enemyProjectile.style.top = `${origin.y}px`;
      enemyProjectile.style.transform = `rotate(${angle}deg)`;
      enemyProjectile.classList.remove('flying');
      void enemyProjectile.offsetWidth;
      enemyProjectile.style.transition = 'left .5s ease-in, top .5s ease-in, opacity .12s ease-in';
      enemyProjectile.classList.add('flying');
      requestAnimationFrame(() => {
        enemyProjectile.style.left = `${target.x}px`;
        enemyProjectile.style.top = `${target.y}px`;
      });
      setTimeout(() => enemyProjectile.classList.remove('flying'), 570);
      setTimeout(() => damagePlayer(20), 520);
    }

    function enemyWasHit(point) {
      const boardRect = board.getBoundingClientRect();
      return enemies.find((enemy) => {
        if (enemy.classList.contains('defeated')) return false;
        const enemyRect = enemy.getBoundingClientRect();
        const left = enemyRect.left - boardRect.left - 10;
        const right = enemyRect.right - boardRect.left + 10;
        const top = enemyRect.top - boardRect.top - 10;
        const bottom = enemyRect.bottom - boardRect.top + 10;
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
      });
    }

    board.addEventListener('pointermove', (event) => {
      aimingPoint = pointerPosition(event);
      updateArrow(aimingPoint);
      reticle.classList.add('visible');
    });
    board.addEventListener('pointerleave', () => reticle.classList.remove('visible'));
    board.addEventListener('pointerdown', (event) => {
      if (shotCooldown || gameOver) return;
      event.preventDefault();
      aimingPoint = pointerPosition(event);
      updateArrow(aimingPoint);
      launchArrow(aimingPoint);
      shotCooldown = true;
      arrow.classList.remove('shot');
      void arrow.offsetWidth;
      arrow.classList.add('shot');
      const hitEnemy = enemyWasHit(aimingPoint);
      if (hitEnemy) {
        damageEnemy(hitEnemy);
      } else {
        setMessage(messageElement, 'Missed! Move the mouse and try again.', 'bad');
      }
      setTimeout(() => {
        const counterEnemy = enemies.find((enemy) => !enemy.classList.contains('defeated'));
        if (counterEnemy && !gameOver) {
          launchEnemyShot(counterEnemy);
          setMessage(messageElement, 'Incoming! The enemy fired back.', 'bad');
        }
      }, 620);
      setTimeout(() => { shotCooldown = false; arrow.classList.remove('shot'); }, 500);
    });
  }

  function renderBridge() {
    mount.innerHTML = `
      <div class="game-layout">
        <section class="game-board bridge-board" aria-label="Draw Bridge drawing board">
          <div class="bridge-bg-sky"></div><div class="bridge-horizon"></div><div class="cliff left"></div><div class="cliff right"></div><div class="water"></div>
          <div class="bridge-draw-area" id="bridge-draw-area"><span class="draw-hint" id="draw-hint">drag to draw your bridge</span><svg class="drawn-bridge" id="drawn-bridge" viewBox="0 0 100 100" preserveAspectRatio="none"><path id="bridge-path" d="" /></svg></div>
          <div class="little-car" id="little-car"></div>
        </section>
        <aside class="game-panel">
          <h2>Draw a safe way!</h2>
          <p>Free-draw your bridge, but reach both cliffs or the bridge will fall.</p>
          <div class="bridge-controls"><button class="control-button" id="test-bridge" type="button">Test bridge →</button><button class="control-button secondary" id="clear-bridge" type="button">Clear</button></div>
          <p class="small-note" id="bridge-message">Draw anything you want across the whole arena.</p>
          <div class="tip-box"><strong>Quick tip</strong>Use the whole arena and make your own path.</div>
        </aside>
      </div>`;

    const messageElement = document.getElementById('bridge-message');
    const drawArea = document.getElementById('bridge-draw-area');
    const drawHint = document.getElementById('draw-hint');
    const path = document.getElementById('bridge-path');
    const drawnBridge = document.getElementById('drawn-bridge');
    const testButton = document.getElementById('test-bridge');
    const clearButton = document.getElementById('clear-bridge');
    const car = document.getElementById('little-car');
    let drawing = false;
    let points = [];
    let driving = false;
    function pointerPosition(event) {
      const rect = drawArea.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      return { x: Math.max(0, Math.min(100, ((point.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((point.clientY - rect.top) / rect.height) * 100)) };
    }
    function renderPath() { path.setAttribute('d', points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')); }
    function startDrawing(event) { if (driving) return; event.preventDefault(); drawing = true; points = [pointerPosition(event)]; renderPath(); drawHint.style.opacity = '0'; }
    function moveDrawing(event) { if (!drawing) return; event.preventDefault(); points.push(pointerPosition(event)); renderPath(); }
    function endDrawing() { drawing = false; }
    function resetCar() { car.style.left = '9%'; car.style.bottom = '241px'; car.style.top = ''; car.style.transform = ''; car.style.transition = ''; }
    function driveAlongDrawing() {
      driving = true;
      car.classList.remove('falling');
      let x = 10;
      const finish = 90;
      const findRoadAt = (xPosition) => points.reduce((closest, point) => {
        if (Math.abs(point.x - xPosition) > 7) return closest;
        if (!closest || Math.abs(point.x - xPosition) < Math.abs(closest.x - xPosition)) return point;
        return closest;
      }, null);

      car.style.bottom = 'auto';
      car.style.transform = 'translate(-50%, -100%)';
      const moveForward = () => {
        const roadPoint = findRoadAt(x);
        car.style.left = `${x}%`;
        if (!roadPoint) {
          driving = false;
          car.style.transition = '';
          car.style.transform = '';
          car.classList.add('falling');
          car.style.top = '110%';
          setMessage(messageElement, 'The road stopped! The car fell — draw a bridge all the way across.', 'bad');
          return;
        }
        car.style.top = `${roadPoint.y}%`;
        if (x >= finish) {
          driving = false;
          setMessage(messageElement, '+15 smart points! The car made it across.', 'good');
          return;
        }
        x += 1.8;
        setTimeout(moveForward, 85);
      };
      moveForward();
    }
    drawArea.addEventListener('pointerdown', startDrawing); drawArea.addEventListener('pointermove', moveDrawing); window.addEventListener('pointerup', endDrawing);
    clearButton.addEventListener('click', () => { driving = false; points = []; renderPath(); drawnBridge.classList.remove('bridge-falling'); resetCar(); car.classList.remove('falling'); testButton.disabled = false; drawHint.textContent = 'draw anywhere'; drawHint.style.opacity = '1'; setMessage(messageElement, 'Drawing cleared. Make anything you want!', ''); });
    testButton.addEventListener('click', () => {
      if (points.length < 2) { setMessage(messageElement, 'Draw something first, then test it.', 'bad'); return; }
      const reachesLeftCliff = points.some((point) => point.x <= 20);
      const reachesRightCliff = points.some((point) => point.x >= 80);
      if (!reachesLeftCliff || !reachesRightCliff) {
        testButton.disabled = true;
        drawnBridge.classList.add('bridge-falling');
        car.style.bottom = 'auto';
        car.style.transition = '';
        car.classList.add('falling');
        car.style.top = '110%';
        setMessage(messageElement, 'The bridge missed a cliff and fell! Draw from side to side.', 'bad');
        return;
      }
      testButton.disabled = true; addScore(15); setMessage(messageElement, 'The car is following your drawing…', 'good'); driveAlongDrawing();
    });
  }

  function renderMining() {
    mount.innerHTML = `
      <div class="game-layout mine-layout">
        <section class="game-board mine-board" aria-label="Idle Mining Empire mine">
          <div class="mine-scene"><div class="mine-sun"></div><div class="mine-hill back"></div><div class="mine-hill front"></div><div class="mine-shaft"></div><div class="mine-gem gem-one"></div><div class="mine-gem gem-two"></div><div class="mine-gem gem-three"></div><div class="mine-worker"><div class="worker-head"></div><div class="worker-body"></div><div class="worker-pick"></div></div><div class="mine-depth">DEPTH <strong id="depth">01</strong></div><div class="ore-pop" id="ore-pop">+1 ore</div></div>
          <div class="mine-stats"><div class="mine-stat-box"><label>Gold</label><strong id="coins">0</strong><small>total mined</small></div><div class="mine-stat-box"><label>Ore / sec</label><strong id="auto-rate">1</strong><small>idle income</small></div><div class="mine-stat-box"><label>Miners</label><strong id="workers">1</strong><small>on the crew</small></div><div class="mine-action-row"><button class="mine-action" id="mine-button" type="button">Mine ore ⛏</button></div><div class="upgrade-list"><button class="upgrade-button" id="hire-worker" type="button">Hire miner <span>Cost <b id="worker-cost">25</b></span></button><button class="upgrade-button" id="upgrade-pick" type="button">Better pick <span>Cost <b id="pick-cost">50</b></span></button><button class="upgrade-button" id="upgrade-cart" type="button">Cargo cart <span>Cost <b id="cart-cost">100</b></span></button></div></div>
        </section>
        <aside class="game-panel"><h2>Grow your empire!</h2><p>Your crew keeps mining while you plan the next upgrade.</p><div class="idle-status"><span class="live-dot"></span><div><strong>Mine is running</strong><small id="mine-message">Your first miner is already working.</small></div></div><div class="tip-box"><strong>How to play</strong>Mine by hand or let your crew build gold while you upgrade the whole operation.</div></aside>
      </div>`;

    const coinsElement = document.getElementById('coins');
    const autoRateElement = document.getElementById('auto-rate');
    const workersElement = document.getElementById('workers');
    const depthElement = document.getElementById('depth');
    const mineButton = document.getElementById('mine-button');
    const hireWorker = document.getElementById('hire-worker');
    const upgradePick = document.getElementById('upgrade-pick');
    const upgradeCart = document.getElementById('upgrade-cart');
    const workerCostElement = document.getElementById('worker-cost');
    const pickCostElement = document.getElementById('pick-cost');
    const cartCostElement = document.getElementById('cart-cost');
    const orePop = document.getElementById('ore-pop');
    const messageElement = document.getElementById('mine-message');
    let coins = 0; let perClick = 1; let autoRate = 1; let workers = 1; let workerCost = 25; let pickCost = 50; let cartCost = 100;

    function updateMiningUI() {
      coinsElement.textContent = Math.floor(coins); autoRateElement.textContent = autoRate; workersElement.textContent = workers; depthElement.textContent = String(Math.min(99, Math.floor(coins / 100) + 1)).padStart(2, '0');
      workerCostElement.textContent = workerCost; pickCostElement.textContent = pickCost; cartCostElement.textContent = cartCost;
      hireWorker.disabled = coins < workerCost; upgradePick.disabled = coins < pickCost; upgradeCart.disabled = coins < cartCost;
    }
    function collectOre(amount, message = '') {
      coins += amount; updateMiningUI();
      orePop.textContent = `+${amount} ore`; orePop.classList.remove('show'); void orePop.offsetWidth; orePop.classList.add('show');
      if (message) setMessage(messageElement, message, 'good');
    }
    mineButton.addEventListener('click', () => { collectOre(perClick); mineButton.classList.remove('pop-in'); void mineButton.offsetWidth; mineButton.classList.add('pop-in'); });
    hireWorker.addEventListener('click', () => { if (coins < workerCost) return; coins -= workerCost; workers += 1; autoRate += 2; workerCost = Math.ceil(workerCost * 1.65); addScore(10); setMessage(messageElement, 'New miner hired! Your idle income is growing.', 'good'); updateMiningUI(); });
    upgradePick.addEventListener('click', () => { if (coins < pickCost) return; coins -= pickCost; perClick += 1; pickCost = Math.ceil(pickCost * 1.7); addScore(10); setMessage(messageElement, 'Better pickaxe! Manual mining is stronger.', 'good'); updateMiningUI(); });
    upgradeCart.addEventListener('click', () => { if (coins < cartCost) return; coins -= cartCost; autoRate += 5; cartCost = Math.ceil(cartCost * 1.8); addScore(15); setMessage(messageElement, 'Cargo cart upgraded! More ore arrives every second.', 'good'); updateMiningUI(); });
    setInterval(() => collectOre(autoRate), 1000);
    updateMiningUI();
  }

  function render67Clicker() {
    mount.innerHTML = `
      <div class="game-layout clicker-layout">
        <section class="game-board clicker-board" aria-label="67 Clicker game board">
          <div class="clicker-glow"></div><div class="clicker-star star-one">✦</div><div class="clicker-star star-two">✦</div><div class="clicker-star star-three">✦</div><div class="orbit-67s" id="orbit-67s"></div>
          <div class="clicker-display"><small>TOTAL 67s</small><strong id="total-67">0</strong><span><b id="auto-67">0</b> 67s / sec · <b id="auto-speed">1.0x</b> speed</span></div>
          <button class="big-67" id="big-67" type="button" aria-label="Click 67 ten times to earn 1 point"><strong>67</strong><span>CLICK ME · 10 CLICKS = 1 POINT</span></button>
          <div class="clicker-pop" id="clicker-pop">+1</div><div class="clicker-voice" id="clicker-voice">6-7!</div><div class="clicker-combo">COMBO <strong id="combo">0</strong></div>
        </section>
        <aside class="game-panel"><h2>Make 67s!</h2><p>Every 10 clicks gives 1 smart point. Each click makes Auto 67 faster. Buy Auto 67 to turn on automatic clicking.</p><div class="clicker-stats"><div><label>Per click</label><strong id="click-power">1</strong></div><div><label>Auto 67s</label><strong id="auto-power">0</strong></div><div><label>Best combo</label><strong id="best-combo">0</strong></div></div><div class="clicker-upgrades"><button class="upgrade-button" id="click-upgrade" type="button">Power click <span>Cost <b id="click-cost">20</b></span></button><button class="upgrade-button" id="auto-upgrade" type="button">Buy Auto 67 <span>Cost <b id="auto-cost">67</b></span></button><button class="upgrade-button" id="lucky-upgrade" type="button">Lucky 67 <span>Cost <b id="lucky-cost">200</b></span></button></div><p class="small-note" id="clicker-message">Start the 67 streak!</p><div class="tip-box"><strong>Quick tip</strong>Every 10 clicks gives 1 smart point. Lucky 67 upgrades make bonus 67s even bigger.</div></aside>
      </div>`;

    const totalElement = document.getElementById('total-67');
    const autoElement = document.getElementById('auto-67');
    const autoSpeedElement = document.getElementById('auto-speed');
    const clickPowerElement = document.getElementById('click-power');
    const autoPowerElement = document.getElementById('auto-power');
    const bestComboElement = document.getElementById('best-combo');
    const comboElement = document.getElementById('combo');
    const bigButton = document.getElementById('big-67');
    const popElement = document.getElementById('clicker-pop');
    const voiceElement = document.getElementById('clicker-voice');
    const orbitElement = document.getElementById('orbit-67s');
    const clickUpgrade = document.getElementById('click-upgrade');
    const autoUpgrade = document.getElementById('auto-upgrade');
    const luckyUpgrade = document.getElementById('lucky-upgrade');
    const clickCostElement = document.getElementById('click-cost');
    const autoCostElement = document.getElementById('auto-cost');
    const luckyCostElement = document.getElementById('lucky-cost');
    const messageElement = document.getElementById('clicker-message');
    let total = 0; let perClick = 1; let perSecond = 0; let autoDelay = 1000; let autoTimer; let clickCount = 0; let combo = 0; let bestCombo = 0; let luckyLevel = 0; let clickCost = 20; let autoCost = 67; let luckyCost = 200; let comboTimer;

    function layoutOrbit67s() {
      const bubbles = [...orbitElement.children];
      const radius = Math.min(150, document.querySelector('.clicker-board').clientWidth * .28);
      bubbles.forEach((bubble, index) => {
        const angle = (Math.PI * 2 * index / bubbles.length) - Math.PI / 2;
        bubble.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
        bubble.style.top = `calc(51% + ${Math.sin(angle) * radius}px)`;
      });
    }
    function addOrbit67() {
      const bubble = document.createElement('span');
      bubble.className = 'orbit-67';
      bubble.textContent = '67';
      orbitElement.appendChild(bubble);
      layoutOrbit67s();
    }

    function updateClickerUI() {
      const effectiveAutoRate = perSecond ? Math.max(1, Math.round(perSecond * 1000 / autoDelay)) : 0;
      totalElement.textContent = Math.floor(total); autoElement.textContent = effectiveAutoRate; autoSpeedElement.textContent = `${(1000 / autoDelay).toFixed(1)}x`; clickPowerElement.textContent = perClick; autoPowerElement.textContent = effectiveAutoRate; bestComboElement.textContent = bestCombo; comboElement.textContent = combo;
      clickCostElement.textContent = clickCost; autoCostElement.textContent = autoCost; luckyCostElement.textContent = luckyCost;
      clickUpgrade.disabled = total < clickCost; autoUpgrade.disabled = total < autoCost; luckyUpgrade.disabled = total < luckyCost;
    }
    function restartAutoClicker() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => {
        if (perSecond > 0) { total += perSecond; for (let click = 0; click < perSecond; click += 1) count67Click(); updateClickerUI(); }
      }, autoDelay);
    }
    function count67Click() {
      clickCount += 1;
      if (clickCount % 10 !== 0) return false;
      addScore(1, { exact: true });
      setMessage(messageElement, '10 clicks! +1 smart point.', 'good');
      return true;
    }
    function showClickGain(label) {
      popElement.textContent = label; popElement.classList.remove('show'); void popElement.offsetWidth; popElement.classList.add('show');
    }
    function say67() {
      voiceElement.classList.remove('show'); void voiceElement.offsetWidth; voiceElement.classList.add('show');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance('6-7');
        voice.rate = 1.1;
        voice.pitch = 1.15;
        window.speechSynthesis.speak(voice);
      }
    }
    bigButton.addEventListener('click', () => {
      say67();
      combo += 1; bestCombo = Math.max(bestCombo, combo); let amount = perClick;
      if (combo % 10 === 0) amount += 67 * Math.max(1, luckyLevel);
      if (luckyLevel > 0 && combo % 7 === 0) amount += 67 * luckyLevel;
      total += amount; const pointAwarded = count67Click(); autoDelay = Math.max(250, autoDelay - 25); restartAutoClicker(); showClickGain(pointAwarded ? '+1 POINT' : `+${amount} 67s`); updateClickerUI(); bigButton.classList.remove('click-pop'); void bigButton.offsetWidth; bigButton.classList.add('click-pop');
      clearTimeout(comboTimer); comboTimer = setTimeout(() => { combo = 0; updateClickerUI(); }, 2200);
    });
    clickUpgrade.addEventListener('click', () => { if (total < clickCost) return; total -= clickCost; perClick += 1; clickCost = Math.ceil(clickCost * 1.7); addOrbit67(); addScore(10); setMessage(messageElement, 'Your 67 click is stronger — another 67 joined the circle!', 'good'); updateClickerUI(); });
    autoUpgrade.addEventListener('click', () => { if (total < autoCost) return; total -= autoCost; perSecond += 1; autoCost = Math.ceil(autoCost * 1.8); addScore(15); restartAutoClicker(); setMessage(messageElement, 'Auto 67 is online! Every click makes it faster.', 'good'); updateClickerUI(); });
    luckyUpgrade.addEventListener('click', () => { if (total < luckyCost) return; total -= luckyCost; luckyLevel += 1; luckyCost = Math.ceil(luckyCost * 2.1); addScore(20); setMessage(messageElement, 'Lucky 67 unlocked! Bonus clicks are bigger.', 'good'); updateClickerUI(); });
    restartAutoClicker();
    updateClickerUI();
  }
})();
