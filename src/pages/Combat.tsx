import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Zap, Sword, Package, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { combatAPI } from '../lib/supabase';
import { Monster, Skill } from '../types';
import Button from '../components/UI/Button';
import ProgressBar from '../components/UI/ProgressBar';

const Combat: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [playerHP, setPlayerHP] = useState(100);
  const [playerMP, setPlayerMP] = useState(50);
  const [monsterHP, setMonsterHP] = useState(0);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [menuState, setMenuState] = useState<'main' | 'skills'>('main');
  const [playerSkills, setPlayerSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeCombat();
    loadPlayerSkills();
  }, []);

  const initializeCombat = async () => {
    try {
      setIsLoading(true);
      const monster = await combatAPI.getRandomMonster();
      setCurrentMonster(monster);
      setMonsterHP(monster.hp);
      
      // Initialize player stats from character
      if (user?.character) {
        setPlayerHP(user.character.vitals.currentHP);
        setPlayerMP(user.character.vitals.currentMP);
      }
      
      addToCombatLog(`A wild ${monster.name} appears!`);
    } catch (error) {
      console.error('Failed to initialize combat:', error);
      addToCombatLog('Failed to load monster. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlayerSkills = async () => {
    if (!user) return;
    
    try {
      const unlockedSkills = await combatAPI.getPlayerUnlockedSkills(user.id);
      const skills = unlockedSkills.map(us => us.skill).filter(Boolean) as Skill[];
      setPlayerSkills(skills);
    } catch (error) {
      console.error('Failed to load player skills:', error);
    }
  };

  const addToCombatLog = (message: string) => {
    setCombatLog(prev => [...prev, message].slice(-10)); // Keep last 10 messages
  };

  const handleAttack = () => {
    if (!currentMonster || !user) return;

    // Calculate player attack damage
    const playerAttack = 10 + (user.character.stats.strength * 2);
    const damage = Math.max(1, playerAttack - currentMonster.defense);
    
    const newMonsterHP = Math.max(0, monsterHP - damage);
    setMonsterHP(newMonsterHP);
    addToCombatLog(`You attack ${currentMonster.name} for ${damage} damage!`);

    if (newMonsterHP <= 0) {
      addToCombatLog(`${currentMonster.name} is defeated!`);
      addToCombatLog(`You gained ${currentMonster.exp_reward} EXP and ${currentMonster.gold_reward} Gold!`);
      return;
    }

    // Monster counter-attack
    setTimeout(() => {
      monsterAttack();
    }, 1000);
  };

  const handleSkillUse = (skill: Skill) => {
    if (!currentMonster || !user || playerMP < skill.mana_cost) return;

    // Calculate skill damage
    let skillDamage = skill.damage;
    if (skill.required_class === 'Wizard') {
      skillDamage += user.character.stats.intelligence * 2;
    } else if (skill.required_class === 'Fighter') {
      skillDamage += user.character.stats.strength * 1.5;
    }

    const damage = Math.max(1, Math.floor(skillDamage - currentMonster.defense / 2));
    const newMonsterHP = Math.max(0, monsterHP - damage);
    const newPlayerMP = playerMP - skill.mana_cost;

    setMonsterHP(newMonsterHP);
    setPlayerMP(newPlayerMP);
    addToCombatLog(`You cast ${skill.name} for ${damage} damage!`);
    setMenuState('main');

    if (newMonsterHP <= 0) {
      addToCombatLog(`${currentMonster.name} is defeated!`);
      addToCombatLog(`You gained ${currentMonster.exp_reward} EXP and ${currentMonster.gold_reward} Gold!`);
      return;
    }

    // Monster counter-attack
    setTimeout(() => {
      monsterAttack();
    }, 1000);
  };

  const monsterAttack = () => {
    if (!currentMonster || !user) return;

    const damage = Math.max(1, currentMonster.attack - (5 + user.character.stats.dexterity));
    const newPlayerHP = Math.max(0, playerHP - damage);
    
    setPlayerHP(newPlayerHP);
    addToCombatLog(`${currentMonster.name} attacks you for ${damage} damage!`);

    if (newPlayerHP <= 0) {
      addToCombatLog('You have been defeated!');
    }
  };

  const handleRun = () => {
    addToCombatLog('You fled from battle!');
    setTimeout(() => {
      navigate('/adventure');
    }, 1500);
  };

  const handleGoBack = () => {
    navigate('/adventure');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Preparing for battle...</p>
        </div>
      </div>
    );
  }

  if (!currentMonster) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">Failed to load monster</p>
          <Button onClick={handleGoBack} variant="primary">
            Return to Adventure
          </Button>
        </div>
      </div>
    );
  }

  const isPlayerDefeated = playerHP <= 0;
  const isMonsterDefeated = monsterHP <= 0;
  const isBattleOver = isPlayerDefeated || isMonsterDefeated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            onClick={handleGoBack}
            variant="secondary"
            size="sm"
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Flee Battle
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Combat - Grassy Plains</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Combat Log - Left Side */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 h-full">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <Sword className="w-5 h-5 mr-2" />
                Battle Log
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 h-[calc(100%-3rem)] overflow-y-auto">
                {combatLog.map((message, index) => (
                  <div key={index} className="text-sm text-gray-700 mb-2 last:mb-0">
                    {message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Combat Area - Right Side */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Top Area - Monster */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 flex-1">
              <div className="text-center">
                {/* Monster Sprite */}
                <div className="w-48 h-48 mx-auto mb-4 bg-gradient-to-br from-red-200 to-red-400 rounded-full flex items-center justify-center border-4 border-red-300">
                  {currentMonster.image_url ? (
                    <img
                      src={currentMonster.image_url}
                      alt={currentMonster.name}
                      className="w-40 h-40 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-8xl">👹</span>
                  )}
                </div>

                {/* Monster Name */}
                <h2 className="text-3xl font-bold text-gray-800 mb-4">{currentMonster.name}</h2>

                {/* Monster HP Bar */}
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">HP</span>
                    <span className="font-medium text-gray-700">{monsterHP}/{currentMonster.hp}</span>
                  </div>
                  <ProgressBar
                    current={monsterHP}
                    max={currentMonster.hp}
                    color="health"
                    showText={false}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Area - Player and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Player Area */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center">
                  {/* Player Avatar */}
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center border-4 border-gold-400">
                    <Sword className="w-16 h-16 text-white" />
                  </div>

                  {/* Player Name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {user?.character.name || 'Hero'}
                  </h3>

                  {/* Player HP Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">HP</span>
                      <span className="font-medium text-gray-700">{playerHP}/{user?.character.vitals.maxHP}</span>
                    </div>
                    <ProgressBar
                      current={playerHP}
                      max={user?.character.vitals.maxHP || 100}
                      color="health"
                      showText={false}
                    />
                  </div>

                  {/* Player MP Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">MP</span>
                      <span className="font-medium text-gray-700">{playerMP}/{user?.character.vitals.maxMP}</span>
                    </div>
                    <ProgressBar
                      current={playerMP}
                      max={user?.character.vitals.maxMP || 50}
                      color="mana"
                      showText={false}
                    />
                  </div>
                </div>
              </div>

              {/* Action Menu */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">Actions</h3>
                
                {isBattleOver ? (
                  <div className="text-center">
                    {isPlayerDefeated && (
                      <div className="text-red-600 mb-4">
                        <Heart className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-lg font-bold">Defeat!</p>
                        <p className="text-sm">You have been defeated...</p>
                      </div>
                    )}
                    {isMonsterDefeated && (
                      <div className="text-green-600 mb-4">
                        <Sword className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-lg font-bold">Victory!</p>
                        <p className="text-sm">You have defeated the {currentMonster.name}!</p>
                      </div>
                    )}
                    <Button onClick={handleGoBack} variant="gold" size="lg" className="w-full">
                      Return to Adventure
                    </Button>
                  </div>
                ) : menuState === 'main' ? (
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={handleAttack}
                      variant="danger"
                      size="lg"
                      className="w-full flex items-center justify-center"
                    >
                      <Sword className="w-5 h-5 mr-2" />
                      BATTLE
                    </Button>
                    
                    <Button
                      onClick={() => setMenuState('skills')}
                      variant="mystical"
                      size="lg"
                      className="w-full flex items-center justify-center"
                      disabled={playerSkills.length === 0}
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      SKILLS ({playerSkills.length})
                    </Button>
                    
                    <Button
                      onClick={() => {/* TODO: Implement bag */}}
                      variant="secondary"
                      size="lg"
                      className="w-full flex items-center justify-center"
                      disabled
                    >
                      <Package className="w-5 h-5 mr-2" />
                      BAG
                    </Button>
                    
                    <Button
                      onClick={handleRun}
                      variant="secondary"
                      size="lg"
                      className="w-full flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      RUN
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {playerSkills.slice(0, 4).map((skill) => (
                        <Button
                          key={skill.id}
                          onClick={() => handleSkillUse(skill)}
                          disabled={playerMP < skill.mana_cost}
                          variant="primary"
                          size="sm"
                          className="p-3 text-xs"
                        >
                          <div className="text-center">
                            <div className="font-semibold">{skill.name}</div>
                            <div className="text-xs opacity-75">{skill.mana_cost} MP</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => setMenuState('main')}
                      variant="secondary"
                      size="lg"
                      className="w-full flex items-center justify-center"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Combat;