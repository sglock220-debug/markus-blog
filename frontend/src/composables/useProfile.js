import { ref, onMounted } from 'vue';
import api from '../api';

export function useProfile() {
  const user = ref(null);
  const articles = ref([]);
  const loading = ref(true);

  const fetchProfile = async () => {
    loading.value = true;
    try {
      const userRes = await api.get('/user/');
      user.value = userRes.data;
      
      const articlesRes = await api.get('/articles/');
      articles.value = articlesRes.data.filter(a => a.author.username === user.value.username);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      loading.value = false;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  onMounted(() => {
    fetchProfile();
  });

  return {
    user,
    articles,
    loading,
    formatDate
  };
}
