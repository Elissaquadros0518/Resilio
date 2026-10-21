import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterReports } from '../src/data/dbscan.js';

const reports = [
  { latitude: 19.076, longitude: 72.896, category: 'Flooding / Waterlogging', severity: 'HIGH' },
  { latitude: 19.0762, longitude: 72.896, category: 'Extreme Heat', severity: 'CRITICAL' },
  { latitude: 19.0761, longitude: 72.8961, category: 'Flooding / Waterlogging', severity: 'LOW' },
  { latitude: 19.2, longitude: 72.9, category: 'Other', severity: 'MEDIUM' },
];

test('groups nearby reports and leaves isolated reports as noise', () => {
  const result = clusterReports(reports);
  assert.equal(result.algorithm, 'DBSCAN');
  assert.equal(result.radius_meters, 250);
  assert.equal(result.min_samples, 3);
  assert.equal(result.analyzed_reports, 4);
  assert.equal(result.cluster_count, 1);
  assert.equal(result.noise_count, 1);
  assert.equal(result.hotspots[0].report_count, 3);
  assert.equal(result.hotspots[0].severity_counts.CRITICAL, 1);
  assert.equal(result.hotspots[0].high_or_critical, 2);
  assert.equal(result.hotspots[0].categories['Flooding / Waterlogging'], 2);
  assert.deepEqual(result.hotspots[0].members, reports.slice(0, 3).map(({ latitude, longitude }) => ({ latitude, longitude })));
});

test('ignores reports with missing or out-of-range coordinates', () => {
  const result = clusterReports([
    ...reports.slice(0, 3),
    { latitude: 91, longitude: 72 },
    { latitude: 19, longitude: -181 },
    { latitude: null, longitude: 72 },
  ]);
  assert.equal(result.analyzed_reports, 3);
  assert.equal(result.cluster_count, 1);
  assert.equal(result.noise_count, 0);
});

test('returns an empty result for an empty dataset', () => {
  const result = clusterReports([]);
  assert.equal(result.analyzed_reports, 0);
  assert.equal(result.cluster_count, 0);
  assert.equal(result.noise_count, 0);
  assert.deepEqual(result.hotspots, []);
});
