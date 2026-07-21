import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is missing on the server.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await req.json();
    const { history, query, files } = body;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction:
        'You are a sharp, direct assistant. Give concise, highly logical, and straight-to-the-point answers. Avoid long intro/outro fluff, repetitive explanations, unnecessary bullet lists, or standard AI pleasantries unless asked for detail.',
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    // Format conversation history for Gemini API
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    // Build the latest message payload (text + attached files)
    const currentParts: any[] = [];

    if (files && Array.isArray(files)) {
      files.forEach((file: any) => {
        if (file && file.base64) {
          const cleanBase64 = file.base64.replace(/^data:.*?;base64,/, '');
          currentParts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: file.mimeType || 'image/jpeg',
            },
          });
        }
      });
    }

    if (query) {
      currentParts.push({ text: query });
    } else if (currentParts.length === 0) {
      currentParts.push({ text: 'Analyze the attached content.' });
    }

    const resultStream = await chat.sendMessageStream(currentParts);

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of resultStream.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (streamErr: any) {
          controller.enqueue(
            encoder.encode(`\n[Stream Error: ${streamErr.message}]`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}