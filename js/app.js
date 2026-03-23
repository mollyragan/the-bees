import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://kswlrqgosdplbhvpypbj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2xycWdvc2RwbGJodnB5cGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTk5MjIsImV4cCI6MjA4OTUzNTkyMn0.xnxegzDY-vrfiTioaPrsuiQWzq8kM6lZG6WU7UxLI2Y'
);

const grid = document.getElementById('grid');

const loadBlocks = async () => {
  const { data: blocks, error } = await supabase
    .from('blocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('FETCH ERROR:', error);
    return;
  }

  grid.innerHTML = '';

  blocks.forEach(block => {
    const el = document.createElement('div');
    el.className = 'block';

    el.innerHTML = `
      <img src="${block.media_url}" loading="lazy" />
      <div class="caption">${block.caption || ''}</div>
    `;

    // MOBILE TAP LOGIC
    let tapped = false;

    el.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        if (!tapped) {
          tapped = true;
          el.classList.add('active');
          return;
        }
      }

      if (block.link_url) {
        window.open(block.link_url, '_blank');
      }
    });

    grid.appendChild(el);
  });
};

const form = document.getElementById('signupForm');

form.onsubmit = async (e) => {
  e.preventDefault();

  const email = document.getElementById('signupEmail').value.toLowerCase().trim();

  const { error } = await supabase
    .from('subscribers')
    .insert([{email: email}]);

  if (error) {
    console.error('SUBSCRIBE ERROR:', error);

    if (error.code === '23505') {
      document.getElementById('signupMessage').innerText = "Already subscribed";
    } else {
      document.getElementById('signupMessage').innerText = error.message;
    }
    return;
  }

    try {
    await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    // optional: don't block signup if email fails
  }

  document.getElementById('signupMessage').innerText = "Subscribed!";
  form.reset();
};

loadBlocks();