import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  console.log("FUNCTION HIT");

  try {
    const { email } = JSON.parse(event.body);
    console.log("EMAIL:", email);

    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Welcome',
      html: '<p>You’re in.</p>',
    });

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}