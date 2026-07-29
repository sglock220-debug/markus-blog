import { ref, onMounted, onUnmounted } from 'vue';

export function useResponsiveLayout() {
  const isMobile = ref(false);
  const isTablet = ref(false);
  const isDesktop = ref(false);

  const mobileQuery = window.matchMedia('(max-width: 767px)');
  const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

  const updateLayout = () => {
    const isTouchDevice = coarsePointerQuery.matches || navigator.maxTouchPoints > 0;

    isMobile.value = isTouchDevice && mobileQuery.matches;
    isTablet.value = false;
    isDesktop.value = !isMobile.value;
  };

  onMounted(() => {
    updateLayout();
    mobileQuery.addEventListener('change', updateLayout);
    tabletQuery.addEventListener('change', updateLayout);
    coarsePointerQuery.addEventListener('change', updateLayout);
  });

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', updateLayout);
    tabletQuery.removeEventListener('change', updateLayout);
    coarsePointerQuery.removeEventListener('change', updateLayout);
  });

  return {
    isMobile,
    isTablet,
    isDesktop
  };
}
