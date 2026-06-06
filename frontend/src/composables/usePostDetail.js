import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

export function usePostDetail() {
  const route = useRoute();
  const article = ref(null);
  const loading = ref(true);

  const fetchArticle = async () => {
    try {
      const res = await api.get(`/articles/${route.params.slug}/`);
      article.value = res.data;
    } catch (err) {
      console.error('Failed to fetch article', err);
    } finally {
      loading.value = false;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  const formatContent = (content) => {
    if (!content) return '';
    return content.replace(/\n/g, '<br>');
  };

  onMounted(() => {
    fetchArticle();
  });

  return {
    article,
    loading,
    formatDate,
    formatContent
  };
}
