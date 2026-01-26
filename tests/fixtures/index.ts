/**
 * Test Fixtures - Phase 8
 * Sample data for testing all modules
 */

// ============================================================
// Gemini API Response Fixtures
// ============================================================

export const geminiResponses = {
  visualAnalysis: {
    success: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  trustScore: 85,
                  confidence: 0.9,
                  indicators: {
                    facialArtifacts: false,
                    lightingInconsistencies: false,
                    unnaturalMovements: false,
                    lipSyncIssues: false,
                    blurringArtifacts: false,
                  },
                  analysis: 'No deepfake indicators detected. Face appears natural with consistent lighting and movements.',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
    deepfakeDetected: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  trustScore: 25,
                  confidence: 0.85,
                  indicators: {
                    facialArtifacts: true,
                    lightingInconsistencies: true,
                    unnaturalMovements: true,
                    lipSyncIssues: true,
                    blurringArtifacts: true,
                  },
                  analysis: 'Multiple deepfake indicators detected: facial boundary artifacts, inconsistent lighting around face edges, unnatural eye movements.',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
    lowConfidence: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  trustScore: 60,
                  confidence: 0.4,
                  indicators: {
                    facialArtifacts: false,
                    lightingInconsistencies: true,
                    unnaturalMovements: false,
                    lipSyncIssues: false,
                    blurringArtifacts: false,
                  },
                  analysis: 'Unable to make confident assessment due to low video quality.',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
  },

  behavioralAnalysis: {
    success: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  trustScore: 90,
                  confidence: 0.85,
                  indicators: {
                    urgencyTactics: false,
                    authorityExploitation: false,
                    emotionalManipulation: false,
                    unusualRequests: false,
                    pressureTactics: false,
                  },
                  intents: ['information_sharing', 'collaboration'],
                  analysis: 'Normal business conversation with no social engineering indicators.',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
    socialEngineeringDetected: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  trustScore: 20,
                  confidence: 0.92,
                  indicators: {
                    urgencyTactics: true,
                    authorityExploitation: true,
                    emotionalManipulation: true,
                    unusualRequests: true,
                    pressureTactics: true,
                  },
                  intents: ['credential_extraction', 'financial_fraud'],
                  analysis: 'High-risk social engineering attempt detected. Caller claiming to be IT support requesting immediate password reset due to "security breach".',
                }),
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
  },

  error: {
    rateLimited: {
      error: {
        code: 429,
        message: 'Resource exhausted. Please retry after some time.',
        status: 'RESOURCE_EXHAUSTED',
      },
    },
    invalidApiKey: {
      error: {
        code: 401,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'UNAUTHENTICATED',
      },
    },
    serverError: {
      error: {
        code: 500,
        message: 'Internal server error.',
        status: 'INTERNAL',
      },
    },
  },
};

// ============================================================
// Video Frame Fixtures
// ============================================================

export const videoFrames = {
  validFrame: {
    data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
    width: 720,
    height: 480,
    timestamp: Date.now(),
  },
  highResFrame: {
    data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
    width: 1920,
    height: 1080,
    timestamp: Date.now(),
  },
};

// ============================================================
// Audio Chunk Fixtures
// ============================================================

export const audioChunks = {
  validChunk: {
    data: 'AAAAAAAAAAAAAAAAAAAAAA==', // Silent audio
    sampleRate: 16000,
    channels: 1,
    duration: 5000, // 5 seconds
    timestamp: Date.now(),
  },
  speechChunk: {
    data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
    sampleRate: 16000,
    channels: 1,
    duration: 5000,
    timestamp: Date.now(),
  },
};

// ============================================================
// Transcript Fixtures
// ============================================================

export const transcripts = {
  normal: [
    {
      speaker: 'User',
      text: 'Hi, can you help me with the quarterly report?',
      timestamp: Date.now() - 30000,
      confidence: 0.95,
    },
    {
      speaker: 'Assistant',
      text: 'Of course! I can help you with that. What specific information do you need?',
      timestamp: Date.now() - 20000,
      confidence: 0.92,
    },
    {
      speaker: 'User',
      text: 'I need the sales figures from Q3.',
      timestamp: Date.now() - 10000,
      confidence: 0.88,
    },
  ],
  socialEngineering: [
    {
      speaker: 'Unknown Caller',
      text: 'Hello, this is urgent! I am from IT support and we have detected a security breach on your account.',
      timestamp: Date.now() - 60000,
      confidence: 0.9,
    },
    {
      speaker: 'Unknown Caller',
      text: 'I need you to verify your password immediately or your account will be locked.',
      timestamp: Date.now() - 45000,
      confidence: 0.88,
    },
    {
      speaker: 'Unknown Caller',
      text: 'This is very urgent. Your manager has already approved this verification.',
      timestamp: Date.now() - 30000,
      confidence: 0.92,
    },
  ],
};

// ============================================================
// Trust Score Fixtures
// ============================================================

export const trustScores = {
  safe: {
    overall: 92,
    confidence: 0.9,
    level: 'safe' as const,
    components: {
      visual: 95,
      behavioral: 90,
      audio: 88,
      contextual: 92,
    },
    trend: 'stable' as const,
    timestamp: Date.now(),
  },
  caution: {
    overall: 65,
    confidence: 0.75,
    level: 'caution' as const,
    components: {
      visual: 70,
      behavioral: 60,
      audio: 65,
      contextual: 70,
    },
    trend: 'declining' as const,
    timestamp: Date.now(),
  },
  danger: {
    overall: 25,
    confidence: 0.85,
    level: 'danger' as const,
    components: {
      visual: 20,
      behavioral: 25,
      audio: 30,
      contextual: 30,
    },
    trend: 'declining' as const,
    timestamp: Date.now(),
  },
};

// ============================================================
// Alert Fixtures
// ============================================================

export const alerts = {
  critical: {
    id: 'alert-critical-001',
    type: 'deepfake_detected' as const,
    severity: 'critical' as const,
    title: 'Potential Deepfake Detected',
    message: 'Multiple visual artifacts detected indicating possible synthetic media.',
    timestamp: Date.now(),
    dismissed: false,
    indicators: ['facial_artifacts', 'lighting_inconsistencies', 'unnatural_movements'],
  },
  high: {
    id: 'alert-high-001',
    type: 'social_engineering' as const,
    severity: 'high' as const,
    title: 'Social Engineering Attempt',
    message: 'Conversation patterns indicate possible manipulation attempt.',
    timestamp: Date.now(),
    dismissed: false,
    indicators: ['urgency_tactics', 'authority_exploitation'],
  },
  medium: {
    id: 'alert-medium-001',
    type: 'anomaly' as const,
    severity: 'medium' as const,
    title: 'Unusual Behavior Detected',
    message: 'Trust score dropped significantly from baseline.',
    timestamp: Date.now(),
    dismissed: false,
    indicators: ['score_drop'],
  },
  low: {
    id: 'alert-low-001',
    type: 'info' as const,
    severity: 'low' as const,
    title: 'Low Confidence Analysis',
    message: 'Analysis confidence is below threshold due to video quality.',
    timestamp: Date.now(),
    dismissed: false,
    indicators: ['low_confidence'],
  },
};

// ============================================================
// Session Fixtures
// ============================================================

export const sessions = {
  active: {
    id: 'session-001',
    platform: 'google-meet' as const,
    startTime: Date.now() - 3600000, // 1 hour ago
    participants: 3,
    framesAnalyzed: 120,
    alertsTriggered: 2,
    averageTrustScore: 85,
    currentTrustScore: 88,
  },
  ended: {
    id: 'session-002',
    platform: 'zoom' as const,
    startTime: Date.now() - 7200000, // 2 hours ago
    endTime: Date.now() - 3600000, // 1 hour ago
    participants: 5,
    framesAnalyzed: 240,
    alertsTriggered: 0,
    averageTrustScore: 92,
    finalTrustScore: 94,
  },
};

// ============================================================
// Settings Fixtures
// ============================================================

export const settings = {
  default: {
    geminiApiKey: '',
    thresholds: {
      safe: 85,
      caution: 50,
      danger: 0,
    },
    notifications: {
      enabled: true,
      sound: true,
      criticalOnly: false,
    },
    analysis: {
      captureInterval: 1000,
      maxFrameWidth: 720,
      enableAudio: true,
      enableTranscript: true,
    },
    privacy: {
      storeFrames: false,
      analyticsEnabled: false,
    },
    theme: 'system' as const,
  },
  configured: {
    geminiApiKey: 'test-api-key-12345',
    thresholds: {
      safe: 90,
      caution: 60,
      danger: 0,
    },
    notifications: {
      enabled: true,
      sound: false,
      criticalOnly: true,
    },
    analysis: {
      captureInterval: 2000,
      maxFrameWidth: 480,
      enableAudio: false,
      enableTranscript: true,
    },
    privacy: {
      storeFrames: false,
      analyticsEnabled: true,
    },
    theme: 'dark' as const,
  },
};

// ============================================================
// Platform Detection Fixtures
// ============================================================

export const platformUrls = {
  googleMeet: [
    'https://meet.google.com/abc-defg-hij',
    'https://meet.google.com/lookup/abc123',
  ],
  zoom: [
    'https://zoom.us/j/1234567890',
    'https://us02web.zoom.us/j/1234567890',
    'https://company.zoom.us/j/1234567890',
  ],
  teams: [
    'https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc@thread.v2',
    'https://teams.microsoft.com/l/meet/abc123',
  ],
  unsupported: [
    'https://example.com',
    'https://google.com',
    'https://webex.com/meet/abc',
  ],
};

// ============================================================
// Analysis Input Fixtures
// ============================================================

export const analysisInputs = {
  visual: {
    frames: [videoFrames.validFrame],
    participantId: 'participant-001',
    sessionId: 'session-001',
  },
  behavioral: {
    transcripts: transcripts.normal,
    sessionId: 'session-001',
    contextLength: 10,
  },
  fusion: {
    visualResult: {
      score: 85,
      confidence: 0.9,
      indicators: [],
    },
    behavioralResult: {
      score: 90,
      confidence: 0.85,
      indicators: [],
    },
  },
};

// ============================================================
// Test Helper Functions
// ============================================================

export function createMockVideoElement(options?: {
  width?: number;
  height?: number;
  readyState?: number;
}): HTMLVideoElement {
  const video = {
    videoWidth: options?.width ?? 1920,
    videoHeight: options?.height ?? 1080,
    readyState: options?.readyState ?? 4,
    currentTime: 0,
    duration: 100,
    paused: false,
    muted: false,
    volume: 1,
    src: '',
    srcObject: null,
    play: () => Promise.resolve(),
    pause: () => {},
    load: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement;
  return video;
}

export function createMockAnalysisResult(
  type: 'visual' | 'behavioral',
  options?: {
    score?: number;
    confidence?: number;
    isDeepfake?: boolean;
    isSocialEngineering?: boolean;
  }
) {
  const score = options?.score ?? 85;
  const confidence = options?.confidence ?? 0.9;

  if (type === 'visual') {
    return {
      score,
      confidence,
      indicators: options?.isDeepfake
        ? ['facial_artifacts', 'lighting_inconsistencies']
        : [],
      analysis: options?.isDeepfake
        ? 'Deepfake indicators detected'
        : 'No deepfake indicators',
    };
  }

  return {
    score,
    confidence,
    indicators: options?.isSocialEngineering
      ? ['urgency_tactics', 'authority_exploitation']
      : [],
    intents: options?.isSocialEngineering
      ? ['credential_extraction']
      : ['information_sharing'],
    analysis: options?.isSocialEngineering
      ? 'Social engineering detected'
      : 'Normal conversation',
  };
}

export function generateScoreHistory(
  count: number,
  options?: {
    startScore?: number;
    trend?: 'improving' | 'declining' | 'stable' | 'volatile';
  }
): Array<{ score: number; timestamp: number }> {
  const history: Array<{ score: number; timestamp: number }> = [];
  let currentScore = options?.startScore ?? 85;
  const trend = options?.trend ?? 'stable';
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    let delta = 0;
    switch (trend) {
      case 'improving':
        delta = Math.random() * 3;
        break;
      case 'declining':
        delta = -Math.random() * 3;
        break;
      case 'stable':
        delta = (Math.random() - 0.5) * 2;
        break;
      case 'volatile':
        delta = (Math.random() - 0.5) * 20;
        break;
    }

    currentScore = Math.max(0, Math.min(100, currentScore + delta));
    history.push({
      score: Math.round(currentScore),
      timestamp: now - i * 1000,
    });
  }

  return history;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
