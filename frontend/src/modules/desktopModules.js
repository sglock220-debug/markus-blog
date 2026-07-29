export const MODULE_REGISTRY = {
  wallpaper: { title: '壁纸主题', icon: '🖼️', type: 'action', action: 'wallpaper', x: 0, y: 0 },
  'ai-chat': { title: 'AI聊天助手', icon: '🤖', route: '/ai-chat', type: 'route', x: 1, y: 0 },
  music: { title: '音乐', icon: '🎵', type: 'action', action: 'music', x: 2, y: 0 },
  extensions: { title: '扩展', icon: '🧩', type: 'folder', folderType: 'extensions', x: 3, y: 0 },
  study: { title: '学习系统', icon: '📖', type: 'folder', folderType: 'study', x: 0, y: 1 },
  notes: { title: '笔记', icon: '📝', route: '/notes', type: 'route', x: 1, y: 1 },
  camera: { title: '相机', icon: '📷', route: '/cyber-camera', type: 'route', x: 2, y: 1 },
  settings: { title: '设置', icon: '⚙️', type: 'folder', folderType: 'settings', x: 3, y: 1 },
  profile: { title: '个人主页', icon: '👤', route: '/profile', type: 'route', x: 0, y: 2 },
  games: { title: '娱乐游戏', icon: '🎮', route: '/games', type: 'route', x: 1, y: 2 },
  friends: { title: '交友', icon: '👥', route: '/friends', type: 'route', x: 2, y: 2 },
  cinema: { title: '影厅', icon: '🎬', route: '/cinema', type: 'route', x: 3, y: 2 },
};

export const FOLDER_ITEM_REGISTRY = {
  settings: {},
  study: {
    'study-language': { title: '语言学习', icon: '🌍', action: 'study-language', route: '/study/language', x: 0, y: 0 },
    'study-professional': { title: '专业学习', icon: '🎓', action: 'study-professional', route: '/study/professional', x: 1, y: 0 },
    'study-interest': { title: '兴趣学习', icon: '🎯', action: 'study-interest', route: '/study/interest', x: 2, y: 0 },
  },
  extensions: {},
};

export const MOBILE_MAIN_MODULE_KEYS = [
  'cinema',
  'notes',
  'camera',
  'ai-chat',
  'games',
  'friends',
  'profile',
];

export const MOBILE_FOLDER_MODULE_KEYS = [
  'study',
  'settings',
  'extensions',
];

export const MOBILE_SETTINGS_ITEMS = [
  { id: 'wallpaper', module_key: 'wallpaper', action: 'wallpaper' },
  { id: 'language', module_key: 'language', title: '语言', icon: '🌐', action: 'language' },
  { id: 'music', module_key: 'music', action: 'music' },
];

export const moduleFromRegistry = (moduleKey) => {
  const module = MODULE_REGISTRY[moduleKey];
  if (!module) return null;

  return {
    ...module,
    id: moduleKey,
    module_key: moduleKey,
  };
};

export const folderItemFromRegistry = (folderType, itemKey) => {
  const item = FOLDER_ITEM_REGISTRY[folderType]?.[itemKey];
  if (!item) return null;

  return {
    ...item,
    id: itemKey,
    module_key: itemKey,
  };
};
