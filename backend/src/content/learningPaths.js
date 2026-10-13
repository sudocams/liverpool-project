export const learningPaths = [
  {
    id: 'digital-self-defense',
    title: 'Digital self-defense',
    description: 'Build safe everyday habits for messages, accounts, devices, and connections.',
    prerequisites: [],
    modules: [
      { id: 'spot-social-threats', title: 'Spot social threats', challengeIds: ['phishing', 'social-engineering'] },
      { id: 'secure-accounts-devices', title: 'Secure accounts and devices', challengeIds: ['passwords', 'safe-downloads', 'mobile-permissions'] },
      { id: 'connect-safely', title: 'Connect safely', challengeIds: ['public-wifi'] },
    ],
  },
  {
    id: 'protecting-data-services',
    title: 'Protecting data and services',
    description: 'Apply access control, privacy, cloud, and supplier security principles.',
    prerequisites: ['digital-self-defense'],
    modules: [
      { id: 'secure-data-services', title: 'Secure data and services', challengeIds: ['cloud-storage', 'web-access-control', 'data-disclosure'] },
      { id: 'govern-access', title: 'Govern access', challengeIds: ['insider-risk', 'supplier-access', 'access-review'] },
      { id: 'manage-emerging-risk', title: 'Manage emerging risks', challengeIds: ['patch-priority', 'ai-confidential-prompt'] },
    ],
  },
  {
    id: 'security-operations',
    title: 'Security operations and recovery',
    description: 'Triage incidents, investigate evidence, contain threats, and recover safely.',
    prerequisites: ['digital-self-defense'],
    modules: [
      { id: 'detect-and-triage', title: 'Detect and triage', challengeIds: ['network-traffic', 'alert-triage'] },
      { id: 'contain-incidents', title: 'Contain incidents', challengeIds: ['ransomware-response', 'usb-device', 'lost-laptop'] },
      { id: 'recover-resiliently', title: 'Recover resiliently', challengeIds: ['recovery-check'] },
    ],
  },
];

export function pathChallengeIds(path) {
  return path.modules.flatMap(module => module.challengeIds);
}

export function completedLearningPaths(completedChallengeIds = []) {
  const completed = new Set(completedChallengeIds);
  return learningPaths.filter(path => path.modules.every(module => module.challengeIds.every(id => completed.has(id)))).map(path => path.id);
}

export function learningPathProgress(path, completedChallengeIds = []) {
  const completed = new Set(completedChallengeIds);
  const completedModules = path.modules.filter(module => module.challengeIds.every(id => completed.has(id))).length;
  const totalChallenges = pathChallengeIds(path).length;
  const completedChallenges = pathChallengeIds(path).filter(id => completed.has(id)).length;
  return {
    completed: completedModules,
    total: path.modules.length,
    rate: path.modules.length ? Math.round(completedModules / path.modules.length * 100) : 0,
    completedChallenges,
    totalChallenges,
  };
}
