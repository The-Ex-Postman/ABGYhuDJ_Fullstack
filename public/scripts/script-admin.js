document.addEventListener('DOMContentLoaded', () => {
  const $sel  = document.getElementById('villeSelect');
  const $in   = document.getElementById('stockInput');
  const $btn  = document.getElementById('saveBtn');
  const $info = document.getElementById('info');

  const getOpt = () => $sel.options[$sel.selectedIndex];

  function setInfo(msg, ok=true) {
    $info.textContent = msg || '';
    $info.style.color = ok ? '#198754' : '#dc3545';
    if (msg) setTimeout(() => { $info.textContent = ''; }, 1800);
  }

  function resetUI() {
    $sel.value = '';
    $in.value = '';
    $in.placeholder = '—';
    $in.disabled = true;
    $btn.disabled = true;
  }

  function onSelectChange() {
    const opt = getOpt();
    if (!opt || !opt.value) return resetUI();
    const stock = Number(opt.dataset.stock ?? '');
    $in.value = '';
    $in.placeholder = Number.isFinite(stock) ? String(stock) : '—';
    $in.disabled = false;
    $btn.disabled = true;
    setInfo('');
  }

  function toggleButton() {
    const opt = getOpt();
    if (!opt || !opt.value) { $btn.disabled = true; return; }
    const base = Number(opt.dataset.stock ?? '');
    const cur  = Number($in.value);
    const valid = Number.isFinite(cur) && cur >= 0;
    $btn.disabled = !(valid && cur !== base);
  }

  $sel.addEventListener('change', onSelectChange);
  $in.addEventListener('input', toggleButton);

  $btn.addEventListener('click', async () => {
    const opt = getOpt();
    const id  = opt?.value;
    const val = Number($in.value);
    if (!id || !Number.isFinite(val) || val < 0) return setInfo('Valeur invalide', false);

    const oldText = $btn.textContent;
    $btn.textContent = 'Enregistrement...';
    $btn.disabled = true;
    $in.disabled  = true;

    try {
      const r = await fetch(`/admin/api/concerts/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ placesDispo: val })
      });

      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await r.json() : null;

      if (!r.ok || !data?.ok) {
        const msg = r.status === 403 ? 'Accès refusé. Reconnecte-toi en admin.' : (data?.message || 'Erreur serveur');
        throw new Error(msg);
      }

      opt.dataset.stock = String(data.concert.placesDispo);
      resetUI();
      setInfo('Stock mis à jour ✔');

    } catch (e) {
      setInfo(e.message, false);
      $in.disabled = false;
    } finally {
      $btn.textContent = oldText;
      toggleButton();
    }
  });

  resetUI();
});