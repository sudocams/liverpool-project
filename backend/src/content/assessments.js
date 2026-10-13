const assessmentForms = {
  pre: [
    { id: 'pre-phish', topic: 'Phishing', prompt: 'An unexpected message says your account will close unless you sign in immediately. What is the safest first action?', options: ['Use the message link to check the account.', 'Open the official service site yourself and check for alerts.', 'Reply to ask if the message is real.', 'Forward it to a friend.'], correctIndex: 1, explanation: 'Use a trusted route to the service rather than a link in an urgent message.' },
    { id: 'pre-password', topic: 'Account security', prompt: 'What is the best way to protect two accounts if one service suffers a data breach?', options: ['Use the same long password on both.', 'Use unique passwords and enable MFA.', 'Change one character between passwords.', 'Store both passwords in an email draft.'], correctIndex: 1, explanation: 'Unique passwords limit reuse of leaked credentials; MFA adds another layer.' },
    { id: 'pre-social', topic: 'Social engineering', prompt: 'A caller claiming to be support asks for a one-time sign-in code. What should you do?', options: ['Share the code if they know your name.', 'Share half and ask what the rest is for.', 'Decline and contact support through an official channel.', 'Approve the sign-in, then change your password.'], correctIndex: 2, explanation: 'One-time codes should not be shared. Verify the request through a known support channel.' },
    { id: 'pre-malware', topic: 'Malware & downloads', prompt: 'A pop-up on an unfamiliar site offers an urgent browser update. Which response is safest?', options: ['Install it before the timer runs out.', 'Use the browser’s built-in update settings.', 'Disable antivirus and try again.', 'Ask the pop-up to show a certificate.'], correctIndex: 1, explanation: 'Update software through its built-in updater or the official developer site.' },
    { id: 'pre-wifi', topic: 'Public Wi-Fi', prompt: 'You see two similar public Wi-Fi names and need to check a bank account. What should you do?', options: ['Connect to the one with the strongest signal.', 'Choose the name that says “secure”.', 'Verify the venue’s network and use mobile data for banking if possible.', 'Ask another guest which one they use.'], correctIndex: 2, explanation: 'Verify the network directly and use a trusted connection for sensitive activity.' },
  ],
  post: [
    { id: 'post-phish', topic: 'Phishing', prompt: 'A delivery notification from an unfamiliar address asks you to confirm payment within one hour. What should you do?', options: ['Open its payment link in a private browser window.', 'Check the delivery using the carrier’s official app or site.', 'Reply asking for a tracking number.', 'Download the attached invoice.'], correctIndex: 1, explanation: 'Verify unexpected delivery requests through a trusted official channel.' },
    { id: 'post-password', topic: 'Account security', prompt: 'A password you use on several sites may have been exposed. What is the best response?', options: ['Change it slightly on each site.', 'Change it on every site and use a unique password for each.', 'Wait to see whether anyone signs in.', 'Turn off MFA to avoid lockouts.'], correctIndex: 1, explanation: 'Replace reused passwords with unique ones and keep MFA enabled.' },
    { id: 'post-social', topic: 'Social engineering', prompt: 'Someone claiming to be your manager asks you to approve an unexpected login prompt. What should you do?', options: ['Approve it because it came from a manager.', 'Ask them to send the request by text.', 'Decline it and verify the request using a known contact method.', 'Approve it, then report it.'], correctIndex: 2, explanation: 'Unexpected approval requests should be declined and independently verified.' },
    { id: 'post-malware', topic: 'Malware & downloads', prompt: 'A document asks you to install a plug-in from a file-sharing page before it will open. What is safest?', options: ['Install it if other users commented positively.', 'Get software only from the official developer or app store.', 'Temporarily disable device protections.', 'Run it on your main computer to check.'], correctIndex: 1, explanation: 'Avoid untrusted downloads and obtain software through official sources.' },
    { id: 'post-wifi', topic: 'Public Wi-Fi', prompt: 'A hotel network asks you to install a certificate to access free Wi-Fi. What is the safest next step?', options: ['Install it; hotels commonly do this.', 'Verify the requirement with hotel staff and avoid sensitive activity until verified.', 'Use the same password as your email.', 'Accept and disable VPN.'], correctIndex: 1, explanation: 'Verify unusual connection requirements with the venue before installing anything.' },
  ],
};

export function getAssessment(phase) {
  return assessmentForms[phase]?.map(({ correctIndex, explanation, ...question }) => question) ?? null;
}

export function scoreAssessment(phase, answers) {
  const questions = assessmentForms[phase];
  if (!questions) return null;
  const byId = new Map(answers.map(answer => [answer.questionId, answer.selectedOption]));
  const results = questions.map(question => ({
    questionId: question.id,
    topic: question.topic,
    correct: byId.get(question.id) === question.correctIndex,
    explanation: question.explanation,
  }));
  const score = results.filter(result => result.correct).length;
  return { score, total: questions.length, results };
}

export function isAssessmentAnswerValid(phase, answers) {
  const questions = assessmentForms[phase];
  if (!questions || !Array.isArray(answers) || answers.length !== questions.length) return false;
  const questionById = new Map(questions.map(question => [question.id, question]));
  const seen = new Set();
  return answers.every(answer => {
    const question = questionById.get(answer?.questionId);
    if (!question || seen.has(answer.questionId) || !Number.isInteger(answer.selectedOption)) return false;
    seen.add(answer.questionId);
    return answer.selectedOption >= 0 && answer.selectedOption < question.options.length;
  });
}
