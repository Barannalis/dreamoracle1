<script>
/* basit SPA-vari nav aktiflik */
(function(){
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const href = a.getAttribute('href') || '';
    if (href.endsWith(here)) a.classList.add('active');
  });
})();

/* global sabitler */
const FORMS_ENDPOINT = '/api/send-email'; // Vercel serverless function
const THANKS_URL = '/thanks.html';

/* contact form JS – sayfada varsa bağlanır */
(function(){
  const form = document.querySelector('#dreamForm');
  if(!form) return;
  const submitBtn = form.querySelector('[type="submit"]');
  const infoOk = document.querySelector('#info-ok');
  const infoErr = document.querySelector('#info-err');

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    infoOk.style.display = 'none';
    infoErr.style.display = 'none';
    submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor…';

    const payload = {
      name: form.fullname.value.trim(),
      email: form.email.value.trim(),
      package: form.package.value,
      priority: form.priority.value,
      message: form.message.value.trim()
    };

    try{
      const res = await fetch(FORMS_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });

      if(!res.ok){
        const t = await res.text().catch(()=> '');
        throw new Error(`Sunucu ${res.status}: ${t || 'Hata'}`);
      }
      // başarılı
      infoOk.style.display = 'block';
      setTimeout(()=>location.href = THANKS_URL, 600);
    }catch(err){
      infoErr.textContent = 'Gönderilemedi: ' + err.message;
      infoErr.style.display = 'block';
    }finally{
      submitBtn.disabled = false; submitBtn.textContent = 'Gönder →';
    }
  });
})();
</script>
