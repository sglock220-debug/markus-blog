import { ref, onMounted, onUnmounted } from 'vue';

export function useResponsiveLayout() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(false);

  const mobileQuery = window.matchMedia('(max-width: 767px)');
  const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
  const desktopQuery = window.matchMedia('(min-width: 1024px)');

  const updateLayout = () => {
    isMobile.value = mobileQuery.matches;
    isTablet.value = tabletQuery.matches;
    isDesktop.value = desktopQuery.matches;
  };

  onMounted(() => {
    updateLayout();
    mobileQuery.addEventListener('change', updateLayout);
    tabletQuery.addEventListener('change', updateLayout);
    desktopQuery.addEventListener('change', updateLayout);
  });

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', updateLayout);
    tabletQuery.removeEventListener('change', updateLayout);
    desktopQuery.removeEventListener('change', updateLayout);
  });

  return {
    isMobile,
    isTablet,
    isDesktop
  };
}
