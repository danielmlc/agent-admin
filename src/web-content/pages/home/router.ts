import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./Home.vue";
import UserManagement from "./views/UserManagement.vue";
import RoleManagement from "./views/RoleManagement.vue";

const routes = [
  {
    path: "/",
    component: Home,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "dashboard",
        meta: {
          title: "仪表盘",
        },
        component: () => import("./views/Dashboard.vue"),
      },
      {
        path: "user-management",
        name: "user-management",
        meta: {
          title: "用户管理",
        },
        component: () => import("./views/UserManagement.vue"),
      },
      {
        path: "role-management",
        name: "role-management",
        meta: {
          title: "角色权限管理",
        },
        component: () => import("./views/RoleManagement.vue"),
      },
      {
        path: "security",
        name: "security",
        meta: {
          title: "安全管理",
        },
        component: () => import("./views/Security.vue"),
      },
      {
        path: "settings",
        name: "settings",
        meta: {
          title: "系统设置",
        },
        component: () => import("./views/Settings.vue"),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
