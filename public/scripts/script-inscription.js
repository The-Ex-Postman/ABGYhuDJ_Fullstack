document.querySelector('.register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-pw');
  const confirmPasswordInput = document.getElementById('confirm-pw');

  const email = emailInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const errorContainers = document.querySelectorAll('.error-message');
  errorContainers.forEach(c => {
    c.textContent = '';
    c.style.display = 'none';
  });

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      const errorField = document.getElementById(`error-${data.field}`);
      if (errorField) {
        errorField.textContent = data.message;
        errorField.style.display = 'block';
      }
      return;
    }

    alert('Compte créé avec succès !');
    window.location.href = '/';

  } catch (err) {
    console.error('Erreur réseau :', err);

  } finally {
    passwordInput.value = '';
    confirmPasswordInput.value = '';
  }
});
