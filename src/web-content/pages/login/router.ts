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


export default router;
