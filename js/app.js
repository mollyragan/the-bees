import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://kswlrqgosdplbhvpypbj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2xycWdvc2RwbGJodnB5cGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTk5MjIsImV4cCI6MjA4OTUzNTkyMn0.xnxegzDY-vrfiTioaPrsuiQWzq8kM6lZG6WU7UxLI2Y'
);

// Keep a global array of blocks
let allBlocks = [];

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

  allBlocks = blocks; // save globally for discover mode
  grid.innerHTML = '';

  blocks.forEach(block => {
    const el = document.createElement('div');
    el.className = 'block';

    el.innerHTML = `
      <img src="${block.media_url}" loading="lazy" />
      <div class="caption">${block.caption || ''}</div>
    `;

    el.addEventListener('click', () => {
      openModal(block);
    });

    grid.appendChild(el);
  });
};

const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const modalOverlay = document.getElementById('modalOverlay');

const modalArrowLeft = document.getElementById('modalArrowLeft');
const modalArrowRight = document.getElementById('modalArrowRight');

let historyStack = [];      // keeps track of the order of blocks visited
let currentIndex = -1;      // index in historyStack of the current block

// Open modal function (single version)
function openModal(block, pushToHistory = true) {
  modalImage.src = block.media_url;
  modalCaption.innerText = block.caption || '';
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  modalArrowLeft.classList.remove('hidden');
  modalArrowRight.classList.remove('hidden');

  if (block.link_url) {
    modalImage.style.cursor = 'pointer';
    modalImage.onclick = () => window.open(block.link_url, '_blank');
  } else {
    modalImage.style.cursor = 'default';
    modalImage.onclick = null;
  }

  if (pushToHistory) {
    // if we’re not at the end of the history stack, remove forward history
    if (currentIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, currentIndex + 1);
    }
    historyStack.push(block);
    currentIndex = historyStack.length - 1;
  }
}

modalArrowRight.addEventListener('click', () => {
  if (currentIndex < historyStack.length - 1) {
    // forward in history
    currentIndex++;
    openModal(historyStack[currentIndex], false); // don’t push to history
  } else {
    // new random block
    let randomBlock = allBlocks[Math.floor(Math.random() * allBlocks.length)];
    openModal(randomBlock, true); // push to history
  }
});

modalArrowLeft.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    openModal(historyStack[currentIndex], false); // don’t push to history
  }
});

// Close modal
modalOverlay.addEventListener('click', () => {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  modalArrowLeft.classList.add('hidden');
  modalArrowRight.classList.add('hidden');
});

// Random discover mode
function showRandomBlock() {
  if (allBlocks.length === 0) return;
  const randomBlock = allBlocks[Math.floor(Math.random() * allBlocks.length)];
  openModal(randomBlock);
}

// Load everything
loadBlocks();

const subscribeButton = document.getElementById('subscribeButton');
const signupForm = document.getElementById('signupForm');
const signupEmail = document.getElementById('signupEmail');
const signupMessage = document.getElementById('signupMessage');
const signupWrapper = document.getElementById('signupWrapper');

// Clicking the button only expands the form
subscribeButton.addEventListener('click', (e) => {
  e.preventDefault();
  if (window.innerWidth <= 768) return;

  if (!signupWrapper.classList.contains('active')) {
    signupWrapper.classList.add('active');
    subscribeButton.classList.add('active');
    signupEmail.focus();
  } else {
    signupWrapper.classList.remove('active');
    subscribeButton.classList.remove('active');
    signupMessage.innerText = '';
    signupWrapper.classList.remove('showMessage');
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let email = signupEmail.value.trim().toLowerCase(); // normalize

  if (!email) return;

  subscribeButton.classList.add('active');

  try {
    // Check if email already exists
    const { data: existing, error: fetchError } = await supabase
      .from('subscribers')
      .select('id, is_active')
      .eq('email', email)
      .limit(1)
      .single(); // returns single object instead of array

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, so ignore
      console.error(fetchError);
      signupMessage.innerText = 'Something went wrong. Try again.';
      signupMessage.style.color = 'red';
    } else if (existing) {
      // Email exists
      if (existing.is_active) {
        signupMessage.innerText = 'already subscribed';
        signupMessage.style.color = 'blue';
      } else {
        // Reactivate inactive subscriber
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          console.error(updateError);
          signupMessage.innerText = 'Something went wrong. Try again.';
          signupMessage.style.color = 'red';
        } else {
          signupMessage.innerText = 'Thanks for subscribing!';
          signupMessage.style.color = 'green';
        }
      }
    } else {
      // Email not in table → insert
      const { error: insertError } = await supabase
        .from('subscribers')
        .insert([{ email, is_active: true }]);

      if (insertError) {
        console.error(insertError);
        signupMessage.innerText = 'Something went wrong. Try again.';
        signupMessage.style.color = 'red';
      } else {
        signupMessage.innerText = 'Thanks for subscribing!';
        signupMessage.style.color = 'green';
        await fetch('/.netlify/functions/send-email', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
      }
    }

    // Hide form, show message in place
    signupWrapper.classList.remove('active');
    signupWrapper.classList.add('showMessage');

    setTimeout(() => {
      signupMessage.innerText = '';
      signupWrapper.classList.remove('showMessage');
      subscribeButton.classList.remove('active');
    }, 5000);

  } catch (err) {
    console.error(err);
    signupMessage.innerText = 'Something went wrong. Try again.';
    signupMessage.style.color = 'red';
    signupWrapper.classList.remove('active');
    signupWrapper.classList.add('showMessage');
    setTimeout(() => {
      signupMessage.innerText = '';
      signupWrapper.classList.remove('showMessage');
      subscribeButton.classList.remove('active');
    }, 5000);
  }
});

const isMobile = window.innerWidth <= 768;

if (isMobile) {
  const mobileModal = document.getElementById('mobileSignupModal');
  const mobileOverlay = document.getElementById('mobileSignupOverlay');
  const mobileForm = document.getElementById('mobileSignupForm');
  const mobileEmail = document.getElementById('mobileSignupEmail');
  const mobileMessage = document.getElementById('mobileSignupMessage');

  // Clicking subscribe button opens modal on mobile
  subscribeButton.addEventListener('click', (e) => {
    e.preventDefault();
    mobileModal.classList.remove('hidden');
    mobileEmail.value = '';
    mobileMessage.innerText = '';
    mobileEmail.focus();
  });

  // Clicking overlay closes modal
  mobileOverlay.addEventListener('click', () => {
    mobileModal.classList.add('hidden');
    mobileForm.style.display = 'flex';
    mobileMessage.style.display = 'none';
    mobileMessage.innerText = '';
  });

  // Handle mobile form submit
  mobileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let email = mobileEmail.value.trim().toLowerCase();
    if (!email) return;

    try {
      // check if email exists
      const { data: existing, error: fetchError } = await supabase
        .from('subscribers')
        .select('id, is_active')
        .eq('email', email)
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        mobileMessage.innerText = 'Something went wrong. Try again.';
        mobileForm.style.display = 'none';
        mobileMessage.style.display = 'block';
        mobileMessage.style.color = 'red';
      } else if (existing) {
        if (existing.is_active) {
          mobileMessage.innerText = 'already subscribed';
          mobileMessage.style.color = 'blue';
          mobileForm.style.display = 'none';
          mobileMessage.style.display = 'block';
        } else {
          const { error: updateError } = await supabase
            .from('subscribers')
            .update({ is_active: true })
            .eq('id', existing.id);

          if (updateError) {
            mobileMessage.innerText = 'Something went wrong. Try again.';
            mobileForm.style.display = 'none';
            mobileMessage.style.display = 'block';
            mobileMessage.style.color = 'red';
          } else {
            mobileMessage.innerText = 'Thanks for subscribing!';
            mobileMessage.style.color = 'green';
            mobileForm.style.display = 'none';
            mobileMessage.style.display = 'block';
          }
        }
      } else {
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert([{ email, is_active: true }]);

        if (insertError) {
          mobileMessage.innerText = 'Something went wrong. Try again.';
          mobileForm.style.display = 'none';
          mobileMessage.style.display = 'block';
          mobileMessage.style.color = 'red';
        } else {
          mobileMessage.innerText = 'Thanks for subscribing!';
          mobileMessage.style.color = 'green';
          mobileForm.style.display = 'none';
          mobileMessage.style.display = 'block';
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
        }
      }
    } catch (err) {
      console.error(err);
      mobileMessage.innerText = 'Something went wrong. Try again.';
      mobileForm.style.display = 'none';
      mobileMessage.style.display = 'block';
      mobileMessage.style.color = 'red';
    }
  }); 
} 