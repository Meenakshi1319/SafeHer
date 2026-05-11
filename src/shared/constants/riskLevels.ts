/**
 * Risk Level Configuration
 * 
 * Centralized risk thresholds and escalation rules.
 * Used by both frontend and backend to ensure consistency.
 */

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 85,
  VERY_HIGH: 100,
} as const;

export const RISK_LEVELS = {
  LOW: {
    min: 0,
    max: RISK_THRESHOLDS.LOW,
    label: 'LOW',
    emoji: '🟢',
    color: '#F28C82',
    description: 'No immediate threat detected',
    actions: ['Monitor sensors', 'Continue normal operation'],
  },
  MEDIUM: {
    min: RISK_THRESHOLDS.LOW + 1,
    max: RISK_THRESHOLDS.MEDIUM,
    label: 'MEDIUM',
    emoji: '🟡',
    color: '#F59E0B',
    description: 'Potential threat detected',
    actions: ['Alert family', 'Alert trusted contacts', 'Increase monitoring'],
  },
  HIGH: {
    min: RISK_THRESHOLDS.MEDIUM + 1,
    max: RISK_THRESHOLDS.HIGH,
    label: 'HIGH',
    emoji: '🟠',
    color: '#F97316',
    description: 'Significant threat detected',
    actions: ['Alert family', 'Alert volunteers', 'Alert NGOs', 'Start auto-recording'],
  },
  VERY_HIGH: {
    min: RISK_THRESHOLDS.HIGH + 1,
    max: RISK_THRESHOLDS.VERY_HIGH,
    label: 'VERY HIGH',
    emoji: '🔴',
    color: '#EF4444',
    description: 'Critical emergency',
    actions: ['Alert all contacts', 'Alert police', 'Alert emergency services', 'Continuous recording'],
  },
} as const;

export type RiskLevelKey = keyof typeof RISK_LEVELS;

/**
 * Get risk level configuration for a given score
 */
export function getRiskLevel(score: number): typeof RISK_LEVELS[RiskLevelKey] {
  if (score <= RISK_THRESHOLDS.LOW) return RISK_LEVELS.LOW;
  if (score <= RISK_THRESHOLDS.MEDIUM) return RISK_LEVELS.MEDIUM;
  if (score <= RISK_THRESHOLDS.HIGH) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.VERY_HIGH;
}

/**
 * Get risk level color for a given score
 */
export function getRiskColor(score: number): string {
  return getRiskLevel(score).color;
}

/**
 * Get risk level label for a given score
 */
export function getRiskLabel(score: number): string {
  return getRiskLevel(score).label;
}
