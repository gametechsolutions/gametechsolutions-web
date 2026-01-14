document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.faq-tab');
  const sections = document.querySelectorAll('.faq-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;

      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });
});
