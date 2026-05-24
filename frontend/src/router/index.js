import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PostDetail from '../views/PostDetail.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';
import api from '../api';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/post/:slug', name: 'post-detail', component: PostDetail },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
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
