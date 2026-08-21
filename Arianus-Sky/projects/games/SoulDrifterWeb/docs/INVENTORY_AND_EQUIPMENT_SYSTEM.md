# Inventory and Equipment System

## Player-facing contract

- A newly returned character begins with a 30-slot backpack.
- Equipped head, body, leg, foot, main-hand, and off-hand items live on the paper doll and do not consume backpack slots.
- Unequipping an item moves it into the backpack and therefore requires a free slot.
- Each item stack consumes one slot. Stackable consumables and materials show their quantity; ordinary equipment does not stack.
- Quest rewards, monster loot, vendor purchases, crafting results, and unequipped gear all enter through the same capacity-checked inventory boundary.
- A full backpack refuses a new item or unequip operation and explains why. Required quest rewards must remain claimable at their source until space exists; they must never be silently destroyed.
- Every visible NPC or creature garment, armor piece, weapon, shield, tool, harness, pack, or carried object is backed by a real equipped item instance. Painted-on gear and decorative fake weapons are prohibited.
- On defeat, every visible equipped item receives an explicit loot result: transferable, damaged, broken, bound, quest-protected, or destroyed. It may not silently vanish.
- Defeated actors remain in the world as lootable remains. The body is removed only after available loot resolves successfully; a full backpack leaves the remains and items in place.
- The active local prototype inventory persists in IndexedDB with the saved soul. Creating a new soul clears the prior active inventory; continuing the saved soul restores it.

## Expandable capacity model

Backpack capacity is data, not a hard-coded UI assumption:

`total slots = base slots + earned slots + entitlement slots`

- `baseSlots`: 30 for every new account.
- `earnedSlots`: upgrades granted by play, quests, account milestones, or crafted bags.
- `entitlementSlots`: future account-level expansions granted by a verified backend entitlement.

The browser must never mint paid capacity by editing local state. When accounts and the scalable backend are introduced, only a server-verified entitlement may change `entitlementSlots`. Store pricing, limits, bundles, and whether every paid expansion also has an earnable path remain owner-review product decisions.

## Current prototype scope

Implemented now:

- 30 visible backpack slots;
- separate equipped paper-doll slots;
- item stacks and quantities;
- capacity enforcement when collecting or unequipping;
- local saved-soul persistence;
- authoritative main-hand weapon detection for action availability;
- capacity-safe corpse looting with remains that persist until a successful collection.

Later systems plug into the same inventory write boundary:

- expanded per-creature drop tables and per-item corpse disposition rules;
- quest-reward claim records;
- vendor buy/sell transactions and currency;
- drag-and-drop, sorting, splitting, and stack overflow;
- item definitions, affixes, binding, rarity, durability repair, and destruction;
- server-authoritative account inventory and capacity entitlements.
