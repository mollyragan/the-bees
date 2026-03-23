import { Resend } from 'resend';
import fetch from 'node-fetch'; // if needed for Supabase

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler() {
  try {
    // 1️⃣ Fetch subscribers from Supabase
    const res = await fetch('https://kswlrqgosdplbhvpypbj.supabase.co/rest/v1/subscribers', {
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      },
    });
    const subscribers = await res.json();

    // 2️⃣ Fetch latest blocks
    const blocksRes = await fetch('https://kswlrqgosdplbhvpypbj.supabase.co/rest/v1/blocks?order=created_at.desc&limit=5', {
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
      },
    });
    const blocks = await blocksRes.json();

    // 3️⃣ Create email HTML
    const html = blocks.map(b => `
      <div>
        <img src="${b.media_url}" width="200"/>
        <p>${b.caption}</p>
      </div>
    `).join('');

    // 4️⃣ Send to every subscriber
    for (const sub of subscribers) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: sub.email,
        subject: 'Your Weekly Bees',
        html,
      });
    }

    return { statusCode: 200, body: 'Digest sent!' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
}