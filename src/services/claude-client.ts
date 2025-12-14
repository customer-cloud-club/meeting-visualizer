/**
 * Claude API クライアント
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

export async function analyzeWithJSON<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const response = await sendMessage(
    systemPrompt + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation, just pure JSON.',
    userMessage,
    { temperature: 0.3 }
  );

  // JSONを抽出（マークダウンコードブロックを考慮）
  let jsonString = response.trim();

  // ```json ... ``` を除去
  if (jsonString.startsWith('```')) {
    const lines = jsonString.split('\n');
    lines.shift(); // 最初の```json行を削除
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop(); // 最後の```行を削除
    }
    jsonString = lines.join('\n');
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', jsonString);
    throw new Error(`Failed to parse Claude response as JSON: ${error}`);
  }
}
