import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { onUnauthorized } from '@/api/http';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** nur für angemeldete Benutzer */
    auth?: boolean;
    /** nur für Admins */
    admin?: boolean;
    /** nur für Gäste (Login/Registrierung) */
    guest?: boolean;
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'challenge', component: () => import('@/views/ChallengeView.vue'), meta: { auth: true, title: 'Challenge' } },
  { path: '/galerie', name: 'gallery', component: () => import('@/views/GalleryView.vue'), meta: { auth: true, title: 'Galerie' } },
  {
    path: '/galerie/:period(\\d{4}-\\d{2})',
    name: 'gallery-month',
    component: () => import('@/views/GalleryMonthView.vue'),
    meta: { auth: true, title: 'Galerie' },
    props: true,
  },
  {
    path: '/foto/:id(\\d+)',
    name: 'photo',
    component: () => import('@/views/PhotoDetailView.vue'),
    meta: { auth: true, title: 'Foto' },
    props: (r) => ({ id: Number(r.params.id) }),
  },
  { path: '/meine-fotos', name: 'mine', component: () => import('@/views/MyPhotosView.vue'), meta: { auth: true, title: 'Meine Fotos' } },
  { path: '/konto', name: 'account', component: () => import('@/views/AccountView.vue'), meta: { auth: true, title: 'Konto' } },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { auth: true, admin: true, title: 'Admin' },
    children: [
      { path: '', name: 'admin', component: () => import('@/views/admin/AdminOverview.vue') },
      { path: 'challenges', name: 'admin-challenges', component: () => import('@/views/admin/AdminChallenges.vue') },
      { path: 'themen', name: 'admin-themes', component: () => import('@/views/admin/AdminThemes.vue') },
      { path: 'benutzer', name: 'admin-users', component: () => import('@/views/admin/AdminUsers.vue') },
      { path: 'moderation', name: 'admin-moderation', component: () => import('@/views/admin/AdminModeration.vue') },
    ],
  },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guest: true, title: 'Anmelden' } },
  {
    path: '/registrieren',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true, title: 'Registrieren' },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'Nicht gefunden' } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash, top: 88, behavior: 'smooth' } : { top: 0 }),
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.meta.guest && auth.isLoggedIn) return { name: 'challenge' };
  if (to.matched.some((r) => r.meta.auth) && !auth.isLoggedIn) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} };
  }
  if (to.matched.some((r) => r.meta.admin) && !auth.isAdmin) return { name: 'challenge' };
  return true;
});

router.afterEach((to) => {
  const title = [...to.matched].reverse().find((r) => r.meta.title)?.meta.title;
  document.title = title ? `${title} · Photo of the Month` : 'Photo of the Month';
});

// Session abgelaufen -> lokal abmelden und zum Login
onUnauthorized(() => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn) return;
  auth.clear();
  const current = router.currentRoute.value.fullPath;
  void router.push({ name: 'login', query: { redirect: current } });
});
