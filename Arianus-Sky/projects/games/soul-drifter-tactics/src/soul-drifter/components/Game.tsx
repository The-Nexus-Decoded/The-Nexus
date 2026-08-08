import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSoulDrift } from '../game/state';
import IsoWorld, { isoToScreen } from './IsoWorld';
import { getMapEntities, xpToNext, primaryResource } from '../data/maps';
import { CLASSES, RACES, ABILITIES, ITEMS, CONDITION_INFO, SHOP_STOCK } from '../data/classes';
import { shapeTiles } from '../game/combat';
import type { Vec2, AbilityId } from '../game/types';
import {
  Heart, Zap, Shield, Swords, Move, Crosshair, MessageCircle, Settings, MapPin,
  User, Sparkles, BookOpen, ArrowRight, RotateCcw, Backpack, Coins, SkipForward,
  LogOut, Save, Hourglass, Star,
} from 'lucide-react';

// ==================== TITLE SCREEN / CHARACTER CREATION ====================
function TitleScreen() {
  const { startGame, continueGame, hasSave, getProfiles, loadProfile, deleteProfile } = useSoulDrift();
  const [nameError, setNameError] = useState('');
  const [step, setStep] = useState<'title' | 'name' | 'race' | 'class' | 'quiz'>('title');
  const [playerName, setPlayerName] = useState('');
  const [selectedRace, setSelectedRace] = useState<string>('human');
  const [selectedClass, setSelectedClass] = useState<string>('warrior');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const QUESTIONS = useMemo(() => [
    {
      text: "You awaken at the Soul Well. Fragments of two realities clash in your mind. The first memory that surfaces is...",
      answers: [
        { text: "A battlefield. I stood my ground when the worlds collided.", modifiers: { hp: 10, mp: 0, initiative: 1, movement: 0 } },
        { text: "A library of light. I understood formulas before I could walk.", modifiers: { hp: 5, mp: 15, initiative: 0, movement: 0 } },
        { text: "A silent hunt. I tracked prey between realm seams.", modifiers: { hp: 0, mp: 0, initiative: 1, movement: 1 } },
        { text: "A prayer spoken in two tongues at once.", modifiers: { hp: 5, mp: 10, initiative: 0, movement: 0 } },
      ]
    },
    {
      text: "A Soul Essence whispers from corrupted basalt. It offers power, but warns of death-pressure. You...",
      answers: [
        { text: "Break the stone and claim it by force.", modifiers: { hp: 10, mp: 0, initiative: 1, movement: 0 } },
        { text: "Weave a warding formula around it first.", modifiers: { hp: 0, mp: 15, initiative: 0, movement: 0 } },
        { text: "Listen to every whisper before deciding.", modifiers: { hp: 0, mp: 5, initiative: 2, movement: 0 } },
        { text: "Mark it and return with proper tools.", modifiers: { hp: 5, mp: 0, initiative: 0, movement: 1 } },
      ]
    },
    {
      text: "The wind lanes of Arianus shift. Your companion is scattered across floating tiles. You...",
      answers: [
        { text: "Anchor yourself and pull them to safety.", modifiers: { hp: 10, mp: 0, initiative: 0, movement: 0 } },
        { text: "Read the wind currents and call the safe path.", modifiers: { hp: 0, mp: 10, initiative: 0, movement: 1 } },
        { text: "Leap between tiles without hesitation.", modifiers: { hp: 0, mp: 0, initiative: 2, movement: 1 } },
        { text: "Brace for impact and shield the weakest.", modifiers: { hp: 15, mp: 0, initiative: 0, movement: 0 } },
      ]
    },
    {
      text: "In Pryan, heat swells a predator's armor. It charges your position. You...",
      answers: [
        { text: "Meet the charge head-on.", modifiers: { hp: 10, mp: 0, initiative: 1, movement: 0 } },
        { text: "Redirect its heat into the ground with a formula.", modifiers: { hp: 0, mp: 15, initiative: 0, movement: 0 } },
        { text: "Dodge and strike at softened joints.", modifiers: { hp: 0, mp: 0, initiative: 2, movement: 1 } },
        { text: "Set a trap using the terrain itself.", modifiers: { hp: 0, mp: 10, initiative: 0, movement: 1 } },
      ]
    },
    {
      text: "A defeated enemy begs for mercy. Your soul memory says they destroyed a village in the other world. You...",
      answers: [
        { text: "Grant death. Mercy has no place here.", modifiers: { hp: 10, mp: 0, initiative: 1, movement: 0 } },
        { text: "Bind their wounds and make them talk.", modifiers: { hp: 10, mp: 5, initiative: 0, movement: 0 } },
        { text: "Walk away. Their fate belongs to the drift.", modifiers: { hp: 0, mp: 0, initiative: 2, movement: 1 } },
        { text: "Offer redemption through service.", modifiers: { hp: 5, mp: 10, initiative: 0, movement: 0 } },
      ]
    },
  ], []);

  const accumulatedMods = useMemo(() => {
    const mods = { hp: 0, mp: 0, initiative: 0, movement: 0 };
    quizAnswers.forEach((ansIdx, qIdx) => {
      const m = QUESTIONS[qIdx]?.answers[ansIdx]?.modifiers;
      if (m) {
        mods.hp += m.hp;
        mods.mp += m.mp;
        mods.initiative += m.initiative;
        mods.movement += m.movement;
      }
    });
    return mods;
  }, [quizAnswers, QUESTIONS]);

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...quizAnswers, answerIndex];
    if (newAnswers.length < QUESTIONS.length) {
      setQuizAnswers(newAnswers);
    } else {
      const mods = { hp: 0, mp: 0, initiative: 0, movement: 0 };
      newAnswers.forEach((ansIdx, qIdx) => {
        const m = QUESTIONS[qIdx]?.answers[ansIdx]?.modifiers;
        if (m) {
          mods.hp += m.hp;
          mods.mp += m.mp;
          mods.initiative += m.initiative;
          mods.movement += m.movement;
        }
      });
      startGame({ classId: selectedClass, name: playerName.trim() || 'Drifter', raceId: selectedRace, quizModifiers: mods });
    }
  };

  const classList = [
    { id: 'warrior', icon: <Swords className="w-5 h-5" />, desc: 'Frontline rune fighter. Body, weapon, and armor form one circuit.' },
    { id: 'mage', icon: <Zap className="w-5 h-5" />, desc: 'Color formula caster. Combines disciplined channels into behavior.' },
    { id: 'priest', icon: <Heart className="w-5 h-5" />, desc: 'Devotional White magic. Vows, wards, and spiritual authority.' },
    { id: 'sharpshooter', icon: <Crosshair className="w-5 h-5" />, desc: 'Ranged hunter with a bonded companion. Marks, traps, and focus.' },
    { id: 'paladin', icon: <Shield className="w-5 h-5" />, desc: 'Oath-armored protector. Thunder impact, intercept zones, vow fields.' },
  ];

  const bg = (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1a0a2e, #000000)' }} />
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute rounded-full animate-pulse"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: '#a855f7',
            opacity: 0.1 + Math.random() * 0.2,
            animationDuration: `${Math.random() * 4 + 3}s`,
          }} />
      ))}
    </div>
  );

  const backNextRow = (onBack: () => void, onNext: () => void, nextLabel = 'Continue', nextDisabled = false) => (
    <div className="flex gap-2">
      <button onClick={onBack}
        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 transition-colors border border-slate-700">
        <RotateCcw className="w-3 h-3 inline mr-1" /> Back
      </button>
      <button onClick={onNext} disabled={nextDisabled}
        className="flex-[2] py-2 sd-btn rounded-lg font-bold flex items-center justify-center gap-2">
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const tryAdvanceName = () => {
    const name = playerName.trim();
    if (!name) return;
    const taken = getProfiles().some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) {
      setNameError(`"${name}" already drifts these realms. Choose another name, or load this soul from the title screen.`);
      return;
    }
    setStep('race');
  };

  if (step === 'title') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
        {bg}
        <div className="relative z-10 text-center max-w-2xl w-full px-4">
          <h1 className="text-5xl font-bold mb-2 tracking-tight font-gump"
            style={{ textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>
            <span className="text-purple-400">Soul</span>Drifter
          </h1>
          <p className="text-slate-400 text-sm mb-8">Two realities collided. You are the fragment that remembers both.</p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => setStep('name')}
              className="px-8 py-3 sd-btn rounded-lg font-bold flex items-center justify-center gap-2 w-64 text-purple-200">
              Begin Your Awakening <ArrowRight className="w-4 h-4" />
            </button>
            {hasSave && (
              <button
                onClick={continueGame}
                className="px-8 py-3 sd-btn rounded-lg font-bold flex items-center justify-center gap-2 w-64 text-cyan-300">
                <Save className="w-4 h-4" /> Continue Your Drift
              </button>
            )}
            {getProfiles().length > 0 && (
              <div className="w-80 mt-2 gump-panel p-3 text-left">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 text-center">Saved Souls</p>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto combat-log">
                  {getProfiles().map((p) => (
                    <div key={p.name} className="flex items-center gap-2 group">
                      <button
                        onClick={() => loadProfile(p.name)}
                        className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700 hover:border-purple-500/60 transition-all">
                        <span className="text-sm font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {CLASSES[p.classId]?.name ?? p.classId} · Lv {p.level}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteProfile(p.name)}
                        title="Forget this soul"
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs px-1">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-600 mt-6">Vertical Slice v0.6 — Ultima VI/VII Visual Pass</p>
        </div>
      </div>
    );
  }

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
        {bg}
        <div className="relative z-10 text-center max-w-md w-full px-4">
          <div className="mb-6">
            <User className="w-10 h-10 text-purple-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Who Are You?</h2>
            <p className="text-slate-400 text-sm">Your name echoes across both realities...</p>
          </div>
          <div className="gump-panel p-6 mb-6">
            <input
              type="text"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setNameError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') tryAdvanceName(); }}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-center text-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              autoFocus
            />
            {nameError && <p className="text-red-400 text-xs mt-2">{nameError}</p>}
            <div className="mt-4">{backNextRow(() => setStep('title'), tryAdvanceName, 'Next', !playerName.trim())}</div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'race') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
        {bg}
        <div className="relative z-10 text-center max-w-2xl w-full px-4">
          <div className="mb-4">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Choose Your Ancestry</h2>
            <p className="text-slate-400 text-sm">Race shapes your body and movement — never your class.</p>
          </div>
          <div className="gump-panel p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.values(RACES).map(r => {
                const isSelected = selectedRace === r.id;
                const m = r.modifiers;
                const statLine = [
                  m.hp !== 0 ? `${m.hp > 0 ? '+' : ''}${m.hp} HP` : '',
                  m.mp !== 0 ? `${m.mp > 0 ? '+' : ''}${m.mp} MP` : '',
                  m.initiative !== 0 ? `${m.initiative > 0 ? '+' : ''}${m.initiative} Init` : '',
                  m.movement !== 0 ? `${m.movement > 0 ? '+' : ''}${m.movement} Move` : '',
                ].filter(Boolean).join(' · ');
                return (
                  <button key={r.id}
                    onClick={() => setSelectedRace(r.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-900/20'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="font-bold text-sm">{r.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-1">{r.description}</p>
                    <p className="text-[10px] text-cyan-400">{r.trait}</p>
                    <p className="text-[10px] text-slate-500">{statLine}</p>
                  </button>
                );
              })}
            </div>
            {backNextRow(() => setStep('name'), () => setStep('class'))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'class') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
        {bg}
        <div className="relative z-10 text-center max-w-2xl w-full px-4">
          <div className="mb-4">
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Choose Your Path</h2>
            <p className="text-slate-400 text-sm">Your soul remembers a craft from before the collision...</p>
          </div>
          <div className="gump-panel p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {classList.map(c => {
                const isSelected = selectedClass === c.id;
                const cls = CLASSES[c.id];
                return (
                  <button key={c.id}
                    onClick={() => setSelectedClass(c.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-900/20'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: cls?.color || '#888' }}>{c.icon}</span>
                      <span className="font-bold text-sm">{cls?.name}</span>
                      <span className="text-[9px] text-slate-500 ml-auto">{cls?.role}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{c.desc}</p>
                  </button>
                );
              })}
            </div>
            {backNextRow(() => setStep('race'), () => setStep('quiz'))}
          </div>
        </div>
      </div>
    );
  }

  // Quiz step
  const qIdx = quizAnswers.length;
  const q = QUESTIONS[qIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
      {bg}
      <div className="relative z-10 max-w-lg w-full px-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Soul Memory {qIdx + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="flex gap-1">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`w-6 h-1 rounded-full ${i < quizAnswers.length ? 'bg-purple-500' : i === qIdx ? 'bg-purple-300' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>

        <div className="gump-panel p-5 mb-4">
          <p className="text-sm text-slate-200 leading-relaxed mb-4 font-medium">{q.text}</p>
          <div className="space-y-2">
            {q.answers.map((ans, i) => (
              <button key={i}
                onClick={() => handleQuizAnswer(i)}
                className="w-full p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:border-purple-500 hover:bg-purple-900/20 text-left transition-all group">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-700 group-hover:bg-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100">{ans.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {quizAnswers.length > 0 && (
          <div className="gump-panel p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Accumulated Essence</div>
            <div className="flex gap-3 text-xs">
              {accumulatedMods.hp > 0 && <span className="text-red-400">+{accumulatedMods.hp} HP</span>}
              {accumulatedMods.mp > 0 && <span className="text-blue-400">+{accumulatedMods.mp} MP</span>}
              {accumulatedMods.initiative > 0 && <span className="text-yellow-400">+{accumulatedMods.initiative} Init</span>}
              {accumulatedMods.movement > 0 && <span className="text-green-400">+{accumulatedMods.movement} Move</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PARTY HUD ====================
function PartyHUD() {
  const { state, selectUnit } = useSoulDrift();
  const { members } = state.party;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
      {members.map((member) => {
        const cls = CLASSES[member.classId || ''];
        const race = RACES[member.raceId || ''];
        const hpPct = (member.hp / member.maxHp) * 100;
        const resKey = primaryResource(member.classId);
        const resVal = member.resources[resKey] ?? 0;
        const isSelected = state.selectedUnit === member.id;
        const xpPct = Math.min(100, (member.xp / xpToNext(member.level)) * 100);

        return (
          <button key={member.id}
            onClick={() => selectUnit(member.id)}
            className={`flex items-center gap-2 px-3 py-2 transition-all text-left min-w-[220px] ${
              isSelected
                ? 'gump-panel border-amber-200/70 shadow-lg'
                : 'gump-panel opacity-80 hover:opacity-100'
            }`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: cls?.color + '33', border: `2px solid ${cls?.color}66`, color: cls?.color }}>
              {member.name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">{member.name}</span>
                <span className="text-[9px] text-slate-500">{race?.name} · Lv.{member.level}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Heart className="w-3 h-3 text-red-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${hpPct}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 w-12 text-right">{member.hp}/{member.maxHp}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className="w-3 h-3 shrink-0" style={{ color: cls?.color }} />
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${resVal}%`, background: cls?.color }} />
                </div>
                <span className="text-[9px] text-slate-500 w-12 text-right">{resVal}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 shrink-0" />
                <div className="flex-1 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
              {member.conditions.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {member.conditions.map(c => (
                    <span key={c} className="text-[8px] px-1 rounded"
                      style={{ background: (CONDITION_INFO[c]?.color || '#888') + '33', color: CONDITION_INFO[c]?.color || '#888' }}>
                      {CONDITION_INFO[c]?.label || c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        );
      })}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-900/60">
        <Coins className="w-3 h-3 text-amber-400" />
        <span className="text-xs font-bold text-amber-300">{state.party.gold}</span>
        <span className="text-[9px] text-slate-500">gold</span>
        <span className="text-[9px] text-slate-600 ml-1">· {state.party.soulEssences.length} essences · {state.party.memories.length} memories</span>
      </div>
    </div>
  );
}

// ==================== TURN ORDER STRIP ====================
function TurnOrderStrip() {
  const { state } = useSoulDrift();
  const combat = state.combat;
  if (!combat || combat.ended) return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1.5 gump-panel rounded-full px-3 py-1.5">
        <Hourglass className="w-3 h-3 text-slate-400 mr-1" />
        <span className="text-[9px] text-slate-500 mr-1">R{combat.round}</span>
        {combat.turnOrder.map((id, i) => {
          const unit = state.party.members.find(m => m.id === id) || state.enemies.find(e => e.id === id);
          if (!unit) return null;
          const isActive = i === combat.activeUnitIndex;
          const dead = unit.hp <= 0;
          return (
            <div key={id}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                dead ? 'opacity-30 grayscale' : ''
              } ${isActive ? 'scale-110 border-white' : unit.isPlayer ? 'border-cyan-700' : 'border-red-800'}`}
              style={{ background: unit.isPlayer ? (CLASSES[unit.classId || '']?.color || '#888') + '44' : '#7f1d1d44' }}
              title={`${unit.name} (Init ${unit.initiative})`}>
              {unit.name[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== COMBAT ACTION BAR ====================
function CombatBar({ onOpenInventory }: { onOpenInventory: () => void }) {
  const { state, selectAbility, endTurn, retreat } = useSoulDrift();
  const combat = state.combat;
  if (!combat || combat.ended) return null;

  const activeId = combat.turnOrder[combat.activeUnitIndex];
  const unit = state.party.members.find(m => m.id === activeId);
  if (!unit) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="gump-panel border-red-900/70 px-4 py-2 text-xs text-red-300 animate-pulse">
          Enemy is acting...
        </div>
      </div>
    );
  }

  const resKey = primaryResource(unit.classId);
  const combatAbilities = unit.abilities.filter(a =>
    !['move', 'interact', 'inspect', 'active_block', 'dodge', 'aim_timing'].includes(a)
  );

  const canAfford = (id: string) => {
    const cost = ABILITIES[id]?.resourceCost || {};
    return Object.entries(cost).every(([k, v]) => (unit.resources[k] ?? 0) >= v);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="gump-panel p-3 flex flex-col gap-2 items-center">
        <div className="text-[10px] text-slate-400 flex items-center gap-3">
          <span className="text-cyan-300 font-bold">{unit.name}'s turn</span>
          {!combat.movedThisTurn && <span className="flex items-center gap-1"><Move className="w-3 h-3 text-cyan-400" /> click a cyan tile to move</span>}
          {combat.movedThisTurn && !combat.actedThisTurn && <span className="text-slate-500">moved ✓</span>}
          {combat.selectedAbility && <span className="text-orange-300">choose a target tile (right-click / End Turn cancels)</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center max-w-[640px]">
          {combatAbilities.map(abilityId => {
            const ab = ABILITIES[abilityId];
            if (!ab) return null;
            const cost = ab.resourceCost?.[resKey] ?? Object.values(ab.resourceCost || {})[0] ?? 0;
            const disabled = combat.actedThisTurn || !canAfford(abilityId);
            const isSelected = combat.selectedAbility === abilityId;
            const cls = CLASSES[unit.classId || ''];
            const isBasic = abilityId === 'attack' || abilityId === 'defend';
            return (
              <button key={abilityId}
                onClick={() => selectAbility(abilityId as AbilityId)}
                disabled={disabled}
                title={ab.description}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border disabled:opacity-40 ${
                  isSelected ? 'ring-2 ring-orange-400' : ''
                }`}
                style={isBasic ? {
                  background: '#1e293b', borderColor: '#475569', color: '#cbd5e1',
                } : {
                  background: `${cls?.color}22`,
                  borderColor: `${cls?.color}66`,
                  color: cls?.color,
                }}>
                {ab.name}
                {cost > 0 && <span className="block text-[8px] opacity-70">{cost} {resKey.replace(/_/g, ' ')}</span>}
              </button>
            );
          })}

          <div className="w-px h-8 bg-slate-700 mx-1" />

          <button onClick={onOpenInventory}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors border border-slate-600/30">
            <Backpack className="w-4 h-4 mx-auto" />
          </button>
          <button onClick={endTurn}
            className="px-3 py-2 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-lg text-xs font-bold text-cyan-300 transition-colors border border-cyan-700/50">
            <SkipForward className="w-4 h-4 mx-auto mb-0.5" /> End Turn
          </button>
          <button onClick={retreat}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 transition-colors border border-slate-600/30">
            <LogOut className="w-4 h-4 mx-auto mb-0.5" /> Retreat
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== COMBAT LOG ====================
function CombatLog() {
  const { state } = useSoulDrift();
  const combat = state.combat;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [combat?.log.length]);

  if (!combat) return null;

  return (
    <div className="absolute right-4 top-24 z-20 w-64">
      <div className="gump-panel overflow-hidden">
        <div className="px-3 py-1.5 border-b border-slate-700/50 text-[10px] text-slate-400 uppercase tracking-wider">
          Combat Log
        </div>
        <div ref={scrollRef} className="combat-log max-h-40 overflow-y-auto px-3 py-2 space-y-1">
          {combat.log.slice(-14).map((line, i, arr) => (
            <div key={i} className={`text-[10px] leading-tight ${i === arr.length - 1 ? 'text-slate-200' : 'text-slate-500'}`}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== REACTION OVERLAY ====================
function ReactionOverlay() {
  const { state, resolveReaction } = useSoulDrift();
  const prompt = state.combat?.reactionPrompt;
  const [marker, setMarker] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const resolvedRef = useRef(false);
  const markerRef = useRef(0);

  useEffect(() => {
    resolvedRef.current = false;
  }, [prompt?.startTime]);

  const attempt = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const m = markerRef.current;
    const success = m >= 0.38 && m <= 0.62;
    resolveReaction(success);
  }, [resolveReaction]);

  useEffect(() => {
    if (!prompt) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - prompt.startTime;
      const remaining = Math.max(0, 1 - elapsed / prompt.windowMs);
      setTimeLeft(remaining);
      if (elapsed >= prompt.windowMs) {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          resolveReaction(false);
        }
        return;
      }
      const t = (elapsed % 900) / 900;
      const m = t < 0.5 ? t * 2 : (1 - t) * 2;
      markerRef.current = m;
      setMarker(m);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prompt, resolveReaction]);

  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        attempt();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, attempt]);

  if (!prompt) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40" onClick={attempt}>
      <div className="gump-panel p-6 shadow-2xl w-[420px] animate-fade-in">
        <div className="text-center mb-4">
          <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-1">Reaction — Block!</div>
          <div className="text-sm font-bold text-slate-200">
            {prompt.attackerName} strikes for {prompt.damage}!
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Press <span className="text-cyan-300 font-bold">SPACE</span> or click when the marker is in the bright zone
          </div>
        </div>

        {/* Timing bar */}
        <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
          {/* Success zone */}
          <div className="absolute top-0 bottom-0 bg-cyan-500/40 border-x border-cyan-400"
            style={{ left: '38%', width: '24%' }} />
          <div className="absolute top-0 bottom-0 bg-cyan-300/30"
            style={{ left: '45%', width: '10%' }} />
          {/* Marker */}
          <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_white]"
            style={{ left: `calc(${marker * 100}% - 3px)` }} />
        </div>

        {/* Time remaining */}
        <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-red-500 transition-none"
            style={{ width: `${timeLeft * 100}%` }} />
        </div>
        <div className="text-center text-[9px] text-slate-500 mt-1">
          Success: damage reduced to 25% · Fail: full damage
        </div>
      </div>
    </div>
  );
}

// ==================== INVENTORY PANEL ====================
function InventoryPanel({ onClose }: { onClose: () => void }) {
  const { state, useItem } = useSoulDrift();
  const inCombat = !!state.combat && !state.combat.ended;

  const grouped = useMemo(() => {
    const counts: Record<string, number> = {};
    state.party.inventory.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    return Object.entries(counts);
  }, [state.party.inventory]);

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-80">
      <div className="gump-panel p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Backpack className="w-4 h-4 text-purple-400" /> Inventory
          </h3>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
        </div>
        {grouped.length === 0 ? (
          <p className="text-xs text-slate-500">Your pack is empty. Defeated foes drop vials and tonics.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {grouped.map(([id, count]) => {
              const item = ITEMS[id];
              if (!item) return null;
              return (
                <div key={id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2 border border-slate-700/40">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-200">
                      {item.name} {count > 1 && <span className="text-slate-500">×{count}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">{item.description}</div>
                  </div>
                  <button
                    onClick={() => useItem(id)}
                    className="px-2 py-1 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-700/50 rounded text-[10px] font-bold text-emerald-300 transition-colors shrink-0">
                    Use{inCombat ? ' (action)' : ''}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center gap-2">
          <Coins className="w-3 h-3 text-amber-400" />
          <span className="text-xs font-bold text-amber-300">{state.party.gold} gold</span>
        </div>
      </div>
    </div>
  );
}

// ==================== COMBAT RESULT ====================
function CombatResultPanel() {
  const { state, closeCombatResult, respawn, returnToTitle } = useSoulDrift();
  const combat = state.combat;
  if (!combat?.ended || !combat.result) return null;

  if (combat.result === 'defeat') {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
        <div className="gump-panel p-8 shadow-2xl max-w-md w-full text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Your Soul Fractures</h2>
          <p className="text-sm text-slate-400 mb-6">
            The drift takes you... but the Soul Well remembers your shape. You will reform, poorer but whole.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={respawn}
              className="px-6 py-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 rounded-lg font-bold transition-all">
              Reform at the Soul Well
            </button>
            <button onClick={returnToTitle}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 border border-slate-700">
              Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rewards = combat.rewards;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="gump-panel p-8 shadow-2xl max-w-md w-full text-center animate-fade-in">
        <h2 className="text-2xl font-bold text-amber-300 mb-1">Victory</h2>
        <p className="text-xs text-slate-500 mb-4">The battlefield falls silent. Essence rejoins the whole.</p>
        {rewards && (
          <div className="bg-slate-800/60 rounded-lg p-4 mb-4 text-left space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Experience</span>
              <span className="font-bold text-amber-300">+{rewards.xp} XP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Gold</span>
              <span className="font-bold text-amber-400">+{rewards.gold}</span>
            </div>
            {rewards.items.map((id, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">Loot</span>
                <span className="font-bold text-emerald-300">{ITEMS[id]?.name || id}</span>
              </div>
            ))}
            {rewards.levelUps.map((l, i) => (
              <div key={i} className="text-center text-sm font-bold text-purple-300 pt-1 animate-pulse">
                ✦ {l} ✦
              </div>
            ))}
          </div>
        )}
        <button onClick={closeCombatResult}
          className="px-8 py-2 bg-gradient-to-r from-amber-700 to-orange-600 hover:from-amber-600 hover:to-orange-500 rounded-lg font-bold transition-all">
          Continue Exploring
        </button>
      </div>
    </div>
  );
}

// ==================== EXPLORATION HINT BAR ====================
function ExplorationBar({ onOpenInventory }: { onOpenInventory: () => void }) {
  const { state } = useSoulDrift();
  if (state.combat) return null;
  const nearbyEnemy = state.enemies.find(e => e.hp > 0);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="gump-panel px-4 py-2 flex items-center gap-4">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Move className="w-3 h-3 text-cyan-400" /> WASD / arrows or click a tile to walk
        </span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <MessageCircle className="w-3 h-3 text-purple-400" /> Click glowing figures &amp; gates to interact
        </span>
        {nearbyEnemy && (
          <span className="text-[10px] text-red-300 flex items-center gap-1 animate-pulse">
            <Swords className="w-3 h-3" /> Click a hostile to engage
          </span>
        )}
        <button onClick={onOpenInventory}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-slate-300 border border-slate-600/30 flex items-center gap-1">
          <Backpack className="w-3 h-3" /> Pack
        </button>
      </div>
    </div>
  );
}

// ==================== SHOP PANEL ====================
function ShopPanel() {
  const { state, closeShop, buyItem } = useSoulDrift();
  if (!state.shop) return null;
  const shop = SHOP_STOCK[state.shop];
  if (!shop) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50" onClick={closeShop}>
      <div className="gump-panel p-6 shadow-2xl w-[420px] animate-fade-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-cyan-300">{shop.name}</h3>
          <button onClick={closeShop} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
        </div>
        <p className="text-[10px] text-slate-500 mb-4">"Fresh from the trench, dry from the deep. Coin or coral, friend."</p>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {shop.entries.map(({ itemId, price }) => {
            const item = ITEMS[itemId];
            if (!item) return null;
            const affordable = state.party.gold >= price;
            return (
              <div key={itemId} className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200">{item.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{item.description}</div>
                </div>
                <button
                  onClick={() => buyItem(itemId, price)}
                  disabled={!affordable}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-colors shrink-0 border ${
                    affordable
                      ? 'bg-amber-900/50 hover:bg-amber-800/50 border-amber-700/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-600'
                  }`}>
                  {price}g
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{state.party.gold} gold</span>
          </div>
          <button onClick={closeShop}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 border border-slate-600/40">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DIALOG BOX ====================
function DialogBox() {
  const { state, setDialog } = useSoulDrift();
  if (!state.dialog) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full px-4">
      <div className="gump-panel p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full gump-inset flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-50 leading-relaxed font-dialog">{state.dialog}</p>
          </div>
          <button onClick={() => setDialog(null)}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-800 transition-colors shrink-0">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MESSAGE BAR ====================
function MessageBar() {
  const { state } = useSoulDrift();
  if (!state.message) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="text-xs gump-panel px-4 py-2 rounded-full flex items-center gap-2">
        <MapPin className="w-3 h-3 text-purple-400" />
        {state.message}
      </div>
    </div>
  );
}

// ==================== SETTINGS PANEL ====================
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, setReactionMode, setAnimationSpeed, saveNow } = useSoulDrift();

  return (
    <div className="absolute top-4 right-4 z-30">
      <div className="gump-panel p-4 shadow-xl w-64">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-200">Settings</h3>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Reaction Mode</label>
            <select
              value={state.reactionMode}
              onChange={(e) => setReactionMode(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200">
              <option value="full_timing">Full Timing (hard)</option>
              <option value="wide_timing">Wide Timing (normal)</option>
              <option value="auto_resolve">Auto Resolve</option>
              <option value="no_timing_bonus">No Timing Bonus</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Animation Speed</label>
            <div className="flex gap-1">
              {[0.5, 1, 2].map(speed => (
                <button key={speed}
                  onClick={() => setAnimationSpeed(speed)}
                  className={`flex-1 py-1 rounded text-xs ${state.animationSpeed === speed ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveNow}
            className="w-full py-2 bg-cyan-900/40 hover:bg-cyan-800/40 border border-cyan-700/40 rounded-lg text-xs font-bold text-cyan-300 transition-colors flex items-center justify-center gap-2">
            <Save className="w-3 h-3" /> Save Progress
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN GAME ====================
export default function Game() {
  const {
    state, moveUnit, hoverTile, interactWithEntity, selectUnit, engageEnemy,
    combatMove, combatTarget, returnToTitle,
  } = useSoulDrift();
  const [showSettings, setShowSettings] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [camera, setCamera] = useState<Vec2>({ x: 0, y: 0 });

  const combat = state.combat;
  const combatActive = !!combat && !combat.ended;
  const activeUnitId = combat ? combat.turnOrder[combat.activeUnitIndex] : null;
  const activeIsPlayer = !!state.party.members.some(m => m.id === activeUnitId);

  // Camera follows active unit in combat, selected unit otherwise
  useEffect(() => {
    const followId = combatActive ? activeUnitId : state.selectedUnit;
    const unit = state.party.members.find(m => m.id === followId)
      || state.enemies.find(e => e.id === followId);
    if (unit && state.currentMap) {
      const pos = isoToScreen(unit.position.x, unit.position.y);
      setCamera({ x: -pos.x, y: -pos.y });
    }
  }, [state.selectedUnit, state.party.members, state.enemies, combatActive, activeUnitId, state.currentMap]);

  // Affected-tiles preview for the selected ability
  const affectedPreview = useMemo(() => {
    if (!combatActive || !combat?.selectedAbility || !state.hoveredTile || !state.currentMap) return [];
    const ability = ABILITIES[combat.selectedAbility];
    const unit = state.party.members.find(m => m.id === activeUnitId);
    if (!ability || !unit) return [];
    if (!combat.targetTiles.some(t => t.x === state.hoveredTile!.x && t.y === state.hoveredTile!.y)) return [];
    return shapeTiles(ability, unit.position, state.hoveredTile, state.currentMap);
  }, [combatActive, combat, state.hoveredTile, state.currentMap, state.party.members, activeUnitId]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (combatActive) {
      if (!activeIsPlayer) return;
      if (combat?.selectedAbility) {
        combatTarget({ x, y });
      } else {
        combatMove({ x, y });
      }
      return;
    }
    if (state.selectedUnit) {
      moveUnit(state.selectedUnit, { x, y });
    }
  }, [combatActive, activeIsPlayer, combat, combatTarget, combatMove, state.selectedUnit, moveUnit]);

  const handleUnitClick = useCallback((id: string) => {
    const isEnemy = state.enemies.some(e => e.id === id);
    if (combatActive) {
      // Clicking a unit in combat targets its tile
      const unit = state.enemies.find(e => e.id === id) || state.party.members.find(m => m.id === id);
      if (unit && combat?.selectedAbility && activeIsPlayer) {
        combatTarget({ ...unit.position });
      }
      return;
    }
    if (isEnemy) {
      engageEnemy(id);
    } else {
      selectUnit(id);
    }
  }, [combatActive, combat, activeIsPlayer, state.enemies, state.party.members, engageEnemy, selectUnit, combatTarget]);

  const handleTileHover = useCallback((x: number, y?: number | null) => {
    if (y === null || y === undefined) {
      hoverTile(null);
    } else {
      hoverTile({ x, y });
    }
  }, [hoverTile]);

  // WASD / arrow-key exploration movement (hold to keep walking)
  const stateRef = useRef(state);
  stateRef.current = state;
  const moveUnitRef = useRef(moveUnit);
  moveUnitRef.current = moveUnit;
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        keysRef.current.add(k);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    const blur = () => { keysRef.current.clear(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    const timer = window.setInterval(() => {
      const s = stateRef.current;
      if (s.screen !== 'game' || !s.currentMap || s.combat || s.dialog || s.shop) return;
      if (!s.selectedUnit) return;
      const keys = keysRef.current;
      if (keys.size === 0) return;
      let dx = 0, dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (dx === 0 && dy === 0) return;
      const unit = s.party.members.find(m => m.id === s.selectedUnit);
      if (!unit) return;
      moveUnitRef.current(s.selectedUnit, { x: unit.position.x + dx, y: unit.position.y + dy });
    }, 150);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.clearInterval(timer);
    };
  }, []);

  if (state.screen === 'title') {
    return <TitleScreen />;
  }

  if (!state.currentMap) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Loading...</div>;
  }

  const entities = getMapEntities(state.currentMap.id);
  const allUnits = [
    ...state.party.members.filter(m => m.hp > 0),
    ...state.enemies.filter(e => e.hp > 0),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* World name */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-slate-700/30">
          <MapPin className="w-3 h-3 text-purple-400" />
          <span className="text-xs font-bold text-slate-300">{state.currentMap.name}</span>
          <span className="text-[9px] text-slate-500">· {state.currentMap.realm}</span>
        </div>
      </div>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-48 z-20 p-2 bg-slate-900/60 hover:bg-slate-800/60 rounded-lg border border-slate-700/30 transition-colors">
        <Settings className="w-4 h-4 text-slate-400" />
      </button>

      {/* Return to title */}
      <button
        onClick={returnToTitle}
        className="absolute top-4 right-64 z-20 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/60 rounded-lg border border-slate-700/30 transition-colors text-xs text-slate-400">
        Save &amp; Exit
      </button>

      {/* Isometric World */}
      <IsoWorld
        tiles={state.currentMap.tiles}
        units={allUnits}
        entities={entities}
        camera={camera}
        hoveredTile={state.hoveredTile}
        selectedUnit={state.selectedUnit}
        exploredTiles={state.exploredTiles}
        floaters={state.floaters}
        actionFx={state.actionFx}
        realmId={state.currentMap.realm}
        combatActive={combatActive}
        activeUnitId={activeUnitId}
        moveRange={combat?.moveRange || []}
        targetTiles={combat?.targetTiles || []}
        affectedPreview={affectedPreview}
        onTileClick={handleTileClick}
        onTileHover={handleTileHover}
        onEntityClick={interactWithEntity}
        onUnitClick={handleUnitClick}
        width={state.currentMap.width}
        height={state.currentMap.height}
      />

      {/* UI Overlays */}
      <PartyHUD />
      <TurnOrderStrip />
      <CombatBar onOpenInventory={() => setShowInventory(true)} />
      <ExplorationBar onOpenInventory={() => setShowInventory(true)} />
      <CombatLog />
      <MessageBar />
      <DialogBox />
      <ReactionOverlay />
      <CombatResultPanel />
      <ShopPanel />
      {showInventory && <InventoryPanel onClose={() => setShowInventory(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Objective tracker */}
      <div className="absolute right-4 bottom-4 z-20">
        <div className="gump-panel p-3 w-52">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Objectives</div>
          {state.currentMap.objectives.map(obj => (
            <div key={obj} className="flex items-center gap-2 text-xs text-slate-300 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${state.clearedObjectives.includes(obj) ? 'bg-green-400' : 'bg-slate-600'}`} />
              <span className={state.clearedObjectives.includes(obj) ? 'line-through text-slate-500' : ''}>
                {obj.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
