// Affichage du panier serveur
async function chargerPanierDepuisServeur() {
  try {
    const res = await fetch('/api/cart/get');
    if (!res.ok) throw new Error('Impossible de récupérer le panier.');

    const data = await res.json();
    const items = data.items || [];
    const meta  = data.meta  || {};

    const wrap = document.querySelector('.contenu-panier');
    if (!wrap) return;

    if (items.length === 0) {
      wrap.innerHTML = `
        <p class="nombre-places">Aucun billet sélectionné</p>
        <p class="prix-place">Prix unitaire : 0€</p>
        <p class="total">Total à payer : 0€</p>
      `;
      return;
    }

    // Grouper par concert
    const byConcert = new Map();
    for (const it of items) {
      const id = Number(it.concertId);
      const m  = meta[id] || {};
      if (!byConcert.has(id)) {
        byConcert.set(id, {
          ville: m.ville || `Concert #${id}`,
          image: m.image || '/public/assets/default.jpg',
          lignes: [],
          total: 0
        });
      }
      const q  = Number(it.quantite) || 0;
      const pu = Number(it.prixUnitaire) || 0;
      const st = q * pu;

      const bucket = byConcert.get(id);
      bucket.lignes.push({ type: String(it.type).toLowerCase(), q, pu, st });
      bucket.total += st;
    }

    // Total général
    let grandTotal = 0;
    for (const { total } of byConcert.values()) grandTotal += total;

    // Rendu HTML
    const cards = [];
    for (const [cid, c] of byConcert.entries()) {
      const lignesHtml = c.lignes.map(l =>
        `<li>${l.type} : ${l.q} place-s</li>`
      ).join('');

      cards.push(`
        <article class="recap-card" data-concert-id="${cid}">
          <img class="recap-img" src="${c.image}" alt="Ville ${c.ville}">
          <div class="recap-body">
            <h4 class="recap-title">${c.ville}</h4>
            <ul class="recap-lines">${lignesHtml}</ul>
            <p class="recap-subtotal">Sous-total : <strong>${c.total.toFixed(2)}&nbsp;€</strong></p>
          </div>
        </article>
      `);
    }

    wrap.innerHTML = `
      <div class="recap-grid">
        ${cards.join('')}
      </div>
      <p class="recap-grand-total">Total à payer : <strong>${grandTotal.toFixed(2)}&nbsp;€</strong></p>
    `;
  } catch (err) {
    console.error("Erreur lors du chargement du panier :", err);
  }
}

document.addEventListener('DOMContentLoaded', chargerPanierDepuisServeur);

//Alerte à l'ouverture de la page
window.addEventListener('DOMContentLoaded', () => {
    const alerte = document.querySelector('.alerte');
    const closeBtn = alerte?.querySelector('.close-alerte');
    if (alerte) {
        alerte.classList.remove('hidden');
        alerte.classList.add('show');

        closeBtn.addEventListener('click', () => alerte.classList.add('hidden'));

        setTimeout(() => {
            alerte.classList.add('fade-out');
            setTimeout(() => {
                alerte.classList.add('hidden');
                alerte.classList.remove('fade-out', 'show');
            }, 500);
        }, 10000);
    }
});

//check des infos personnelles
document.getElementById('btn-valider').addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const res = await fetch('/check-user-info');
    const data = await res.json();

    if (!data.ok) {
      alert(data.message);
      window.location.href = '/mon-compte?missing_info=1';
      return;
    }

    const resCart = await fetch('/api/cart/get');
    const dataCart = await resCart.json();
    const items = dataCart.items || [];

    if (items.length === 0) {
      alert("Votre panier est vide. Merci de sélectionner au moins un billet avant de procéder au paiement.");
      return;
    }

    document.getElementById('popup-overlay').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la vérification de vos informations.");
  }
});

//fermer le popup
const btnClose = document.getElementById('popup-close');
const overlay = document.getElementById('popup-overlay');

btnClose.addEventListener('click', () => {
  overlay.classList.add('hidden');
});

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.classList.add('hidden');
  }
});

//Valider les informations bancaire et envoyer le formulaire pour paiement
const formulairePaiement = document.querySelector('.saisie-cb form');

const regexCarte = /^[0-9]{16}$/;
const regexDate = /^(0[1-9]|1[0-2])\/[0-9]{2}$/;
const regexCVV = /^[0-9]{3}$/;

const boutonSubmit = formulairePaiement.querySelector('button[type="submit"]');

formulairePaiement.addEventListener('submit', async (e) => {
  e.preventDefault();

  const numeroCarte = document.getElementById('numero-carte').value.trim();
  const dateExp     = document.getElementById('date-exp').value.trim();
  const cvv         = document.getElementById('cvv').value.trim();

  if (!regexCarte.test(numeroCarte) || !regexDate.test(dateExp) || !regexCVV.test(cvv)) {
    alert("Veuillez remplir correctement les informations bancaires.");
    return;
  }

  boutonSubmit.disabled = true;
  boutonSubmit.textContent = "Traitement en cours...";

  try {
    // Appel serveur pour confirmer la commande
    const res = await fetch('/api/checkout/confirm', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        cardLast4: numeroCarte.slice(-4),
        exp: dateExp
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || 'Erreur lors de la confirmation');
    }

    // Succès: fermer le popup, vider l'affichage panier, message de succès
    overlay.classList.add('hidden');

    const container = document.querySelector('.main-container');
    container.innerHTML = `
      <h2 class="second-title">Paiement confirmé !</h2>
      <div style="background-color: white; padding: 1.5rem; border-radius: 100px;">
        <p style="font-size: 1.5rem; text-align: center; margin: 2rem;">
          Merci pour votre achat ! Vos billets ont été enregistrés.
          <br>(Un e-mail de confirmation vient de vous être envoyé.)
        </p>
      </div>
      <a href="/accueil" class="back-button" style="margin-top: 3rem;">Retour à l'accueil</a>
    `;
  } catch (err) {
    console.error(err);
    alert("Une erreur est survenue lors du paiement. Réessayez dans un instant.");
    boutonSubmit.disabled = false;
    boutonSubmit.textContent = "Paiement";
  }
});

//Empêcher le copier/coller
const champsSensibles = document.querySelectorAll('#numero-carte, #date-exp, #cvv');

champsSensibles.forEach(champ => {
    champ.addEventListener('paste', (e) => {
        e.preventDefault();
    });
    champ.addEventListener('copy', (e) => {
        e.preventDefault();
    });
    champ.addEventListener('cut', (e) => {
        e.preventDefault();
    });
});
