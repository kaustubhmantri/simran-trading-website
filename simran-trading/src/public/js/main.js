document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-modal="product"]');
  if (target) {
    const id = target.getAttribute('data-id');
    const modal = document.getElementById('product-modal');
    const body = document.getElementById('modal-body');
    modal.classList.add('open');
    body.innerHTML = '<p>Loading...</p>';
    try {
      const res = await fetch(`/api/products/${id}`);
      const p = await res.json();
      if (!p || p.error) throw new Error('Not found');
      body.innerHTML = `
        <h2>${p.name_en}</h2>
        ${p.image_path ? `<img src="${p.image_path}" style="max-width:100%;border-radius:8px"/>` : ''}
        ${p.benefits_en ? `<h3>Benefits</h3><p>${p.benefits_en}</p>` : ''}
        ${p.ingredients_en ? `<h3>Ingredients</h3><p>${p.ingredients_en}</p>` : ''}
        ${p.price ? `<p><strong>Price:</strong> ${p.price}</p>` : ''}
        <p><a class="btn whatsapp" href="https://wa.me/${p.whatsapp_number || window.whatsappNumber || ''}?text=${encodeURIComponent((p.name_en||'Product') + ' - Inquiry')}" target="_blank" rel="noopener">Order via WhatsApp</a></p>
      `;
    } catch (err) {
      body.innerHTML = '<p>Unable to load product.</p>';
    }
  }
  if (e.target.matches('[data-close="true"]')) {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  }
});

// Smooth anchor scrolling
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  });
});