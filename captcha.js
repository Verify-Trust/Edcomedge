<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Verify. Trust powered by edcomedge – Sicheres Captcha</title>
  <!-- Globale Basisstyles: Hier wird Roboto als Standardschrift verwendet -->
  <style>
    body {
      margin: 0;
      background-color: #f9f9f9;
      font-family: 'Roboto', sans-serif;
    }
    /* Das unsichtbare Formular soll keinerlei Platz einnehmen */
    #myForm {
      display: none;
    }
    /* Verstecktes Element für den CSS-Style-Check */
    #styleCheck {
      width: 100px;
      height: 100px;
      display: none;
    }
  </style>
</head>
<body>
  <!-- Unsichtbares Formular, das alle Prüfungen des Captchas enthält -->
  <form id="myForm" action="/your-backend-endpoint" method="post" aria-hidden="true">
    <!-- Honeypot-Feld: Bots füllen dieses Feld in der Regel, echte Nutzer nicht -->
    <input type="text" name="botcheck" style="display:none">
    <!-- JavaScript-Validierung: Dieses Feld wird per Skript gesetzt -->
    <input type="hidden" id="jsCheck" name="jsCheck" value="">
    <!-- Erfolgsflag wird unsichtbar kommuniziert -->
    <input type="hidden" id="captchaPassed" name="captchaPassed" value="false">
  </form>
  
  <!-- Verstecktes Element für CSS-Check -->
  <div id="styleCheck"></div>


  <!-- Container für das Captcha-Widget (sichtbar für den Nutzer) -->
  <div id="verifyContainer" style="display: none;"></div>


  <!-- Template für das Captcha-Widget – Inhalte werden in das isolierte Shadow DOM eingebunden -->
  <template id="captchaTemplate">
    <style>
      /* Importiere Google Font "Poppins" exklusiv für den Captcha-Text */
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap');
      
      /* Styles, die ausschließlich im Shadow DOM gelten */
      .verify-container {
        width: 304px;
        height: 78px;
        background: #fff;
        border: 1px solid #d3d3d3;
        border-radius: 3px;
        box-shadow: 0 0 2px rgba(0,0,0,0.15);
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate3d(-50%, -50%, 0);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: background 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
      }
      .verify-left {
        display: flex;
        align-items: center;
        padding-left: 8px;
        flex: 1;
      }
      .checkbox-area {
        width: 28px;
        height: 28px;
        border: 2px solid #d3d3d3;
        border-radius: 2px;
        background: #fff;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        margin-right: 8px;
      }
      .checkbox-area:hover {
        border-color: #bbb;
        box-shadow: 0 0 2px rgba(0, 0, 0, 0.2);
      }
      .checkbox-area.loading {
        border: none;
        background: transparent;
        box-shadow: none;
      }
      .checkbox-default {
        width: 18px;
        height: 18px;
        margin: 5px auto 0 auto;
        transition: opacity 0.3s ease;
      }
      .checkbox-area.loading .checkbox-default,
      .checkbox-area.verified .checkbox-default {
        display: none;
      }
      .spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 24px;
        height: 24px;
        margin: -12px 0 0 -12px;
        border: 3px solid rgba(26, 43, 109, 0.2);
        border-top: 3px solid #1a2b6d;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: none;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .checkmark-svg {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 28px;
        height: 28px;
        transform: translate(-50%, -50%) scale(1);
        stroke: #212121;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        stroke-dasharray: 40;
        stroke-dashoffset: 40;
        transition: stroke-dashoffset 0.5s cubic-bezier(0.2, 0, 0.2, 1), transform 0.3s ease-out;
        display: none;
      }
      .checkmark-svg.active {
        stroke-dashoffset: 0;
        transform: translate(-50%, -50%) scale(1.1);
        display: block;
      }
      .checkbox-label {
        font-size: 14px;
        font-family: 'Poppins', sans-serif;
        color: #555;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      .verify-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding-right: 8px;
      }
      .verify-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-bottom: 2px;
      }
      .verify-logo-img {
        width: 32px;
        height: 32px;
        image-rendering: crisp-edges; /* für eine hochauflösende, klare Darstellung */
      }
      .verify-terms {
        font-size: 10px;
        color: #888;
        text-align: right;
        line-height: 1.2;
        white-space: nowrap;
      }
      /* Fehleranzeige: unten links im Captcha-Widget */
      #captchaError {
        position: absolute;
        bottom: 5px;
        left: 8px;
        color: #d32f2f;
        font-size: 12px;
        font-family: 'Poppins', sans-serif;
        display: none;
      }
      @media (max-width: 375px) {
        .verify-container { transform: scale(0.95) translate3d(-50%, -50%, 0); }
        .checkbox-label { font-size: 13px; }
      }
      @media (max-width: 320px) {
        .verify-container { transform: scale(0.90) translate3d(-50%, -50%, 0); }
        .checkbox-label { font-size: 12px; }
      }
    </style>
    
    <!-- Das Captcha-Widget inkl. Fehleranzeige -->
    <div class="verify-container" id="verifyBox">
      <div class="verify-left">
        <div class="checkbox-area" id="checkboxArea" role="checkbox" aria-label="Ich bin kein Roboter" aria-checked="false">
          <div class="checkbox-default" id="checkboxDefault"></div>
          <div class="spinner" id="spinner"></div>
          <svg class="checkmark-svg" id="checkmarkSVG" viewBox="0 0 24 24">
            <polyline points="4 12 9 17 20 6"></polyline>
          </svg>
        </div>
        <div class="checkbox-label" id="checkboxLabel">Ich bin kein Roboter</div>
      </div>
      <div class="verify-right">
        <div class="verify-logo">
          <img class="verify-logo-img" id="verifyLogo" src="https://files.catbox.moe/iap2g5.png" alt="edcomedge Logo">
        </div>
        <div class="verify-terms">
          Verify. Trust<br>
          powered by edcomedge
        </div>
      </div>
      <div id="captchaError"></div>
    </div>
  </template>


  <!-- JavaScript: Erweiterte Bot-Schutz-Logik und Captcha-Integration -->
  <script>
    /********************************************************************
     * ORIGINAL-Funktionen sichern um Überschreiben zu verhindern
     ********************************************************************/
    const _addEventListener = window.addEventListener;
    const _setTimeout = window.setTimeout;
    const _consoleLog = console.log;


    /********************************************************************
     * INITIALISIERUNG & GRUNDLEGENDE BOT-SCHUTZ-MASSNAHMEN
     ********************************************************************/
    
    const loadTime = Date.now();
    let hasMoved = false;
    let userClickedCaptcha = false;
    let captchaVerified = false;
    
    // Bonus: Sammle einen Interaktions-Score
    let userScore = 0;
    document.addEventListener('mousemove', () => { userScore += 1; });
    document.addEventListener('keydown', () => { userScore += 3; });
    document.addEventListener('scroll', () => { userScore += 2; }); // zusätzliche Scroll-Aktivität
    
    // Erfassung von Maus- und Touch-Ereignissen
    window.addEventListener('mousemove', () => { hasMoved = true; });
    window.addEventListener('touchstart', () => { hasMoved = true; });
    
    // Setze den JavaScript-Check mit Fallback für requestIdleCallback
    document.getElementById('jsCheck').value = 'js-ok';
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        document.getElementById('jsCheck').value = 'idle-ok';
      });
    } else {
      _setTimeout(() => {
        document.getElementById('jsCheck').value = 'idle-ok';
      }, 100);
    }
    
    // Zufallswert als unsichtbare Checksum zur Variabilisierung – hier könnte man später noch weitere Parameter (z.B. User-Agent) mit einfließen lassen
    const randomChecksum = Math.floor(Math.random() * 1000) * 17;
    document.getElementById('captchaPassed').setAttribute('data-checksum', randomChecksum);
    
    /********************************************************************
     * ZUSÄTZLICHE CLIENTSEITIGE SICHERHEITSPRÜFUNGEN
     ********************************************************************/
    
    // 1. WebDriver / Headless-Erkennung
    function isNotHeadless() {
      if (navigator.webdriver) {
        console.warn("Headless/WebDriver erkannt.");
        return false;
      }
      return true;
    }
    
    // 2. Sichtbarkeits- und Fokus-Check
    function isPageVisible() {
      if (document.visibilityState !== 'visible') {
        console.warn("Seite nicht sichtbar.");
        return false;
      }
      return true;
    }
    
    // 3. AudioContext-Funktionalität
    function hasWorkingAudioContext() {
      try {
        new (window.AudioContext || window.webkitAudioContext)();
        return true;
      } catch (e) {
        console.warn("AudioContext nicht verfügbar.");
        return false;
      }
    }
    
    // 4. Zeitzonenprüfung
    function hasValidTimezone() {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || tz.length < 2) {
        console.warn("Ungültige Zeitzone.");
        return false;
      }
      return true;
    }
    
    // 5. CSS-Style-Check
    function isStyleCorrect() {
      const elem = document.getElementById('styleCheck');
      if (elem) {
        const style = getComputedStyle(elem);
        if (style.display !== 'none') {
          console.warn("CSS-Check fehlgeschlagen.");
          return false;
        }
      }
      return true;
    }
    
    // 6. Webfont-Detection für "Poppins"
    function fontTest(font) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = "72px monospace";
      const baseline = ctx.measureText("test").width;
      ctx.font = `72px '${font}', monospace`;
      const testSize = ctx.measureText("test").width;
      return baseline !== testSize;
    }
    function isFontLoaded() {
      if (!fontTest("Poppins")) {
        console.warn("Poppins Webfont nicht geladen.");
        return false;
      }
      return true;
    }
    
    // 7. Klick-Koordinaten-Check: Echte Nutzer klicken tendenziell in der Mitte
    function isClickValid(e) {
      if (e.offsetX < 2 || e.offsetY < 2) {
        console.warn("Ungültige Klickposition.");
        return false;
      }
      return true;
    }
    
    // 8. Genügend Benutzerinteraktion muss vorliegen
    function hasSufficientUserInteraction() {
      if (userScore < 5) {
        console.warn("Interaktions-Score zu niedrig.");
        return false;
      }
      return true;
    }
    
    // 9. Einfache DevTools-Erkennung (nicht absolut, aber als Zusatz)
    function isDevToolsClosed() {
      // Beispiel: Differenz zwischen innerWidth und outerWidth
      if (window.outerWidth - window.innerWidth > 160) {
        console.warn("DevTools scheint geöffnet.");
        return false;
      }
      return true;
    }
    
    // Kombinierte zusätzliche Sicherheitsprüfungen
    function extraSecurityChecks(e) {
      return isNotHeadless() &&
             isPageVisible() &&
             hasWorkingAudioContext() &&
             hasValidTimezone() &&
             isStyleCorrect() &&
             isFontLoaded() &&
             hasSufficientUserInteraction() &&
             isDevToolsClosed() &&
             (e ? isClickValid(e) : true);
    }
    
    /********************************************************************
     * GRUNDLEGENDE CAPTCHA VALIDIERUNG (OHNE EXTERNE INTERAKTIONEN)
     ********************************************************************/
    function hasHumanWaited() {
      return Date.now() - loadTime >= 2000;
    }
    function isHoneypotClean() {
      return document.querySelector('[name="botcheck"]').value === '';
    }
    function isJavaScriptActive() {
      return document.getElementById('jsCheck').value !== '';
    }
    function wasThereMovement() {
      return hasMoved;
    }
    
    // Gesamte Captcha-Validierung: Alle Bedingungen müssen erfüllt sein
    function validateCaptcha(e) {
      return userClickedCaptcha &&
             hasHumanWaited() &&
             isHoneypotClean() &&
             isJavaScriptActive() &&
             wasThereMovement() &&
             extraSecurityChecks(e);
    }
    
    /********************************************************************
     * CAPTCHA-WIDGET: AUFBAU IM SHADOW DOM UND INTERAKTIVE LOGIK
     ********************************************************************/
    const container = document.getElementById('verifyContainer');
    const shadow = container.attachShadow({ mode: 'open' });
    const template = document.getElementById('captchaTemplate');
    shadow.appendChild(template.content.cloneNode(true));
    
    // Erzeugt ein leicht randomisiertes Intervall für den Prüf-Loop
    function getRandomInterval() {
      return Math.floor(Math.random() * 50) + 100; // zufällig zwischen 100ms und 150ms
    }
    
    // Event-Handler für Klicks im Captcha-Widget
    function captchaClickHandler(e) {
      if (captchaVerified) return;
      
      if (!isClickValid(e)) {
        console.warn("Klick ungültig.");
        return;
      }
      
      console.log("Captcha wurde angeklickt.");
      userClickedCaptcha = true;
      const errorMsgEl = shadow.getElementById('captchaError');
      errorMsgEl.style.display = 'none';
      
      const checkboxArea = shadow.getElementById('checkboxArea');
      const checkboxDefault = shadow.getElementById('checkboxDefault');
      const spinner = shadow.getElementById('spinner');
      const checkmarkSVG = shadow.getElementById('checkmarkSVG');
      const checkboxLabel = shadow.getElementById('checkboxLabel');
      const logoImg = shadow.getElementById('verifyLogo');
      const verifyBox = shadow.getElementById('verifyBox');
      const form = document.getElementById('myForm');
      const captchaPassedEl = document.getElementById('captchaPassed');
      
      // Sanftere Übergänge und hochauflösende Animationen
      checkboxArea.style.transition = 'all 0.3s ease';
      checkboxLabel.style.transition = 'all 0.3s ease';
      
      checkboxArea.classList.add('loading');
      checkboxDefault.style.display = 'none';
      spinner.style.display = 'block';
      
      const captchaInterval = setInterval(() => {
        console.log({
          userClickedCaptcha,
          waited: hasHumanWaited(),
          honeypot: isHoneypotClean(),
          jsActive: isJavaScriptActive(),
          movement: wasThereMovement(),
          userScore: userScore
        });
        
        if (validateCaptcha(e)) {
          clearInterval(captchaInterval);
          spinner.style.display = 'none';
          checkmarkSVG.classList.add('active');
          checkboxLabel.style.transform = 'translateX(-10px)';
          checkboxLabel.style.opacity = '0';
          
          setTimeout(() => {
            checkboxLabel.textContent = 'erfolgreich';
            checkboxLabel.style.transform = 'translateX(0)';
            checkboxLabel.style.opacity = '1';
            checkboxArea.classList.add('verified');
            // Update ARIA-Attribute für Barrierefreiheit
            checkboxArea.setAttribute('aria-checked', 'true');
            
            captchaVerified = true;
            captchaPassedEl.value = 'true';
            
            // Beispiel einer asynchronen Formularübermittlung mit Fetch (Fallback via catch)
            const formData = new FormData(form);
            fetch(form.action, {
              method: 'POST',
              body: formData
            })
            .then(response => response.text())
            .then(data => {
              console.log("Formular asynchron übermittelt:", data);
            })
            .catch(err => {
              console.error("Fehler beim Absenden:", err);
              errorMsgEl.textContent = 'Bot-Interaktion erkannt.';
              errorMsgEl.style.display = 'block';
            });
            
            checkboxArea.style.cursor = 'default';
            checkboxArea.removeEventListener('click', captchaClickHandler);
          }, 300);
          
        } else {
          if (Date.now() - loadTime > 10000 && !validateCaptcha(e)) {
            clearInterval(captchaInterval);
            spinner.style.display = 'none';
            errorMsgEl.textContent = 'Bot-Interaktion erkannt.';
            errorMsgEl.style.display = 'block';
            checkboxArea.classList.remove('loading');
            checkboxDefault.style.display = 'block';
            userClickedCaptcha = false;
          }
        }
      }, getRandomInterval());
      
      if (logoImg.complete) {
        verifyBox.style.visibility = 'visible';
      } else {
        logoImg.onload = function() { verifyBox.style.visibility = 'visible'; };
      }
    }
    
    // Widget einblenden, sobald alle Assets geladen sind
    window.addEventListener('load', () => {
      container.style.display = 'block';
      const checkboxArea = shadow.getElementById('checkboxArea');
      checkboxArea.removeAttribute('disabled');
      checkboxArea.addEventListener('click', captchaClickHandler);
    });
    
    /********************************************************************
     * FORMULAR-VALIDIERUNG: Verhindern des Absendevorgangs ohne gültiges Captcha
     ********************************************************************/
    document.getElementById('myForm').addEventListener('submit', (e) => {
      if (!validateCaptcha()) {
        e.preventDefault();
        alert('Captcha nicht korrekt ausgeführt – möglicherweise ein Bot.');
      }
    });
  </script>
  
</body>
</html>