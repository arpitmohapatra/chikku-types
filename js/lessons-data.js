// Chikku Car Typing — lesson curriculum, matching typing.com's "Beginner" course lesson order.
// Cumulative key sets: each lesson's drills only use keys introduced by that lesson or any earlier
// one (space from lesson 1 on; review/wrap-up/assessment lessons introduce no new keys).
const LEVELS = [
  {
    id: 'l1',
    title: 'J, F, and Space',
    keys: ['J', 'F', 'Space'],
    drills: [
      'jjj fff jjj fff jjj fff',
      'jf jf fj fj jf fj',
      'jjf ffj jfj fjf jjf ffj',
      'jf fj jjf ffj jfjf fjfj jjff ffjj',
    ],
  },
  {
    id: 'l2',
    title: 'U, R, and K Keys',
    keys: ['U', 'R', 'K'],
    drills: [
      'uuu rrr kkk uuu rrr kkk',
      'ur ur uk uk kr kr ur uk',
      'fur fur kur ruk furk kruf',
      'fur juk kuf ruf fur juk kuf ruf',
    ],
  },
  {
    id: 'l3',
    title: 'D, E, and I Keys',
    keys: ['D', 'E', 'I'],
    drills: [
      'ddd eee iii ddd eee iii',
      'de de ei ei id id de ei',
      'kid rid did fire ride dike',
      'kid rid did fire ride dike fried dried',
    ],
  },
  {
    id: 'l4',
    title: 'C, G, and N Keys',
    keys: ['C', 'G', 'N'],
    drills: [
      'ccc ggg nnn ccc ggg nnn',
      'cg cg gn gn nc nc cg gn',
      'grin ring nice dice rice dine fine',
      'grin ring nice dice rice dine fine cringe grind urge',
    ],
  },
  {
    id: 'l5',
    title: 'Beginner Review 1',
    keys: ['Review'],
    drills: [
      'jf ur ei cg jf ur ei cg',
      'fur kid ring dice fine curd',
      'grin dine nice ride fire nine',
      'i dine in fire kid ring nice dice grin fine curd',
    ],
  },
  {
    id: 'l6',
    title: 'T, S, and L Keys',
    keys: ['T', 'S', 'L'],
    drills: [
      'ttt sss lll ttt sss lll',
      'ts ts sl sl lt lt ts sl',
      'list silt tilt turf true trick curl girl',
      'girls curl list silt trick true turf tilt',
    ],
  },
  {
    id: 'l7',
    title: 'O, B, and A Keys',
    keys: ['O', 'B', 'A'],
    drills: [
      'ooo bbb aaa ooo bbb aaa',
      'ob ob ba ba ao ao ob ba',
      'a cab a boat a grab a board',
      'read a book about a boat a girl can go and grab a cab',
    ],
  },
  {
    id: 'l8',
    title: 'V, H, and M Keys',
    keys: ['V', 'H', 'M'],
    drills: [
      'vvv hhh mmm vvv hhh mmm',
      'vh vh hm hm mv mv vh hm',
      'the home have much them that this',
      'the girl can have much fun at home that book is the best gift',
    ],
  },
  {
    id: 'l9',
    title: 'Period and Comma',
    keys: ['.', ','],
    drills: [
      '. . . , , , . , . ,',
      'hi, there. i am fine, thanks.',
      'good, this is fun. i like it, a lot.',
      'hi, there. i am fine, thanks. this is fun, and i like it a lot.',
    ],
  },
  {
    id: 'l10',
    title: 'Beginner Review 2',
    keys: ['Review'],
    drills: [
      'the cab, the boat, and the home.',
      'a cat sat, a dog ran.',
      'this is the best trick i have seen.',
      'i had fun at the cabin. the girls read a book, and the boat is fine.',
    ],
  },
  {
    id: 'l11',
    title: 'W, X, and ; Keys',
    keys: ['W', 'X', ';'],
    drills: [
      'www xxx ;;; www xxx ;;;',
      'wx wx x; x; ;w ;w wx x;',
      'wax box mix fix next know; with new now',
      'i know the next box; i can fix it with a new trick; wax the car.',
    ],
  },
  {
    id: 'l12',
    title: 'Q, Y, and P Keys',
    keys: ['Q', 'Y', 'P'],
    drills: [
      'qqq yyy ppp qqq yyy ppp',
      'qy qy yp yp pq pq qy yp',
      'play type pay yes you quick happy',
      'yes, you can type quick and play; i am very happy today.',
    ],
  },
  {
    id: 'l13',
    title: 'Z and Enter Keys',
    keys: ['Z', 'Enter'],
    drills: [
      'zap zip zap zip\nzap zip zap zip',
      'buzz size prize quiz\nbuzz size prize quiz',
      'the zoo has a buzz\ni win a big prize',
      'the zoo has a buzz.\ni can win a big prize.\nquiz me now, i am ready.',
    ],
  },
  {
    id: 'l14',
    title: 'Beginner Wrap-up',
    keys: ['All Keys'],
    drills: [
      'the quick fox can jump. a lazy dog will nap.',
      'she will read a book by the bay. he can fix a car with ease.',
      'we type fast and have fun each day. our team can win this quiz easily.',
      'you have learned every key on this keyboard. now you can type quick, smart, and strong. get ready for your final test!',
    ],
  },
  {
    id: 'l15',
    title: 'Beginner Assessment',
    keys: ['Timed Test'],
    isFinal: true,
    drills: [
      'the quick brown fox jumps over the lazy dog.',
      'pack my box with five dozen liquor jugs.',
      "chikku, are you ready? let's finish this race, 1 - 2 - 3, go!",
      'chikku is now the fastest typist in the whole world! congratulations, champion!',
    ],
  },
];
