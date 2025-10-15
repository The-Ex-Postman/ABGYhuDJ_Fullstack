document.addEventListener('DOMContentLoaded', () => {
  const btnEdit = document.getElementById('btn-edit');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');

  const statics = Array.from(document.querySelectorAll('.champ-statique'));
  const inputs = Array.from(document.querySelectorAll('.champ-editable'));

  const initialValues = {};
  inputs.forEach(input => { initialValues[input.name] = input.value ?? ''; });

  function enterEditMode() {
    statics.forEach(p => p.classList.add('hidden'));
    inputs.forEach(i => i.classList.remove('hidden'));
    btnEdit.classList.add('hidden');
    btnCancel.classList.remove('hidden');
    btnSave.classList.remove('hidden');
    const first = inputs[0];
    if (first) first.focus();
  }

  function exitEditMode(restore = false) {
    if (restore) {
      inputs.forEach(i => {
        i.value = initialValues[i.name] ?? '';
      });
    } else {
      inputs.forEach(i => {
        const p = document.querySelector(`.champ-statique[data-champ="${i.name}"]`);
        if (p) p.textContent = i.value;
        initialValues[i.name] = i.value;
      });
    }

    statics.forEach(p => p.classList.remove('hidden'));
    inputs.forEach(i => i.classList.add('hidden'));
    btnEdit.classList.remove('hidden');
    btnCancel.classList.add('hidden');
    btnSave.classList.add('hidden');
  }

  btnEdit?.addEventListener('click', enterEditMode);
  btnCancel?.addEventListener('click', () => exitEditMode(true));
});

document.addEventListener('DOMContentLoaded', () => {
  const openBtn   = document.getElementById('open-delete');
  const popup     = document.getElementById('popup-delete');
  const noBtn     = popup?.querySelector('.non-btn');

  if (!openBtn || !popup || !noBtn) return;

  function openPopup(e) {
    e?.preventDefault();
    popup.classList.remove('hidden');
    noBtn.focus();
  }

  function closePopup() {
    popup.classList.add('hidden');
    openBtn.focus();
  }

  openBtn.addEventListener('click', openPopup);

  noBtn.addEventListener('click', closePopup);

  popup.addEventListener('click', (e) => {
    const content = e.currentTarget.querySelector('.popup-delete-contenu');
    if (!content.contains(e.target)) closePopup();
  });

  document.addEventListener('keydown', (e) => {
    if (!popup.classList.contains('hidden') && e.key === 'Escape') {
      closePopup();
    }
  });
});