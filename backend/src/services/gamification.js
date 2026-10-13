const ranks = [
  { name: 'Rookie', threshold: 0 },
  { name: 'Scout', threshold: 1 },
  { name: 'Analyst', threshold: 5 },
  { name: 'Specialist', threshold: 10 },
  { name: 'Sentinel', threshold: 15 },
  { name: 'Pathfinder', threshold: 20 },
];

const rankFor = count => ranks.reduce((current, rank) => count >= rank.threshold ? rank : current, ranks[0]);

function achievementDefinitions(progress, modules) {
  const correct = progress.attempts.filter(attempt => attempt.correct);
  const completed = new Set(progress.completed);
  const completedTopics = new Set(modules.filter(module => completed.has(module.id)).map(module => module.topic));
  const accuracy = progress.attempts.length ? correct.length / progress.attempts.length * 100 : 0;
  return [
    ['first-clear', correct.length > 0], ['no-hints', correct.some(attempt => (attempt.hintsUsed ?? 0) === 0)],
    ['signal-spotter', completed.has('phishing')], ['incident-ready', completed.has('ransomware-response')],
    ['cloud-guardian', completed.has('cloud-storage')], ['wide-scan', completedTopics.size >= 5],
    ['field-scout', completed.size >= 5], ['threat-analyst', completed.size >= 10],
    ['cyberwolf-pathfinder', modules.length > 0 && completed.size >= modules.length],
    ['steady-hand', progress.attempts.length >= 10 && accuracy >= 80],
  ];
}

export function updateGamification(progress, modules, at = new Date(), previousCompletedCount = progress.completed.length) {
  const earned = new Set((progress.achievements ?? []).map(item => item.id));
  const newlyEarned = achievementDefinitions(progress, modules)
    .filter(([id, qualifies]) => qualifies && !earned.has(id))
    .map(([id]) => ({ id, earnedAt: at }));
  const currentRank = rankFor(progress.completed.length).name;
  const priorRank = rankFor(previousCompletedCount).name;
  const rankHistory = [...(progress.rankHistory ?? [])];
  if (currentRank !== priorRank) rankHistory.push({ rank: currentRank, reachedAt: at });
  return {
    ...progress,
    achievements: [...(progress.achievements ?? []), ...newlyEarned],
    gamificationInitialized: true,
    currentRank,
    rankHistory,
  };
}

export function getRankThresholds() { return ranks; }
