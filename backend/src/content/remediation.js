const remediationByChallenge = {
  phishing: {
    title: 'Verify unexpected delivery notices',
    notes: ['Delivery lures use familiar services and short deadlines to make a click feel necessary. A sender name can be copied, and a button can lead to a convincing imitation sign-in page. Treat an unexpected request for an address, payment, password, or one-time code as unverified even when the branding looks familiar.', 'Open the delivery company’s official app or type its known address yourself. Check tracking information there. Do not reply with personal details or use contact links from the message to confirm its legitimacy. If the message reached a work inbox, report it through the organisation’s phishing process so others can be protected.'],
    question: 'A text says a parcel is held and asks for a small redelivery fee through a link. What should you do?',
    options: ['Pay the fee because the amount is small.', 'Open the carrier’s official app or website yourself and check the tracking status.', 'Reply with your address and ask the sender to confirm.', 'Forward the link to a coworker to test it.'], answerIndex: 1,
    explanation: 'Checking the parcel through the official service avoids trusting an unverified payment link.',
  },
  passwords: {
    title: 'Protect accounts from password reuse',
    notes: ['When one website is breached, attackers often try exposed passwords on other services. Reusing a password makes one incident capable of opening several accounts. A unique password for each account limits this effect. A password manager can create long random passwords and store them securely so you do not have to remember each one.', 'Multi-factor authentication adds a separate proof beyond the password. Prefer a passkey, security key, or authenticator method where available. Never share a one-time code or approve an unexpected sign-in prompt. Secure your primary email account because it is commonly used to reset other passwords.'],
    question: 'A service reports that passwords may have been exposed. What should you do for accounts where you reused that password?',
    options: ['Change each affected account to its own unique password and review MFA and active sessions.', 'Change the password on the breached service only.', 'Add one character to the reused password everywhere.', 'Wait for a sign-in alert before taking action.'], answerIndex: 0,
    explanation: 'Replace reused credentials on every affected service and review additional account protections.',
  },
  'social-engineering': {
    title: 'Resist impersonation and pressure',
    notes: ['Social engineering uses trust, urgency, authority, fear, or secrecy to influence a person into revealing information or taking an unsafe action. A caller may know names or workplace details from public sources. That knowledge does not authenticate them. Requests for passwords, one-time codes, login approvals, money, or unusual secrecy deserve independent checks.', 'End an unexpected call and contact the organisation using a number or support route you already trust. Follow normal approval processes even when someone claims the issue is urgent. One-time codes are intended for the person signing in; support staff should not need you to read them aloud. Report attempts using the approved channel.'],
    question: 'A caller says they are from IT and asks you to approve an MFA prompt to stop a suspected attack. What is safest?',
    options: ['Approve it, then ask for a ticket number.', 'Send the caller a screenshot of the prompt.', 'Decline the request and contact IT using the organisation’s known support channel.', 'Approve it if the caller knows your department.'], answerIndex: 2,
    explanation: 'Decline sign-ins you did not initiate and verify the situation through a trusted support channel.',
  },
  'safe-downloads': {
    title: 'Install software through trusted sources',
    notes: ['Malicious downloads often imitate updates, document viewers, or security tools. A browser pop-up cannot be trusted to update the browser that displayed it. Unexpected prompts to run files, enable macros, install certificates, or disable antivirus protection are warning signs. A familiar logo or polished page does not establish that a download is authentic.', 'Close the pop-up without interacting with it. Use the software’s built-in update feature, the operating system app store, or the publisher’s verified website. Keep security tools enabled. If an unexpected file arrived from a colleague, confirm it using a separate known channel before opening it and use the organisation’s reporting process if it remains suspicious.'],
    question: 'A document site says you need a special viewer to open a file and offers an installer. What should you do?',
    options: ['Install it if the document looks work-related.', 'Ask the sender to send the installer through email instead.', 'Disable device protection temporarily if installation is blocked.', 'Get any needed software from its official publisher or approved app store, and verify the file with the sender.'], answerIndex: 3,
    explanation: 'Use an approved source and verify unexpected files instead of installing software from an unfamiliar page.',
  },
  'public-wifi': {
    title: 'Choose safer public connections',
    notes: ['Anyone nearby can create a Wi-Fi network with a name that resembles a café, hotel, or airport network. A strong signal or the word “secure” does not prove who operates it. Confirm the exact network name directly with venue staff. Avoid installing a certificate or profile simply because a captive portal requests it; verify unusual requirements first.', 'For banking, payroll, or other sensitive tasks, use mobile data or a trusted connection when possible. Turn off automatic joining of unknown networks and keep your device and browser updated. A VPN may protect traffic between your device and the VPN service, but it does not make a fake website safe or replace checking the address and sign-in request.'],
    question: 'The café confirms its network name, but you need to approve a payroll transfer. What is the safer choice?',
    options: ['Use the café Wi-Fi because staff confirmed the name.', 'Wait until you can use mobile data or another trusted connection for the sensitive task.', 'Ask a nearby customer to share their hotspot password.', 'Ignore any browser security warnings while connected.'], answerIndex: 1,
    explanation: 'A verified public network is still shared; use a trusted connection for sensitive account activity when practical.',
  },
  'network-traffic': {
    title: 'Investigate unusual network activity',
    notes: ['An unusual transfer is an indicator to investigate, not proof of data theft. Backups, software deployments, research tasks, and approved file transfers can produce unusual traffic. Confirm what asset was involved, the destination, time, volume, and whether a change or scheduled job explains the event.', 'Preserve relevant logs and escalate through the security process. Avoid deleting evidence or taking broad disruptive action without authority. If evidence suggests ongoing harm, follow the incident plan for proportionate containment while the responsible team investigates. Record what you observed and distinguish facts from assumptions.'],
    question: 'The workstation owner confirms no approved transfer was scheduled. What should happen next?',
    options: ['Delete the network logs to protect the owner’s privacy.', 'Shut down every device on the network.', 'Preserve the relevant evidence and escalate the workstation and destination for security investigation.', 'Ignore the transfer until the next monthly review.'], answerIndex: 2,
    explanation: 'Preserving evidence and escalating the specific signal supports a timely, proportionate investigation.',
  },
  'ransomware-response': {
    title: 'Contain suspected ransomware safely',
    notes: ['Ransomware can encrypt files and spread through shared storage or compromised accounts. A ransom note is a serious signal, but responders still need to preserve evidence and understand the scope. Do not connect backup drives, run improvised cleanup tools, delete messages, or reboot systems unless the incident plan or response team instructs you to.', 'Follow the organisation’s incident instructions to isolate affected devices or connections, then notify IT/security immediately. Keep unaffected systems separate. The security team coordinates containment, evidence handling, recovery, and any external reporting. Payment does not guarantee recovery and must never be an individual decision.'],
    question: 'A second workstation in the same office begins showing changed file names. What should you do?',
    options: ['Follow the incident plan to isolate affected devices and notify the response team immediately.', 'Connect a backup drive to both workstations.', 'Delete the files with changed names.', 'Restart the office network equipment without telling IT.'], answerIndex: 0,
    explanation: 'Treat the spread as an active incident: follow containment instructions and escalate promptly.',
  },
  'cloud-storage': {
    title: 'Limit exposure in cloud storage',
    notes: ['Cloud sharing settings can expose files to anyone with a link or to the public internet. A hard-to-guess link is not an access control. Restrict access to approved accounts and groups, and use least privilege: people should only receive the access needed for their task. Check inherited permissions and external sharing settings as well as the folder’s main setting.', 'If sensitive data was exposed, restrict further access promptly, preserve available audit records, and notify the service owner and security/privacy team. Do not quietly delete the folder or assume that changing the link tells you who accessed it. The responsible team can assess what data was involved and follow the organisation’s incident process.'],
    question: 'After disabling public access, what is the next important step?',
    options: ['Delete every audit record so the link cannot be found.', 'Assume no one viewed it because the link was not posted publicly.', 'Create a new public link for the intended team.', 'Preserve access logs and report the possible exposure to the owner and security/privacy team.'], answerIndex: 3,
    explanation: 'Containment limits ongoing exposure; logs and prompt reporting help assess the possible impact.',
  },
  'web-access-control': {
    title: 'Enforce authorization on every request',
    notes: ['Authentication establishes which account is signed in. Authorization decides whether that account may access a particular record or action. A web application must enforce authorization on the server for every request. Hiding buttons, changing URLs in the browser, or using unpredictable record numbers does not replace a server-side permission check.', 'When you find a possible access-control flaw in an authorised test, stop after confirming the minimum evidence. Do not browse other people’s records or expand the test beyond its scope. Report the affected endpoint and a safe reproduction through the approved channel. Developers should check ownership and role permissions on the server and review logs for possible prior access.'],
    question: 'A developer proposes hiding the record ID in the page. What control actually prevents cross-account access?',
    options: ['Use longer record numbers.', 'Check on the server for every request that the signed-in account is authorized to access that record.', 'Disable browser developer tools.', 'Add a warning that users must not change the URL.'], answerIndex: 1,
    explanation: 'Only server-side authorization can reliably enforce which records an account may access.',
  },
  'alert-triage': {
    title: 'Prioritize alerts using context and impact',
    notes: ['An alert is a signal generated by a rule or sensor; it is not automatically proof of compromise. Triage considers confidence, asset importance, exposure, time, and related events. Multiple linked events can make a stronger signal than one isolated event. Privileged accounts, successful unfamiliar sign-ins, and unexpected MFA prompts deserve careful attention.', 'Preserve the event details, validate the timeline, and follow escalation procedures. Focus first on credible signs of active compromise or high potential impact. Do not close alerts simply because no user has complained, and avoid broad containment until the response team has enough context or the incident plan requires it.'],
    question: 'Which evidence most increases concern about the administrator account?',
    options: ['A single blocked internet scan.', 'A scheduled software update.', 'Repeated unexpected MFA prompts followed by a successful sign-in from an unfamiliar location.', 'A low-priority alert with no matching events.'], answerIndex: 2,
    explanation: 'The sequence of prompts followed by an unfamiliar successful privileged sign-in is a high-priority signal.',
  },
  'data-disclosure': {
    title: 'Respond promptly to accidental disclosure',
    notes: ['A message sent to the wrong recipient may expose personal or confidential information even if the sender intended no harm. Deleting the sent copy does not remove a recipient’s copy, and a recall feature may not work. Do not conceal the incident or ask a recipient to forward the data to a personal account.', 'Report the facts promptly through the privacy/security incident process: what information was sent, when, to whom, and what containment has already been attempted. Preserve relevant messages and follow instructions about contacting the recipient or securing access. The designated team assesses the risk and any required response; the sender should not decide alone that the event is harmless.'],
    question: 'The recipient replies that they have not opened the attachment. What should the sender do?',
    options: ['Still report the incident promptly and follow instructions for containment and recipient contact.', 'Delete the message and close the issue because it was not opened.', 'Send the file again to the correct person before reporting.', 'Ask the recipient to copy it to a personal account for safekeeping.'], answerIndex: 0,
    explanation: 'Prompt reporting is still needed so the responsible team can assess and document the disclosure.',
  },
  'insider-risk': {
    title: 'Review insider-risk signals fairly',
    notes: ['Unusual activity can have a legitimate explanation, such as an approved handover, backup, or project deadline. A monitoring alert does not prove malicious intent. Avoid public accusations or informal searches of a person’s devices. Investigations should be authorised, limited to a business need, and handled discreetly with appropriate security, management, privacy, or HR involvement.', 'Preserve relevant logs, verify the stated business task and its approval, and follow the organisation’s insider-risk procedure. Apply controls proportionately and document decisions. If a genuine data-loss risk is confirmed, authorised teams can take action while protecting evidence and treating the person fairly.'],
    question: 'The manager confirms a handover but cannot find an approved export request. What is the best next step?',
    options: ['Publicly warn coworkers that the employee may be stealing data.', 'Erase the employee’s files immediately.', 'Ignore the alert because the manager mentioned a handover.', 'Preserve the evidence and ask the authorised security/management process to verify the request discreetly.'], answerIndex: 3,
    explanation: 'Verify the business context through an authorised, evidence-based process without assuming intent.',
  },
  'patch-priority': {
    title: 'Prioritize vulnerabilities by real-world risk',
    notes: ['A vulnerability score is one input, not a complete priority decision. Risk depends on whether a system is exposed, whether exploitation is active or practical, what the system does, what data it holds, and what controls reduce the likelihood or impact. A lower-scored weakness on an exposed production service may need attention before a higher score on an isolated test machine.', 'Use approved mitigations and change controls. Coordinate a tested patch or temporary risk reduction, verify the result, and prepare a rollback plan where needed. Record why the item was prioritized so the choice can be reviewed as conditions change.'],
    question: 'A patch for the exposed server needs a maintenance window. What should the team do meanwhile?',
    options: ['Ignore the issue until the window is available.', 'Apply an approved mitigation to reduce exposure, then patch and verify through change control.', 'Patch the isolated test machine only because its score is higher.', 'Disable all production services indefinitely.'], answerIndex: 1,
    explanation: 'Reduce immediate exposure with an approved mitigation and complete a controlled, verified patch.',
  },
  'supplier-access': {
    title: 'Grant suppliers least-privilege access',
    notes: ['Third-party access can introduce risk because a supplier account may reach organisational systems or data. Confirm the business purpose, named owner, approved supplier, security requirements, and specific systems needed before access is granted. A deadline or support request does not replace authorization.', 'Use an attributable named account rather than a shared password. Grant only the minimum permissions needed, set an expiry or review point, use approved authentication, and monitor access according to policy. Remove access when the work ends and review any data or credentials the supplier could have reached.'],
    question: 'The supplier says a shared admin account is needed for a one-hour task. What is safest?',
    options: ['Give the shared password and rotate it next month.', 'Let the supplier use an employee’s account while they are away.', 'Verify approval and task scope, then provision named, limited, time-bound access if authorized.', 'Create a permanent admin account to avoid repeat requests.'], answerIndex: 2,
    explanation: 'Supplier access should be approved, attributable, least-privilege, and limited to the required time.',
  },
  'mobile-permissions': {
    title: 'Limit mobile app permissions',
    notes: ['Mobile permissions control access to information and hardware such as contacts, location, microphone, camera, and messages. An app should request permissions that match its function. A flashlight has no obvious need to read contacts or precise location. Being listed in an app store does not mean every permission request is necessary or safe.', 'Deny unrelated permissions and use a trusted alternative if an app refuses to work without them. Review permissions periodically and remove access that is no longer needed. Install apps from official stores, keep the operating system updated, and check the publisher. On work devices, follow the organisation’s approved application and device-management policy.'],
    question: 'A calculator app requests microphone access to calculate simple sums. What is appropriate?',
    options: ['Grant it because the app asks during setup.', 'Deny the unrelated permission and choose a trusted alternative if it is required.', 'Grant it and review the request after a year.', 'Use a coworker’s phone so the app can access their microphone.'], answerIndex: 1,
    explanation: 'Permissions should match the feature; deny unrelated access and use an appropriate alternative.',
  },
  'ai-confidential-prompt': {
    title: 'Protect sensitive data when using AI',
    notes: ['Information entered into an AI service may be processed or retained according to that provider’s settings and terms. A public tool should not receive confidential customer, employee, or incident data unless the organisation has approved it for that information. Removing a name alone may not de-identify a report if account numbers, dates, locations, or unique details remain.', 'Use an approved protected tool or a permitted, properly de-identified summary. Minimize the data sent and follow organisational rules. AI output can be inaccurate, incomplete, or fabricated, so verify facts, citations, calculations, and recommendations against trusted sources before relying on it. Do not treat a request to “keep it secret” as a security control.'],
    question: 'An approved AI tool is available, but it only needs a short extract from the report. What is the safer approach?',
    options: ['Paste the entire report to improve the answer.', 'Use the public tool because the customer name is removed.', 'Include account numbers so the answer is more precise.', 'Use the approved tool, minimize the information shared, and verify its output before using it.'], answerIndex: 3,
    explanation: 'Use an approved service, share only necessary data, and independently verify the generated result.',
  },
  'usb-device': {
    title: 'Handle unknown removable media safely',
    notes: ['A label such as “Payroll” can be added by anyone and does not establish who owns a USB drive. Removable media can contain malicious files or exploit vulnerabilities when connected. Even viewing the directory or plugging it in “just to check” may expose a device. Personal laptops are not a safe testing environment either.', 'Do not connect unknown media to work or personal equipment. Give it to the authorised IT/security team and follow their handling process. They can use an isolated, controlled environment if examination is necessary. If a drive was already connected, report that promptly and provide the device and time details rather than attempting improvised cleanup.'],
    question: 'A found USB drive is labeled with the owner’s name. What should you do?',
    options: ['Hand it to IT/security without plugging it in so they can verify and handle it safely.', 'Check the files on your personal laptop.', 'Plug it into a work computer but do not open any files.', 'Leave it in a public area for the owner to find.'], answerIndex: 0,
    explanation: 'A label does not make unknown media safe; let the authorised team handle it without connecting it.',
  },
  'lost-laptop': {
    title: 'Report lost work devices quickly',
    notes: ['A lost laptop may contain local files, saved sessions, cached credentials, or access to work services. Encryption and screen locks reduce exposure but do not remove the need to report the loss. Delaying while searching can give an unauthorized person more time to use the device or an active session.', 'Notify IT/security through the approved incident channel promptly. Provide the device identifier, last known location and time, and accounts or services used. Authorized teams can revoke sessions, disable credentials, use approved device controls, and assess data exposure. Do not post passwords or use personal tracking tools to access the device.'],
    question: 'After reporting a lost laptop, what should the user avoid doing?',
    options: ['Providing the device identifier to IT.', 'Changing credentials when directed by the response team.', 'Posting account passwords online to ask the finder to return it.', 'Sharing the last known location with IT/security.'], answerIndex: 2,
    explanation: 'Never publish credentials; let authorized teams protect accounts and use approved device controls.',
  },
  'recovery-check': {
    title: 'Restore from verified backups',
    notes: ['Backups support recovery only if they are available, intact, and not affected by the same compromise. A recent backup may contain malware or attacker changes. Before restoring, follow the incident and recovery plans, confirm containment, and validate the backup in an isolated environment. Do not reconnect a restored system until required security checks are complete.', 'The recovery team should verify data integrity, patching, credentials, monitoring, and business-owner acceptance before returning service to production. Keep a record of the selected recovery point and checks performed. Test backups regularly so people know how long restoration takes and which dependencies must be recovered first.'],
    question: 'A backup passes an isolated malware scan. What should happen before it is reconnected to production?',
    options: ['Disable monitoring to avoid false alarms.', 'Restore under the recovery plan, verify security controls and service integrity, then reconnect with approval.', 'Connect it immediately without checking credentials or patches.', 'Replace it with a personal cloud copy.'], answerIndex: 1,
    explanation: 'Validate the recovery and security controls under the plan before reconnecting the restored system.',
  },
  'access-review': {
    title: 'Remove access when the work relationship ends',
    notes: ['Accounts and permissions should exist only while there is an approved business need. Contractors may have access to folders, dashboards, cloud services, API keys, or shared groups beyond the system that first comes to mind. Offboarding should identify these dependencies and remove or transfer access in a controlled way.', 'Confirm ownership and business continuity needs with the responsible service owner, then disable the account and revoke permissions promptly through the approved process. Review active sessions, tokens, shared credentials, and recovery methods as policy requires. Do not leave an account active indefinitely “just in case,” and do not let the departing user decide what access remains.'],
    question: 'A former contractor account is disabled, but an API token created by it remains active. What should the owner do?',
    options: ['Leave the token until the next annual review.', 'Ask the contractor to keep the token safe.', 'Change the contractor’s display name.', 'Revoke or rotate the token through the approved process and verify dependent services continue safely.'], answerIndex: 3,
    explanation: 'Offboarding must include active credentials and tokens, not only the visible user account.',
  },
};

export function getScenarioRemediation(challenge) {
  const content = remediationByChallenge[challenge.id];
  if (content) return content;
  const options = [
    `Follow the approved process: ${challenge.learningObjective}`,
    'Act quickly without verifying the request or its potential impact.',
    'Share credentials or confidential information to save time.',
    'Ignore the issue and do not report it.',
  ];
  const answerIndex = [...challenge.id].reduce((value, character) => value + character.charCodeAt(0), 0) % options.length;
  [options[0], options[answerIndex]] = [options[answerIndex], options[0]];
  return {
    title: `Apply ${challenge.topic} safely`,
    notes: [challenge.learningObjective, ...(challenge.briefing ?? []), challenge.explanation],
    question: `In a related ${challenge.topic} situation, which response best applies the learning objective?`,
    options,
    answerIndex,
    explanation: challenge.explanation,
  };
}
