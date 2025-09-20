import { NextResponse } from 'next/server';
import twilio from 'twilio';

// You should set these in your environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { to, body } = await request.json();
    if (!to || !body) {
      return NextResponse.json({ error: 'Missing to or body' }, { status: 400 });
    }
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to
    });
    return NextResponse.json({ success: true, sid: message.sid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send SMS';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
