export interface Episode {
  id: string
  title: string | null
  file: string
  duration: string
  date: string
  status: 'queued' | 'transcribing' | 'summarizing' | 'complete' | 'error'
  folderId: string | null
  progress: number
  summary: {
    rundown: string
    details: string[]
    whyItMatters: string
  } | null
  transcript: { time: string; text: string }[]
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
}

export const mockEpisodes: Episode[] = [
  {
    id: 'ep1',
    title: 'How Transformers Changed NLP Forever',
    file: 'lex-fridman-ep412.mp3',
    duration: '2h 14m',
    date: 'May 28, 2026',
    status: 'complete',
    folderId: 'podcasts',
    progress: 100,
    summary: {
      rundown:
        'Lex Fridman interviews Ilya Sutskever about the invention of the transformer architecture, its unexpected scaling properties, and why attention mechanisms turned out to be the key insight that unified language understanding.',
      details: [
        'The original "Attention Is All You Need" paper was rejected from two conferences before acceptance at NeurIPS 2017',
        'Scaling laws were discovered accidentally — a training run left on overnight showed loss decreasing faster than any known curve',
        'Sutskever argues that next-token prediction implicitly requires world models, not just pattern matching',
        'Current models use ~10,000x more compute than the original transformer but the architecture is essentially unchanged',
        'The "bitter lesson" of AI: general methods that leverage computation ultimately win over human-engineered features',
      ],
      whyItMatters:
        "This conversation is essential context for understanding why the AI industry bet everything on scale. Sutskever's argument that prediction equals understanding — if true — means we may already have the architecture for AGI and just need more compute. If wrong, we're headed for a wall that no amount of hardware can fix.",
    },
    transcript: [
      {
        time: '00:00',
        text: 'Welcome to the Lex Fridman podcast. Today I have the pleasure of speaking with Ilya Sutskever...',
      },
      {
        time: '02:34',
        text: "Let me take you back to 2016. We were working on sequence to sequence models and something wasn't clicking...",
      },
      {
        time: '05:12',
        text: 'The key insight was that attention could replace recurrence entirely. That was the controversial claim...',
      },
      {
        time: '08:45',
        text: "When we first saw the scaling curves, honestly, we didn't believe them. We thought there was a bug...",
      },
      {
        time: '12:30',
        text: "People often ask me about consciousness and whether these models truly understand. Here's my perspective...",
      },
    ],
  },
  {
    id: 'ep2',
    title: 'Building a Second Brain: The PARA Method',
    file: 'building-second-brain-ch4.m4a',
    duration: '47m',
    date: 'May 25, 2026',
    status: 'complete',
    folderId: 'books',
    progress: 100,
    summary: {
      rundown:
        'Tiago Forte explains the PARA organizational system — Projects, Areas, Resources, Archives — and argues that organizing information by actionability rather than topic is the key to a useful personal knowledge management system.',
      details: [
        'PARA stands for Projects (active, with deadlines), Areas (ongoing responsibilities), Resources (topics of interest), Archives (inactive items from the other three)',
        'The "slow burn" approach: collect notes over weeks/months before a project needs them, rather than doing all research at once',
        'Forte recommends no more than 12 active notes in any folder — the "dozen rule" forces prioritization',
        'Progressive summarization: highlight in layers (bold → highlight → executive summary) so future-you can scan at the right depth',
      ],
      whyItMatters:
        'PARA gives a concrete framework for the folder structure in knowledge tools like PodCapture itself. The "actionability over topic" principle challenges the instinct to organize by subject — instead, what are you working on right now?',
    },
    transcript: [
      {
        time: '00:00',
        text: 'Chapter four. The PARA method. Let me explain why I think most organizational systems fail...',
      },
      {
        time: '03:15',
        text: 'Projects are the most important category. A project has a deadline and a clear outcome...',
      },
      {
        time: '07:22',
        text: 'Areas are different. These are ongoing responsibilities with a standard to maintain...',
      },
    ],
  },
  {
    id: 'ep3',
    title: 'The Psychology of Money: Compounding and Patience',
    file: 'psychology-of-money-morgan-housel.mp3',
    duration: '1h 12m',
    date: 'May 20, 2026',
    status: 'complete',
    folderId: 'podcasts',
    progress: 100,
    summary: {
      rundown:
        'Morgan Housel argues that financial success is more about behavior than knowledge — specifically, the ability to do nothing and let compounding work over decades is the single most underrated skill in wealth building.',
      details: [
        "Warren Buffett's net worth is 97% attributable to investing after age 65 — the power of compounding requires extreme patience",
        'The highest-earning hedge fund managers underperform buy-and-hold index investors over 30-year periods due to fees and timing errors',
        'Housel distinguishes "getting wealthy" (optimism, risk-taking) from "staying wealthy" (paranoia, frugality) — they require opposite mindsets',
        'Tail events drive everything: the best 50 trading days in a 40-year period account for virtually all market gains',
      ],
      whyItMatters:
        'The core message — that temperament beats intelligence in finance — applies broadly to any domain where compounding effects exist, including knowledge work. The parallel to building a knowledge base is direct: small consistent deposits of learning compound into expertise over years.',
    },
    transcript: [
      {
        time: '00:00',
        text: 'Thank you for having me. I want to start with a story about Ronald Read...',
      },
      {
        time: '04:10',
        text: 'Ronald Read was a janitor who amassed eight million dollars. How? He simply never sold...',
      },
    ],
  },
  {
    id: 'ep4',
    title: null,
    file: 'team-standup-2026-06-01.mp3',
    duration: '23m',
    date: 'Just now',
    status: 'transcribing',
    folderId: null,
    progress: 45,
    summary: null,
    transcript: [],
  },
  {
    id: 'ep5',
    title: null,
    file: 'client-call-notes.m4a',
    duration: '38m',
    date: 'Just now',
    status: 'queued',
    folderId: null,
    progress: 0,
    summary: null,
    transcript: [],
  },
]

export const mockFolders: Folder[] = [
  { id: 'podcasts', name: 'Podcasts', parentId: null },
  { id: 'books', name: 'Audiobooks', parentId: null },
  { id: 'meetings', name: 'Meetings', parentId: null },
]
