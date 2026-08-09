import type { CharacterProfile } from "./character";

export type PrologueEra = "The Death Gate Cycle" | "SoulDrifter continuation" | "The present";

export interface ProloguePage {
  id: string;
  era: PrologueEra;
  kicker: string;
  title: string;
  image: string;
  /** Optional recorded narration. Browser speech remains the temporary fallback. */
  audioSrc?: string;
  imagePosition?: string;
  narration: readonly string[];
  alt: string;
}

const AGE_OF_DUST_ART = "/assets/generated/prologue/00-age-of-dust.webp";
const SUNDERING_ART = "/assets/generated/prologue/01-sundering.webp";
const XAR_ESCAPE_ART = "/assets/generated/prologue/03-xar-escape.webp";
const HAPLO_SHIP_ART = "/assets/generated/prologue/04-haplo-runeship.webp";
const SEVENTH_GATE_ART = "/assets/generated/prologue/07-seventh-gate.webp";
const COLLISION_ART = "/assets/generated/prologue/09-collision.webp";
const ILYRA_ART = "/assets/generated/prologue/10-ilyra-awakening.webp";

/**
 * Five concise boards summarize the established Cycle. The final two boards
 * are explicitly labeled as original SoulDrifter continuation. This boundary
 * prevents later game-lore edits from masquerading as lost novel canon.
 */
export function prologuePages(profile: CharacterProfile): readonly ProloguePage[] {
  return [
    {
      id: "age-of-dust",
      era: "The Death Gate Cycle",
      kicker: "Old Earth - The Age of Dust",
      title: "The Mensch Survived Humanity's Ruin",
      image: AGE_OF_DUST_ART,
      narration: [
        "Nuclear and antimatter war nearly erased life from Old Earth. Its ordinary peoples - humans, elves, and dwarves, collectively called mensch - endured the poisoned Age of Dust among the ruins.",
        "The Sartan and Patryns were not gods or demons. Both were powerful human-descended peoples who could alter possibility through sigla: Sartan shaped signs in the air with voice and movement, while Patryns linked tattooed signs across their skin.",
      ],
      alt: "Old Earth burns after nuclear war while human, elf, and dwarf mensch survive and the human-descended Sartan shape sigla in the air.",
    },
    {
      id: "sundering",
      era: "The Death Gate Cycle",
      kicker: "The Council of Seven - The ancient crime",
      title: "Samah and the Sartan Council Sundered Earth",
      image: SUNDERING_ART,
      narration: [
        "Before the Sundering, Sartan and Patryns fought over who would shape Old Earth's future and govern the mensch. Sartan trusted ordered, collective guidance; Patryns defended individual will and rejected Sartan rule. Fear turned that conflict into a war for control.",
        "Samah led the seven-member Sartan Council. Convinced that only Sartan order could end the war, the Council broke Earth into Arianus, Pryan, Abarrach, and Chelestra - realms of air, fire, stone, and water - and imprisoned the Patryns in the vast Labyrinth. Millions died, the Sartan stewards vanished, and the four realms fell out of balance.",
      ],
      alt: "Samah and the seven-member Sartan Council divide wounded Earth into four elemental realms and imprison the Patryns in the Labyrinth.",
    },
    {
      id: "xar-and-haplo",
      era: "The Death Gate Cycle",
      kicker: "Xar - The Lord of the Nexus",
      title: "The Labyrinth Could Not Hold Xar",
      image: XAR_ESCAPE_ART,
      narration: [
        "Xar was a brilliant, ruthless survivor and perhaps the most powerful living Patryn. He became the first known Patryn to conquer the Labyrinth's Final Gate, founded his rule in the Nexus, and took the title Lord of the Nexus. To prisoners who had known only terror, his mastery of sigla made him a living legend - but not a god.",
        "No other known Patryn willingly returned into the Labyrinth again and again and still emerged alive. Xar used that impossible strength to rescue his people, including the orphaned Haplo, whom he raised as son, scout, and heir to his purpose. Yet liberation hardened into conquest, and Xar sent Haplo through Death's Gate to prepare every mensch nation for Patryn rule.",
      ],
      alt: "The white-haired Patryn lord Xar activates linked body sigla as he leads survivors, including the young Patryn Haplo, from the Labyrinth into the Nexus.",
    },
    {
      id: "haplo-journey",
      era: "The Death Gate Cycle",
      kicker: "Haplo and Alfred - Patryn and Sartan",
      title: "Haplo Chose the Worlds over His Lord",
      image: HAPLO_SHIP_ART,
      narration: [
        "Haplo began as Xar's fiercely loyal Patryn scout, his skin covered in linked sigla and his survival owed to the Lord who rescued him. His rune-bound ship carried him and his black dog through Death's Gate, where he was ordered to divide the realms so Xar could conquer them.",
        "Instead, each journey broke part of that certainty. Haplo witnessed courage among the mensch, the ruin left by Sartan arrogance, and compassion from Alfred - a gentle, frightened Sartan who repeatedly trusted and saved his supposed enemy. He learned that Xar's engineered chaos fed the dragon-snakes and repeated the same hunger for control that caused the Sundering. Haplo opposed his lord to save the worlds, not because he stopped loving the man who had saved him.",
      ],
      alt: "The Patryn Haplo and his black dog cross Death's Gate aboard a rune-bound ship while the Sartan Alfred watches the four elemental realms beyond.",
    },
    {
      id: "seventh-gate",
      era: "The Death Gate Cycle",
      kicker: "Marit, Haplo, and Alfred - The Seventh Gate",
      title: "Old Enemies Chose Peace",
      image: SEVENTH_GATE_ART,
      narration: [
        "Marit was a fierce Patryn woman, Labyrinth survivor, and former servant of Xar whose bond with Haplo outlasted their master's vengeance. She joined Haplo and Alfred when the dragon-snakes drove both ancient peoples toward catastrophe.",
        "At the Seventh Gate, the two traditions did what neither could accomplish alone. Haplo and Marit used Patryn body sigla while Alfred shaped Sartan sigla in the air; their peaceful working sealed the danger and left both peoples a chance to share the Labyrinth.",
      ],
      alt: "The Patryns Haplo and Marit join the Sartan Alfred in complementary sigla magic at the Seventh Gate while dragon-snakes circle beyond it.",
    },
    {
      id: "souldrift",
      era: "SoulDrifter continuation",
      kicker: "Original SoulDrifter timeline - After the novels",
      title: "The SoulDrift Opened What Peace Had Sealed",
      image: COLLISION_ART,
      narration: [
        "Our original continuation begins after the Cycle. A second reality built resurrection pools and soul vessels to preserve life. Its ruptures struck the old conduits, folded incompatible laws together, and created the SoulDrift - and a new green realm born from the collision rather than the Sundering.",
        "SoulDrifters are dead mensch returned through those damaged systems. Their souls can cross unstable realm laws, so the realm-root has raised many of them to repair the worlds before Sartan, Patryn, or dragon-serpent powers turn the next cataclysm into conquest.",
      ],
      alt: "A living second reality collides with the elemental realms around a great tree, creating the SoulDrift and returning dead mensch as SoulDrifters.",
    },
    {
      id: "chosen",
      era: "The present",
      kicker: "Ilyra the Wellkeeper - Your charge",
      title: `${profile.name}, the Well Chose You Among Many`,
      image: ILYRA_ART,
      narration: [
        `I am Ilyra, a mensch Wellkeeper who tends this Soul Well and guides the returned. You awakened as a ${profile.raceName} ${profile.callingName}: one of many SoulDrifters whose memories can survive laws that tear ordinary souls apart.`,
        "Stabilize each world. Repair its conduits. Learn which rulers can unite their people and which must be opposed. Grow strong enough to face returning powers without becoming another tyrant who mistakes control for salvation. Now the Memory Loom can shape how this body begins.",
      ],
      alt: "Ilyra, a mensch Wellkeeper, welcomes the returned SoulDrifter beside a luminous Soul Well while the Chronicle's worlds glow behind her.",
    },
  ];
}
