import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, userAPI } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      setIsLoading(true);
      const { profile, character } = await userAPI.getUserProfile(supabaseUser.id);
      
      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        displayName: profile.display_name || supabaseUser.email!.split('@')[0],
        registrationDate: profile.created_at,
        character: {
          id: character.id,
          name: character.name,
          level: character.level,
          experience: character.experience,
          experienceToNext: character.experience_to_next,
          class: character.class,
          appearance: character.appearance,
          stats: character.stats,
          vitals: character.vitals,
          gold: character.gold,
          skillPoints: character.skill_points,
        },
      };

      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      // If there's an error loading user data, sign out
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: email.split('@')[0]
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;

    try {
      // Update profile if display name changed
      if (userData.displayName && userData.displayName !== user.displayName) {
        await userAPI.updateUserProfile(user.id, {
          display_name: userData.displayName
        });
      }

      // Update character if character data changed
      if (userData.character) {
        const characterUpdates: any = {};
        
        if (userData.character.name !== undefined) characterUpdates.name = userData.character.name;
        if (userData.character.level !== undefined) characterUpdates.level = userData.character.level;
        if (userData.character.experience !== undefined) characterUpdates.experience = userData.character.experience;
        if (userData.character.experienceToNext !== undefined) characterUpdates.experience_to_next = userData.character.experienceToNext;
        if (userData.character.class !== undefined) characterUpdates.class = userData.character.class;
        if (userData.character.appearance !== undefined) characterUpdates.appearance = userData.character.appearance;
        if (userData.character.stats !== undefined) characterUpdates.stats = userData.character.stats;
        if (userData.character.vitals !== undefined) characterUpdates.vitals = userData.character.vitals;
        if (userData.character.gold !== undefined) characterUpdates.gold = userData.character.gold;
        if (userData.character.skillPoints !== undefined) characterUpdates.skill_points = userData.character.skillPoints;

        if (Object.keys(characterUpdates).length > 0) {
          await userAPI.updateCharacter(user.id, characterUpdates);
        }
      }

      // Update local state
      const updatedUser = { ...user, ...userData };
      if (userData.character) {
        updatedUser.character = { ...user.character, ...userData.character };
      }
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};