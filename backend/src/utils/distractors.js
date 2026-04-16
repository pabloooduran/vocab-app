// Semantic clusters — words in the same cluster are too similar to use as distractors
const SEMANTIC_CLUSTERS = [
  ['loquacious', 'garrulous', 'verbose', 'voluble', 'prolix', 'loquacity'],
  ['taciturn', 'reticent', 'laconic', 'terse', 'diffident', 'retiring'],
  ['avaricious', 'rapacious', 'acquisitive', 'miserly', 'parsimonious', 'penurious', 'niggardly'],
  ['spendthrift', 'prodigal', 'profligate', 'extravagant', 'lavish', 'improvident'],
  ['acrimonious', 'belligerent', 'truculent', 'pugnacious', 'irascible', 'cantankerous', 'contentious'],
  ['placid', 'tranquil', 'serene', 'equanimity', 'imperturbable', 'phlegmatic', 'stolid'],
  ['ephemeral', 'transient', 'evanescent', 'momentary', 'transitory', 'fleeting', 'impermanent'],
  ['specious', 'spurious', 'disingenuous', 'duplicitous', 'mendacity', 'mendacious', 'dissemble'],
  ['candid', 'probity', 'veracity', 'ingenuous', 'artless', 'guileless', 'forthright'],
  ['obsequious', 'sycophantic', 'servile', 'unctuous', 'ingratiating', 'fawning'],
  ['arrogant', 'imperious', 'haughty', 'supercilious', 'disdainful', 'condescending', 'peremptory'],
  ['humble', 'meek', 'submissive', 'deferential', 'unassuming', 'modest'],
  ['verbose', 'redundant', 'tautological', 'pleonastic', 'circumlocution', 'periphrastic'],
  ['succinct', 'concise', 'pithy', 'terse', 'laconic', 'compendious', 'aphoristic'],
  ['capricious', 'mercurial', 'fickle', 'volatile', 'erratic', 'inconstant', 'whimsical'],
  ['steadfast', 'resolute', 'tenacious', 'pertinacious', 'dogged', 'indefatigable', 'dauntless'],
  ['insipid', 'vapid', 'banal', 'trite', 'pedestrian', 'hackneyed', 'jejune', 'prosaic'],
  ['vivid', 'trenchant', 'incisive', 'mordant', 'caustic', 'pungent', 'astringent', 'acerbic'],
  ['benevolent', 'magnanimous', 'munificent', 'philanthropic', 'altruistic', 'beneficent', 'charitable'],
  ['malevolent', 'malicious', 'nefarious', 'iniquitous', 'maleficent', 'pernicious', 'baleful'],
  ['wise', 'sagacious', 'perspicacious', 'astute', 'shrewd', 'discerning', 'judicious', 'prudent'],
  ['stupid', 'obtuse', 'fatuous', 'vacuous', 'asinine', 'inane', 'witless', 'bovine'],
  ['praise', 'encomium', 'panegyric', 'eulogy', 'laud', 'extol', 'acclaim', 'plaudit'],
  ['criticize', 'censure', 'castigate', 'excoriate', 'lambaste', 'upbraid', 'chide', 'berate', 'reprove'],
  ['afraid', 'timid', 'timorous', 'pusillanimous', 'craven', 'cowardly', 'recreant', 'fainthearted'],
  ['brave', 'intrepid', 'valiant', 'audacious', 'dauntless', 'gallant', 'valorous'],
  ['strange', 'bizarre', 'outlandish', 'eccentric', 'aberrant', 'anomalous', 'idiosyncratic'],
  ['ordinary', 'mundane', 'quotidian', 'humdrum', 'prosaic', 'workaday', 'commonplace'],
  ['energetic', 'vigorous', 'dynamic', 'zealous', 'ardent', 'fervent', 'fervid', 'vehement'],
  ['lazy', 'indolent', 'slothful', 'languid', 'listless', 'lethargic', 'torpid', 'inert'],
  ['sad', 'dolorous', 'lugubrious', 'mournful', 'elegiac', 'plaintive', 'woeful', 'disconsolate'],
  ['cheerful', 'ebullient', 'effervescent', 'sanguine', 'buoyant', 'blithe', 'jocund'],
  ['harmful', 'deleterious', 'noxious', 'injurious', 'baneful', 'pernicious', 'detrimental'],
  ['beneficial', 'salubrious', 'salutary', 'wholesome', 'propitious', 'auspicious'],
  ['unclear', 'ambiguous', 'equivocal', 'abstruse', 'recondite', 'arcane', 'esoteric', 'obscure'],
  ['clear', 'pellucid', 'lucid', 'perspicuous', 'transparent', 'manifest', 'patent', 'overt'],
  ['new', 'novel', 'nascent', 'neologism', 'incipient', 'burgeoning', 'emergent'],
  ['old', 'archaic', 'antiquated', 'antediluvian', 'anachronistic', 'obsolete', 'decrepit'],
  ['generous', 'liberal', 'bountiful', 'openhanded', 'magnanimous', 'munificent'],
  ['stingy', 'parsimonious', 'penurious', 'niggardly', 'miserly', 'avaricious', 'closefisted'],
  ['humble', 'modest', 'diffident', 'self-effacing', 'unassuming', 'meek'],
  ['pompous', 'pretentious', 'bombastic', 'grandiose', 'ostentatious', 'fustian', 'turgid'],
  ['angry', 'irate', 'incensed', 'wrathful', 'indignant', 'choleric', 'irascible'],
  ['calm', 'placid', 'serene', 'composed', 'equanimous', 'unflappable', 'impassive'],
  ['thrifty', 'frugal', 'economical', 'sparing', 'austere', 'abstemious'],
  ['abundant', 'copious', 'plentiful', 'profuse', 'prolific', 'teeming', 'lavish'],
  ['scarce', 'meager', 'paltry', 'sparse', 'scant', 'dearth', 'paucity'],
  ['worsen', 'exacerbate', 'aggravate', 'deteriorate', 'vitiate', 'impair'],
  ['improve', 'ameliorate', 'rectify', 'remedy', 'redress', 'alleviate', 'mitigate'],
  ['decrease', 'diminish', 'wane', 'ebb', 'dwindle', 'abate', 'attenuate'],
  ['increase', 'augment', 'amplify', 'magnify', 'burgeon', 'proliferate', 'multiply'],
];

// Build a lookup map: word -> cluster index
const CLUSTER_MAP = new Map();
SEMANTIC_CLUSTERS.forEach((cluster, idx) => {
  cluster.forEach(word => {
    CLUSTER_MAP.set(word.toLowerCase(), idx);
  });
});

function getSynonymSet(word) {
  return new Set((word.synonyms || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

function synonymOverlap(wordA, wordB) {
  const synsA = getSynonymSet(wordA);
  const synsB = getSynonymSet(wordB);
  for (const s of synsA) {
    if (synsB.has(s)) return true;
  }
  return false;
}

function inSameCluster(wordA, wordB) {
  const keyA = wordA.word.toLowerCase();
  const keyB = wordB.word.toLowerCase();
  const clusterA = CLUSTER_MAP.get(keyA);
  const clusterB = CLUSTER_MAP.get(keyB);
  if (clusterA === undefined || clusterB === undefined) return false;
  return clusterA === clusterB;
}

function isAmbiguousDistractor(correct, candidate) {
  if (inSameCluster(correct, candidate)) return true;
  if (synonymOverlap(correct, candidate)) return true;
  // Also check if the candidate's word appears as a synonym of the correct word or vice versa
  const correctSyns = getSynonymSet(correct);
  const candidateSyns = getSynonymSet(candidate);
  if (correctSyns.has(candidate.word.toLowerCase())) return true;
  if (candidateSyns.has(correct.word.toLowerCase())) return true;
  return false;
}

/**
 * Generate 4 distractors for a given correct word from the word pool.
 * Returns array of 4 word objects, or fewer if not enough valid candidates exist.
 */
function generateDistractors(correctWord, wordPool, count = 4) {
  // Shuffle pool first for variety
  const shuffled = [...wordPool].sort(() => Math.random() - 0.5);

  const distractors = [];
  for (const candidate of shuffled) {
    if (candidate.word === correctWord.word) continue;
    if (isAmbiguousDistractor(correctWord, candidate)) continue;
    distractors.push(candidate);
    if (distractors.length >= count) break;
  }

  return distractors;
}

module.exports = { generateDistractors, isAmbiguousDistractor };
