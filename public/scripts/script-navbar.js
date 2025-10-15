const toggleNavbar = document.querySelector('.toggle-compte');
const menu = document.querySelector('.compte-menu');

  if (toggleNavbar && menu) {
    toggleNavbar.addEventListener('click', () => {
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!toggleNavbar.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

document.addEventListener('DOMContentLoaded', () => {
  const boutonPanier = document.querySelector('[data-popup-panier]');
  const popup = document.getElementById('popup-panier');
  const closeBtn = popup?.querySelector('.close-btn');

  if (boutonPanier && popup && closeBtn) {
    boutonPanier.addEventListener('click', async (e) => {
      e.preventDefault();
      await afficherPanier();
      popup.classList.remove('hidden');
      if (typeof menu !== 'undefined' && menu) menu.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => popup.classList.add('hidden'));
    popup.addEventListener('click', (e) => { if (e.target === popup) popup.classList.add('hidden'); });
  }

  async function afficherPanier() {
    try {
      const res = await fetch('/api/cart/get');
      if (!res.ok) throw new Error('Impossible de récupérer le panier.');

      const data  = await res.json();
      const items = data.items || [];
      const meta  = data.meta  || {};

      const detailPanier = document.querySelector('#detail-panier');
      const nbrPlaces    = detailPanier.querySelector('.nombre-places-p');
      const prixUnit     = detailPanier.querySelector('.prix-places-p');
      const totalMontant = detailPanier.querySelector('.total-p');
      const btnFiled     = document.querySelector('.if-filed');
      const btnEmpty     = document.querySelector('.if-empty');
      const btnClear     = document.querySelector('.btn-clear');

      if (btnClear) btnClear.hidden = items.length === 0;
      if (btnEmpty) btnEmpty.hidden = items.length !== 0;
      if (btnFiled) btnFiled.hidden = items.length === 0;

      if (items.length === 0) {
        nbrPlaces.textContent = 'Aucun billet sélectionné';
        prixUnit.textContent = '';
        totalMontant.textContent = '';
        return;
      }

      const fmt = (n) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let totalPrix = 0;
      const lignes = [];

      for (const item of items) {
        const qte   = Number(item.quantite) || 0;
        const prix  = Number(item.prixUnitaire) || 0;
        const st    = qte * prix;
        totalPrix  += st;

        const cid   = item.concertId;
        const ville = (meta[cid] && meta[cid].ville) || '—';

        lignes.push(`${ville} - ${item.type} : ${qte} × ${fmt(prix)} € = ${fmt(st)} €`);
      }

      nbrPlaces.innerHTML = lignes.map(l => `<p>${l}</p>`).join('');
      prixUnit.style.display = 'none';
      totalMontant.textContent = `Total à payer : ${fmt(totalPrix)} €`;
    } catch (err) {
      console.error("Erreur lors du chargement du panier :", err);
    }
  }
});

document.getElementById('empty-cart')?.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const res = await fetch('/api/cart/clear', { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || 'Impossible de vider le panier');

    const uid = document.body.dataset.userid || localStorage.getItem('currentUser') || '';
    if (uid) localStorage.removeItem(`panierABGY_${uid}`);

    window.location.reload();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Erreur lors du vidage du panier');
  }
});