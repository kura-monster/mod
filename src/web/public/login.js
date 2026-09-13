document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.style.display = 'none';
  const code = document.getElementById('code-input').value.trim();

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.token) {
      errorEl.textContent = data.error || 'ログインに失敗しました。';
      errorEl.style.display = 'block';
      return;
    }

    localStorage.setItem('rula_admin_token', data.token);
    window.location.href = '/';
  } catch {
    errorEl.textContent = 'ログインに失敗しました。ネットワークを確認してください。';
    errorEl.style.display = 'block';
  }
});
