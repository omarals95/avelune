import type { Phase } from '@cyclo/core';
import type { IconName } from './icons';

export interface Article {
  id: string;
  title: string;
  tint: string;
  ink: string;
  icon: IconName;
  sensitive?: boolean;
  phases?: (Phase | 'late')[];
  body: string[];
}

/** Original, general-information articles. Not medical advice. */
export const ARTICLES: Article[] = [
  {
    id: 'phases', title: 'Your cycle in four phases', tint: '#E8E1F1', ink: '#765399', icon: 'chart-donut', phases: ['follicular'],
    body: [
      'A cycle starts on the first day of bleeding and ends the day before the next period. Most cycles last somewhere between 21 and 35 days, and a few days of variation from month to month is normal.',
      'Menstrual phase: the uterine lining sheds. Follicular phase: hormones prepare an egg to mature, and energy often rises. Ovulation: an egg is released, usually about two weeks before the next period. Luteal phase: progesterone rises, and if pregnancy does not happen, the lining sheds again.',
      'Tracking a few cycles helps you see your own pattern rather than an average.',
    ],
  },
  {
    id: 'fertile', title: 'Understanding the fertile window', tint: '#DDE9DF', ink: '#426B53', icon: 'flower-outline', phases: ['ovulation', 'follicular'],
    body: [
      'Sperm can survive for several days, while an egg lives for about a day after ovulation. That is why the fertile window is roughly the five days before ovulation plus the day of ovulation itself.',
      'Predictions are based on your past cycles, so they are estimates. Signs such as clear, stretchy discharge, a positive ovulation test, or a sustained rise in basal body temperature can help confirm timing.',
      'Calendar predictions are not a reliable method of contraception.',
    ],
  },
  {
    id: 'bbt', title: 'Basal body temperature, explained', tint: '#F8EBD9', ink: '#7E5418', icon: 'thermometer', phases: ['ovulation', 'luteal'],
    body: [
      'Basal body temperature (BBT) is your temperature at complete rest. Take it as soon as you wake, before getting up, at about the same time each day.',
      'After ovulation, progesterone typically raises BBT by roughly 0.2–0.5 °C, and it usually stays higher until the next period. The rise confirms ovulation has already happened; it does not predict it in advance.',
      'Illness, alcohol, poor sleep and travel can all affect readings. Log them under "Other" so outliers make sense later.',
    ],
  },
  {
    id: 'late', title: 'When your period is late', tint: '#EEE7EE', ink: '#482F49', icon: 'calendar-clock', phases: ['late'],
    body: [
      'A period that arrives a few days later than predicted is common. Stress, illness, travel, changes in sleep or weight, intense exercise and some medications can all shift ovulation, and with it your period.',
      'If there is any chance of pregnancy, a home pregnancy test is most reliable from the day your period was due. If periods stop for several months or become very irregular, it is worth talking to a clinician.',
    ],
  },
  {
    id: 'pms', title: 'PMS: what can help', tint: '#F1E4F3', ink: '#7A4A86', icon: 'spa-outline', phases: ['luteal'],
    body: [
      'Premenstrual symptoms such as bloating, breast tenderness, irritability and cravings appear in the days before a period and ease once it starts.',
      'Regular movement, steady sleep, eating regularly, and cutting back on alcohol and caffeine help many people. Logging symptoms for a few cycles shows whether they follow a pattern.',
      'Symptoms that seriously disrupt daily life deserve a conversation with a clinician; effective treatments exist.',
    ],
  },
  {
    id: 'period-care', title: 'Feeling better during your period', tint: '#F3E3E7', ink: '#A84461', icon: 'water-outline', phases: ['menstrual'],
    body: [
      'Warmth on the lower abdomen, gentle movement and staying hydrated can ease cramps for many people. Over-the-counter pain relief can help too; follow the package instructions.',
      'Very heavy bleeding (soaking through a pad or tampon every hour or two), periods longer than seven days, or pain that stops you from doing normal activities are worth raising with a clinician.',
    ],
  },
  {
    id: 'doctor', title: 'Getting the most from a doctor visit', tint: '#DDE9DF', ink: '#426B53', icon: 'stethoscope',
    body: [
      'Bring the first day of your last few periods, how long they lasted, and any symptoms that worry you. Avelune can generate a summary under Settings → Your data.',
      'Write down your questions in advance and mention any medications or supplements you take.',
    ],
  },
  {
    id: 'sex-cycle', title: 'Desire across the cycle', tint: '#F6E4EA', ink: '#8E3B5A', icon: 'heart-outline', sensitive: true, phases: ['ovulation'],
    body: [
      'Many people notice that desire changes across the cycle, often rising around ovulation and dipping before a period, but patterns differ a lot between individuals.',
      'Logging sex drive for a few cycles can show your own pattern. Unprotected sex during the fertile window carries the highest chance of pregnancy.',
    ],
  },
];

/** Short daily tips shown as cards on the Today screen. Rotates by day. */
export const TIPS: Record<Phase | 'late' | 'none', string[]> = {
  menstrual: ['Warmth and gentle movement can ease cramps', 'Iron-rich foods help replace what you lose', 'Log your flow each day for better predictions'],
  follicular: ['Energy often climbs this week', 'A good week to try something new', 'Log discharge to spot fertile signs'],
  ovulation: ['Fertile signs: clear, stretchy discharge', 'Your BBT rises after ovulation', 'Highest chance of pregnancy this week'],
  luteal: ['PMS may start now: be kind to yourself', 'Cravings are common before a period', 'Steady sleep can soften mood swings'],
  late: ['Stress and travel can delay a period', 'A test is most reliable from the due day', 'Log anything unusual that might explain it'],
  none: ['Log your period to start predictions', 'Predictions improve with every cycle', 'Your data stays on this device'],
};

export interface PregnancyWeek { size: string; baby: string; body: string }

/** Size comparisons and general milestones, weeks 4–40 of gestation (counted from the last period). */
export const PREGNANCY_WEEKS: Record<number, PregnancyWeek> = {
  4: { size: 'a poppy seed', baby: 'The embryo has implanted and the cells that will become the placenta are forming.', body: 'A missed period is often the first sign. Pregnancy tests detect the hormone hCG, which is now rising.' },
  5: { size: 'a sesame seed', baby: 'The neural tube, which becomes the brain and spinal cord, is forming.', body: 'Tiredness, tender breasts and needing to pee more often are common early signs.' },
  6: { size: 'a lentil', baby: 'A heartbeat-like flicker may be visible on an early ultrasound.', body: 'Nausea often starts around now. Small, frequent meals can help.' },
  7: { size: 'a blueberry', baby: 'Small buds that will become arms and legs are growing.', body: 'Many people book their first prenatal appointment around this time.' },
  8: { size: 'a raspberry', baby: 'Fingers and toes are starting to form.', body: 'Your uterus is growing, though it is not visible from the outside yet.' },
  9: { size: 'a cherry', baby: 'All the major organs have begun to develop.', body: 'Mood changes are common as hormones shift.' },
  10: { size: 'a strawberry', baby: 'The embryonic period ends; from here the baby is called a fetus.', body: 'Blood volume is increasing, which can make you feel warmer.' },
  11: { size: 'a fig', baby: 'Bones are beginning to harden.', body: 'Nausea often starts to ease for many people over the coming weeks.' },
  12: { size: 'a lime', baby: 'Reflexes are developing; fingers can open and close.', body: 'Many people have a first-trimester scan around now.' },
  13: { size: 'a lemon', baby: 'Vocal cords are forming.', body: 'The first trimester is coming to an end.' },
  14: { size: 'a peach', baby: 'Facial muscles are working; the baby may squint or frown.', body: 'Welcome to the second trimester. Energy often returns.' },
  15: { size: 'an apple', baby: 'The baby can sense light through closed eyelids.', body: 'Some people notice a stuffy nose; it is a common pregnancy change.' },
  16: { size: 'an avocado', baby: 'Movements are becoming more coordinated.', body: 'You might start to show.' },
  17: { size: 'a pear', baby: 'Fat stores are starting to build up.', body: 'Your centre of gravity is shifting; comfortable shoes help.' },
  18: { size: 'a bell pepper', baby: 'Ears are in their final position and hearing is developing.', body: 'Some people feel first flutters of movement between now and week 22.' },
  19: { size: 'a mango', baby: 'A protective coating called vernix covers the skin.', body: 'Round ligament pain (sharp pains on the sides of the belly) is common.' },
  20: { size: 'a banana', baby: 'Halfway there. The baby swallows and practises digestion.', body: 'A detailed anatomy scan is often offered around now.' },
  21: { size: 'a carrot', baby: 'Movements are getting stronger.', body: 'Your partner may be able to feel kicks soon.' },
  22: { size: 'a papaya', baby: 'Eyebrows and eyelashes are visible.', body: 'Stretch marks may appear; they usually fade after birth.' },
  23: { size: 'a grapefruit', baby: 'The baby may respond to sounds and voices.', body: 'Swollen ankles are common. Put your feet up when you can.' },
  24: { size: 'an ear of corn', baby: 'Lungs are developing the branches that will carry air.', body: 'A glucose test for gestational diabetes is often done between weeks 24 and 28.' },
  25: { size: 'a cauliflower', baby: 'The baby is gaining weight and filling out.', body: 'Heartburn is common as the uterus pushes upwards.' },
  26: { size: 'a lettuce', baby: 'The eyes are beginning to open.', body: 'Trouble sleeping is common; a pillow between the knees can help.' },
  27: { size: 'a head of cabbage', baby: 'Sleep and wake cycles are becoming more regular.', body: 'The second trimester ends this week.' },
  28: { size: 'an aubergine', baby: 'The baby can blink.', body: 'Welcome to the third trimester. Appointments often become more frequent.' },
  29: { size: 'a butternut squash', baby: 'Muscles and lungs keep maturing.', body: 'Practice contractions (Braxton Hicks) may start.' },
  30: { size: 'a large cucumber', baby: 'The brain is growing quickly.', body: 'Shortness of breath is common as space gets tighter.' },
  31: { size: 'a coconut', baby: 'The baby can turn their head from side to side.', body: 'Leaking a little colostrum (early milk) can happen.' },
  32: { size: 'a large potato', baby: 'Toenails and fingernails have formed.', body: 'Many babies settle head-down over the coming weeks.' },
  33: { size: 'a pineapple', baby: 'The skeleton is hardening, although the skull stays soft.', body: 'Frequent urination often returns.' },
  34: { size: 'a cantaloupe', baby: 'The central nervous system is maturing.', body: 'A good time to think about your birth preferences.' },
  35: { size: 'a honeydew melon', baby: 'Most of the baby\'s basic development is complete.', body: 'Rest when you can; tiredness often returns.' },
  36: { size: 'a romaine lettuce', baby: 'The baby is putting on weight quickly.', body: 'Pack a hospital or birth bag if you plan to give birth away from home.' },
  37: { size: 'a bunch of chard', baby: 'The baby is practising breathing movements.', body: 'Early term begins. Learn the signs of labour.' },
  38: { size: 'a leek', baby: 'Organs are ready to work outside the womb.', body: 'Contact your midwife or doctor if movements change or slow down.' },
  39: { size: 'a small watermelon', baby: 'The baby is fully developed and building fat stores.', body: 'Only a small share of babies arrive exactly on the due date.' },
  40: { size: 'a watermelon', baby: 'Due date week.', body: 'If you go past your due date, your care team will talk you through the options.' },
};

export const pregnancyWeek = (w: number): PregnancyWeek =>
  PREGNANCY_WEEKS[Math.min(40, Math.max(4, w))];

export const DISCLAIMER = 'General information only, not medical advice. Talk to a clinician about your own health.';
