import { HEROES, createBattle, gradeTiming, useSkill, defend, nextActor, bossTurn } from './engine.js';
import { heroArt, bossArt } from './art.js';
const $ = id => document.getElementById(id);
let state = createBattle(), busy = false, timing = null, sound = false, audio;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function tone(freq = 440, duration = .1, type = 'sine') {
  if (!sound) return;
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(.045, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + duration); } catch { /* Sound is optional. */ }
}
function log(message) {
  const line = document.createElement('p'), turn = document.createElement('span'); turn.textContent = String(state.round).padStart(2, '0'); line.append(turn, document.createTextNode(message)); $('battle-log').append(line);
  while ($('battle-log').children.length > 35) $('battle-log').firstChild.remove();
  $('battle-log').scrollTop = $('battle-log').scrollHeight;
}
function render() {
  $('round-label').textContent = String(state.round).padStart(2, '0');
  $('boss-hp-text').textContent = `${state.boss.hp} / ${state.boss.maxHp}`;
  $('boss-hp-fill').style.width = `${state.boss.hp / state.boss.maxHp * 100}%`;
  $('boss-intent').textContent = state.boss.hp === 0 ? 'O silêncio retorna ao santuário.' : `${state.boss.exposed ? '◇ Exposto · ' : ''}${state.boss.charging ? '⚠ Próximo: Eclipse Total · dano em todos' : state.round % 3 === 0 ? '◇ Próximo: carregar Eclipse Total' : '↗ Próximo: Lança do Vazio · alvo único'}`;
  $('boss-intent').classList.toggle('danger', state.boss.charging);
  $('boss-sprite').classList.toggle('charging', state.boss.charging); $('boss-sprite').classList.toggle('dead', state.boss.hp === 0);
  const hero = state.heroes[state.actor];
  $('party-cards').innerHTML = state.heroes.map((h, i) => `<article class="party-card ${i === state.actor && !state.outcome ? 'active' : ''} ${h.hp === 0 ? 'dead' : ''}" style="--hero-color:${h.color}"><div class="card-top"><div class="portrait">${heroArt(h.id)}</div><div><div class="card-name">${h.name}</div><div class="card-role">${h.role}</div></div><span class="card-status">${h.hp === 0 ? 'CAÍDO' : h.defending ? '◇ DEFESA' : i === state.actor && !state.outcome ? '◆' : ''}</span></div><div class="hp-line"><span>HP</span><b>${h.hp} <em>/ ${h.maxHp}</em></b></div><div class="hp-track" role="progressbar" aria-label="HP de ${h.name}" aria-valuenow="${h.hp}" aria-valuemin="0" aria-valuemax="${h.maxHp}"><div class="hp-fill" style="width:${h.hp / h.maxHp * 100}%"></div></div><div class="energy-line" aria-label="Energia: ${h.energy} de 5"><span>ENERGIA</span>${Array.from({length:5}, (_, j) => `<span class="energy-dot ${j < h.energy ? 'filled' : ''}"></span>`).join('')}<span class="shield-label">${h.shield ? `◇ ${h.shield} escudo` : ''}</span></div></article>`).join('');
  state.heroes.forEach((h, i) => { const el = document.querySelector(`.hero[data-id="${h.id}"]`); el.classList.toggle('active', i === state.actor && !state.outcome); el.classList.toggle('dead', h.hp === 0); });
  $('turn-order').innerHTML = [...state.heroes.map((h,i) => `<span class="turn-chip ${i === state.actor && state.phase !== 'boss' && !state.outcome ? 'current' : ''} ${h.hp <= 0 ? 'dead' : ''}">${i === state.actor && !state.outcome ? '◆ ' : ''}${h.name}</span>`), '<span class="turn-chip boss-chip">Vesper</span>'].join('<span class="turn-arrow">›</span>');
  $('phase-label').textContent = state.outcome ? 'FIM DA BATALHA' : busy ? 'EM AÇÃO' : 'SUA VEZ';
  $('actor-name').textContent = hero.name; $('actor-role').textContent = hero.role;
  $('skill-list').innerHTML = hero.skills.map((s,i) => `<button class="skill-button" data-skill="${i}" ${busy || state.outcome || hero.energy < s.cost ? 'disabled' : ''} aria-label="${s.name}, ${s.cost} energia. ${s.description}"><div class="skill-top"><span class="skill-symbol">${s.symbol}</span><span class="skill-name">${s.name}</span><span class="skill-cost">${s.cost ? `◆ ${s.cost}` : 'LIVRE'}</span></div><p>${s.description}</p><span class="skill-tag">${s.tag}</span></button>`).join('');
  $('defend-button').disabled = busy || !!state.outcome;
  $('help-button').disabled = busy;
  $('combo-record').textContent = `MELHOR SEQUÊNCIA · ${state.stats.best}`;
}
function animate(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }
function skillEffect(skill, hero) {
  const effect = document.createElement('div');
  effect.className = `skill-effect effect-${skill.type}`;
  effect.style.setProperty('--effect-color', hero.color);
  if (skill.type === 'heal' || skill.type === 'shield') {
    effect.classList.add('effect-party');
  } else {
    effect.innerHTML = Array.from({length:skill.beats.length}, (_, i) => `<i style="--i:${i}"></i>`).join('');
    if (skill.name === 'Nove Sóis') effect.classList.add('effect-solar');
  }
  $('effects').append(effect); setTimeout(() => effect.remove(), 1100);
}
function showEvents(events) {
  for (const e of events) {
    const el = e.target === 'boss' ? $('boss-sprite') : document.querySelector(`.hero[data-id="${e.target}"]`);
    const number = document.createElement('div'); number.className = `float-number ${e.kind}`; number.textContent = `${e.kind === 'heal' ? '+' : e.kind === 'shield' ? '◇ ' : '−'}${e.amount}`;
    const box = el.getBoundingClientRect(), arena = $('effects').getBoundingClientRect(); number.style.left = `${box.left - arena.left + box.width / 2 - 12}px`; number.style.top = `${box.top - arena.top + 15}px`; $('effects').append(number); setTimeout(() => number.remove(), 1400);
    if (e.kind === 'damage') animate(el, 'hurt');
  }
}
async function runTiming(skill) {
  const grades = [];
  $('timing-overlay').hidden = false; $('timing-skill').textContent = skill.name;
  const arena = document.querySelector('.arena');
  const bounds = arena.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > innerHeight) arena.scrollIntoView({block:'center', behavior:'instant'});
  $('timing-dots').innerHTML = skill.beats.map(() => '<span class="timing-dot"></span>').join('');
  $('timing-feedback').textContent = 'Encontre o ritmo'; $('timing-button').focus({preventScroll:true});
  $('moving-ring').style.opacity = '0';
  await delay(650);
  for (let index = 0; index < skill.beats.length; index++) {
    $('timing-count').textContent = `${index + 1} / ${skill.beats.length}`;
    const grade = await new Promise(resolve => {
      timing = { start: performance.now(), duration: skill.beats[index], resolve, done: false };
      const current = timing; $('moving-ring').style.opacity = '1'; $('timing-feedback').textContent = 'Espere o alinhamento…';
      function frame(now) {
        if (current.done) return;
        const progress = (now - current.start) / current.duration;
        const scale = 2.5 - progress * (1.5 / .78);
        $('moving-ring').style.transform = `rotate(45deg) scale(${Math.max(.4, scale)})`;
        $('moving-ring').style.borderColor = Math.abs(progress - .78) <= .055 ? '#ffe2a4' : '#7fe0d4';
        if (progress >= 1) finishBeat('miss'); else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    grades.push(grade); $('timing-dots').children[index].classList.add(grade);
    await delay(430);
  }
  timing = null; $('timing-overlay').hidden = true; return grades;
}
function finishBeat(grade) {
  if (!timing || timing.done) return;
  timing.done = true; $('timing-feedback').textContent = { perfect: 'PERFEITO!', good: 'BOM!', miss: 'FORA DO TEMPO' }[grade];
  $('timing-feedback').style.color = { perfect: '#ffe2a4', good: '#7fe0d4', miss: '#e798a9' }[grade];
  tone(grade === 'perfect' ? 880 : grade === 'good' ? 660 : 180, .14, 'triangle');
  $('moving-ring').style.opacity = '.25'; timing.resolve(grade);
}
function hitTiming() { if (timing && !timing.done) finishBeat(gradeTiming((performance.now() - timing.start) / timing.duration)); }
// Pause the active timing clock when the tab is hidden; background throttling must not consume a beat.
let hiddenAt = null;
document.addEventListener('visibilitychange', () => { if (document.hidden) hiddenAt = performance.now(); else if (hiddenAt !== null) { if (timing && !timing.done) timing.start += performance.now() - hiddenAt; hiddenAt = null; } });
$('timing-button').addEventListener('pointerdown', e => { e.preventDefault(); hitTiming(); });
$('timing-button').addEventListener('click', e => { if (e.detail === 0) hitTiming(); });
document.addEventListener('keydown', e => { if (!$('timing-overlay').hidden && ['Space','KeyZ','Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) hitTiming(); } });
function describeEvents(events) {
  return events.map(e => `${e.target === 'boss' ? 'Vesper' : HEROES.find(h => h.id === e.target).name}: ${e.kind === 'damage' ? `−${e.amount} HP${e.absorbed ? ` (${e.absorbed} absorvido)` : ''}` : e.kind === 'heal' ? `+${e.amount} HP` : `+${e.amount} escudo`}`).join(' · ');
}
async function performSkill(index) {
  if (busy || state.outcome) return;
  const hero = state.heroes[state.actor], skill = hero.skills[index]; if (!skill || hero.energy < skill.cost) return;
  busy = true; render();
  const grades = await runTiming(skill);
  const events = useSkill(state, index, grades);
  skillEffect(skill, hero);
  animate(document.querySelector(`.hero[data-id="${hero.id}"]`), 'attack');
  if (events.some(e => e.target === 'boss')) { const slash = document.createElement('div'); slash.className = 'attack-slash'; $('effects').append(slash); setTimeout(() => slash.remove(), 600); tone(220, .2, 'sawtooth'); }
  showEvents(events); render(); log(`${hero.name} · ${skill.name}. ${describeEvents(events)}.`);
  await delay(1000); await advance();
}
async function advance() {
  if (state.outcome) return endBattle();
  nextActor(state);
  if (state.phase === 'boss') {
    render(); $('phase-label').textContent = 'VEZ DE VESPER'; await delay(700);
    const result = bossTurn(state); animate($('boss-sprite'), 'attack');
    if (result.events.length > 1) animate(document.querySelector('.arena'), 'impact');
    showEvents(result.events); log(`${result.title}${result.events.length ? `. ${describeEvents(result.events)}.` : ''}`); tone(result.events.length ? 130 : 100, .3, 'triangle'); render();
    await delay(1100);
  }
  if (state.outcome) return endBattle();
  busy = false; render(); document.querySelector('.skill-button:not(:disabled)')?.focus({preventScroll:true});
}
function endBattle() {
  busy = false; render(); const victory = state.outcome === 'victory';
  $('result-eyebrow').textContent = victory ? 'SANTUÁRIO LIBERTADO' : 'A NOITE AINDA RESISTE';
  $('result-title').textContent = victory ? 'Uma nova aurora.' : 'Nem toda luz se apaga.';
  $('result-description').textContent = victory ? 'Vesper caiu. Entre as ruínas, três pequenas chamas devolvem ao mundo a promessa do amanhecer.' : 'O grupo caiu, mas a jornada pode recomeçar. Cure seus aliados e prepare escudos antes do Eclipse Total.';
  $('result-stats').textContent = `${state.round} rodadas · ${state.stats.perfect} perfeitos · melhor sequência: ${state.stats.best}`;
  $('result-overlay').hidden = false; $('restart-button').focus({preventScroll:true}); tone(victory ? 660 : 160, .6);
}
$('skill-list').addEventListener('click', e => { const btn = e.target.closest('[data-skill]'); if (btn && !btn.disabled) performSkill(Number(btn.dataset.skill)); });
$('defend-button').addEventListener('click', async () => { if (busy || state.outcome) return; busy = true; const name = state.heroes[state.actor].name; defend(state); log(`${name} assume posição defensiva e recupera energia.`); render(); await delay(450); await advance(); });
function start() {
  state = createBattle(); busy = false; timing = null; $('battle-log').replaceChildren(); $('result-overlay').hidden = true; $('timing-overlay').hidden = true;
  $('party-sprites').innerHTML = HEROES.map(h => `<div class="combatant hero" data-id="${h.id}" aria-label="${h.name}">${heroArt(h.id)}</div>`).join('');
  $('boss-sprite').innerHTML = bossArt(); log('Vesper desperta. Acerte o ritmo das Addictions e mantenha a chama acesa.'); render();
}
$('restart-button').addEventListener('click', () => { start(); document.querySelector('.skill-button').focus({preventScroll:true}); });
$('sound-button').addEventListener('click', () => { sound = !sound; $('sound-button').setAttribute('aria-pressed', String(sound)); $('sound-button').setAttribute('aria-label', sound ? 'Desativar som' : 'Ativar som'); $('sound-button').style.background = sound ? '#353047' : ''; tone(660); });
$('help-button').addEventListener('click', () => { if (!busy) $('help-dialog').showModal(); });
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('play-button').addEventListener('click', () => $('help-dialog').close());
start();
