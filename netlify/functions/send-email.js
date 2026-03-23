import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  try {
    const { email } = JSON.parse(event.body);

    const response = await resend.emails.send({
      from: 'onboarding@resend.dev', // use test domain first
      to: email,
      subject: 'Welcome',
      html: `<p>You’re in.</p>`
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}