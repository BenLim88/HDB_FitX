
import React, { useState, useEffect } from 'react';
import { User, Group, UserGroupMembership, AthleteType, Gender, UserCategory } from '../types';
import { DataService } from '../services/dataService';
import { Dumbbell, UserPlus, LogIn, RefreshCcw, Plus, X } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

type AvatarStyle = 'avataaars' | 'bottts' | 'pixel-art' | 'adventurer' | 'fun-emoji' | 'cats' | 'monsters';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState(''); // Empty by default - user should set their own designation
  const [gender, setGender] = useState<Gender>(Gender.MALE);
  const [category, setCategory] = useState<UserCategory>(UserCategory.ADULT);
  const [athleteType, setAthleteType] = useState<AthleteType>(AthleteType.GENERIC);
  
  // Group Memberships State
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMemberships, setGroupMemberships] = useState<UserGroupMembership[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubGroupIds, setSelectedSubGroupIds] = useState<string[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  
  // Avatar State
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('avataaars');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Easter Egg State
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const handleLogoClick = () => {
      const newCount = logoClickCount + 1;
      setLogoClickCount(newCount);
      if (newCount >= 3) {
          setShowEasterEgg(true);
          setLogoClickCount(0);
      }
      // Reset count after 2 seconds of inactivity
      setTimeout(() => setLogoClickCount(0), 2000);
  };

  const getAvatarUrl = (style: AvatarStyle, seed: string) => {
      const s = encodeURIComponent(seed);
      if (style === 'cats') return `https://robohash.org/${s}.png?set=set4`;
      if (style === 'monsters') return `https://robohash.org/${s}.png?set=set2`;
      return `https://api.dicebear.com/7.x/${style}/svg?seed=${s}`;
  };

  // Update avatar when seed, style or name changes
  useEffect(() => {
      const seed = avatarSeed || name || 'guest';
      setAvatarUrl(getAvatarUrl(avatarStyle, seed));
  }, [avatarSeed, name, avatarStyle]);

  // Load groups when registering
  useEffect(() => {
      if (isRegistering) {
          DataService.getGroups().then(setGroups).catch(console.error);
      }
  }, [isRegistering]);

  // Helper functions for group membership management
  const handleAddGroupMembership = () => {
      if (!selectedGroupId) return;
      
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) return;
      
      // Check if this group is already added
      if (groupMemberships.some(m => m.group_id === selectedGroupId)) {
          alert('This group is already added.');
          return;
      }
      
      const subGroupNames = selectedSubGroupIds
          .map(id => group.sub_groups.find(sg => sg.id === id)?.name || '')
          .filter(Boolean);
      
      const newMembership: UserGroupMembership = {
          group_id: selectedGroupId,
          group_name: group.name,
          sub_group_ids: selectedSubGroupIds,
          sub_group_names: subGroupNames
      };
      
      setGroupMemberships([...groupMemberships, newMembership]);
      setSelectedGroupId('');
      setSelectedSubGroupIds([]);
      setShowGroupSelector(false);
  };

  const handleRemoveGroupMembership = (groupId: string) => {
      setGroupMemberships(groupMemberships.filter(m => m.group_id !== groupId));
  };

  const toggleSubGroup = (subGroupId: string) => {
      setSelectedSubGroupIds(prev => 
          prev.includes(subGroupId) 
              ? prev.filter(id => id !== subGroupId)
              : [...prev, subGroupId]
      );
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = await DataService.login(email, password);
      if (user) {
        onAuthSuccess(user);
      } else {
        setError('Invalid credentials. Check ID/Password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (!name || !email || !password) {
        setError('Please fill in all required fields.');
        setIsLoading(false);
        return;
    }

    try {
      const newUser = await DataService.register({
        name,
        title,
        gender,
        group_id: 'NONE', // Legacy field - kept for backward compatibility
        athlete_type: athleteType,
        category
      });
      
      // Update the avatar and group memberships
      const userWithUpdates = { 
          ...newUser, 
          avatar_url: avatarUrl,
          group_memberships: groupMemberships.length > 0 ? groupMemberships : undefined
      };
      await DataService.updateUser(userWithUpdates);

      onAuthSuccess(userWithUpdates);
    } catch (err) {
      setError('Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      setError('');
      try {
          const user = await DataService.loginWithGoogle();
          if (user) {
              onAuthSuccess(user);
          } else {
              setError('Google Login Failed.');
          }
      } catch (err) {
          console.error(err);
          setError('Google Login Failed.');
      } finally {
          setIsLoading(false);
      }
  };

  const generateRandomAvatar = (e: React.MouseEvent) => {
      e.preventDefault();
      // Generate a random number between 1 and 1,000,000
      const random = Math.floor(Math.random() * 1000000).toString();
      setAvatarSeed(random);
  }

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Only allow numeric input
      if (/^\d*$/.test(val)) {
          setAvatarSeed(val);
      }
  };

  const isKid = category === UserCategory.KID;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isKid && isRegistering ? 'bg-blue-50' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black'}`}>
      
      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEasterEgg(false)}>
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-orange-500/30 rounded-2xl p-8 max-w-sm text-center shadow-2xl shadow-orange-500/20 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 mx-auto bg-orange-600 rounded-2xl rotate-3 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
              <Dumbbell size={40} className="text-white -rotate-3" />
            </div>
            <h3 className="text-2xl font-black text-white italic mb-2">FIT X LAB</h3>
            <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-4">Community Fitness Protocol</p>
            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-slate-400 text-sm">Fitness App created by</p>
              <p className="text-white font-bold text-lg mt-1">Dr. Benjamin JM LIM</p>
              <p className="text-slate-500 text-xs mt-2">🏋️ Train Hard. Stay Strong. 💪</p>
            </div>
            <button 
              onClick={() => setShowEasterEgg(false)}
              className="mt-6 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header / Logo Area */}
      <div className="mb-10 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div 
          onClick={handleLogoClick}
          className={`w-24 h-24 mx-auto ${isKid && isRegistering ? 'bg-blue-500 border-blue-300 shadow-blue-500/40' : 'bg-orange-600 border-orange-400 shadow-[0_0_40px_rgba(249,115,22,0.4)]'} rounded-3xl rotate-3 flex items-center justify-center shadow-lg border cursor-pointer select-none active:scale-95 transition-transform`}
        >
          <Dumbbell size={48} className="text-white -rotate-3" />
        </div>
        <div>
            <h1 className={`text-4xl font-black ${isKid && isRegistering ? 'text-blue-900' : 'text-white'} italic tracking-tighter uppercase`}>FIT X LAB</h1>
            <p className={`${isKid && isRegistering ? 'text-blue-600' : 'text-orange-500'} font-bold tracking-widest text-xs uppercase mt-1`}>
                {isKid && isRegistering ? 'Junior Cadet Program' : 'Community Fitness Protocol'}
            </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className={`w-full max-w-sm ${isKid && isRegistering ? 'bg-white border-blue-200 shadow-blue-200' : 'bg-slate-900/80 backdrop-blur-xl border-slate-800'} border rounded-2xl p-6 shadow-2xl transition-colors`}>
        
        <div className={`flex mb-6 ${isKid && isRegistering ? 'bg-blue-100' : 'bg-slate-950'} p-1 rounded-lg`}>
            <button 
                onClick={() => setIsRegistering(false)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${!isRegistering ? (isKid && isRegistering ? 'bg-blue-500 text-white' : 'bg-slate-800 text-white shadow') : 'text-slate-500 hover:text-slate-300'}`}
            >
                Login
            </button>
            <button 
                onClick={() => setIsRegistering(true)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${isRegistering ? (isKid ? 'bg-blue-500 text-white' : 'bg-orange-600 text-white shadow') : 'text-slate-500 hover:text-slate-300'}`}
            >
                Register
            </button>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-xs font-bold text-center">
                {error}
            </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            
            {/* Login Fields */}
            <div className="space-y-3">
                <div>
                    <label className={`block text-[10px] uppercase font-bold ${isKid && isRegistering ? 'text-blue-400' : 'text-slate-500'} mb-1`}>
                        {isRegistering ? 'Email Address' : 'Email / ID'}
                    </label>
                    <input 
                        type={isRegistering ? "email" : "text"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full ${isKid && isRegistering ? 'bg-blue-50 border-blue-200 text-blue-900 placeholder:text-blue-300 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-4 py-3 text-sm outline-none transition-colors`}
                        placeholder={isRegistering ? "user@example.com" : "user@example.com or 'Admin'"}
                    />
                </div>
                <div>
                    <label className={`block text-[10px] uppercase font-bold ${isKid && isRegistering ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full ${isKid && isRegistering ? 'bg-blue-50 border-blue-200 text-blue-900 placeholder:text-blue-300 focus:border-blue-500' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-4 py-3 text-sm outline-none transition-colors`}
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {/* Registration Only Fields */}
            {isRegistering && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-800">
                    
                    {/* Category Selection */}
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setCategory(UserCategory.ADULT)}
                            className={`flex-1 py-2 rounded text-xs font-bold border ${category === UserCategory.ADULT ? 'bg-orange-600 border-orange-600 text-white' : 'bg-transparent border-slate-600 text-slate-500'}`}
                        >
                            ADULT
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory(UserCategory.KID)}
                            className={`flex-1 py-2 rounded text-xs font-bold border ${category === UserCategory.KID ? 'bg-blue-500 border-blue-500 text-white' : 'bg-transparent border-slate-600 text-slate-500'}`}
                        >
                            KID
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                         <div className="col-span-1">
                            <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Title</label>
                            <select 
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                                className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-2 py-3 text-sm outline-none`}
                            >
                                <option value="">-</option>
                                {['Mr', 'Ms', 'Mrs', 'Dr', 'Er', 'Ar', 'Rs', 'Master', 'Miss'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                         </div>
                         <div className="col-span-3">
                            <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Full Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900 placeholder:text-blue-300' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-4 py-3 text-sm outline-none`}
                                placeholder="Darren Tan"
                            />
                         </div>
                    </div>

                    <div>
                         <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Gender</label>
                         <select 
                            value={gender} 
                            onChange={e => setGender(e.target.value as Gender)}
                            className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-2 py-3 text-sm outline-none`}
                        >
                            {Object.values(Gender).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Affiliation Group</label>
                        
                        {/* Current Memberships */}
                        {groupMemberships.length > 0 ? (
                            <div className="space-y-2 mb-2">
                                {groupMemberships.map((m) => (
                                    <div key={m.group_id} className={`flex items-center justify-between ${isKid ? 'bg-blue-100 border-blue-200' : 'bg-slate-800 border-slate-700'} border rounded-lg px-3 py-2`}>
                                        <div className="flex-1">
                                            <span className={`text-xs font-bold ${isKid ? 'text-blue-900' : 'text-white'}`}>{m.group_name}</span>
                                            {m.sub_group_names.length > 0 && (
                                                <span className={`text-[10px] ${isKid ? 'text-blue-600' : 'text-slate-400'} ml-2`}>
                                                    ({m.sub_group_names.join(', ')})
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveGroupMembership(m.group_id)}
                                            className={`p-1 ${isKid ? 'text-blue-400 hover:text-blue-600' : 'text-slate-500 hover:text-red-400'}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`text-xs ${isKid ? 'text-blue-400' : 'text-slate-500'} italic mb-2`}>
                                None selected
                            </div>
                        )}
                        
                        {/* Add Group Button / Selector */}
                        {!showGroupSelector ? (
                            <button
                                type="button"
                                onClick={() => setShowGroupSelector(true)}
                                className={`w-full py-2 px-3 ${isKid ? 'bg-blue-100 border-blue-200 text-blue-600 hover:bg-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'} border rounded-lg text-xs font-bold flex items-center justify-center gap-2`}
                            >
                                <Plus size={14} /> Add Group
                            </button>
                        ) : (
                            <div className={`${isKid ? 'bg-blue-50 border-blue-200' : 'bg-slate-950 border-slate-800'} border rounded-lg p-3 space-y-2`}>
                                {/* Group Selection */}
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => {
                                        setSelectedGroupId(e.target.value);
                                        setSelectedSubGroupIds([]);
                                    }}
                                    className={`w-full ${isKid ? 'bg-blue-100 border-blue-200 text-blue-900' : 'bg-slate-900 border-slate-700 text-white'} border rounded px-3 py-2 text-xs outline-none`}
                                >
                                    <option value="">Select a Group...</option>
                                    {groups
                                        .filter(g => !groupMemberships.some(m => m.group_id === g.id))
                                        .map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))
                                    }
                                </select>
                                
                                {/* Sub-Group Selection */}
                                {selectedGroup && selectedGroup.sub_groups.length > 0 && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] ${isKid ? 'text-blue-500' : 'text-slate-500'} font-bold`}>Sub-Groups (optional)</label>
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                            {selectedGroup.sub_groups.map(sg => (
                                                <button
                                                    key={sg.id}
                                                    type="button"
                                                    onClick={() => toggleSubGroup(sg.id)}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                                                        selectedSubGroupIds.includes(sg.id)
                                                            ? (isKid ? 'bg-blue-500 text-white' : 'bg-orange-600 text-white')
                                                            : (isKid ? 'bg-blue-100 text-blue-600' : 'bg-slate-800 text-slate-400')
                                                    }`}
                                                >
                                                    {sg.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowGroupSelector(false);
                                            setSelectedGroupId('');
                                            setSelectedSubGroupIds([]);
                                        }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold ${isKid ? 'text-blue-500' : 'text-slate-500'} hover:underline`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddGroupMembership}
                                        disabled={!selectedGroupId}
                                        className={`flex-1 py-1.5 text-[10px] font-bold ${isKid ? 'bg-blue-500' : 'bg-orange-600'} text-white rounded disabled:opacity-50`}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-1`}>Archetype</label>
                        <select 
                            value={athleteType}
                            onChange={(e) => setAthleteType(e.target.value as AthleteType)}
                            className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white focus:border-orange-500'} border rounded-lg px-4 py-3 text-sm outline-none`}
                        >
                            {Object.values(AthleteType).map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    {/* Avatar Studio */}
                    <div className={`pt-2 border-t ${isKid ? 'border-blue-200' : 'border-slate-800'}`}>
                        <label className={`block text-[10px] uppercase font-bold ${isKid ? 'text-blue-400' : 'text-slate-500'} mb-2`}>Identity Matrix (Avatar)</label>
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full ${isKid ? 'bg-blue-100 border-blue-200' : 'bg-slate-950 border-slate-700'} border overflow-hidden shrink-0`}>
                                <img src={avatarUrl} alt="avatar preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                     <input 
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={avatarSeed}
                                        onChange={handleSeedChange}
                                        placeholder="Seed: e.g. 1001"
                                        className={`flex-1 ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-white'} border rounded px-3 py-2 text-xs outline-none font-mono`}
                                     />
                                     <button onClick={generateRandomAvatar} className={`p-2 ${isKid ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-800 text-orange-500 hover:bg-slate-700'} rounded`} title="Randomize">
                                        <RefreshCcw size={14} />
                                     </button>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={avatarStyle}
                                        onChange={(e) => setAvatarStyle(e.target.value as AvatarStyle)}
                                        className={`w-full ${isKid ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-950 border-slate-800 text-slate-300'} border rounded px-2 py-1.5 text-[10px] outline-none`}
                                    >
                                        <option value="avataaars">Human (Standard)</option>
                                        <option value="adventurer">Human (RPG)</option>
                                        <option value="fun-emoji">Emoji (Expressive)</option>
                                        <option value="bottts">Mecha (Robots)</option>
                                        <option value="pixel-art">Retro (Pixel)</option>
                                        <option value="cats">Animal (Cats)</option>
                                        <option value="monsters">Creature (Monsters)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button 
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 ${isKid && isRegistering ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'} text-white font-black uppercase italic tracking-wider rounded-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-6`}
            >
                {isLoading ? (
                    <span>Processing...</span>
                ) : (
                    <>
                        {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                        {isRegistering ? 'Join the Ranks' : 'Enter Barracks'}
                    </>
                )}
            </button>

            {!isRegistering && (
                <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 bg-white text-slate-900 font-bold uppercase tracking-wider rounded-lg shadow-lg hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Sign in with Google</span>
                </button>
            )}

        </form>
      </div>
      
      <div className="mt-8 text-center opacity-30">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">V 1.0.0 • FIT X LAB Initiative</p>
      </div>
    </div>
  );
};

export default AuthScreen;
