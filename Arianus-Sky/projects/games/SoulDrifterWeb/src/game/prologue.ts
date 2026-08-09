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
      kicker: "Old Earth · The Age of Dust",
      title: "Humanity Nearly Ended the World",
      image: AGE_OF_DUST_ART,
      narration: [
        "Nuclear and antimatter war nearly erased life from Old Earth. Humans, elves, and dwarves endured the poisoned Age of Dust among the ruins.",
        "A mutant human strain learned to feel the Wave of possibility and became the first Sartan. When their ordered power grew dominant, the Wave produced the balancing Patryns. Both altered possibility through sigla: Sartan through voice and movement, Patryns through linked signs tattooed upon the body.",
      ],
      alt: "Old Earth burns after nuclear war while survivors cross the Age of Dust and the first Sartan shape ordered sigla in the air.",
    },
    {
      id: "sundering",
      era: "The Death Gate Cycle",
      kicker: "The Council of Seven · The ancient crime",
      title: "Fear Sundered the Earth",
      image: SUNDERING_ART,
      narration: [
        "Sartan and Patryn fought for control of the mensch. Led by Samah, the Sartan Council broke Earth into Arianus, Pryan, Abarrach, and Chelestra—realms of air, fire, stone, and water. Millions died in the remaking.",
        "The Patryns were cast into the Labyrinth, a prison intended to reform them, with the Nexus waiting beyond its Final Gate. The stewards vanished, the four realms fell out of balance, and the Labyrinth became a sentient world of forests, ruins, caverns, settlements, monsters, gates, and lethal hope.",
      ],
      alt: "Sartan probability magic divides the wounded Earth into four elemental realms while the Labyrinth and Nexus are sealed beyond their gates.",
    },
    {
      id: "xar-and-haplo",
      era: "The Death Gate Cycle",
      kicker: "The Lord of the Nexus",
      title: "Xar Escaped—and Returned for His People",
      image: XAR_ESCAPE_ART,
      narration: [
        "After generations of struggle, Xar became the first Patryn to escape the Labyrinth. His old, layered sigla formed rings and chains from the name sign over his heart. He repeatedly returned to rescue other Patryns, including Haplo.",
        "In the Nexus, liberation hardened into conquest. Xar sent Haplo through Death's Gate to find the missing Sartan, study the four failing realms, and prepare their mensch nations for Patryn rule.",
      ],
      alt: "The white-haired Patryn lord Xar activates linked red-and-blue sigla while survivors cross the Final Gate from the varied Labyrinth into the Nexus.",
    },
    {
      id: "haplo-journey",
      era: "The Death Gate Cycle",
      kicker: "Dragon Wing through Serpent Mage",
      title: "The Four Realms Changed Haplo",
      image: HAPLO_SHIP_ART,
      narration: [
        "Haplo's rune-bound ship carried him and his black dog through Death's Gate. Among mensch he hid his body sigla beneath long clothes and wraps. Across Arianus, Pryan, Abarrach, and Chelestra, Alfred—the last frightened Sartan of Arianus—became his unlikely companion.",
        "Haplo saw the failed realm plan, Abarrach's forbidden necromancy, and dragon-snakes feeding upon fear and division. He learned that spreading chaos for Xar would not free his people; it would feed the enemy behind every inherited hatred.",
      ],
      alt: "Haplo and his consistent black dog cross Death's Gate aboard a rune-bound ship whose active red-and-blue sigla open toward the floating lands of Arianus.",
    },
    {
      id: "seventh-gate",
      era: "The Death Gate Cycle",
      kicker: "Into the Labyrinth · The Seventh Gate",
      title: "Old Enemies Chose Peace",
      image: SEVENTH_GATE_ART,
      narration: [
        "As the dragon-snakes drove Sartan and Patryn toward another catastrophe, Haplo rejected Xar's design. Haplo, Alfred, and Marit returned to the Labyrinth and the struggle reached the Seventh Gate.",
        "Neither tradition could prevail alone. A peaceful working performed together—Sartan and Patryn—sealed the danger and left both peoples in the Labyrinth with the possibility of a different future.",
      ],
      alt: "Haplo, Alfred, and Marit join complementary Sartan and Patryn probability magic at the Seventh Gate while dragon-snakes circle beyond it.",
    },
    {
      id: "souldrift",
      era: "SoulDrifter continuation",
      kicker: "Original game timeline · After the novels",
      title: "The SoulDrift Opened What Peace Had Sealed",
      image: COLLISION_ART,
      narration: [
        "Our story begins after the Cycle. A second reality built resurrection pools and soul vessels to preserve life. Its ruptures struck the old conduits, folded incompatible laws together, and created the SoulDrift—and a new green realm born from the collision rather than the Sundering.",
        "Now the Labyrinth and Nexus seals pulse with that wound. Sartan and Patryn powers may return as allies, teachers, or conquerors, while the dragon-serpents test every division. The realm-root answered by returning many SoulDrifters to prepare the mensch worlds before the next cataclysm.",
      ],
      alt: "A living second reality collides with the elemental realms around a great tree, forming the original new green realm and the SoulDrift.",
    },
    {
      id: "chosen",
      era: "The present",
      kicker: "Ilyra's charge",
      title: `${profile.name}, the Well Chose You Among Many`,
      image: ILYRA_ART,
      narration: [
        `You returned as a ${profile.raceName} ${profile.callingName}: one of many SoulDrifters whose memories can cross laws that tear ordinary souls apart. No single champion can prepare every realm, and you were not raised to rule alone.`,
        "Stabilize each world. Repair its conduits. Learn which rulers can unite their people and which must be opposed. Grow strong enough to face returning powers without becoming another tyrant who mistakes control for salvation. Now the Memory Loom can shape how this body begins.",
      ],
      alt: "Wellkeeper Ilyra welcomes the returned SoulDrifter beside a luminous Soul Well while the Chronicle's worlds glow behind her.",
    },
  ];
}
