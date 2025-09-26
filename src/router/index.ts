import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import DashboardHome from '../views/DashboardHome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DashboardView,
      children: [
        {
          path: '',
          name: 'home',
          component: DashboardHome,
        },
        {
          path: 'workspaces/:workspaceId',
          name: 'workspace-detail',
          component: () => import('../views/WorkspaceDetail.vue'),
        },
        {
          path: 'workspaces/:workspaceId/sessions/new',
          name: 'new-session',
          component: () => import('../views/CreatingSession.vue'),
        },
        {
          path: 'workspaces/:workspaceId/sessions/:sessionId',
          name: 'session',
          component: () => import('../components/ChatWindow.vue'),
        },
      ],
    },
  ],
})

export default router
