// netlify/functions/weekly-digest.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// helper to get last Friday 3 PM EST in UTC
function getLastFriday3pmUTC() {
  const now = new Date();

  // get day of week: 0=Sun ... 5=Fri
  const day = now.getUTCDay(); 
  const hoursUTC = now.getUTCHours();
  
  // EST is UTC-4 during daylight saving
  const offset = -4; 
  const estNow = new Date(now.getTime() + offset * 60 * 60 * 1000);

  let lastFriday = new Date(estNow);
  const estDay = lastFriday.getDay(); // 0=Sun..6=Sat in EST
  const diff = (estDay >= 5 ? estDay - 5 : estDay + 2); // days since last Friday
  lastFriday.setDate(lastFriday.getDate() - diff);
  lastFriday.setHours(15, 0, 0, 0); // 3 PM EST

  // convert back to UTC
  return new Date(lastFriday.getTime() - offset * 60 * 60 * 1000).toISOString();
}

exports.handler = async function () {
  try {
    const lastFriday3pmUTC = getLastFriday3pmUTC();
    console.log('Fetching blocks created after:', lastFriday3pmUTC);

    // 1️⃣ Fetch subscribers from Supabase
    const res = await fetch(
      'https://kswlrqgosdplbhvpypbj.supabase.co/rest/v1/subscribers',
      {
        headers: {
          apikey: process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
      }
    );
    const subscribers = await res.json();

    // 2️⃣ Fetch blocks uploaded since last Friday 3 PM EST
    const blocksRes = await fetch(
      `https://kswlrqgosdplbhvpypbj.supabase.co/rest/v1/blocks?created_at=gte.${lastFriday3pmUTC}`,
      {
        headers: {
          apikey: process.env.SUPABASE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        },
      }
    );
    const blocksJson = await blocksRes.json();
    const blocks = Array.isArray(blocksJson) ? blocksJson : [];
    console.log('Fetched blocks:', blocks);

const activeSubscribers = subscribers.filter(sub => sub.is_active);

// 4️⃣ Send digest to every active subscriber
for (const sub of activeSubscribers) {
  // Build HTML for THIS subscriber (so we can use sub.id)
  const htmlContent = `
  <html>
  <body style="font-family: sans-serif; text-align: center; background-color: #f9f9f9; padding: 20px;">
      <h3 style="text-align: center;">bees of the week</h3>
      <p>what's on my mind, seven days at a time</p>
      <div style="max-width: 600px; margin: 0 auto;">
      ${blocks
        .map(b => `
          <div style="margin-bottom: 20px; text-align: center;">
              ${b.link_url ? `<a href="${b.link_url}" target="_blank">` : ''}
              <img src="${b.media_url}" width="200" style="display:block; margin: 0 auto;" alt="${b.caption || ''}" />
              ${b.link_url ? `</a>` : ''}
              <p style="text-align: center;">${b.caption || ''}</p>
          </div>
        `)
        .join('')}
      </div>
      <p style="margin-top: 0px; text-align: center;">
    ~mbr~ <hr>
    <a href="https://beesbeesbees.netlify.app/" target="_blank" style="color:#1a73e8; text-decoration:none;">
      all bees </a><br>
      <a href="https://beesbeesbees.netlify.app/unsubscribe.html?id=${sub.id}">unsubscribe</a>
  </p>
  </body>
  </html>
  `;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: sub.email,
    subject: 'Bees of the Week',
    html: htmlContent,
  });
}

    return { statusCode: 200, body: 'Digest sent!' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};