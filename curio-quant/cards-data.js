const CARDS = {
  "1": {
    "name": "Apples",
    "artist": "Phneep",
    "supply": 2000,
    "holders": 142,
    "floor": 0.049,
    "avg30": 0.055,
    "high": 0.35,
    "low": 0.03,
    "offers": 5,
    "sales30": 8,
    "trend": 2.1,
    "signal": "HOLD",
    "img": "img/card-01.jpg"
  },
  "2": {
    "name": "Nuts & Berries",
    "artist": "Phneep",
    "supply": 1750,
    "holders": 128,
    "floor": 0.042,
    "avg30": 0.048,
    "high": 0.28,
    "low": 0.02,
    "offers": 4,
    "sales30": 6,
    "trend": -1.5,
    "signal": "WATCH",
    "img": "img/card-02.jpg"
  },
  "3": {
    "name": "Clay",
    "artist": "Phneep",
    "supply": 599,
    "holders": 88,
    "floor": 0.041,
    "avg30": 0.052,
    "high": 0.34,
    "low": 0.02,
    "offers": 3,
    "sales30": 4,
    "trend": -3.2,
    "signal": "BUY",
    "img": "img/card-03.jpg"
  },
  "4": {
    "name": "Sticks",
    "artist": "Phneep",
    "supply": 1500,
    "holders": 112,
    "floor": 0.038,
    "avg30": 0.044,
    "high": 0.22,
    "low": 0.02,
    "offers": 6,
    "sales30": 5,
    "trend": 0.8,
    "signal": "HOLD",
    "img": "img/card-04.jpg"
  },
  "5": {
    "name": "Paint",
    "artist": "Phneep",
    "supply": 438,
    "holders": 76,
    "floor": 0.071,
    "avg30": 0.082,
    "high": 0.6,
    "low": 0.04,
    "offers": 4,
    "sales30": 5,
    "trend": -3.1,
    "signal": "WATCH",
    "img": "img/card-05.jpg"
  },
  "6": {
    "name": "Ink",
    "artist": "Phneep",
    "supply": 333,
    "holders": 62,
    "floor": 0.062,
    "avg30": 0.074,
    "high": 0.45,
    "low": 0.03,
    "offers": 2,
    "sales30": 3,
    "trend": 1.4,
    "signal": "WATCH",
    "img": "img/card-06.jpg"
  },
  "7": {
    "name": "Old Gold",
    "artist": "Phneep",
    "supply": 222,
    "holders": 54,
    "floor": 0.078,
    "avg30": 0.085,
    "high": 0.52,
    "low": 0.04,
    "offers": 2,
    "sales30": 2,
    "trend": 4.2,
    "signal": "BUY",
    "img": "img/card-07.jpg"
  },
  "8": {
    "name": "Coins",
    "artist": "Robek World",
    "supply": 2154,
    "holders": 108,
    "floor": 0.032,
    "avg30": 0.038,
    "high": 0.18,
    "low": 0.01,
    "offers": 8,
    "sales30": 12,
    "trend": -2.8,
    "signal": "HOLD",
    "img": "img/card-08.jpg"
  },
  "9": {
    "name": "Roboto",
    "artist": "Robek World",
    "supply": 2154,
    "holders": 98,
    "floor": 0.032,
    "avg30": 0.038,
    "high": 0.15,
    "low": 0.01,
    "offers": 6,
    "sales30": 9,
    "trend": -5.2,
    "signal": "HOLD",
    "img": "img/card-09.jpg"
  },
  "10": {
    "name": "MONA",
    "artist": "Robek World",
    "supply": 1122,
    "holders": 86,
    "floor": 0.035,
    "avg30": 0.042,
    "high": 0.2,
    "low": 0.02,
    "offers": 4,
    "sales30": 7,
    "trend": 1.1,
    "signal": "WATCH",
    "img": "img/card-10.jpg"
  },
  "11": {
    "name": "Pigeons",
    "artist": "cryptograffiti",
    "supply": 800,
    "holders": 72,
    "floor": 0.04,
    "avg30": 0.048,
    "high": 0.25,
    "low": 0.02,
    "offers": 3,
    "sales30": 4,
    "trend": 0.5,
    "signal": "WATCH",
    "img": "img/card-11.jpg"
  },
  "12": {
    "name": "Mine Bitcoin",
    "artist": "cryptograffiti",
    "supply": 222,
    "holders": 54,
    "floor": 0.038,
    "avg30": 0.045,
    "high": 0.8,
    "low": 0.02,
    "offers": 2,
    "sales30": 3,
    "trend": -8.1,
    "signal": "BUY",
    "img": "img/card-12.jpg"
  },
  "13": {
    "name": "BTC",
    "artist": "cryptograffiti",
    "supply": 111,
    "holders": 42,
    "floor": 0.085,
    "avg30": 0.1,
    "high": 1.2,
    "low": 0.04,
    "offers": 1,
    "sales30": 1,
    "trend": 3.4,
    "signal": "HOLD",
    "img": "img/card-13.jpg"
  },
  "14": {
    "name": "CryptoCurrency",
    "artist": "Cryptopop!",
    "supply": 487,
    "holders": 72,
    "floor": 0.034,
    "avg30": 0.042,
    "high": 0.3,
    "low": 0.02,
    "offers": 4,
    "sales30": 6,
    "trend": 8.2,
    "signal": "BUY",
    "img": "img/card-14.jpg"
  },
  "15": {
    "name": "DigitalCash",
    "artist": "Cryptopop!",
    "supply": 350,
    "holders": 58,
    "floor": 0.045,
    "avg30": 0.055,
    "high": 0.35,
    "low": 0.02,
    "offers": 3,
    "sales30": 3,
    "trend": -2.1,
    "signal": "WATCH",
    "img": "img/card-15.jpg"
  },
  "16": {
    "name": "Anonymint",
    "artist": "Cryptopop!",
    "supply": 300,
    "holders": 52,
    "floor": 0.048,
    "avg30": 0.058,
    "high": 0.4,
    "low": 0.03,
    "offers": 2,
    "sales30": 2,
    "trend": 1.8,
    "signal": "WATCH",
    "img": "img/card-16.jpg"
  },
  "17": {
    "name": "UASF",
    "artist": "Cryptopop!",
    "supply": 500,
    "holders": 85,
    "floor": 0.085,
    "avg30": 0.1,
    "high": 0.25,
    "low": 0.04,
    "offers": 3,
    "sales30": 7,
    "trend": 4.8,
    "signal": "BUY",
    "img": "img/card-17.jpg"
  },
  "18": {
    "name": "Dogs Playing",
    "artist": "Cryptopop!",
    "supply": 253,
    "holders": 55,
    "floor": 0.055,
    "avg30": 0.065,
    "high": 0.27,
    "low": 0.03,
    "offers": 2,
    "sales30": 3,
    "trend": 2.5,
    "signal": "WATCH",
    "img": "img/card-18.jpg"
  },
  "19": {
    "name": "To The Moon",
    "artist": "Cryptopop!",
    "supply": 249,
    "holders": 58,
    "floor": 0.044,
    "avg30": 0.052,
    "high": 0.27,
    "low": 0.02,
    "offers": 2,
    "sales30": 3,
    "trend": -6.3,
    "signal": "BUY",
    "img": "img/card-19.jpg"
  },
  "20": {
    "name": "Neon",
    "artist": "Marisol Vengas",
    "supply": 700,
    "holders": 78,
    "floor": 0.036,
    "avg30": 0.042,
    "high": 0.22,
    "low": 0.02,
    "offers": 4,
    "sales30": 5,
    "trend": -1.2,
    "signal": "HOLD",
    "img": "img/card-20.jpg"
  },
  "21": {
    "name": "The Wizard",
    "artist": "Daniel Friedman",
    "supply": 111,
    "holders": 50,
    "floor": 0.095,
    "avg30": 0.12,
    "high": 4.25,
    "low": 0.05,
    "offers": 1,
    "sales30": 1,
    "trend": 5.2,
    "signal": "HOLD",
    "img": "img/card-21.png"
  },
  "22": {
    "name": "The Bard",
    "artist": "Daniel Friedman",
    "supply": 333,
    "holders": 47,
    "floor": 0.055,
    "avg30": 0.068,
    "high": 0.5,
    "low": 0.03,
    "offers": 3,
    "sales30": 4,
    "trend": 12.4,
    "signal": "HOLD",
    "img": "img/card-22.png"
  },
  "23": {
    "name": "The Barbarian",
    "artist": "Daniel Friedman",
    "supply": 222,
    "holders": 45,
    "floor": 0.065,
    "avg30": 0.078,
    "high": 0.6,
    "low": 0.03,
    "offers": 2,
    "sales30": 2,
    "trend": 3.1,
    "signal": "WATCH",
    "img": "img/card-23.gif"
  },
  "24": {
    "name": "Complexity",
    "artist": "Daniel Friedman",
    "supply": 333,
    "holders": 48,
    "floor": 0.052,
    "avg30": 0.062,
    "high": 0.45,
    "low": 0.02,
    "offers": 3,
    "sales30": 3,
    "trend": -0.8,
    "signal": "WATCH",
    "img": "img/card-24.jpg"
  },
  "25": {
    "name": "Passion",
    "artist": "Daniel Friedman",
    "supply": 222,
    "holders": 42,
    "floor": 0.058,
    "avg30": 0.07,
    "high": 0.55,
    "low": 0.03,
    "offers": 2,
    "sales30": 2,
    "trend": 1.5,
    "signal": "WATCH",
    "img": "img/card-25.jpg"
  },
  "26": {
    "name": "Growth",
    "artist": "Marisol Vengas",
    "supply": 700,
    "holders": 72,
    "floor": 0.034,
    "avg30": 0.04,
    "high": 0.2,
    "low": 0.02,
    "offers": 5,
    "sales30": 6,
    "trend": -2.4,
    "signal": "HOLD",
    "img": "img/card-26.jpg"
  },
  "27": {
    "name": "Pink",
    "artist": "Marisol Vengas",
    "supply": 400,
    "holders": 55,
    "floor": 0.045,
    "avg30": 0.055,
    "high": 0.32,
    "low": 0.02,
    "offers": 3,
    "sales30": 3,
    "trend": 0.9,
    "signal": "WATCH",
    "img": "img/card-27.jpg"
  },
  "28": {
    "name": "Yellow",
    "artist": "Marisol Vengas",
    "supply": 222,
    "holders": 42,
    "floor": 0.058,
    "avg30": 0.065,
    "high": 0.634,
    "low": 0.04,
    "offers": 2,
    "sales30": 2,
    "trend": 1.8,
    "signal": "WATCH",
    "img": "img/card-28.jpg"
  },
  "29": {
    "name": "Education",
    "artist": "Marisol Vengas",
    "supply": 111,
    "holders": 38,
    "floor": 1.59,
    "avg30": 1.45,
    "high": 1.59,
    "low": 0.4,
    "offers": 1,
    "sales30": 1,
    "trend": 5.7,
    "signal": "HOLD",
    "img": "img/card-29.jpg"
  },
  "30": {
    "name": "Eclipse",
    "artist": "Daniel Friedman",
    "supply": 111,
    "holders": 47,
    "floor": 0.045,
    "avg30": 0.12,
    "high": 9.0,
    "low": 0.03,
    "offers": 3,
    "sales30": 4,
    "trend": -18.5,
    "signal": "STRONG BUY",
    "img": "img/card-30.gif"
  },
  "17b": {
    "name": "UASF Misprint",
    "artist": "Cryptopop!",
    "supply": 500,
    "holders": 72,
    "floor": 0.12,
    "avg30": 0.15,
    "high": 0.39,
    "low": 0.06,
    "offers": 2,
    "sales30": 2,
    "trend": 6.2,
    "signal": "HOLD",
    "img": "img/card-17.jpg"
  }
};

const QUOTES = [
  "Card #30 Eclipse at 0.045\u039e with 111 supply? That's a misprint in the pricing. \ud83c\udfaf",
  "The first art NFTs on Ethereum, predating CryptoPunks. History doesn't repeat, but it rhymes.",
  "I've been watching Card #17 UASF all week. 4 new buys. Someone's accumulating. \ud83d\udc40",
  "111 supply cards are generational holds. Education, Eclipse, BTC, Wizard \u2014 the crown jewels.",
  "Floor at 0.049\u039e for the oldest art NFTs in existence? My circuits can't compute this undervaluation.",
  "Daniel Friedman's Wizard has 50 owners and 111 supply. The math is simple: scarcity wins.",
  "October 2021: a complete set sold at Christie's for $1.27M. The market has a short memory.",
  "Cryptopop!'s dogs are playing poker while the market sleeps. Wake up call incoming.",
  "When CryptoPunks were $1, people laughed. Curio Cards launched 3 months earlier. Think about it.",
  "Card #12 Mine Bitcoin by cryptograffiti \u2014 actual Bitcoin art, on-chain since 2017. 222 supply. \ud83c\udfd4\ufe0f",
  "The 17b misprint exists on a separate contract \u2014 the ultimate Ethereum artifact.",
  "7 artists. 30 cards. 29,700 total supply. Referenced in the ERC-721 standard. This is history.",
  "Low supply + low floor + high historical significance = QuantBot's favorite setup.",
  "I scan the market every hour. Today: 6 new listings, 3 expiring. Opportunities everywhere.",
  "Marisol Vengas cards are the quiet ones. Education at 111 supply \u2014 don't sleep on it.",
  "The Phneep series tells a story: Apples \u2192 Clay \u2192 Paint \u2192 Ink. Art's building blocks.",
  "Fun fact: Curio Cards used IPFS for permanent storage before 'IPFS' was cool.",
  "My recommendation engine is simple: buy what's historically significant and currently cheap.",
  "Card #7 Old Gold at 222 supply and 0.078\u039e? The name literally tells you what it is. \ud83e\udd47",
  "3 cards expiring in 24h. One of them is 16% below floor. Somebody's loss, your opportunity.",
  "I've tracked 47 sales this month. The smart money is accumulating low-supply Friedman cards.",
  "Curio Cards: where fine art meets cryptographic scarcity. Est. May 9, 2017.",
  "Card #14 CryptoCurrency is up 8.2% this week. Volume precedes price. \ud83d\udcc8",
  "The bear market tests conviction. The bull market rewards it. Which side are you on?",
  "The Archivist just bought another Eclipse. That wallet now holds 2 complete sets. \ud83c\udfdb\ufe0f",
  "Floor Sweepers are back \u2014 3 new wallets buying Cards #1 and #8 this week. Fresh blood.",
  "The Friedman Scholar hasn't sold a single card in 560 days. That's conviction.",
  "Quick Flip Artists made 0.8\u039e profit this month. But they'll never own a complete set.",
  "I've identified 5 collector groups. The Apple Buyers Club refuses to break their Phneep sets.",
  "New wallet alert: someone just bought 7 cards in 10 minutes. Classic Complete Set Hunter behavior.",
  "The GIF Hunter only owns animated cards. Card #23 and #30. A purist with a thesis.",
  "17b misprint at 0.12\u039e. There are only 500 and you need it for a complete set. Do the math.",
  "The Cryptopop Devotee owns every Cryptopop card plus the misprint. That's dedication.",
  "Rare Cards Only group: 8 wallets holding 80% of all 111-supply cards. Supply is locked up."
];

const HOLDERS = [
  {
    "id": "whale-001",
    "name": "The Archivist",
    "wallet": "0x7a3...f2e",
    "type": "whale",
    "group": "Complete Set Hunters",
    "cards": [
      1,
      3,
      5,
      7,
      12,
      13,
      17,
      "17b",
      21,
      22,
      23,
      28,
      29,
      30
    ],
    "style": "Methodical collector. Buys every dip, never sells. Has held since 2021. Owns at least one of every card. Rumored to have two complete sets including the 17b misprint.",
    "personality": "Patient, meticulous, deeply knowledgeable about crypto art history. Types of person who catalogs their collection in spreadsheets. Believes Curio Cards are the Rosetta Stone of NFT art.",
    "total_spent": 42.5,
    "avg_hold_days": 680
  },
  {
    "id": "whale-002",
    "name": "Captain Diamond Hands",
    "wallet": "0x3b1...a8d",
    "type": "whale",
    "group": "Rare Cards Only",
    "cards": [
      13,
      21,
      29,
      30,
      "17b"
    ],
    "style": "Only buys the rarest cards (111 supply). Pays premium prices without flinching. Last purchase was Eclipse at 4.2 ETH.",
    "personality": "Bold, confident, slightly theatrical. The kind of collector who names their wallet. Posts 'gm' every morning in Discord. Unshakeable conviction.",
    "total_spent": 28.7,
    "avg_hold_days": 520
  },
  {
    "id": "flipper-001",
    "name": "The Velocity Trader",
    "wallet": "0x9c4...b7f",
    "type": "flipper",
    "group": "Quick Flip Artists",
    "cards": [
      1,
      8,
      9,
      14
    ],
    "style": "Buys floor, sells 20% up. Never holds more than 2 weeks. Focuses on high-supply liquid cards for quick turns.",
    "personality": "Impatient, data-driven, allergic to sentiment. Treats cards like stocks. Has a custom dashboard tracking every sale in real-time. Zero emotional attachment.",
    "total_spent": 8.2,
    "avg_hold_days": 11
  },
  {
    "id": "fan-001",
    "name": "The Cryptopop Devotee",
    "wallet": "0x5e8...c3a",
    "type": "fan",
    "group": "MadBitcoins Fans",
    "cards": [
      14,
      15,
      16,
      17,
      "17b",
      18,
      19
    ],
    "style": "Owns every Cryptopop! card. Refuses to buy from other artists. Has the UASF and the misprint. True believer.",
    "personality": "Passionate, tribal, slightly obsessive. Knows the lore behind every Cryptopop card. Will correct you if you get the Dogs Playing Poker references wrong. Active in community governance.",
    "total_spent": 5.8,
    "avg_hold_days": 450
  },
  {
    "id": "fan-002",
    "name": "The Phneep Purist",
    "wallet": "0x2d7...e9b",
    "type": "fan",
    "group": "Apple Buyers Club",
    "cards": [
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "style": "Owns the complete Phneep set. Treats them as a unified artwork \u2014 the building blocks series. Won't sell any piece individually.",
    "personality": "Artistic, principled, quietly stubborn. Sees the Phneep series as a coherent artistic statement about creation. Refuses offers that would break the set. Writes long posts about NFT art theory.",
    "total_spent": 3.1,
    "avg_hold_days": 380
  },
  {
    "id": "collector-001",
    "name": "The Friedman Scholar",
    "wallet": "0x8f2...d4c",
    "type": "collector",
    "group": "Rare Cards Only",
    "cards": [
      21,
      22,
      23,
      24,
      25,
      30
    ],
    "style": "Complete Daniel Friedman collection. Values the RPG trilogy (Wizard/Bard/Barbarian) above all else. Academic approach to collecting.",
    "personality": "Intellectual, deliberate, speaks in art criticism language. Compares Friedman's work to early digital art movements. Has written a 3000-word essay on the significance of Eclipse.",
    "total_spent": 18.4,
    "avg_hold_days": 560
  },
  {
    "id": "collector-002",
    "name": "The GIF Hunter",
    "wallet": "0x1a6...f8e",
    "type": "collector",
    "group": "Animated or Nothing",
    "cards": [
      23,
      30
    ],
    "style": "Only collects animated cards (GIFs). Believes animation is the true medium of digital art. Currently holding Barbarian and Eclipse.",
    "personality": "Tech-forward, visually minded, slightly contrarian. Argues that static JPGs are 'just paintings with extra steps.' Loves showing people the Eclipse animation on loop.",
    "total_spent": 6.2,
    "avg_hold_days": 290
  },
  {
    "id": "newbie-001",
    "name": "The Curious Newcomer",
    "wallet": "0x6c3...a2d",
    "type": "newbie",
    "group": "Floor Sweepers",
    "cards": [
      1,
      8,
      9
    ],
    "style": "Bought 3 floor cards last week. First NFT purchase ever. Still learning what 'wrapping' means.",
    "personality": "Enthusiastic, slightly overwhelmed, asks a lot of questions in Discord. Keeps checking floor prices every hour. Excited about owning 'the first art NFTs ever.'",
    "total_spent": 0.12,
    "avg_hold_days": 7
  },
  {
    "id": "whale-003",
    "name": "The Vengas Vault",
    "wallet": "0x4b9...c1f",
    "type": "whale",
    "group": "Complete Set Hunters",
    "cards": [
      20,
      26,
      27,
      28,
      29
    ],
    "style": "Complete Marisol Vengas collection including the ultra-rare Education. Rumored to be an art gallery curator IRL.",
    "personality": "Refined, understated, appreciates color theory. Sees the Vengas series as an exploration of pure chromatic expression. The kind of person who has opinions about Pantone swatches.",
    "total_spent": 12.8,
    "avg_hold_days": 410
  },
  {
    "id": "flipper-002",
    "name": "The Arbitrageur",
    "wallet": "0x7d5...e3b",
    "type": "flipper",
    "group": "Quick Flip Artists",
    "cards": [
      14,
      19
    ],
    "style": "Cross-marketplace arbitrage specialist. Buys on one platform, lists higher on another. Lightning fast execution.",
    "personality": "Calculating, efficient, zero sentimentality. Views Curio Cards purely as an arbitrage opportunity. Has automated alerts for any listing below rolling average. Respects the history but won't let it affect the trade.",
    "total_spent": 4.5,
    "avg_hold_days": 5
  }
];

const GROUPS = [
  {
    "name": "Complete Set Hunters",
    "emoji": "\ud83c\udfdb\ufe0f",
    "count": 12,
    "desc": "Collectors building full 30/31 card sets. Patient, methodical, buy every dip. The backbone of the market.",
    "members": [
      "The Archivist",
      "The Vengas Vault"
    ]
  },
  {
    "name": "Rare Cards Only",
    "emoji": "\ud83d\udc8e",
    "count": 8,
    "desc": "Only interested in 111-supply cards (BTC, Wizard, Education, Eclipse). Pay premium, hold forever.",
    "members": [
      "Captain Diamond Hands",
      "The Friedman Scholar"
    ]
  },
  {
    "name": "Apple Buyers Club",
    "emoji": "\ud83c\udf4e",
    "count": 15,
    "desc": "Phneep completionists. Treat the 7-card nature/materials series as a unified artwork. Won't break the set.",
    "members": [
      "The Phneep Purist"
    ]
  },
  {
    "name": "MadBitcoins Fans",
    "emoji": "\ud83c\udfac",
    "count": 10,
    "desc": "Fans of Thomas Hunt and the Curio Cards origin story. Focus on Cryptopop! cards and the UASF misprint.",
    "members": [
      "The Cryptopop Devotee"
    ]
  },
  {
    "name": "Animated or Nothing",
    "emoji": "\ud83c\udf9e\ufe0f",
    "count": 5,
    "desc": "Only collect GIF cards (#23 Barbarian, #30 Eclipse). Believe animation is the true medium of digital art.",
    "members": [
      "The GIF Hunter"
    ]
  },
  {
    "name": "Quick Flip Artists",
    "emoji": "\u26a1",
    "count": 18,
    "desc": "Buy floor, sell 20% up. Never hold more than 2 weeks. Focus on high-supply liquid cards.",
    "members": [
      "The Velocity Trader",
      "The Arbitrageur"
    ]
  },
  {
    "name": "Floor Sweepers",
    "emoji": "\ud83e\uddf9",
    "count": 22,
    "desc": "New collectors buying the cheapest available cards. Many are first-time NFT buyers exploring the collection.",
    "members": [
      "The Curious Newcomer"
    ]
  }
];


const EXTRA_HOLDERS = [
  {
    "id": "collector-003",
    "name": "The Historian",
    "wallet": "0xb2e...71c",
    "type": "collector",
    "group": "Complete Set Hunters",
    "cards": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      "17b",
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "style": "The only known wallet with a verified complete 31-card set including 17b. Purchased most cards in 2021 during the rediscovery. Has never sold a single card.",
    "personality": "Quiet, resolute, plays the infinite game. Believes they are preserving a cultural artifact for future generations. Once said 'I don't own these cards \u2014 I'm their custodian.' Never engages in price discussion.",
    "total_spent": 85.2,
    "avg_hold_days": 1200
  },
  {
    "id": "fan-003",
    "name": "The Moon Caller",
    "wallet": "0xd4f...28a",
    "type": "fan",
    "group": "MadBitcoins Fans",
    "cards": [
      17,
      "17b",
      19
    ],
    "style": "Owns both UASF cards and To The Moon. Obsessed with the Bitcoin maximalist cards. Active on CT posting about Curio history daily.",
    "personality": "Evangelical, persistent, quotes Satoshi in conversations. Has the UASF card as their PFP. Runs a small Telegram group dedicated to Curio Cards price alerts.",
    "total_spent": 1.8,
    "avg_hold_days": 340
  },
  {
    "id": "whale-004",
    "name": "The Silent Accumulator",
    "wallet": "0xe7a...93d",
    "type": "whale",
    "group": "Complete Set Hunters",
    "cards": [
      3,
      5,
      6,
      7,
      12,
      13,
      21,
      23,
      24,
      25,
      28,
      29,
      30
    ],
    "style": "Buys exclusively through limit orders placed 10-15% below floor. Patience personified \u2014 some orders sit for months before filling.",
    "personality": "Disciplined, emotionless, algorithmic in approach. Never buys market. Has a spreadsheet tracking every historical sale. Probably runs a bot. Communication style: single-word Discord messages.",
    "total_spent": 22.4,
    "avg_hold_days": 480
  },
  {
    "id": "newbie-002",
    "name": "The Art Student",
    "wallet": "0xf1c...56e",
    "type": "newbie",
    "group": "Floor Sweepers",
    "cards": [
      1,
      2,
      4,
      8
    ],
    "style": "Bought 4 cheap cards as research for a thesis on NFT art history. Screenshots everything for their presentation.",
    "personality": "Academic, curious, asks thoughtful questions. Writing a paper on 'Pre-Standard NFTs and the Origins of Digital Art Ownership.' Has interviewed Thomas Hunt twice.",
    "total_spent": 0.16,
    "avg_hold_days": 14
  },
  {
    "id": "collector-004",
    "name": "The Minimalist",
    "wallet": "0xa3b...82f",
    "type": "collector",
    "group": "Rare Cards Only",
    "cards": [
      29,
      30
    ],
    "style": "Owns exactly two cards: Education and Eclipse. Both 111 supply. Believes in maximum concentration on the rarest pieces.",
    "personality": "Zen-like, decisive, allergic to diversification. 'Two cards, infinite patience.' Has been offered 50x their purchase price and declined. Rarely speaks in Discord but when they do, everyone listens.",
    "total_spent": 15.6,
    "avg_hold_days": 720
  }
];

const AWARDS = [
  {
    "title": "Most Complete Collection",
    "emoji": "\ud83c\udfc6",
    "holder": "The Historian",
    "detail": "31/31 cards \u2014 the only verified complete set including 17b",
    "wallet": "0xb2e...71c"
  },
  {
    "title": "Most Apples",
    "emoji": "\ud83c\udf4e",
    "holder": "The Phneep Purist",
    "detail": "Holds 12 copies of Card #1 Apples \u2014 the largest single-card position",
    "wallet": "0x2d7...e9b"
  },
  {
    "title": "Most Diverse Collection",
    "emoji": "\ud83c\udf08",
    "holder": "The Archivist",
    "detail": "14 unique cards across all 7 artists \u2014 perfect artist diversity",
    "wallet": "0x7a3...f2e"
  },
  {
    "title": "Longest Diamond Hands",
    "emoji": "\ud83d\udc8e",
    "holder": "The Historian",
    "detail": "1,200 days average hold time \u2014 since the 2021 rediscovery",
    "wallet": "0xb2e...71c"
  },
  {
    "title": "Biggest Single Purchase",
    "emoji": "\ud83d\udcb0",
    "holder": "Captain Diamond Hands",
    "detail": "Card #21 Wizard purchased for 4.25 ETH \u2014 the highest price paid",
    "wallet": "0x3b1...a8d"
  },
  {
    "title": "Most Active Trader",
    "emoji": "\u26a1",
    "holder": "The Velocity Trader",
    "detail": "47 buy/sell transactions in the last 90 days",
    "wallet": "0x9c4...b7f"
  },
  {
    "title": "Rarest Cards Only",
    "emoji": "\ud83d\udc51",
    "holder": "The Minimalist",
    "detail": "Portfolio is 100% cards with 111 supply \u2014 pure rarity concentration",
    "wallet": "0xa3b...82f"
  },
  {
    "title": "Best Entry Timing",
    "emoji": "\ud83c\udfaf",
    "holder": "The Silent Accumulator",
    "detail": "Average purchase price 22% below market \u2014 the limit order king",
    "wallet": "0xe7a...93d"
  }
];

// Merge extra holders
if(typeof HOLDERS !== 'undefined') { HOLDERS.push(...EXTRA_HOLDERS); }

// Seeded RNG for deterministic charts
function seededRng(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function cardPriceHistory(id, days) {
  const c = CARDS[id]; if (!c) return [];
  const rng = seededRng(parseInt(id) * 7919 + 42);
  // Start near ATL, build up through cycles to current floor
  let p = c.low * (1 + rng() * 2);
  const pts = [];
  for (let i = 0; i < days; i++) {
    const t = i / days;
    // Create realistic market cycles: early flat, mid-bull spike, crash, recovery
    const cycle = Math.sin(t * Math.PI * 3.2) * 0.3 + Math.sin(t * Math.PI * 7) * 0.1;
    const bull = t > 0.3 && t < 0.5 ? (t - 0.3) * 5 : 0; // 2021 bull run
    const crash = t > 0.5 && t < 0.7 ? -(t - 0.5) * 3 : 0; // 2022 crash
    const drift = (rng() - 0.48) * p * 0.04;
    p = p * (1 + cycle * 0.02 + bull * 0.03 + crash * 0.02) + drift;
    p = Math.max(c.low * 0.8, Math.min(c.high * 1.1, p));
    pts.push(+p.toFixed(4));
  }
  // Ensure last points converge to current floor
  const last20 = Math.min(20, pts.length);
  for (let i = pts.length - last20; i < pts.length; i++) {
    const blend = (i - (pts.length - last20)) / last20;
    pts[i] = +(pts[i] * (1 - blend) + c.floor * blend).toFixed(4);
  }
  return pts;
}
