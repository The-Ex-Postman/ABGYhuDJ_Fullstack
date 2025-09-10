const currentUserId = document.body.dataset.userid;
const storedUserId = localStorage.getItem('currentUser');

// Nettoyage si changement d'utilisateur
if (storedUserId && storedUserId !== currentUserId) {
  localStorage.removeItem(`panierABGY_${storedUserId}`);
}
localStorage.setItem('currentUser', currentUserId);

// Déroulants des vignettes concert
const boutons = document.querySelectorAll('.deroulant');
boutons.forEach(bouton => {
  bouton.addEventListener('click', () => {
    const id = bouton.getAttribute('aria-controls');
    const bloc = document.getElementById(id);
    bloc.classList.toggle('visible');
  });
});

// Synchronisation depuis MongoDB au chargement
let panier = [];

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/cart/get');
    const data = await res.json();

    if (res.ok && Array.isArray(data.items)) {
      panier = data.items.map(item => ({
        concertId: item.concertId || null,
        ville: item.ville || 'Inconnue',
        debout: item.type === 'debout' ? item.quantite : 0,
        assis:  item.type === 'assis'  ? item.quantite : 0
      }));
    }

    localStorage.setItem(`panierABGY_${currentUserId}`, JSON.stringify(panier));
  } catch (err) {
    console.error("Erreur de récupération du panier depuis Mongo :", err);
  }
});

// Ajout au panier
const boutonAjout = document.querySelectorAll('.ajout-panier');

boutonAjout.forEach(btn => {
  btn.addEventListener('click', () => {
    const vignette = btn.closest('.vignette');
    const concertId = Number(vignette.dataset.id);
    const ville = vignette.dataset.ville;
    const prixDebout = Number(vignette.dataset.prixDebout);
    const prixAssis = Number(vignette.dataset.prixAssis);

    const inputDebout = vignette.querySelector(`input[id^="quantite-debout"]`);
    const inputAssis = vignette.querySelector(`input[id^="quantite-assis"]`);

    const qteDebout = parseInt(inputDebout?.value) || 0;
    const qteAssis = parseInt(inputAssis?.value) || 0;

    const stockTotal = Number(vignette.dataset.stockTotal || 0);
  const demande = qteDebout + qteAssis;
  if (Number.isFinite(stockTotal) && demande > stockTotal) {
    alert(`Il reste seulement ${stockTotal} place(s) pour ce concert.`);
    return;
  };

    const messageErreur = vignette.querySelector('.message-erreur');
    inputDebout?.classList.remove('erreur');
    inputAssis?.classList.remove('erreur');
    if (messageErreur) {
      messageErreur.style.display = 'none';
      messageErreur.textContent = '';
    }

    if (!Number.isInteger(concertId) || concertId <= 0) {
      console.error('data-id invalide =', vignette.dataset.id);
      alert("Impossible d'ajouter : concertId manquant.");
      return;
    }

    if ((qteDebout < 0 || qteAssis < 0) || (qteDebout === 0 && qteAssis === 0)) {
      if (messageErreur) {
        messageErreur.textContent = "Veuillez sélectionner au moins un billet valide.";
        messageErreur.style.display = 'block';
      }
      if (qteDebout <= 0) inputDebout?.classList.add('erreur');
      if (qteAssis <= 0) inputAssis?.classList.add('erreur');
      return;
    }

    const items = [];
    if (qteDebout > 0) {
      items.push({ concertId, type: 'debout', quantite: qteDebout, prixUnitaire: prixDebout });
    }
    if (qteAssis > 0) {
      items.push({ concertId, type: 'assis', quantite: qteAssis, prixUnitaire: prixAssis });
    }

    // MAJ panier local
    const index = panier.findIndex(item => item.ville === ville);
    if (index !== -1) {
      panier[index].debout += qteDebout;
      panier[index].assis += qteAssis;
    } else {
      panier.push({ ville, debout: qteDebout, assis: qteAssis });
    }
    localStorage.setItem(`panierABGY_${currentUserId}`, JSON.stringify(panier));

    // reset inputs
    if (inputDebout) inputDebout.value = '';
    if (inputAssis)  inputAssis.value  = '';

    // envoi groupé
    sauvegarderDansMongo(items);

    // replier le bloc
    const blocDeroulant = vignette.querySelector('.toogle-deroulant');
    const boutonToggle = vignette.querySelector('.deroulant');
    blocDeroulant?.classList.remove('visible');
    boutonToggle?.setAttribute('aria-expanded', 'false');
  });
});

// Envoi vers Mongo
async function sauvegarderDansMongo(items) {
  if (!Array.isArray(items) || items.length === 0) return;

  try {
    console.log('[POST /api/cart/add] ->', items);
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ items })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      console.error('Réponse API:', data);
      alert(data?.message || 'Erreur ajout panier');
      return;
    }
    alert('Ajouté au panier ✅');
  } catch (err) {
    console.error('Fetch error:', err);
    alert("Erreur réseau lors de l'ajout au panier");
  }
}