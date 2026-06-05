import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PostDetail from '../views/PostDetail.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';
import CyberCamera from '../views/CyberCamera.vue';
import LanguageStudy from '../views/LanguageStudy.vue';
import ProfessionalStudy from '../views/ProfessionalStudy.vue';
import InterestStudy from '../views/InterestStudy.vue';
import DictionaryDetail from '../views/DictionaryDetail.vue';
import CinemaView from '../views/CinemaView.vue';
import NotesView from '../views/NotesView.vue';
import AIChatView from '../views/AIChatView.vue';
import GamesView from '../views/GamesView.vue';
import FriendsView from '../views/FriendsView.vue';
import api from '../api';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/post/:slug', name: 'post-detail', component: PostDetail },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/cyber-camera', name: 'cyber-camera', component: CyberCamera },
  { path: '/study/language', name: 'language-study', component: LanguageStudy, meta: { requiresAuth: true } },
  { path: '/study/professional', name: 'professional-study', component: ProfessionalStudy, meta: { requiresAuth: true } },
  { path: '/study/interest', name: 'interest-study', component: InterestStudy, meta: { requiresAuth: true } },
  // Dictionary Routes
  { path: '/study/language/dictionary/english', name: 'dictionary-english', component: DictionaryDetail, meta: { requiresAuth: true } },
  { path: '/study/language/dictionary/german', name: 'dictionary-german', component: DictionaryDetail, meta: { requiresAuth: true } },
  { path: '/study/language/dictionary/japanese', name: 'dictionary-japanese', component: DictionaryDetail, meta: { requiresAuth: true } },
  { path: '/study/language/dictionary/chinese', name: 'dictionary-chinese', component: DictionaryDetail, meta: { requiresAuth: true } },
  // Module Routes
  { path: '/cinema', name: 'cinema', component: CinemaView, meta: { requiresAuth: true } },
  { path: '/notes', name: 'notes', component: NotesView, meta: { requiresAuth: true } },
  { path: '/ai-chat', name: 'ai-chat', component: AIChatView, meta: { requiresAuth: true } },
  { path: '/games', name: 'games', component: GamesView, meta: { requiresAuth: true } },
  { path: '/friends', name: 'friends', component: FriendsView, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      await api.get('/user/');
      next();
    } catch (error) {
      next({ name: 'login' });
    }
  } else {
    next();
  }
});

export default router;
