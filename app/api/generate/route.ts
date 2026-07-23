import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Set maximum execution duration to 30 seconds for serverless functions
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google('gemini-1.5-flash'),
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in chat API route:', error);
    return new Response('Failed to generate response', { status: 500 });
  }
}