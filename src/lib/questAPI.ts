import { supabase } from './supabase';
import { Quest } from '../types';

export const questAPI = {
  // Get all quests for a user
  async getUserQuests(userId: string): Promise<Quest[]> {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(quest => ({
      id: quest.id,
      title: quest.title,
      description: quest.description,
      type: quest.type,
      difficulty: quest.difficulty,
      rewards: quest.rewards,
      isCompleted: quest.is_completed,
      isActive: quest.is_active,
      progress: quest.progress,
      maxProgress: quest.max_progress,
      createdAt: quest.created_at,
      completedAt: quest.completed_at,
      dueDate: quest.due_date,
    }));
  },

  // Create a new quest
  async createQuest(userId: string, questData: Omit<Quest, 'id' | 'createdAt' | 'isCompleted'>): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .insert({
        user_id: userId,
        title: questData.title,
        description: questData.description,
        type: questData.type,
        difficulty: questData.difficulty,
        rewards: questData.rewards,
        is_active: questData.isActive,
        progress: questData.progress || 0,
        max_progress: questData.maxProgress || 1,
        due_date: questData.dueDate,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty,
      rewards: data.rewards,
      isCompleted: data.is_completed,
      isActive: data.is_active,
      progress: data.progress,
      maxProgress: data.max_progress,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      dueDate: data.due_date,
    };
  },

  // Update a quest
  async updateQuest(questId: string, updates: Partial<{
    title: string;
    description: string;
    type: string;
    difficulty: string;
    rewards: any;
    is_completed: boolean;
    is_active: boolean;
    progress: number;
    max_progress: number;
    due_date: string;
    completed_at: string;
  }>): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update(updates)
      .eq('id', questId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty,
      rewards: data.rewards,
      isCompleted: data.is_completed,
      isActive: data.is_active,
      progress: data.progress,
      maxProgress: data.max_progress,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      dueDate: data.due_date,
    };
  },

  // Delete a quest
  async deleteQuest(questId: string): Promise<void> {
    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId);

    if (error) throw error;
  },

  // Complete a quest
  async completeQuest(questId: string): Promise<Quest> {
    const { data, error } = await supabase
      .from('quests')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        progress: supabase.raw('max_progress') // Set progress to max_progress
      })
      .eq('id', questId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      difficulty: data.difficulty,
      rewards: data.rewards,
      isCompleted: data.is_completed,
      isActive: data.is_active,
      progress: data.progress,
      maxProgress: data.max_progress,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      dueDate: data.due_date,
    };
  }
};