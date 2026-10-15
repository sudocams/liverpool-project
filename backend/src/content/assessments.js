const topicGroups = {
  pre: {
    Phishing: [
      { id: 'pre-phish-a', prompt: 'An unexpected message says your account will close unless you sign in immediately. What is the safest first action?', options: ['Use the message link to check the account.', 'Open the official service site yourself and check for alerts.', 'Reply to ask if the message is real.', 'Forward it to a friend.'], correctIndex: 1, explanation: 'Use a trusted route to the service rather than a link in an urgent message.' },
      { id: 'pre-phish-b', prompt: 'A colleague sends an invoice from a new address and asks you to enable macros. What should you do first?', options: ['Enable macros because the sender is a colleague.', 'Verify the request through a known contact method and follow reporting policy.', 'Upload it to a personal file-sharing site.', 'Reply with your password to confirm access.'], correctIndex: 1, explanation: 'Unexpected files and requests should be verified through a trusted channel.' },
    ],
    'Account security': [
      { id: 'pre-password-a', prompt: 'What is the best way to protect two accounts if one service suffers a data breach?', options: ['Use the same long password on both.', 'Use unique passwords and enable MFA.', 'Change one character between passwords.', 'Store both passwords in an email draft.'], correctIndex: 1, explanation: 'Unique passwords limit reuse of leaked credentials; MFA adds another layer.' },
      { id: 'pre-password-b', prompt: 'A sign-in page offers multi-factor authentication. Which choice improves account security?', options: ['Turn it off to make sign-in quicker.', 'Enable it and use a separate, unique password.', 'Share the one-time code with a coworker.', 'Use your email password on this account too.'], correctIndex: 1, explanation: 'A unique password and a second verification step make account takeover harder.' },
    ],
    'Social engineering': [
      { id: 'pre-social-a', prompt: 'A caller claiming to be support asks for a one-time sign-in code. What should you do?', options: ['Share the code if they know your name.', 'Share half and ask what the rest is for.', 'Decline and contact support through an official channel.', 'Approve the sign-in, then change your password.'], correctIndex: 2, explanation: 'One-time codes should not be shared. Verify the request through a known support channel.' },
      { id: 'pre-social-b', prompt: 'A manager messages urgently asking you to buy gift cards and send the codes. What is safest?', options: ['Buy them immediately because the request is urgent.', 'Verify the request with the manager using a known channel.', 'Send one code first to prove you are helping.', 'Post the request in a public group.'], correctIndex: 1, explanation: 'Urgency and unusual requests are common impersonation tactics; verify independently.' },
    ],
    'Malware & downloads': [
      { id: 'pre-malware-a', prompt: 'A pop-up on an unfamiliar site offers an urgent browser update. Which response is safest?', options: ['Install it before the timer runs out.', 'Use the browser’s built-in update settings.', 'Disable antivirus and try again.', 'Ask the pop-up to show a certificate.'], correctIndex: 1, explanation: 'Update software through its built-in updater or the official developer site.' },
      { id: 'pre-malware-b', prompt: 'A document asks you to install a viewer from an unfamiliar download site. What should you do?', options: ['Install it if the page looks professional.', 'Get software through an official source and report suspicious files.', 'Disable security tools while installing.', 'Ask the sender to email an executable instead.'], correctIndex: 1, explanation: 'Use official software sources and avoid unexpected executable downloads.' },
    ],
    'Public Wi-Fi': [
      { id: 'pre-wifi-a', prompt: 'You see two similar public Wi-Fi names and need to check a bank account. What should you do?', options: ['Connect to the one with the strongest signal.', 'Choose the name that says “secure”.', 'Verify the venue’s network and use mobile data for banking if possible.', 'Ask another guest which one they use.'], correctIndex: 2, explanation: 'Verify the network directly and use a trusted connection for sensitive activity.' },
      { id: 'pre-wifi-b', prompt: 'A café Wi-Fi asks you to install a security certificate before browsing. What should you do?', options: ['Install it without checking.', 'Ask staff to verify the requirement and avoid sensitive activity until confirmed.', 'Use your email password as the Wi-Fi password.', 'Turn off device updates.'], correctIndex: 1, explanation: 'Verify unusual connection requirements directly with the venue before installing anything.' },
    ],
  },
  post: {
    Phishing: [
      { id: 'post-phish-a', prompt: 'A delivery notification from an unfamiliar address asks you to confirm payment within one hour. What should you do?', options: ['Open its payment link in a private browser window.', 'Check the delivery using the carrier’s official app or site.', 'Reply asking for a tracking number.', 'Download the attached invoice.'], correctIndex: 1, explanation: 'Verify unexpected delivery requests through a trusted official channel.' },
      { id: 'post-phish-b', prompt: 'A shared document link asks you to sign in again on a page you do not recognize. What is safest?', options: ['Enter your password because the email mentions your team.', 'Open the organization’s normal document service directly and check there.', 'Enter a one-time code to see the document.', 'Forward the link to an external address.'], correctIndex: 1, explanation: 'Use the known service directly rather than entering credentials on an unexpected page.' },
    ],
    'Account security': [
      { id: 'post-password-a', prompt: 'A password you use on several sites may have been exposed. What is the best response?', options: ['Change it slightly on each site.', 'Change it on every site and use a unique password for each.', 'Wait to see whether anyone signs in.', 'Turn off MFA to avoid lockouts.'], correctIndex: 1, explanation: 'Replace reused passwords with unique ones and keep MFA enabled.' },
      { id: 'post-password-b', prompt: 'You receive an unexpected sign-in approval request while not signing in. What should you do?', options: ['Approve it to stop notifications.', 'Decline it and report or secure the account through its official settings.', 'Send the approval code to support.', 'Ignore repeated prompts and keep trying.'], correctIndex: 1, explanation: 'Decline unexpected requests and secure the account through a trusted route.' },
    ],
    'Social engineering': [
      { id: 'post-social-a', prompt: 'Someone claiming to be your manager asks you to approve an unexpected login prompt. What should you do?', options: ['Approve it because it came from a manager.', 'Ask them to send the request by text.', 'Decline it and verify the request using a known contact method.', 'Approve it, then report it.'], correctIndex: 2, explanation: 'Unexpected approval requests should be declined and independently verified.' },
      { id: 'post-social-b', prompt: 'A supplier asks you to change bank details using an urgent email. How should you respond?', options: ['Update the details from the email.', 'Verify the change using the supplier’s established contact and approval process.', 'Reply asking them to confirm the same bank details.', 'Send a small payment to test the account.'], correctIndex: 1, explanation: 'Verify payment changes through a separate trusted channel and required approvals.' },
    ],
    'Malware & downloads': [
      { id: 'post-malware-a', prompt: 'A document asks you to install a plug-in from a file-sharing page before it will open. What is safest?', options: ['Install it if other users commented positively.', 'Get software only from the official developer or app store.', 'Temporarily disable device protections.', 'Run it on your main computer to check.'], correctIndex: 1, explanation: 'Avoid untrusted downloads and obtain software through official sources.' },
      { id: 'post-malware-b', prompt: 'A teammate receives an unexpected attachment that asks them to enable active content. What should they do?', options: ['Enable it to inspect the file.', 'Verify with the sender using a known channel and report it if suspicious.', 'Forward it to personal email for scanning.', 'Disable endpoint protection first.'], correctIndex: 1, explanation: 'Verify unexpected files and do not enable active content without an approved reason.' },
    ],
    'Public Wi-Fi': [
      { id: 'post-wifi-a', prompt: 'A hotel network asks you to install a certificate to access free Wi-Fi. What is the safest next step?', options: ['Install it; hotels commonly do this.', 'Verify the requirement with hotel staff and avoid sensitive activity until verified.', 'Use the same password as your email.', 'Accept and disable VPN.'], correctIndex: 1, explanation: 'Verify unusual connection requirements with the venue before installing anything.' },
      { id: 'post-wifi-b', prompt: 'You need to access payroll while connected to airport Wi-Fi. Which option is safest?', options: ['Use any network that has a familiar name.', 'Switch to mobile data or another trusted connection for the sensitive task.', 'Ask a nearby traveler to share their login.', 'Disable HTTPS warnings if they appear.'], correctIndex: 1, explanation: 'Use a trusted connection for sensitive account activity whenever possible.' },
    ],
  },
  retention: {
    Phishing: [{ id: 'ret-phish-a', prompt: 'A payroll notice arrives from a lookalike domain and links to a sign-in page. What is the safest response?', options: ['Sign in quickly before payroll closes.', 'Open the payroll service from a saved trusted address and report the message.', 'Reply with a request for confirmation.', 'Forward the message to a personal account.'], correctIndex: 1, explanation: 'Use a trusted route to the service and report suspicious messages.' }, { id: 'ret-phish-b', prompt: 'A QR code on a delivery flyer asks you to pay a small release fee. What should you do?', options: ['Scan and pay because the amount is small.', 'Check the delivery directly with the carrier using its official app or site.', 'Scan it using a personal device.', 'Send the QR code to a colleague to test.'], correctIndex: 1, explanation: 'Unexpected payment links should be independently verified through official channels.' }],
    'Account security': [{ id: 'ret-password-a', prompt: 'A service reports that a password database was exposed. You reused that password elsewhere. What should you do?', options: ['Change it only on the affected service.', 'Change it everywhere it was reused, use unique passwords, and keep MFA enabled.', 'Wait until you see suspicious activity.', 'Share the password with IT so they can check it.'], correctIndex: 1, explanation: 'Replace reused credentials everywhere and use unique passwords with MFA.' }, { id: 'ret-password-b', prompt: 'You receive repeated MFA prompts that you did not initiate. What is the safest action?', options: ['Approve one to stop the prompts.', 'Reject them and secure the account through its official recovery process.', 'Send the codes to your supervisor.', 'Disable MFA.'], correctIndex: 1, explanation: 'Reject unexpected prompts and secure the account through a trusted route.' }],
    'Social engineering': [{ id: 'ret-social-a', prompt: 'A caller says an executive is locked out and asks you to bypass the normal identity check. What should you do?', options: ['Make an exception because it is urgent.', 'Follow the verification process and contact the executive through a known channel.', 'Ask the caller to provide a coworker’s details.', 'Reset the account and email a temporary password.'], correctIndex: 1, explanation: 'Urgency or authority does not replace established identity verification.' }, { id: 'ret-social-b', prompt: 'A technician asks you to install a remote support tool during an unsolicited call. What is safest?', options: ['Install it if they know your department.', 'End the call and contact support using the organization’s known contact details.', 'Share your screen but hide email.', 'Give them a one-time code first.'], correctIndex: 1, explanation: 'Verify unsolicited support requests through a known official channel.' }],
    'Malware & downloads': [{ id: 'ret-malware-a', prompt: 'A shared drive contains an unexpected file that asks you to enable macros. What should you do?', options: ['Enable them to inspect the contents.', 'Do not enable them; verify with the sender and report the file.', 'Download it to a personal device.', 'Disable endpoint protection temporarily.'], correctIndex: 1, explanation: 'Unexpected active content should be verified and handled through reporting procedures.' }, { id: 'ret-malware-b', prompt: 'A browser warning says an installer is unsigned. What is the safest next step?', options: ['Ignore the warning if the download is popular.', 'Cancel and obtain the software from an approved official source.', 'Turn off the warning and continue.', 'Ask a colleague to install it first.'], correctIndex: 1, explanation: 'Obtain software from approved sources and do not bypass security warnings.' }],
    'Public Wi-Fi': [{ id: 'ret-wifi-a', prompt: 'At an airport, a network named like the airport Wi-Fi asks you to install a profile. What should you do?', options: ['Install it because the name matches.', 'Verify with airport staff and avoid sensitive work until confirmed.', 'Use it only for email.', 'Accept it and disable device protections.'], correctIndex: 1, explanation: 'Verify unusual network setup requests with the venue before installing profiles.' }, { id: 'ret-wifi-b', prompt: 'You must access confidential work while away from the office. Which connection is preferable?', options: ['Any open network with a strong signal.', 'A trusted connection such as mobile data or an approved VPN configuration.', 'A network whose name includes “secure”.', 'A nearby device’s hotspot without asking.'], correctIndex: 1, explanation: 'Use a trusted connection and approved secure access for sensitive work.' }],
  },
  transfer: {
    Phishing: [{ id: 'tr-phish-a', prompt: 'A vendor portal sends a surprise “MFA reset” link after a failed delivery. What is the best action?', options: ['Use the link since it mentions MFA.', 'Navigate to the vendor portal using a known bookmark and check notifications there.', 'Reply with your username to verify the notice.', 'Open it on a phone instead.'], correctIndex: 1, explanation: 'Verify account notices by navigating to the known service independently.' }],
    'Account security': [{ id: 'tr-password-a', prompt: 'A team shares one account for a project tool. A member leaves the team. What reduces risk best?', options: ['Keep the shared password unchanged.', 'Move to named accounts, revoke the former member, and rotate any shared secret.', 'Send the password to the manager only.', 'Remove MFA to simplify access.'], correctIndex: 1, explanation: 'Individual accounts support accountability; revoke access and rotate shared credentials.' }],
    'Social engineering': [{ id: 'tr-social-a', prompt: 'A person in a delivery uniform asks to follow an employee through a secure door because their badge failed. What should you do?', options: ['Let them in if they carry a parcel.', 'Follow visitor procedures and contact the host or security desk.', 'Take a photo of their ID and admit them.', 'Ask another visitor to verify.'], correctIndex: 1, explanation: 'Do not bypass physical access controls; use the established visitor process.' }],
    'Malware & downloads': [{ id: 'tr-malware-a', prompt: 'A browser extension requests permission to read data on every site, though it only claims to change themes. What is safest?', options: ['Install it and review later.', 'Avoid installation unless the permission is necessary and the source is approved.', 'Use it only while logged out.', 'Disable browser updates first.'], correctIndex: 1, explanation: 'Check whether permissions match the purpose and use approved sources.' }],
    'Public Wi-Fi': [{ id: 'tr-wifi-a', prompt: 'A conference attendee offers a hotspot with a familiar event name and asks you to install a certificate. What should you do?', options: ['Install it because the name is familiar.', 'Confirm the network and requirement with event staff; otherwise use a trusted connection.', 'Use it for work if the signal is strong.', 'Share your device password with the attendee.'], correctIndex: 1, explanation: 'Names can be spoofed; verify networks and certificate requests independently.' }],
  },
};

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function getAssessment(phase) {
  const groups = topicGroups[phase];
  if (!groups) return null;
  return shuffled(Object.entries(groups).map(([topic, questions]) => ({ ...questions[Math.floor(Math.random() * questions.length)], topic }))).map(question => ({
    id: question.id,
    topic: question.topic,
    prompt: question.prompt,
    options: shuffled(question.options),
  }));
}

function allQuestions(phase) { return Object.entries(topicGroups[phase] ?? {}).flatMap(([topic, questions]) => questions.map(question => ({ ...question, topic }))); }

export function scoreAssessment(phase, answers) {
  const questions = allQuestions(phase);
  const results = answers.map(answer => {
    const question = questions.find(item => item.id === answer.questionId);
    return { questionId: question.id, topic: question.topic, correct: answer.selectedOption === question.options[question.correctIndex], explanation: question.explanation };
  });
  const score = results.filter(result => result.correct).length;
  return { score, total: results.length, results, topicScores: Object.fromEntries([...new Set(results.map(result => result.topic))].map(topic => {
    const matching = results.filter(result => result.topic === topic);
    return [topic, { score: matching.filter(result => result.correct).length, total: matching.length }];
  })) };
}

export function isAssessmentAnswerValid(phase, answers) {
  const questions = allQuestions(phase);
  if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length) return false;
  const byId = new Map(questions.map(question => [question.id, question]));
  const seen = new Set();
  const topics = new Set();
  return answers.every(answer => {
    const question = byId.get(answer?.questionId);
    if (!question || seen.has(question.id) || topics.has(question.topic) || typeof answer.selectedOption !== 'string' || !question.options.includes(answer.selectedOption)) return false;
    seen.add(question.id);
    topics.add(question.topic);
    return true;
  });
}
