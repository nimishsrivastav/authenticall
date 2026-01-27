/**
 * Visual Analyzer
 * Analyzes video frames for deepfake indicators using Gemini
 */

import { GeminiClient } from '../api/gemini-client';
import { withRateLimit } from '../api/rate-limiter';

export interface VisualAnalysisResult {
  trustScore: number; // 0-100
  confidence: number; // 0-1
  indicators: VisualIndicator[];
  reasoning: string;
  timestamp: number;
}

export interface VisualIndicator {
  type: 'lighting' | 'facial' | 'artifacts' | 'motion' | 'texture';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

export class VisualAnalyzer {
  private geminiClient: GeminiClient;
  private model: string;

  constructor(geminiClient: GeminiClient, model: string = 'gemini-3-flash-preview') {
    this.geminiClient = geminiClient;
    this.model = model;
  }

  /**
   * Analyze video frame for deepfake indicators
   */
  public async analyzeFrame(
    frameData: string, // Base64 JPEG
    context?: {
      previousScore?: number;
      participantName?: string;
    },
  ): Promise<VisualAnalysisResult> {
    const prompt = this.buildVisualAnalysisPrompt(context);

    try {
      const response = await withRateLimit(() =>
        this.geminiClient.generateMultimodalContent(
          this.model,
          prompt,
          [{ mimeType: 'image/jpeg', data: frameData }],
          { temperature: 0.3, maxOutputTokens: 1500 },
        ),
      );

      return this.parseVisualAnalysisResponse(response);
    } catch (error) {
      console.error('[VisualAnalyzer] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple frames for temporal consistency
   */
  public async analyzeFrameSequence(
    frames: Array<{ data: string; timestamp: number }>,
  ): Promise<VisualAnalysisResult> {
    if (frames.length === 0) {
      throw new Error('No frames provided for analysis');
    }

    // For MVP, analyze the most recent frame
    // Future: Implement temporal consistency checking across frames
    const latestFrame = frames[frames.length - 1];
    if (!latestFrame) {
      throw new Error('Invalid frame data');
    }

    const prompt = this.buildTemporalAnalysisPrompt(frames.length);

    try {
      const response = await withRateLimit(() =>
        this.geminiClient.generateMultimodalContent(
          this.model,
          prompt,
          frames.map((f) => ({ mimeType: 'image/jpeg', data: f.data })),
          { temperature: 0.3, maxOutputTokens: 2000 },
        ),
      );

      return this.parseVisualAnalysisResponse(response);
    } catch (error) {
      console.error('[VisualAnalyzer] Sequence analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build visual analysis prompt
   */
  private buildVisualAnalysisPrompt(context?: {
    previousScore?: number;
    participantName?: string;
  }): string {
    return `You are an expert deepfake detection system analyzing a video frame from a video conference call. Your task is to identify any visual indicators that suggest the video may be AI-generated, manipulated, or a deepfake.

ANALYZE FOR THESE DEEPFAKE INDICATORS:

1. **Lighting Inconsistencies**
   - Unnatural shadows or highlights
   - Lighting direction doesn't match environment
   - Face illumination inconsistent with background

2. **Facial Anomalies**
   - Unnatural blinking patterns or lack of blinking
   - Odd eye movements or gaze direction
   - Facial expressions that don't match emotion
   - Mouth movements not synchronized with speech
   - Skin texture irregularities

3. **Visual Artifacts**
   - Blurriness around face edges
   - Pixelation or distortion in facial features
   - Color mismatches between face and neck
   - Warping or morphing effects

4. **Motion Inconsistencies**
   - Jittery or unnatural movements
   - Head movements that seem disconnected from body
   - Hair or clothing that doesn't move naturally

5. **Texture Issues**
   - Overly smooth or plastic-looking skin
   - Lack of skin pores or natural texture
   - Artificial-looking teeth or eyes

${context?.participantName ? `\nParticipant: ${context.participantName}` : ''}
${context?.previousScore ? `\nPrevious trust score: ${context.previousScore}/100` : ''}

RESPONSE FORMAT (respond ONLY with valid JSON):
{
  "trustScore": <number 0-100, where 100 is completely authentic and 0 is definitely fake>,
  "confidence": <number 0.0-1.0 indicating your confidence in this assessment>,
  "indicators": [
    {
      "type": "<lighting|facial|artifacts|motion|texture>",
      "severity": "<low|medium|high>",
      "description": "<what you observed>",
      "confidence": <0.0-1.0>
    }
  ],
  "reasoning": "<brief explanation of your assessment>"
}

If the frame appears authentic, return high trustScore (85-100) with low-severity indicators.
If you detect suspicious elements, return lower trustScore with specific indicators.`;
  }

  /**
   * Build temporal analysis prompt
   */
  private buildTemporalAnalysisPrompt(frameCount: number): string {
    return `You are analyzing ${frameCount} sequential video frames to detect deepfakes through temporal consistency.

TEMPORAL ANALYSIS CHECKLIST:

1. **Motion Continuity**
   - Are movements smooth and natural across frames?
   - Any sudden jumps or discontinuities?

2. **Facial Consistency**
   - Do facial features remain stable?
   - Any warping or morphing between frames?

3. **Lighting Stability**
   - Does lighting remain consistent?
   - Any unnatural lighting changes?

4. **Background Consistency**
   - Is the background stable?
   - Any artifacts or glitches?

RESPONSE FORMAT (valid JSON only):
{
  "trustScore": <0-100>,
  "confidence": <0.0-1.0>,
  "indicators": [
    {
      "type": "<lighting|facial|artifacts|motion|texture>",
      "severity": "<low|medium|high>",
      "description": "<observation>",
      "confidence": <0.0-1.0>
    }
  ],
  "reasoning": "<analysis of temporal consistency>"
}`;
  }

  /**
   * Parse Gemini response into structured result
   */
  private parseVisualAnalysisResponse(response: string): VisualAnalysisResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        trustScore: number;
        confidence: number;
        indicators: VisualIndicator[];
        reasoning: string;
      };

      // Validate and clamp values
      return {
        trustScore: Math.max(0, Math.min(100, parsed.trustScore)),
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        indicators: parsed.indicators || [],
        reasoning: parsed.reasoning || '',
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[VisualAnalyzer] Failed to parse response:', error);
      console.error('[VisualAnalyzer] Raw response:', response);

      // Return default safe result on parse error
      return {
        trustScore: 50,
        confidence: 0.3,
        indicators: [
          {
            type: 'artifacts',
            severity: 'low',
            description: 'Unable to parse analysis result',
            confidence: 0.3,
          },
        ],
        reasoning: 'Analysis parsing failed',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Batch analyze multiple frames
   */
  public async analyzeBatch(
    frames: Array<{ data: string; timestamp: number }>,
  ): Promise<VisualAnalysisResult[]> {
    const results: VisualAnalysisResult[] = [];

    for (const frame of frames) {
      try {
        const result = await this.analyzeFrame(frame.data);
        results.push(result);
      } catch (error) {
        console.error('[VisualAnalyzer] Batch frame analysis failed:', error);
        // Continue with other frames
      }
    }

    return results;
  }

  /**
   * Update model
   */
  public updateModel(newModel: string): void {
    this.model = newModel;
  }
}