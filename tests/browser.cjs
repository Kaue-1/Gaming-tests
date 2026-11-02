// Optional end-to-end suite: requires Playwright and a running server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const page = await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
 await page.screenshot({path:'/tmp/eclipse-desktop.png',fullPage:true});
 assert.equal(await page.locator('.party-card').count(),3);
 assert.equal(await page.locator('.skill-button').count(),3);
 await page.locator('#help-button').click();assert.ok(await page.locator('dialog').isVisible());await page.locator('#play-button').click();
 await page.clock.install();
 async function battleAction(index=0,mode='perfect') {
   await page.locator(`[data-skill="${index}"]`).click();
   for(let step=0;step<350;step++) {
     await page.clock.runFor(40);
     const ui=await page.evaluate(()=>({
       timing:!document.getElementById('timing-overlay').hidden,
       opacity:document.getElementById('moving-ring').style.opacity,
       transform:document.getElementById('moving-ring').style.transform,
       ended:!document.getElementById('result-overlay').hidden,
       enabled:!!document.querySelector('.skill-button:not(:disabled)')
     }));
     const scale=Number(ui.transform.match(/scale\(([^)]+)/)?.[1]);
     if(ui.timing&&ui.opacity==='1'&&((mode==='perfect'&&scale<=1.045&&scale>=.94)||mode==='miss')) await page.keyboard.press('Space');
     if(ui.ended||(!ui.timing&&ui.enabled))return;
   }
   throw Error('Action did not finish');
 }
 // Exercise all nine abilities through the actual UI, including touch input below.
 await battleAction(1);await battleAction(2);await battleAction(2);
 await battleAction(0);await battleAction(0);await battleAction(0);
 await battleAction(2);await battleAction(1);await battleAction(1);
 assert.match(await page.locator('#battle-log').innerText(),/Maré de Vida/);
 let actions=0;
 while(!await page.locator('#result-overlay').isVisible()&&actions++<70)await battleAction(0);
 assert.match(await page.locator('#result-title').innerText(),/Uma nova aurora/);
 await page.screenshot({path:'/tmp/eclipse-victory.png',fullPage:true});
 await page.locator('#restart-button').click();assert.equal(await page.locator('#boss-hp-text').innerText(),'1100 / 1100');
 // Deliberately defend until the boss defeats the party; no hidden state manipulation.
 for(let turn=0;turn<200&&!await page.locator('#result-overlay').isVisible();turn++) {
   await page.locator('#defend-button').click(); await page.clock.runFor(2500);
 }
 assert.match(await page.locator('#result-title').innerText(),/Nem toda luz/);
 await page.locator('#restart-button').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/eclipse-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('[data-skill="0"]').click();await page.clock.runFor(1500);
 await page.locator('#timing-button').dispatchEvent('pointerdown',{pointerType:'touch'});
 assert.notEqual(await page.locator('#timing-feedback').innerText(),'Espere o alinhamento…');
 await page.screenshot({path:'/tmp/eclipse-timing.png',fullPage:true});
 const arenaVisible=await page.locator('.arena').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight});
 assert.equal(arenaVisible,true);
 await page.clock.runFor(10000);
 assert.equal(await page.locator('#timing-overlay').isVisible(),false);
 assert.equal(await page.locator('#actor-name').innerText(),'Heifer');
 assert.deepEqual(errors,[]);
 console.log('PASS: all 9 skills, perfect timing, victory, defeat, restart, help, mobile layout, touch input; no browser errors.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
