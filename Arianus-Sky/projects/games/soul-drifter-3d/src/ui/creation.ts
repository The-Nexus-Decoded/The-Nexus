import { CLASSES, RACES } from '../soul-drifter/data/classes';

export interface Profile {
  name: string;
  classId: string;
  raceId: string;
  memoryId: string;
  level: number;
  mapId: string;
  lastPlayed: number;
}

const STORE_KEY = 'souldrifter3d_profiles_v1';
const START_MAP = 'spawn_chamber';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Profile[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveProfiles(list: Profile[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function upsertProfile(p: Profile) {
  const list = loadProfiles();
  const i = list.findIndex(x => x.name.toLowerCase() === p.name.toLowerCase());
  if (i >= 0) list[i] = p; else list.push(p);
  saveProfiles(list);
}

export function touchProfile(name: string, patch: Partial<Profile>) {
  const list = loadProfiles();
  const i = list.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
  if (i >= 0) {
    list[i] = { ...list[i], ...patch, lastPlayed: Date.now() };
    saveProfiles(list);
  }
}

const CLASS_ART: Record<string, string> = {
  warrior: '/sprites/class_warrior.png',
  priest: '/sprites/class_priest.png',
  sharpshooter: '/sprites/class_sharpshooter.png',
  paladin: '/sprites/class_paladin.png',
  mage: '/sprites/player.png',
};

const MEMORIES = [
  { id: 'forge', name: 'Memory of the Forge', text: 'Heat, hammer, oath. Your body remembers enduring. (+HP)' },
  { id: 'tide', name: 'Memory of the Tide', text: 'Cold pressure and patient light. Your breath remembers depth. (+MP)' },
  { id: 'wind', name: 'Memory of the Wind', text: 'Falling islands and open sky. Your feet remember speed. (+Initiative)' },
  { id: 'deep', name: 'Memory of the Deep', text: 'Two worlds splitting like glass. Your soul remembers both. (+Soul resonance)' },
];

type Step = 'title' | 'name' | 'race' | 'class' | 'memory';

/**
 * Full-screen character creation / profile select overlay.
 * Calls onStart with the chosen (or newly created) profile.
 */
export function runCreationFlow(onStart: (p: Profile) => void) {
  const overlay = document.createElement('div');
  overlay.id = 'creation';
  document.body.appendChild(overlay);

  const draft: Partial<Profile> = { level: 1, mapId: START_MAP };

  function finish(p: Profile) {
    upsertProfile({ ...p, lastPlayed: Date.now() });
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 450);
    onStart(p);
  }

  function cardList<T extends { id: string; name: string }>(
    items: T[],
    render: (item: T) => string,
    onPick: (item: T) => void,
  ): string {
    const html = items.map(i => `
      <div class="cr-card" data-id="${i.id}">
        ${render(i)}
      </div>`).join('');
    setTimeout(() => {
      overlay.querySelectorAll('.cr-card').forEach(el => {
        el.addEventListener('click', () => {
          overlay.querySelectorAll('.cr-card').forEach(x => x.classList.remove('sel'));
          el.classList.add('sel');
          const item = items.find(i => i.id === (el as HTMLElement).dataset.id)!;
          setTimeout(() => onPick(item), 260);
        });
      });
    }, 0);
    return html;
  }

  function show(step: Step) {
    if (step === 'title') {
      const profiles = loadProfiles().sort((a, b) => b.lastPlayed - a.lastPlayed);
      overlay.innerHTML = `
        <div class="cr-panel">
          <h1 class="cr-logo">SoulDrifter</h1>
          <div class="cr-sub">Realms of the Sundered Gate</div>
          ${profiles.length ? `
            <div class="cr-section">Return to the drift</div>
            <div class="cr-profiles">
              ${profiles.map(p => `
                <div class="cr-profile" data-name="${p.name}">
                  <img src="${CLASS_ART[p.classId] || CLASS_ART.mage}" alt="" />
                  <div class="cr-pinfo">
                    <div class="cr-pname">${p.name}</div>
                    <div class="cr-pmeta">Lv ${p.level} ${CLASSES[p.classId]?.name || p.classId} · ${RACES[p.raceId]?.name || p.raceId}</div>
                  </div>
                </div>`).join('')}
            </div>
            <div class="cr-section">or</div>` : ''}
          <button id="cr-new" class="sd-btn cr-big">Awaken a New Drifter</button>
        </div>`;
      overlay.querySelectorAll('.cr-profile').forEach(el => {
        el.addEventListener('click', () => {
          const p = loadProfiles().find(x => x.name === (el as HTMLElement).dataset.name);
          if (p) finish(p);
        });
      });
      overlay.querySelector('#cr-new')!.addEventListener('click', () => show('name'));
      return;
    }

    if (step === 'name') {
      overlay.innerHTML = `
        <div class="cr-panel">
          <h2 class="cr-h">Who wakes at the Soul Well?</h2>
          <input id="cr-name" maxlength="18" placeholder="Speak your name, drifter…" autocomplete="off" />
          <div id="cr-err" class="cr-err"></div>
          <div class="cr-row">
            <button id="cr-back" class="sd-btn">Back</button>
            <button id="cr-next" class="sd-btn cr-big">Continue</button>
          </div>
        </div>`;
      const input = overlay.querySelector<HTMLInputElement>('#cr-name')!;
      input.focus();
      const go = () => {
        const name = input.value.trim();
        const err = overlay.querySelector('#cr-err')!;
        if (name.length < 2) { err.textContent = 'A name needs at least two letters.'; return; }
        if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(name)) { err.textContent = 'Letters, spaces, hyphens and apostrophes only.'; return; }
        if (loadProfiles().some(p => p.name.toLowerCase() === name.toLowerCase())) {
          err.textContent = 'That soul already walks the realms. Choose another name — or continue it from the title.';
          return;
        }
        draft.name = name;
        show('race');
      };
      overlay.querySelector('#cr-next')!.addEventListener('click', go);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      overlay.querySelector('#cr-back')!.addEventListener('click', () => show('title'));
      return;
    }

    if (step === 'race') {
      overlay.innerHTML = `
        <div class="cr-panel cr-wide">
          <h2 class="cr-h">Choose your bloodline</h2>
          <div class="cr-cards">
            ${cardList(Object.values(RACES), r => `
              <div class="cr-card-title" style="color:${r.color}">${r.name}</div>
              <div class="cr-card-text">${r.description}</div>
              <div class="cr-card-trait">${r.trait}</div>
            `, r => { draft.raceId = r.id; show('class'); })}
          </div>
        </div>`;
      return;
    }

    if (step === 'class') {
      overlay.innerHTML = `
        <div class="cr-panel cr-wide">
          <h2 class="cr-h">Choose your path</h2>
          <div class="cr-cards">
            ${cardList(Object.values(CLASSES), c => `
              <img class="cr-card-img" src="${CLASS_ART[c.id] || CLASS_ART.mage}" alt="${c.name}" />
              <div class="cr-card-title" style="color:${c.color}">${c.name}</div>
              <div class="cr-card-text">${c.description}</div>
              <div class="cr-card-trait">${c.role}</div>
            `, c => { draft.classId = c.id; show('memory'); })}
          </div>
        </div>`;
      return;
    }

    if (step === 'memory') {
      overlay.innerHTML = `
        <div class="cr-panel cr-wide">
          <h2 class="cr-h">Which memory survived the Sundering?</h2>
          <div class="cr-cards">
            ${cardList(MEMORIES, m => `
              <div class="cr-card-title">${m.name}</div>
              <div class="cr-card-text">${m.text}</div>
            `, m => {
              draft.memoryId = m.id;
              finish({
                name: draft.name!,
                classId: draft.classId!,
                raceId: draft.raceId!,
                memoryId: draft.memoryId!,
                level: 1,
                mapId: START_MAP,
                lastPlayed: Date.now(),
              });
            })}
          </div>
        </div>`;
    }
  }

  show('title');
}
