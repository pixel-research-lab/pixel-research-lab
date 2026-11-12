// Width is a percentage of the writing column, so the same layout works on another screen.
const imageResize = (() => {
  const controls = new WeakMap();
  const minimum = 1, maximum = 100;

  function mount(area, content, savedWidth, saveWidth) {
    const frame = document.createElement('div');
    frame.className = 'image-resize-frame';
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'image-resize-handle';
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', '그림 너비');
    handle.setAttribute('aria-valuemin', minimum);
    handle.setAttribute('aria-valuemax', maximum);
    handle.title = '모서리를 끌어 그림 크기 조절 · 방향키로도 조절할 수 있어요';
    const indicator = document.createElement('span');
    indicator.className = 'image-resize-value';
    indicator.setAttribute('aria-hidden', 'true');
    const message = document.createElement('small');
    message.className = 'image-resize-error';
    message.setAttribute('role', 'status');
    frame.append(content, handle, indicator);
    area.replaceChildren(frame, message);

    let drag = null, saving = false;
    function measuredPercent() {
      return Math.max(minimum, Math.min(maximum, Math.round(100 * frame.offsetWidth / area.clientWidth) || minimum));
    }
    function label() {
      const percent = measuredPercent();
      frame.classList.toggle('small-image', frame.offsetHeight < 32 || frame.offsetWidth < 40);
      indicator.textContent = percent + '%';
      handle.setAttribute('aria-valuenow', percent);
      handle.setAttribute('aria-valuetext', '본문 너비의 ' + percent + '%');
    }
    function display(percent) {
      const sized = Number.isInteger(percent) && percent >= minimum && percent <= maximum;
      frame.style.width = sized ? percent + '%' : '';
      frame.classList.toggle('user-sized', sized);
      label();
    }
    function refresh(percent) {
      if (!drag && !saving) display(percent);
    }
    controls.set(area, refresh);
    display(savedWidth);
    (content.querySelector('img') || content).addEventListener('load', label);
    handle.addEventListener('focus', label);
    handle.addEventListener('pointerenter', label);

    async function persist(percent, previous) {
      if (percent === previous) return;
      saving = true;
      handle.setAttribute('aria-busy', 'true');
      message.textContent = '';
      try {
        await saveWidth(percent);
      } catch (error) {
        display(previous);
        message.textContent = error.message || '크기를 저장하지 못했어요. 다시 조절해 주세요.';
      } finally {
        saving = false;
        handle.removeAttribute('aria-busy');
      }
    }
    function currentSetting() {
      return frame.classList.contains('user-sized') ? parseInt(frame.style.width, 10) : undefined;
    }
    handle.addEventListener('pointerdown', event => {
      if (drag || saving || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.focus({preventScroll:true});
      const bounds = frame.getBoundingClientRect();
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, width:bounds.width,
        aspect:bounds.width / Math.max(1, bounds.height), column:area.clientWidth, previous:currentSetting()};
      handle.setPointerCapture(event.pointerId);
      frame.classList.add('is-resizing');
      label();
    });
    function move(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) return;
        drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      // The frame is centered: its right edge moves by half the change in width.
      const delta = drag.axis === 'x' ? 2 * dx : dy * drag.aspect;
      display(Math.max(minimum, Math.min(maximum, Math.round(100 * (drag.width + delta) / drag.column))));
    }
    function finish(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const previous = drag.previous;
      const released = event.type === 'pointerup';
      if (released) move(event);
      drag = null;
      frame.classList.remove('is-resizing');
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (released) persist(currentSetting(), previous);
      else display(previous);
    }
    handle.addEventListener('pointermove', move);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) handle.addEventListener(type, finish);
    handle.addEventListener('keydown', event => {
      const width = measuredPercent(), step = event.shiftKey ? 1 : 5;
      const keys = {ArrowRight:width+step, ArrowUp:width+step, ArrowLeft:width-step, ArrowDown:width-step,
        Home:minimum, End:maximum};
      if (!Object.hasOwn(keys, event.key)) return;
      event.preventDefault();
      if (saving || drag) return;
      const previous = currentSetting();
      const percent = Math.max(minimum, Math.min(maximum, keys[event.key]));
      display(percent);
      persist(percent, previous);
    });
  }
  return {mount, refresh:(area,percent)=>controls.get(area)?.(percent)};
})();
