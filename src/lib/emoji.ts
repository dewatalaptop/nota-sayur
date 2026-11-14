const MAP: [RegExp, string][] = [
  [/wortel/i, "🥕"], [/tomat/i, "🍅"], [/cabai|cabe|lombok|rawit/i, "🌶️"], [/bawang\s*putih/i, "🧄"], [/bawang/i, "🧅"],
  [/kentang/i, "🥔"], [/terong|terung/i, "🍆"], [/jagung/i, "🌽"], [/timun|mentimun/i, "🥒"], [/brokoli/i, "🥦"],
  [/singkong|ubi/i, "🍠"], [/jamur/i, "🍄"], [/labu|waluh/i, "🎃"], [/kacang|buncis|tauge|toge/i, "🫛"],
  [/jeruk|lemon|limau/i, "🍋"], [/pisang/i, "🍌"], [/apel/i, "🍎"], [/mangga/i, "🥭"], [/semangka/i, "🍉"],
  [/nanas/i, "🍍"], [/alpukat/i, "🥑"], [/kelapa/i, "🥥"], [/paprika/i, "🫑"], [/jahe|kunyit|lengkuas|kencur/i, "🫚"],
];
/** Ikon sayur otomatis dari nama; bawaan daun hijau. */
export const emojiFor = (name: string) => MAP.find(([r]) => r.test(name))?.[1] ?? "🥬";
