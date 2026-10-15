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

// An equivalent-form pool lets each attempt sample three distinct questions per topic.
const additionalQuestions = {
  pre: {
    Phishing: [{ id: 'pre-phish-c', prompt: 'A document-sharing alert uses a sender address with one extra letter in the company domain. What should you do?', options: ['Open it because the display name is familiar.', 'Visit the document service directly and report the suspicious message.', 'Reply asking the sender to resend it.', 'Download the attachment to inspect it.'], correctIndex: 1, explanation: 'A lookalike address is a warning sign; verify through the known service and report it.' }],
    'Account security': [{ id: 'pre-password-c', prompt: 'A service lets you create a recovery code. What is a safer way to keep it?', options: ['Store it in the same account inbox.', 'Keep it in a protected password manager or other approved secure location.', 'Share it with a colleague.', 'Use it as your regular password.'], correctIndex: 1, explanation: 'Recovery codes should be protected separately from the account they recover.' }],
    'Social engineering': [{ id: 'pre-social-c', prompt: 'A visitor says a colleague is expecting them but cannot be reached. What should you do?', options: ['Let them follow you in.', 'Use visitor verification procedures and contact the host or reception.', 'Ask them to show a business card.', 'Give them your access badge.'], correctIndex: 1, explanation: 'Follow the visitor process; a claim of familiarity does not replace verification.' }],
    'Malware & downloads': [{ id: 'pre-malware-c', prompt: 'A free utility requests administrator access although its task should not need it. What is safest?', options: ['Grant access and remove it later.', 'Do not install it until the software and permissions are verified through an approved source.', 'Disable endpoint protection during setup.', 'Install it on a work device first.'], correctIndex: 1, explanation: 'Unexpected privileges are a warning; verify software provenance and need before installing.' }],
    'Public Wi-Fi': [{ id: 'pre-wifi-c', prompt: 'A public hotspot redirects you to a page asking for your work email password. What should you do?', options: ['Enter it if the page has the venue logo.', 'Do not enter work credentials; verify the network and use a trusted connection.', 'Reuse an old password.', 'Ask another guest to sign in first.'], correctIndex: 1, explanation: 'A public network should not collect work credentials; use a verified trusted connection.' }],
  },
  post: {
    Phishing: [{ id: 'post-phish-c', prompt: 'A cloud-storage warning asks you to review a shared file through a shortened link. What is safest?', options: ['Open it because cloud alerts are common.', 'Go to the cloud service directly and check shared files and alerts there.', 'Paste the link into a chat for others.', 'Enter credentials only if the page uses the company logo.'], correctIndex: 1, explanation: 'Check alerts by navigating to the known service rather than trusting a shortened link.' }],
    'Account security': [{ id: 'post-password-c', prompt: 'A team member leaves and had access to a shared service credential. What should the team do?', options: ['Keep using it because the account still works.', 'Revoke their named access and rotate the shared credential if it was exposed to them.', 'Send the credential to the next team member.', 'Disable audit logging.'], correctIndex: 1, explanation: 'Remove access promptly and rotate shared secrets when access changes.' }],
    'Social engineering': [{ id: 'post-social-c', prompt: 'A person claiming to be a regulator demands an immediate export of customer records. What should you do?', options: ['Send the data to avoid a penalty.', 'Verify the request and authority through approved legal and security channels.', 'Ask them to confirm by replying to the same email.', 'Upload the records to a public link.'], correctIndex: 1, explanation: 'Sensitive disclosure requires independent verification and established approval.' }],
    'Malware & downloads': [{ id: 'post-malware-c', prompt: 'An update prompt appears inside a webpage while using a work application. What should you do?', options: ['Install it immediately.', 'Close the prompt and use the application or device’s official update mechanism.', 'Disable browser protections.', 'Download the update from a search advertisement.'], correctIndex: 1, explanation: 'Use an official updater or trusted developer source, not a webpage pop-up.' }],
    'Public Wi-Fi': [{ id: 'post-wifi-c', prompt: 'A public network shows a certificate warning when you open a work site. What is safest?', options: ['Ignore the warning once.', 'Stop and use a trusted connection; report the warning if it persists.', 'Enter credentials and change them later.', 'Disable secure browsing.'], correctIndex: 1, explanation: 'Do not bypass certificate warnings for sensitive access; switch to a trusted connection.' }],
  },
  retention: {
    Phishing: [{ id: 'ret-phish-c', prompt: 'A message says a cloud-storage quota is exceeded and requests a password to prevent deletion. What should you do?', options: ['Reply with the password to protect the files.', 'Check storage status from the official service and report the message.', 'Forward the alert to an outside address.', 'Open the link from a personal device.'], correctIndex: 1, explanation: 'Check account status through the official service; never provide a password by message.' }],
    'Account security': [{ id: 'ret-password-c', prompt: 'You receive a security code you did not request. What should you do?', options: ['Share it with the person who calls next.', 'Do not share it; deny unexpected sign-in activity and secure the account.', 'Save it for your next login.', 'Post it to the team chat for review.'], correctIndex: 1, explanation: 'Unrequested codes can signal an attempted login; keep the code private and secure the account.' }],
    'Social engineering': [{ id: 'ret-social-c', prompt: 'A coworker asks you to hold a secure door open because they forgot their badge. What is the correct response?', options: ['Let them in because you recognize them.', 'Ask them to use the approved access or visitor process.', 'Share your badge for the day.', 'Disable the door alarm.'], correctIndex: 1, explanation: 'Physical access controls apply even when someone seems familiar.' }],
    'Malware & downloads': [{ id: 'ret-malware-c', prompt: 'A spreadsheet from an unknown sender asks you to enable macros to view an invoice. What should you do?', options: ['Enable macros but do not save.', 'Keep macros disabled, verify the sender independently, and report the file.', 'Upload it to a public scanner.', 'Forward it to your personal email.'], correctIndex: 1, explanation: 'Do not enable active content in unexpected files; verify and report through approved channels.' }],
    'Public Wi-Fi': [{ id: 'ret-wifi-c', prompt: 'A public hotspot disconnects and reconnects with a slightly different name. What should you do?', options: ['Reconnect because the signal is stronger.', 'Verify the correct network with the venue and avoid sensitive work until confirmed.', 'Use the network for banking only.', 'Turn off the device firewall.'], correctIndex: 1, explanation: 'A similar network name may be an impersonation; verify before reconnecting.' }],
  },
  transfer: {
    Phishing: [
      { id: 'tr-phish-b', prompt: 'A job applicant sends a portfolio link from an unfamiliar file-hosting service, and your browser requests a sign-in. What should you do?', options: ['Sign in using your work account.', 'Do not enter credentials; use an approved way to inspect the file and report concerns.', 'Ask a colleague to sign in for you.', 'Download it on a personal device.'], correctIndex: 1, explanation: 'Unexpected file links should not prompt work credentials; use approved review channels.' },
      { id: 'tr-phish-c', prompt: 'A supplier’s invoice arrives in an ongoing email thread, but the reply-to address differs. What is safest?', options: ['Pay it because the thread is genuine.', 'Verify the invoice and payment details using a known supplier contact method.', 'Reply to the changed address.', 'Forward the thread to a personal inbox.'], correctIndex: 1, explanation: 'Compromised threads can carry fraudulent changes; verify payment details out of band.' },
    ],
    'Account security': [
      { id: 'tr-password-b', prompt: 'A phone used for account MFA is lost while travelling. What should the learner do first?', options: ['Ask a stranger to receive a code.', 'Use the service’s official recovery process and revoke the lost device where possible.', 'Turn off all account protections.', 'Reuse a coworker’s account.'], correctIndex: 1, explanation: 'Use official recovery and revoke a lost authenticator device.' },
      { id: 'tr-password-c', prompt: 'An employee receives a password-manager vault sharing invitation they did not expect. What is safest?', options: ['Accept it to check the contents.', 'Decline and verify with the sender through a known channel.', 'Forward it to the whole team.', 'Enter their master password in the invitation page.'], correctIndex: 1, explanation: 'Unexpected sharing invitations should be verified independently before opening.' },
    ],
    'Social engineering': [
      { id: 'tr-social-b', prompt: 'A caller claims to be conducting an audit and asks you to read out a badge number and access code. What should you do?', options: ['Provide them because audits are confidential.', 'Decline and verify the audit through the organization’s established contact.', 'Give only the badge number.', 'Ask them to call back from a private number.'], correctIndex: 1, explanation: 'Verify audit requests through established channels and never disclose access codes.' },
      { id: 'tr-social-c', prompt: 'A colleague’s social account posts an urgent request for a company gift card. What is safest?', options: ['Buy it because the post is from their account.', 'Contact the colleague using a separate known channel before acting.', 'Comment asking for their password.', 'Send a small amount first.'], correctIndex: 1, explanation: 'Accounts can be compromised; confirm unusual requests out of band.' },
    ],
    'Malware & downloads': [
      { id: 'tr-malware-b', prompt: 'A browser extension for meeting notes asks to read all page content and clipboard data. What should you do?', options: ['Approve it because note-taking needs access.', 'Check whether the permissions are necessary and use an approved tool only.', 'Install it in every browser profile.', 'Disable endpoint protection before installation.'], correctIndex: 1, explanation: 'Grant only justified permissions and follow software approval policy.' },
      { id: 'tr-malware-c', prompt: 'A USB drive found in a meeting room is labelled “presentation”. What should you do?', options: ['Plug it in to identify its owner.', 'Give it to IT or security according to policy; do not connect it.', 'Try it on a spare laptop.', 'Take it home to inspect it.'], correctIndex: 1, explanation: 'Unknown removable media should not be connected to an endpoint.' },
    ],
    'Public Wi-Fi': [
      { id: 'tr-wifi-b', prompt: 'A public charging station offers a USB port while your device battery is low. What is safer?', options: ['Connect and approve all prompts.', 'Use a wall charger or power-only adapter and avoid data connections.', 'Turn on file sharing.', 'Unlock the device before plugging in.'], correctIndex: 1, explanation: 'Avoid untrusted USB data connections; use a power-only option.' },
      { id: 'tr-wifi-c', prompt: 'A coworking space asks you to install a root certificate to reach its guest portal. What should you do?', options: ['Install it because the workspace is reputable.', 'Verify the requirement with staff and your organization before installing; use an alternative trusted connection if unsure.', 'Install it only on a work laptop.', 'Disable certificate checks instead.'], correctIndex: 1, explanation: 'Root certificates can inspect traffic; verify the source and organizational approval first.' },
    ],
  },
};

export const assessmentTopics = Object.keys(topicGroups.pre);

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function getAssessment(phase) {
  const groups = getTopicGroups(phase);
  if (!groups) return null;
  return shuffled(Object.entries(groups).flatMap(([topic, questions]) => shuffled(questions).slice(0, 3).map(question => ({ ...question, topic })))).map(question => ({
    id: question.id,
    topic: question.topic,
    prompt: question.prompt,
    options: shuffled(question.options),
  }));
}

function getTopicGroups(phase) {
  if (!topicGroups[phase]) return null;
  return Object.fromEntries(Object.entries(topicGroups[phase]).map(([topic, questions]) => [topic, [...questions, ...(additionalQuestions[phase]?.[topic] ?? [])]]));
}

function allQuestions(phase) { return Object.entries(getTopicGroups(phase) ?? {}).flatMap(([topic, questions]) => questions.map(question => ({ ...question, topic }))); }

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
  if (!questions.length || !Array.isArray(answers) || answers.length !== Object.keys(topicGroups[phase] ?? {}).length * 3) return false;
  const byId = new Map(questions.map(question => [question.id, question]));
  const seen = new Set();
  const topicCounts = new Map();
  return answers.every(answer => {
    const question = byId.get(answer?.questionId);
    if (!question || seen.has(question.id) || typeof answer.selectedOption !== 'string' || !question.options.includes(answer.selectedOption)) return false;
    seen.add(question.id);
    topicCounts.set(question.topic, (topicCounts.get(question.topic) ?? 0) + 1);
    return true;
  }) && Object.keys(topicGroups[phase]).every(topic => topicCounts.get(topic) === 3);
}
