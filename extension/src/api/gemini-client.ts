/**
 * Gemini API Client
 * Handles communication with Google's Gemini API
 */

import {
  GEMINI_API,
} from '../shared/constants';

export interface GenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

export interface InlineData {
  mimeType: string;
  data: string;
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, timeout: number = GEMINI_API.TIMEOUT) {
    this.apiKey = apiKey;
    this.baseUrl = `${GEMINI_API.BASE_URL}/${GEMINI_API.VERSION}`;
    this.timeout = timeout;
  }

  /**
   * Generate content using Gemini API
   */
  public async generateContent(
    model: string,
    requestBody: unknown,
  ): Promise<GeminiResponse> {
    const url = `${this.baseUrl}/models/${model}:generateContent`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiClient] API Error Response:', errorText);
        throw new Error(
          `Gemini API request failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log('[GeminiClient] API Response received:', !!data);
      return data as GeminiResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Gemini API request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred during Gemini API request');
    }
  }

  /**
   * Generate text content
   */
  public async generateTextContent(
    model: string,
    prompt: string,
    config?: GenerationConfig,
  ): Promise<string> {
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxOutputTokens ?? 1000,
      },
    };

    const response = await this.generateContent(model, requestBody);

    // Detailed error checking with helpful logs
    if (!response.candidates) {
      console.error('[GeminiClient] No candidates in response:', JSON.stringify(response));
      
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
      }
      
      throw new Error('No response candidates from Gemini API');
    }

    if (response.candidates.length === 0) {
      console.error('[GeminiClient] Empty candidates array');
      throw new Error('Empty response from Gemini API');
    }

    const candidate = response.candidates[0];
    
    if (!candidate) {
      console.error('[GeminiClient] Candidate[0] is undefined');
      throw new Error('Invalid candidate in response');
    }

    if (!candidate.content) {
      console.error('[GeminiClient] No content in candidate:', JSON.stringify(candidate));
      throw new Error('No content in response candidate');
    }

    if (!candidate.content.parts) {
      console.error('[GeminiClient] No parts in content');
      throw new Error('No parts in response content');
    }

    if (candidate.content.parts.length === 0) {
      console.error('[GeminiClient] Empty parts array');
      throw new Error('Empty parts in response content');
    }

    const textPart = candidate.content.parts[0];
    
    if (!textPart) {
      console.error('[GeminiClient] parts[0] is undefined');
      throw new Error('Invalid text part in response');
    }

    const text = textPart.text;

    if (!text) {
      console.error('[GeminiClient] No text in part');
      throw new Error('Empty text from Gemini API');
    }

    return text;
  }

  /**
   * Generate multimodal content (text + images)
   */
  public async generateMultimodalContent(
    model: string,
    prompt: string,
    inlineData: InlineData[],
    config?: GenerationConfig,
  ): Promise<string> {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...inlineData.map((data) => ({
              inlineData: {
                mimeType: data.mimeType,
                data: data.data,
              },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
        maxOutputTokens: config?.maxOutputTokens ?? 2000,
      },
    };

    const response = await this.generateContent(model, requestBody);

    // Same detailed error checking
    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
      }
      throw new Error('No response candidates from Gemini API');
    }

    const text = response.candidates[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[GeminiClient] Multimodal response:', JSON.stringify(response));
      throw new Error('Empty response from Gemini API');
    }

    return text;
  }

  /**
   * Validate API key
   * Uses a minimal request to check if the key works
   */
  public async validateApiKey(): Promise<boolean> {
    try {
      console.log('[GeminiClient] Validating API key...');
      console.log('[GeminiClient] Using model:', GEMINI_API.MODELS.FLASH);
      console.log('[GeminiClient] Base URL:', this.baseUrl);
      
      // Use a very simple request for validation
      const requestBody = {
        contents: [
          {
            parts: [{ text: 'Hi' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 5,
          temperature: 0.1,
        },
      };

      console.log('[GeminiClient] Request body:', JSON.stringify(requestBody));

      const response = await this.generateContent(
        GEMINI_API.MODELS.FLASH,
        requestBody,
      );

      console.log('[GeminiClient] Validation response received');
      console.log('[GeminiClient] Has candidates:', !!response.candidates);
      console.log('[GeminiClient] Candidates length:', response.candidates?.length);

      // Check if we got a valid response
      const isValid = !!(
        response.candidates &&
        response.candidates.length > 0 &&
        response.candidates[0]?.content?.parts &&
        response.candidates[0].content.parts.length > 0
      );

      console.log('[GeminiClient] API key valid:', isValid);
      return isValid;
    } catch (error) {
      console.error('[GeminiClient] API key validation failed:', error);
      
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error('[GeminiClient] Error name:', error.name);
        console.error('[GeminiClient] Error message:', error.message);
        console.error('[GeminiClient] Error stack:', error.stack);
      } else {
        console.error('[GeminiClient] Unknown error type:', typeof error);
      }
      
      return false;
    }
  }

  /**
   * Get model information
   */
  public async getModelInfo(model: string): Promise<unknown> {
    const url = `${this.baseUrl}/models/${model}`;

    try {
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GeminiClient] Failed to get model info:', error);
      throw error;
    }
  }

  /**
   * Update API key
   */
  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Update timeout
   */
  public updateTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}