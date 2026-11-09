// Reproduce missed-gate and finished-input issues on the real rendered game.
// --baseline records the old behaviour without asserting the proposed fixes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const baseline = process.argv.includes('--baseline');
const label = baseline ? 'before' : 'after';
const out = 'playtest-out/navigation-finish';
await mkdir(out, { recursive:true });
const server = await createServer({ server:{host:'127.0.0.1',port:4507,strictPort:true},logLevel:'error' });
await server.listen();
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const errors = [], report = {navigation:[],finishes:[]};
const context = await browser.newContext({viewport:{width:667,height:375},isMobile:true,hasTouch:true});
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
async function load(course) {
  await page.goto(`http://127.0.0.1:4507/?harness=1&ui=1&course=${course}&seed=779425`);
  await page.waitForFunction(()=>!!window.__h);
  await page.evaluate(async()=>{await window.advanceTime(0);window.__h._stepNoRender(180);});
}
async function capture(name) {
  await page.evaluate(()=>window.__h._render());
  await page.screenshot({path:`${out}/${name}-${label}.png`});
}
try {
  for (const course of ['eastbourne-dash','manfield','remutaka','otaki']) {
    await load(course);
    const state = await page.evaluate(()=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race'),line=s.track.centerline;
      s.expected=2;
      const i=s.track.checkpoints[2].index+30,p=line[i],q=line[i+1];
      s.car.reset(p.x,p.y,Math.atan2(q.x-p.x,-(q.y-p.y)));
      s.routeUpdateAt=0;s.updateRouteHelp(s.time.now);
      return {hint:s.hud.status.text,reset:s.recoverButton.visible,expected:s.expected};
    });
    await capture(`${course}-missed-gate`);
    report.navigation.push({course,...state});
    if(!baseline){assert.match(state.hint,/MISSED/);assert.equal(state.reset,true);assert.equal(state.expected,2);}
  }
  for(const [name,expected,index] of [['new-lap',1,-2],['missed-lap',0,30]]) {
    await load('manfield');
    const result=await page.evaluate(({expected,index})=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race'),line=s.track.centerline;
      const i=index<0?line.length+index:index,p=line[i],q=line[(i+1)%line.length];
      s.expected=expected;s.car.reset(p.x,p.y,Math.atan2(q.x-p.x,-(q.y-p.y)));
      s.routeUpdateAt=0;s.updateRouteHelp(s.time.now);
      return {hint:s.hud.status.text,reset:s.recoverButton.visible,expected:s.expected};
    },{expected,index});
    await capture(name);report.navigation.push({course:'manfield',case:name,...result});
    if(!baseline){assert.equal(result.reset,name==='missed-lap');assert.equal(result.hint.includes('MISSED'),name==='missed-lap');}
  }
  const cdp=await context.newCDPSession(page);
  for(const course of ['eastbourne-dash','remutaka','otaki']) {
    await load(course);
    const gas=await page.evaluate(()=>{const b=window.__BERYL_GAME__.scene.getScene('Race').touch.gas;return{x:b.cx,y:b.cy};});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...gas,id:1}]});
    assert.equal(await page.evaluate(()=>window.__BERYL_GAME__.scene.getScene('Race').touch.getInput().throttle),1);
    await page.evaluate(()=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race');
      s.recoveryCount=2;s.lapStartTime=s.time.now-83123;
      window.__testHonks=0;s.touch.setHornAction(()=>window.__testHonks++);
      s.finishSprint();window.__h._stepNoRender(150);
    });
    const heldAtFinish=await page.evaluate(()=>window.__BERYL_GAME__.scene.getScene('Race').touch.getInput().throttle);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await capture(`${course}-results`);
    const horn=await page.evaluate(()=>{const b=window.__BERYL_GAME__.scene.getScene('Race').touch.horn;return{x:b.cx,y:b.cy};});
    await page.touchscreen.tap(horn.x,horn.y);
    const result=await page.evaluate(()=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race');
      return {controlsVisible:s.touch.layer.visible,honks:window.__testHonks,input:s.touch.getInput(),
        penaltyText:s.def.theme==='eastbourne'?document.querySelector('.coastal-results').textContent:
          s.resultsPanel.list.filter(n=>n.type==='Text').map(n=>n.text).join('\n')};
    });
    report.finishes.push({course,heldAtFinish,...result});
    if(!baseline){
      assert.equal(heldAtFinish,0);assert.equal(result.controlsVisible,false);assert.equal(result.honks,0);
      assert.equal(result.input.throttle,0);assert.match(result.penaltyText,/6s/);
      if(course==='eastbourne-dash') {
        const name=page.getByRole('textbox',{name:'Name for local top three'});
        await name.fill('');
        await name.pressSequentially('sarah watts');
        report.typedName=await name.inputValue();
        assert.equal(report.typedName,'sarah watts','driving hotkeys must not swallow letters or spaces in a name');
        const saved=await page.evaluate(()=>{
          const s=window.__BERYL_GAME__.scene.getScene('Race');
          return JSON.parse(localStorage.getItem(`${s.def.storageKey}.podium`));
        });
        assert.ok(saved.some(row=>row.name==='SARAH WATTS'));
        await page.getByRole('button',{name:'DASH AGAIN',exact:true}).tap();
      }
      else {
        const retry=await page.evaluate(()=>{
          const s=window.__BERYL_GAME__.scene.getScene('Race');
          const b=s.resultsPanel.list.find(n=>n.input&&n.text!=='CHANGE COURSE').getBounds();
          return{x:b.centerX,y:b.centerY};
        });
        await page.touchscreen.tap(retry.x,retry.y);
      }
      await page.evaluate(async()=>{await window.advanceTime(0);await window.advanceTime(3000);});
      assert.equal(await page.evaluate(()=>{
        const s=window.__BERYL_GAME__.scene.getScene('Race');
        return s.timing&&!s.finished&&s.touch.enabled&&s.touch.layer.visible&&s.touch.getInput().throttle===0;
      }),true,`${course}: retry must restore neutral driving controls`);
      await page.keyboard.down('ArrowUp');
      assert.equal(await page.evaluate(()=>{
        const s=window.__BERYL_GAME__.scene.getScene('Race');
        s.harnessInput=null;return s.readInput().throttle;
      }),1,'keyboard driving must work after editing a result name and retrying');
      await page.keyboard.up('ArrowUp');
    }
  }
  if(!baseline) {
    await load('remutaka');
    const blocked=await page.evaluate(()=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race');
      s.harnessInput=null;
      const line=s.track.centerline,p=line[80],q=line[81];
      s.car.reset(p.x,p.y,Math.atan2(q.x-p.x,-(q.y-p.y)));
      s.hadContact=true;s.car.speed=0;s.routeUpdateAt=0;s.updateRouteHelp(s.time.now);
      s.routeUpdateAt=0;s.updateRouteHelp(s.time.now+1200);
      return s.hud.status.text;
    });
    assert.match(blocked,/BRAKE.*REVERSE/);
    await capture('reverse-instruction');
    const brake=await page.evaluate(()=>{const b=window.__BERYL_GAME__.scene.getScene('Race').touch.brake;return{x:b.cx,y:b.cy};});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...brake,id:1}]});
    await page.evaluate(()=>window.advanceTime(2000));
    const reverse=await page.evaluate(()=>{
      const s=window.__BERYL_GAME__.scene.getScene('Race');return{speed:s.car.speed,caption:s.touch.brake.caption.text};
    });
    assert.ok(reverse.speed<0);assert.equal(reverse.caption,'REVERSE');report.reverse=reverse;
    await capture('reverse-help');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify(report));
} finally {
  await writeFile(`${out}/${label}.json`,JSON.stringify({...report,errors},null,2));
  await context.close();await browser.close();await server.close();
}
