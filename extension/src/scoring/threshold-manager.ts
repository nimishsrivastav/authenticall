/**
 * Threshold Manager
 * Manages trust score thresholds and determines trust level with hysteresis
 */

import { TrustLevel } from '../shared/types';
import {
  TrustThresholds,
  HysteresisSettings,
  DEFAULT_THRESHOLDS,
  DEFAULT_HYSTERESIS,
} from './types';

export class ThresholdManager {
  private thresholds: TrustThresholds;
  private hysteresis: HysteresisSettings;
  private currentLevel: TrustLevel = 'unknown';
  private levelHistory: TrustLevel[] = [];
  private consecutiveCount: number = 0;
  private lastDeterminedLevel: TrustLevel = 'unknown';

  constructor(
    thresholds: TrustThresholds = DEFAULT_THRESHOLDS,
    hysteresis: HysteresisSettings = DEFAULT_HYSTERESIS,
  ) {
    this.thresholds = this.validateThresholds(thresholds);
    this.hysteresis = hysteresis;
  }

  /**
   * Determine trust level from score with hysteresis
   */
  public determineLevel(score: number): TrustLevel {
    // Get raw level without hysteresis
    const rawLevel = this.getRawLevel(score);

    // If hysteresis is disabled, return raw level
    if (!this.hysteresis.enabled) {
      this.currentLevel = rawLevel;
      return rawLevel;
    }

    // Apply hysteresis logic
    return this.applyHysteresis(score, rawLevel);
  }

  /**
   * Get raw level without hysteresis
   */
  public getRawLevel(score: number): TrustLevel {
    if (score >= this.thresholds.safe) {
      return 'safe';
    } else if (score >= this.thresholds.caution) {
      return 'caution';
    } else if (score >= this.thresholds.danger) {
      return 'danger';
    }
    return 'danger';
  }

  /**
   * Apply hysteresis to prevent level flickering
   */
  private applyHysteresis(score: number, rawLevel: TrustLevel): TrustLevel {
    // Track level history
    this.levelHistory.push(rawLevel);
    if (this.levelHistory.length > this.hysteresis.minSamplesBeforeChange * 2) {
      this.levelHistory.shift();
    }

    // If this is the first determination
    if (this.currentLevel === 'unknown') {
      this.currentLevel = rawLevel;
      this.lastDeterminedLevel = rawLevel;
      this.consecutiveCount = 1;
      return rawLevel;
    }

    // Check if raw level matches last determined level
    if (rawLevel === this.lastDeterminedLevel) {
      this.consecutiveCount++;
    } else {
      // Level is different - check if it's within buffer zone
      const effectiveThresholds = this.getEffectiveThresholds(this.currentLevel);

      if (this.isInBufferZone(score, this.currentLevel, effectiveThresholds)) {
        // In buffer zone - don't change level yet
        return this.currentLevel;
      }

      // Outside buffer zone - start counting for new level
      this.lastDeterminedLevel = rawLevel;
      this.consecutiveCount = 1;
    }

    // Check if we have enough consecutive samples to change level
    if (
      this.consecutiveCount >= this.hysteresis.minSamplesBeforeChange &&
      this.lastDeterminedLevel !== this.currentLevel
    ) {
      this.currentLevel = this.lastDeterminedLevel;
    }

    return this.currentLevel;
  }

  /**
   * Check if score is in buffer zone
   */
  private isInBufferZone(
    score: number,
    currentLevel: TrustLevel,
    effectiveThresholds: TrustThresholds,
  ): boolean {
    const buffer = this.hysteresis.buffer;

    switch (currentLevel) {
      case 'safe':
        // Buffer zone is below safe threshold
        return (
          score < effectiveThresholds.safe &&
          score >= effectiveThresholds.safe - buffer
        );
      case 'caution':
        // Buffer zone is above caution or below safe threshold
        return (
          (score >= effectiveThresholds.safe - buffer &&
            score < effectiveThresholds.safe) ||
          (score < effectiveThresholds.caution &&
            score >= effectiveThresholds.caution - buffer)
        );
      case 'danger':
        // Buffer zone is above caution threshold
        return (
          score >= effectiveThresholds.caution &&
          score < effectiveThresholds.caution + buffer
        );
      default:
        return false;
    }
  }

  /**
   * Get effective thresholds based on current level (with buffer)
   */
  private getEffectiveThresholds(currentLevel: TrustLevel): TrustThresholds {
    const buffer = this.hysteresis.buffer;

    // Apply buffer based on current level to create hysteresis
    switch (currentLevel) {
      case 'safe':
        return {
          safe: this.thresholds.safe - buffer,
          caution: this.thresholds.caution,
          danger: this.thresholds.danger,
        };
      case 'caution':
        return {
          safe: this.thresholds.safe + buffer,
          caution: this.thresholds.caution - buffer,
          danger: this.thresholds.danger,
        };
      case 'danger':
        return {
          safe: this.thresholds.safe,
          caution: this.thresholds.caution + buffer,
          danger: this.thresholds.danger,
        };
      default:
        return this.thresholds;
    }
  }

  /**
   * Update thresholds
   */
  public updateThresholds(newThresholds: Partial<TrustThresholds>): void {
    this.thresholds = this.validateThresholds({
      ...this.thresholds,
      ...newThresholds,
    });
  }

  /**
   * Update hysteresis settings
   */
  public updateHysteresis(newSettings: Partial<HysteresisSettings>): void {
    this.hysteresis = {
      ...this.hysteresis,
      ...newSettings,
    };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): TrustThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get hysteresis settings
   */
  public getHysteresisSettings(): HysteresisSettings {
    return { ...this.hysteresis };
  }

  /**
   * Get current level
   */
  public getCurrentLevel(): TrustLevel {
    return this.currentLevel;
  }

  /**
   * Reset state
   */
  public reset(): void {
    this.currentLevel = 'unknown';
    this.levelHistory = [];
    this.consecutiveCount = 0;
    this.lastDeterminedLevel = 'unknown';
  }

  /**
   * Validate thresholds
   */
  private validateThresholds(thresholds: TrustThresholds): TrustThresholds {
    const validated = { ...thresholds };

    // Ensure safe > caution > danger
    if (validated.safe <= validated.caution) {
      validated.safe = validated.caution + 1;
    }

    if (validated.caution <= validated.danger) {
      validated.caution = validated.danger + 1;
    }

    // Ensure all values are within 0-100
    validated.safe = Math.min(100, Math.max(0, validated.safe));
    validated.caution = Math.min(100, Math.max(0, validated.caution));
    validated.danger = Math.min(100, Math.max(0, validated.danger));

    return validated;
  }

  /**
   * Get level statistics
   */
  public getLevelStats(): {
    currentLevel: TrustLevel;
    consecutiveCount: number;
    recentLevels: TrustLevel[];
  } {
    return {
      currentLevel: this.currentLevel,
      consecutiveCount: this.consecutiveCount,
      recentLevels: [...this.levelHistory],
    };
  }

  /**
   * Check if level change is imminent
   */
  public isLevelChangeImminent(): boolean {
    return (
      this.lastDeterminedLevel !== this.currentLevel &&
      this.consecutiveCount >= this.hysteresis.minSamplesBeforeChange - 1
    );
  }

  /**
   * Get distance to next threshold
   */
  public getDistanceToThreshold(
    score: number,
    direction: 'up' | 'down',
  ): { threshold: number; distance: number; level: TrustLevel } | null {
    if (direction === 'up') {
      if (score < this.thresholds.caution) {
        return {
          threshold: this.thresholds.caution,
          distance: this.thresholds.caution - score,
          level: 'caution',
        };
      } else if (score < this.thresholds.safe) {
        return {
          threshold: this.thresholds.safe,
          distance: this.thresholds.safe - score,
          level: 'safe',
        };
      }
    } else {
      if (score >= this.thresholds.safe) {
        return {
          threshold: this.thresholds.safe,
          distance: score - this.thresholds.safe + 1,
          level: 'caution',
        };
      } else if (score >= this.thresholds.caution) {
        return {
          threshold: this.thresholds.caution,
          distance: score - this.thresholds.caution + 1,
          level: 'danger',
        };
      }
    }

    return null;
  }
}
