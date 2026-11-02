import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, HEROES, gradeTiming, useSkill, defend, nextActor, bossTurn } from '../js/engine.js';
const perfect = skill => skill.beats.map(() => 'perfect');
function act(s, index) { const result = useSkill(s, index, perfect(s.heroes[s.actor].skills[index])); nextActor(s); if(s.phase === 'boss') bossTurn(s); return result; }
test('três heróis e nove Addictions exclusivas, com ritmos próprios', () => {
  assert.equal(HEROES.length, 3); assert.equal(new Set(HEROES.flatMap(h => h.skills.map(s => s.name))).size, 9);
  assert.ok(HEROES.every(h => h.skills.length === 3 && h.skills[0].cost === 0));
});
test('precisão diferencia perfeito, bom e erro', () => {
  assert.equal(gradeTiming(.78), 'perfect'); assert.equal(gradeTiming(.68), 'good'); assert.equal(gradeTiming(.3), 'miss'); assert.equal(gradeTiming(1), 'miss');
});
test('nove habilidades aplicam os efeitos declarados', () => {
  for (let actor=0; actor<3; actor++) for(let index=0; index<3; index++) {
    const s=createBattle(); s.actor=actor; s.heroes.forEach(h=>h.hp-=80);
    const hero=s.heroes[actor], skill=hero.skills[index], hp=hero.hp;
    const events=useSkill(s,index,perfect(skill));
    assert.equal(hero.energy,3-skill.cost); assert.equal(events.length,skill.type==='shield'?3:['drain','fortify'].includes(skill.type)?2:1);
    if(skill.type==='heal') assert.ok(s.heroes[1].hp>58);
    else if(skill.type==='shield') assert.ok(s.heroes.every(h=>h.shield>0));
    else assert.ok(s.boss.hp<1100);
    if(skill.type==='drain') assert.ok(hero.hp>hp);
    if(skill.type==='fortify') assert.ok(hero.shield>0);
    if(skill.type==='expose') assert.equal(s.boss.exposed,true);
  }
});
test('exposição aumenta só a próxima ofensiva e é consumida', () => {
  const s=createBattle(); act(s,1); const damage=useSkill(s,0,perfect(s.heroes[1].skills[0]))[0].amount;
  assert.equal(damage,Math.round(Math.round(49*1.3)*1.35)); assert.equal(s.boss.exposed,false);
});
test('erros reduzem dano; energia insuficiente e ações duplicadas são rejeitadas', () => {
  const s=createBattle(); const damage=useSkill(s,0,['miss','miss'])[0].amount; assert.equal(damage,21);
  assert.throws(()=>useSkill(s,0,['perfect','perfect']));
  const other=createBattle(); other.heroes[0].energy=0; assert.throws(()=>useSkill(other,2,['perfect','perfect','perfect','perfect']));
  assert.throws(()=>useSkill(createBattle(),0,[]));
});
test('defesa e escudo absorvem dano sem HP negativo', () => {
  const s=createBattle(); s.heroes[0].shield=10; defend(s); s.phase='boss';
  const result=bossTurn(s); assert.equal(result.events[0].amount,7); assert.equal(s.heroes[0].shield,0); assert.equal(s.heroes[0].hp,163); assert.equal(s.heroes[0].defending,false); assert.equal(s.heroes[0].energy,5);
});
test('chefe anuncia carga e depois ataca todos; escudos absorvem o impacto', () => {
  const s=createBattle(); s.round=3;s.phase='boss'; assert.equal(bossTurn(s).events.length,0); assert.equal(s.boss.charging,true);
  s.heroes.forEach(h=>h.shield=100);s.phase='boss';const result=bossTurn(s);assert.equal(result.events.length,3);assert.ok(result.events.every(e=>e.amount===0));assert.equal(s.boss.charging,false);
});
test('personagens caídos são pulados e não podem receber cura', () => {
  const s=createBattle();s.heroes[1].hp=0;act(s,0);assert.equal(s.actor,2);
  const t=createBattle();t.actor=1;t.heroes[0].hp=0;t.heroes[2].hp=10;useSkill(t,1,['perfect','perfect']);assert.equal(t.heroes[0].hp,0);assert.ok(t.heroes[2].hp>10);
});
test('vitória encerra sem turno extra do chefe', () => {
  const s=createBattle();s.boss.hp=1;act(s,0);assert.equal(s.outcome,'victory');assert.equal(s.phase,'ended');assert.equal(s.round,1);
});
test('derrota ocorre quando todo o grupo cai', () => {
  const s=createBattle();s.heroes.forEach(h=>h.hp=1);s.boss.charging=true;s.phase='boss';bossTurn(s);assert.equal(s.outcome,'defeat');assert.ok(s.heroes.every(h=>h.hp===0));
});
test('partida completa vencível com ataques gratuitos e bons acertos', () => {
  const s=createBattle();let actions=0;
  while(!s.outcome&&actions++<150){useSkill(s,0,s.heroes[s.actor].skills[0].beats.map(()=> 'good'));nextActor(s);if(s.phase==='boss')bossTurn(s);}
  assert.equal(s.outcome,'victory');assert.ok(s.round<=12);
});
test('reinício cria estado independente, com vida e energia restauradas', () => {
  const s=createBattle();s.heroes[0].hp=0;s.boss.hp=0; const fresh=createBattle();assert.equal(fresh.heroes[0].hp,170);assert.equal(fresh.boss.hp,1100);assert.equal(fresh.stats.hits,0);
});
