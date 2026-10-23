import { AgentPersona, NagCadence, UrgencyLevel } from '../types';

export function parseCadenceMs(cadence: NagCadence, customMinutes?: number): number {
  switch (cadence) {
    case '1m':
      return 60 * 1000;
    case '2m':
      return 2 * 60 * 1000;
    case '5m':
      return 5 * 60 * 1000;
    case '10m':
      return 10 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case 'escalating':
      // Dynamically handled during check
      return 60 * 1000;
    default:
      return (customMinutes || 5) * 60 * 1000;
  }
}

export function calculateEscalatedCadenceMs(reminderCount: number): number {
  if (reminderCount <= 1) return 5 * 60 * 1000; // 5 min
  if (reminderCount <= 3) return 3 * 60 * 1000; // 3 min
  if (reminderCount <= 6) return 1.5 * 60 * 1000; // 90 sec
  return 60 * 1000; // 1 min relentless
}

export function determineUrgencyLevel(
  overdueMinutes: number,
  reminderCount: number
): UrgencyLevel {
  if (reminderCount >= 8 || overdueMinutes >= 60) return 'relentless';
  if (reminderCount >= 4 || overdueMinutes >= 20) return 'urgent';
  if (reminderCount >= 2 || overdueMinutes >= 5) return 'firm';
  return 'gentle';
}

const PERSONA_NAG_LIBRARY: Record<
  AgentPersona,
  Record<UrgencyLevel, string[]>
> = {
  drill_sergeant: {
    gentle: [
      'Attention! Task "{title}" is now due. Drop what you are doing and take care of it!',
      'Listen up! "{title}" needs your boots on the ground right now.',
    ],
    firm: [
      'Zero excuses! "{title}" has been waiting for {minutes} minutes! Execute now!',
      'You are falling behind schedule on "{title}". Get moving, soldier!',
    ],
    urgent: [
      'Defcon 2! "{title}" is severely overdue! Stop scrolling and knock this out right now!',
      'Sounding the alarm! "{title}" is completely neglected. Do it and report back marked done!',
    ],
    relentless: [
      'CODE RED! I will not stop until "{title}" is marked DONE! Hands on keyboard, soldier!',
      'Maximum pressure! You cannot escape "{title}". Mark it done or hear my sirens all day!',
    ],
  },
  assertive_assistant: {
    gentle: [
      'Pardon the interruption, but "{title}" is currently due on your agenda.',
      'Checking in regarding "{title}". Please confirm once you have completed it.',
    ],
    firm: [
      '"{title}" is now {minutes} minutes overdue. Please address this to protect your schedule.',
      'Prioritizing "{title}". I will continue reminding you every few minutes until resolved.',
    ],
    urgent: [
      'Urgent reminder: "{title}" requires your immediate attention before other tasks.',
      'This is your {count}th alert for "{title}". Let us finish this now so we can move forward.',
    ],
    relentless: [
      'Critical hold: All pending items are blocked on "{title}". Please mark it done immediately.',
      'Persistent alert: "{title}" remains incomplete. I am holding this reminder open.',
    ],
  },
  supportive_coach: {
    gentle: [
      'Hey champion! Time for "{title}". You got this—let us build some momentum!',
      'Ready to tackle "{title}"? Give it just 2 minutes of focus right now.',
    ],
    firm: [
      'Still here cheering for you! "{title}" is {minutes} minutes overdue. Let us cross the finish line.',
      'Remember how good it feels to check off "{title}"? Let us knock it out together.',
    ],
    urgent: [
      'Do not let "{title}" weigh on your mind. Just take the very first step right now!',
      'You have snoozed or delayed "{title}" {count} times. You are stronger than procrastination!',
    ],
    relentless: [
      'I believe in you too much to let "{title}" slide. Let us finish it right this second!',
      'Total focus mode! Knock out "{title}" now and celebrate the win.',
    ],
  },
  witty_roaster: {
    gentle: [
      'Knock knock. Who is there? It is "{title}", your long-lost unfinished obligation.',
      'Procrastination called—it said you are doing great with "{title}", but it is due.',
    ],
    firm: [
      '"{title}" has been aging like fine cheese for {minutes} minutes now. Eat it.',
      'Are you waiting for a planetary alignment, or are you actually going to do "{title}"?',
    ],
    urgent: [
      'I see you avoiding "{title}". I am an AI, I don\'t sleep, and I don\'t get tired of nagging.',
      'That is reminder #{count} for "{title}". Should I put it in your will?',
    ],
    relentless: [
      'At this rate, the sun will explode before "{title}" gets marked done. DO IT NOW.',
      'I am literally ringing until you click that checkmark on "{title}". Your move.',
    ],
  },
  zen_monk: {
    gentle: [
      'A quiet reminder: "{title}" awaits your peaceful presence.',
      'To free the mind from future burden, complete "{title}" in this moment.',
    ],
    firm: [
      'Unfinished deeds like "{title}" ripple through tranquility. Complete it and be free.',
      '"{title}" has waited {minutes} minutes. One single breath and one mindful action.',
    ],
    urgent: [
      'Do not carry the weight of "{title}" any longer. Action dissolves avoidance.',
      'Release yourself from the loop of "{title}". The only way through is completion.',
    ],
    relentless: [
      'Silence cannot return until "{title}" is finished. Bring stillness by marking it done.',
      'The sentinel remains awake until "{title}" reaches its natural conclusion.',
    ],
  },
};

export function getQuickNagMessage(
  title: string,
  persona: AgentPersona,
  urgency: UrgencyLevel,
  overdueMinutes: number,
  reminderCount: number
): string {
  const library = PERSONA_NAG_LIBRARY[persona] || PERSONA_NAG_LIBRARY.assertive_assistant;
  const messages = library[urgency] || library.firm;
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];

  return randomMsg
    .replace('{title}', title)
    .replace('{minutes}', String(Math.max(1, Math.round(overdueMinutes))))
    .replace('{count}', String(reminderCount));
}
