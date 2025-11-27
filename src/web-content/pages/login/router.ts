import { createRouter, createWebHashHistory } from "vue-router";
import Login from "./Login.vue";
import OAuthCallback from "./OAuthCallback.vue";

const routes = [
  {
    path: "/",
    name: "login",
    meta: {
      title: "登录",
    },
    component: Login,
  },
  {
    path: "/oauth-callback",
    name: "oauth-callback",
    meta: {
      title: "OAuth 登录",
    },
    component: OAuthCallback,
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 路由守卫 - 检查登录状态
// router.beforeEach((to, from, next) => {
//   const token = localStorage.getItem('access_token')

//   // 如果访问非登录页面且未登录，重定向到登录页
//   if (to.path !== '/login' && !token) {
//     next('/login')
//   } else if (to.path === '/login' && token) {
//     // 如果已登录访问登录页，重定向到首页
//     next('/')
//   } else {
//     next()
//   }
// })

export default router;
