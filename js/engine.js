export const HEROES = [
  { id: 'frohu', name: 'Fro’hu', role: 'ESPADACHIM DO CREPÚSCULO', element: 'LÂMINA', color: '#7fe0d4', maxHp: 170, skills: [
    { name: 'Corte da Aurora', type: 'damage', description: 'Dois cortes rápidos de luz. Seu ataque confiável.', power: 47, cost: 0, beats: [1100, 900], symbol: '╱', tag: '2 GOLPES · DANO' },
    { name: 'Ruptura Astral', type: 'expose', description: 'Rompe a guarda: a próxima ofensiva causa +35% de dano.', power: 61, cost: 2, beats: [1000, 850, 750], symbol: '✧', tag: '3 GOLPES · EXPOSIÇÃO' },
    { name: 'Nove Sóis', type: 'damage', description: 'Quatro impactos crescentes em uma explosão de luz.', power: 118, cost: 3, beats: [1100, 900, 750, 650], symbol: '☀', tag: '4 GOLPES · EXPLOSÃO' }
  ]},
  { id: 'heifer', name: 'Heifer', role: 'TECELÃ DAS MARÉS', element: 'MARÉ', color: '#b7a3ff', maxHp: 138, skills: [
    { name: 'Agulhas da Lua', type: 'damage', description: 'Três projéteis lunares em um ritmo acelerado.', power: 49, cost: 0, beats: [950, 800, 700], symbol: '☾', tag: '3 GOLPES · DANO' },
    { name: 'Maré de Vida', type: 'heal', description: 'Cura o aliado vivo com menor proporção de HP.', power: 68, cost: 2, beats: [1350, 1150], symbol: '❋', tag: '2 PULSOS · CURA' },
    { name: 'Véu das Estrelas', type: 'shield', description: 'Envolve todos os aliados vivos em escudos duradouros.', power: 36, cost: 3, beats: [1200, 1000, 850], symbol: '◇', tag: '3 PULSOS · ESCUDO' }
  ]},
  { id: 'goffen', name: 'Goffen', role: 'GUARDIÃO DAS BRASAS', element: 'BRASA', color: '#ffbf83', maxHp: 205, skills: [
    { name: 'Punho de Pedra', type: 'damage', description: 'Um único impacto pesado. Respire e acerte o tempo.', power: 50, cost: 0, beats: [1550], symbol: '⬡', tag: '1 IMPACTO · DANO' },
    { name: 'Fome de Brasa', type: 'drain', description: 'Absorve 65% do dano causado como vida para Goffen.', power: 66, cost: 2, beats: [1150, 900], symbol: '♨', tag: '2 GOLPES · DRENAGEM' },
    { name: 'Coração de Ferro', type: 'fortify', description: 'Causa dano e concede um escudo pessoal reforçado.', power: 76, cost: 3, beats: [1300, 1000, 800], symbol: '▣', tag: '3 GOLPES · PROTEÇÃO' }
  ]}
];
export function createBattle() {
  return { heroes: HEROES.map(h => ({ ...h, hp: h.maxHp, energy: 3, shield: 0, defending: false })), boss: { hp: 1100, maxHp: 1100, exposed: false, charging: false }, actor: 0, round: 1, phase: 'player', outcome: null, stats: { perfect: 0, hits: 0, attempts: 0, best: 0, streak: 0 } };
}
export function gradeTiming(progress) {
  const distance = Math.abs(progress - .78);
  return distance <= .055 ? 'perfect' : distance <= .14 ? 'good' : 'miss';
}
export function multiplier(grades) {
  return .45 + .85 * grades.reduce((sum, g) => sum + (g === 'perfect' ? 1 : g === 'good' ? .65 : 0), 0) / Math.max(1, grades.length);
}
function heal(hero, amount) { const restored = Math.min(hero.maxHp - hero.hp, amount); hero.hp += restored; return restored; }
export function useSkill(state, index, grades) {
  const hero = state.heroes[state.actor], skill = hero?.skills[index];
  if (state.phase !== 'player' || !hero || hero.hp <= 0 || !skill || hero.energy < skill.cost || grades.length !== skill.beats.length || grades.some(g => !['perfect','good','miss'].includes(g))) throw new Error('Ação inválida');
  hero.energy -= skill.cost;
  state.phase = 'resolving';
  for (const grade of grades) { state.stats.attempts++; if (grade !== 'miss') { state.stats.hits++; state.stats.streak++; } else state.stats.streak = 0; if (grade === 'perfect') state.stats.perfect++; state.stats.best = Math.max(state.stats.best, state.stats.streak); }
  const power = Math.round(skill.power * multiplier(grades));
  const events = [];
  if (skill.type === 'heal') {
    const target = state.heroes.filter(h => h.hp > 0).sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    events.push({ target: target.id, amount: heal(target, power), kind: 'heal' });
  } else if (skill.type === 'shield') {
    state.heroes.filter(h => h.hp > 0).forEach(h => { h.shield += power; events.push({ target: h.id, amount: power, kind: 'shield' }); });
  } else {
    const damage = Math.min(state.boss.hp, Math.round(power * (state.boss.exposed ? 1.35 : 1)));
    state.boss.hp -= damage; state.boss.exposed = skill.type === 'expose';
    events.push({ target: 'boss', amount: damage, kind: 'damage' });
    if (skill.type === 'drain') events.push({ target: hero.id, amount: heal(hero, Math.round(damage * .65)), kind: 'heal' });
    if (skill.type === 'fortify') { const shield = Math.round(48 * multiplier(grades)); hero.shield += shield; events.push({ target: hero.id, amount: shield, kind: 'shield' }); }
  }
  if (state.boss.hp === 0) { state.outcome = 'victory'; state.phase = 'ended'; }
  return events;
}
export function defend(state) {
  if (state.phase !== 'player') throw new Error('Ação inválida');
  const hero = state.heroes[state.actor]; hero.defending = true; hero.energy = Math.min(5, hero.energy + 2); state.phase = 'resolving';
}
export function nextActor(state) {
  if (state.outcome) return;
  let next = state.actor + 1;
  while (next < 3 && state.heroes[next].hp <= 0) next++;
  if (next < 3) { state.actor = next; state.phase = 'player'; } else state.phase = 'boss';
}
export function bossTurn(state) {
  if (state.phase !== 'boss') throw new Error('Turno inválido');
  const alive = state.heroes.filter(h => h.hp > 0), events = [];
  let title;
  const hit = (hero, amount) => {
    const reduced = Math.round(amount * (hero.defending ? .4 : 1)); hero.defending = false;
    const absorbed = Math.min(hero.shield, reduced); hero.shield -= absorbed;
    const damage = Math.min(hero.hp, reduced - absorbed); hero.hp -= damage;
    events.push({ target: hero.id, amount: damage, absorbed, kind: 'damage' });
  };
  if (state.boss.charging) { title = 'Eclipse Total'; alive.forEach(h => hit(h, 58)); state.boss.charging = false; }
  else if (state.round % 3 === 0) { title = 'Vesper está carregando o Eclipse Total!'; state.boss.charging = true; }
  else { title = 'Lança do Vazio'; hit(alive[(state.round - 1) % alive.length], 40 + Math.min(20, state.round * 2)); }
  if (state.heroes.every(h => h.hp <= 0)) { state.outcome = 'defeat'; state.phase = 'ended'; }
  else { state.round++; state.heroes.filter(h => h.hp > 0).forEach(h => h.energy = Math.min(5, h.energy + 1)); state.actor = state.heroes.findIndex(h => h.hp > 0); state.phase = 'player'; }
  return { title, events };
}
