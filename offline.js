(() => {
  const status = document.getElementById('offline-status');
  status.hidden = false;
  let prepared = false;
  let failed = false;
  function update() {
    if (prepared) {
      status.textContent = navigator.onLine ? '오프라인 준비 완료 · 이 기기에 저장' : '오프라인 · 지금도 이 기기에 저장해요';
    } else {
      status.textContent = failed ? '오프라인 준비 실패 · 연결을 확인하고 다시 열어 주세요.' : '이 기기에서 오프라인으로 쓸 수 있게 준비 중…';
    }
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
  async function start() {
    try {
      if (!('serviceWorker' in navigator)) throw Error('unsupported');
      const registration = await navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'});
      const worker = registration.installing;
      if (worker) worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant' && !prepared) {failed = true;update();}
      });
      await navigator.serviceWorker.ready;
      prepared = true;
    } catch {failed = true;}
    update();
  }
  start();
})();
