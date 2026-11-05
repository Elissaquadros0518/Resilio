import test from 'node:test';
import assert from 'node:assert/strict';
import { assessClusterRisk, classifyRisk, generateCategoryAlerts } from '../src/data/riskIntelligence.js';

const cluster = (overrides = {}) => ({
  cluster_id: 4,
  report_count: 4,
  severity_counts: { LOW: 1, MODERATE: 1, HIGH: 1, CRITICAL: 1 },
  categories: { 'Flooding / Waterlogging': 3, 'Road Problem': 1 },
  ...overrides,
});
const weather = (overrides = {}) => ({ current: { temperature: 30, precipitation: 10, ...overrides } });

test('classifies risk score boundaries', () => {
  assert.equal(classifyRisk(0), 'Low');
  assert.equal(classifyRisk(24), 'Low');
  assert.equal(classifyRisk(25), 'Moderate');
  assert.equal(classifyRisk(49), 'Moderate');
  assert.equal(classifyRisk(50), 'High');
  assert.equal(classifyRisk(74), 'High');
  assert.equal(classifyRisk(75), 'Critical');
  assert.equal(classifyRisk(100), 'Critical');
  assert.equal(classifyRisk(null), null);
});

test('scores normalized concentration, average severity, weather, and weighted total', () => {
  const result = assessClusterRisk(cluster(), weather());
  assert.equal(result.components.concentration, (100 * 4) / 11);
  assert.equal(result.components.severity, 62.5);
  assert.equal(result.components.weather, 35);
  assert.equal(result.score, 45);
  assert.equal(result.classification, 'Moderate');
  assert.equal(assessClusterRisk(cluster({ report_count: 3 }), weather()).components.concentration, 30);
});

test('marks unavailable or incomplete required inputs rather than scoring them as zero', () => {
  const noWeather = assessClusterRisk(cluster(), null);
  assert.equal(noWeather.score, null);
  assert.ok(noWeather.missing.includes('current temperature and precipitation'));
  const unknownSeverity = assessClusterRisk(cluster({ severity_counts: { HIGH: 3, UNKNOWN: 1 } }), weather());
  assert.equal(unknownSeverity.score, null);
  assert.ok(unknownSeverity.missing.includes('complete recognized severity counts'));
  assert.equal(assessClusterRisk(cluster({ report_count: 0 }), weather()).score, null);
  assert.equal(assessClusterRisk(cluster(), weather({ precipitation: null })).score, null);
});

test('emits category alerts only for clustered category evidence plus a matching weather trigger', () => {
  const hotspots = [
    cluster(),
    cluster({ cluster_id: 5, categories: { 'Extreme Heat': 2 } }),
    cluster({ cluster_id: 6, categories: { 'Road Problem': 1, 'Infrastructure Damage': 1 } }),
  ];
  const alerts = generateCategoryAlerts(hotspots, {
    4: weather({ precipitation: 5 }),
    5: weather({ temperature: 35, precipitation: 0 }),
    6: weather({ precipitation: 25 }),
  }, '2026-11-05T10:00:00.000Z');
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].incidentCategory, 'Flooding / Waterlogging');
  assert.equal(alerts[0].score, 44);
  assert.equal(alerts[0].locality, 'Cluster 4');
  assert.ok(alerts[0].contributingFactors.length >= 2);
  assert.ok(alerts[0].precaution);
  assert.equal(alerts[0].calculatedAt, '2026-11-05T10:00:00.000Z');
  assert.equal(alerts[1].incidentCategory, 'Extreme Heat');
  assert.ok(!alerts.some((alert) => alert.clusterId === 6));
  assert.equal(generateCategoryAlerts([cluster({ categories: { 'Flooding / Waterlogging': 3 } })], {}).length, 0);
});

test('reports an incomplete risk assessment on alerts when weather scoring inputs are missing', () => {
  const [alert] = generateCategoryAlerts([cluster()], { 4: weather({ temperature: null }) });
  assert.equal(alert.score, null);
  assert.equal(alert.classification, null);
  assert.equal(alert.riskIncomplete, true);
});
