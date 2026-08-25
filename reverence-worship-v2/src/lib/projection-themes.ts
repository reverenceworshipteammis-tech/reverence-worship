export type ProjectionThemeCategory = "classic" | "worship" | "nature" | "seasons";

export type ProjectionTheme = {
  label: string;
  category: ProjectionThemeCategory;
  background: string;
  text: string;
  muted: string;
  shadow: string;
};

export const projectionThemeCategories: Array<{ key: "all" | ProjectionThemeCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "classic", label: "Classic" },
  { key: "worship", label: "Worship" },
  { key: "nature", label: "Nature" },
  { key: "seasons", label: "Seasons" },
];

const whiteText = "#ffffff";
const lightMuted = "rgba(255,255,255,.68)";
const darkShadow = "0 4px 22px rgba(0,0,0,.82)";

export const projectionThemes = {
  black: { label: "Pure Black", category: "classic", background: "#000000", text: whiteText, muted: "rgba(255,255,255,.52)", shadow: darkShadow },
  midnight: { label: "Midnight", category: "classic", background: "radial-gradient(circle at 50% 15%,rgba(59,130,246,.14),transparent 42%),linear-gradient(145deg,#020617,#0f172a 52%,#172554)", text: whiteText, muted: lightMuted, shadow: darkShadow },
  royalBlue: { label: "Royal Blue", category: "classic", background: "radial-gradient(circle at 78% 18%,rgba(125,211,252,.22),transparent 33%),linear-gradient(145deg,#071b47,#123d8b 55%,#061735)", text: whiteText, muted: lightMuted, shadow: darkShadow },
  royalPurple: { label: "Royal Purple", category: "classic", background: "radial-gradient(circle at 22% 15%,rgba(216,180,254,.2),transparent 30%),linear-gradient(145deg,#1e073c,#581c87 50%,#2e1065)", text: whiteText, muted: lightMuted, shadow: darkShadow },
  burgundy: { label: "Burgundy", category: "classic", background: "radial-gradient(circle at 75% 10%,rgba(251,191,36,.12),transparent 30%),linear-gradient(145deg,#27070f,#6b1029 58%,#310710)", text: whiteText, muted: lightMuted, shadow: darkShadow },
  sanctuaryGold: { label: "Sanctuary Gold", category: "classic", background: "radial-gradient(ellipse at 50% -10%,rgba(253,230,138,.45),transparent 42%),linear-gradient(155deg,#17120a,#5b3b0b 48%,#17120a)", text: "#fffdf5", muted: "rgba(255,247,214,.68)", shadow: darkShadow },
  softCloud: { label: "Soft Cloud", category: "classic", background: "radial-gradient(circle at 22% 12%,#ffffff,transparent 40%),radial-gradient(circle at 82% 82%,#bfdbfe,transparent 44%),linear-gradient(145deg,#f8fafc,#dbeafe)", text: "#0f172a", muted: "rgba(15,23,42,.58)", shadow: "0 2px 12px rgba(255,255,255,.75)" },
  warmIvory: { label: "Warm Ivory", category: "classic", background: "radial-gradient(circle at 50% 0%,rgba(255,255,255,.95),transparent 42%),linear-gradient(145deg,#fffdf5,#f5e8c8)", text: "#33230f", muted: "rgba(51,35,15,.58)", shadow: "0 2px 12px rgba(255,255,255,.8)" },

  gloryRays: { label: "Glory Rays", category: "worship", background: "radial-gradient(circle at 50% 12%,rgba(255,250,210,.9) 0,rgba(250,204,21,.22) 13%,transparent 37%),conic-gradient(from 202deg at 50% 10%,#111827,#8a5a12,#111827,#5d3b0a,#111827)", text: whiteText, muted: "rgba(255,247,214,.72)", shadow: darkShadow },
  heavenlyLight: { label: "Heavenly Light", category: "worship", background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.95),rgba(186,230,253,.46) 22%,transparent 56%),linear-gradient(180deg,#075985,#1d4ed8 58%,#172554)", text: whiteText, muted: "rgba(240,249,255,.76)", shadow: darkShadow },
  stainedGlass: { label: "Stained Glass", category: "worship", background: "radial-gradient(circle at 18% 20%,rgba(251,191,36,.78),transparent 18%),radial-gradient(circle at 78% 18%,rgba(236,72,153,.66),transparent 22%),radial-gradient(circle at 68% 82%,rgba(14,165,233,.7),transparent 24%),radial-gradient(circle at 20% 80%,rgba(139,92,246,.72),transparent 24%),linear-gradient(145deg,#111827,#312e81)", text: whiteText, muted: "rgba(255,255,255,.76)", shadow: darkShadow },
  livingWater: { label: "Living Water", category: "worship", background: "radial-gradient(ellipse at 50% 95%,rgba(103,232,249,.42),transparent 48%),repeating-radial-gradient(ellipse at 50% 115%,transparent 0 9%,rgba(125,211,252,.13) 10% 11%),linear-gradient(180deg,#082f49,#0369a1 55%,#164e63)", text: whiteText, muted: "rgba(207,250,254,.74)", shadow: darkShadow },
  holyFire: { label: "Holy Fire", category: "worship", background: "radial-gradient(ellipse at 50% 110%,#fbbf24 0,rgba(249,115,22,.78) 18%,rgba(220,38,38,.36) 38%,transparent 62%),linear-gradient(155deg,#18060a,#450a0a 56%,#1c0610)", text: whiteText, muted: "rgba(254,226,226,.72)", shadow: darkShadow },
  prayerNight: { label: "Prayer Night", category: "worship", background: "radial-gradient(circle at 50% 44%,rgba(99,102,241,.26),transparent 32%),radial-gradient(circle at 12% 15%,rgba(255,255,255,.5) 0 1px,transparent 2px),radial-gradient(circle at 80% 22%,rgba(255,255,255,.4) 0 1px,transparent 2px),linear-gradient(160deg,#020617,#1e1b4b 62%,#0f172a)", text: whiteText, muted: "rgba(224,231,255,.7)", shadow: darkShadow },
  praiseCelebration: { label: "Praise Celebration", category: "worship", background: "radial-gradient(circle at 15% 15%,rgba(250,204,21,.55),transparent 24%),radial-gradient(circle at 88% 20%,rgba(34,211,238,.5),transparent 25%),radial-gradient(circle at 70% 95%,rgba(236,72,153,.5),transparent 31%),linear-gradient(135deg,#312e81,#6d28d9 48%,#9d174d)", text: whiteText, muted: "rgba(255,255,255,.76)", shadow: darkShadow },
  communion: { label: "Communion", category: "worship", background: "radial-gradient(ellipse at 50% 105%,rgba(251,191,36,.22),transparent 42%),radial-gradient(circle at 50% 16%,rgba(255,255,255,.1),transparent 28%),linear-gradient(145deg,#2a0711,#701a36 55%,#290812)", text: "#fffaf2", muted: "rgba(255,237,213,.68)", shadow: darkShadow },
  promise: { label: "Promise", category: "worship", background: "radial-gradient(ellipse at 50% 110%,transparent 40%,rgba(244,114,182,.28) 41% 44%,rgba(250,204,21,.24) 45% 48%,rgba(34,211,238,.24) 49% 52%,transparent 53%),linear-gradient(180deg,#172554,#075985 62%,#164e63)", text: whiteText, muted: "rgba(224,242,254,.72)", shadow: darkShadow },

  oceanDepth: { label: "Ocean Depth", category: "nature", background: "radial-gradient(circle at 78% 12%,rgba(34,211,238,.25),transparent 28%),linear-gradient(160deg,#042f49,#075985 50%,#083344)", text: whiteText, muted: "rgba(207,250,254,.72)", shadow: darkShadow },
  oliveGarden: { label: "Olive Garden", category: "nature", background: "radial-gradient(circle at 18% 20%,rgba(190,242,100,.18),transparent 34%),radial-gradient(circle at 90% 80%,rgba(234,179,8,.14),transparent 35%),linear-gradient(145deg,#142313,#365314 52%,#1a2e16)", text: whiteText, muted: "rgba(236,252,203,.7)", shadow: darkShadow },
  mountainMist: { label: "Mountain Mist", category: "nature", background: "linear-gradient(155deg,transparent 55%,rgba(15,23,42,.7) 56% 68%,transparent 69%),linear-gradient(205deg,transparent 49%,rgba(51,65,85,.68) 50% 65%,transparent 66%),linear-gradient(180deg,#94a3b8,#334155 64%,#0f172a)", text: whiteText, muted: "rgba(241,245,249,.7)", shadow: darkShadow },
  peacefulSky: { label: "Peaceful Sky", category: "nature", background: "radial-gradient(ellipse at 18% 18%,rgba(255,255,255,.62),transparent 28%),radial-gradient(ellipse at 80% 32%,rgba(255,255,255,.32),transparent 26%),linear-gradient(180deg,#38bdf8,#3b82f6 54%,#1e3a8a)", text: whiteText, muted: "rgba(240,249,255,.78)", shadow: darkShadow },
  desertDawn: { label: "Desert Dawn", category: "nature", background: "radial-gradient(circle at 75% 22%,#fde68a 0 5%,rgba(251,146,60,.34) 12%,transparent 29%),linear-gradient(180deg,#7c3f58,#c56b5d 55%,#4c2c3d)", text: whiteText, muted: "rgba(255,237,213,.74)", shadow: darkShadow },
  greenPastures: { label: "Green Pastures", category: "nature", background: "radial-gradient(ellipse at 50% 105%,rgba(134,239,172,.24),transparent 46%),linear-gradient(180deg,#164e63,#166534 62%,#14532d)", text: whiteText, muted: "rgba(220,252,231,.72)", shadow: darkShadow },
  dawnHope: { label: "Dawn of Hope", category: "nature", background: "radial-gradient(circle at 50% 100%,rgba(254,240,138,.82),rgba(251,146,60,.26) 18%,transparent 45%),linear-gradient(180deg,#312e81,#9f4164 58%,#c46f4d)", text: whiteText, muted: "rgba(255,247,237,.76)", shadow: darkShadow },

  advent: { label: "Advent", category: "seasons", background: "radial-gradient(circle at 50% 18%,rgba(250,204,21,.2),transparent 28%),linear-gradient(145deg,#240b3b,#581c87 58%,#2e1065)", text: whiteText, muted: "rgba(243,232,255,.72)", shadow: darkShadow },
  christmasNight: { label: "Christmas Night", category: "seasons", background: "radial-gradient(circle at 50% 16%,#fff7c2 0 1%,rgba(250,204,21,.65) 2%,transparent 13%),radial-gradient(circle at 16% 28%,rgba(255,255,255,.65) 0 1px,transparent 2px),radial-gradient(circle at 82% 36%,rgba(255,255,255,.55) 0 1px,transparent 2px),linear-gradient(160deg,#020617,#0f2f4a 58%,#071a2d)", text: whiteText, muted: "rgba(254,249,195,.72)", shadow: darkShadow },
  easterMorning: { label: "Easter Morning", category: "seasons", background: "radial-gradient(circle at 50% 100%,#fff7c2 0 7%,rgba(251,191,36,.48) 16%,rgba(244,114,182,.2) 36%,transparent 57%),linear-gradient(180deg,#3730a3,#a855f7 48%,#f97316)", text: whiteText, muted: "rgba(255,247,237,.78)", shadow: darkShadow },
  pentecost: { label: "Pentecost", category: "seasons", background: "radial-gradient(ellipse at 35% 105%,rgba(253,224,71,.72),rgba(249,115,22,.4) 20%,transparent 48%),radial-gradient(ellipse at 68% 105%,rgba(251,191,36,.62),rgba(220,38,38,.36) 22%,transparent 50%),linear-gradient(145deg,#450a0a,#7f1d1d 55%,#3b0714)", text: whiteText, muted: "rgba(254,226,226,.72)", shadow: darkShadow },
  harvest: { label: "Harvest", category: "seasons", background: "radial-gradient(circle at 82% 18%,rgba(254,240,138,.46),transparent 26%),linear-gradient(155deg,#3f2108,#92400e 52%,#422006)", text: "#fffaf0", muted: "rgba(254,243,199,.72)", shadow: darkShadow },
  lent: { label: "Lent", category: "seasons", background: "radial-gradient(circle at 50% 45%,rgba(148,163,184,.1),transparent 28%),linear-gradient(145deg,#111827,#312e4a 55%,#18181b)", text: "#f8fafc", muted: "rgba(226,232,240,.66)", shadow: darkShadow },
} as const satisfies Record<string, ProjectionTheme>;

export type ProjectionThemeKey = keyof typeof projectionThemes;
