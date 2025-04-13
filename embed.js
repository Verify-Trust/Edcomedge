fetch('https://cdn.jsdelivr.net/gh/Verify-Trust/Edcomedge/Captcha.html')
  .then(response => response.text())
  .then(html => {
    const container = document.getElementById('my-captcha');
    if (container) {
      container.innerHTML = html;
    }
  });
