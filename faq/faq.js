document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('faq-container');
  const tabs = document.querySelectorAll('.faq-tab');

  const res = await fetch('/faq/faq-data.json');
  const faqData = await res.json();

  function renderSection(sectionKey) {
    container.innerHTML = '';

    const items = faqData[sectionKey];
    if (!items) return;

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'faq-item';

      div.innerHTML = `
        <h3>${item.question}</h3>
        <p>${item.answer}</p>
      `;

      container.appendChild(div);
    });
  }

  // Render inicial
  renderSection('general');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      renderSection(tab.dataset.target);
    });
  });
});
