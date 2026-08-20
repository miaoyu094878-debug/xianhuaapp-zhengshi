const fs = require('fs');
const http = require('http');

function getJSON(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}
function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.__pending = new Map(); ws.__id = 0;
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && ws.__pending.has(m.id)) { ws.__pending.get(m.id)(m); ws.__pending.delete(m.id); }
    });
  });
}
function cdp(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = ++ws.__id; const t = setTimeout(() => reject(new Error('timeout ' + method)), 8000);
    ws.__pending.set(id, m => { clearTimeout(t); resolve(m.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

(async () => {
  const out = [];
  const log = s => out.push(s);
  try {
    const targets = await getJSON('http://127.0.0.1:9222/json');
    const page = targets.find(t => t.type === 'page');
    const ws = await wsConnect(page.webSocketDebuggerUrl);
    await cdp(ws, 'Runtime.enable', {});
    await cdp(ws, 'Page.navigate', { url: 'http://127.0.0.1:8123/index.html' });
    await new Promise(r => setTimeout(r, 3000));

    const run = async (expr) => {
      const r = await cdp(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
      if (r.exceptionDetails) throw new Error('EVAL ' + JSON.stringify(r.exceptionDetails.text));
      return r.result.value;
    };

    await run(`(function(){ var b=[].slice.call(document.querySelectorAll('[data-tab]')); var t=b.find(x=>x.getAttribute('data-tab')==='tab-wallpaper'); if(t) t.click(); return true; })()`);
    await new Promise(r => setTimeout(r, 800));

    const res = await run(`(function(){
      var cnv=document.getElementById('wpCanvas');
      var rect=cnv.getBoundingClientRect();
      var cs=getComputedStyle(cnv);
      return {
        styleAspect: cnv.style.aspectRatio,
        bufW: cnv.width, bufH: cnv.height,
        dispW: Math.round(rect.width), dispH: Math.round(rect.height),
        dispRatio: +(rect.width/rect.height).toFixed(4),
        bufRatio: +(cnv.width/cnv.height).toFixed(4),
        cssHeight: cs.height, cssWidth: cs.width
      };
    })()`);
    log('CANVAS_METRICS=' + JSON.stringify(res));
    const okDisp = Math.abs(res.dispRatio - res.bufRatio) < 0.03;
    const okStyle = res.styleAspect === '1080 / 1920';
    log('displayMatchesBuffer=' + okDisp + ' styleAspectSet=' + okStyle + ' PASS=' + (okDisp && okStyle));
    fs.writeFileSync('C:/tmp/wpcrop_result.txt', out.join('\n') + '\nVERDICT=' + (okDisp && okStyle ? 'PASS' : 'FAIL'));
  } catch (e) {
    fs.writeFileSync('C:/tmp/wpcrop_result.txt', out.join('\n') + '\nFATAL=' + e.message);
  }
})();
