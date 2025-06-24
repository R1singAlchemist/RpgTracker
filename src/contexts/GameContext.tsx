import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Quest, Item, Achievement, Friend } from '../types';
import { useAuth } from './AuthContext';
import { questAPI } from '../lib/questAPI';

interface GameContextType {
  quests: Quest[];
  inventory: Item[];
  achievements: Achievement[];
  friends: Friend[];
  addQuest: (quest: Omit<Quest, 'id' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  addItem: (item: Item) => void;
  removeItem: (itemId: string, quantity?: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  buyItem: (item: Item) => boolean;
  sellItem: (itemId: string) => boolean;
  addFriend: (friend: Friend) => void;
  removeFriend: (friendId: string) => void;
  isLoading: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load game data when user changes
  useEffect(() => {
    if (user) {
      loadGameData();
    } else {
      // Clear data when no user
      setQuests([]);
      setInventory([]);
      setAchievements([]);
      setFriends([]);
    }
  }, [user]);

  const loadGameData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load quests from Supabase
      const userQuests = await questAPI.getUserQuests(user.id);
      setQuests(userQuests);

      // Load other data from localStorage for now (will be migrated to Supabase later)
      const savedInventory = localStorage.getItem(`inventory_${user.id}`);
      const savedAchievements = localStorage.getItem(`achievements_${user.id}`);
      const savedFriends = localStorage.getItem(`friends_${user.id}`);

      if (savedInventory) setInventory(JSON.parse(savedInventory));
      if (savedAchievements) setAchievements(JSON.parse(savedAchievements));
      if (savedFriends) setFriends(JSON.parse(savedFriends));
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveInventoryData = (data: Item[]) => {
    if (!user) return;
    localStorage.setItem(`inventory_${user.id}`, JSON.stringify(data));
  };

  const saveAchievementsData = (data: Achievement[]) => {
    if (!user) return;
    localStorage.setItem(`achievements_${user.id}`, JSON.stringify(data));
  };

  const saveFriendsData = (data: Friend[]) => {
    if (!user) return;
    localStorage.setItem(`friends_${user.id}`, JSON.stringify(data));
  };

  const addQuest = async (questData: Omit<Quest, 'id' | 'createdAt' | 'isCompleted'>) => {
    if (!user) return;

    try {
      const newQuest = await questAPI.createQuest(user.id, questData);
      setQuests(prev => [newQuest, ...prev]);
    } catch (error) {
      console.error('Error adding quest:', error);
      throw error;
    }
  };

  const completeQuest = async (questId: string) => {
    if (!user) return;

    try {
      const quest = quests.find(q => q.id === questId);
      if (!quest || quest.isCompleted) return;

      // Complete quest in database
      const completedQuest = await questAPI.completeQuest(questId);
      
      // Update local state
      setQuests(prev => prev.map(q => q.id === questId ? completedQuest : q));

      // Award rewards
      const newExp = user.character.experience + quest.rewards.experience;
      const newGold = user.character.gold + quest.rewards.gold;
      let newLevel = user.character.level;
      let newExpToNext = user.character.experienceToNext;
      let newSkillPoints = user.character.skillPoints + (quest.rewards.skillPoints || 0);
      let newAvailablePoints = user.character.stats.availablePoints;

      // Check for level up
      if (newExp >= user.character.experienceToNext) {
        newLevel++;
        newExpToNext = newLevel * 100; // Simple formula
        newAvailablePoints += 3; // 3 stat points per level
      }

      // Update character
      await updateUser({
        character: {
          ...user.character,
          experience: newExp,
          experienceToNext: newExpToNext,
          level: newLevel,
          gold: newGold,
          skillPoints: newSkillPoints,
          stats: {
            ...user.character.stats,
            availablePoints: newAvailablePoints,
          },
        },
      });

      // Add reward items to inventory
      if (quest.rewards.items) {
        const newItems = [...inventory, ...quest.rewards.items];
        setInventory(newItems);
        saveInventoryData(newItems);
      }
    } catch (error) {
      console.error('Error completing quest:', error);
      throw error;
    }
  };

  const deleteQuest = async (questId: string) => {
    if (!user) return;

    try {
      await questAPI.deleteQuest(questId);
      setQuests(prev => prev.filter(q => q.id !== questId));
    } catch (error) {
      console.error('Error deleting quest:', error);
      throw error;
    }
  };

  const addItem = (item: Item) => {
    // Check if item already exists (for stackable items)
    const existingItemIndex = inventory.findIndex(i => i.id === item.id);
    let updatedInventory;

    if (existingItemIndex !== -1 && item.quantity) {
      updatedInventory = inventory.map((i, index) =>
        index === existingItemIndex
          ? { ...i, quantity: (i.quantity || 0) + (item.quantity || 1) }
          : i
      );
    } else {
      updatedInventory = [...inventory, item];
    }

    setInventory(updatedInventory);
    saveInventoryData(updatedInventory);
  };

  const removeItem = (itemId: string, quantity = 1) => {
    const updatedInventory = inventory.reduce((acc, item) => {
      if (item.id === itemId) {
        const newQuantity = (item.quantity || 1) - quantity;
        if (newQuantity > 0) {
          acc.push({ ...item, quantity: newQuantity });
        }
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as Item[]);

    setInventory(updatedInventory);
    saveInventoryData(updatedInventory);
  };

  const equipItem = (itemId: string) => {
    const updatedInventory = inventory.map(item =>
      item.id === itemId ? { ...item, isEquipped: true } : item
    );
    setInventory(updatedInventory);
    saveInventoryData(updatedInventory);
  };

  const unequipItem = (itemId: string) => {
    const updatedInventory = inventory.map(item =>
      item.id === itemId ? { ...item, isEquipped: false } : item
    );
    setInventory(updatedInventory);
    saveInventoryData(updatedInventory);
  };

  const buyItem = (item: Item): boolean => {
    if (!user || user.character.gold < item.value) return false;

    // Deduct gold
    updateUser({
      character: {
        ...user.character,
        gold: user.character.gold - item.value,
      },
    });

    // Add item to inventory
    addItem(item);
    return true;
  };

  const sellItem = (itemId: string): boolean => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || !user) return false;

    // Add gold (sell for half price)
    const sellPrice = Math.floor(item.value / 2);
    updateUser({
      character: {
        ...user.character,
        gold: user.character.gold + sellPrice,
      },
    });

    // Remove item from inventory
    removeItem(itemId, 1);
    return true;
  };

  const addFriend = (friend: Friend) => {
    const updatedFriends = [...friends, friend];
    setFriends(updatedFriends);
    saveFriendsData(updatedFriends);
  };

  const removeFriend = (friendId: string) => {
    const updatedFriends = friends.filter(f => f.id !== friendId);
    setFriends(updatedFriends);
    saveFriendsData(updatedFriends);
  };

  const value = {
    quests,
    inventory,
    achievements,
    friends,
    addQuest,
    completeQuest,
    deleteQuest,
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    buyItem,
    sellItem,
    addFriend,
    removeFriend,
    isLoading,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};