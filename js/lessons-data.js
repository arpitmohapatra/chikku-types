// Chikku Car Typing — lesson curriculum.
// Cumulative key sets: each level only uses keys introduced by that level or earlier,
// mirroring standard row-by-row typing pedagogy (home row -> top row -> bottom row -> numbers -> punctuation).
const LEVELS = [
  {
    id: 'l1',
    title: 'Home Row — Left Hand',
    keys: ['a', 's', 'd', 'f'],
    drills: [
      'fff ddd sss aaa fff ddd sss aaa',
      'fd fd sa sa fa fa ds ds fd sa',
      'asdf fdsa asdf fdsa dsaf fasd asdf fdsa',
      'dad sad add fad fads dads adds sad dad fad add fads adds dads',
    ],
  },
  {
    id: 'l2',
    title: 'Home Row — Right Hand',
    keys: ['j', 'k', 'l', ';'],
    drills: [
      'jjj kkk lll ;;; jjj kkk lll ;;;',
      'jk jk lk lk jl jl kl kl jk lk',
      'asdf jkl; fdsa ;lkj asdf jkl;',
      'add all adds ask asks lad lads lass fall falls salad flask flasks',
    ],
  },
  {
    id: 'l3',
    title: 'Home Row — Complete',
    keys: ['g', 'h'],
    drills: [
      'ggg hhh ggg hhh fgh jgh ghg hgh',
      'gh gh hg hg fgh jgh flash glass',
      'half hall dash gash glass shall flash flags salad falls',
      'half hall dash gash glass shall flash flags salad falls gala hash',
    ],
  },
  {
    id: 'l4',
    title: 'Top Row — Left Hand',
    keys: ['q', 'w', 'e', 'r', 't'],
    drills: [
      'qqq www eee rrr ttt qqq www eee',
      'qw we er rt tq wert trwe qwer',
      'the set wet rest hard start great get rate grade',
      'the great set of letters get harder as the tests start; get ready to try harder',
    ],
  },
  {
    id: 'l5',
    title: 'Top Row — Right Hand',
    keys: ['y', 'u', 'i', 'o', 'p'],
    drills: [
      'yyy uuu iii ooo ppp yyy uuu iii',
      'yu ui io op py yuio poiuy',
      'your quiet type quote just point up your top',
      'your typing skills are getting quite good today; keep up the great effort',
    ],
  },
  {
    id: 'l6',
    title: 'Bottom Row — Left Hand',
    keys: ['z', 'x', 'c', 'v', 'b'],
    drills: [
      'zzz xxx ccc vvv bbb zzz xxx ccc',
      'zx xc cv vb bz xzcv bvcx',
      'cab cave crab brave crash black climb dive quick paws',
      'a brave crab can dive into a cave; black cats have quick paws',
    ],
  },
  {
    id: 'l7',
    title: 'Bottom Row — Right Hand',
    keys: ['n', 'm', ',', '.', '/'],
    drills: [
      'nnn mmm ,,, ... /// nnn mmm ,,,',
      'nm n, m. n/ mn,. /.,n',
      'name mine some money moon, noon. fox jumps',
      'the quick brown fox jumps over the lazy dog.',
    ],
  },
  {
    id: 'l8',
    title: 'Number Row',
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    drills: [
      '111 222 333 444 555 666 777 888 999 000',
      '12 34 56 78 90 13 57 24 68 90',
      '2024 1999 3000 4815 1623 42 100 250',
      'my locker number is 4 8 15 16 23 42',
    ],
  },
  {
    id: 'l9',
    title: 'Punctuation & Capitals',
    keys: ['Shift', '!', '?', "'", '"', '-'],
    drills: [
      'Hello! How are you? It is a nice day.',
      "It's a beautiful day. Don't stop now!",
      'Wait... really?! That is amazing news.',
      "Chikku, are you ready? Let's go! It's time to win the race.",
    ],
  },
  {
    id: 'l10',
    title: 'Final Boss — Full Keyboard',
    keys: ['ALL KEYS'],
    isFinal: true,
    drills: [
      'the quick brown fox jumps over the lazy dog.',
      'pack my box with five dozen liquor jugs.',
      "Chikku, are you ready? Let's finish this race, 1 - 2 - 3, go!",
      'Chikku is now the fastest typist in the whole world! Congratulations, champion!',
    ],
  },
];
