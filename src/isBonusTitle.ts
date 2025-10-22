const bonusTitles = new Set([
    "BONUS CONTENT: Matt talks with Unlearning Economics",
    "Bonus Content: Matt Discusses Kamala Harris's Policies on Radio Show",
    "Bonus Content: Matt Talks NBA Unfair Labor Practice, Chris Paul on Lefty Specialists",
    "Bonus Content: Matt on the Dumb Zone",
    "Liz and Matt on It's Just Banter",
    "Matt Debates Job Guarantee with Mark Paul",
    "Matt Debates Oren Cass About Child Benefits (Coughs Removed)",
    "Matt Debates Yaron Brook of the Ayn Rand Institute About Welfare",
    "Matt Talking Health Insurance Waste on Background Briefing with Ian Masters",
    "Matt Talks Woodstock '99 on It's Just Banter",
    "Matt on Bad Faith",
    "Matt on Ben Burgis Show with Luke Savage",
    "Matt on Chapo Trap House",
    "Matt on It's Just Banter Podcast",
    "Matt on It's Just Banter",
    "Matt on Krystal Kyle & Friends",
    "Matt on Kyle Kulinski and Krystall Ball's Show",
    "Matt on Left Anchor",
    "Matt on The Dumb Zone",
    "Matt on The Nation Podcast with Jeet Heer on Why Elite College Admissions Favor the Rich",
    "Matt on The Nordic Model podcast",
    "Matt on the Ben Burgis Show",
    "Matt on the Money with Katie podcast",
    "Matt's Appearance on The Attitude with Arnie Arnesen",
    "Matt's Mom, Noella",
    "Bonus Content: Guest Mark Paul on his new book",
    "BONUS: Carl Beijer on Sean McElwee",
    "Fathers Day Special with Marty Bruenig",
    "The NLRB Rules Against The Federalist; Welfare State; Funniest Video I've Ever Seen",
    "Guest Marshall Steinbaum On Recent Developments in Tax Credit Discourse",
    "Spooky Halloween Bonus Cast (Solo Liz)",
    "Bonus for Patrons: The Midterms",
]);

const bonusRegex = new RegExp([
    /^Socialism Series Episode .+/,
].map(r => r.source).join("|"), "i");

export default (title: string) => {
    return bonusTitles.has(title) || title.match(bonusRegex);
}
