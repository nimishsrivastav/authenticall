/**
 * Behavioral Analyzer
 * Analyzes conversation transcripts for social engineering attempts
 */

import { GeminiClient } from '../api/gemini-client';
import { withRateLimit } from '../api/rate-limiter';

export interface BehavioralAnalysisResult {
  trustScore: number; // 0-100
  confidence: number; // 0-1
  indicators: BehavioralIndicator[];
  intent: ConversationIntent;
  reasoning: string;
  timestamp: number;
}

export interface BehavioralIndicator {
  type:
    | 'urgency'
    | 'authority'
    | 'unusual_request'
    | 'information_gathering'
    | 'pressure'
    | 'emotional_manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  excerpt?: string; // Relevant text excerpt
}

export interface ConversationIntent {
  category:
    | 'normal_business'
    | 'suspicious'
    | 'social_engineering'
    | 'phishing'
    | 'unknown';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class BehavioralAnalyzer {
  private geminiClient: GeminiClient;
  private model: string;
  private conversationHistory: Array<{
    text: string;
    speaker?: string;
    timestamp: number;
  }> = [];
  private maxHistoryLength: number = 50;

  constructor(geminiClient: GeminiClient, model: string = 'gemini-2.5-flash') {
    this.geminiClient = geminiClient;
    this.model = model;
  }

  /**
   * Analyze transcript for social engineering indicators
   */
  public async analyzeTranscript(
    text: string,
    speaker?: string,
  ): Promise<BehavioralAnalysisResult> {
    // Add to conversation history
    const historyEntry: { text: string; speaker?: string; timestamp: number } = {
      text,
      timestamp: Date.now(),
    };
    if (speaker !== undefined) {
      historyEntry.speaker = speaker;
    }
    this.conversationHistory.push(historyEntry);

    // Trim history if too long
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }

    const prompt = this.buildBehavioralAnalysisPrompt(text, speaker);

    try {
      const response = await withRateLimit(() =>
        this.geminiClient.generateTextContent(this.model, prompt, {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }),
      );

      return this.parseBehavioralAnalysisResponse(response);
    } catch (error) {
      console.error('[BehavioralAnalyzer] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze conversation context (multiple recent messages)
   */
  public async analyzeConversationContext(): Promise<BehavioralAnalysisResult> {
    if (this.conversationHistory.length === 0) {
      throw new Error('No conversation history available');
    }

    const prompt = this.buildContextAnalysisPrompt();

    try {
      const response = await withRateLimit(() =>
        this.geminiClient.generateTextContent(this.model, prompt, {
          temperature: 0.3,
          maxOutputTokens: 2500,
        }),
      );

      return this.parseBehavioralAnalysisResponse(response);
    } catch (error) {
      console.error('[BehavioralAnalyzer] Context analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build behavioral analysis prompt
   */
  private buildBehavioralAnalysisPrompt(
    text: string,
    speaker?: string,
  ): string {
    const recentContext = this.conversationHistory
      .slice(-5)
      .map((msg) => `${msg.speaker || 'Unknown'}: ${msg.text}`)
      .join('\n');

    return `You are an expert social engineering detection system. Analyze this conversation transcript from a video call for potential social engineering, phishing, or manipulation attempts.

CURRENT MESSAGE:
${speaker ? `Speaker: ${speaker}` : ''}
"${text}"

RECENT CONTEXT:
${recentContext}

ANALYZE FOR THESE RED FLAGS:

1. **Urgency Tactics**
   - Artificial time pressure ("need this NOW", "by end of day")
   - Bypassing normal procedures due to "emergency"
   - Threats of consequences for delay

2. **Authority Exploitation**
   - Impersonation of executives or authorities
   - Name-dropping to establish credibility
   - Demanding compliance without verification

3. **Unusual Requests**
   - Requests outside normal business processes
   - Asking for sensitive information (passwords, financial data)
   - Wire transfers or payments to unusual accounts
   - Bypassing security protocols

4. **Information Gathering**
   - Seemingly innocent questions about systems/processes
   - Probing for security weaknesses
   - Gathering employee information

5. **Pressure and Manipulation**
   - Emotional appeals (fear, guilt, greed)
   - Confidentiality demands ("don't tell anyone")
   - Flattery or personal connection attempts

6. **Context Inconsistencies**
   - Request doesn't match known business patterns
   - Communication style doesn't match supposed sender
   - Details that seem off or inconsistent

RESPONSE FORMAT (valid JSON only):
{
  "trustScore": <0-100, where 100 is safe and 0 is definite attack>,
  "confidence": <0.0-1.0>,
  "indicators": [
    {
      "type": "<urgency|authority|unusual_request|information_gathering|pressure|emotional_manipulation>",
      "severity": "<low|medium|high|critical>",
      "description": "<specific observation>",
      "confidence": <0.0-1.0>,
      "excerpt": "<relevant quote from text>"
    }
  ],
  "intent": {
    "category": "<normal_business|suspicious|social_engineering|phishing|unknown>",
    "description": "<what you think is happening>",
    "riskLevel": "<low|medium|high|critical>"
  },
  "reasoning": "<explanation of your assessment>"
}

For normal business conversation, return high trustScore (85-100).
For suspicious or manipulative content, return lower trustScore with specific indicators.`;
  }

  /**
   * Build context analysis prompt
   */
  private buildContextAnalysisPrompt(): string {
    const fullContext = this.conversationHistory
      .map((msg, idx) => `[${idx + 1}] ${msg.speaker || 'Unknown'}: ${msg.text}`)
      .join('\n');

    return `Analyze this entire conversation for social engineering patterns and suspicious intent.

FULL CONVERSATION:
${fullContext}

Look for:
- Patterns of manipulation across messages
- Building rapport before making requests
- Escalating demands or urgency
- Consistency of speaker identity
- Overall conversation flow and intent

RESPONSE FORMAT (valid JSON only):
{
  "trustScore": <0-100>,
  "confidence": <0.0-1.0>,
  "indicators": [
    {
      "type": "<urgency|authority|unusual_request|information_gathering|pressure|emotional_manipulation>",
      "severity": "<low|medium|high|critical>",
      "description": "<pattern observed>",
      "confidence": <0.0-1.0>
    }
  ],
  "intent": {
    "category": "<normal_business|suspicious|social_engineering|phishing|unknown>",
    "description": "<overall conversation intent>",
    "riskLevel": "<low|medium|high|critical>"
  },
  "reasoning": "<comprehensive analysis>"
}`;
  }

  /**
   * Parse Gemini response into structured result
   */
  private parseBehavioralAnalysisResponse(
    response: string,
  ): BehavioralAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        trustScore: number;
        confidence: number;
        indicators: BehavioralIndicator[];
        intent: ConversationIntent;
        reasoning: string;
      };

      return {
        trustScore: Math.max(0, Math.min(100, parsed.trustScore)),
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        indicators: parsed.indicators || [],
        intent: parsed.intent || {
          category: 'unknown',
          description: 'Unable to determine intent',
          riskLevel: 'medium',
        },
        reasoning: parsed.reasoning || '',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[BehavioralAnalyzer] Failed to parse response:', error);
      console.error('[BehavioralAnalyzer] Raw response:', response);

      return {
        trustScore: 50,
        confidence: 0.3,
        indicators: [],
        intent: {
          category: 'unknown',
          description: 'Analysis parsing failed',
          riskLevel: 'medium',
        },
        reasoning: 'Unable to parse analysis result',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Clear conversation history
   */
  public clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  public getHistory(): Array<{
    text: string;
    speaker?: string;
    timestamp: number;
  }> {
    return [...this.conversationHistory];
  }

  /**
   * Update model
   */
  public updateModel(newModel: string): void {
    this.model = newModel;
  }

  /**
   * Update max history length
   */
  public updateMaxHistoryLength(length: number): void {
    this.maxHistoryLength = length;
    
    // Trim if needed
    if (this.conversationHistory.length > length) {
      this.conversationHistory = this.conversationHistory.slice(-length);
    }
  }
}