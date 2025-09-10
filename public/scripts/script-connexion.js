// bloquer la connexion en cas de logs incorrects

document.querySelector('.connect-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const email = emailInput.value;
  const password = passwordInput.value;
  const errorMessage = document.querySelector('.error-message');

  errorMessage.textContent = '';
  errorMessage.style.display = 'none';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok || data.ok === false) {
      errorMessage.textContent = data.message || 'Erreur inconnue';
      errorMessage.style.display = 'block';
    } else {
      const redirectTo = data.nextUrl || (data.isAdmin ? '/admin-board' : '/accueil') || '/accueil';
      window.location.assign(redirectTo);
    }

  } catch (err) {
    console.error('Erreur FETCH:', err);
    errorMessage.textContent = 'Erreur serveur';
    errorMessage.style.display = 'block';
  } finally {
    passwordInput.value = "";
  }
});